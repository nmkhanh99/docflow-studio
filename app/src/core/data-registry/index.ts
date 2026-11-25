import type { DataBinding, DataDefinition, DataRevision, SourceArtifact } from '../domain';

export interface DataRegistrySnapshot {
  readonly sources: readonly SourceArtifact[];
  readonly definitions: readonly DataDefinition[];
  readonly bindings: readonly DataBinding[];
  readonly revisions: readonly DataRevision[];
}
