import { AppError } from '../errors';
import {
  isLayoutDifferenceStatus,
  LAYOUT_DIFFERENCE_STATUSES,
  type CalculationResultStatus,
  type LayoutDifferenceStatus
} from '../lifecycle-states';
import type { SectionRevision } from '../entities';

/**
 * Máy trạng thái & Bộ phân loại `LayoutDifference` theo DOCFLOW_STUDIO_SPEC.md §3.1 & §8.4:
 * - Gồm 5 trạng thái: SHIFTED, SPLIT_CHANGED, OVERFLOW, EMPTY_PAGE, NO_CHANGE.
 * - Phản ánh sự thay đổi vị trí vật lý sau khi kết xuất toàn tài liệu (Full-Document Render),
 *   TUYỆT ĐỐI TÁCH BIỆT với trạng thái tính toán (`CalculationResult`) và phê duyệt nội dung (`SectionRevision`).
 */
export const LAYOUT_DIFFERENCE_STATE_TRANSITIONS: Readonly<
  Record<LayoutDifferenceStatus, readonly LayoutDifferenceStatus[]>
> = Object.freeze({
  NO_CHANGE: Object.freeze(['SHIFTED', 'SPLIT_CHANGED', 'OVERFLOW', 'EMPTY_PAGE'] as const),
  SHIFTED: Object.freeze(['NO_CHANGE', 'SPLIT_CHANGED', 'OVERFLOW', 'EMPTY_PAGE'] as const),
  SPLIT_CHANGED: Object.freeze(['NO_CHANGE', 'SHIFTED', 'OVERFLOW', 'EMPTY_PAGE'] as const),
  OVERFLOW: Object.freeze(['NO_CHANGE', 'SHIFTED', 'SPLIT_CHANGED', 'EMPTY_PAGE'] as const),
  EMPTY_PAGE: Object.freeze(['NO_CHANGE', 'SHIFTED', 'SPLIT_CHANGED', 'OVERFLOW'] as const)
});

export function canTransitionLayoutDifferenceStatus(
  from: LayoutDifferenceStatus,
  to: LayoutDifferenceStatus
): boolean {
  if (!isLayoutDifferenceStatus(from) || !isLayoutDifferenceStatus(to)) {
    return false;
  }
  return LAYOUT_DIFFERENCE_STATE_TRANSITIONS[from].includes(to);
}

export function transitionLayoutDifferenceStatus(
  from: LayoutDifferenceStatus,
  to: LayoutDifferenceStatus
): LayoutDifferenceStatus {
  if (!canTransitionLayoutDifferenceStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái LayoutDifference từ '${String(from)}' sang '${String(to)}'.`,
      details: {
        machine: 'LayoutDifference',
        from,
        to,
        validStates: LAYOUT_DIFFERENCE_STATUSES
      },
      recoverable: true
    });
  }
  return to;
}

export interface SectionLayoutObservationInput {
  readonly baselinePages: readonly number[];
  readonly renderedPages: readonly number[];
  readonly hasOverflow?: boolean;
  readonly hasUnexpectedEmptyPage?: boolean;
  readonly hasTableOrBlockSplitChange?: boolean;
}

/**
 * Phân loại khác biệt bố cục của một Section sau khi render toàn bộ DOCX so với mốc gốc.
 */
export function classifySectionLayoutDifference(
  observation: SectionLayoutObservationInput
): LayoutDifferenceStatus {
  if (observation.hasOverflow) {
    return 'OVERFLOW';
  }
  if (observation.hasUnexpectedEmptyPage) {
    return 'EMPTY_PAGE';
  }
  if (observation.hasTableOrBlockSplitChange) {
    return 'SPLIT_CHANGED';
  }
  const samePageSpan =
    observation.baselinePages.length === observation.renderedPages.length &&
    observation.baselinePages.every((page, idx) => page === observation.renderedPages[idx]);
  if (!samePageSpan) {
    return 'SHIFTED';
  }
  return 'NO_CHANGE';
}

export interface OrthogonalSectionLifecycleSnapshot {
  readonly sectionId: string;
  readonly calculationStatus: CalculationResultStatus;
  readonly activeRevision: SectionRevision | null;
  readonly layoutDiff: LayoutDifferenceStatus;
}

/**
 * Cưỡng chế nguyên tắc bất biến §3.1 & §8.4 (AC11):
 * Khi một Section chỉ đổi vị trí trang (ví dụ Section 03 dời từ trang 7 sang trang 8 do Section 01 dài thêm),
 * chỉ cập nhật `layoutDiff`, tuyệt đối KHÔNG đánh dấu `STALE` phép tính và KHÔNG thu hồi trạng thái `APPROVED` của `SectionRevision`.
 */
export function recordLayoutObservationPreservingContentState(
  current: OrthogonalSectionLifecycleSnapshot,
  nextLayoutDiff: LayoutDifferenceStatus
): OrthogonalSectionLifecycleSnapshot {
  if (!isLayoutDifferenceStatus(nextLayoutDiff)) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Giá trị LayoutDifference '${String(nextLayoutDiff)}' không hợp lệ.`,
      details: { sectionId: current.sectionId, nextLayoutDiff },
      recoverable: true
    });
  }
  return Object.freeze({
    sectionId: current.sectionId,
    calculationStatus: current.calculationStatus,
    activeRevision: current.activeRevision,
    layoutDiff: nextLayoutDiff
  });
}
