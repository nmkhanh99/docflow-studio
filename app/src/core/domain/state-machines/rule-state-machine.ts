import { AppError } from '../errors';
import {
  assertHumanApprovalActor,
  type ActorContext
} from '../capabilities';
import type { RuleStatus } from '../lifecycle-states';
import type { SavedRule } from '../entities';
import { createSavedRule } from '../factories';

/**
 * Máy trạng thái vòng đời `Rule` (`SavedRule`) theo DOCFLOW_STUDIO_SPEC.md §3.1–3.2:
 * - DRAFT -> VALIDATED | DEPRECATED
 * - VALIDATED -> DRAFT | APPROVED | DEPRECATED
 * - APPROVED -> DEPRECATED (bản đã duyệt là bất biến; muốn sửa phải tạo version mới ở DRAFT)
 * - DEPRECATED -> (trạng thái kết thúc, không chuyển ngược)
 */
export const RULE_STATE_TRANSITIONS: Readonly<Record<RuleStatus, readonly RuleStatus[]>> =
  Object.freeze({
    DRAFT: Object.freeze(['VALIDATED', 'DEPRECATED'] as const),
    VALIDATED: Object.freeze(['DRAFT', 'APPROVED', 'DEPRECATED'] as const),
    APPROVED: Object.freeze(['DEPRECATED'] as const),
    DEPRECATED: Object.freeze([] as const)
  });

export interface RuleTransitionContext {
  readonly actor?: ActorContext;
  readonly isTypedIrValidated?: boolean;
}

export function canTransitionRuleStatus(from: RuleStatus, to: RuleStatus): boolean {
  return RULE_STATE_TRANSITIONS[from].includes(to);
}

export function transitionRuleStatus(
  from: RuleStatus,
  to: RuleStatus,
  context?: RuleTransitionContext
): RuleStatus {
  if (!canTransitionRuleStatus(from, to)) {
    throw new AppError({
      code: 'INVALID_STATE_TRANSITION',
      message: `Không được phép chuyển trạng thái Rule từ '${from}' sang '${to}'.`,
      details: {
        machine: 'Rule',
        from,
        to,
        allowedTargets: RULE_STATE_TRANSITIONS[from]
      },
      recoverable: true
    });
  }

  if ((to === 'VALIDATED' || to === 'APPROVED') && context?.isTypedIrValidated === false) {
    throw new AppError({
      code: 'RULE_SCHEMA_INVALID',
      message: `Không thể chuyển Rule sang '${to}' khi kế hoạch Typed Rule IR chưa vượt qua kiểm tra hợp lệ.`,
      details: { from, to },
      recoverable: true
    });
  }

  if (to === 'APPROVED') {
    assertHumanApprovalActor(context?.actor, 'Phê duyệt SavedRule sang trạng thái APPROVED');
  }

  return to;
}

/**
 * Thực thi quy tắc §3.2: Khi sửa một Rule hiện có (đặc biệt là bản đã APPROVED),
 * tuyệt đối không sửa ngầm bản cũ mà tạo phiên bản mới (`version + 1`) ở trạng thái `DRAFT`.
 */
export function createNextRuleDraftVersion(
  previousRule: SavedRule,
  updates: Partial<
    Pick<
      SavedRule,
      | 'textInstruction'
      | 'ioSchema'
      | 'executionPlan'
      | 'testCases'
      | 'requiresHumanReview'
      | 'reviewTriggers'
      | 'targetSectionId'
    >
  >
): SavedRule {
  return createSavedRule({
    id: previousRule.id,
    version: previousRule.version + 1,
    ...(updates.targetSectionId !== undefined
      ? { targetSectionId: updates.targetSectionId }
      : previousRule.targetSectionId !== undefined
        ? { targetSectionId: previousRule.targetSectionId }
        : {}),
    textInstruction: updates.textInstruction ?? previousRule.textInstruction,
    ioSchema: updates.ioSchema ?? previousRule.ioSchema,
    executionPlan: updates.executionPlan ?? previousRule.executionPlan,
    testCases: updates.testCases ?? previousRule.testCases,
    status: 'DRAFT',
    requiresHumanReview: updates.requiresHumanReview ?? previousRule.requiresHumanReview,
    ...(updates.reviewTriggers !== undefined
      ? { reviewTriggers: updates.reviewTriggers }
      : previousRule.reviewTriggers !== undefined
        ? { reviewTriggers: previousRule.reviewTriggers }
        : {})
  });
}
