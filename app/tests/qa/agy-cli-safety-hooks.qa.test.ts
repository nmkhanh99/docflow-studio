import { spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const APP_ROOT = resolve(__dirname, '../..');
const REPO_ROOT = resolve(APP_ROOT, '..');
const AGENTS_DIR = join(REPO_ROOT, '.agents');
const GUARD_SCRIPT = './scripts/guard-immutable-paths.mjs';
const SESSION_SCRIPT = './scripts/session-context.mjs';
const POST_SCRIPT = './scripts/verify-post-tool-integrity.mjs';

interface HookResult {
  readonly status: number | null;
  readonly parsed: {
    readonly decision?: string;
    readonly reason?: string;
    readonly injectSteps?: ReadonlyArray<{
      readonly systemMessage?: { readonly systemMessage?: string };
    }>;
  };
}

function invokeHookScript(
  scriptRelPath: string,
  stdinPayload: unknown,
  extraEnv?: Readonly<Record<string, string>>
): HookResult {
  const rawInput =
    typeof stdinPayload === 'string' ? stdinPayload : JSON.stringify(stdinPayload);
  const res = spawnSync(process.execPath, [scriptRelPath], {
    cwd: AGENTS_DIR,
    input: rawInput,
    encoding: 'utf8',
    env: {
      ...process.env,
      ...extraEnv
    }
  });

  return {
    status: res.status,
    parsed: JSON.parse(res.stdout.trim()) as HookResult['parsed']
  };
}

describe('QA Độc lập — Kiểm chứng Cấu hình .agents/ và Lifecycle Safety Hooks của Antigravity CLI (agy)', () => {
  it('1. Cấu trúc .agents/skills/, AGENTS.md, .agents/rules/, skills.json và mcp_config.example.json đạt chuẩn quy ước agy CLI', () => {
    // Kiểm tra dung lượng Rules (< 24.000 bytes) và AGENTS.md không dùng YAML frontmatter
    const standaloneAgentsMdFiles = ['AGENTS.md', 'app/src/core/AGENTS.md'];
    for (const rel of standaloneAgentsMdFiles) {
      const full = join(REPO_ROOT, rel);
      expect(existsSync(full), `Thiếu file rule bắt buộc: ${rel}`).toBe(true);
      const content = readFileSync(full, 'utf8');
      const byteLength = Buffer.byteLength(content, 'utf8');
      expect(byteLength).toBeGreaterThan(100);
      expect(byteLength, `${rel} vượt ngưỡng 24.000 bytes`).toBeLessThan(24_000);
      expect(
        content.trimStart().startsWith('---\n'),
        `${rel} độc lập không được dùng YAML frontmatter`
      ).toBe(false);
    }

    const projectRulesPath = join(AGENTS_DIR, 'rules/project-rules.md');
    expect(existsSync(projectRulesPath)).toBe(true);
    expect(Buffer.byteLength(readFileSync(projectRulesPath, 'utf8'), 'utf8')).toBeLessThan(24_000);

    // Kiểm tra .agents/skills.json dùng đường dẫn tương đối (không bắt đầu bằng '/' hoặc '~/')
    const skillsJson = JSON.parse(
      readFileSync(join(AGENTS_DIR, 'skills.json'), 'utf8')
    ) as { entries: Array<{ path: string }> };
    expect(Array.isArray(skillsJson.entries)).toBe(true);
    expect(skillsJson.entries.length).toBeGreaterThan(0);
    for (const entry of skillsJson.entries) {
      expect(entry.path.startsWith('/')).toBe(false);
      expect(entry.path.startsWith('~/')).toBe(false);
      expect(existsSync(join(REPO_ROOT, entry.path))).toBe(true);
    }

    // Kiểm tra toàn bộ SKILL.md trong .agents/skills/ có YAML frontmatter chuẩn (name chữ thường gạch ngang, description rõ ràng, progressive disclosure)
    const skillsRoot = join(AGENTS_DIR, 'skills');
    const skillDirs = readdirSync(skillsRoot).sort();
    expect(skillDirs).toEqual(
      expect.arrayContaining([
        'desktop-ports-architecture',
        'immutable-docx-patching',
        'typed-rule-and-provenance',
        'dag-incremental-runner',
        'agy-cli-integration',
        'task-breakdown'
      ])
    );

    for (const dirName of skillDirs) {
      const skillFile = join(skillsRoot, dirName, 'SKILL.md');
      expect(existsSync(skillFile), `Thiếu SKILL.md trong ${dirName}`).toBe(true);
      const raw = readFileSync(skillFile, 'utf8');
      const fmMatch = /^---\r?\n([\s\S]*?)\r?\n---/.exec(raw);
      expect(fmMatch, `SKILL.md của '${dirName}' thiếu YAML frontmatter`).not.toBeNull();
      const fmBody = fmMatch![1] ?? '';
      const nameMatch = /^name:\s*([a-z0-9-]+)\s*$/m.exec(fmBody);
      expect(nameMatch?.[1], `Tên skill trong frontmatter phải khớp '${dirName}'`).toBe(dirName);
      expect(/^description:\s*\S+/m.test(fmBody)).toBe(true);
      expect(raw.split('\n').length).toBeLessThanOrEqual(150);
    }

    // Kiểm tra .agents/hooks.json và .agents/mcp_config.example.json
    const hooksConfig = JSON.parse(
      readFileSync(join(AGENTS_DIR, 'hooks.json'), 'utf8')
    ) as Record<string, unknown>;
    const guardCfg = hooksConfig['docflow-immutable-guard'] as {
      enabled: boolean;
      SessionStart: unknown[];
      PreToolUse: Array<{ matcher: string; hooks: Array<{ command: string }> }>;
      PostToolUse: unknown[];
    };
    expect(guardCfg.enabled).toBe(true);
    expect(guardCfg.PreToolUse[0]?.matcher).toContain('write_file');
    expect(guardCfg.PreToolUse[0]?.matcher).toContain('edit_file');
    expect(guardCfg.PreToolUse[0]?.matcher).toContain('run_command');

    const mcpExample = JSON.parse(
      readFileSync(join(AGENTS_DIR, 'mcp_config.example.json'), 'utf8')
    ) as {
      mcpServers: Record<string, { command: string; env: Record<string, string> }>;
    };
    for (const server of Object.values(mcpExample.mcpServers)) {
      expect(server.env.DB_READONLY).toBe('true');
    }
  });

  it('2. Kiểm thử thực thi trực tiếp PreToolUse / PostToolUse / SessionStart hooks: chặn 100% thao tác ghi đè tài sản bất biến và cho phép sửa app/src/', () => {
    const tempBuildRoot = mkdtempSync(join(tmpdir(), 'docflow-qa-hook-builds-'));
    try {
      const existingBuildDir = join(tempBuildRoot, 'builds', 'build-0001');
      mkdirSync(existingBuildDir, { recursive: true });
      const lockedManifestPath = join(existingBuildDir, 'manifest.json');
      writeFileSync(lockedManifestPath, '{"id":"build-0001"}', 'utf8');

      const denyScenarios: ReadonlyArray<{
        readonly name: string;
        readonly env?: Readonly<Record<string, string>>;
        readonly toolCall: { readonly name: string; readonly args: Record<string, unknown> };
      }> = [
        {
          name: 'Ghi đè Template V0 (original.docx) bằng write_file',
          toolCall: {
            name: 'write_file',
            args: { Path: '/tmp/proj/template/original.docx', Content: 'tamper', Overwrite: true }
          }
        },
        {
          name: 'Sửa tệp khóa băm template-sha256.txt bằng edit_file',
          toolCall: {
            name: 'edit_file',
            args: { Path: '/tmp/proj/template/template-sha256.txt', Target: 'a', Replacement: 'b' }
          }
        },
        {
          name: 'Xóa tệp trong thư mục Source Snapshot (sources/) bằng delete_file',
          toolCall: {
            name: 'delete_file',
            args: { Path: `/tmp/proj/${'sources'}/excel-1/${'1'.repeat(64)}/source.xlsx` }
          }
        },
        {
          name: 'Ghi vào kho mẫu kiểm thử chỉ đọc (corpus/)',
          toolCall: {
            name: 'write_file',
            args: { Path: `${'corpus'}/mau-kiem-thu-01.docx`, Content: 'x' }
          }
        },
        {
          name: 'Sửa đặc tả gốc docs/DOCFLOW_STUDIO_SPEC.md',
          toolCall: {
            name: 'edit_file',
            args: { Path: 'docs/DOCFLOW_STUDIO_SPEC.md', Target: '1.0', Replacement: '9.9' }
          }
        },
        {
          name: 'Ghi đè Prototype docs/DocFlow_Interactive_Mockup.html',
          toolCall: {
            name: 'write_file',
            args: {
              Path: join(REPO_ROOT, 'docs/DocFlow_Interactive_Mockup.html'),
              Content: '<html></html>',
              Overwrite: true
            }
          }
        },
        {
          name: 'Sửa/xóa cả 4 ảnh tham chiếu docs/mockup_01..04_*.png',
          toolCall: {
            name: 'write_file',
            args: { Path: 'docs/mockup_01_workspace.png', Content: 'png' }
          }
        },
        {
          name: 'Dùng lệnh shell rm xóa ảnh docs/mockup_04_build.png',
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'rm -f docs/mockup_04_build.png' }
          }
        },
        {
          name: 'Dùng lệnh shell redirect ghi đè original.docx',
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'echo bad > /tmp/proj/template/original.docx' }
          }
        },
        {
          name: 'Dùng lệnh shell vô hiệu hóa .agents/hooks.json',
          toolCall: {
            name: 'run_command',
            args: { CommandLine: 'cp /tmp/fake.json .agents/hooks.json' }
          }
        },
        {
          name: 'Ghi đè bản dựng lịch sử đã chốt builds/build-0001/manifest.json',
          toolCall: {
            name: 'write_file',
            args: { Path: lockedManifestPath, Content: '{}', Overwrite: true }
          }
        },
        {
          name: 'Vai trò AI chỉ đọc (reviewer) cố gọi write_file vào app/src/',
          env: { DOCFLOW_AI_ROLE: 'reviewer' },
          toolCall: {
            name: 'write_file',
            args: { Path: 'app/src/ui/temp.ts', Content: 'export const a = 1;' }
          }
        },
        {
          name: 'AI Agent cố gọi MCP tool phê duyệt chính thức',
          env: { DOCFLOW_AI_ROLE: 'section-writer' },
          toolCall: {
            name: 'call_mcp_tool',
            args: { ServerName: 'docflow', ToolName: 'approve_revision', Arguments: {} }
          }
        }
      ];

      for (const sc of denyScenarios) {
        const out = invokeHookScript(
          GUARD_SCRIPT,
          {
            hookEventName: 'PreToolUse',
            cwd: REPO_ROOT,
            workspacePaths: [REPO_ROOT],
            toolCall: sc.toolCall
          },
          sc.env
        );
        expect(out.status, `[${sc.name}] Hook phải thoát với mã 0`).toBe(0);
        expect(out.parsed.decision, `[${sc.name}] Kỳ vọng decision="deny"`).toBe('deny');
        expect(typeof out.parsed.reason).toBe('string');
        expect((out.parsed.reason ?? '').length).toBeGreaterThan(10);
      }

      // Payload JSON hỏng -> fail-closed với decision: "deny"
      const malformedOut = invokeHookScript(GUARD_SCRIPT, '{not-valid-json');
      expect(malformedOut.status).toBe(0);
      expect(malformedOut.parsed.decision).toBe('deny');

      // Lệnh xóa đệ quy rm -rf trên thư mục tạm thông thường -> yêu cầu người dùng xác nhận trực tiếp ("force_ask")
      const forceAskOut = invokeHookScript(GUARD_SCRIPT, {
        hookEventName: 'PreToolUse',
        cwd: REPO_ROOT,
        workspacePaths: [REPO_ROOT],
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'rm -rf /tmp/docflow-temp-cache' }
        }
      });
      expect(forceAskOut.parsed.decision).toBe('force_ask');

      // Kịch bản hợp lệ: sửa tệp trong app/src/ và chạy lệnh kiểm tra chỉ đọc -> decision: "allow"
      const allowEditAppSrc = invokeHookScript(GUARD_SCRIPT, {
        hookEventName: 'PreToolUse',
        cwd: REPO_ROOT,
        workspacePaths: [REPO_ROOT],
        toolCall: {
          name: 'edit_file',
          args: {
            Path: 'app/src/ui/shell/AppShell.tsx',
            Target: 'DocFlow Studio',
            Replacement: 'DocFlow Studio'
          }
        }
      });
      expect(allowEditAppSrc.status).toBe(0);
      expect(allowEditAppSrc.parsed.decision).toBe('allow');

      const allowReadHash = invokeHookScript(GUARD_SCRIPT, {
        hookEventName: 'PreToolUse',
        cwd: REPO_ROOT,
        workspacePaths: [REPO_ROOT],
        toolCall: {
          name: 'run_command',
          args: { CommandLine: 'shasum -a 256 docs/DOCFLOW_STUDIO_SPEC.md' }
        }
      });
      expect(allowReadHash.status).toBe(0);
      expect(allowReadHash.parsed.decision).toBe('allow');

      // Kiểm chứng SessionStart & PostToolUse đúng hợp đồng JSON camelCase của agy CLI
      const sessionOut = invokeHookScript(SESSION_SCRIPT, { hookEventName: 'SessionStart' });
      expect(sessionOut.status).toBe(0);
      const injectedMsg = sessionOut.parsed.injectSteps?.[0]?.systemMessage?.systemMessage ?? '';
      expect(injectedMsg).toContain('original.docx');
      expect(injectedMsg).toContain('DOCFLOW_STUDIO_SPEC.md');
      expect(injectedMsg).toContain('DocFlow_Interactive_Mockup.html');

      const postOut = invokeHookScript(POST_SCRIPT, {
        hookEventName: 'PostToolUse',
        cwd: REPO_ROOT,
        toolCall: { name: 'edit_file', args: { Path: 'app/src/ui/shell/AppShell.tsx' } }
      });
      expect(postOut.status).toBe(0);
      expect(postOut.parsed).toEqual({});
    } finally {
      rmSync(tempBuildRoot, { recursive: true, force: true });
    }
  });
});
