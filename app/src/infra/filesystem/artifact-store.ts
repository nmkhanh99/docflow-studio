import { existsSync } from 'node:fs';
import { chmod, copyFile, mkdir, open, readdir, readFile, stat } from 'node:fs/promises';
import { basename, dirname, extname, join } from 'node:path';
import {
  AppError,
  assertWritableBuildTargetPath,
  createSourceArtifact,
  createTemplateArtifact,
  normalizeSha256Hash,
  type Sha256Hash,
  type SourceArtifact,
  type SourceArtifactType,
  type TemplateArtifact
} from '@core/domain';
import type { ArtifactStorePort } from '@core/ports';
import {
  assertSafeFilesystemPath,
  computeBufferSha256,
  computeFileSha256,
  isProtectedImmutableArtifactPath,
  setFileReadOnly
} from './hash-and-guards';

export const TEMPLATE_SUBDIR = 'template';
export const ORIGINAL_TEMPLATE_FILENAME = 'original.docx';
export const TEMPLATE_SHA256_FILENAME = 'template-sha256.txt';
export const SOURCES_SUBDIR = 'sources';

export interface ImportSourceSnapshotOptions {
  readonly sourceId?: string;
  readonly explicitType?: SourceArtifactType;
}

function inferSourceArtifactType(
  filePath: string,
  explicitType?: SourceArtifactType
): SourceArtifactType {
  if (explicitType) {
    return explicitType;
  }
  const ext = extname(filePath).toLowerCase();
  switch (ext) {
    case '.xlsx':
    case '.xls':
    case '.xlsm':
      return 'EXCEL';
    case '.docx':
      return 'DOCX';
    case '.pdf':
      return 'PDF';
    case '.csv':
      return 'CSV';
    default:
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Không nhận diện được loại tệp nguồn từ phần mở rộng '${ext || '(không có)'}'; hãy chỉ định rõ loại nguồn (EXCEL, DOCX, PDF, CSV).`,
        details: { filePath, extension: ext },
        recoverable: true
      });
  }
}

function normalizeSourceExtension(filePath: string, artifactType: SourceArtifactType): string {
  const rawExt = extname(filePath).toLowerCase().replace(/^\./, '');
  if (rawExt && /^[a-z0-9]{1,10}$/.test(rawExt)) {
    return rawExt;
  }
  switch (artifactType) {
    case 'EXCEL':
      return 'xlsx';
    case 'DOCX':
      return 'docx';
    case 'PDF':
      return 'pdf';
    case 'CSV':
      return 'csv';
  }
}

function sanitizeSourceIdFromFilename(filePath: string): string {
  const stem = basename(filePath, extname(filePath))
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd')
    .replace(/Đ/g, 'D')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return stem.length > 0 ? stem.slice(0, 64) : 'source-01';
}

async function writeExclusiveReadOnlyFile(targetPath: string, content: Uint8Array | string): Promise<void> {
  let fileHandle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    fileHandle = await open(targetPath, 'wx', 0o444);
    await fileHandle.writeFile(content);
    await fileHandle.sync();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'EEXIST') {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: `Tài sản bất biến tại '${targetPath}' đã tồn tại; tuyệt đối từ chối thao tác ghi đè.`,
        details: { targetPath },
        recoverable: false
      });
    }
    throw err;
  } finally {
    if (fileHandle) {
      await fileHandle.close();
    }
  }
  await setFileReadOnly(targetPath);
}

/**
 * Kho lưu trữ tài sản định danh theo nội dung `sha256` (`ContentAddressedArtifactStore` — §4.1, §5.3 & §9.2):
 * - Khóa cứng `Template V0` (`template/original.docx` + `template/template-sha256.txt`) ở chế độ chỉ đọc (`0o444`).
 * - Lưu cô lập mọi `Source Snapshot` tại `sources/<sourceId>/<sha256>/source.<ext>` ở chế độ chỉ đọc (`0o444`).
 * - Đối chiếu lại mã băm `sha256` thực tế trên đĩa trước khi đọc, clone bản làm việc hoặc xuất tài liệu.
 */
export class ContentAddressedArtifactStore implements ArtifactStorePort {
  private readonly now: () => Date;

  public constructor(options?: { readonly now?: () => Date }) {
    this.now = options?.now ?? (() => new Date());
  }

  public async importTemplateV0(
    projectDir: string,
    sourceDocxPath: string
  ): Promise<TemplateArtifact> {
    const resolvedProjectDir = assertSafeFilesystemPath(projectDir, 'projectDir');
    const resolvedSourcePath = assertSafeFilesystemPath(sourceDocxPath, 'sourceDocxPath');

    const templateDir = join(resolvedProjectDir, TEMPLATE_SUBDIR);
    const originalDocxPath = join(templateDir, ORIGINAL_TEMPLATE_FILENAME);
    const sha256RecordPath = join(templateDir, TEMPLATE_SHA256_FILENAME);

    if (resolvedSourcePath === originalDocxPath || resolvedSourcePath === sha256RecordPath) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: 'Đường dẫn tệp mẫu đầu vào không được trùng với vị trí khóa Template V0 trong dự án.',
        details: { sourceDocxPath: resolvedSourcePath, originalDocxPath },
        recoverable: true
      });
    }

    if (existsSync(originalDocxPath) || existsSync(sha256RecordPath)) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message:
          'Dự án đã khóa Template V0 bất biến (template/original.docx); từ chối mọi thao tác nhập đè mẫu gốc.',
        details: { originalDocxPath, sha256RecordPath },
        recoverable: false
      });
    }

    let sourceStat: Awaited<ReturnType<typeof stat>>;
    try {
      sourceStat = await stat(resolvedSourcePath);
    } catch (err) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message: `Không tìm thấy tệp DOCX mẫu đầu vào tại '${resolvedSourcePath}'.`,
        details: { sourceDocxPath: resolvedSourcePath },
        recoverable: true,
        cause: err
      });
    }

    if (!sourceStat.isFile() || sourceStat.size === 0) {
      throw new AppError({
        code: 'DOCX_PARSE_UNSUPPORTED_SAFE',
        message: `Tệp mẫu đầu vào '${resolvedSourcePath}' rỗng hoặc không phải tệp hợp lệ.`,
        details: { sourceDocxPath: resolvedSourcePath, size: sourceStat.size },
        recoverable: true
      });
    }

    const sourceBytes = await readFile(resolvedSourcePath);
    const sha256 = computeBufferSha256(sourceBytes);

    await mkdir(templateDir, { recursive: true });
    await writeExclusiveReadOnlyFile(originalDocxPath, sourceBytes);
    await writeExclusiveReadOnlyFile(sha256RecordPath, `${sha256}\n`);

    await this.assertArtifactIntegrity(sha256, originalDocxPath, 'Template V0');

    return createTemplateArtifact({
      id: 'template-v0',
      path: originalDocxPath,
      sha256,
      parsedAt: this.now().toISOString(),
      ooxmlMap: {}
    });
  }

  public async importSourceSnapshot(
    projectDir: string,
    sourceFilePath: string,
    explicitType?: SourceArtifactType
  ): Promise<SourceArtifact> {
    return this.importSourceSnapshotWithOptions(projectDir, sourceFilePath, {
      explicitType
    });
  }

  public async importSourceSnapshotWithOptions(
    projectDir: string,
    sourceFilePath: string,
    options: ImportSourceSnapshotOptions = {}
  ): Promise<SourceArtifact> {
    const resolvedProjectDir = assertSafeFilesystemPath(projectDir, 'projectDir');
    const resolvedSourcePath = assertSafeFilesystemPath(sourceFilePath, 'sourceFilePath');

    let sourceStat: Awaited<ReturnType<typeof stat>>;
    try {
      sourceStat = await stat(resolvedSourcePath);
    } catch (err) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message: `Không tìm thấy tệp dữ liệu nguồn tại '${resolvedSourcePath}'.`,
        details: { sourceFilePath: resolvedSourcePath },
        recoverable: true,
        cause: err
      });
    }

    if (!sourceStat.isFile() || sourceStat.size === 0) {
      throw new AppError({
        code: 'SOURCE_DATA_MISSING',
        message: `Tệp dữ liệu nguồn '${resolvedSourcePath}' rỗng hoặc không phải tệp hợp lệ.`,
        details: { sourceFilePath: resolvedSourcePath, size: sourceStat.size },
        recoverable: true
      });
    }

    const artifactType = inferSourceArtifactType(resolvedSourcePath, options.explicitType);
    const ext = normalizeSourceExtension(resolvedSourcePath, artifactType);
    const rawSourceId = options.sourceId?.trim() || sanitizeSourceIdFromFilename(resolvedSourcePath);
    if (!/^[a-zA-Z0-9._-]+$/.test(rawSourceId)) {
      throw new AppError({
        code: 'DOMAIN_INVARIANT_VIOLATION',
        message: `Định danh nguồn '${rawSourceId}' chứa ký tự không an toàn.`,
        details: { sourceId: rawSourceId },
        recoverable: true
      });
    }

    const sourceBytes = await readFile(resolvedSourcePath);
    const sha256 = computeBufferSha256(sourceBytes);

    const sourceRootDir = join(resolvedProjectDir, SOURCES_SUBDIR, rawSourceId);
    await mkdir(sourceRootDir, { recursive: true });

    const existingEntries = await readdir(sourceRootDir, { withFileTypes: true });
    const existingHashDirs = existingEntries
      .filter((entry) => entry.isDirectory() && /^[a-f0-9]{64}$/i.test(entry.name))
      .map((entry) => entry.name.toLowerCase())
      .sort();

    const snapshotDir = join(sourceRootDir, sha256);
    const snapshotFilePath = join(snapshotDir, `source.${ext}`);

    if (resolvedSourcePath === snapshotFilePath) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: 'Không được phép nhập đè trực tiếp lên chính tệp Source Snapshot trong kho.',
        details: { snapshotFilePath },
        recoverable: false
      });
    }

    if (existsSync(snapshotFilePath)) {
      await this.assertArtifactIntegrity(sha256, snapshotFilePath, `Source Snapshot (${rawSourceId})`);
      await setFileReadOnly(snapshotFilePath);
      const existingIndex = existingHashDirs.indexOf(sha256);
      const version = existingIndex >= 0 ? existingIndex + 1 : existingHashDirs.length + 1;
      return createSourceArtifact({
        id: rawSourceId,
        type: artifactType,
        path: snapshotFilePath,
        version,
        sha256,
        importedAt: this.now().toISOString()
      });
    }

    const nextVersion = existingHashDirs.length + 1;
    await mkdir(snapshotDir, { recursive: true });
    await writeExclusiveReadOnlyFile(snapshotFilePath, sourceBytes);
    await this.assertArtifactIntegrity(sha256, snapshotFilePath, `Source Snapshot (${rawSourceId})`);

    return createSourceArtifact({
      id: rawSourceId,
      type: artifactType,
      path: snapshotFilePath,
      version: nextVersion,
      sha256,
      importedAt: this.now().toISOString()
    });
  }

  public async verifyArtifactIntegrity(
    expectedSha256: Sha256Hash,
    targetPath: string
  ): Promise<boolean> {
    const normalizedExpected = normalizeSha256Hash(expectedSha256, 'expectedSha256');
    const resolvedTargetPath = assertSafeFilesystemPath(targetPath, 'targetPath');

    let actualSha256: Sha256Hash;
    try {
      actualSha256 = await computeFileSha256(resolvedTargetPath);
    } catch {
      return false;
    }

    if (actualSha256 !== normalizedExpected) {
      return false;
    }

    // Nếu đối tượng là Template V0 (template/original.docx), đối chiếu kép với template-sha256.txt
    if (basename(resolvedTargetPath).toLowerCase() === ORIGINAL_TEMPLATE_FILENAME) {
      const siblingHashPath = join(dirname(resolvedTargetPath), TEMPLATE_SHA256_FILENAME);
      if (basename(dirname(resolvedTargetPath)).toLowerCase() === TEMPLATE_SUBDIR) {
        try {
          const recordedRaw = await readFile(siblingHashPath, 'utf8');
          const recordedNormalized = normalizeSha256Hash(recordedRaw.trim(), TEMPLATE_SHA256_FILENAME);
          if (recordedNormalized !== normalizedExpected || recordedNormalized !== actualSha256) {
            return false;
          }
        } catch {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Kiểm tra toàn vẹn bắt buộc và ném `ARTIFACT_INTEGRITY_VIOLATION` ngay lập tức nếu phát hiện sửa đổi trái phép.
   */
  public async assertArtifactIntegrity(
    expectedSha256: Sha256Hash,
    targetPath: string,
    artifactLabel = 'Artifact'
  ): Promise<Sha256Hash> {
    const normalizedExpected = normalizeSha256Hash(expectedSha256, 'expectedSha256');
    const resolvedTargetPath = assertSafeFilesystemPath(targetPath, 'targetPath');

    let actualSha256: string | null = null;
    try {
      actualSha256 = await computeFileSha256(resolvedTargetPath);
    } catch (err) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message: `Không thể đọc '${artifactLabel}' tại '${resolvedTargetPath}' để xác minh toàn vẹn SHA-256 (tệp bị xóa hoặc hỏng).`,
        details: {
          artifactLabel,
          targetPath: resolvedTargetPath,
          expectedSha256: normalizedExpected
        },
        recoverable: false,
        cause: err
      });
    }

    if (actualSha256 !== normalizedExpected) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message: `Phát hiện '${artifactLabel}' tại '${resolvedTargetPath}' bị can thiệp trái phép ngoài ứng dụng: mã băm SHA-256 thực tế không khớp.`,
        details: {
          artifactLabel,
          targetPath: resolvedTargetPath,
          expectedSha256: normalizedExpected,
          actualSha256
        },
        recoverable: false
      });
    }

    if (
      basename(resolvedTargetPath).toLowerCase() === ORIGINAL_TEMPLATE_FILENAME &&
      basename(dirname(resolvedTargetPath)).toLowerCase() === TEMPLATE_SUBDIR
    ) {
      const siblingHashPath = join(dirname(resolvedTargetPath), TEMPLATE_SHA256_FILENAME);
      let recordedHash: string | null = null;
      try {
        recordedHash = (await readFile(siblingHashPath, 'utf8')).trim().toLowerCase();
      } catch (err) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Tệp khóa mã băm '${TEMPLATE_SHA256_FILENAME}' của Template V0 bị thiếu hoặc không đọc được.`,
          details: {
            artifactLabel,
            targetPath: resolvedTargetPath,
            sha256FilePath: siblingHashPath,
            expectedSha256: normalizedExpected
          },
          recoverable: false,
          cause: err
        });
      }

      if (recordedHash !== normalizedExpected) {
        throw new AppError({
          code: 'ARTIFACT_INTEGRITY_VIOLATION',
          message: `Tệp khóa mã băm '${TEMPLATE_SHA256_FILENAME}' không khớp với Template V0 đã đăng ký.`,
          details: {
            artifactLabel,
            targetPath: resolvedTargetPath,
            sha256FilePath: siblingHashPath,
            expectedSha256: normalizedExpected,
            recordedSha256: recordedHash
          },
          recoverable: false
        });
      }
    }

    return normalizedExpected;
  }

  public async cloneTemplateToWorkingCopy(
    templateArtifact: TemplateArtifact,
    workingOutputDocxPath: string
  ): Promise<{
    readonly workingDocxPath: string;
    readonly verifiedTemplateSha256: Sha256Hash;
  }> {
    assertWritableBuildTargetPath(workingOutputDocxPath, 'workingOutputDocxPath');
    const resolvedWorkingPath = assertSafeFilesystemPath(
      workingOutputDocxPath,
      'workingOutputDocxPath'
    );
    const resolvedTemplatePath = assertSafeFilesystemPath(
      templateArtifact.path,
      'templateArtifact.path'
    );

    if (
      resolvedWorkingPath === resolvedTemplatePath ||
      isProtectedImmutableArtifactPath(resolvedWorkingPath)
    ) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: `Cấm chọn đường dẫn bản làm việc trùng với Template V0 hoặc tài sản bất biến: '${resolvedWorkingPath}'.`,
        details: {
          workingOutputDocxPath: resolvedWorkingPath,
          templatePath: resolvedTemplatePath
        },
        recoverable: false
      });
    }

    const verifiedSha256 = await this.assertArtifactIntegrity(
      templateArtifact.sha256,
      resolvedTemplatePath,
      'Template V0'
    );

    await mkdir(dirname(resolvedWorkingPath), { recursive: true });
    await copyFile(resolvedTemplatePath, resolvedWorkingPath);
    await chmod(resolvedWorkingPath, 0o644);

    const clonedSha256 = await computeFileSha256(resolvedWorkingPath);
    if (clonedSha256 !== verifiedSha256) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message: 'Bản sao làm việc của Template V0 có mã băm không khớp sau khi sao chép.',
        details: {
          workingDocxPath: resolvedWorkingPath,
          expectedSha256: verifiedSha256,
          actualSha256: clonedSha256
        },
        recoverable: false
      });
    }

    return Object.freeze({
      workingDocxPath: resolvedWorkingPath,
      verifiedTemplateSha256: verifiedSha256
    });
  }

  public async exportApprovedBuildArtifact(
    builtDocxPath: string,
    destinationPath: string,
    expectedChecksum: Sha256Hash
  ): Promise<{
    readonly exportedPath: string;
    readonly sha256: Sha256Hash;
  }> {
    assertWritableBuildTargetPath(destinationPath, 'destinationPath');
    const resolvedBuiltPath = assertSafeFilesystemPath(builtDocxPath, 'builtDocxPath');
    const resolvedDestPath = assertSafeFilesystemPath(destinationPath, 'destinationPath');

    if (
      resolvedDestPath === resolvedBuiltPath ||
      isProtectedImmutableArtifactPath(resolvedDestPath)
    ) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message: `Cấm xuất tài liệu DOCX ghi đè lên Template V0, Source Snapshot hoặc bản dựng lịch sử bất biến: '${resolvedDestPath}'.`,
        details: {
          builtDocxPath: resolvedBuiltPath,
          destinationPath: resolvedDestPath
        },
        recoverable: true
      });
    }

    const verifiedChecksum = await this.assertArtifactIntegrity(
      expectedChecksum,
      resolvedBuiltPath,
      'BuildArtifact DOCX'
    );

    await mkdir(dirname(resolvedDestPath), { recursive: true });
    await copyFile(resolvedBuiltPath, resolvedDestPath);

    const exportedSha256 = await computeFileSha256(resolvedDestPath);
    if (exportedSha256 !== verifiedChecksum) {
      throw new AppError({
        code: 'ARTIFACT_INTEGRITY_VIOLATION',
        message: 'Tệp DOCX xuất ra có mã băm SHA-256 không khớp với bản dựng đã được phê duyệt.',
        details: {
          exportedPath: resolvedDestPath,
          expectedChecksum: verifiedChecksum,
          actualSha256: exportedSha256
        },
        recoverable: false
      });
    }

    return Object.freeze({
      exportedPath: resolvedDestPath,
      sha256: exportedSha256
    });
  }
}
