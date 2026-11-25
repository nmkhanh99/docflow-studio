import { AppError } from '@core/domain';
import type { SandboxExecutorPort } from '@core/ports';

/**
 * Bộ thực thi tất định Typed Rule IR trong môi trường cô lập (cấm eval / new Function / macro).
 */
export class StubDeterministicSandboxAdapter implements SandboxExecutorPort {
  public async executeTypedPlan(): ReturnType<SandboxExecutorPort['executeTypedPlan']> {
    throw new AppError({
      code: 'SANDBOX_EXECUTION_TIMEOUT',
      message: 'Bộ thực thi Typed Rule IR trong sandbox đang ở chế độ khung khởi tạo.',
      recoverable: true
    });
  }
}
