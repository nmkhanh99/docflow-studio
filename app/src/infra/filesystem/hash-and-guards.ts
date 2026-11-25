import { createHash } from 'node:crypto';
import { existsSync } from 'node:fs';
import { chmod, readFile, realpath, stat } from 'node:fs/promises';
import { dirname, join, normalize, parse, resolve, sep } from 'node:path';
import { AppError, isImmutableProtectedTargetPath, type Sha256Hash } from '@core/domain';

/**
 * Tính mã băm SHA-256 (64 ký tự hex chữ thường) cho luồng dữ liệu hoặc tệp cục bộ.
 */
export function computeBufferSha256(buffer: Uint8Array): Sha256Hash {
  return createHash('sha256').update(buffer).digest('hex');
}

export async function computeFileSha256(filePath: string): Promise<Sha256Hash> {
  const buffer = await readFile(filePath);
  return computeBufferSha256(buffer);
}

/**
 * Kiểm tra đường dẫn không rỗng, không chứa ký tự null hoặc vượt cấp thư mục (`..`).
 */
export function assertSafeFilesystemPath(rawPath: string, fieldName: string): string {
  const trimmed = rawPath.trim();
  if (!trimmed) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Đường dẫn '${fieldName}' không được để trống.`,
      details: { fieldName },
      recoverable: true
    });
  }
  if (trimmed.includes('\0')) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Đường dẫn '${fieldName}' chứa ký tự null không hợp lệ.`,
      details: { fieldName },
      recoverable: true
    });
  }
  const slashNormalized = trimmed.replace(/\\/g, '/');
  const segments = slashNormalized.split('/');
  if (segments.includes('..')) {
    throw new AppError({
      code: 'DOMAIN_INVARIANT_VIOLATION',
      message: `Đường dẫn '${fieldName}' chứa thành phần vượt cấp thư mục ('..') bị cấm.`,
      details: { fieldName, candidatePath: trimmed },
      recoverable: true
    });
  }
  return resolve(trimmed);
}

/**
 * Kiểm tra đường dẫn đích có chạm tới tài sản bất biến (Template V0, Source Snapshot,
 * corpus mẫu hoặc đặc tả/mockup gốc) hay không.
 */
export function isProtectedImmutableArtifactPath(candidatePath: string): boolean {
  const normalized = candidatePath.replace(/\\/g, '/').trim();
  if (!normalized) {
    return false;
  }
  if (isImmutableProtectedTargetPath(normalized)) {
    return true;
  }
  const lower = normalized.toLowerCase();
  if (/(^|\/)sources\/[^/]+\/[a-f0-9]{64}(\/|$)/i.test(lower)) {
    return true;
  }
  // Bảo vệ bản dựng lịch sử đã chốt trên đĩa (builds/<buildId>/manifest.json | output.docx)
  if (/(^|\/)builds\/[^/]+\/(manifest\.json|output\.docx)$/i.test(lower)) {
    try {
      if (existsSync(candidatePath)) {
        return true;
      }
    } catch {
      // Bỏ qua lỗi fs khi kiểm tra tồn tại
    }
  }
  return false;
}

/**
 * Đặt quyền tệp chỉ đọc (`0o444` trên hệ thống POSIX / thuộc tính read-only) để khóa tài sản bất biến.
 */
export async function setFileReadOnly(filePath: string): Promise<void> {
  await chmod(filePath, 0o444);
}

/**
 * Kiểm tra tệp trên đĩa hiện có đang ở trạng thái chỉ đọc (không có quyền ghi) hay không.
 */
export async function isFileReadOnly(filePath: string): Promise<boolean> {
  const fileStat = await stat(filePath);
  if (process.platform === 'win32') {
    return (fileStat.mode & 0o200) === 0;
  }
  return (fileStat.mode & 0o222) === 0;
}

/**
 * Dò tìm thư mục gốc của kho mã nguồn `docflow-studio` (chứa `AGENTS.md` và `docs/DOCFLOW_STUDIO_SPEC.md`).
 */
export function detectSourceRepoRoot(startDir = process.cwd()): string | null {
  let current = resolve(startDir);
  const root = parse(current).root;

  while (true) {
    const hasAgentsMd = existsSync(join(current, 'AGENTS.md'));
    const hasSpecMd = existsSync(join(current, 'docs', 'DOCFLOW_STUDIO_SPEC.md'));
    if (hasAgentsMd && hasSpecMd) {
      return current;
    }
    if (current === root) {
      return null;
    }
    const parent = dirname(current);
    if (parent === current) {
      return null;
    }
    current = parent;
  }
}

async function resolveCanonicalOrLexicalPath(targetPath: string): Promise<string> {
  const lexical = normalize(resolve(targetPath));
  try {
    return await realpath(lexical);
  } catch {
    const parent = dirname(lexical);
    if (parent !== lexical) {
      try {
        const canonicalParent = await realpath(parent);
        return join(canonicalParent, lexical.slice(parent.length + 1));
      } catch {
        return lexical;
      }
    }
    return lexical;
  }
}

/**
 * Cưỡng chế thư mục dự án người dùng phải nằm ngoài kho mã nguồn `docflow-studio` (Spec §5.3 & Tài liệu 09 §4.2).
 */
export async function assertProjectDirOutsideSourceRepo(
  projectDir: string,
  explicitRepoRoot?: string
): Promise<string> {
  const safeProjectDir = assertSafeFilesystemPath(projectDir, 'projectDir');
  const canonicalProjectDir = await resolveCanonicalOrLexicalPath(safeProjectDir);

  const detectedRepoRoot = explicitRepoRoot
    ? resolve(explicitRepoRoot)
    : (detectSourceRepoRoot(__dirname) ?? detectSourceRepoRoot(process.cwd()));

  if (detectedRepoRoot) {
    const canonicalRepoRoot = await resolveCanonicalOrLexicalPath(detectedRepoRoot);
    const repoPrefix = canonicalRepoRoot.endsWith(sep)
      ? canonicalRepoRoot
      : `${canonicalRepoRoot}${sep}`;

    if (canonicalProjectDir === canonicalRepoRoot || canonicalProjectDir.startsWith(repoPrefix)) {
      throw new AppError({
        code: 'IMMUTABLE_TARGET_PROTECTED',
        message:
          'Không được khởi tạo hoặc mở thư mục dự án người dùng bên trong kho mã nguồn DocFlow Studio.',
        details: {
          projectDir: canonicalProjectDir,
          sourceRepoRoot: canonicalRepoRoot
        },
        recoverable: true
      });
    }
  }

  return canonicalProjectDir;
}
