import { spawn } from 'node:child_process';
import { createHash, randomUUID } from 'node:crypto';
import {
  AI_ROLE_ALLOWED_MCP_TOOLS,
  AppError,
  HUMAN_APPROVAL_ONLY_CHANNELS,
  assertAiRoleToolAllowlist,
  type AiRoleName
} from '@core/domain';
import type {
  AiProviderKind,
  AiToolCallAuditRecord,
  AuditLogPort
} from '@core/ports';

export const FORBIDDEN_AI_WRITE_OR_PRIVILEGED_TOOLS = Object.freeze([
  'write_file',
  'edit_file',
  'delete_file',
  'create_file',
  'replace_file_content',
  'multi_replace_file_content',
  'rename_file',
  'move_file',
  'run_command',
  'bash',
  'sh',
  'zsh',
  'exec',
  'execute_command',
  'eval',
  ...HUMAN_APPROVAL_ONLY_CHANNELS,
  'approve_revision',
  'approve_build',
  'export_docx'
] as const);

export const PURE_READ_ONLY_AI_ROLES: ReadonlySet<AiRoleName> = new Set<AiRoleName>([
  'document-analyst',
  'source-analyst',
  'reviewer'
]);

export const PROPOSAL_GATEWAY_MCP_TOOLS: ReadonlySet<string> = new Set<string>([
  'propose_rule_draft',
  'run_rule_sandbox_test',
  'propose_section_patch'
]);

export interface McpStdioServerSpec {
  readonly transport?: 'stdio';
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
}

export interface McpStreamableHttpServerSpec {
  readonly transport: 'streamable-http';
  readonly url: string;
  readonly headers?: Readonly<Record<string, string>>;
}

export type ScopedMcpServerSpec = McpStdioServerSpec | McpStreamableHttpServerSpec;

export interface CliSubprocessExecutionInput {
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly stdinPayload: string;
  readonly timeoutMs: number;
  readonly abortSignal?: AbortSignal;
}

export interface CliSubprocessExecutionOutput {
  readonly exitCode: number;
  readonly stdout: string;
  readonly stderr: string;
  readonly durationMs: number;
}

export type CliSubprocessRunner = (
  input: CliSubprocessExecutionInput
) => Promise<CliSubprocessExecutionOutput>;

export interface BaseCliAdapterSecurityOptions {
  readonly enabled?: boolean;
  readonly binaryPath?: string;
  readonly modelId?: string;
  readonly readOnly?: boolean;
  readonly allowWriteTools?: boolean;
  readonly allowDirectApproveOrExport?: boolean;
  readonly allowExternalNetwork?: boolean;
  readonly extraSystemTools?: readonly string[];
  readonly roleToolOverrides?: Partial<Readonly<Record<AiRoleName, readonly string[]>>>;
  readonly customMcpServers?: Readonly<Record<string, ScopedMcpServerSpec>>;
  readonly readonlyMcpServerEntryPath?: string;
  readonly proposalMcpServerEntryPath?: string;
  readonly commandRunner?: CliSubprocessRunner;
  readonly auditLogger?: AuditLogPort;
}

export interface ValidatedAdapterSecurityConfig {
  readonly enabled: boolean;
  readonly binaryPath: string;
  readonly modelId: string;
  readonly readOnly: true;
  readonly allowWriteTools: false;
  readonly allowDirectApproveOrExport: false;
  readonly allowExternalNetwork: boolean;
  readonly roleToolAllowlists: Readonly<Record<AiRoleName, readonly string[]>>;
  readonly customMcpServers: Readonly<Record<string, ScopedMcpServerSpec>>;
  readonly readonlyMcpServerEntryPath: string;
  readonly proposalMcpServerEntryPath: string;
}

/**
 * Kiểm tra cấu hình bảo mật của AI CLI Adapter ngay từ lúc khởi tạo (Spec §10 & Tài liệu 10 §3, §6):
 * - Cưỡng chế `readOnly: true`, `allowWriteTools: false`, `allowDirectApproveOrExport: false`.
 * - Từ chối bất kỳ công cụ ghi hệ thống, chạy shell hay phê duyệt/xuất tài liệu nào.
 * - Từ chối mọi `roleToolOverrides` vượt ra ngoài danh sách trắng của vai trò tương ứng.
 * - Từ chối cấu hình MCP dùng giao thức `/sse` cũ hoặc tắt cờ `READONLY` trên kết nối cơ sở dữ liệu.
 */
export function validateCliAdapterSecurityOptions(
  provider: AiProviderKind,
  defaultBinary: string,
  defaultModelId: string,
  options: BaseCliAdapterSecurityOptions = {}
): ValidatedAdapterSecurityConfig {
  if (options.readOnly === false) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Adapter '${provider}' bắt buộc khởi chạy ở chế độ chỉ đọc (readOnly: true); từ chối cấu hình mở quyền ghi hệ thống tệp.`,
      details: { provider, violatedPolicy: 'READ_ONLY_FILESYSTEM_REQUIRED' },
      recoverable: false
    });
  }

  if (options.allowWriteTools === true) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Adapter '${provider}' cấm cấp quyền các công cụ ghi file hoặc chạy shell hệ thống (allowWriteTools: true bị từ chối).`,
      details: { provider, violatedPolicy: 'SYSTEM_WRITE_TOOLS_FORBIDDEN' },
      recoverable: false
    });
  }

  if (options.allowDirectApproveOrExport === true) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Adapter '${provider}' cấm cấp quyền phê duyệt chính thức hoặc xuất tài liệu DOCX cho AI Agent.`,
      details: { provider, violatedPolicy: 'HUMAN_APPROVAL_ONLY' },
      recoverable: false
    });
  }

  if (options.extraSystemTools && options.extraSystemTools.length > 0) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Adapter '${provider}' từ chối cấp thêm công cụ ngoài danh mục vai trò cho phép: ${options.extraSystemTools.join(', ')}.`,
      details: {
        provider,
        unauthorizedSystemTools: [...options.extraSystemTools],
        violatedPolicy: 'EXTRA_SYSTEM_TOOLS_FORBIDDEN'
      },
      recoverable: false
    });
  }

  const roleToolAllowlists: Record<AiRoleName, readonly string[]> = {
    'main-orchestrator': AI_ROLE_ALLOWED_MCP_TOOLS['main-orchestrator'],
    'document-analyst': AI_ROLE_ALLOWED_MCP_TOOLS['document-analyst'],
    'source-analyst': AI_ROLE_ALLOWED_MCP_TOOLS['source-analyst'],
    'rule-planner': AI_ROLE_ALLOWED_MCP_TOOLS['rule-planner'],
    'section-writer': AI_ROLE_ALLOWED_MCP_TOOLS['section-writer'],
    reviewer: AI_ROLE_ALLOWED_MCP_TOOLS.reviewer
  };

  if (options.roleToolOverrides) {
    for (const [roleKey, customTools] of Object.entries(options.roleToolOverrides)) {
      const role = roleKey as AiRoleName;
      if (!Object.prototype.hasOwnProperty.call(AI_ROLE_ALLOWED_MCP_TOOLS, role)) {
        throw new AppError({
          code: 'CAPABILITY_DENIED',
          message: `Vai trò AI không hợp lệ trong cấu hình '${provider}': '${roleKey}'.`,
          details: { provider, role: roleKey },
          recoverable: false
        });
      }
      if (customTools) {
        assertAiRoleToolAllowlist(role, customTools);
        roleToolAllowlists[role] = Object.freeze([...customTools]);
      }
    }
  }

  const validatedCustomMcp: Record<string, ScopedMcpServerSpec> = {};
  if (options.customMcpServers) {
    for (const [serverName, spec] of Object.entries(options.customMcpServers)) {
      validateScopedMcpServerSpec(provider, serverName, spec);
      validatedCustomMcp[serverName] = spec;
    }
  }

  const binaryPath = (options.binaryPath ?? defaultBinary).trim();
  if (!binaryPath || /[\s;&|`$<>]/.test(binaryPath)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Đường dẫn thực thi CLI của '${provider}' không hợp lệ hoặc chứa ký tự shell nguy hiểm.`,
      details: { provider, binaryPath },
      recoverable: false
    });
  }

  return Object.freeze({
    enabled: Boolean(options.enabled),
    binaryPath,
    modelId: (options.modelId ?? defaultModelId).trim() || defaultModelId,
    readOnly: true as const,
    allowWriteTools: false as const,
    allowDirectApproveOrExport: false as const,
    allowExternalNetwork: Boolean(options.allowExternalNetwork),
    roleToolAllowlists: Object.freeze(roleToolAllowlists),
    customMcpServers: Object.freeze(validatedCustomMcp),
    readonlyMcpServerEntryPath:
      options.readonlyMcpServerEntryPath ?? './mcp/docflow-readonly-server.mjs',
    proposalMcpServerEntryPath:
      options.proposalMcpServerEntryPath ?? './mcp/docflow-proposal-server.mjs'
  });
}

function validateScopedMcpServerSpec(
  provider: AiProviderKind,
  serverName: string,
  spec: ScopedMcpServerSpec
): void {
  if (spec.transport === 'streamable-http') {
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(spec.url);
    } catch {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `URL của MCP server '${serverName}' không hợp lệ: '${spec.url}'.`,
        details: { provider, serverName, url: spec.url },
        recoverable: false
      });
    }
    if (/\/sse(\/|$)/i.test(parsedUrl.pathname)) {
      throw new AppError({
        code: 'CAPABILITY_DENIED',
        message: `MCP server '${serverName}' sử dụng giao thức '/sse' cũ bị cấm; chỉ chấp nhận Stdio hoặc Streamable HTTP ('/mcp').`,
        details: { provider, serverName, url: spec.url },
        recoverable: false
      });
    }
    return;
  }

  const env = spec.env;
  if (
    env.DB_READONLY === 'false' ||
    env.SQLITE_OPEN_READONLY === 'false' ||
    env.DOCFLOW_MCP_MODE === 'READWRITE' ||
    env.DENY_APPROVAL_AND_EXPORT === 'false'
  ) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `MCP server '${serverName}' cố tình tắt chế độ khóa chỉ đọc hoặc mở quyền phê duyệt/xuất trái phép.`,
      details: { provider, serverName, env },
      recoverable: false
    });
  }
}

/**
 * Xây dựng cấu hình MCP tối thiểu cho đúng phiên gọi của `role` (Tài liệu 10 §6.2 & §6.3):
 * - Luôn gắn `docflow-project-readonly` (Stdio, `SQLITE_OPEN_READONLY=true`).
 * - Chỉ gắn `docflow-proposal-gateway` (`DOCFLOW_PROPOSAL_ONLY=true`, `DENY_APPROVAL_AND_EXPORT=true`)
 *   khi vai trò không phải thuần chỉ đọc VÀ có yêu cầu công cụ đề xuất hợp lệ trong allowlist.
 */
export function buildRoleScopedMcpServers(
  config: ValidatedAdapterSecurityConfig,
  role: AiRoleName,
  effectiveAllowedTools: readonly string[]
): Readonly<Record<string, ScopedMcpServerSpec>> {
  const servers: Record<string, ScopedMcpServerSpec> = {
    'docflow-project-readonly': Object.freeze({
      transport: 'stdio',
      command: 'node',
      args: Object.freeze([config.readonlyMcpServerEntryPath]),
      env: Object.freeze({
        DOCFLOW_MCP_MODE: 'READONLY',
        DB_READONLY: 'true',
        SQLITE_OPEN_READONLY: 'true',
        ALLOW_EXTERNAL_NETWORK: 'false',
        DOCFLOW_AI_ROLE: role
      })
    })
  };

  const needsProposalGateway =
    !PURE_READ_ONLY_AI_ROLES.has(role) &&
    effectiveAllowedTools.some((tool) => PROPOSAL_GATEWAY_MCP_TOOLS.has(tool));

  if (needsProposalGateway) {
    servers['docflow-proposal-gateway'] = Object.freeze({
      transport: 'stdio',
      command: 'node',
      args: Object.freeze([config.proposalMcpServerEntryPath]),
      env: Object.freeze({
        DOCFLOW_PROPOSAL_ONLY: 'true',
        DB_READONLY: 'true',
        DENY_APPROVAL_AND_EXPORT: 'true',
        DOCFLOW_AI_ROLE: role
      })
    });
  }

  for (const [customName, customSpec] of Object.entries(config.customMcpServers)) {
    servers[customName] = customSpec;
  }

  return Object.freeze(servers);
}

/**
 * Tạo môi trường sạch (sanitized environment) cho tiến trình CLI con, lọc bỏ khóa nhạy cảm không cần thiết
 * và khóa cứng các biến môi trường bảo vệ chỉ đọc.
 */
export function buildSanitizedReadOnlyCliEnv(
  role: AiRoleName,
  projectId: string,
  correlationId: string,
  allowExternalNetwork: boolean
): Readonly<Record<string, string>> {
  const safePassthroughKeys = ['PATH', 'HOME', 'TMPDIR', 'TEMP', 'LANG', 'LC_ALL'];
  const env: Record<string, string> = {};

  for (const key of safePassthroughKeys) {
    const val = process.env[key];
    if (typeof val === 'string' && val.length > 0) {
      env[key] = val;
    }
  }

  env.DOCFLOW_AI_ROLE = role;
  env.DOCFLOW_PROJECT_ID = projectId;
  env.DOCFLOW_CORRELATION_ID = correlationId;
  env.DOCFLOW_MCP_MODE = 'READONLY';
  env.DB_READONLY = 'true';
  env.SQLITE_OPEN_READONLY = 'true';
  env.SOURCE_SNAPSHOT_READONLY = 'true';
  env.DISABLE_OFFICE_MACROS = 'true';
  env.DENY_APPROVAL_AND_EXPORT = 'true';
  env.ALLOW_EXTERNAL_NETWORK = allowExternalNetwork ? 'true' : 'false';

  return Object.freeze(env);
}

/**
 * Chạy tiến trình con thông qua `spawn` (tuyệt đối không nối chuỗi shell `exec`) kèm `timeoutMs` và `AbortSignal`.
 */
export const defaultSpawnSubprocessRunner: CliSubprocessRunner = async (
  input: CliSubprocessExecutionInput
): Promise<CliSubprocessExecutionOutput> => {
  if (input.abortSignal?.aborted) {
    throw new AppError({
      code: 'SANDBOX_EXECUTION_TIMEOUT',
      message: 'Lời gọi AI CLI đã bị hủy trước khi khởi chạy.',
      recoverable: true
    });
  }

  const startedAt = Date.now();

  return new Promise<CliSubprocessExecutionOutput>((resolvePromise, rejectPromise) => {
    const child = spawn(input.command, [...input.args], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...input.env },
      windowsHide: true
    });

    const stdoutChunks: Buffer[] = [];
    const stderrChunks: Buffer[] = [];
    let settled = false;

    const finishWithError = (error: AppError) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      input.abortSignal?.removeEventListener('abort', onAbort);
      try {
        child.kill('SIGKILL');
      } catch {
        // Bỏ qua lỗi khi tiến trình đã dừng
      }
      rejectPromise(error);
    };

    const onAbort = () => {
      finishWithError(
        new AppError({
          code: 'SANDBOX_EXECUTION_TIMEOUT',
          message: 'Tiến trình AI CLI đã bị hủy theo yêu cầu người dùng (AbortSignal).',
          details: { command: input.command },
          recoverable: true
        })
      );
    };

    const timer = setTimeout(() => {
      finishWithError(
        new AppError({
          code: 'SANDBOX_EXECUTION_TIMEOUT',
          message: `Tiến trình AI CLI vượt quá giới hạn thời gian cho phép (${String(input.timeoutMs)} ms).`,
          details: { command: input.command, timeoutMs: input.timeoutMs },
          recoverable: true
        })
      );
    }, input.timeoutMs);

    input.abortSignal?.addEventListener('abort', onAbort, { once: true });

    child.stdout.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk);
    });

    child.stderr.on('data', (chunk: Buffer) => {
      stderrChunks.push(chunk);
    });

    child.on('error', (err) => {
      finishWithError(
        new AppError({
          code: 'INTERNAL_UNEXPECTED_ERROR',
          message: `Không thể khởi chạy tiến trình AI CLI '${input.command}': ${err.message}`,
          details: { command: input.command, reason: err.message },
          recoverable: true,
          cause: err
        })
      );
    });

    child.on('close', (code) => {
      if (settled) {
        return;
      }
      settled = true;
      clearTimeout(timer);
      input.abortSignal?.removeEventListener('abort', onAbort);

      resolvePromise({
        exitCode: code ?? 1,
        stdout: Buffer.concat(stdoutChunks).toString('utf8'),
        stderr: Buffer.concat(stderrChunks).toString('utf8'),
        durationMs: Math.max(0, Date.now() - startedAt)
      });
    });

    child.stdin.write(input.stdinPayload, 'utf8');
    child.stdin.end();
  });
};

export interface RawCliJsonEnvelope {
  readonly modelId?: string;
  readonly output?: unknown;
  readonly structuredOutput?: unknown;
  readonly toolCalls?: readonly {
    readonly toolName: string;
    readonly args?: unknown;
    readonly decision?: 'allowed' | 'denied';
    readonly reason?: string;
  }[];
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
  };
}

/**
 * Đối chiếu nhật ký công cụ (`toolCalls`) trả về từ phiên AI với danh sách trắng của vai trò hiện tại.
 * Nếu phát hiện AI cố gọi công cụ ngoài allowlist, lập tức ném `CAPABILITY_DENIED`.
 */
export function verifyAndAuditToolCalls(
  provider: AiProviderKind,
  role: AiRoleName,
  effectiveAllowedTools: readonly string[],
  rawToolCalls: RawCliJsonEnvelope['toolCalls']
): readonly AiToolCallAuditRecord[] {
  if (!rawToolCalls || rawToolCalls.length === 0) {
    return Object.freeze([]);
  }

  const allowedSet = new Set<string>(effectiveAllowedTools);
  const forbiddenSet = new Set<string>(FORBIDDEN_AI_WRITE_OR_PRIVILEGED_TOOLS);
  const records: AiToolCallAuditRecord[] = [];
  const violations: string[] = [];

  for (const call of rawToolCalls) {
    const argsHash = createHash('sha256')
      .update(JSON.stringify(call.args ?? {}), 'utf8')
      .digest('hex');

    const isPermitted =
      allowedSet.has(call.toolName) &&
      !forbiddenSet.has(call.toolName) &&
      call.decision !== 'denied';

    if (!isPermitted) {
      violations.push(call.toolName);
      records.push(
        Object.freeze({
          toolName: call.toolName,
          argsHash,
          decision: 'denied',
          reason:
            call.reason ??
            `Công cụ '${call.toolName}' nằm ngoài phạm vi quyền của vai trò '${role}'.`
        })
      );
    } else {
      records.push(
        Object.freeze({
          toolName: call.toolName,
          argsHash,
          decision: 'allowed'
        })
      );
    }
  }

  if (violations.length > 0) {
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Phiên AI '${provider}' (vai trò '${role}') cố gọi công cụ bị cấm hoặc ngoài phạm vi: ${violations.join(', ')}.`,
      details: {
        provider,
        role,
        unauthorizedTools: violations,
        toolCallsAudit: records
      },
      recoverable: false
    });
  }

  return Object.freeze(records);
}

export async function recordAiAdapterAuditEvent(
  auditLogger: AuditLogPort | undefined,
  params: {
    readonly correlationId: string;
    readonly provider: AiProviderKind;
    readonly role: AiRoleName;
    readonly projectId: string;
    readonly outcome: 'ALLOWED' | 'DENIED' | 'VALIDATION_ERROR' | 'HANDLER_ERROR';
    readonly errorCode?: string;
  }
): Promise<void> {
  if (!auditLogger) {
    return;
  }
  await auditLogger.record({
    id: `aud-${randomUUID()}`,
    correlationId: params.correlationId,
    timestamp: new Date().toISOString(),
    channel: `ai.${params.provider}.${params.role}`,
    actorType: 'AI_AGENT',
    actorId: `ai:${params.role}:${params.provider}`,
    aiRole: params.role,
    mutating: false,
    outcome: params.outcome,
    ...(params.errorCode ? { errorCode: params.errorCode } : {}),
    targetEntityId: params.projectId
  });
}
