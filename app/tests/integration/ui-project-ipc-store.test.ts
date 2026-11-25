import { existsSync } from 'node:fs';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { IpcMainInvokeEvent } from 'electron';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import type { LogicalSection, SourceArtifact, TemplateArtifact } from '@core/domain';
import { ProjectWorkspaceManager } from '@infra/filesystem';
import {
  DOCFLOW_IPC_INVOKE_CHANNEL,
  IpcDispatcher,
  registerBootstrapIpcHandlers,
  type IpcResult
} from '@infra/ipc';
import { CompositeAuditLogger, InMemoryAuditLogger } from '@infra/logging';
import type {
  AuditHistoryListDto,
  DocFlowPreloadApi,
  PreloadIpcResult,
  ProjectSessionDto,
  SystemPingDto
} from '@preload/api-types';
import { useShellStore } from '@ui/shell/store';
import { registerElectronIpcBridge } from '../../src/main/ipc-bridge';

function createWiredPreloadApi() {
  const handlers = new Map<
    string,
    (event: IpcMainInvokeEvent, rawRequest: unknown) => Promise<IpcResult>
  >();

  const fakeIpcMain = {
    removeHandler: (channel: string) => {
      handlers.delete(channel);
    },
    handle: (
      channel: string,
      listener: (event: IpcMainInvokeEvent, rawRequest: unknown) => Promise<IpcResult>
    ) => {
      handlers.set(channel, listener);
    }
  };

  const compositeAuditLogger = new CompositeAuditLogger(new InMemoryAuditLogger());
  const dispatcher = new IpcDispatcher({ auditLogger: compositeAuditLogger });
  const workspaceManager = new ProjectWorkspaceManager();
  const sessionCoordinator = registerBootstrapIpcHandlers(dispatcher, compositeAuditLogger, {
    workspaceManager,
    compositeAuditLogger
  });
  registerElectronIpcBridge(fakeIpcMain, dispatcher);

  const invoke = async <TOutput = unknown>(
    channel: string,
    payload?: unknown,
    correlationId?: string
  ): Promise<PreloadIpcResult<TOutput>> => {
    const listener = handlers.get(DOCFLOW_IPC_INVOKE_CHANNEL);
    if (!listener) {
      throw new Error('Chưa đăng ký listener cho DOCFLOW_IPC_INVOKE_CHANNEL');
    }
    return (await listener({} as IpcMainInvokeEvent, {
      channel,
      payload,
      correlationId
    })) as PreloadIpcResult<TOutput>;
  };

  const api: DocFlowPreloadApi = {
    invoke,
    system: {
      ping: (echo?: string) =>
        invoke<SystemPingDto>('system.ping', echo !== undefined ? { echo } : {})
    },
    project: {
      create: (payload) => invoke<ProjectSessionDto>('project.create', payload),
      open: (payload) => invoke<ProjectSessionDto>('project.open', payload),
      importTemplate: (payload) => invoke<TemplateArtifact>('project.importTemplate', payload),
      addSource: (payload) => invoke<SourceArtifact>('project.addSource', payload)
    },
    section: {
      list: (payload) => invoke<readonly LogicalSection[]>('section.list', payload),
      get: (payload) => invoke('section.get', payload),
      resolveAnchor: (payload) => invoke('section.resolveAnchor', payload),
      updateBoundaries: (payload) => invoke('section.updateBoundaries', payload),
      saveRevision: (payload) => invoke('section.saveRevision', payload),
      approveRevision: (payload) => invoke('section.approveRevision', payload)
    },
    change: {
      create: (payload) => invoke('change.create', payload)
    },
    rule: {
      proposeFromInstruction: (payload) => invoke('rule.proposeFromInstruction', payload),
      validate: (payload) => invoke('rule.validate', payload),
      saveVersion: (payload) => invoke('rule.saveVersion', payload),
      test: (payload) => invoke('rule.test', payload)
    },
    dependency: {
      analyze: (payload) => invoke('dependency.analyze', payload)
    },
    run: {
      plan: (payload) => invoke('run.plan', payload),
      execute: (payload) => invoke('run.execute', payload),
      cancel: (payload) => invoke('run.cancel', payload),
      getEvidence: (payload) => invoke('run.getEvidence', payload)
    },
    build: {
      validate: (payload) => invoke('build.validate', payload),
      renderPreview: (payload) => invoke('build.renderPreview', payload),
      inspectLayout: (payload) => invoke('build.inspectLayout', payload),
      approve: (payload) => invoke('build.approve', payload),
      exportDocx: (payload) => invoke('build.exportDocx', payload)
    },
    history: {
      list: (payload) => invoke<AuditHistoryListDto>('history.list', payload ?? {}),
      openSnapshot: (payload) => invoke('history.openSnapshot', payload),
      branchFromSnapshot: (payload) => invoke('history.branchFromSnapshot', payload)
    }
  };

  return { api, sessionCoordinator };
}

describe('Kết nối Zustand Store <-> Preload IPC <-> ProjectWorkspaceManager & SQLite thực tế', () => {
  let sandboxRoot = '';
  let cleanupSession: (() => Promise<void>) | null = null;

  beforeEach(async () => {
    useShellStore.getState().resetShellStore();
    sandboxRoot = await mkdtemp(join(tmpdir(), 'docflow-ui-ipc-test-'));
  });

  afterEach(async () => {
    if (cleanupSession) {
      await cleanupSession();
      cleanupSession = null;
    }
    if (sandboxRoot) {
      await rm(sandboxRoot, { recursive: true, force: true });
    }
  });

  it('tạo mới dự án rỗng, chặn tạo đè, đóng và mở lại dự án thành công qua IPC đồng bộ lên Zustand store', async () => {
    const { api, sessionCoordinator } = createWiredPreloadApi();
    cleanupSession = () => sessionCoordinator.closeActiveProject();

    // 1. Khởi tạo shell kiểm tra kết nối IPC
    await useShellStore.getState().initializeShell(api);
    expect(useShellStore.getState().ipcConnected).toBe(true);
    expect(useShellStore.getState().registeredChannels).toBeGreaterThanOrEqual(27);

    // 2. Tạo thư mục dự án mới qua action của store
    const projectDir = join(sandboxRoot, 'du-an-bao-cao-nam');
    useShellStore.getState().setProjectDialogMode('create');

    const createdOk = await useShellStore.getState().createProject(
      {
        projectDir,
        title: 'Báo cáo thẩm định phương án đầu tư'
      },
      api
    );

    expect(createdOk).toBe(true);
    expect(existsSync(join(projectDir, 'manifest.json'))).toBe(true);
    expect(existsSync(join(projectDir, 'project.sqlite'))).toBe(true);
    expect(existsSync(join(projectDir, '.project.lock'))).toBe(true);
    expect(existsSync(join(projectDir, 'template'))).toBe(true);
    expect(existsSync(join(projectDir, 'sources'))).toBe(true);

    const stateAfterCreate = useShellStore.getState();
    expect(stateAfterCreate.projectDialogMode).toBe('closed');
    expect(stateAfterCreate.lastError).toBeNull();
    expect(stateAfterCreate.activeProjectSession?.project.title).toBe(
      'Báo cáo thẩm định phương án đầu tư'
    );
    expect(stateAfterCreate.activeProjectSession?.project.currentRecipeVersion).toBe(0);
    expect(stateAfterCreate.activeProjectSession?.template).toBeNull();
    expect(stateAfterCreate.activeProjectSession?.sections).toEqual([]);
    expect(stateAfterCreate.activeProjectSession?.rules).toEqual([]);
    expect(stateAfterCreate.auditHistory.some((ev) => ev.channel === 'project.create')).toBe(true);

    const createdProjectId = stateAfterCreate.activeProjectSession?.project.id;
    expect(createdProjectId).toMatch(/^proj-/);

    // 3. Cố tình gọi createProject đè lên thư mục đã có -> trả lỗi IMMUTABLE_TARGET_PROTECTED mà không làm mất phiên hiện tại
    const overwriteAttempt = await useShellStore.getState().createProject(
      {
        projectDir,
        title: 'Dự án ghi đè trái phép'
      },
      api
    );
    expect(overwriteAttempt).toBe(false);
    expect(useShellStore.getState().lastError?.code).toBe('IMMUTABLE_TARGET_PROTECTED');
    expect(useShellStore.getState().activeProjectSession?.project.id).toBe(createdProjectId);

    // 4. Đóng phiên ở backend, reset store rồi mở lại dự án từ đĩa qua openProject
    await sessionCoordinator.closeActiveProject();
    useShellStore.getState().resetShellStore();

    const openedOk = await useShellStore.getState().openProject({ projectDir }, api);
    expect(openedOk).toBe(true);

    const stateAfterOpen = useShellStore.getState();
    expect(stateAfterOpen.lastError).toBeNull();
    expect(stateAfterOpen.activeProjectSession?.project.id).toBe(createdProjectId);
    expect(stateAfterOpen.activeProjectSession?.project.title).toBe(
      'Báo cáo thẩm định phương án đầu tư'
    );
    expect(stateAfterOpen.auditHistory.some((ev) => ev.channel === 'project.open')).toBe(true);

    // 5. Lọc nhật ký kiểm toán theo nhóm kênh 'project'
    await useShellStore.getState().refreshHistory('project', api);
    expect(
      useShellStore.getState().auditHistory.every((ev) => ev.channel.startsWith('project.'))
    ).toBe(true);
  });
});
