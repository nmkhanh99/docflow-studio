import type {
  BuildArtifact,
  BuildManifest,
  ChangeRequest,
  DataBinding,
  DataDefinition,
  DataRevision,
  DependencyEdge,
  DocumentBlock,
  LayoutIssue,
  LogicalSection,
  Project,
  Run,
  RunStep,
  SavedRule,
  SectionRevision,
  SourceArtifact,
  TemplateArtifact
} from '../domain';

/**
 * Cổng lưu trữ bền vững siêu dữ liệu dự án (`project.sqlite` + cây thư mục dự án — §9.2, §9.4 & §11):
 * - Cài đặt giao dịch nguyên tử (ACID) cho toàn bộ 17 thực thể miền cốt lõi.
 * - Đảm bảo tái dựng đầy đủ trạng thái dự án mà không phụ thuộc lịch sử hội thoại chat của AI.
 */
export interface ProjectRepositoryPort {
  runInTransaction<T>(work: () => Promise<T>): Promise<T>;

  // 1. Project & Template V0
  getProject(projectId: string): Promise<Project | null>;
  saveProject(project: Project): Promise<void>;
  getTemplateArtifact(projectId: string): Promise<TemplateArtifact | null>;
  saveTemplateArtifact(projectId: string, template: TemplateArtifact): Promise<void>;

  // 2. Source Snapshots & Data Registry
  listSourceArtifacts(projectId: string): Promise<readonly SourceArtifact[]>;
  getSourceArtifact(projectId: string, sourceId: string, version?: number): Promise<SourceArtifact | null>;
  saveSourceArtifact(projectId: string, source: SourceArtifact): Promise<void>;
  listDataDefinitions(projectId: string): Promise<readonly DataDefinition[]>;
  saveDataDefinition(projectId: string, definition: DataDefinition): Promise<void>;
  listDataBindings(projectId: string): Promise<readonly DataBinding[]>;
  saveDataBinding(projectId: string, binding: DataBinding): Promise<void>;
  listDataRevisions(projectId: string, key?: string): Promise<readonly DataRevision[]>;
  saveDataRevision(projectId: string, revision: DataRevision): Promise<void>;

  // 3. Logical Sections & Document Blocks (Section != Page)
  listLogicalSections(projectId: string): Promise<readonly LogicalSection[]>;
  listDocumentBlocks(projectId: string, sectionId?: string): Promise<readonly DocumentBlock[]>;
  saveDocumentStructure(
    projectId: string,
    sections: readonly LogicalSection[],
    blocks: readonly DocumentBlock[]
  ): Promise<void>;

  // 4. Change Requests & Saved Rules (Recipe)
  listChangeRequests(projectId: string, sectionId?: string): Promise<readonly ChangeRequest[]>;
  saveChangeRequest(projectId: string, changeRequest: ChangeRequest): Promise<void>;
  getSavedRule(projectId: string, ruleId: string, version?: number): Promise<SavedRule | null>;
  listSavedRules(projectId: string): Promise<readonly SavedRule[]>;
  saveRuleVersion(projectId: string, rule: SavedRule): Promise<void>;

  // 5. Dependency Graph, Runs & RunStep Evidence
  listDependencyEdges(projectId: string): Promise<readonly DependencyEdge[]>;
  replaceDependencyEdges(projectId: string, edges: readonly DependencyEdge[]): Promise<void>;
  saveRunWithSteps(projectId: string, run: Run, steps: readonly RunStep[]): Promise<void>;
  getRunWithSteps(
    projectId: string,
    runId: string
  ): Promise<{ readonly run: Run; readonly steps: readonly RunStep[] } | null>;

  // 6. Section Revisions
  getSectionRevision(projectId: string, revisionId: string): Promise<SectionRevision | null>;
  listSectionRevisions(projectId: string, sectionId?: string): Promise<readonly SectionRevision[]>;
  saveSectionRevisions(projectId: string, revisions: readonly SectionRevision[]): Promise<void>;

  // 7. Build Manifests, Build Artifacts & Layout Issues
  getBuildManifest(projectId: string, manifestId: string): Promise<BuildManifest | null>;
  listBuildManifests(projectId: string): Promise<readonly BuildManifest[]>;
  saveBuildManifest(projectId: string, manifest: BuildManifest): Promise<void>;
  saveBuildArtifactWithIssues(
    projectId: string,
    artifact: BuildArtifact,
    issues: readonly LayoutIssue[]
  ): Promise<void>;
  getBuildArtifactWithIssues(
    projectId: string,
    buildId: string
  ): Promise<{
    readonly artifact: BuildArtifact;
    readonly issues: readonly LayoutIssue[];
  } | null>;
}
