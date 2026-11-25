import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AgyCliAssistantAdapter,
  AiAdapterStrategyRegistry,
  defaultSpawnSubprocessRunner
} from '@adapters/ai';
import { SqliteAuditLogger } from '@infra/logging';
import { SqliteDatabaseConnection, runSqliteMigrations } from '@infra/sqlite';

describe('Integration: Khung Antigravity CLI Adapter (agy) chỉ đọc, Capability Scoping (§10) & Audit Trail', () => {
  let tempDir = '';

  beforeEach(async () => {
    tempDir = await mkdtemp(join(tmpdir(), 'docflow-agy-adapter-test-'));
  });

  afterEach(async () => {
    if (tempDir) {
      await rm(tempDir, { recursive: true, force: true });
    }
  });

  it('khởi chạy mặc định ở chế độ chỉ đọc (readOnly: true) và từ chối mọi cấu hình mở quyền ghi hoặc phê duyệt trái phép', () => {
    const defaultAdapter = new AgyCliAssistantAdapter();
    expect(defaultAdapter.providerKind).toBe('agy-cli');
    expect(defaultAdapter.securityConfig.readOnly).toBe(true);
    expect(defaultAdapter.securityConfig.allowWriteTools).toBe(false);
    expect(defaultAdapter.securityConfig.allowDirectApproveOrExport).toBe(false);

    // 1. Từ chối tắt chế độ chỉ đọc (readOnly: false)
    expect(() => new AgyCliAssistantAdapter({ readOnly: false })).toThrowError(
      expect.objectContaining({ code: 'CAPABILITY_DENIED' })
    );

    // 2. Từ chối bật write tools hệ thống
    expect(() => new AgyCliAssistantAdapter({ allowWriteTools: true })).toThrowError(
      expect.objectContaining({ code: 'CAPABILITY_DENIED' })
    );

    // 3. Từ chối bật quyền phê duyệt hoặc xuất DOCX cho AI
    expect(() => new AgyCliAssistantAdapter({ allowDirectApproveOrExport: true })).toThrowError(
      expect.objectContaining({ code: 'CAPABILITY_DENIED' })
    );

    // 4. Từ chối cấp thêm công cụ hệ thống ngoài danh mục vai trò
    expect(
      () => new AgyCliAssistantAdapter({ extraSystemTools: ['write_file', 'run_command'] })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }));

    // 5. Từ chối cấu hình ghi đè allowlist vai trò vượt quyền (vd: cấp propose_section_patch cho reviewer chỉ đọc)
    expect(
      () =>
        new AgyCliAssistantAdapter({
          roleToolOverrides: {
            reviewer: ['get_diff_and_layout_report', 'propose_section_patch']
          }
        })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }));

    // 6. Từ chối cấu hình MCP dùng giao thức /sse cũ hoặc mở ghi SQLite
    expect(
      () =>
        new AgyCliAssistantAdapter({
          customMcpServers: {
            'legacy-sse-server': {
              transport: 'streamable-http',
              url: 'https://internal.example.com/sse'
            }
          }
        })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }));

    expect(
      () =>
        new AgyCliAssistantAdapter({
          customMcpServers: {
            'unsafe-db-server': {
              command: 'node',
              args: ['./unsafe.js'],
              env: { SQLITE_OPEN_READONLY: 'false' }
            }
          }
        })
    ).toThrowError(expect.objectContaining({ code: 'CAPABILITY_DENIED' }));
  });

  it('cô lập cấu hình MCP theo đúng vai trò AI, kiểm tra đầu ra/toolCalls và lưu vết kiểm toán vào SQLite', async () => {
    const dbPath = join(tempDir, 'audit-ai.sqlite');
    const conn = new SqliteDatabaseConnection({ dbFilePath: dbPath });
    runSqliteMigrations(conn);
    const auditLogger = new SqliteAuditLogger(conn);

    try {
      // Kiểm tra đặc tả phiên cho vai trò thuần chỉ đọc (document-analyst): KHÔNG gắn proposal gateway
      const readOnlySpecAdapter = new AgyCliAssistantAdapter({ enabled: true, auditLogger });
      const docAnalystSpec = readOnlySpecAdapter.buildSessionExecutionSpec({
        role: 'document-analyst',
        projectId: 'proj-01',
        correlationId: 'corr-doc-01',
        scopedInput: { parsedDocPath: 'template/parsed-document.json' },
        allowedMcpTools: ['get_parsed_document_tree'],
        timeoutMs: 15000
      });

      expect(docAnalystSpec.args).toContain('--sandbox');
      expect(docAnalystSpec.args).toContain('read-only');
      expect(docAnalystSpec.args).toContain('--no-write-tools');
      expect(docAnalystSpec.env.DB_READONLY).toBe('true');
      expect(docAnalystSpec.env.SQLITE_OPEN_READONLY).toBe('true');
      expect(docAnalystSpec.env.DENY_APPROVAL_AND_EXPORT).toBe('true');
      expect(Object.keys(docAnalystSpec.mcpServers)).toEqual(['docflow-project-readonly']);

      // Vai trò đề xuất (section-writer) khi yêu cầu propose_section_patch được gắn thêm cổng proposal có kiểm soát
      const writerSpec = readOnlySpecAdapter.buildSessionExecutionSpec({
        role: 'section-writer',
        projectId: 'proj-01',
        correlationId: 'corr-writer-01',
        scopedInput: { sectionId: 'section-02', verifiedOutputs: { revenue: '3750000000' } },
        allowedMcpTools: ['get_parsed_document_tree', 'propose_section_patch'],
        timeoutMs: 15000
      });
      expect(Object.keys(writerSpec.mcpServers)).toEqual([
        'docflow-project-readonly',
        'docflow-proposal-gateway'
      ]);

      // Thực thi thành công qua runner giả lập và ghi nhận ALLOWED vào SqliteAuditLogger
      const mockSuccessAdapter = new AgyCliAssistantAdapter({
        enabled: true,
        auditLogger,
        commandRunner: async (execInput) => {
          expect(execInput.command).toBe('agy');
          expect(execInput.env.DOCFLOW_AI_ROLE).toBe('rule-planner');
          return {
            exitCode: 0,
            durationMs: 42,
            stderr: '',
            stdout: JSON.stringify({
              modelId: 'agy-carbon',
              structuredOutput: {
                proposedRuleId: 'revenue.lookup',
                requiresHumanReview: true
              },
              toolCalls: [
                {
                  toolName: 'inspect_source_schema',
                  args: { sourceId: 'excel-1' }
                }
              ],
              usage: { inputTokens: 120, outputTokens: 85 }
            })
          };
        }
      });

      const registry = new AiAdapterStrategyRegistry([mockSuccessAdapter], 'agy-cli');
      const result = await registry.getActiveAdapter().invokeRole(
        {
          role: 'rule-planner',
          projectId: 'proj-01',
          correlationId: 'corr-plan-ok',
          scopedInput: { instruction: 'Tính doanh thu từ sản lượng và đơn giá' },
          allowedMcpTools: ['inspect_source_schema', 'propose_rule_draft'],
          timeoutMs: 15000
        },
        {
          parse: (raw) => {
            const obj = raw as { proposedRuleId: string; requiresHumanReview: boolean };
            if (typeof obj?.proposedRuleId !== 'string') {
              throw new Error('Thiếu proposedRuleId');
            }
            return obj;
          }
        }
      );

      expect(result.provider).toBe('agy-cli');
      expect(result.structuredOutput.proposedRuleId).toBe('revenue.lookup');
      expect(result.toolCallsAudit).toHaveLength(1);
      expect(result.toolCallsAudit[0]?.decision).toBe('allowed');

      // Chặn cứng nếu phiên AI cố lén gọi công cụ ngoài allowlist (vd: write_file) trong transcript
      const rogueToolAdapter = new AgyCliAssistantAdapter({
        enabled: true,
        auditLogger,
        commandRunner: async () => ({
          exitCode: 0,
          durationMs: 15,
          stderr: '',
          stdout: JSON.stringify({
            structuredOutput: { ok: true },
            toolCalls: [{ toolName: 'write_file', args: { path: 'template/original.docx' } }]
          })
        })
      });

      await expect(
        rogueToolAdapter.invokeRole(
          {
            role: 'reviewer',
            projectId: 'proj-01',
            correlationId: 'corr-rogue-denied',
            scopedInput: {},
            allowedMcpTools: ['get_diff_and_layout_report'],
            timeoutMs: 10000
          },
          { parse: (v) => v }
        )
      ).rejects.toMatchObject({
        code: 'CAPABILITY_DENIED',
        details: {
          unauthorizedTools: ['write_file']
        }
      });

      const recordedEvents = auditLogger.listRecent(10);
      expect(recordedEvents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            correlationId: 'corr-plan-ok',
            actorType: 'AI_AGENT',
            aiRole: 'rule-planner',
            outcome: 'ALLOWED'
          }),
          expect.objectContaining({
            correlationId: 'corr-rogue-denied',
            actorType: 'AI_AGENT',
            aiRole: 'reviewer',
            outcome: 'DENIED',
            errorCode: 'CAPABILITY_DENIED'
          })
        ])
      );
    } finally {
      conn.close();
    }
  });

  it('hủy tiến trình con an toàn qua spawn (không dùng shell) và trả về SANDBOX_EXECUTION_TIMEOUT khi quá hạn', async () => {
    await expect(
      defaultSpawnSubprocessRunner({
        command: process.execPath,
        args: ['-e', 'setTimeout(() => {}, 5000)'],
        env: { PATH: process.env.PATH ?? '' },
        stdinPayload: '{}',
        timeoutMs: 80
      })
    ).rejects.toMatchObject({
      code: 'SANDBOX_EXECUTION_TIMEOUT'
    });
  });
});
