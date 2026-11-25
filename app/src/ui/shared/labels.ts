import {
  CALCULATION_STATUS_LABELS_VI,
  DATA_BINDING_STATUS_LABELS_VI,
  DOCUMENT_BUILD_STATUS_LABELS_VI,
  LAYOUT_DIFF_LABELS_VI,
  RULE_STATUS_LABELS_VI,
  SECTION_REVISION_STATUS_LABELS_VI,
  isCalculationResultStatus,
  isDocumentBuildStatus,
  isInputBindingStatus,
  isLayoutDifferenceStatus,
  isRuleStatus,
  isSectionRevisionStatus,
  type ActorType,
  type AuditEvent,
  type CalculationResultStatus,
  type ChangeAffectedScope,
  type ChangeKind,
  type ChangeRequestStatus,
  type DagNodeType,
  type DataBindingStatus,
  type DependencyEdgeType,
  type DocFlowErrorCode,
  type DocumentBuildStatus,
  type InputBindingStatus,
  type LayoutDifferenceStatus,
  type LayoutIssueSeverity,
  type LayoutPolicyMode,
  type ProjectStatus,
  type RuleStatus,
  type RunExecutionResult,
  type RunMode,
  type SectionRevisionStatus,
  type SourceArtifactType
} from '@core/domain';

export {
  CALCULATION_STATUS_LABELS_VI,
  DATA_BINDING_STATUS_LABELS_VI,
  DOCUMENT_BUILD_STATUS_LABELS_VI,
  LAYOUT_DIFF_LABELS_VI,
  RULE_STATUS_LABELS_VI,
  SECTION_REVISION_STATUS_LABELS_VI
};

/**
 * Bảng nhãn tiếng Việt đồng bộ với `DATA_BINDING_STATUS_LABELS_VI` cho nhóm Input / Binding (§3.1).
 */
export const INPUT_BINDING_STATUS_LABELS_VI: Readonly<Record<InputBindingStatus, string>> =
  DATA_BINDING_STATUS_LABELS_VI;

export type StatusBadgeTone = 'neutral' | 'info' | 'success' | 'warning' | 'danger';

export const RULE_STATUS_TONES: Readonly<Record<RuleStatus, StatusBadgeTone>> = Object.freeze({
  DRAFT: 'neutral',
  VALIDATED: 'info',
  APPROVED: 'success',
  DEPRECATED: 'warning'
});

export const INPUT_BINDING_STATUS_TONES: Readonly<Record<DataBindingStatus, StatusBadgeTone>> =
  Object.freeze({
    READY: 'success',
    MISSING: 'danger',
    AMBIGUOUS: 'warning',
    CHANGED: 'info'
  });

export const CALCULATION_STATUS_TONES: Readonly<Record<CalculationResultStatus, StatusBadgeTone>> =
  Object.freeze({
    NOT_RUN: 'neutral',
    STALE: 'warning',
    RUNNING: 'info',
    FAILED: 'danger',
    RESULT_READY: 'info',
    APPROVED: 'success'
  });

export const SECTION_REVISION_STATUS_TONES: Readonly<
  Record<SectionRevisionStatus, StatusBadgeTone>
> = Object.freeze({
  DRAFT: 'neutral',
  REVIEW_REQUIRED: 'warning',
  APPROVED: 'success',
  SUPERSEDED: 'neutral'
});

export const DOCUMENT_BUILD_STATUS_TONES: Readonly<Record<DocumentBuildStatus, StatusBadgeTone>> =
  Object.freeze({
    BLOCKED: 'danger',
    BUILDING: 'info',
    RENDERED: 'info',
    LAYOUT_REVIEW: 'warning',
    APPROVED: 'success',
    EXPORTED: 'success'
  });

export const LAYOUT_DIFF_TONES: Readonly<Record<LayoutDifferenceStatus, StatusBadgeTone>> =
  Object.freeze({
    SHIFTED: 'info',
    SPLIT_CHANGED: 'warning',
    OVERFLOW: 'danger',
    EMPTY_PAGE: 'warning',
    NO_CHANGE: 'neutral'
  });

export const PROJECT_STATUS_LABELS_VI: Readonly<Record<ProjectStatus, string>> = Object.freeze({
  ACTIVE: 'Đang hoạt động',
  ARCHIVED: 'Đã lưu trữ'
});

export const SOURCE_ARTIFACT_TYPE_LABELS_VI: Readonly<Record<SourceArtifactType, string>> =
  Object.freeze({
    EXCEL: 'Bảng tính Excel (.xlsx)',
    DOCX: 'Tài liệu Word (.docx)',
    PDF: 'Tài liệu PDF (.pdf)',
    CSV: 'Bảng dữ liệu (.csv)'
  });

export const CHANGE_KIND_LABELS_VI: Readonly<Record<ChangeKind, string>> = Object.freeze({
  DIRECT_VALUE: 'Sửa giá trị trực tiếp',
  TEXT_EDIT: 'Chỉnh sửa văn bản',
  RULE_UPDATE: 'Cập nhật quy tắc',
  STRUCTURE_EDIT: 'Điều chỉnh ranh giới mục'
});

export const CHANGE_REQUEST_STATUS_LABELS_VI: Readonly<Record<ChangeRequestStatus, string>> =
  Object.freeze({
    OPEN: 'Đang mở',
    PLANNED: 'Đã lập kế hoạch',
    APPLIED: 'Đã áp dụng',
    CANCELLED: 'Đã hủy'
  });

export const CHANGE_SCOPE_LABELS_VI: Readonly<Record<ChangeAffectedScope, string>> = Object.freeze({
  SINGLE_SECTION: 'Chỉ phần đang chọn',
  DOWNSTREAM: 'Lan truyền phần phụ thuộc'
});

export const DAG_NODE_TYPE_LABELS_VI: Readonly<Record<DagNodeType, string>> = Object.freeze({
  SOURCE: 'Nguồn dữ liệu (Source)',
  VALUE: 'Giá trị miền (Value)',
  RULE: 'Quy tắc (Rule)',
  SECTION: 'Phần tài liệu (Logical Section)',
  BUILD: 'Bản dựng (Build)'
});

export const DEPENDENCY_EDGE_TYPE_LABELS_VI: Readonly<Record<DependencyEdgeType, string>> =
  Object.freeze({
    USES: 'Sử dụng đầu vào',
    PRODUCES: 'Sinh kết quả',
    REFERENCES: 'Tham chiếu nguồn',
    REWRITES: 'Viết lại nội dung phần'
  });

export const RUN_MODE_LABELS_VI: Readonly<Record<RunMode, string>> = Object.freeze({
  SELECTED: 'Một phần đang chọn (Selected Section)',
  AFFECTED: 'Các phần bị ảnh hưởng (Affected Closure)',
  FULL: 'Toàn bộ quy trình (Full Recipe)'
});

export const RUN_MODE_DESCRIPTIONS_VI: Readonly<Record<RunMode, string>> = Object.freeze({
  SELECTED:
    'Chỉ thực thi quy tắc của Logical Section đang chọn khi các nút thượng nguồn đã hợp lệ; các phần hạ nguồn vẫn giữ trạng thái Cần tính lại.',
  AFFECTED:
    'Tự động xác định bao đóng phụ thuộc xuôi chiều (transitive downstream closure), chạy theo thứ tự tô-pô và tận dụng bộ nhớ đệm resultFingerprint.',
  FULL: 'Thực thi lại toàn bộ Saved Rule trên các Source Snapshot đã ghim và ghi nhận phiên chạy mới ngay cả khi kết quả không đổi.'
});

export const RUN_EXECUTION_RESULT_LABELS_VI: Readonly<Record<RunExecutionResult, string>> =
  Object.freeze({
    RUNNING: 'Đang thực thi',
    SUCCEEDED: 'Hoàn tất',
    FAILED: 'Thất bại',
    CANCELLED: 'Đã hủy'
  });

export const LAYOUT_POLICY_MODE_LABELS_VI: Readonly<Record<LayoutPolicyMode, string>> =
  Object.freeze({
    NATURAL_REFLOW: 'Dàn trang tự nhiên (Natural Reflow)',
    PRESERVE_TEMPLATE_BREAKS: 'Giữ ngắt trang của mẫu gốc (Preserve Breaks)',
    STRICT_LAYOUT: 'Kiểm soát bố cục nghiêm ngặt (Strict Layout)'
  });

export const LAYOUT_ISSUE_SEVERITY_LABELS_VI: Readonly<Record<LayoutIssueSeverity, string>> =
  Object.freeze({
    INFO: 'Thông tin',
    WARNING: 'Cảnh báo bố cục',
    CRITICAL: 'Cảnh báo nghiêm trọng'
  });

export const AUDIT_OUTCOME_LABELS_VI: Readonly<Record<AuditEvent['outcome'], string>> =
  Object.freeze({
    ALLOWED: 'Hợp lệ',
    DENIED: 'Từ chối quyền',
    VALIDATION_ERROR: 'Lỗi dữ liệu đầu vào',
    HANDLER_ERROR: 'Lỗi xử lý'
  });

export const AUDIT_OUTCOME_TONES: Readonly<Record<AuditEvent['outcome'], StatusBadgeTone>> =
  Object.freeze({
    ALLOWED: 'success',
    DENIED: 'danger',
    VALIDATION_ERROR: 'warning',
    HANDLER_ERROR: 'danger'
  });

export const ACTOR_TYPE_LABELS_VI: Readonly<Record<ActorType, string>> = Object.freeze({
  USER: 'Người dùng',
  AI_AGENT: 'Trợ lý AI (Giới hạn quyền)',
  SYSTEM: 'Hệ thống'
});

export const DOCFLOW_ERROR_CODE_LABELS_VI: Readonly<Record<DocFlowErrorCode, string>> =
  Object.freeze({
    IPC_INVALID_CHANNEL: 'Kênh IPC không hợp lệ',
    IPC_VALIDATION_FAILED: 'Dữ liệu đầu vào không hợp lệ',
    CAPABILITY_DENIED: 'Từ chối quyền thực thi',
    PROJECT_LOCKED: 'Dự án đang mở ở phiên khác',
    ARTIFACT_INTEGRITY_VIOLATION: 'Sai lệch mã băm toàn vẹn tài sản',
    IMMUTABLE_TARGET_PROTECTED: 'Đường dẫn bất biến được bảo vệ',
    DOCX_PARSE_UNSUPPORTED_SAFE: 'Không thể đọc cấu trúc DOCX an toàn',
    ANCHOR_DRIFT_OR_NOT_FOUND: 'Lệch hoặc thiếu điểm neo OOXML',
    PATCH_OUT_OF_SECTION_SCOPE: 'Bản vá vượt ngoài phạm vi phần',
    RULE_SCHEMA_INVALID: 'Lược đồ quy tắc không hợp lệ',
    DEPENDENCY_CYCLE_DETECTED: 'Phát hiện chu trình phụ thuộc',
    SOURCE_DATA_MISSING: 'Thiếu dữ liệu nguồn',
    SOURCE_LOOKUP_AMBIGUOUS: 'Tra cứu nguồn đa nghĩa / trùng hiệu lực',
    SANDBOX_EXECUTION_TIMEOUT: 'Quá thời gian chạy trong hộp cát',
    UPSTREAM_SECTION_STALE: 'Phần thượng nguồn chưa tính lại',
    BUILD_BLOCKED_STALE_RESULTS: 'Chặn dựng do còn kết quả cũ',
    BUILD_BLOCKED_UNAPPROVED_REVISIONS: 'Chặn dựng do còn bản sửa chờ duyệt',
    BUILD_BLOCKED_LAYOUT_GATE: 'Chặn tại cổng kiểm tra bố cục',
    RENDER_ENGINE_UNAVAILABLE: 'Chưa sẵn sàng bộ kết xuất bố cục',
    DOMAIN_INVARIANT_VIOLATION: 'Vi phạm bất biến miền nghiệp vụ',
    INVALID_STATE_TRANSITION: 'Chuyển trạng thái không hợp lệ',
    INTERNAL_UNEXPECTED_ERROR: 'Lỗi hệ thống nội bộ'
  });

export function getRuleStatusLabelVi(status: string): string {
  return isRuleStatus(status) ? RULE_STATUS_LABELS_VI[status] : `Không xác định (${status})`;
}

export function getInputBindingStatusLabelVi(status: string): string {
  return isInputBindingStatus(status)
    ? INPUT_BINDING_STATUS_LABELS_VI[status]
    : `Không xác định (${status})`;
}

export function getCalculationStatusLabelVi(status: string): string {
  return isCalculationResultStatus(status)
    ? CALCULATION_STATUS_LABELS_VI[status]
    : `Không xác định (${status})`;
}

export function getSectionRevisionStatusLabelVi(status: string): string {
  return isSectionRevisionStatus(status)
    ? SECTION_REVISION_STATUS_LABELS_VI[status]
    : `Không xác định (${status})`;
}

export function getDocumentBuildStatusLabelVi(status: string): string {
  return isDocumentBuildStatus(status)
    ? DOCUMENT_BUILD_STATUS_LABELS_VI[status]
    : `Không xác định (${status})`;
}

export function getLayoutDiffLabelVi(status: string): string {
  return isLayoutDifferenceStatus(status)
    ? LAYOUT_DIFF_LABELS_VI[status]
    : `Không xác định (${status})`;
}

export function getProjectStatusLabelVi(status: ProjectStatus): string {
  return PROJECT_STATUS_LABELS_VI[status];
}

export function getErrorCodeLabelVi(code: DocFlowErrorCode): string {
  return DOCFLOW_ERROR_CODE_LABELS_VI[code] ?? code;
}
