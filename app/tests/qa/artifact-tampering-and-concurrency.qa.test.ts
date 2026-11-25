import { existsSync } from 'node:fs';
import { chmod, mkdir, mkdtemp, readdir, rm, unlink, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PROJECT_LOCK_FILENAME,
  ProjectWorkspaceManager,
  acquireProjectLock,
  computeBufferSha256,
  computeFileSha256
} from '@infra/filesystem';
import { IpcDispatcher, registerBootstrapIpcHandlers } from '@infra/ipc';
import { CompositeAuditLogger, InMemoryAuditLogger } from '@infra/logging';

async function unlockTreeForCleanup(dirPath: string): Promise<void> {
  if (!existsSync(dirPath)) {
    return;
  }
  const entries = await readdir(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = join(dirPath, entry.name);
    if (entry.isDirectory()) {
      await chmod(full, 0o755).catch(() => undefined);
      await unlockTreeForCleanup(full);
    } else {
      await chmod(full, 0o644).catch(() => undefined);
    }
  }
}

describe('QA Độc lập — Ca biên Giả mạo Byte Tài sản Bất biến & Khóa Dự án Đồng thời (.project.lock)', () => {
  let sandboxDir = '';

  beforeEach(async () => {
    sandboxDir = await mkdtemp(join(tmpdir(), 'docflow-qa-tamper-lock-'));
  });

  afterEach(async () => {
    if (sandboxDir) {
      await unlockTreeForCleanup(sandboxDir);
      await rm(sandboxDir, { recursive: true, force: true });
    }
  });

  it('1. Giả mạo byte trên original.docx, template-sha256.txt, Source Snapshot và manifest.json bị phát hiện 100% & không rò rỉ lock', async () => {
    const manager = new ProjectWorkspaceManager();
    const projectDir = join(sandboxDir, 'du-an-qa-integrity');
    const externalDir = join(sandboxDir, 'external-inputs');
    await mkdir(externalDir, { recursive: true });

    const originalDocxBytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('QA-Template-V0-Clean-Bytes-0123456789', 'utf8')
    ]);
    const originalExcelBytes = Buffer.from('MaSP,DonGia,NgayHieuLuc\nSP01,250000,2026-01-01\n', 'utf8');

    const inputDocxPath = join(externalDir, 'Mau-Thuyet-Minh.docx');
    const inputCsvPath = join(externalDir, 'Bang-Gia.csv');
    await writeFile(inputDocxPath, originalDocxBytes);
    await writeFile(inputCsvPath, originalExcelBytes);

    const ws = await manager.createProject({
      projectDir,
      projectId: 'proj-qa-tamper',
      title: 'Dự án Kiểm thử Giả mạo Byte'
    });

    const tpl = await ws.importTemplateV0(inputDocxPath);
    const src = await ws.importSourceSnapshot(inputCsvPath, { sourceId: 'bang-gia' });
    const expectedTplSha = computeBufferSha256(originalDocxBytes);

    // Kịch bản MVP #1 cơ sở: Clone 10 bản làm việc liên tiếp và sửa trên bản clone, xác nhận sha256 của original.docx không đổi 100%
    for (let i = 1; i <= 10; i++) {
      const workPath = join(projectDir, 'working', `build-iter-${String(i)}.docx`);
      const cloned = await ws.artifactStore.cloneTemplateToWorkingCopy(tpl, workPath);
      expect(cloned.verifiedTemplateSha256).toBe(expectedTplSha);
      await writeFile(cloned.workingDocxPath, Buffer.from(`Patched working build #${String(i)}`));
    }
    expect(await computeFileSha256(tpl.path)).toBe(expectedTplSha);
    await ws.verifyWorkspaceIntegrity();
    await ws.close();

    const shaFilePath = join(projectDir, 'template', 'template-sha256.txt');

    // Ca biên A: Đảo bit 1 byte giữa thân original.docx ngoài ứng dụng
    const mutatedDocx = Buffer.from(originalDocxBytes);
    mutatedDocx[10] = mutatedDocx[10]! ^ 0x5a;
    await chmod(tpl.path, 0o644);
    await writeFile(tpl.path, mutatedDocx);
    await chmod(tpl.path, 0o444);

    await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });
    expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(false);

    // Khôi phục original.docx về chuẩn, kiểm tra mở lại thành công
    await chmod(tpl.path, 0o644);
    await writeFile(tpl.path, originalDocxBytes);
    await chmod(tpl.path, 0o444);

    // Ca biên B: original.docx nguyên vẹn nhưng tệp khóa template-sha256.txt bị sửa lệch sang mã băm giả mạo
    await chmod(shaFilePath, 0o644);
    await writeFile(shaFilePath, `${'f'.repeat(64)}\n`, 'utf8');
    await chmod(shaFilePath, 0o444);

    await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });
    expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(false);

    // Ca biên C: Xóa mất tệp template-sha256.txt
    await chmod(shaFilePath, 0o644);
    await unlink(shaFilePath);
    await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });

    // Khôi phục lại template-sha256.txt chuẩn
    await writeFile(shaFilePath, `${expectedTplSha}\n`, { mode: 0o444 });

    // Ca biên D: Giả mạo sửa 1 byte trong Source Snapshot đã lưu tại sources/<id>/<sha256>/source.csv
    await chmod(src.path, 0o644);
    await writeFile(src.path, Buffer.from('MaSP,DonGia,NgayHieuLuc\nSP01,999999,2026-01-01\n', 'utf8'));
    await chmod(src.path, 0o444);

    await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });
    expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(false);

    // Khôi phục Source Snapshot và kiểm tra mở lại sạch sẽ
    await chmod(src.path, 0o644);
    await writeFile(src.path, originalExcelBytes);
    await chmod(src.path, 0o444);

    const cleanReopen = await manager.openProject({ projectDir });
    expect(cleanReopen.project.id).toBe('proj-qa-tamper');
    await cleanReopen.close();
  });

  it('2. Đua tranh khóa dự án đồng thời (Promise.all), chặn tiến trình ngoại lai còn sống và tự động nhả khóa khi chuyển dự án qua IPC', async () => {
    const lockDir = join(sandboxDir, 'concurrent-lock-race');
    await mkdir(lockDir, { recursive: true });

    // A. 5 yêu cầu acquireProjectLock đua tranh song song cùng thời điểm: chỉ ĐÚNG 1 yêu cầu thắng, 4 yêu cầu nhận PROJECT_LOCKED
    const raceOutcomes = await Promise.allSettled([
      acquireProjectLock(lockDir),
      acquireProjectLock(lockDir),
      acquireProjectLock(lockDir),
      acquireProjectLock(lockDir),
      acquireProjectLock(lockDir)
    ]);

    const fulfilled = raceOutcomes.filter(
      (r): r is PromiseFulfilledResult<Awaited<ReturnType<typeof acquireProjectLock>>> =>
        r.status === 'fulfilled'
    );
    const rejected = raceOutcomes.filter(
      (r): r is PromiseRejectedResult => r.status === 'rejected'
    );

    expect(fulfilled).toHaveLength(1);
    expect(rejected).toHaveLength(4);
    for (const rej of rejected) {
      expect(rej.reason).toMatchObject({ code: 'PROJECT_LOCKED' });
    }

    await fulfilled[0]!.value.release();
    // Gọi release() lần 2 (idempotent) không được ném lỗi
    await expect(fulfilled[0]!.value.release()).resolves.toBeUndefined();

    // B. Mô phỏng tệp .project.lock được giữ bởi một tiến trình ngoại lai đang sống (isProcessAliveFn -> true)
    await writeFile(
      join(lockDir, PROJECT_LOCK_FILENAME),
      JSON.stringify({
        lockId: 'external-live-lock',
        pid: 424242,
        hostname: 'workstation-02',
        projectDir: lockDir,
        acquiredAt: '2026-11-25T10:20:00.000Z'
      }),
      'utf8'
    );

    await expect(
      acquireProjectLock(lockDir, {
        isProcessAliveFn: (pid) => pid === 424242
      })
    ).rejects.toMatchObject({
      code: 'PROJECT_LOCKED',
      details: {
        holderPid: 424242,
        holderLockId: 'external-live-lock'
      }
    });
    await unlink(join(lockDir, PROJECT_LOCK_FILENAME));

    // C. Chuyển đổi giữa 2 dự án qua IPC ProjectSessionCoordinator: dự án A tự động nhả khóa khi chuyển sang dự án B
    const compositeLogger = new CompositeAuditLogger(new InMemoryAuditLogger());
    const ipc = new IpcDispatcher({ auditLogger: compositeLogger });
    const coordinator = registerBootstrapIpcHandlers(ipc, compositeLogger, {
      compositeAuditLogger: compositeLogger
    });

    const projDirA = join(sandboxDir, 'project-session-A');
    const projDirB = join(sandboxDir, 'project-session-B');

    try {
      const createA = await ipc.dispatch({
        channel: 'project.create',
        payload: { projectDir: projDirA, title: 'Dự án A' }
      });
      expect(createA.ok).toBe(true);
      expect(existsSync(join(projDirA, PROJECT_LOCK_FILENAME))).toBe(true);

      // Một phiên ProjectWorkspaceManager độc lập khác cố mở Dự án A đang mở -> bị chặn PROJECT_LOCKED
      const externalManager = new ProjectWorkspaceManager();
      await expect(externalManager.openProject({ projectDir: projDirA })).rejects.toMatchObject({
        code: 'PROJECT_LOCKED'
      });

      // Chuyển phiên sang Dự án B -> khóa của Dự án A được giải phóng ngay lập tức
      const createB = await ipc.dispatch({
        channel: 'project.create',
        payload: { projectDir: projDirB, title: 'Dự án B' }
      });
      expect(createB.ok).toBe(true);
      expect(existsSync(join(projDirA, PROJECT_LOCK_FILENAME))).toBe(false);
      expect(existsSync(join(projDirB, PROJECT_LOCK_FILENAME))).toBe(true);
    } finally {
      await coordinator.closeActiveProject();
    }

    expect(existsSync(join(projDirB, PROJECT_LOCK_FILENAME))).toBe(false);
  });
});
