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
 * Strategy Adapter gọi trực tiếp Model HTTP API khi dự án bật cho phép kết nối ngoài.
 */
export class HttpApiAssistantAdapter implements AiCliAdapterPort {
  public readonly providerKind = 'http-api' as const;
  public readonly securityConfig: ValidatedAdapterSecurityConfig;

  public constructor(options: BaseCliAdapterSecurityOptions = {}) {
    this.securityConfig = validateCliAdapterSecurityOptions(
      'http-api',
      'https-endpoint',
      'remote-model',
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
      message: `Adapter HTTP Model API cho vai trò '${request.role}' đang tắt mặc định (chế độ offline-first).`,
      details: { provider: 'http-api', role: request.role, readOnly: true },
      recoverable: true
    });
  }
}
