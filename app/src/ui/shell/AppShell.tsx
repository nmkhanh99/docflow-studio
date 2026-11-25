import { useEffect } from 'react';
import { BuildPreviewScreen } from '../build-preview';
import { DependencyRunnerScreen } from '../dependency-runner';
import { HistoryScreen } from '../history';
import { RecipeStudioScreen } from '../recipe-studio';
import {
  formatHashPreview,
  formatNumberVi,
  getErrorCodeLabelVi,
  getProjectStatusLabelVi
} from '../shared';
import { WorkspaceScreen } from '../workspace';
import { ProjectSessionPanel } from './ProjectSessionPanel';
import { useShellStore, type DocFlowScreenKey } from './store';
import './styles.css';

export interface ScreenTabSpec {
  readonly key: DocFlowScreenKey;
  readonly indexLabel: string;
  readonly label: string;
  readonly specRef: string;
}

export const SCREEN_TABS: readonly ScreenTabSpec[] = [
  { key: 'workspace', indexLabel: '01', label: 'Không gian làm việc', specRef: '§4.1' },
  { key: 'recipe-studio', indexLabel: '02', label: 'Xưởng quy tắc', specRef: '§4.2' },
  { key: 'dependency-runner', indexLabel: '03', label: 'Phụ thuộc & Chạy', specRef: '§4.3' },
  { key: 'build-preview', indexLabel: '04', label: 'Dựng & Xem trước', specRef: '§4.4' },
  { key: 'history', indexLabel: '05', label: 'Lịch sử & Phiên bản', specRef: '§4.5' }
];

export function AppShell() {
  const activeScreen = useShellStore((s) => s.activeScreen);
  const ipcConnected = useShellStore((s) => s.ipcConnected);
  const ipcStatusLabel = useShellStore((s) => s.ipcStatusLabel);
  const registeredChannels = useShellStore((s) => s.registeredChannels);
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const auditHistoryCount = useShellStore((s) => s.auditHistory.length);
  const projectDialogMode = useShellStore((s) => s.projectDialogMode);
  const lastError = useShellStore((s) => s.lastError);
  const lastNotificationVi = useShellStore((s) => s.lastNotificationVi);

  const setActiveScreen = useShellStore((s) => s.setActiveScreen);
  const setProjectDialogMode = useShellStore((s) => s.setProjectDialogMode);
  const clearFeedback = useShellStore((s) => s.clearFeedback);
  const initializeShell = useShellStore((s) => s.initializeShell);

  useEffect(() => {
    void initializeShell();
  }, [initializeShell]);

  const getTabCountBadge = (key: DocFlowScreenKey): string | null => {
    if (key === 'history') {
      return auditHistoryCount > 0 ? formatNumberVi(auditHistoryCount) : null;
    }
    if (!activeProjectSession) {
      return null;
    }
    switch (key) {
      case 'workspace':
        return formatNumberVi(activeProjectSession.sections.length);
      case 'recipe-studio':
        return formatNumberVi(activeProjectSession.rules.length);
      case 'dependency-runner':
        return formatNumberVi(activeProjectSession.dependencyEdges.length);
      case 'build-preview':
        return formatNumberVi(activeProjectSession.builds.length);
      default:
        return null;
    }
  };

  return (
    <div className="df-shell">
      <header className="df-topbar">
        <div className="df-brand-group">
          <div className="df-brand">
            <strong>DocFlow Studio</strong>
            <span>Ứng dụng Desktop Offline-First · Kiến trúc Ports &amp; Adapters 4 lớp</span>
          </div>

          <div className="df-project-summary" aria-label="Thông tin dự án đang mở">
            {activeProjectSession ? (
              <>
                <span className="df-badge df-badge-success">
                  {getProjectStatusLabelVi(activeProjectSession.project.status)}
                </span>
                <strong className="df-project-title">{activeProjectSession.project.title}</strong>
                <span className="df-meta-chip">
                  Mã: <code>{activeProjectSession.project.id}</code>
                </span>
                <span className="df-meta-chip">
                  Recipe v{formatNumberVi(activeProjectSession.project.currentRecipeVersion)}
                </span>
                <span className="df-meta-chip">
                  Template V0:{' '}
                  <code>{formatHashPreview(activeProjectSession.template?.sha256)}</code>
                </span>
                <span className="df-project-path" title={activeProjectSession.projectDir}>
                  {activeProjectSession.projectDir}
                </span>
              </>
            ) : (
              <span className="df-badge df-badge-neutral">Chưa mở dự án nào</span>
            )}
          </div>
        </div>

        <div className="df-topbar-actions">
          <button
            type="button"
            className="df-btn df-btn-primary"
            aria-pressed={projectDialogMode === 'create'}
            onClick={() =>
              setProjectDialogMode(projectDialogMode === 'create' ? 'closed' : 'create')
            }
          >
            + Tạo dự án mới
          </button>
          <button
            type="button"
            className="df-btn"
            aria-pressed={projectDialogMode === 'open'}
            onClick={() => setProjectDialogMode(projectDialogMode === 'open' ? 'closed' : 'open')}
          >
            Mở dự án
          </button>
          <div
            className={`df-status-pill ${ipcConnected ? 'is-online' : 'is-offline'}`}
            role="status"
          >
            {ipcStatusLabel}
            {registeredChannels > 0 ? ` · ${formatNumberVi(registeredChannels)} kênh` : ''}
          </div>
        </div>
      </header>

      {(lastError || lastNotificationVi) && (
        <div
          className={`df-banner ${lastError ? 'df-banner-error' : 'df-banner-success'}`}
          role={lastError ? 'alert' : 'status'}
        >
          <div className="df-banner-body">
            {lastError ? (
              <>
                <strong>
                  [{lastError.code} · {getErrorCodeLabelVi(lastError.code)}]:
                </strong>{' '}
                <span>{lastError.messageVi}</span>
              </>
            ) : (
              <span>{lastNotificationVi}</span>
            )}
          </div>
          <button type="button" className="df-btn df-btn-ghost" onClick={clearFeedback}>
            Ẩn thông báo
          </button>
        </div>
      )}

      <ProjectSessionPanel />

      <nav className="df-nav" aria-label="Điều hướng 5 phân hệ chính">
        {SCREEN_TABS.map((tab) => {
          const countBadge = getTabCountBadge(tab.key);
          return (
            <button
              key={tab.key}
              type="button"
              className="df-nav-tab"
              aria-current={activeScreen === tab.key ? 'page' : undefined}
              onClick={() => setActiveScreen(tab.key)}
            >
              <span className="df-nav-index">{tab.indexLabel}</span>
              <span>{tab.label}</span>
              {countBadge !== null && <span className="df-nav-count">{countBadge}</span>}
            </button>
          );
        })}
      </nav>

      <main className="df-content">
        {activeScreen === 'workspace' && <WorkspaceScreen />}
        {activeScreen === 'recipe-studio' && <RecipeStudioScreen />}
        {activeScreen === 'dependency-runner' && <DependencyRunnerScreen />}
        {activeScreen === 'build-preview' && <BuildPreviewScreen />}
        {activeScreen === 'history' && <HistoryScreen />}
      </main>
    </div>
  );
}
