export const DOCFLOW_ERROR_CODES = [
  // 1. Validation & Bảo mật IPC
  'IPC_INVALID_CHANNEL',
  'IPC_VALIDATION_FAILED',
  'CAPABILITY_DENIED',
  // 2. Dự án & Toàn vẹn Artifact
  'PROJECT_LOCKED',
  'ARTIFACT_INTEGRITY_VIOLATION',
  'IMMUTABLE_TARGET_PROTECTED',
  // 3. Tài liệu & Patch OOXML
  'DOCX_PARSE_UNSUPPORTED_SAFE',
  'ANCHOR_DRIFT_OR_NOT_FOUND',
  'PATCH_OUT_OF_SECTION_SCOPE',
  // 4. Nguồn dữ liệu & Rule Engine
  'RULE_SCHEMA_INVALID',
  'DEPENDENCY_CYCLE_DETECTED',
  'SOURCE_DATA_MISSING',
  'SOURCE_LOOKUP_AMBIGUOUS',
  'SANDBOX_EXECUTION_TIMEOUT',
  // 5. DAG Runner & Cổng Build
  'UPSTREAM_SECTION_STALE',
  'BUILD_BLOCKED_STALE_RESULTS',
  'BUILD_BLOCKED_UNAPPROVED_REVISIONS',
  'BUILD_BLOCKED_LAYOUT_GATE',
  'RENDER_ENGINE_UNAVAILABLE',
  // 6. Bất biến miền & Máy trạng thái vòng đời
  'DOMAIN_INVARIANT_VIOLATION',
  'INVALID_STATE_TRANSITION',
  // 7. Lỗi nội bộ không mong đợi được bọc an toàn tại biên IPC
  'INTERNAL_UNEXPECTED_ERROR'
] as const;

export type DocFlowErrorCode = (typeof DOCFLOW_ERROR_CODES)[number];

export interface SerializedAppError {
  readonly code: DocFlowErrorCode;
  readonly message: string;
  readonly messageVi: string;
  readonly details?: Record<string, unknown>;
  readonly recoverable: boolean;
}

export interface AppErrorOptions {
  readonly code: DocFlowErrorCode;
  readonly message: string;
  readonly details?: Record<string, unknown>;
  readonly recoverable?: boolean;
  readonly cause?: unknown;
}

/**
 * Cấu trúc lỗi chuẩn hóa của miền DocFlow Studio.
 * Sử dụng thông báo tiếng Việt rõ ràng cho người dùng và đính kèm chi tiết có cấu trúc.
 */
export class AppError extends Error {
  public readonly code: DocFlowErrorCode;
  public readonly messageVi: string;
  public readonly details?: Record<string, unknown>;
  public readonly recoverable: boolean;

  public constructor(options: AppErrorOptions) {
    super(options.message, options.cause !== undefined ? { cause: options.cause } : undefined);
    this.name = 'AppError';
    this.code = options.code;
    this.messageVi = options.message;
    this.details = options.details;
    this.recoverable = options.recoverable ?? false;
    Object.setPrototypeOf(this, new.target.prototype);
  }

  public toJSON(): SerializedAppError {
    return {
      code: this.code,
      message: this.message,
      messageVi: this.messageVi,
      ...(this.details !== undefined ? { details: this.details } : {}),
      recoverable: this.recoverable
    };
  }
}

export function isAppError(value: unknown): value is AppError {
  return value instanceof AppError;
}
