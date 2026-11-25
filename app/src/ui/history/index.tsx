import {
  ACTOR_TYPE_LABELS_VI,
  AUDIT_OUTCOME_LABELS_VI,
  AUDIT_OUTCOME_TONES,
  DOCUMENT_BUILD_STATUS_TONES,
  formatDateTimeVi,
  formatHashPreview,
  formatNumberVi,
  getDocumentBuildStatusLabelVi
} from '../shared';
import { useShellStore, type HistoryFilterKind } from '../shell/store';

const HISTORY_FILTERS: readonly {
  readonly key: HistoryFilterKind;
  readonly label: string;
}[] = [
  { key: 'ALL', label: 'Tất cả sự kiện' },
  { key: 'project', label: 'Dự án & Nguồn' },
  { key: 'section', label: 'Phần & Duyệt' },
  { key: 'rule', label: 'Quy tắc' },
  { key: 'run', label: 'Thực thi DAG' },
  { key: 'build', label: 'Bản dựng' }
];

export function HistoryScreen() {
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const auditHistory = useShellStore((s) => s.auditHistory);
  const historyFilterKind = useShellStore((s) => s.historyFilterKind);
  const isLoadingHistory = useShellStore((s) => s.isLoadingHistory);
  const refreshHistory = useShellStore((s) => s.refreshHistory);

  const builds = activeProjectSession?.builds ?? [];

  return (
    <div className="df-screen-stack" data-screen="history">
      <div className="df-screen-header">
        <div>
          <h2>05 · Nhật ký kiểm toán &amp; Lịch sử phiên bản (History &amp; Versions)</h2>
          <p>
            Dòng thời gian kiểm toán chỉ thêm mới (append-only) từ <code>audit_events</code> và danh
            sách <strong>Build Snapshot</strong> cho phép tái dựng tài liệu hoặc tách nhánh chỉnh
            sửa mới mà không ghi đè lịch sử.
          </p>
        </div>
        <div className="df-inline-actions">
          <button
            type="button"
            className="df-btn"
            disabled={isLoadingHistory}
            onClick={() => void refreshHistory(historyFilterKind)}
          >
            {isLoadingHistory ? 'Đang tải nhật ký...' : 'Làm mới nhật ký'}
          </button>
        </div>
      </div>

      <div className="df-two-col-grid">
        {/* Vùng Chính: Dòng thời gian kiểm toán */}
        <section className="df-panel df-panel-main" aria-label="Dòng thời gian sự kiện kiểm toán">
          <div className="df-panel-toolbar">
            <div className="df-segmented" role="group" aria-label="Bộ lọc sự kiện kiểm toán">
              {HISTORY_FILTERS.map((filter) => (
                <button
                  key={filter.key}
                  type="button"
                  aria-pressed={historyFilterKind === filter.key}
                  className={historyFilterKind === filter.key ? 'is-active' : ''}
                  onClick={() => void refreshHistory(filter.key)}
                >
                  {filter.label}
                </button>
              ))}
            </div>
            <span className="df-count-chip">{formatNumberVi(auditHistory.length)} bản ghi</span>
          </div>

          {auditHistory.length > 0 ? (
            <ul className="df-timeline-list" aria-label="Danh sách sự kiện kiểm toán">
              {auditHistory.map((event) => (
                <li key={event.id} className="df-timeline-item">
                  <div className="df-list-card-top">
                    <div className="df-inline-meta">
                      <code>{event.channel}</code>
                      <span className={`df-badge df-badge-${AUDIT_OUTCOME_TONES[event.outcome]}`}>
                        {AUDIT_OUTCOME_LABELS_VI[event.outcome]}
                      </span>
                      <span className="df-meta-chip">
                        {ACTOR_TYPE_LABELS_VI[event.actorType]} ({event.actorId})
                      </span>
                    </div>
                    <span className="df-muted-small">{formatDateTimeVi(event.timestamp)}</span>
                  </div>
                  <div className="df-muted-small">
                    Mã sự kiện: <code>{event.id}</code> · Mã tương quan:{' '}
                    <code>{event.correlationId}</code>
                    {event.targetEntityId ? (
                      <>
                        {' '}
                        · Đối tượng: <code>{event.targetEntityId}</code>
                      </>
                    ) : null}
                    {event.errorCode ? (
                      <>
                        {' '}
                        · Mã lỗi: <code>{event.errorCode}</code>
                      </>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="df-empty-stage">
              <h4>Chưa có bản ghi kiểm toán khớp bộ lọc hiện tại</h4>
              <p>
                Mọi thao tác tạo/mở dự án, nhập mẫu gốc, lưu quy tắc, thực thi DAG, phê duyệt phần
                và xuất tài liệu qua kênh IPC đều được ghi nhận tự động kèm mã tương quan.
              </p>
            </div>
          )}
        </section>

        {/* Cột Phải: Build Snapshots & Tạo nhánh mới */}
        <aside className="df-panel" aria-label="Danh sách Build Snapshot tái lập được">
          <div className="df-panel-title-row">
            <h3>Kho Build Snapshot</h3>
            <span className="df-count-chip">{formatNumberVi(builds.length)}</span>
          </div>

          {builds.length > 0 ? (
            <ul className="df-item-list">
              {builds.map((build) => (
                <li key={build.id} className="df-list-card">
                  <div className="df-list-card-top">
                    <code>{build.id}</code>
                    <span
                      className={`df-badge df-badge-${DOCUMENT_BUILD_STATUS_TONES[build.status]}`}
                    >
                      {getDocumentBuildStatusLabelVi(build.status)}
                    </span>
                  </div>
                  <div className="df-muted-small">
                    Recipe v{formatNumberVi(build.recipeVersion)} ·{' '}
                    <code>{formatHashPreview(build.templateHash)}</code>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="df-empty-box">
              <strong>Chưa có Build Snapshot lịch sử</strong>
              <p>
                Sau khi có bản dựng đầu tiên, người dùng có thể mở lại bất kỳ Build Snapshot cũ nào
                để tra cứu mã băm đầu vào hoặc tạo nhánh chỉnh sửa mới mà không ghi đè bản cũ.
              </p>
            </div>
          )}

          <div className="df-panel-section">
            <div className="df-action-stack">
              <button type="button" className="df-btn" disabled>
                Mở lại Build Snapshot đã ghim
              </button>
              <button type="button" className="df-btn" disabled>
                Tạo nhánh chỉnh sửa từ Snapshot
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
