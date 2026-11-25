import { AppError, isAppError, type AiRoleName } from '@core/domain';
import {
  getAiRoleSecurityPolicy,
  validateAiInvocationRequest,
  type AiCliAdapterPort,
  type AiInvocationRequest,
  type AiInvocationResult,
  type AuditLogPort,
  type SchemaValidator
} from '@core/ports';
import {
  buildRoleScopedMcpServers,
  buildSanitizedReadOnlyCliEnv,
  defaultSpawnSubprocessRunner,
  recordAiAdapterAuditEvent,
  validateCliAdapterSecurityOptions,
  verifyAndAuditToolCalls,
  type BaseCliAdapterSecurityOptions,
  type CliSubprocessRunner,
  type RawCliJsonEnvelope,
  type ScopedMcpServerSpec,
  type ValidatedAdapterSecurityConfig
} from '../shared-security';

export type AgyCliAdapterOptions = BaseCliAdapterSecurityOptions;

export interface AgySessionExecutionSpec {
  readonly provider: 'agy-cli';
  readonly role: AiRoleName;
  readonly readOnly: true;
  readonly allowWriteTools: false;
  readonly allowDirectApproveOrExport: false;
  readonly command: string;
  readonly args: readonly string[];
  readonly env: Readonly<Record<string, string>>;
  readonly mcpServers: Readonly<Record<string, ScopedMcpServerSpec>>;
  readonly effectiveAllowedTools: readonly string[];
  readonly stdinPayload: string;
}

/**
 * Strategy Adapter tích hợp Antigravity CLI (`agy`) theo `DOCFLOW_STUDIO_SPEC.md` §9.2, §10 và Tài liệu 10 §3, §6:
 * - Mặc định khởi chạy ở chế độ chỉ đọc (`readOnly: true`, `allowWriteTools: false`, `DB_READONLY=true`, `SQLITE_OPEN_READONLY=true`).
 * - Từ chối ngay lập tức mọi cấu hình cấp quyền ghi hệ thống tệp, phê duyệt hoặc công cụ vượt ngoài allowlist của 6 vai trò AI.
 * - Khởi chạy tiến trình con qua `spawn` (không nối chuỗi shell `exec`), đính kèm cấu hình MCP tối thiểu theo phiên và ghi nhật ký kiểm toán.
 */
export class AgyCliAssistantAdapter implements AiCliAdapterPort {
  public readonly providerKind = 'agy-cli' as const;
  public readonly securityConfig: ValidatedAdapterSecurityConfig;
  private readonly commandRunner: CliSubprocessRunner;
  private readonly auditLogger?: AuditLogPort;

  public constructor(options: AgyCliAdapterOptions = {}) {
    this.securityConfig = validateCliAdapterSecurityOptions(
      'agy-cli',
      'agy',
      'agy-default',
      options
    );
    this.commandRunner = options.commandRunner ?? defaultSpawnSubprocessRunner;
    this.auditLogger = options.auditLogger;
  }

  /**
   * Dựng đặc tả phiên thực thi cô lập chỉ đọc cho `agy` CLI và kiểm tra toàn bộ ràng buộc quyền trước khi gọi lệnh.
   */
  public buildSessionExecutionSpec<TInput>(
    request: AiInvocationRequest<TInput> & { readonly abortSignal?: AbortSignal }
  ): AgySessionExecutionSpec {
    validateAiInvocationRequest(request);

    const configuredRoleTools = this.securityConfig.roleToolAllowlists[request.role];
    const configuredSet = new Set(configuredRoleTools);
    const disallowedByAdapterConfig = request.allowedMcpTools.filter(
      (tool) => !configuredSet.has(tool)
    );
    if (disallowedByAdapterConfig.length > 0) {
      throw new AppError({
        code: 'CAPABILITY_DENIED',
        message: `Vai trò AI '${request.role}' yêu cầu công cụ không được bật trong cấu hình Adapter agy: ${disallowedByAdapterConfig.join(', ')}.`,
        details: {
          provider: 'agy-cli',
          role: request.role,
          unauthorizedTools: disallowedByAdapterConfig,
          configuredRoleTools
        },
        recoverable: false
      });
    }

    const rolePolicy = getAiRoleSecurityPolicy(request.role);
    const effectiveAllowedTools = Object.freeze([...request.allowedMcpTools]);
    const mcpServers = buildRoleScopedMcpServers(
      this.securityConfig,
      request.role,
      effectiveAllowedTools
    );
    const env = buildSanitizedReadOnlyCliEnv(
      request.role,
      request.projectId,
      request.correlationId,
      this.securityConfig.allowExternalNetwork
    );

    const args = Object.freeze([
      'run',
      '--non-interactive',
      '--sandbox',
      'read-only',
      '--no-write-tools',
      '--output-format',
      'json',
      '--model',
      this.securityConfig.modelId,
      '--role',
      request.role,
      ...(effectiveAllowedTools.length > 0
        ? ['--allowed-mcp-tools', effectiveAllowedTools.join(',')]
        : ['--disable-mcp-write'])
    ]);

    const stdinPayload = JSON.stringify({
      provider: 'agy-cli',
      role: request.role,
      projectId: request.projectId,
      correlationId: request.correlationId,
      securityPolicy: {
        readOnlyFilesystem: rolePolicy.readOnlyFilesystem,
        allowDirectApproveOrExport: rolePolicy.allowDirectApproveOrExport,
        capabilities: rolePolicy.capabilities,
        allowedMcpTools: effectiveAllowedTools
      },
      mcpConfig: { mcpServers },
      scopedInput: request.scopedInput
    });

    return Object.freeze({
      provider: 'agy-cli',
      role: request.role,
      readOnly: true,
      allowWriteTools: false,
      allowDirectApproveOrExport: false,
      command: this.securityConfig.binaryPath,
      args,
      env,
      mcpServers,
      effectiveAllowedTools,
      stdinPayload
    });
  }

  public async invokeRole<TInput, TOutput>(
    request: AiInvocationRequest<TInput> & { readonly abortSignal?: AbortSignal },
    outputSchema: SchemaValidator<TOutput>
  ): Promise<AiInvocationResult<TOutput>> {
    let sessionSpec: AgySessionExecutionSpec;
    try {
      sessionSpec = this.buildSessionExecutionSpec(request);
    } catch (err) {
      const code = isAppError(err) ? err.code : 'CAPABILITY_DENIED';
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId || 'corr-invalid',
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId || 'unknown',
        outcome: 'DENIED',
        errorCode: code
      });
      throw err;
    }

    if (!this.securityConfig.enabled) {
      const disabledErr = new AppError({
        code: 'CAPABILITY_DENIED',
        message: `Adapter Antigravity CLI (agy) cho vai trò '${request.role}' chưa được bật trong phiên khởi tạo (mặc định offline-first).`,
        details: { provider: 'agy-cli', role: request.role, readOnly: true },
        recoverable: true
      });
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'DENIED',
        errorCode: disabledErr.code
      });
      throw disabledErr;
    }

    let execResult;
    try {
      execResult = await this.commandRunner({
        command: sessionSpec.command,
        args: sessionSpec.args,
        env: sessionSpec.env,
        stdinPayload: sessionSpec.stdinPayload,
        timeoutMs: request.timeoutMs,
        abortSignal: request.abortSignal
      });
    } catch (err) {
      const code = isAppError(err) ? err.code : 'INTERNAL_UNEXPECTED_ERROR';
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'HANDLER_ERROR',
        errorCode: code
      });
      throw err;
    }

    if (execResult.exitCode !== 0) {
      const exitErr = new AppError({
        code: 'INTERNAL_UNEXPECTED_ERROR',
        message: `Tiến trình Antigravity CLI (agy) kết thúc với mã lỗi ${String(execResult.exitCode)}.`,
        details: {
          provider: 'agy-cli',
          role: request.role,
          exitCode: execResult.exitCode,
          stderr: execResult.stderr.slice(0, 1000)
        },
        recoverable: true
      });
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'HANDLER_ERROR',
        errorCode: exitErr.code
      });
      throw exitErr;
    }

    let parsedJson: unknown;
    try {
      parsedJson = JSON.parse(execResult.stdout);
    } catch (err) {
      const parseErr = new AppError({
        code: 'IPC_VALIDATION_FAILED',
        message: 'Đầu ra từ Antigravity CLI (agy) không phải JSON có cấu trúc hợp lệ.',
        details: { provider: 'agy-cli', role: request.role },
        recoverable: true,
        cause: err
      });
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'VALIDATION_ERROR',
        errorCode: parseErr.code
      });
      throw parseErr;
    }

    const envelope: RawCliJsonEnvelope =
      parsedJson !== null && typeof parsedJson === 'object'
        ? (parsedJson as RawCliJsonEnvelope)
        : {};

    let toolCallsAudit;
    try {
      toolCallsAudit = verifyAndAuditToolCalls(
        'agy-cli',
        request.role,
        sessionSpec.effectiveAllowedTools,
        envelope.toolCalls
      );
    } catch (err) {
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'DENIED',
        errorCode: 'CAPABILITY_DENIED'
      });
      throw err;
    }

    const candidateOutput =
      envelope.structuredOutput !== undefined
        ? envelope.structuredOutput
        : envelope.output !== undefined
          ? envelope.output
          : parsedJson;

    let validatedOutput: TOutput;
    try {
      validatedOutput = outputSchema.parse(candidateOutput);
    } catch (err) {
      const schemaErr = new AppError({
        code: 'IPC_VALIDATION_FAILED',
        message: `Kết quả đề xuất từ Antigravity CLI (vai trò '${request.role}') không khớp lược đồ đầu ra bắt buộc.`,
        details: {
          provider: 'agy-cli',
          role: request.role,
          reason: err instanceof Error ? err.message : String(err)
        },
        recoverable: true,
        cause: err
      });
      await recordAiAdapterAuditEvent(this.auditLogger, {
        correlationId: request.correlationId,
        provider: 'agy-cli',
        role: request.role,
        projectId: request.projectId,
        outcome: 'VALIDATION_ERROR',
        errorCode: schemaErr.code
      });
      throw schemaErr;
    }

    await recordAiAdapterAuditEvent(this.auditLogger, {
      correlationId: request.correlationId,
      provider: 'agy-cli',
      role: request.role,
      projectId: request.projectId,
      outcome: 'ALLOWED'
    });

    return Object.freeze({
      provider: 'agy-cli' as const,
      modelId:
        typeof envelope.modelId === 'string' && envelope.modelId.trim()
          ? envelope.modelId.trim()
          : this.securityConfig.modelId,
      structuredOutput: validatedOutput,
      toolCallsAudit,
      usage: Object.freeze({
        ...(envelope.usage?.inputTokens !== undefined
          ? { inputTokens: envelope.usage.inputTokens }
          : {}),
        ...(envelope.usage?.outputTokens !== undefined
          ? { outputTokens: envelope.usage.outputTokens }
          : {}),
        durationMs: execResult.durationMs
      })
    });
  }
}
