import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  AI_ROLE_NAMES,
  createAiActorContext,
  createUserActorContext,
  evaluateBuildQualityGate,
  transitionDocumentBuildStatus,
  transitionRuleStatus,
  transitionSectionRevisionStatus,
  createSectionRevision,
  createLayoutIssue,
  ExactDecimal,
  type BuildQualityGateInput,
  type DocumentBuildStatus
} from '@core/domain';
import { IpcDispatcher, DOCFLOW_IPC_CHANNELS } from '@infra/ipc';
import {
  DOCFLOW_CONTENT_SECURITY_POLICY,
  buildCspResponseHeaders,
  createSecureBrowserWindowOptions,
  isAllowedRendererNavigation
} from '../../src/main/security';
import { registerElectronIpcBridge } from '../../src/main/ipc-bridge';

const APP_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = resolve(APP_ROOT, '..');

function listCodeFiles(dirPath: string): string[] {
  const files: string[] = [];
  if (!existsSync(dirPath)) {
    return files;
  }
  for (const entry of readdirSync(dirPath)) {
    const full = join(dirPath, entry);
    const st = statSync(full);
    if (st.isDirectory()) {
      files.push(...listCodeFiles(full));
    } else if (full.endsWith('.ts') || full.endsWith('.tsx')) {
      files.push(full);
    }
  }
  return files;
}

function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/.*$/gm, '');
}

describe('QA Độc lập — Kiểm chứng Ranh giới Kiến trúc, Bảo mật Electron/IPC & Cổng Build Gate', () => {
  it('1. Quét tĩnh toàn bộ mã nguồn: core/ tinh khiết 100%, ui/ không vi phạm sandbox, adapters/ không gọi chéo nhau', () => {
    const coreFiles = listCodeFiles(join(APP_ROOT, 'src/core'));
    expect(coreFiles.length).toBeGreaterThanOrEqual(20);

    const coreForbiddenRegex =
      /(?:from\s+['"]|import\s*\(\s*['"]|require\s*\(\s*['"])(electron|react|react-dom|zustand|better-sqlite3|fs|fs\/promises|path|child_process|sqlite3|node:[a-z0-9_/-]+|@ui\/|@adapters\/|@infra\/|@preload\/|\.\.\/ui|\.\.\/adapters|\.\.\/infra|\.\.\/main|\.\.\/preload)/;

    for (const file of coreFiles) {
      const code = readFileSync(file, 'utf8');
      const strippedCode = stripComments(code);
      expect(
        coreForbiddenRegex.test(strippedCode),
        `[QA] Phát hiện import cấm trong tầng core/: ${file}`
      ).toBe(false);
      // Cấm eval() và new Function() thực thi thực tế trong core/ (ngoài bộ regex chặn trong typed-rule-ir.ts)
      if (!file.endsWith('typed-rule-ir.ts')) {
        expect(/\beval\s*\(/.test(strippedCode), `[QA] Phát hiện eval() trong ${file}`).toBe(false);
        expect(
          /\bnew\s+Function\s*\(/.test(strippedCode),
          `[QA] Phát hiện new Function() trong ${file}`
        ).toBe(false);
      }
    }

    const uiFiles = listCodeFiles(join(APP_ROOT, 'src/ui'));
    expect(uiFiles.length).toBeGreaterThanOrEqual(10);

    const uiForbiddenRegex =
      /(?:from\s+['"]|import\s*\(\s*['"]|require\s*\(\s*['"])(electron|better-sqlite3|fs|fs\/promises|child_process|node:[a-z0-9_/-]+|@adapters\/|@infra\/|\.\.\/adapters|\.\.\/infra|\.\.\/main)/;

    for (const file of uiFiles) {
      const code = readFileSync(file, 'utf8');
      expect(uiForbiddenRegex.test(code), `[QA] Phát hiện import cấm trong tầng ui/: ${file}`).toBe(
        false
      );
    }

    // Kiểm tra các nhóm adapter chuyên biệt không import chéo nhau để vượt mặt core/
    const adapterSubdomains = [
      'documents',
      'rendering',
      'spreadsheets',
      'reference-files',
      'execution',
      'ai'
    ] as const;

    for (const subdomain of adapterSubdomains) {
      const subFiles = listCodeFiles(join(APP_ROOT, 'src/adapters', subdomain));
      for (const file of subFiles) {
        const code = readFileSync(file, 'utf8');
        for (const other of adapterSubdomains) {
          if (other === subdomain) continue;
          const crossAdapterRegex = new RegExp(
            `(?:from\\s+['"]|import\\s*\\(\\s*['"])(?:@adapters/${other}|(?:\\.\\./)+${other}(?:/|['"]))`
          );
          expect(
            crossAdapterRegex.test(code),
            `[QA] Adapter '${subdomain}' gọi chéo sang adapter '${other}' tại ${file}`
          ).toBe(false);
        }
      }
    }
  });

  it('2. Kiểm chứng cấu hình bảo mật Electron (contextIsolation, sandbox, nodeIntegration, CSP, navigation & giả mạo actor qua IPC)', async () => {
    const winOpts = createSecureBrowserWindowOptions('/abs/preload/index.js');
    expect(winOpts.webPreferences?.contextIsolation).toBe(true);
    expect(winOpts.webPreferences?.sandbox).toBe(true);
    expect(winOpts.webPreferences?.nodeIntegration).toBe(false);
    expect(winOpts.webPreferences?.nodeIntegrationInWorker).toBe(false);
    expect(winOpts.webPreferences?.nodeIntegrationInSubFrames).toBe(false);
    expect(winOpts.webPreferences?.webSecurity).toBe(true);
    expect(winOpts.webPreferences?.allowRunningInsecureContent).toBe(false);
    expect(winOpts.webPreferences?.webviewTag).toBe(false);

    // CSP production không được chứa unsafe-eval và khóa object-src/frame-ancestors
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("default-src 'self'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("script-src 'self'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).not.toContain('unsafe-eval');
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("object-src 'none'");
    expect(DOCFLOW_CONTENT_SECURITY_POLICY).toContain("frame-ancestors 'none'");

    const headers = buildCspResponseHeaders({ 'content-security-policy': ["default-src *"] });
    expect(headers['Content-Security-Policy']).toEqual([DOCFLOW_CONTENT_SECURITY_POLICY]);
    expect(headers['content-security-policy']).toBeUndefined();

    // Chặn điều hướng ra Internet bên ngoài
    expect(isAllowedRendererNavigation('https://evil.example.com/phish')).toBe(false);
    expect(isAllowedRendererNavigation('javascript:alert(1)')).toBe(false);
    expect(isAllowedRendererNavigation('file:///Applications/DocFlow/index.html')).toBe(true);

    // Chống leo thang / giả mạo Actor từ phía Renderer qua ipcMain bridge
    const dispatcher = new IpcDispatcher();
    let capturedActorId = '';
    dispatcher.registerHandler('system.ping', (_payload, ctx) => {
      capturedActorId = ctx.actor.actorId;
      return { ok: true };
    });

    let registeredHandler: ((event: unknown, req: unknown) => Promise<unknown>) | null = null;
    registerElectronIpcBridge(
      {
        removeHandler: () => undefined,
        handle: (_ch, fn) => {
          registeredHandler = fn as (event: unknown, req: unknown) => Promise<unknown>;
        }
      },
      dispatcher
    );

    expect(registeredHandler).not.toBeNull();
    // Renderer cố tình nhét trường actor giả mạo vào gói tin wire
    await registeredHandler!(
      {},
      {
        channel: 'system.ping',
        payload: { echo: 'probe' },
        actor: {
          actorType: 'AI_AGENT',
          actorId: 'spoofed-root-actor',
          capabilities: ['ui:user']
        }
      }
    );
    expect(capturedActorId).toBe('electron-renderer');
  });

  it('3. Kiểm chứng ma trận Ca biên chuyển trạng thái bất hợp lệ ở Build Gate, Capability Scoping và Path Traversal IPC', async () => {
    const tplHash = 'a'.repeat(64);
    const fpV1 = 'b'.repeat(64);
    const fpV2 = 'c'.repeat(64);
    const human = createUserActorContext('qa-inspector');

    const approvedRev1 = createSectionRevision({
      id: 'rev-s1-v1',
      sectionId: 'section-01',
      baseTemplateHash: tplHash,
      ruleId: 'rule-01',
      ruleVersion: 1,
      inputFingerprint: fpV1,
      outputs: { quantity: '15000' },
      patchSet: [{ blockId: 'b-01', op: 'replaceText', payload: { newText: '15.000' } }],
      reviewStatus: 'APPROVED',
      approval: { approvedBy: 'qa-inspector', approvedAt: '2026-11-25T10:00:00.000Z' }
    });

    const baseValidGate: BuildQualityGateInput = {
      manifest: {
        templateHash: tplHash,
        selectedRevisions: { 'section-01': 'rev-s1-v1' },
        layoutPolicy: { mode: 'STRICT_LAYOUT', maxAllowedPageDelta: 1 }
      },
      sections: [
        {
          sectionId: 'section-01',
          required: true,
          calculationStatus: 'APPROVED',
          expectedInputFingerprint: fpV1
        }
      ],
      revisionsById: { 'rev-s1-v1': approvedRev1 },
      baselinePageCount: 12,
      renderedPageCount: 12,
      layoutIssues: []
    };

    // A. Ma trận mọi cặp chuyển trạng thái DocumentBuild bất hợp lệ phải ném INVALID_STATE_TRANSITION
    const invalidPairs: ReadonlyArray<readonly [DocumentBuildStatus, DocumentBuildStatus]> = [
      ['BLOCKED', 'RENDERED'],
      ['BLOCKED', 'LAYOUT_REVIEW'],
      ['BLOCKED', 'APPROVED'],
      ['BLOCKED', 'EXPORTED'],
      ['BUILDING', 'LAYOUT_REVIEW'],
      ['BUILDING', 'APPROVED'],
      ['BUILDING', 'EXPORTED'],
      ['RENDERED', 'APPROVED'],
      ['RENDERED', 'EXPORTED'],
      ['LAYOUT_REVIEW', 'EXPORTED'],
      ['LAYOUT_REVIEW', 'BUILDING'],
      ['EXPORTED', 'BLOCKED'],
      ['EXPORTED', 'BUILDING'],
      ['EXPORTED', 'APPROVED']
    ];

    for (const [from, to] of invalidPairs) {
      expect(
        () => transitionDocumentBuildStatus(from, to, { actor: human, gate: baseValidGate }),
        `Cặp chuyển trạng thái cấm ${from} -> ${to} phải bị chặn`
      ).toThrowError(expect.objectContaining({ code: 'INVALID_STATE_TRANSITION' }));
    }

    // B. Chuyển sang APPROVED/EXPORTED nhưng không truyền dữ liệu cổng kiểm tra gate -> DOMAIN_INVARIANT_VIOLATION
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', { actor: human })
    ).toThrowError(expect.objectContaining({ code: 'DOMAIN_INVARIANT_VIOLATION' }));

    // C. Revision cũ đã APPROVED nhưng expectedInputFingerprint đã sang fpV2 -> bị chặn BUILD_BLOCKED_UNAPPROVED_REVISIONS (§1.2)
    const staleFingerprintGate: BuildQualityGateInput = {
      ...baseValidGate,
      sections: [
        {
          sectionId: 'section-01',
          required: true,
          calculationStatus: 'APPROVED',
          expectedInputFingerprint: fpV2
        }
      ]
    };
    const fpReport = evaluateBuildQualityGate(staleFingerprintGate);
    expect(fpReport.canStartBuild).toBe(false);
    expect(fpReport.blockingErrorCode).toBe('BUILD_BLOCKED_UNAPPROVED_REVISIONS');
    expect(() =>
      transitionDocumentBuildStatus('BLOCKED', 'BUILDING', { gate: staleFingerprintGate })
    ).toThrowError(expect.objectContaining({ code: 'BUILD_BLOCKED_UNAPPROVED_REVISIONS' }));

    // D. Vi phạm STRICT_LAYOUT (lệch số trang > maxAllowedPageDelta) và overrideReason quá ngắn (< 5 ký tự) -> vẫn bị chặn BUILD_BLOCKED_LAYOUT_GATE
    const strictViolatedGate: BuildQualityGateInput = {
      ...baseValidGate,
      baselinePageCount: 12,
      renderedPageCount: 15,
      overrideReason: 'ok'
    };
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: human,
        gate: strictViolatedGate
      })
    ).toThrowError(expect.objectContaining({ code: 'BUILD_BLOCKED_LAYOUT_GATE' }));

    // E. Có LayoutIssue CRITICAL nhưng chính sách tắt allowHumanOverrideWithReason: false -> dù có overrideReason dài vẫn chặn cứng
    const nonOverridableGate: BuildQualityGateInput = {
      ...baseValidGate,
      allowHumanOverrideWithReason: false,
      overrideReason: 'Người dùng cố ghi lý do dài nhưng chính sách cấm override',
      layoutIssues: [
        createLayoutIssue({
          id: 'iss-01',
          buildId: 'b-01',
          sectionId: 'section-01',
          blockId: 'tbl-01',
          type: 'TABLE_OVERFLOW',
          severity: 'CRITICAL',
          pageRange: [2, 2],
          detail: 'Tràn bảng nghiêm trọng'
        })
      ]
    };
    expect(() =>
      transitionDocumentBuildStatus('LAYOUT_REVIEW', 'APPROVED', {
        actor: human,
        gate: nonOverridableGate
      })
    ).toThrowError(expect.objectContaining({ code: 'BUILD_BLOCKED_LAYOUT_GATE' }));

    // F. Cấm xuất đè lên original.docx hoặc đường dẫn chứa '..' ngay tại state machine DocumentBuild -> EXPORTED
    expect(() =>
      transitionDocumentBuildStatus('APPROVED', 'EXPORTED', {
        actor: human,
        gate: baseValidGate,
        destinationPath: '/tmp/proj/template/original.docx'
      })
    ).toThrowError(expect.objectContaining({ code: 'IMMUTABLE_TARGET_PROTECTED' }));

    expect(() =>
      transitionDocumentBuildStatus('APPROVED', 'EXPORTED', {
        actor: human,
        gate: baseValidGate,
        destinationPath: '/tmp/proj/exports/../../etc/passwd'
      })
    ).toThrowError(expect.objectContaining({ code: 'DOMAIN_INVARIANT_VIOLATION' }));

    // G. Kiểm tra toàn diện 6 vai trò AI trên IpcDispatcher: cấm 100% ở các kênh phê duyệt/xuất và kiểm tra Path Traversal
    const ipc = new IpcDispatcher();
    for (const ch of DOCFLOW_IPC_CHANNELS) {
      ipc.registerHandler(ch, () => ({ ok: true }));
    }

    for (const role of AI_ROLE_NAMES) {
      const aiActor = createAiActorContext(role, 'qa-session');
      for (const humanChannel of [
        'section.approveRevision',
        'build.approve',
        'build.exportDocx'
      ] as const) {
        const res = await ipc.dispatch({
          channel: humanChannel,
          actor: aiActor,
          payload: { buildId: 'b-1', revisionId: 'r-1', destinationPath: '/tmp/out.docx' }
        });
        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error.code).toBe('CAPABILITY_DENIED');
        }
      }

      // Kiểm tra cả ở tầng state machine cho Rule và SectionRevision
      expect(() => transitionRuleStatus('VALIDATED', 'APPROVED', { actor: aiActor })).toThrowError(
        expect.objectContaining({ code: 'CAPABILITY_DENIED' })
      );
      expect(() =>
        transitionSectionRevisionStatus('REVIEW_REQUIRED', 'APPROVED', { actor: aiActor })
      ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }));
    }

    // Gọi kênh lạ ngoài allowlist -> IPC_INVALID_CHANNEL
    const unknownRes = await ipc.dispatch({
      channel: 'shell.execArbitrary',
      actor: human,
      payload: {}
    });
    expect(unknownRes.ok).toBe(false);
    if (!unknownRes.ok) {
      expect(unknownRes.error.code).toBe('IPC_INVALID_CHANNEL');
    }

    // Truyền đường dẫn Path Traversal qua project.open -> IPC_VALIDATION_FAILED
    const traversalRes = await ipc.dispatch({
      channel: 'project.open',
      actor: human,
      payload: { projectDir: '/tmp/projects/../../../etc' }
    });
    expect(traversalRes.ok).toBe(false);
    if (!traversalRes.ok) {
      expect(traversalRes.error.code).toBe('IPC_VALIDATION_FAILED');
    }

    // Kiểm tra số học chính xác ExactDecimal cho kịch bản chuẩn (15.000 * 250.000 = 3.750.000.000; 65% chi phí = 2.437.500.000; lợi nhuận = 1.312.500.000)
    const qty = ExactDecimal.fromString('15000');
    const price = ExactDecimal.fromString('250000');
    const revenue = qty.multiply(price);
    const cost = revenue.multiply(ExactDecimal.fromString('0.65'));
    const profit = revenue.subtract(cost);
    expect(revenue.toString()).toBe('3750000000');
    expect(cost.toString()).toBe('2437500000');
    expect(profit.toString()).toBe('1312500000');
    expect(ExactDecimal.fromString('0.1').add(ExactDecimal.fromString('0.2')).toString()).toBe(
      '0.3'
    );
  });

  it('4. Xác minh tính toàn vẹn mã băm SHA-256 của bộ tài sản tham chiếu gốc trong docs/', async () => {
    const { createHash } = await import('node:crypto');
    const expectedProtectedDocsHashes: Readonly<Record<string, string>> = {
      'docs/DOCFLOW_STUDIO_SPEC.md':
        'ec920f874704929d6d7e64598621c4da75be40f25f1ebd58aa5ee6a1f6a5dd7b',
      'docs/DocFlow_Interactive_Mockup.html':
        '75f344c9e7161c8f8fb34aa765a36c527fcb36ce8ffdd61b17bb890eeb3debf9',
      'docs/mockup_01_workspace.png':
        '80aa2fd52159c29423767ab95e3626f5773fe3a11b31eeb46a2822dac3d52831',
      'docs/mockup_02_recipe.png':
        '9034c77d00d3f54030c8a781a5510db2b5a57b3a2d408578cd981a7843dfc36d',
      'docs/mockup_03_runner.png':
        '4382594dd6203c9a314baa96bc93ab92b7cef57bda557a3d41c6afa2e3886efc',
      'docs/mockup_04_build.png':
        'e5ac305b1439b2f252e419941062c71f999e8ea9ba822b3c5ef6b3ba3dfa0381'
    };

    for (const [relPath, expectedSha256] of Object.entries(expectedProtectedDocsHashes)) {
      const fullPath = join(REPO_ROOT, relPath);
      expect(existsSync(fullPath), `Thiếu tài sản gốc bắt buộc: ${relPath}`).toBe(true);
      const actualSha256 = createHash('sha256').update(readFileSync(fullPath)).digest('hex');
      expect(actualSha256, `Tài sản bất biến bị thay đổi ngoài ý muốn: ${relPath}`).toBe(
        expectedSha256
      );
    }
  });
});
