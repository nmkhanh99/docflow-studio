import { randomUUID } from 'node:crypto';
import { existsSync } from 'node:fs';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import {
  AppError,
  createProject,
  normalizeSha256Hash,
  type Project,
  type SourceArtifact,
  type TemplateArtifact
} from '@core/domain';
import { SqliteAuditLogger } from '../logging';
import {
  INITIAL_SQLITE_MIGRATIONS,
  runSqliteMigrations,
  SqliteDatabaseConnection,
  SqliteProjectRepository,
  type SqliteMigrationSpec
} from '../sqlite';
import {
  ContentAddressedArtifactStore,
  ORIGINAL_TEMPLATE_FILENAME,
  TEMPLATE_SHA256_FILENAME,
  TEMPLATE_SUBDIR,
  type ImportSourceSnapshotOptions
} from './artifact-store';
import { assertProjectDirOutsideSourceRepo } from './hash-and-guards';
import {
  acquireProjectLock,
  type AcquireProjectLockOptions,
  type ProjectLockHandle
} from './project-lock';

export const PROJECT_MANIFEST_FILENAME = 'manifest.json';
export const PROJECT_SQLITE_FILENAME = 'project.sqlite';
export const PROJECT_DIRECTORY_SCHEMA_VERSION = 1;

/**
 * Danh mục đầy đủ các thư mục con chuẩn của dự án theo `DOCFLOW_STUDIO_SPEC.md` §5.3 & Tài liệu 09 §4.2.
 */
export const PROJECT_REQUIRED_SUBDIRECTORIES = Object.freeze([
  'template',
  'sources',
  'recipe',
  'recipe/rules',
  'sections',
  'runs',
  'builds',
  'working'
] as const);

export interface ProjectDirectoryManifest {
  readonly schemaVersion: number;
  readonly projectId: string;
  readonly title: string;
  readonly createdAt: string;
  readonly updatedAt: string;
  readonly templateSha256: string | null;
}

export interface CreateProjectWorkspaceInput {
  readonly projectDir: string;
  readonly projectId?: string;
  readonly title: string;
  readonly lockOptions?: AcquireProjectLockOptions;
}

export interface OpenProjectWorkspaceInput {
  readonly projectDir: string;
  readonly lockOptions?: AcquireProjectLockOptions;
}

export interface ProjectWorkspaceManagerOptions {
  readonly sourceRepoRoot?: string;
  readonly migrations?: readonly SqliteMigrationSpec[];
  readonly now?: () => Date;
  readonly generateId?: () => string;
}

/**
 * Đại diện phiên làm việc đang mở của một dự án DocFlow Studio trên đĩa cục bộ.
 * Giữ khóa `.project.lock`, kết nối `project.sqlite`, `SqliteProjectRepository`, `ContentAddressedArtifactStore` và `SqliteAuditLogger`.
 */
export class OpenedProjectWorkspace {
  public readonly projectDir: string;
  public readonly dbFilePath: string;
  public readonly manifestPath: string;
  public readonly connection: SqliteDatabaseConnection;
  public readonly repository: SqliteProjectRepository;
  public readonly artifactStore: ContentAddressedArtifactStore;
  public readonly auditLogger: SqliteAuditLogger;

  private currentProject: Project;
  private readonly lockHandle: ProjectLockHandle;
  private readonly now: () => Date;
  private readonly generateId: () => string;
  private closed = false;

  public constructor(params: {
    readonly projectDir: string;
    readonly dbFilePath: string;
    readonly manifestPath: string;
    readonly project: Project;
    readonly lockHandle: ProjectLockHandle;
    readonly connection: SqliteDatabaseConnection;
    readonly repository: SqliteProjectRepository;
    readonly artifactStore: ContentAddressedArtifactStore;
    readonly auditLogger: SqliteAuditLogger;
    readonly now: () => Date;
    readonly generateId: () => string;
  }) {
    this.projectDir = params.projectDir;
    this.dbFilePath = params.dbFilePath;
    this.manifestPath = params.manifestPath;
    this.currentProject = params.project;
    this.lockHandle = params.lockHandle;
    this.connection = params.connection;
    this.repository = params.repository;
    this.artifactStore = params.artifactStore;
    this.auditLogger = params.auditLogger;
    this.now = params.now;
    this.generateId = params.generateId;
  }

  public get project(): Project {
    return this.currentProject;
  }

  public get lockMetadata() {
    return this.lockHandle.metadata;
  }

  public get isClosed(): boolean {
    return this.closed;
  }

  /**
   * Nhập `Template V0` bất biến vào dự án, lưu bản ghi vào `project.sqlite`, cập nhật `manifest.json` và ghi `AuditEvent`.
   */
  public async importTemplateV0(sourceDocxPath: string): Promise<TemplateArtifact> {
    this.assertOpen();
    const template = await this.artifactStore.importTemplateV0(this.projectDir, sourceDocxPath);
    await this.repository.saveTemplateArtifact(this.currentProject.id, template);

    const updatedAt = this.now().toISOString();
    this.currentProject = createProject({
      ...this.currentProject,
      updatedAt
    });
    await this.repository.saveProject(this.currentProject);
    await writeManifestFile(this.manifestPath, {
      schemaVersion: PROJECT_DIRECTORY_SCHEMA_VERSION,
      projectId: this.currentProject.id,
      title: this.currentProject.title,
      createdAt: this.currentProject.createdAt,
      updatedAt,
      templateSha256: template.sha256
    });

    this.auditLogger.record({
      id: `aud-${this.generateId()}`,
      correlationId: `corr-${this.generateId()}`,
      timestamp: updatedAt,
      channel: 'project.importTemplate',
      actorType: 'USER',
      actorId: 'local-desktop-user',
      mutating: true,
      outcome: 'ALLOWED',
      targetEntityId: template.id
    });

    return template;
  }

  /**
   * Nhập `Source Snapshot` bất biến định danh theo `sha256` vào kho `sources/<id>/<sha256>/` và đăng ký vào `project.sqlite`.
   */
  public async importSourceSnapshot(
    sourceFilePath: string,
    options?: ImportSourceSnapshotOptions
  ): Promise<SourceArtifact> {
    this.assertOpen();
    const source = await this.artifactStore.importSourceSnapshotWithOptions(
      this.projectDir,
      sourceFilePath,
      options
    );

    const existing = await this.repository.getSourceArtifact(
      this.currentProject.id,
      source.id,
      source.version
    );
    if (!existing) {
      await this.repository.saveSourceArtifact(this.currentProject.id, source);
    }

    const timestamp = this.now().toISOString();
    this.auditLogger.record({
      id: `aud-${this.generateId()}`,
      correlationId: `corr-${this.generateId()}`,
      timestamp,
      channel: 'project.addSource',
      actorType: 'USER',
      actorId: 'local-desktop-user',
      mutating: true,
      outcome: 'ALLOWED',
      targetEntityId: `${source.id}@v${String(source.version)}`
    });

    return source;
  }

  /**
   * Xác minh lại toàn bộ mã băm `sha256` của `Template V0` và mọi `Source Snapshot` trong dự án.
   * Ném `ARTIFACT_INTEGRITY_VIOLATION` ngay khi phát hiện sửa đổi trái phép ngoài ứng dụng.
   */
  public async verifyWorkspaceIntegrity(): Promise<void> {
    this.assertOpen();
    await verifyProjectArtifactsOnDisk({
      projectDir: this.projectDir,
      projectId: this.currentProject.id,
      manifestPath: this.manifestPath,
      repository: this.repository,
      artifactStore: this.artifactStore
    });
  }

  /**
   * Đóng kết nối SQLite và giải phóng tệp khóa `.project.lock` an toàn.
   */
  public async close(): Promise<void> {
    if (this.closed) {
      return;
    }
    this.closed = true;
    try {
      this.connection.close();
    } finally {
      await this.lockHandle.release();
    }
  }

  private assertOpen(): void {
    if (this.closed) {
      throw new AppError({
        code: 'INTERNAL_UNEXPECTED_ERROR',
        message: `Phiên làm việc dự án '${this.currentProject.id}' đã đóng.`,
        details: { projectId: this.currentProject.id, projectDir: this.projectDir },
        recoverable: true
      });
    }
  }
}

async function ensureProjectSubdirectories(projectDir: string): Promise<void> {
  await mkdir(projectDir, { recursive: true });
  for (const subDir of PROJECT_REQUIRED_SUBDIRECTORIES) {
    await mkdir(join(projectDir, subDir), { recursive: true });
  }
}

async function writeManifestFile(
  manifestPath: string,
  manifest: ProjectDirectoryManifest
): Promise<void> {
  await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
}

async function readManifestFile(manifestPath: string): Promise<ProjectDirectoryManifest> {
  let raw: string;
  try {
    raw = await readFile(manifestPath, 'utf8');
  } catch (err) {
    throw new AppError({
      code: 'ARTIFACT_INTEGRITY_VIOLATION',
      message: `Không tìm thấy hoặc không đọc được tệp nhận diện dự án '${manifestPath}'.`,
      details: { manifestPath },
      recoverable: false,
      cause: err
    });
  }

  let parsed: Partial<ProjectDirectoryManifest>;
  try {
    parsed = JSON.parse(raw) as Partial<ProjectDirectoryManifest>;
  } catch (err) {
    throw new AppError({
      code: 'ARTIFACT_INTEGRITY_VIOLATION',
      message: `Tệp '${manifestPath}' không đúng định dạng JSON hợp lệ.`,
      details: { manifestPath },
      recoverable: false,
      cause: err
    });
  }

  if (
    typeof parsed.projectId !== 'string' ||
    !parsed.projectId.trim() ||
    typeof parsed.title !== 'string' ||
    !parsed.title.trim() ||
    typeof parsed.createdAt !== 'string' ||
    typeof parsed.updatedAt !== 'string'
  ) {
    throw new AppError({
      code: 'ARTIFACT_INTEGRITY_VIOLATION',
      message: `Tệp '${manifestPath}' thiếu các trường metadata bắt buộc của dự án.`,
      details: { manifestPath },
      recoverable: false
    });
  }

  return Object.freeze({
    schemaVersion:
      typeof parsed.schemaVersion === 'number'
        ? parsed.schemaVersion
        : PROJECT_DIRECTORY_SCHEMA_VERSION,
    projectId: parsed.projectId.trim(),
    title: parsed.title.trim(),
    createdAt: parsed.createdAt,
    updatedAt: parsed.updatedAt,
    templateSha256:
      typeof parsed.templateSha256 === 'string' && parsed.templateSha256.trim()
        ? normalizeSha256Hash(parsed.templateSha256, 'manifest.templateSha256')
        : null
  });
}

async function verifyProjectArtifactsOnDisk(params: {
  readonly projectDir: string;
  readonly projectId: string;
  readonly manifestPath: string;
  readonly repository: SqliteProjectRepository;
  readonly artifactStore: ContentAddressedArtifactStore;
}): Promise<void> {
  const manifest = await readManifestFile(params.manifestPath);
  const templateInDb = await params.repository.getTemplateArtifact(params.projectId);
  const defaultOriginalPath = join(
    params.projectDir,
    TEMPLATE_SUBDIR,
    ORIGINAL_TEMPLATE_FILENAME
  );
  const defaultSha256FilePath = join(
    params.projectDir,
    TEMPLATE_SUBDIR,
    TEMPLATE_SHA256_FILENAME
  );

  if (templateInDb) {
    await params.artifactStore.assertArtifactIntegrity(
      templateInDb.sha256,
      templateInDb.path,
      'Template V0'
    );
    if (manifest.templateSha256 && manifest.templateSha256 !== templateInDb.sha256) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message:
          'Mã băm Template V0 trong manifest.json không khớp với bản ghi trong project.sqlite.',
        details: {
          manifestTemplateSha256: manifest.templateSha256,
          sqliteTemplateSha256: templateInDb.sha256
        },
        recoverable: false
      });
    }
  } else if (
    manifest.templateSha256 !== null ||
    existsSync(defaultOriginalPath) ||
    existsSync(defaultSha256FilePath)
  ) {
    let expectedHash = manifest.templateSha256;
    if (!expectedHash && existsSync(defaultSha256FilePath)) {
      const rawHashFile = await readFile(defaultSha256FilePath, 'utf8');
      expectedHash = normalizeSha256Hash(rawHashFile.trim(), TEMPLATE_SHA256_FILENAME);
    }
    if (!expectedHash) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message:
          'Phát hiện tệp template/original.docx trên đĩa nhưng thiếu mã băm đối chiếu trong project.sqlite và template-sha256.txt.',
        details: { originalDocxPath: defaultOriginalPath },
        recoverable: false
      });
    }
    await params.artifactStore.assertArtifactIntegrity(
      expectedHash,
      defaultOriginalPath,
      'Template V0'
    );
  }

  const sources = await params.repository.listSourceArtifacts(params.projectId);
  for (const source of sources) {
    await params.artifactStore.assertArtifactIntegrity(
      source.sha256,
      source.path,
      `Source Snapshot (${source.id}@v${String(source.version)})`
    );
  }
}

/**
 * Quản lý vòng đời thư mục dự án cục bộ ngoài kho mã nguồn (`DOCFLOW_STUDIO_SPEC.md` §5.3 & Tài liệu 09 §4.2):
 * - Khởi tạo cấu trúc thư mục đầy đủ, khóa `.project.lock`, chạy SQLite migrations và lưu `manifest.json`.
 * - Khi mở lại dự án, tự động kiểm tra khóa `.project.lock`, chạy migrations mới (nếu có) và xác minh `sha256` của mọi tài sản bất biến.
 */
export class ProjectWorkspaceManager {
  private readonly sourceRepoRoot?: string;
  private readonly migrations: readonly SqliteMigrationSpec[];
  private readonly now: () => Date;
  private readonly generateId: () => string;

  public constructor(options: ProjectWorkspaceManagerOptions = {}) {
    this.sourceRepoRoot = options.sourceRepoRoot;
    this.migrations = options.migrations ?? INITIAL_SQLITE_MIGRATIONS;
    this.now = options.now ?? (() => new Date());
    this.generateId = options.generateId ?? (() => randomUUID());
  }

  public async createProject(
    input: CreateProjectWorkspaceInput
  ): Promise<OpenedProjectWorkspace> {
    const resolvedProjectDir = await assertProjectDirOutsideSourceRepo(
      input.projectDir,
      this.sourceRepoRoot
    );

    const manifestPath = join(resolvedProjectDir, PROJECT_MANIFEST_FILENAME);
    const dbFilePath = join(resolvedProjectDir, PROJECT_SQLITE_FILENAME);

    if (existsSync(manifestPath) || existsSync(dbFilePath)) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: `Thư mục '${resolvedProjectDir}' đã chứa dự án DocFlow Studio hiện có; hãy dùng openProject thay vì khởi tạo đè.`,
        details: { projectDir: resolvedProjectDir },
        recoverable: true
      });
    }

    await ensureProjectSubdirectories(resolvedProjectDir);
    const lockHandle = await acquireProjectLock(resolvedProjectDir, input.lockOptions);

    let connection: SqliteDatabaseConnection | null = null;
    try {
      connection = new SqliteDatabaseConnection({ dbFilePath, readonly: false });
      runSqliteMigrations(connection, this.migrations, this.now);

      const nowIso = this.now().toISOString();
      const projectId = input.projectId?.trim() || `proj-${this.generateId().slice(0, 8)}`;
      const project = createProject({
        id: projectId,
        title: input.title,
        status: 'ACTIVE',
        currentRecipeVersion: 0,
        createdAt: nowIso,
        updatedAt: nowIso
      });

      const repository = new SqliteProjectRepository(connection);
      const auditLogger = new SqliteAuditLogger(connection);
      const artifactStore = new ContentAddressedArtifactStore({ now: this.now });

      await repository.saveProject(project);
      await writeManifestFile(manifestPath, {
        schemaVersion: PROJECT_DIRECTORY_SCHEMA_VERSION,
        projectId: project.id,
        title: project.title,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
        templateSha256: null
      });

      auditLogger.record({
        id: `aud-${this.generateId()}`,
        correlationId: `corr-${this.generateId()}`,
        timestamp: nowIso,
        channel: 'project.create',
        actorType: 'USER',
        actorId: 'local-desktop-user',
        mutating: true,
        outcome: 'ALLOWED',
        targetEntityId: project.id
      });

      return new OpenedProjectWorkspace({
        projectDir: resolvedProjectDir,
        dbFilePath,
        manifestPath,
        project,
        lockHandle,
        connection,
        repository,
        artifactStore,
        auditLogger,
        now: this.now,
        generateId: this.generateId
      });
    } catch (err) {
      if (connection) {
        connection.close();
      }
      await lockHandle.release();
      throw err;
    }
  }

  public async openProject(input: OpenProjectWorkspaceInput): Promise<OpenedProjectWorkspace> {
    const resolvedProjectDir = await assertProjectDirOutsideSourceRepo(
      input.projectDir,
      this.sourceRepoRoot
    );

    const manifestPath = join(resolvedProjectDir, PROJECT_MANIFEST_FILENAME);
    const dbFilePath = join(resolvedProjectDir, PROJECT_SQLITE_FILENAME);

    if (!existsSync(manifestPath) || !existsSync(dbFilePath)) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message: `Thư mục '${resolvedProjectDir}' chưa được khởi tạo dự án hợp lệ (thiếu manifest.json hoặc project.sqlite).`,
        details: { projectDir: resolvedProjectDir, manifestPath, dbFilePath },
        recoverable: true
      });
    }

    const lockHandle = await acquireProjectLock(resolvedProjectDir, input.lockOptions);

    let connection: SqliteDatabaseConnection | null = null;
    try {
      await ensureProjectSubdirectories(resolvedProjectDir);
      const manifest = await readManifestFile(manifestPath);

      connection = new SqliteDatabaseConnection({ dbFilePath, readonly: false });
      runSqliteMigrations(connection, this.migrations, this.now);

      const repository = new SqliteProjectRepository(connection);
      const auditLogger = new SqliteAuditLogger(connection);
      const artifactStore = new ContentAddressedArtifactStore({ now: this.now });

      const project = await repository.getProject(manifest.projectId);
      if (!project) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Không tìm thấy bản ghi dự án '${manifest.projectId}' trong cơ sở dữ liệu project.sqlite.`,
          details: { projectId: manifest.projectId, dbFilePath },
          recoverable: false
        });
      }

      await verifyProjectArtifactsOnDisk({
        projectDir: resolvedProjectDir,
        projectId: project.id,
        manifestPath,
        repository,
        artifactStore
      });

      auditLogger.record({
        id: `aud-${this.generateId()}`,
        correlationId: `corr-${this.generateId()}`,
        timestamp: this.now().toISOString(),
        channel: 'project.open',
        actorType: 'USER',
        actorId: 'local-desktop-user',
        mutating: false,
        outcome: 'ALLOWED',
        targetEntityId: project.id
      });

      return new OpenedProjectWorkspace({
        projectDir: resolvedProjectDir,
        dbFilePath,
        manifestPath,
        project,
        lockHandle,
        connection,
        repository,
        artifactStore,
        auditLogger,
        now: this.now,
        generateId: this.generateId
      });
    } catch (err) {
      if (connection) {
        connection.close();
      }
      await lockHandle.release();
      throw err;
    }
  }
}
