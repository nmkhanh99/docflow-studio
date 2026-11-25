import { useSyncExternalStore } from 'react';
import { createStore } from 'zustand/vanilla';
import type { AuditEvent, RunMode, SerializedAppError } from '@core/domain';
import type { DocFlowPreloadApi, ProjectSessionDto } from '@preload/api-types';
import { formatDateTimeVi } from '../shared';

export type DocFlowScreenKey =
  | 'workspace'
  | 'recipe-studio'
  | 'dependency-runner'
  | 'build-preview'
  | 'history';

export type WorkspacePreviewMode = 'full-document' | 'section';

export type RecipeStudioTabKey =
  | 'ai-interpretation'
  | 'sources'
  | 'formula'
  | 'tests'
  | 'relationships';

export type RecipePersistenceMode = 'REUSABLE_RULE' | 'ONE_OFF_CHANGE';

export type BuildPreviewTabKey = 'preview-pages' | 'content-diff' | 'layout-diff';

export type HistoryFilterKind = 'ALL' | 'project' | 'section' | 'rule' | 'run' | 'build';

export type ProjectDialogMode = 'closed' | 'create' | 'open';

export interface ShellUiState {
  // Điều hướng 5 màn hình & các tab con
  readonly activeScreen: DocFlowScreenKey;
  readonly workspacePreviewMode: WorkspacePreviewMode;
  readonly selectedSectionId: string | null;
  readonly changeTrayExpanded: boolean;
  readonly recipeStudioActiveTab: RecipeStudioTabKey;
  readonly recipePersistenceMode: RecipePersistenceMode;
  readonly selectedRuleId: string | null;
  readonly runnerScopeMode: RunMode;
  readonly buildDiffActiveTab: BuildPreviewTabKey;
  readonly historyFilterKind: HistoryFilterKind;

  // Trạng thái kết nối IPC & hệ thống
  readonly ipcConnected: boolean;
  readonly ipcStatusLabel: string;
  readonly registeredChannels: number;
  readonly serverTimestamp: string | null;

  // Trạng thái phiên dự án thực tế (đồng bộ từ SQLite qua IPC)
  readonly activeProjectSession: ProjectSessionDto | null;
  readonly auditHistory: readonly AuditEvent[];
  readonly projectDialogMode: ProjectDialogMode;
  readonly isSubmittingProject: boolean;
  readonly isLoadingHistory: boolean;
  readonly lastError: SerializedAppError | null;
  readonly lastNotificationVi: string | null;

  // Hành động đồng bộ giao diện
  setActiveScreen: (screen: DocFlowScreenKey) => void;
  setWorkspacePreviewMode: (mode: WorkspacePreviewMode) => void;
  setSelectedSectionId: (sectionId: string | null) => void;
  setChangeTrayExpanded: (expanded: boolean) => void;
  setRecipeStudioActiveTab: (tab: RecipeStudioTabKey) => void;
  setRecipePersistenceMode: (mode: RecipePersistenceMode) => void;
  setSelectedRuleId: (ruleId: string | null) => void;
  setRunnerScopeMode: (mode: RunMode) => void;
  setBuildDiffActiveTab: (tab: BuildPreviewTabKey) => void;
  setHistoryFilterKind: (filter: HistoryFilterKind) => void;
  setProjectDialogMode: (mode: ProjectDialogMode) => void;
  setIpcStatus: (statusLabel: string, registeredChannels: number) => void;
  clearFeedback: () => void;
  resetShellStore: () => void;

  // Hành động bất đồng bộ qua preload IPC (`window.docflowApi`)
  initializeShell: (apiOverride?: DocFlowPreloadApi) => Promise<void>;
  createProject: (
    input: { readonly projectDir: string; readonly title: string },
    apiOverride?: DocFlowPreloadApi
  ) => Promise<boolean>;
  openProject: (
    input: { readonly projectDir: string },
    apiOverride?: DocFlowPreloadApi
  ) => Promise<boolean>;
  refreshHistory: (
    filterOverride?: HistoryFilterKind,
    apiOverride?: DocFlowPreloadApi
  ) => Promise<void>;
}

function resolveDocFlowApi(apiOverride?: DocFlowPreloadApi): DocFlowPreloadApi | undefined {
  if (apiOverride) {
    return apiOverride;
  }
  const globalScope = globalThis as { readonly docflowApi?: DocFlowPreloadApi };
  return globalScope.docflowApi;
}

function createMissingPreloadError(): SerializedAppError {
  return {
    code: 'IPC_INVALID_CHANNEL',
    message: 'Cầu nối bảo mật preload (window.docflowApi) chưa sẵn sàng trên môi trường hiện tại.',
    messageVi: 'Cầu nối bảo mật preload (window.docflowApi) chưa sẵn sàng trên môi trường hiện tại.',
    recoverable: true
  };
}

const INITIAL_SHELL_STATE = {
  activeScreen: 'workspace' as DocFlowScreenKey,
  workspacePreviewMode: 'full-document' as WorkspacePreviewMode,
  selectedSectionId: null as string | null,
  changeTrayExpanded: true,
  recipeStudioActiveTab: 'ai-interpretation' as RecipeStudioTabKey,
  recipePersistenceMode: 'REUSABLE_RULE' as RecipePersistenceMode,
  selectedRuleId: null as string | null,
  runnerScopeMode: 'AFFECTED' as RunMode,
  buildDiffActiveTab: 'preview-pages' as BuildPreviewTabKey,
  historyFilterKind: 'ALL' as HistoryFilterKind,
  ipcConnected: false,
  ipcStatusLabel: 'Chưa kiểm tra kênh IPC',
  registeredChannels: 0,
  serverTimestamp: null as string | null,
  activeProjectSession: null as ProjectSessionDto | null,
  auditHistory: [] as readonly AuditEvent[],
  projectDialogMode: 'closed' as ProjectDialogMode,
  isSubmittingProject: false,
  isLoadingHistory: false,
  lastError: null as SerializedAppError | null,
  lastNotificationVi: null as string | null
};

/**
 * Store trạng thái điều hướng giao diện & phiên dự án của DocFlow Studio (Zustand).
 * Lưu ý kiến trúc: UI tuyệt đối không tự tính nhẩm lại số liệu hay tự suy diễn trạng thái STALE.
 */
const shellStoreApi = createStore<ShellUiState>((set, get) => ({
  ...INITIAL_SHELL_STATE,

  setActiveScreen: (activeScreen) => set({ activeScreen }),
  setWorkspacePreviewMode: (workspacePreviewMode) => set({ workspacePreviewMode }),
  setSelectedSectionId: (selectedSectionId) => set({ selectedSectionId }),
  setChangeTrayExpanded: (changeTrayExpanded) => set({ changeTrayExpanded }),
  setRecipeStudioActiveTab: (recipeStudioActiveTab) => set({ recipeStudioActiveTab }),
  setRecipePersistenceMode: (recipePersistenceMode) => set({ recipePersistenceMode }),
  setSelectedRuleId: (selectedRuleId) => set({ selectedRuleId }),
  setRunnerScopeMode: (runnerScopeMode) => set({ runnerScopeMode }),
  setBuildDiffActiveTab: (buildDiffActiveTab) => set({ buildDiffActiveTab }),
  setHistoryFilterKind: (historyFilterKind) => set({ historyFilterKind }),
  setProjectDialogMode: (projectDialogMode) => set({ projectDialogMode, lastError: null }),
  setIpcStatus: (ipcStatusLabel, registeredChannels) =>
    set({
      ipcConnected: registeredChannels > 0,
      ipcStatusLabel,
      registeredChannels
    }),
  clearFeedback: () => set({ lastError: null, lastNotificationVi: null }),
  resetShellStore: () => set({ ...INITIAL_SHELL_STATE }),

  initializeShell: async (apiOverride) => {
    const api = resolveDocFlowApi(apiOverride);
    if (!api) {
      set({
        ipcConnected: false,
        ipcStatusLabel: 'Chế độ trình duyệt độc lập (chưa gắn preload)',
        registeredChannels: 0
      });
      return;
    }

    const pingResult = await api.system.ping('shell-init');
    if (!pingResult.ok) {
      set({
        ipcConnected: false,
        ipcStatusLabel: `Lỗi IPC: ${pingResult.error.messageVi}`,
        registeredChannels: 0,
        lastError: pingResult.error
      });
      return;
    }

    set({
      ipcConnected: true,
      ipcStatusLabel: `IPC an toàn sẵn sàng (${formatDateTimeVi(pingResult.data.serverTimestamp)})`,
      registeredChannels: pingResult.data.registeredChannels,
      serverTimestamp: pingResult.data.serverTimestamp
    });

    await get().refreshHistory(get().historyFilterKind, api);
  },

  createProject: async (input, apiOverride) => {
    const api = resolveDocFlowApi(apiOverride);
    if (!api) {
      set({ lastError: createMissingPreloadError() });
      return false;
    }

    set({ isSubmittingProject: true, lastError: null, lastNotificationVi: null });
    const result = await api.project.create({
      projectDir: input.projectDir.trim(),
      title: input.title.trim()
    });

    if (!result.ok) {
      set({
        isSubmittingProject: false,
        lastError: result.error
      });
      return false;
    }

    const session = result.data;
    set({
      isSubmittingProject: false,
      activeProjectSession: session,
      selectedSectionId: session.sections[0]?.id ?? null,
      selectedRuleId: session.rules[0]?.id ?? null,
      projectDialogMode: 'closed',
      lastError: null,
      lastNotificationVi: `Đã khởi tạo dự án "${session.project.title}" tại ${session.projectDir}.`
    });

    await get().refreshHistory(get().historyFilterKind, api);
    return true;
  },

  openProject: async (input, apiOverride) => {
    const api = resolveDocFlowApi(apiOverride);
    if (!api) {
      set({ lastError: createMissingPreloadError() });
      return false;
    }

    set({ isSubmittingProject: true, lastError: null, lastNotificationVi: null });
    const result = await api.project.open({
      projectDir: input.projectDir.trim()
    });

    if (!result.ok) {
      set({
        isSubmittingProject: false,
        lastError: result.error
      });
      return false;
    }

    const session = result.data;
    set({
      isSubmittingProject: false,
      activeProjectSession: session,
      selectedSectionId: session.sections[0]?.id ?? null,
      selectedRuleId: session.rules[0]?.id ?? null,
      projectDialogMode: 'closed',
      lastError: null,
      lastNotificationVi: `Đã mở dự án "${session.project.title}" và đối chiếu toàn vẹn mã băm sha256.`
    });

    await get().refreshHistory(get().historyFilterKind, api);
    return true;
  },

  refreshHistory: async (filterOverride, apiOverride) => {
    const api = resolveDocFlowApi(apiOverride);
    if (!api) {
      return;
    }

    const activeFilter = filterOverride ?? get().historyFilterKind;
    set({ isLoadingHistory: true, historyFilterKind: activeFilter });

    const result = await api.history.list({
      ...(activeFilter !== 'ALL' ? { filterKind: activeFilter } : {}),
      limit: 50
    });

    if (result.ok) {
      set({
        isLoadingHistory: false,
        auditHistory: result.data.items
      });
    } else {
      set({
        isLoadingHistory: false,
        lastError: result.error
      });
    }
  }
}));

export interface BoundShellStoreHook {
  <T>(selector: (state: ShellUiState) => T): T;
  readonly getState: typeof shellStoreApi.getState;
  readonly setState: typeof shellStoreApi.setState;
  readonly subscribe: typeof shellStoreApi.subscribe;
  readonly getInitialState: typeof shellStoreApi.getInitialState;
}

function useShellStoreSelector<T>(selector: (state: ShellUiState) => T): T {
  return useSyncExternalStore(
    shellStoreApi.subscribe,
    () => selector(shellStoreApi.getState()),
    () => selector(shellStoreApi.getState())
  );
}

export const useShellStore: BoundShellStoreHook = Object.assign(useShellStoreSelector, {
  getState: shellStoreApi.getState,
  setState: shellStoreApi.setState,
  subscribe: shellStoreApi.subscribe,
  getInitialState: shellStoreApi.getInitialState
});
