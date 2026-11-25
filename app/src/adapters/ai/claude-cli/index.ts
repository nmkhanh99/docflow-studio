import { AppError } from '@core/domain';
import {
  validateAiInvocationRequest,
  type AiCliAdapterPort,
  type AiInvocationRequest,
  type AiInvocationResult,
  type SchemaValidator
} from '@core/ports';
import {
  validateCliAdapterSecurityOptions,
  type BaseCliAdapterSecurityOptions,
  type ValidatedAdapterSecurityConfig
} from '../shared-security';

/**
 * Strategy Adapter tích hợp Claude CLI ở chế độ chỉ đọc / đề xuất (`claude -p --output-format json`).
 */
export class ClaudeCliAssistantAdapter implements AiCliAdapterPort {
  public readonly providerKind = 'claude-cli' as const;
  public readonly securityConfig: ValidatedAdapterSecurityConfig;

  public constructor(options: BaseCliAdapterSecurityOptions = {}) {
    this.securityConfig = validateCliAdapterSecurityOptions(
      'claude-cli',
      'claude',
      'claude-sonnet',
      options
    );
  }

  public async invokeRole<TInput, TOutput>(
    request: AiInvocationRequest<TInput>,
    _outputSchema: SchemaValidator<TOutput>
  ): Promise<AiInvocationResult<TOutput>> {
    validateAiInvocationRequest(request);
    throw new AppError({
      code: 'CAPABILITY_DENIED',
      message: `Adapter Claude CLI cho vai trò '${request.role}' chưa được bật trong phiên khởi tạo.`,
      details: { provider: 'claude-cli', role: request.role, readOnly: true },
      recoverable: true
    });
  }
}
