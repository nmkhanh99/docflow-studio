import { AppError, type DocFlowErrorCode } from '../errors';
import {
  assertHumanApprovalActor,
  type ActorContext
} from '../capabilities';
import type {
  BuildManifest,
  LayoutIssue,
  SectionRevision,
  Sha256Hash
} from '../entities';
import type {
  CalculationResultStatus,
  DocumentBuildStatus,
  LayoutDifferenceStatus
} from '../lifecycle-states';
import { assertWritableBuildTargetPath, normalizeSha256Hash } from '../value-objects';

/**
 * Máy trạng thái vòng đời `DocumentBuild` và Cổng kiểm soát chất lượng Build (`Build Gate`)
 * theo DOCFLOW_STUDIO_SPEC.md §3.1–3.2 & §8.3:
 * - BLOCKED -> BUILDING
 * - BUILDING -> RENDERED | BLOCKED
 * - RENDERED -> LAYOUT_REVIEW | BLOCKED
 * - LAYOUT_REVIEW -> APPROVED | BLOCKED
 * - APPROVED -> EXPORTED | BLOCKED
 * - EXPORTED -> [] (bản chụp Build đã xuất là bất biến; muốn sửa phải tạo nhánh hoặc bản dựng mới)
 */
export const DOCUMENT_BUILD_STATE_TRANSITIONS: Readonly<
  Record<DocumentBuildStatus, readonly DocumentBuildStatus[]>
> = Object.freeze({
  BLOCKED: Object.freeze(['BUILDING'] as const),
  BUILDING: Object.freeze(['RENDERED', 'BLOCKED'] as const),
  RENDERED: Object.freeze(['LAYOUT_REVIEW', 'BLOCKED'] as const),
  LAYOUT_REVIEW: Object.freeze(['APPROVED', 'BLOCKED'] as const),
  APPROVED: Object.freeze(['EXPORTED', 'BLOCKED'] as const),
  EXPORTED: Object.freeze([] as const)
});

export interface BuildGateSectionRequirement {
  readonly sectionId: string;
  readonly required: boolean;
  readonly calculationStatus: CalculationResultStatus;
  readonly expectedInputFingerprint?: Sha256Hash;
}

export interface BuildQualityGateInput {
  readonly manifest: Pick<BuildManifest, 'templateHash' | 'selectedRevisions' | 'layoutPolicy'>;
  readonly sections: readonly BuildGateSectionRequirement[];
  readonly revisionsById: Readonly<Record<string, SectionRevision>>;
  readonly layoutIssues?: readonly LayoutIssue[];
  readonly layoutDiffs?: Readonly<Record<string, LayoutDifferenceStatus>>;
  readonly baselinePageCount?: number;
  readonly renderedPageCount?: number;
  readonly blockOnCriticalLayoutIssue?: boolean;
  readonly allowHumanOverrideWithReason?: boolean;
  readonly overrideReason?: string;
}

export interface BuildQualityGateReport {
  readonly canStartBuild: boolean;
  readonly canApproveOrExport: boolean;
  readonly staleOrFailedSectionIds: readonly string[];
  readonly unapprovedOrMismatchedSectionIds: readonly string[];
  readonly blockingLayoutIssues: readonly LayoutIssue[];
  readonly strictLayoutViolationReasons: readonly string[];
  readonly overrideApplied: boolean;
  readonly blockingErrorCode: DocFlowErrorCode | null;
}

export function canTransitionDocumentBuildStatus(
  from: DocumentBuildStatus,
  to: DocumentBuildStatus
): boolean {
  return DOCUMENT_BUILD_STATE_TRANSITIONS[from].includes(to);
}

/**
 * Đánh giá toàn diện Cổng chất lượng Build (`Build Gate`):
 * 1. Không còn Section/Node bắt buộc ở trạng thái `STALE`, `NOT_RUN`, `RUNNING` hoặc `FAILED` (`BUILD_BLOCKED_STALE_RESULTS`).
 * 2. Mọi Section bắt buộc phải có `SectionRevision` đã `APPROVED`, khớp `templateHash` và khớp `expectedInputFingerprint` (`BUILD_BLOCKED_UNAPPROVED_REVISIONS`).
 * 3. Không còn `LayoutIssue` mức `CRITICAL` hoặc vi phạm `STRICT_LAYOUT` chưa có lý do override hợp lệ từ người dùng (`BUILD_BLOCKED_LAYOUT_GATE`).
 */
export function evaluateBuildQualityGate(input: BuildQualityGateInput): BuildQualityGateReport {
  const normalizedManifestTemplateHash = normalizeSha256Hash(
    input.manifest.templateHash,
    'manifest.templateHash'
  );

  const staleOrFailedSectionIds: string[] = [];
  const unapprovedOrMismatchedSectionIds: string[] = [];

  for (const sec of input.sections) {
    if (!sec.required) {
      continue;
    }

    if (
      sec.calculationStatus === 'STALE' ||
      sec.calculationStatus === 'NOT_RUN' ||
      sec.calculationStatus === 'RUNNING' ||
      sec.calculationStatus === 'FAILED'
    ) {
      staleOrFailedSectionIds.push(sec.sectionId);
    }

    const selectedRevId = input.manifest.selectedRevisions[sec.sectionId];
    if (!selectedRevId) {
      unapprovedOrMismatchedSectionIds.push(sec.sectionId);
      continue;
    }

    const rev = input.revisionsById[selectedRevId];
    if (!rev || rev.sectionId !== sec.sectionId || rev.reviewStatus !== 'APPROVED') {
      unapprovedOrMismatchedSectionIds.push(sec.sectionId);
      continue;
    }

    const revTemplateHash = normalizeSha256Hash(
      rev.baseTemplateHash,
      `revisionsById.${selectedRevId}.baseTemplateHash`
    );
    if (revTemplateHash !== normalizedManifestTemplateHash) {
      unapprovedOrMismatchedSectionIds.push(sec.sectionId);
      continue;
    }

    if (sec.expectedInputFingerprint !== undefined) {
      const expectedFp = normalizeSha256Hash(
        sec.expectedInputFingerprint,
        `sections.${sec.sectionId}.expectedInputFingerprint`
      );
      const revFp = normalizeSha256Hash(
        rev.inputFingerprint,
        `revisionsById.${selectedRevId}.inputFingerprint`
      );
      if (revFp !== expectedFp) {
        // Revision cũ đã duyệt nhưng đầu vào đã đổi -> không còn hợp lệ cho bản build mới (§1.2)
        if (!staleOrFailedSectionIds.includes(sec.sectionId)) {
          unapprovedOrMismatchedSectionIds.push(sec.sectionId);
        }
      }
    }
  }

  const blockCritical = input.blockOnCriticalLayoutIssue ?? true;
  const blockingLayoutIssues = blockCritical
    ? (input.layoutIssues ?? []).filter((issue) => issue.severity === 'CRITICAL')
    : [];

  const strictLayoutViolationReasons: string[] = [];
  if (input.manifest.layoutPolicy.mode === 'STRICT_LAYOUT') {
    if (input.layoutDiffs) {
      for (const [secId, diffKind] of Object.entries(input.layoutDiffs)) {
        if (diffKind === 'OVERFLOW' || diffKind === 'EMPTY_PAGE') {
          strictLayoutViolationReasons.push(
            `Section '${secId}' phát sinh lỗi bố cục '${diffKind}' dưới chính sách STRICT_LAYOUT.`
          );
        }
      }
    }
    if (
      input.manifest.layoutPolicy.maxAllowedPageDelta !== undefined &&
      input.baselinePageCount !== undefined &&
      input.renderedPageCount !== undefined
    ) {
      const delta = Math.abs(input.renderedPageCount - input.baselinePageCount);
      if (delta > input.manifest.layoutPolicy.maxAllowedPageDelta) {
        strictLayoutViolationReasons.push(
          `Độ lệch số trang (${delta}) vượt ngưỡng cho phép (${input.manifest.layoutPolicy.maxAllowedPageDelta}) của STRICT_LAYOUT.`
        );
      }
    }
  }

  const hasLayoutBlockers =
    blockingLayoutIssues.length > 0 || strictLayoutViolationReasons.length > 0;
  const allowOverride = input.allowHumanOverrideWithReason ?? true;
  const hasValidOverrideReason =
    typeof input.overrideReason === 'string' && input.overrideReason.trim().length >= 5;
  const overrideApplied = hasLayoutBlockers && allowOverride && hasValidOverrideReason;

  const canStartBuild =
    staleOrFailedSectionIds.length === 0 && unapprovedOrMismatchedSectionIds.length === 0;
  const canApproveOrExport = canStartBuild && (!hasLayoutBlockers || overrideApplied);

  let blockingErrorCode: DocFlowErrorCode | null = null;
  if (staleOrFailedSectionIds.length > 0) {
    blockingErrorCode = 'BUILD_BLOCKED_STALE_RESULTS';
  } else if (unapprovedOrMismatchedSectionIds.length > 0) {
    blockingErrorCode = 'BUILD_BLOCKED_UNAPPROVED_REVISIONS';
  } else if (hasLayoutBlockers && !overrideApplied) {
    blockingErrorCode = 'BUILD_BLOCKED_LAYOUT_GATE';
  }

  return Object.freeze({
    canStartBuild,
    canApproveOrExport,
    staleOrFailedSectionIds: Object.freeze(staleOrFailedSectionIds),
    unapprovedOrMismatchedSectionIds: Object.freeze(unapprovedOrMismatchedSectionIds),
    blockingLayoutIssues: Object.freeze([...blockingLayoutIssues]),
    strictLayoutViolationReasons: Object.freeze(strictLayoutViolationReasons),
    overrideApplied,
    blockingErrorCode
  });
}

function assertDataAndRevisionGatePassed(report: BuildQualityGateReport, targetState: string): void {
  if (report.staleOrFailedSectionIds.length > 0) {
    throw new AppError({
      code: 'BUILD_BLOCKED_STALE_RESULTS',
      message: `Cổng Build chặn chuyển sang '${targetState}': còn các phần bắt buộc đang STALE hoặc chưa chạy thành công (${report.staleOrFailedSectionIds.join(', ')}).`,
      details: {
        targetState,
        staleSectionIds: report.staleOrFailedSectionIds
      },
      recoverable: true
    });
  }

  if (report.unapprovedOrMismatchedSectionIds.length > 0) {
    throw new AppError({
      code: 'BUILD_BLOCKED_UNAPPROVED_REVISIONS',
      message: `Cổng Build chặn chuyển sang '${targetState}': còn SectionRevision bắt buộc chưa được người dùng APPROVED hoặc đã lệch đầu vào (${report.unapprovedOrMismatchedSectionIds.join(', ')}).`,
      details: {
        targetState,
        unapprovedSectionIds: report.unapprovedOrMismatchedSectionIds
      },
      recoverable: true
    });
  }
}

export interface DocumentBuildTransitionContext {
  readonly actor?: ActorContext;
  readonly gate?: BuildQualityGateInput;
  readonly destinationPath?: string;
}

export function transitionDocumentBuildStatus(
  from: DocumentBuildStatus,
  to: DocumentBuildStatus,
  context?: DocumentBuildTransitionContext
): DocumentBuildStatus {
  if (!canTransitionDocumentBuildStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái DocumentBuild từ '${from}' sang '${to}'.`,
      details: {
        machine: 'DocumentBuild',
        from,
        to,
        allowedTargets: DOCUMENT_BUILD_STATE_TRANSITIONS[from]
      },
      recoverable: true
    });
  }

  if (to === 'BUILDING' && context?.gate) {
    const report = evaluateBuildQualityGate(context.gate);
    assertDataAndRevisionGatePassed(report, to);
  }

  if (to === 'APPROVED' || to === 'EXPORTED') {
    assertHumanApprovalActor(
      context?.actor,
      to === 'APPROVED'
        ? 'Phê duyệt bản dựng tài liệu (DocumentBuild -> APPROVED)'
        : 'Xuất tài liệu DOCX chính thức (DocumentBuild -> EXPORTED)'
    );

    if (!context?.gate) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Chuyển DocumentBuild sang '${to}' bắt buộc phải đính kèm dữ liệu kiểm chứng Build Gate.`,
        details: { from, to },
        recoverable: false
      });
    }

    const report = evaluateBuildQualityGate(context.gate);
    assertDataAndRevisionGatePassed(report, to);

    if (!report.canApproveOrExport) {
      throw new AppError({
        code: 'BUILD_BLOCKED_LAYOUT_GATE',
        message: `Cổng Build chặn chuyển sang '${to}': phát hiện vấn đề bố cục nghiêm trọng cần xử lý hoặc cần người dùng ghi rõ lý do override.`,
        details: {
          targetState: to,
          criticalIssueIds: report.blockingLayoutIssues.map((i) => i.id),
          strictLayoutViolationReasons: report.strictLayoutViolationReasons
        },
        recoverable: true
      });
    }

    if (to === 'EXPORTED' && context.destinationPath !== undefined) {
      assertWritableBuildTargetPath(context.destinationPath, 'destinationPath');
    }
  }

  return to;
}
