import { describe, expect, it } from 'vitest';
import {
  AppError,
  AI_ROLE_DEFAULT_CAPABILITIES,
  HUMAN_APPROVAL_ONLY_CHANNELS,
  createAiActorContext,
  type ActorContext,
  type AiRoleName
} from '@core/domain';
import { InMemoryAuditLogger } from '@infra/logging';
import { IpcDispatcher, registerBootstrapIpcHandlers } from '@infra/ipc';
import {
  FIXTURE_ACTORS,
  FIXTURE_TIMESTAMPS,
  FIXTURE_VALID_PATCH_SET
} from '../fixtures/sample-ipc-requests';

function createTestDispatcher() {
  let tick = 0;
  let seq = 0;
  const baseMs = Date.parse(FIXTURE_TIMESTAMPS.baseIso);
  const auditLogger = new InMemoryAuditLogger();
  const dispatcher = new IpcDispatcher({
    auditLogger,
    now: () => {
      const current = new Date(baseMs + tick * 5);
      tick += 1;
      return current;
    },
    generateId: () => {
      seq += 1;
      return `test-id-${String(seq).padStart(4, '0')}`;
    }
  });
  registerBootstrapIpcHandlers(dispatcher, auditLogger);
  return { dispatcher, auditLogger };
}

describe('IpcDispatcher — Allowlist, Schema Validation, Capability Scoping & Audit (§9.4)', () => {
  it('từ chối kênh không nằm trong allowlist hoặc tên kênh đặc biệt với mã lỗi IPC_INVALID_CHANNEL', async () => {
    const { dispatcher, auditLogger } = createTestDispatcher();

    for (const invalidChannel of ['shell.exec', '', '   ', '__proto__', 'toString', 'project.deleteAll']) {
      const result = await dispatcher.dispatch({
        channel: invalidChannel,
        payload: {},
        actor: FIXTURE_ACTORS.desktopUser,
        correlationId: 'corr-invalid-ch-01'
      });

      expect(result.ok).toBe(false);
      if (!result.ok) {
        expect(result.error.code).toBe('IPC_INVALID_CHANNEL');
        expect(result.error.recoverable).toBe(false);
        expect(result.error.message).toContain('không nằm trong danh sách cho phép');
        expect(result.error.messageVi).toBe(result.error.message);
        expect(result.auditMetadata.correlationId).toBe('corr-invalid-ch-01');
        expect(result.auditMetadata.auditEventId).toMatch(/^aud-test-id-/);
      }
    }

    const recentAudits = auditLogger.listRecent(10);
    expect(recentAudits.length).toBe(6);
    expect(recentAudits.every((e) => e.outcome === 'DENIED' && e.errorCode === 'IPC_INVALID_CHANNEL')).toBe(
      true
    );
  });

  it('không cho phép đăng ký handler cho kênh ngoài allowlist', () => {
    const { dispatcher } = createTestDispatcher();

    expect(() => {
      // Ép kiểu cố tình để kiểm tra chốt chặn lúc chạy
      dispatcher.registerHandler('unregistered.backdoor' as never, () => ({ ok: true }));
    }).toThrowError(AppError);
  });

  it('từ chối payload sai kiểu dữ liệu, thiếu trường bắt buộc hoặc thừa trường lạ với IPC_VALIDATION_FAILED', async () => {
    const { dispatcher, auditLogger } = createTestDispatcher();

    // 1. Thiếu trường title bắt buộc trong project.create
    const missingTitle = await dispatcher.dispatch({
      channel: 'project.create',
      payload: { projectDir: '/Users/demo/projects/p1' },
      actor: FIXTURE_ACTORS.desktopUser
    });

    expect(missingTitle.ok).toBe(false);
    if (!missingTitle.ok) {
      expect(missingTitle.error.code).toBe('IPC_VALIDATION_FAILED');
      expect(missingTitle.error.recoverable).toBe(true);
      expect(missingTitle.error.details).toBeDefined();
      const fieldErrors = missingTitle.error.details?.fieldErrors as Record<string, string[]>;
      expect(fieldErrors.title).toBeDefined();
    }

    // 2. Chế độ chạy SELECTED nhưng không truyền sectionId
    const invalidSelectedRun = await dispatcher.dispatch({
      channel: 'run.plan',
      payload: { mode: 'SELECTED' },
      actor: FIXTURE_ACTORS.desktopUser
    });

    expect(invalidSelectedRun.ok).toBe(false);
    if (!invalidSelectedRun.ok) {
      expect(invalidSelectedRun.error.code).toBe('IPC_VALIDATION_FAILED');
    }

    // 3. Thừa trường không khai báo (strict schema)
    const extraFieldResult = await dispatcher.dispatch({
      channel: 'section.get',
      payload: { sectionId: 'sec-01', unexpectedInjectedFlag: true },
      actor: FIXTURE_ACTORS.desktopUser
    });

    expect(extraFieldResult.ok).toBe(false);
    if (!extraFieldResult.ok) {
      expect(extraFieldResult.error.code).toBe('IPC_VALIDATION_FAILED');
    }

    const audits = auditLogger.listRecent(5);
    expect(audits.every((a) => a.outcome === 'VALIDATION_ERROR')).toBe(true);
  });

  it('chặn đứng đường dẫn chứa chuỗi vượt cấp thư mục (Path Traversal ..) hoặc ký tự null', async () => {
    const { dispatcher } = createTestDispatcher();

    for (const unsafePath of [
      '../../../etc/passwd',
      '/Users/demo/projects/../../secret.docx',
      'C:\\projects\\..\\system32\\cmd.exe',
      '/Users/demo/file\0.docx'
    ]) {
      const res = await dispatcher.dispatch({
        channel: 'project.importTemplate',
        payload: { filePath: unsafePath },
        actor: FIXTURE_ACTORS.desktopUser
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('IPC_VALIDATION_FAILED');
      }
    }
  });

  it('cấm tuyệt đối cả 6 vai trò AI gọi lệnh phê duyệt hoặc xuất DOCX (CAPABILITY_DENIED)', async () => {
    const { dispatcher } = createTestDispatcher();
    const allAiRoles = Object.keys(AI_ROLE_DEFAULT_CAPABILITIES) as AiRoleName[];

    for (const role of allAiRoles) {
      const aiActor = createAiActorContext(role, 'sess-check');

      for (const humanChannel of HUMAN_APPROVAL_ONLY_CHANNELS) {
        const res = await dispatcher.dispatch({
          channel: humanChannel,
          payload:
            humanChannel === 'section.approveRevision'
              ? { revisionId: 'rev-01' }
              : humanChannel === 'build.approve'
                ? { buildId: 'build-0001' }
                : { buildId: 'build-0001', destinationPath: '/tmp/out.docx' },
          actor: aiActor
        });

        expect(res.ok).toBe(false);
        if (!res.ok) {
          expect(res.error.code).toBe('CAPABILITY_DENIED');
          expect(res.error.recoverable).toBe(false);
          expect(res.auditMetadata.actorType).toBe('AI_AGENT');
          expect(res.auditMetadata.aiRole).toBe(role);
        }
      }
    }

    // Ngay cả khi một AI_AGENT bị cấu hình nhầm có quyền 'ui:user', cổng humanOnly vẫn chặn cứng
    const escalatedAiActor: ActorContext = {
      actorType: 'AI_AGENT',
      actorId: 'ai:rogue:01',
      aiRole: 'main-orchestrator',
      capabilities: ['ui:user', 'agent:read']
    };

    const rogueAttempt = await dispatcher.dispatch({
      channel: 'build.exportDocx',
      payload: { buildId: 'build-0001', destinationPath: '/tmp/export.docx' },
      actor: escalatedAiActor
    });

    expect(rogueAttempt.ok).toBe(false);
    if (!rogueAttempt.ok) {
      expect(rogueAttempt.error.code).toBe('CAPABILITY_DENIED');
      expect(rogueAttempt.error.details?.reason).toBe('HUMAN_APPROVAL_ONLY');
    }
  });

  it('áp dụng phân quyền tối thiểu đúng theo từng vai trò AI chuyên biệt', async () => {
    const { dispatcher } = createTestDispatcher();

    dispatcher.registerHandler('section.resolveAnchor', (payload) => ({
      resolved: true,
      payload
    }));
    dispatcher.registerHandler('section.saveRevision', (payload) => ({
      revisionId: 'rev-draft-01',
      status: 'REVIEW_REQUIRED',
      payload
    }));

    // Document Analyst được phép gọi section.resolveAnchor nhưng bị chặn section.saveRevision
    const docAnalystAllowed = await dispatcher.dispatch({
      channel: 'section.resolveAnchor',
      payload: { sectionId: 'sec-02' },
      actor: FIXTURE_ACTORS.docAnalyst
    });
    expect(docAnalystAllowed.ok).toBe(true);

    const docAnalystDenied = await dispatcher.dispatch({
      channel: 'section.saveRevision',
      payload: { sectionId: 'sec-02', patchSet: FIXTURE_VALID_PATCH_SET },
      actor: FIXTURE_ACTORS.docAnalyst
    });
    expect(docAnalystDenied.ok).toBe(false);
    if (!docAnalystDenied.ok) {
      expect(docAnalystDenied.error.code).toBe('CAPABILITY_DENIED');
    }

    // Section Writer được phép lưu bản nháp SectionRevision nhưng bị chặn lưu SavedRule chính thức
    const writerAllowed = await dispatcher.dispatch({
      channel: 'section.saveRevision',
      payload: { sectionId: 'sec-02', patchSet: FIXTURE_VALID_PATCH_SET },
      actor: FIXTURE_ACTORS.sectionWriter
    });
    expect(writerAllowed.ok).toBe(true);

    const writerDeniedSaveRule = await dispatcher.dispatch({
      channel: 'rule.saveVersion',
      payload: {
        ruleId: 'rule-rev',
        validatedRule: { formula: 'qty * price' },
        persistenceKind: 'REUSABLE_RULE'
      },
      actor: FIXTURE_ACTORS.sectionWriter
    });
    expect(writerDeniedSaveRule.ok).toBe(false);
    if (!writerDeniedSaveRule.ok) {
      expect(writerDeniedSaveRule.error.code).toBe('CAPABILITY_DENIED');
    }
  });

  it('chặn xuất DOCX đè lên Template V0 hoặc Source Snapshot với lỗi IMMUTABLE_TARGET_PROTECTED', async () => {
    const { dispatcher } = createTestDispatcher();
    dispatcher.registerHandler('build.exportDocx', (payload) => payload);

    for (const protectedDest of [
      '/Users/demo/project/template/original.docx',
      '/Users/demo/project/template/template-sha256.txt',
      '/Users/demo/project/sources/src-01/aabbcc/source.docx'
    ]) {
      const res = await dispatcher.dispatch({
        channel: 'build.exportDocx',
        payload: { buildId: 'build-0001', destinationPath: protectedDest },
        actor: FIXTURE_ACTORS.desktopUser
      });

      expect(res.ok).toBe(false);
      if (!res.ok) {
        expect(res.error.code).toBe('IMMUTABLE_TARGET_PROTECTED');
      }
    }
  });

  it('chuẩn hóa lỗi miền AppError, bọc lỗi lạ an toàn và luôn đính kèm auditMetadata đầy đủ', async () => {
    const { dispatcher } = createTestDispatcher();

    // 1. Thành công trên system.ping
    const pingRes = await dispatcher.dispatch<{ echo: string; registeredChannels: number }>({
      channel: 'system.ping',
      payload: { echo: 'xin-chao' },
      actor: FIXTURE_ACTORS.desktopUser,
      correlationId: 'corr-ping-2026'
    });

    expect(pingRes.ok).toBe(true);
    if (pingRes.ok) {
      expect(pingRes.data.echo).toBe('xin-chao');
      expect(pingRes.data.registeredChannels).toBeGreaterThanOrEqual(26);
      expect(pingRes.auditMetadata).toMatchObject({
        correlationId: 'corr-ping-2026',
        channel: 'system.ping',
        timestamp: FIXTURE_TIMESTAMPS.baseIso,
        actorType: 'USER',
        actorId: 'user-khanhnm',
        mutating: false,
        durationMs: 5
      });
      expect(pingRes.meta.correlationId).toBe('corr-ping-2026');
    }

    // 2. Handler ném AppError miền (ví dụ SOURCE_LOOKUP_AMBIGUOUS)
    dispatcher.registerHandler('run.execute', () => {
      throw new AppError({
        code: 'SOURCE_LOOKUP_AMBIGUOUS',
        message: 'Phát hiện 2 dòng đơn giá cùng ngày hiệu lực 01/11/2026 tại sheet BangGia.',
        details: { sheet: 'BangGia', conflictingRows: [14, 19] },
        recoverable: true
      });
    });

    const domainErrRes = await dispatcher.dispatch({
      channel: 'run.execute',
      payload: { planId: 'plan-01' },
      actor: FIXTURE_ACTORS.desktopUser
    });

    expect(domainErrRes.ok).toBe(false);
    if (!domainErrRes.ok) {
      expect(domainErrRes.error.code).toBe('SOURCE_LOOKUP_AMBIGUOUS');
      expect(domainErrRes.error.details).toEqual({ sheet: 'BangGia', conflictingRows: [14, 19] });
      expect(domainErrRes.error.recoverable).toBe(true);
    }

    // 3. Handler ném Error không kiểm soát -> bọc thành INTERNAL_UNEXPECTED_ERROR
    dispatcher.registerHandler('project.open', () => {
      throw new Error('Sqlite disk I/O raw failure');
    });

    const unexpectedRes = await dispatcher.dispatch({
      channel: 'project.open',
      payload: { projectDir: '/Users/demo/p1' },
      actor: FIXTURE_ACTORS.desktopUser
    });

    expect(unexpectedRes.ok).toBe(false);
    if (!unexpectedRes.ok) {
      expect(unexpectedRes.error.code).toBe('INTERNAL_UNEXPECTED_ERROR');
      expect(unexpectedRes.error.recoverable).toBe(false);
    }
  });
});
