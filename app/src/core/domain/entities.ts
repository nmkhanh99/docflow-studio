import type { ActorType, AiRoleName } from './capabilities';
import type {
  CalculationStatus,
  DataBindingStatus,
  DocumentBuildStatus,
  LayoutDiffKind,
  RuleStatus,
  SectionRevisionStatus
} from './lifecycle-states';
import type {
  HumanReviewTrigger,
  LookupTieBreakPolicy,
  RuleScalarDataType,
  TypedRuleExecutionPlan,
  TypedRuleIoSchema,
  TypedRuleTestCase
} from './typed-rule-ir';
import type { DecimalString, RoundingMode, Sha256Hash } from './value-objects';

export type { DecimalString, RoundingMode, Sha256Hash } from './value-objects';

// 1. Project
export type ProjectStatus = 'ACTIVE' | 'ARCHIVED';

export interface Project {
  readonly id: string;
  readonly title: string;
  readonly status: ProjectStatus;
  readonly currentRecipeVersion: number;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// 2. TemplateArtifact (Template V0 — bất biến, chỉ đọc, bắt buộc có sha256)
export interface OoxmlTemplateMap {
  readonly styleIds?: readonly string[];
  readonly bookmarkNames?: readonly string[];
  readonly sectionBreakCount?: number;
  readonly hasTocField?: boolean;
  readonly [key: string]: unknown;
}

export interface TemplateArtifact {
  readonly id: string;
  readonly path: string;
  readonly sha256: Sha256Hash;
  readonly parsedAt: string;
  readonly ooxmlMap: OoxmlTemplateMap;
  readonly readOnly?: true;
}

// 3. SourceArtifact (Source Snapshot — bất biến, chỉ đọc)
export type SourceArtifactType = 'EXCEL' | 'DOCX' | 'PDF' | 'CSV';

export interface SourceArtifact {
  readonly id: string;
  readonly type: SourceArtifactType;
  readonly path: string;
  readonly version: number;
  readonly sha256: Sha256Hash;
  readonly importedAt: string;
  readonly readOnly?: true;
}

// 4. LogicalSection (Section != Page — cấm dùng số trang làm định danh)
export interface LogicalSection {
  readonly id: string;
  readonly parentId: string | null;
  readonly title: string;
  readonly order: number;
  readonly startAnchor: string;
  readonly endAnchor: string;
  readonly requiredForBuild?: boolean;
}

// 5. DocumentBlock
export type DocumentBlockType = 'paragraph' | 'table' | 'image' | 'sdt' | 'range';

export interface DocumentBlock {
  readonly id: string;
  readonly sectionId: string;
  readonly ooxmlLocator: string;
  readonly type: DocumentBlockType;
  readonly styleRef: string | null;
  readonly anchorFingerprint: string;
}

// 6. DataDefinition
export interface DataValidationSpec {
  readonly nonNegative?: boolean;
  readonly minDecimal?: DecimalString;
  readonly maxDecimal?: DecimalString;
  readonly scale?: number;
  readonly roundingMode?: RoundingMode;
  readonly explicitDefault?: DecimalString | string | number | boolean | null;
  readonly [key: string]: unknown;
}

export interface DataDefinition {
  readonly key: string;
  readonly dataType: RuleScalarDataType;
  readonly unit: string | null;
  readonly validation: DataValidationSpec;
  readonly defaultPolicy: 'STOP_ON_MISSING' | 'USE_EXPLICIT_DEFAULT';
}

// 7. DataRevision
export interface DataProvenance {
  readonly originKind?: 'USER_DIRECT' | 'SOURCE_SNAPSHOT' | 'RULE_EXECUTION';
  readonly sourceId?: string;
  readonly sourceSha256?: Sha256Hash;
  readonly sheetName?: string;
  readonly cellRange?: string;
  readonly matchedRowIndex?: number;
  readonly effectiveDate?: string;
  readonly runId?: string;
  readonly ruleId?: string;
  readonly actorId?: string;
  readonly [key: string]: unknown;
}

export interface DataRevision {
  readonly id: string;
  readonly key: string;
  readonly value: DecimalString | string | number | boolean | null;
  readonly provenance: DataProvenance;
  readonly status: CalculationStatus;
  readonly version: number;
  readonly createdAt: string;
}

// 8. DataBinding
export interface DataLookupSpec {
  readonly sheetName?: string;
  readonly keyColumns?: readonly string[];
  readonly valueColumn?: string;
  readonly unitColumn?: string;
  readonly effectiveDateColumn?: string;
  readonly tieBreakPolicy?: LookupTieBreakPolicy;
  readonly [key: string]: unknown;
}

export interface DataBinding {
  readonly id: string;
  readonly targetKey?: string;
  readonly sourceId: string;
  readonly sourceSha256?: Sha256Hash;
  readonly rangeSelector: string;
  readonly lookupSpec: DataLookupSpec;
  readonly priority: number;
  readonly version: number;
  readonly status: DataBindingStatus;
}

// 9. ChangeRequest
export type ChangeKind = 'DIRECT_VALUE' | 'TEXT_EDIT' | 'RULE_UPDATE' | 'STRUCTURE_EDIT';
export type ChangeRequestStatus = 'OPEN' | 'PLANNED' | 'APPLIED' | 'CANCELLED';
export type ChangeAffectedScope = 'SINGLE_SECTION' | 'DOWNSTREAM';

export interface ChangeRequest {
  readonly id: string;
  readonly sectionId: string;
  readonly prompt: string;
  readonly changeKind: ChangeKind;
  readonly status: ChangeRequestStatus;
  readonly affectedScope: ChangeAffectedScope;
  readonly oldValue?: DecimalString | string | number | boolean | null;
  readonly newValue?: DecimalString | string | number | boolean | null;
  readonly linkedBuildId?: string | null;
  readonly createdAt: string;
  readonly updatedAt: string;
}

// 10. SavedRule (Typed Rule IR — cấm eval() / new Function() / macro)
export interface SavedRule {
  readonly id: string;
  readonly version: number;
  readonly targetSectionId?: string;
  readonly textInstruction: string;
  readonly ioSchema: TypedRuleIoSchema;
  readonly executionPlan: TypedRuleExecutionPlan;
  readonly testCases: readonly TypedRuleTestCase[];
  readonly status: RuleStatus;
  readonly requiresHumanReview: boolean;
  readonly reviewTriggers?: readonly HumanReviewTrigger[];
}

// 11. DependencyEdge
export type DagNodeType = 'SOURCE' | 'VALUE' | 'RULE' | 'SECTION' | 'BUILD';
export type DependencyEdgeType = 'USES' | 'PRODUCES' | 'REFERENCES' | 'REWRITES';

export interface DependencyEdge {
  readonly id: string;
  readonly fromId: string;
  readonly toId: string;
  readonly fromNodeType?: DagNodeType;
  readonly toNodeType?: DagNodeType;
  readonly type: DependencyEdgeType;
  readonly condition: string | null;
  readonly discoveredBy: 'USER' | 'RULE_COMPILER' | 'AI_PROPOSAL';
  readonly approved: boolean;
}

// 12. Run
export type RunMode = 'SELECTED' | 'AFFECTED' | 'FULL';
export type RunExecutionResult = 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';

export interface Run {
  readonly id: string;
  readonly mode: RunMode;
  readonly planHash: Sha256Hash;
  readonly snapshotId: string;
  readonly startedAt: string;
  readonly completedAt: string | null;
  readonly result: RunExecutionResult;
}

// 13. RunStep
export interface MatchedSourceRowEvidence {
  readonly sourceId: string;
  readonly sourceSha256: Sha256Hash;
  readonly sheetName?: string;
  readonly rowNumber: number;
  readonly effectiveDate?: string;
  readonly values: Readonly<Record<string, DecimalString | string | number | boolean | null>>;
}

export interface UnitCheckEvidence {
  readonly key: string;
  readonly expectedUnit: string;
  readonly actualUnit: string;
  readonly passed: boolean;
}

export interface RunStepEvidence {
  readonly matchedSourceRows?: readonly MatchedSourceRowEvidence[];
  readonly intermediateValues?: Readonly<
    Record<string, DecimalString | string | number | boolean | null>
  >;
  readonly unitChecks?: readonly UnitCheckEvidence[];
  readonly appliedTieBreakPolicy?: LookupTieBreakPolicy;
  readonly executedAt?: string;
  readonly [key: string]: unknown;
}

export interface RunStep {
  readonly id: string;
  readonly runId: string;
  readonly ruleId: string;
  readonly ruleVersion?: number;
  readonly inputHashes: Readonly<Record<string, Sha256Hash>>;
  readonly outputHash: Sha256Hash | null;
  readonly resultFingerprint: Sha256Hash | null;
  readonly evidence: RunStepEvidence;
  readonly errors: readonly string[];
}

// 14. SectionRevision
export const OOXML_PATCH_OPERATIONS = [
  'replaceText',
  'replaceRuns',
  'setCellValue',
  'insertParagraphAfter',
  'removeBlock',
  'replaceTableRows',
  'replaceImage',
  'setStyle'
] as const;

export type OoxmlPatchOperation = (typeof OOXML_PATCH_OPERATIONS)[number];

export interface OoxmlPatchCommand {
  readonly blockId: string;
  readonly op: OoxmlPatchOperation;
  readonly payload: Readonly<Record<string, unknown>>;
}

export interface SectionApprovalRecord {
  readonly approvedBy: string;
  readonly approvedAt: string;
}

export interface SectionRevision {
  readonly id: string;
  readonly sectionId: string;
  readonly baseTemplateHash: Sha256Hash;
  readonly ruleId: string | null;
  readonly ruleVersion: number | null;
  readonly inputFingerprint: Sha256Hash;
  readonly outputs: Readonly<Record<string, unknown>>;
  readonly patchSet: readonly OoxmlPatchCommand[];
  readonly reviewStatus: SectionRevisionStatus;
  readonly approval: SectionApprovalRecord | null;
}

// 15. BuildManifest
export const LAYOUT_POLICY_MODES = [
  'NATURAL_REFLOW',
  'PRESERVE_TEMPLATE_BREAKS',
  'STRICT_LAYOUT'
] as const;

export type LayoutPolicyMode = (typeof LAYOUT_POLICY_MODES)[number];

export interface LayoutPolicySpec {
  readonly mode?: LayoutPolicyMode;
  readonly maxAllowedPageDelta?: number;
  readonly forbidSilentFontShrink?: boolean;
  readonly [key: string]: unknown;
}

export interface RendererInfoSpec {
  readonly engineName?: string;
  readonly engineVersion?: string;
  readonly platform?: string;
  readonly [key: string]: unknown;
}

export interface BuildManifest {
  readonly id: string;
  readonly templateHash: Sha256Hash;
  readonly sourceSnapshotIds: readonly string[];
  readonly recipeVersion: number;
  readonly ruleVersions: Readonly<Record<string, number>>;
  readonly selectedRevisions: Readonly<Record<string, string>>;
  readonly layoutPolicy: LayoutPolicySpec;
  readonly rendererInfo: RendererInfoSpec;
  readonly status: DocumentBuildStatus;
}

// 16. BuildArtifact
export interface BuildLayoutReport {
  readonly sectionPages: Readonly<Record<string, readonly number[]>>;
  readonly layoutDiffs: Readonly<Record<string, LayoutDiffKind>>;
  readonly fontDependencies?: readonly string[];
}

export interface BuildArtifact {
  readonly id: string;
  readonly manifestId: string;
  readonly docxPath: string;
  readonly pdfPreviewPath: string | null;
  readonly checksum: Sha256Hash;
  readonly pageCount: number;
  readonly layoutReport: BuildLayoutReport;
  readonly createdAt: string;
}

// 17. LayoutIssue
export type LayoutIssueType =
  | 'TABLE_OVERFLOW'
  | 'ORPHAN_HEADING'
  | 'UNEXPECTED_BLANK_PAGE'
  | 'MISSING_FONT'
  | 'BAD_TABLE_SPLIT'
  | 'HEADER_FOOTER_DRIFT'
  | 'WIDOW_ORPHAN_LINE';

export type LayoutIssueSeverity = 'INFO' | 'WARNING' | 'CRITICAL';

export interface LayoutIssue {
  readonly id: string;
  readonly buildId: string;
  readonly sectionId: string | null;
  readonly blockId: string | null;
  readonly type: LayoutIssueType;
  readonly severity: LayoutIssueSeverity;
  readonly pageRange: readonly [number, number];
  readonly detail: string;
}

// Nhật ký kiểm toán hệ thống & Metadata đính kèm biên IPC (§9.4)
export interface AuditMetadata {
  readonly correlationId: string;
  readonly channel: string;
  readonly timestamp: string;
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly aiRole?: AiRoleName;
  readonly mutating: boolean;
  readonly auditEventId?: string;
  readonly durationMs: number;
}

export interface AuditEvent {
  readonly id: string;
  readonly correlationId: string;
  readonly timestamp: string;
  readonly channel: string;
  readonly actorType: ActorType;
  readonly actorId: string;
  readonly aiRole?: AiRoleName;
  readonly mutating: boolean;
  readonly outcome: 'ALLOWED' | 'DENIED' | 'VALIDATION_ERROR' | 'HANDLER_ERROR';
  readonly errorCode?: string;
  readonly targetEntityId?: string;
}
