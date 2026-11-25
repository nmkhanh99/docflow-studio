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
 * Strategy Adapter tích hợp Codex CLI trong hộp cát chỉ đọc (`--sandbox read-only`).
 */
export class CodexCliAssistantAdapter implements AiCliAdapterPort {
  public readonly providerKind = 'codex-cli' as const;
  public readonly securityConfig: ValidatedAdapterSecurityConfig;

  public constructor(options: BaseCliAdapterSecurityOptions = {}) {
    this.securityConfig = validateCliAdapterSecurityOptions(
      'codex-cli',
      'codex',
      'codex-default',
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
      message: `Adapter Codex CLI cho vai trò '${request.role}' chưa được bật trong phiên khởi tạo.`,
      details: { provider: 'codex-cli', role: request.role, readOnly: true },
      recoverable: true
    });
  }
}
