import { AppError } from '../errors';
import {
  assertHumanApprovalActor,
  type ActorContext
} from '../capabilities';
import type { CalculationResultStatus } from '../lifecycle-states';

/**
 * Máy trạng thái vòng đời `CalculationResult` theo DOCFLOW_STUDIO_SPEC.md §3.1–3.2:
 * - Tách biệt hoàn toàn khỏi trạng thái bố cục (`LayoutDifference`).
 * - Các trạng thái: NOT_RUN, STALE, RUNNING, FAILED, RESULT_READY, APPROVED.
 * - Không thể nhảy thẳng từ NOT_RUN / STALE / FAILED / RUNNING lên APPROVED.
 * - Chuyển sang APPROVED bắt buộc phải từ RESULT_READY và do con người (`USER`) phê duyệt.
 */
export const CALCULATION_RESULT_STATE_TRANSITIONS: Readonly<
  Record<CalculationResultStatus, readonly CalculationResultStatus[]>
> = Object.freeze({
  NOT_RUN: Object.freeze(['RUNNING', 'STALE'] as const),
  STALE: Object.freeze(['RUNNING'] as const),
  RUNNING: Object.freeze(['RESULT_READY', 'FAILED', 'STALE'] as const),
  FAILED: Object.freeze(['RUNNING', 'STALE'] as const),
  RESULT_READY: Object.freeze(['APPROVED', 'STALE', 'RUNNING'] as const),
  APPROVED: Object.freeze(['STALE', 'RUNNING'] as const)
});

export interface CalculationResultTransitionContext {
  readonly actor?: ActorContext;
  readonly upstreamSectionStatuses?: Readonly<Record<string, CalculationResultStatus>>;
}

export function canTransitionCalculationResultStatus(
  from: CalculationResultStatus,
  to: CalculationResultStatus
): boolean {
  return CALCULATION_RESULT_STATE_TRANSITIONS[from].includes(to);
}

export function transitionCalculationResultStatus(
  from: CalculationResultStatus,
  to: CalculationResultStatus,
  context?: CalculationResultTransitionContext
): CalculationResultStatus {
  if (!canTransitionCalculationResultStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái CalculationResult từ '${from}' sang '${to}'.`,
      details: {
        machine: 'CalculationResult',
        from,
        to,
        allowedTargets: CALCULATION_RESULT_STATE_TRANSITIONS[from]
      },
      recoverable: true
    });
  }

  if (to === 'RUNNING' && context?.upstreamSectionStatuses) {
    const unresolvedUpstreams = Object.entries(context.upstreamSectionStatuses)
      .filter(([, status]) => status === 'STALE' || status === 'NOT_RUN' || status === 'FAILED')
      .map(([nodeId]) => nodeId);

    if (unresolvedUpstreams.length > 0) {
      throw new AppError({
        code: 'UPSTREAM_SECTION_STALE',
        message: `Không thể chạy phần hiện tại khi đầu vào thượng nguồn chưa đồng bộ: ${unresolvedUpstreams.join(', ')}.`,
        details: {
          upstreamStaleIds: unresolvedUpstreams,
          upstreamSectionStatuses: context.upstreamSectionStatuses
        },
        recoverable: true
      });
    }
  }

  if (to === 'APPROVED') {
    assertHumanApprovalActor(context?.actor, 'Phê duyệt kết quả tính toán (CalculationResult)');
  }

  return to;
}
