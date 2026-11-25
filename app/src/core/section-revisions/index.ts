import type { OoxmlPatchCommand, SectionRevision } from '../domain';

export interface SaveSectionRevisionInput {
  readonly sectionId: string;
  readonly patchSet: readonly OoxmlPatchCommand[];
  readonly sourceRunId?: string;
}

export interface ApproveSectionRevisionResult {
  readonly approvedRevision: SectionRevision;
  readonly supersededRevisionIds: readonly string[];
}

export interface SectionRevisionServiceContract {
  saveDraftOrPending(input: SaveSectionRevisionInput): Promise<SectionRevision>;
  approveByHuman(revisionId: string, approvedBy: string): Promise<ApproveSectionRevisionResult>;
}
