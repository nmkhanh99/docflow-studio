import type {
  RunStepEvidence,
  Sha256Hash,
  TypedRuleExecutionPlan
} from '../domain';

export interface RuleSandboxExecutionOptions {
  readonly timeoutMs: number;
  readonly maxMemoryMb?: number;
  readonly executorVersion?: string;
  readonly pinnedSourceHashes?: Readonly<Record<string, Sha256Hash>>;
  readonly validationPolicy?: string;
}

export interface RuleSandboxExecutionResult {
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly evidence: RunStepEvidence;
  readonly outputHash?: Sha256Hash;
  readonly resultFingerprint: Sha256Hash;
}

/**
 * Cổng thực thi kế hoạch quy tắc có kiểu trong hộp cát tất định (`RuleExecutorPort` — Spec §6.4, §7.3 & §9.2):
 * - Cấm tuyệt đối `eval()`, `new Function()`, truy cập mạng hoặc chạy macro.
 * - Giới hạn thời gian (`timeoutMs`), chỉ đọc các snapshot nguồn trong danh sách cho phép, xuất `resultFingerprint` & `evidence`.
 */
export interface RuleExecutorPort {
  executeTypedPlan(
    executionPlan: TypedRuleExecutionPlan | Readonly<Record<string, unknown>>,
    inputs: Readonly<Record<string, unknown>>,
    options: RuleSandboxExecutionOptions
  ): Promise<RuleSandboxExecutionResult>;
}

/** Bí danh tương thích ngược với khung khởi tạo. */
export type SandboxExecutorPort = RuleExecutorPort;
