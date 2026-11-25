/**
 * 6 nhóm trạng thái vòng đời độc lập theo DOCFLOW_STUDIO_SPEC.md §3.1.
 * Tuyệt đối không gộp chung trạng thái tính toán, phê duyệt nội dung và khác biệt bố cục.
 */

// 1. Trạng thái SavedRule (Rule)
export const RULE_STATUSES = ['DRAFT', 'VALIDATED', 'APPROVED', 'DEPRECATED'] as const;
export type RuleStatus = (typeof RULE_STATUSES)[number];

export const RULE_STATUS_LABELS_VI: Readonly<Record<RuleStatus, string>> = Object.freeze({
  DRAFT: 'Nháp',
  VALIDATED: 'Đã kiểm thử',
  APPROVED: 'Đã duyệt',
  DEPRECATED: 'Ngừng dùng'
});

// 2. Trạng thái Input / DataBinding
export const INPUT_BINDING_STATUSES = ['READY', 'MISSING', 'AMBIGUOUS', 'CHANGED'] as const;
export type DataBindingStatus = (typeof INPUT_BINDING_STATUSES)[number];
export type InputBindingStatus = DataBindingStatus;

export const DATA_BINDING_STATUS_LABELS_VI: Readonly<Record<DataBindingStatus, string>> =
  Object.freeze({
    READY: 'Sẵn sàng (Đã liên kết)',
    MISSING: 'Thiếu dữ liệu',
    AMBIGUOUS: 'Mơ hồ',
    CHANGED: 'Đã thay đổi'
  });

// 3. Trạng thái Kết quả tính toán (Calculation Result)
export const CALCULATION_RESULT_STATUSES = [
  'NOT_RUN',
  'STALE',
  'RUNNING',
  'FAILED',
  'RESULT_READY',
  'APPROVED'
] as const;
export type CalculationStatus = (typeof CALCULATION_RESULT_STATUSES)[number];
export type CalculationResultStatus = CalculationStatus;

export const CALCULATION_STATUS_LABELS_VI: Readonly<Record<CalculationStatus, string>> =
  Object.freeze({
    NOT_RUN: 'Chưa chạy',
    STALE: 'Cần tính lại',
    RUNNING: 'Đang chạy',
    FAILED: 'Lỗi thực thi',
    RESULT_READY: 'Đã có kết quả (Chờ duyệt)',
    APPROVED: 'Đã duyệt'
  });

// 4. Trạng thái SectionRevision
export const SECTION_REVISION_STATUSES = [
  'DRAFT',
  'REVIEW_REQUIRED',
  'APPROVED',
  'SUPERSEDED'
] as const;
export type SectionRevisionStatus = (typeof SECTION_REVISION_STATUSES)[number];

export const SECTION_REVISION_STATUS_LABELS_VI: Readonly<Record<SectionRevisionStatus, string>> =
  Object.freeze({
    DRAFT: 'Bản nháp',
    REVIEW_REQUIRED: 'Chờ duyệt',
    APPROVED: 'Hợp lệ (Đã duyệt)',
    SUPERSEDED: 'Đã thay thế'
  });

// 5. Trạng thái DocumentBuild
export const DOCUMENT_BUILD_STATUSES = [
  'BLOCKED',
  'BUILDING',
  'RENDERED',
  'LAYOUT_REVIEW',
  'APPROVED',
  'EXPORTED'
] as const;
export type DocumentBuildStatus = (typeof DOCUMENT_BUILD_STATUSES)[number];

export const DOCUMENT_BUILD_STATUS_LABELS_VI: Readonly<Record<DocumentBuildStatus, string>> =
  Object.freeze({
    BLOCKED: 'Bị chặn',
    BUILDING: 'Đang dựng',
    RENDERED: 'Đã kết xuất',
    LAYOUT_REVIEW: 'Xem xét bố cục',
    APPROVED: 'Đã duyệt bản dựng',
    EXPORTED: 'Đã xuất DOCX'
  });

// 6. Trạng thái Khác biệt bố cục (Layout Difference) — tách biệt hoàn toàn với Content Diff
export const LAYOUT_DIFFERENCE_STATUSES = [
  'SHIFTED',
  'SPLIT_CHANGED',
  'OVERFLOW',
  'EMPTY_PAGE',
  'NO_CHANGE'
] as const;
export type LayoutDiffKind = (typeof LAYOUT_DIFFERENCE_STATUSES)[number];
export type LayoutDifferenceStatus = LayoutDiffKind;

export const LAYOUT_DIFF_LABELS_VI: Readonly<Record<LayoutDiffKind, string>> = Object.freeze({
  SHIFTED: 'Dịch trang',
  SPLIT_CHANGED: 'Đổi điểm ngắt bảng/đoạn',
  OVERFLOW: 'Tràn lề',
  EMPTY_PAGE: 'Trang trắng dư',
  NO_CHANGE: 'Không đổi bố cục'
});

export function isRuleStatus(value: unknown): value is RuleStatus {
  return typeof value === 'string' && (RULE_STATUSES as readonly string[]).includes(value);
}

export function isInputBindingStatus(value: unknown): value is InputBindingStatus {
  return typeof value === 'string' && (INPUT_BINDING_STATUSES as readonly string[]).includes(value);
}

export function isCalculationResultStatus(value: unknown): value is CalculationResultStatus {
  return (
    typeof value === 'string' && (CALCULATION_RESULT_STATUSES as readonly string[]).includes(value)
  );
}

export function isSectionRevisionStatus(value: unknown): value is SectionRevisionStatus {
  return (
    typeof value === 'string' && (SECTION_REVISION_STATUSES as readonly string[]).includes(value)
  );
}

export function isDocumentBuildStatus(value: unknown): value is DocumentBuildStatus {
  return (
    typeof value === 'string' && (DOCUMENT_BUILD_STATUSES as readonly string[]).includes(value)
  );
}

export function isLayoutDifferenceStatus(value: unknown): value is LayoutDifferenceStatus {
  return (
    typeof value === 'string' && (LAYOUT_DIFFERENCE_STATUSES as readonly string[]).includes(value)
  );
}
