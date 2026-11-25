import { randomUUID } from 'node:crypto';
import { open, readFile, unlink } from 'node:fs/promises';
import { hostname } from 'node:os';
import { join, resolve } from 'node:path';
import { AppError } from '@core/domain';

export const PROJECT_LOCK_FILENAME = '.project.lock';

export interface ProjectLockMetadata {
  readonly lockId: string;
  readonly pid: number;
  readonly hostname: string;
  readonly projectDir: string;
  readonly acquiredAt: string;
}

export interface AcquireProjectLockOptions {
  readonly recoverDeadProcessLock?: boolean;
  readonly isProcessAliveFn?: (pid: number) => boolean;
  readonly currentPid?: number;
  readonly now?: () => Date;
}

export interface ProjectLockHandle {
  readonly lockFilePath: string;
  readonly metadata: ProjectLockMetadata;
  isReleased(): boolean;
  release(): Promise<void>;
}

const activeLockPathsInProcess = new Set<string>();

/**
 * Kiểm tra tiến trình hệ điều hành theo `pid` còn đang hoạt động hay không.
 */
export function defaultIsProcessAlive(pid: number): boolean {
  if (!Number.isInteger(pid) || pid <= 0) {
    return false;
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'EPERM') {
      return true;
    }
    return false;
  }
}

export async function readProjectLockMetadata(
  projectDir: string
): Promise<ProjectLockMetadata | null> {
  const lockFilePath = join(resolve(projectDir), PROJECT_LOCK_FILENAME);
  try {
    const raw = await readFile(lockFilePath, 'utf8');
    const parsed = JSON.parse(raw) as Partial<ProjectLockMetadata>;
    if (
      typeof parsed.lockId === 'string' &&
      typeof parsed.pid === 'number' &&
      typeof parsed.acquiredAt === 'string'
    ) {
      return Object.freeze({
        lockId: parsed.lockId,
        pid: parsed.pid,
        hostname: typeof parsed.hostname === 'string' ? parsed.hostname : 'unknown',
        projectDir: typeof parsed.projectDir === 'string' ? parsed.projectDir : resolve(projectDir),
        acquiredAt: parsed.acquiredAt
      });
    }
    return null;
  } catch {
    return null;
  }
}

async function tryCreateExclusiveLockFile(
  lockFilePath: string,
  metadata: ProjectLockMetadata
): Promise<boolean> {
  let handle: Awaited<ReturnType<typeof open>> | null = null;
  try {
    handle = await open(lockFilePath, 'wx', 0o600);
    await handle.writeFile(`${JSON.stringify(metadata, null, 2)}\n`, 'utf8');
    await handle.sync();
    return true;
  } catch (err) {
    const code = (err as NodeJS.ErrnoException | undefined)?.code;
    if (code === 'EEXIST') {
      return false;
    }
    throw err;
  } finally {
    if (handle) {
      await handle.close();
    }
  }
}

/**
 * Khóa độc quyền thư mục dự án thông qua tệp `.project.lock` (cờ nguyên tử `wx`),
 * ngăn hai tiến trình hoặc hai phiên mở ghi đồng thời trên cùng một dự án.
 */
export async function acquireProjectLock(
  projectDir: string,
  options: AcquireProjectLockOptions = {}
): Promise<ProjectLockHandle> {
  const resolvedProjectDir = resolve(projectDir);
  const lockFilePath = join(resolvedProjectDir, PROJECT_LOCK_FILENAME);
  const checkAlive = options.isProcessAliveFn ?? defaultIsProcessAlive;
  const recoverDead = options.recoverDeadProcessLock ?? true;
  const nowFn = options.now ?? (() => new Date());
  const pid = options.currentPid ?? process.pid;

  const metadata: ProjectLockMetadata = Object.freeze({
    lockId: randomUUID(),
    pid,
    hostname: hostname(),
    projectDir: resolvedProjectDir,
    acquiredAt: nowFn().toISOString()
  });

  if (activeLockPathsInProcess.has(lockFilePath)) {
    const existing = await readProjectLockMetadata(resolvedProjectDir);
    throw new AppError({
      code: 'PROJECT_LOCKED',
      message: `Thư mục dự án '${resolvedProjectDir}' đang được mở bởi một phiên làm việc khác.`,
      details: {
        projectDir: resolvedProjectDir,
        lockFilePath,
        holderPid: existing?.pid ?? pid,
        holderLockId: existing?.lockId ?? null,
        acquiredAt: existing?.acquiredAt ?? null
      },
      recoverable: true
    });
  }

  let created = await tryCreateExclusiveLockFile(lockFilePath, metadata);

  if (!created) {
    const existing = await readProjectLockMetadata(resolvedProjectDir);
    const holderAlive = existing !== null ? checkAlive(existing.pid) : true;

    if (!holderAlive && recoverDead && existing !== null) {
      try {
        await unlink(lockFilePath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (code !== 'ENOENT') {
          throw err;
        }
      }
      created = await tryCreateExclusiveLockFile(lockFilePath, metadata);
    }

    if (!created) {
      throw new AppError({
        code: 'PROJECT_LOCKED',
        message: `Thư mục dự án '${resolvedProjectDir}' đang bị khóa bởi tiến trình đang hoạt động (PID: ${String(existing?.pid ?? 'không rõ')}).`,
        details: {
          projectDir: resolvedProjectDir,
          lockFilePath,
          holderPid: existing?.pid ?? null,
          holderLockId: existing?.lockId ?? null,
          acquiredAt: existing?.acquiredAt ?? null
        },
        recoverable: true
      });
    }
  }

  activeLockPathsInProcess.add(lockFilePath);
  let released = false;

  return {
    lockFilePath,
    metadata,
    isReleased(): boolean {
      return released;
    },
    async release(): Promise<void> {
      if (released) {
        return;
      }
      released = true;
      activeLockPathsInProcess.delete(lockFilePath);

      const currentOnDisk = await readProjectLockMetadata(resolvedProjectDir);
      if (currentOnDisk && currentOnDisk.lockId !== metadata.lockId) {
        return;
      }
      try {
        await unlink(lockFilePath);
      } catch (err) {
        const code = (err as NodeJS.ErrnoException | undefined)?.code;
        if (code !== 'ENOENT') {
          throw err;
        }
      }
    }
  };
}
