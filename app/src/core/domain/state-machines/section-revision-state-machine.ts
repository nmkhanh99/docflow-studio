import { AppError } from '../errors';
import {
  assertHumanApprovalActor,
  type ActorContext
} from '../capabilities';
import type { SectionRevision } from '../entities';
import { createSectionRevision } from '../factories';
import type { SectionRevisionStatus } from '../lifecycle-states';
import { assertIsoTimestamp } from '../value-objects';

/**
 * Máy trạng thái vòng đời `SectionRevision` theo DOCFLOW_STUDIO_SPEC.md §1.2 & §3.1:
 * - DRAFT -> REVIEW_REQUIRED | SUPERSEDED
 * - REVIEW_REQUIRED -> DRAFT | APPROVED | SUPERSEDED
 * - APPROVED -> SUPERSEDED (khi có Revision mới của cùng Section được người dùng duyệt)
 * - SUPERSEDED -> [] (lưu giữ bất biến trong lịch sử để tra cứu/tái dựng bản cũ, không hồi sinh)
 */
export const SECTION_REVISION_STATE_TRANSITIONS: Readonly<
  Record<SectionRevisionStatus, readonly SectionRevisionStatus[]>
> = Object.freeze({
  DRAFT: Object.freeze(['REVIEW_REQUIRED', 'SUPERSEDED'] as const),
  REVIEW_REQUIRED: Object.freeze(['DRAFT', 'APPROVED', 'SUPERSEDED'] as const),
  APPROVED: Object.freeze(['SUPERSEDED'] as const),
  SUPERSEDED: Object.freeze([] as const)
});

export interface SectionRevisionTransitionContext {
  readonly actor?: ActorContext;
}

export function canTransitionSectionRevisionStatus(
  from: SectionRevisionStatus,
  to: SectionRevisionStatus
): boolean {
  return SECTION_REVISION_STATE_TRANSITIONS[from].includes(to);
}

export function transitionSectionRevisionStatus(
  from: SectionRevisionStatus,
  to: SectionRevisionStatus,
  context?: SectionRevisionTransitionContext
): SectionRevisionStatus {
  if (!canTransitionSectionRevisionStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái SectionRevision từ '${from}' sang '${to}'.`,
      details: {
        machine: 'SectionRevision',
        from,
        to,
        allowedTargets: SECTION_REVISION_STATE_TRANSITIONS[from]
      },
      recoverable: true
    });
  }

  if (to === 'APPROVED') {
    assertHumanApprovalActor(context?.actor, 'Phê duyệt SectionRevision');
  }

  return to;
}

export interface ApproveSectionRevisionOutcome {
  readonly approvedRevision: SectionRevision;
  readonly supersededRevisions: readonly SectionRevision[];
  readonly updatedRevisions: readonly SectionRevision[];
}

/**
 * Phê duyệt tường minh một `SectionRevision` bởi người dùng (`USER`):
 * - Bản được chọn chuyển từ `REVIEW_REQUIRED` -> `APPROVED` kèm dấu kiểm toán `approval`.
 * - Các bản `APPROVED` trước đó của cùng `sectionId` chuyển sang `SUPERSEDED` (giữ nguyên trong lịch sử).
 * - Các Section khác không bị ảnh hưởng.
 */
export function approveSectionRevisionWithHistory(params: {
  readonly targetRevisionId: string;
  readonly existingRevisions: readonly SectionRevision[];
  readonly actor: ActorContext;
  readonly approvedAt: string;
}): ApproveSectionRevisionOutcome {
  const humanActor = assertHumanApprovalActor(params.actor, 'Phê duyệt SectionRevision');
  const approvedAt = assertIsoTimestamp(params.approvedAt, 'approvedAt');

  const target = params.existingRevisions.find((r) => r.id === params.targetRevisionId);
  if (!target) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Không tìm thấy SectionRevision '${params.targetRevisionId}' để phê duyệt.`,
      details: { targetRevisionId: params.targetRevisionId },
      recoverable: true
    });
  }

  const nextStatus = transitionSectionRevisionStatus(target.reviewStatus, 'APPROVED', {
    actor: humanActor
  });

  const approvedRevision = createSectionRevision({
    ...target,
    reviewStatus: nextStatus,
    approval: {
      approvedBy: humanActor.actorId,
      approvedAt
    }
  });

  const supersededRevisions: SectionRevision[] = [];
  const updatedRevisions: SectionRevision[] = params.existingRevisions.map((rev) => {
    if (rev.id === approvedRevision.id) {
      return approvedRevision;
    }
    if (rev.sectionId === approvedRevision.sectionId && rev.reviewStatus === 'APPROVED') {
      const supersededStatus = transitionSectionRevisionStatus(rev.reviewStatus, 'SUPERSEDED');
      const superseded = createSectionRevision({
        ...rev,
        reviewStatus: supersededStatus
      });
      supersededRevisions.push(superseded);
      return superseded;
    }
    return rev;
  });

  return Object.freeze({
    approvedRevision,
    supersededRevisions: Object.freeze(supersededRevisions),
    updatedRevisions: Object.freeze(updatedRevisions)
  });
}
