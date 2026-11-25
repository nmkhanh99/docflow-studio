import {
  AI_ROLE_ALLOWED_MCP_TOOLS,
  AI_ROLE_DEFAULT_CAPABILITIES,
  AppError,
  assertAiRoleToolAllowlist,
  type AiRoleName,
  type Capability
} from '../domain';

export interface SchemaValidator<T> {
  parse(input: unknown): T;
}

export type AiProviderKind = 'agy-cli' | 'claude-cli' | 'codex-cli' | 'http-api';

export interface AiRoleSecurityPolicy {
  readonly role: AiRoleName;
  readonly capabilities: readonly Capability[];
  readonly allowedMcpTools: readonly string[];
  readonly readOnlyFilesystem: true;
  readonly allowDirectApproveOrExport: false;
}

export function getAiRoleSecurityPolicy(role: AiRoleName): AiRoleSecurityPolicy {
  return Object.freeze({
    role,
    capabilities: AI_ROLE_DEFAULT_CAPABILITIES[role],
    allowedMcpTools: AI_ROLE_ALLOWED_MCP_TOOLS[role],
    readOnlyFilesystem: true as const,
    allowDirectApproveOrExport: false as const
  });
}

export interface AiInvocationRequest<TInput> {
  readonly role: AiRoleName;
  readonly projectId: string;
  readonly correlationId: string;
  readonly scopedInput: TInput;
  readonly allowedMcpTools: readonly string[];
  readonly timeoutMs: number;
}

export interface AiToolCallAuditRecord {
  readonly toolName: string;
  readonly argsHash: string;
  readonly decision: 'allowed' | 'denied';
  readonly reason?: string;
}

export interface AiInvocationResult<TOutput> {
  readonly provider: AiProviderKind;
  readonly modelId: string;
  readonly structuredOutput: TOutput;
  readonly toolCallsAudit: readonly AiToolCallAuditRecord[];
  readonly usage?: {
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly durationMs: number;
  };
}

/**
 * Kiểm tra ràng buộc an toàn trước mọi lời gọi AI Adapter (§10 Capability Scoping):
 * - Giới hạn `timeoutMs` dương hợp lý.
 * - Đảm bảo `allowedMcpTools` là tập con của danh sách trắng công cụ ứng với đúng `role`.
 */
export function validateAiInvocationRequest<TInput>(request: AiInvocationRequest<TInput>): void {
  if (!request.projectId.trim() || !request.correlationId.trim()) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: 'Yêu cầu gọi AI thiếu projectId hoặc correlationId hợp lệ.',
      details: { projectId: request.projectId, correlationId: request.correlationId },
      recoverable: true
    });
  }

  if (!Number.isInteger(request.timeoutMs) || request.timeoutMs <= 0) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: 'Giới hạn timeoutMs của lời gọi AI phải là số nguyên dương.',
      details: { timeoutMs: request.timeoutMs },
      recoverable: true
    });
  }

  assertAiRoleToolAllowlist(request.role, request.allowedMcpTools);
}

/**
 * Cổng tích hợp AI CLI / Model API theo mẫu Strategy (`AiCliAdapterPort` — Spec §9.2 & §10):
 * - Cài đặt đồng nhất cho `agy-cli` (Antigravity CLI), `claude-cli`, `codex-cli` và `http-api`.
 * - Cưỡng chế quyền tối thiểu theo 6 vai trò AI; cấm AI tự nhẩm tính tiền, cấm tự duyệt hoặc xuất DOCX.
 */
export interface AiCliAdapterPort {
  readonly providerKind?: AiProviderKind;
  invokeRole<TInput, TOutput>(
    request: AiInvocationRequest<TInput>,
    outputSchema: SchemaValidator<TOutput>
  ): Promise<AiInvocationResult<TOutput>>;
}

/** Bí danh tương thích ngược với khung khởi tạo. */
export type AiRoleAssistantPort = AiCliAdapterPort;
