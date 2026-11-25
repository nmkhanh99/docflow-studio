import { resolve } from 'node:path';
import {
  AppError,
  type BuildManifest,
  type ChangeRequest,
  type DependencyEdge,
  type LogicalSection,
  type Project,
  type SavedRule,
  type SectionRevision,
  type SourceArtifact,
  type SourceArtifactType,
  type TemplateArtifact
} from '@core/domain';
import {
  ProjectWorkspaceManager,
  type OpenedProjectWorkspace
} from '../filesystem';
import type { CompositeAuditLogger } from '../logging';

export interface ProjectSessionSnapshot {
  readonly project: Project;
  readonly projectDir: string;
  readonly dbFilePath: string;
  readonly manifestPath: string;
  readonly template: TemplateArtifact | null;
  readonly sources: readonly SourceArtifact[];
  readonly sections: readonly LogicalSection[];
  readonly changeRequests: readonly ChangeRequest[];
  readonly rules: readonly SavedRule[];
  readonly dependencyEdges: readonly DependencyEdge[];
  readonly revisions: readonly SectionRevision[];
  readonly builds: readonly BuildManifest[];
}

export interface ProjectSessionCoordinatorOptions {
  readonly workspaceManager?: ProjectWorkspaceManager;
  readonly compositeAuditLogger?: CompositeAuditLogger;
}

async function loadWorkspaceSnapshot(
  workspace: OpenedProjectWorkspace
): Promise<ProjectSessionSnapshot> {
  const projectId = workspace.project.id;
  const [
    latestProject,
    template,
    sources,
    sections,
    changeRequests,
    rules,
    dependencyEdges,
    revisions,
    builds
  ] = await Promise.all([
    workspace.repository.getProject(projectId),
    workspace.repository.getTemplateArtifact(projectId),
    workspace.repository.listSourceArtifacts(projectId),
    workspace.repository.listLogicalSections(projectId),
    workspace.repository.listChangeRequests(projectId),
    workspace.repository.listSavedRules(projectId),
    workspace.repository.listDependencyEdges(projectId),
    workspace.repository.listSectionRevisions(projectId),
    workspace.repository.listBuildManifests(projectId)
  ]);

  return Object.freeze({
    project: latestProject ?? workspace.project,
    projectDir: workspace.projectDir,
    dbFilePath: workspace.dbFilePath,
    manifestPath: workspace.manifestPath,
    template,
    sources,
    sections,
    changeRequests,
    rules,
    dependencyEdges,
    revisions,
    builds
  });
}

/**
 * Quản lý phiên dự án đang mở trong tiến trình Electron Main:
 * - Chuyển đổi an toàn giữa các thư mục dự án (đóng `.project.lock` và kết nối SQLite cũ).
 * - Gắn `SqliteAuditLogger` của dự án đang mở vào `CompositeAuditLogger` trung tâm.
 * - Đọc dữ liệu thực tế từ `project.sqlite` trả về cho giao diện.
 */
export class ProjectSessionCoordinator {
  private readonly workspaceManager: ProjectWorkspaceManager;
  private readonly compositeAuditLogger?: CompositeAuditLogger;
  private activeWorkspace: OpenedProjectWorkspace | null = null;

  public constructor(options: ProjectSessionCoordinatorOptions = {}) {
    this.workspaceManager = options.workspaceManager ?? new ProjectWorkspaceManager();
    this.compositeAuditLogger = options.compositeAuditLogger;
  }

  public getActiveWorkspace(): OpenedProjectWorkspace | null {
    return this.activeWorkspace;
  }

  public async createProject(payload: {
    readonly projectDir: string;
    readonly title: string;
  }): Promise<ProjectSessionSnapshot> {
    const nextWorkspace = await this.workspaceManager.createProject({
      projectDir: payload.projectDir,
      title: payload.title
    });

    await this.switchActiveWorkspace(nextWorkspace);
    return loadWorkspaceSnapshot(nextWorkspace);
  }

  public async openProject(payload: {
    readonly projectDir: string;
  }): Promise<ProjectSessionSnapshot> {
    if (
      this.activeWorkspace &&
      !this.activeWorkspace.isClosed &&
      resolve(payload.projectDir.trim()) === resolve(this.activeWorkspace.projectDir)
    ) {
      await this.activeWorkspace.verifyWorkspaceIntegrity();
      return loadWorkspaceSnapshot(this.activeWorkspace);
    }

    const nextWorkspace = await this.workspaceManager.openProject({
      projectDir: payload.projectDir
    });

    await this.switchActiveWorkspace(nextWorkspace);
    return loadWorkspaceSnapshot(nextWorkspace);
  }

  public async importTemplate(payload: {
    readonly filePath: string;
  }): Promise<TemplateArtifact> {
    const workspace = this.requireActiveWorkspace('project.importTemplate');
    return workspace.importTemplateV0(payload.filePath);
  }

  public async addSource(payload: {
    readonly filePath: string;
    readonly sourceKey?: string;
    readonly type?: SourceArtifactType;
  }): Promise<SourceArtifact> {
    const workspace = this.requireActiveWorkspace('project.addSource');
    return workspace.importSourceSnapshot(payload.filePath, {
      ...(payload.sourceKey !== undefined ? { sourceId: payload.sourceKey } : {}),
      ...(payload.type !== undefined ? { type: payload.type } : {})
    });
  }

  public async listSections(payload: {
    readonly projectId: string;
  }): Promise<readonly LogicalSection[]> {
    const workspace = this.requireActiveWorkspace('section.list');
    if (workspace.project.id !== payload.projectId) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message: `Dự án yêu cầu '${payload.projectId}' không khớp với phiên dự án đang mở '${workspace.project.id}'.`,
        details: {
          requestedProjectId: payload.projectId,
          activeProjectId: workspace.project.id
        },
        recoverable: true
      });
    }
    return workspace.repository.listLogicalSections(payload.projectId);
  }

  public async closeActiveProject(): Promise<void> {
    this.compositeAuditLogger?.attachProjectLogger(null);
    const current = this.activeWorkspace;
    this.activeWorkspace = null;
    if (current && !current.isClosed) {
      await current.close();
    }
  }

  private async switchActiveWorkspace(nextWorkspace: OpenedProjectWorkspace): Promise<void> {
    const previous = this.activeWorkspace;
    this.activeWorkspace = nextWorkspace;
    this.compositeAuditLogger?.attachProjectLogger(nextWorkspace.auditLogger);

    if (previous && previous !== nextWorkspace && !previous.isClosed) {
      await previous.close();
    }
  }

  private requireActiveWorkspace(channel: string): OpenedProjectWorkspace {
    if (!this.activeWorkspace || this.activeWorkspace.isClosed) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message:
          'Chưa có dự án nào đang mở. Vui lòng tạo mới hoặc mở một thư mục dự án trước khi thực hiện thao tác này.',
        details: { channel },
        recoverable: true
      });
    }
    return this.activeWorkspace;
  }
}
