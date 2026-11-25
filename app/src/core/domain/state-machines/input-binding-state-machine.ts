import { AppError } from '../errors';
import type { InputBindingStatus } from '../lifecycle-states';

/**
 * Máy trạng thái vòng đời `InputBinding` (`DataBinding`) theo DOCFLOW_STUDIO_SPEC.md §3.1 & §6.3:
 * - READY, MISSING, AMBIGUOUS, CHANGED
 * - Áp dụng nguyên tắc Safe Defaults: khi dữ liệu `MISSING` hoặc `AMBIGUOUS` (trùng ngày hiệu lực / xung đột),
 *   bộ thực thi phải dừng an toàn và báo tọa độ nguồn chứ tuyệt đối không tự chọn bừa.
 */
export const INPUT_BINDING_STATE_TRANSITIONS: Readonly<
  Record<InputBindingStatus, readonly InputBindingStatus[]>
> = Object.freeze({
  READY: Object.freeze(['CHANGED', 'MISSING', 'AMBIGUOUS'] as const),
  MISSING: Object.freeze(['READY', 'AMBIGUOUS', 'CHANGED'] as const),
  AMBIGUOUS: Object.freeze(['READY', 'MISSING', 'CHANGED'] as const),
  CHANGED: Object.freeze(['READY', 'MISSING', 'AMBIGUOUS'] as const)
});

export function canTransitionInputBindingStatus(
  from: InputBindingStatus,
  to: InputBindingStatus
): boolean {
  return INPUT_BINDING_STATE_TRANSITIONS[from].includes(to);
}

export function transitionInputBindingStatus(
  from: InputBindingStatus,
  to: InputBindingStatus
): InputBindingStatus {
  if (!canTransitionInputBindingStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái InputBinding từ '${from}' sang '${to}'.`,
      details: {
        machine: 'InputBinding',
        from,
        to,
        allowedTargets: INPUT_BINDING_STATE_TRANSITIONS[from]
      },
      recoverable: true
    });
  }
  return to;
}

export interface InputBindingGuardDetails {
  readonly bindingId: string;
  readonly sourceId: string;
  readonly sheetName?: string;
  readonly rangeSelector?: string;
  readonly conflictingRows?: readonly number[];
}

/**
 * Kiểm tra an toàn trước khi đọc/chạy Rule trên một InputBinding (§1.2 Safe Defaults & §6.3).
 */
export function assertInputBindingExecutable(
  status: InputBindingStatus,
  details: InputBindingGuardDetails
): void {
  if (status === 'MISSING') {
    throw new AppError({
      code: 'SOURCE_DATA_MISSING',
      message: `Nguồn dữ liệu của liên kết '${details.bindingId}' đang thiếu dữ liệu tại '${details.sourceId}'.`,
      details: { ...details, bindingStatus: status },
      recoverable: true
    });
  }
  if (status === 'AMBIGUOUS') {
    throw new AppError({
      code: 'SOURCE_LOOKUP_AMBIGUOUS',
      message: `Liên kết '${details.bindingId}' gặp dữ liệu đa nghĩa hoặc trùng ngày hiệu lực tại nguồn '${details.sourceId}' — dừng để người dùng quyết định.`,
      details: { ...details, bindingStatus: status },
      recoverable: true
    });
  }
}
