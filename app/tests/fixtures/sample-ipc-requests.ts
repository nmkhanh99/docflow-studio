import type { ActorContext } from '@core/domain';
import { createAiActorContext, createUserActorContext } from '@core/domain';

export const FIXTURE_TIMESTAMPS = {
  baseIso: '2026-11-25T09:30:00.000Z'
} as const;

export const FIXTURE_ACTORS: Readonly<{
  desktopUser: ActorContext;
  docAnalyst: ActorContext;
  rulePlanner: ActorContext;
  sectionWriter: ActorContext;
  reviewer: ActorContext;
}> = {
  desktopUser: createUserActorContext('user-khanhnm'),
  docAnalyst: createAiActorContext('document-analyst', 'sess-01'),
  rulePlanner: createAiActorContext('rule-planner', 'sess-02'),
  sectionWriter: createAiActorContext('section-writer', 'sess-03'),
  reviewer: createAiActorContext('reviewer', 'sess-04')
};

export const FIXTURE_VALID_PATCH_SET = [
  {
    blockId: 'blk-sec02-p01',
    op: 'replaceText' as const,
    payload: {
      text: 'Doanh thu kế hoạch đạt 3.750.000.000 ₫.'
    }
  }
] as const;
