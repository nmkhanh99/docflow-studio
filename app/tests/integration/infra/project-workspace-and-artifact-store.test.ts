import { existsSync } from 'node:fs';
import { chmod, mkdtemp, readdir, readFile, rm, stat, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  PROJECT_LOCK_FILENAME,
  PROJECT_MANIFEST_FILENAME,
  PROJECT_REQUIRED_SUBDIRECTORIES,
  PROJECT_SQLITE_FILENAME,
  ProjectWorkspaceManager,
  computeBufferSha256,
  isFileReadOnly
} from '@infra/filesystem';

async function makeTreeWritableForCleanup(targetDir: string): Promise<void> {
  if (!existsSync(targetDir)) {
    return;
  }
  const entries = await readdir(targetDir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(targetDir, entry.name);
    if (entry.isDirectory()) {
      await chmod(fullPath, 0o755).catch(() => undefined);
      await makeTreeWritableForCleanup(fullPath);
    } else {
      await chmod(fullPath, 0o644).catch(() => undefined);
    }
  }
}

describe('Integration: ProjectWorkspaceManager & Kho lưu trữ Artifact sha256 bất biến (§4.1, §5.3)', () => {
  let tempSandboxRoot = '';

  beforeEach(async () => {
    tempSandboxRoot = await mkdtemp(join(tmpdir(), 'docflow-ws-test-'));
  });

  afterEach(async () => {
    if (tempSandboxRoot) {
      await makeTreeWritableForCleanup(tempSandboxRoot);
      await rm(tempSandboxRoot, { recursive: true, force: true });
    }
  });

  it('tạo dự án mới ngoài repo sinh đầy đủ cấu trúc thư mục §5.3, project.sqlite đã migrate và chặn mở đồng thời bằng .project.lock', async () => {
    const manager = new ProjectWorkspaceManager();
    const projectDir = join(tempSandboxRoot, 'du-an-ke-hoach-2026');

    const workspace = await manager.createProject({
      projectDir,
      projectId: 'proj-2026-q4',
      title: 'Báo cáo Kế hoạch Sản xuất Kinh doanh 2026'
    });

    try {
      expect(workspace.project.id).toBe('proj-2026-q4');
      expect(workspace.project.status).toBe('ACTIVE');
      expect(existsSync(join(projectDir, PROJECT_MANIFEST_FILENAME))).toBe(true);
      expect(existsSync(join(projectDir, PROJECT_SQLITE_FILENAME))).toBe(true);
      expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(true);

      for (const requiredSubDir of PROJECT_REQUIRED_SUBDIRECTORIES) {
        const subDirPath = join(projectDir, requiredSubDir);
        expect(existsSync(subDirPath), `Thiếu thư mục chuẩn §5.3: ${requiredSubDir}`).toBe(true);
        const dirStat = await stat(subDirPath);
        expect(dirStat.isDirectory()).toBe(true);
      }

      // Chặn mở đồng thời cùng thư mục dự án khi phiên thứ nhất chưa đóng (.project.lock)
      await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
        code: 'PROJECT_LOCKED'
      });
    } finally {
      await workspace.close();
    }

    // Sau khi close(), tệp .project.lock đã được giải phóng và mở lại bình thường
    expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(false);

    const reopened = await manager.openProject({ projectDir });
    try {
      expect(reopened.project.id).toBe('proj-2026-q4');
      expect(reopened.project.title).toBe('Báo cáo Kế hoạch Sản xuất Kinh doanh 2026');
      const recentEvents = reopened.auditLogger.listRecent(10);
      expect(recentEvents.map((e) => e.channel)).toContain('project.open');
      expect(recentEvents.map((e) => e.channel)).toContain('project.create');
    } finally {
      await reopened.close();
    }
  });

  it('tự động thu hồi tệp khóa mồ côi (.project.lock) nếu tiến trình giữ khóa trước đó đã kết thúc và chặn tạo dự án trong kho mã nguồn', async () => {
    const manager = new ProjectWorkspaceManager();

    // 1. Chặn khởi tạo dự án nằm ngay bên trong kho mã nguồn docflow-studio
    const insideRepoDir = resolve(__dirname, '../../../.forbidden-inside-repo-project');
    await expect(
      manager.createProject({
        projectDir: insideRepoDir,
        title: 'Dự án sai vị trí'
      })
    ).rejects.toMatchObject({
      code: 'IMMUTABLE_TARGET_PROTECTED'
    });

    // 2. Thu hồi khóa mồ côi từ tiến trình đã chết
    const projectDir = join(tempSandboxRoot, 'du-an-orphan-lock');
    const ws = await manager.createProject({
      projectDir,
      title: 'Dự án kiểm thử thu hồi khóa'
    });
    await ws.close();

    // Giả lập file lock mồ côi từ một PID không còn tồn tại
    await writeFile(
      join(projectDir, PROJECT_LOCK_FILENAME),
      JSON.stringify({
        lockId: 'dead-lock-001',
        pid: 99999991,
        hostname: 'test-host',
        projectDir,
        acquiredAt: '2026-11-25T00:00:00.000Z'
      }),
      'utf8'
    );

    const recovered = await manager.openProject({
      projectDir,
      lockOptions: {
        isProcessAliveFn: () => false
      }
    });
    expect(recovered.lockMetadata.lockId).not.toBe('dead-lock-001');
    await recovered.close();
  });

  it('khóa chỉ đọc Template V0 + Source Snapshot theo sha256, từ chối ghi đè và phát hiện ngay khi original.docx bị sửa 1 byte ngoài ứng dụng', async () => {
    const manager = new ProjectWorkspaceManager();
    const projectDir = join(tempSandboxRoot, 'du-an-bao-ve-v0');
    const externalInputsDir = join(tempSandboxRoot, 'nguon-nguoi-dung');
    await mkdtemp(join(tempSandboxRoot, 'tmp-'));
    await writeFile(join(tempSandboxRoot, '.keep'), '');

    const { mkdir } = await import('node:fs/promises');
    await mkdir(externalInputsDir, { recursive: true });

    // Tạo file DOCX mẫu giả lập (chữ ký ZIP PK\x03\x04 + nội dung OOXML)
    const sampleDocxBytes = Buffer.concat([
      Buffer.from([0x50, 0x4b, 0x03, 0x04]),
      Buffer.from('DocFlow-Template-V0-Immutable-Content-2026', 'utf8')
    ]);
    const userTemplatePath = join(externalInputsDir, 'Mau-Bao-Cao-Goc.docx');
    await writeFile(userTemplatePath, sampleDocxBytes);

    const excelV1Bytes = Buffer.from('Sheet1: SP01 | 250000 | 2026-01-01', 'utf8');
    const excelV2Bytes = Buffer.from('Sheet1: SP01 | 275000 | 2026-06-01', 'utf8');
    const userExcelPath = join(externalInputsDir, 'Bang_Gia_San_Pham.xlsx');
    await writeFile(userExcelPath, excelV1Bytes);

    const workspace = await manager.createProject({
      projectDir,
      projectId: 'proj-v0-guard',
      title: 'Kiểm thử bất biến Template V0'
    });

    const expectedTemplateHash = computeBufferSha256(sampleDocxBytes);
    const templateArtifact = await workspace.importTemplateV0(userTemplatePath);

    expect(templateArtifact.sha256).toBe(expectedTemplateHash);
    expect(templateArtifact.readOnly).toBe(true);
    expect(await isFileReadOnly(templateArtifact.path)).toBe(true);
    expect(await isFileReadOnly(join(projectDir, 'template', 'template-sha256.txt'))).toBe(true);

    // Từ chối tuyệt đối mọi nỗ lực gọi importTemplateV0 lần 2 để ghi đè mẫu gốc
    await expect(workspace.importTemplateV0(userTemplatePath)).rejects.toMatchObject({
      code: 'IMMUTABLE_TARGET_PROTECTED'
    });

    // Nhập Source Snapshot v1 và v2 (khác nội dung -> khác sha256, giữ cả 2 bản chỉ đọc)
    const sourceV1 = await workspace.importSourceSnapshot(userExcelPath, { sourceId: 'excel-1' });
    expect(sourceV1.version).toBe(1);
    expect(sourceV1.sha256).toBe(computeBufferSha256(excelV1Bytes));
    expect(await isFileReadOnly(sourceV1.path)).toBe(true);

    await writeFile(userExcelPath, excelV2Bytes);
    const sourceV2 = await workspace.importSourceSnapshot(userExcelPath, { sourceId: 'excel-1' });
    expect(sourceV2.version).toBe(2);
    expect(sourceV2.sha256).toBe(computeBufferSha256(excelV2Bytes));
    expect(sourceV2.path).not.toBe(sourceV1.path);
    expect(existsSync(sourceV1.path)).toBe(true);
    expect(await isFileReadOnly(sourceV2.path)).toBe(true);

    // Clone Template V0 sang vùng working/ hợp lệ và chặn clone đè vào original.docx hoặc sources/
    const workingDocxPath = join(projectDir, 'working', 'preview-clone.docx');
    const cloned = await workspace.artifactStore.cloneTemplateToWorkingCopy(
      templateArtifact,
      workingDocxPath
    );
    expect(cloned.verifiedTemplateSha256).toBe(expectedTemplateHash);
    expect(await isFileReadOnly(cloned.workingDocxPath)).toBe(false);
    expect(await isFileReadOnly(templateArtifact.path)).toBe(true);

    await expect(
      workspace.artifactStore.cloneTemplateToWorkingCopy(templateArtifact, templateArtifact.path)
    ).rejects.toMatchObject({
      code: 'IMMUTABLE_TARGET_PROTECTED'
    });

    await expect(
      workspace.artifactStore.exportApprovedBuildArtifact(
        cloned.workingDocxPath,
        sourceV1.path,
        expectedTemplateHash
      )
    ).rejects.toMatchObject({
      code: 'IMMUTABLE_TARGET_PROTECTED'
    });

    // Xuất ra đường dẫn người dùng mới hợp lệ
    const exportedUserDocx = join(tempSandboxRoot, 'Xuat-Bao-Cao-Da-Duyet.docx');
    const exportReceipt = await workspace.artifactStore.exportApprovedBuildArtifact(
      cloned.workingDocxPath,
      exportedUserDocx,
      expectedTemplateHash
    );
    expect(exportReceipt.sha256).toBe(expectedTemplateHash);

    await workspace.close();

    // GIẢ LẬP TẤN CÔNG / CAN THIỆP TRÁI PHÉP NGOÀI ỨNG DỤNG: mở quyền ghi và sửa đúng 1 byte trong template/original.docx
    const storedOriginalPath = templateArtifact.path;
    const rawBytes = Buffer.from(await readFile(storedOriginalPath));
    rawBytes[rawBytes.length - 1] = rawBytes[rawBytes.length - 1]! ^ 0xff;
    await chmod(storedOriginalPath, 0o644);
    await writeFile(storedOriginalPath, rawBytes);
    await chmod(storedOriginalPath, 0o444);

    // 1. verifyArtifactIntegrity trả về false ngay lập tức
    expect(
      await workspace.artifactStore.verifyArtifactIntegrity(
        expectedTemplateHash,
        storedOriginalPath
      )
    ).toBe(false);

    // 2. cloneTemplateToWorkingCopy chặn ngay với ARTIFACT_INTEGRITY_VIOLATION
    await expect(
      workspace.artifactStore.cloneTemplateToWorkingCopy(
        templateArtifact,
        join(projectDir, 'working', 'should-fail.docx')
      )
    ).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });

    // 3. Mở lại dự án phát hiện ngay lập tức sự sai lệch mã băm và chặn bằng ARTIFACT_INTEGRITY_VIOLATION (không rò rỉ lock)
    await expect(manager.openProject({ projectDir })).rejects.toMatchObject({
      code: 'ARTIFACT_INTEGRITY_VIOLATION'
    });
    expect(existsSync(join(projectDir, PROJECT_LOCK_FILENAME))).toBe(false);
  });
});
