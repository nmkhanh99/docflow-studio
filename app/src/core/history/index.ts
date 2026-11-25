import type { AuditEvent, BuildManifest, Project } from '../domain';

export interface AuditTimelinePage {
  readonly items: readonly AuditEvent[];
  readonly nextCursor: string | null;
}

export interface HistoryServiceContract {
  listTimeline(limit?: number, cursor?: string): Promise<AuditTimelinePage>;
  openPinnedSnapshot(buildId: string): Promise<BuildManifest>;
  branchFromSnapshot(buildId: string, newBranchTitle: string): Promise<Project>;
}
