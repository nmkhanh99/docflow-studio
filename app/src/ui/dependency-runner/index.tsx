import type { RunMode } from '@core/domain';
import {
  CALCULATION_STATUS_LABELS_VI,
  CALCULATION_STATUS_TONES,
  DAG_NODE_TYPE_LABELS_VI,
  DEPENDENCY_EDGE_TYPE_LABELS_VI,
  RUN_MODE_DESCRIPTIONS_VI,
  RUN_MODE_LABELS_VI,
  formatNumberVi
} from '../shared';
import { useShellStore } from '../shell/store';

const RUN_SCOPE_OPTIONS: readonly RunMode[] = ['SELECTED', 'AFFECTED', 'FULL'];

export function DependencyRunnerScreen() {
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const runnerScopeMode = useShellStore((s) => s.runnerScopeMode);
  const selectedSectionId = useShellStore((s) => s.selectedSectionId);
  const setRunnerScopeMode = useShellStore((s) => s.setRunnerScopeMode);

  const edges = activeProjectSession?.dependencyEdges ?? [];
  const sections = activeProjectSession?.sections ?? [];

  return (
    <div className="df-screen-stack" data-screen="dependency-runner">
      <div className="df-screen-header">
        <div>
          <h2>03 · Đồ thị phụ thuộc &amp; Bộ chạy tăng dần (Dependency &amp; Runner)</h2>
          <p>
            Theo dõi lan truyền trạng thái <code>STALE</code> trên đồ thị không chu trình (DAG), lập
            kế hoạch chạy theo thứ tự tô-pô có bộ nhớ đệm <code>resultFingerprint</code> và lưu bằng
            chứng từng bước.
          </p>
        </div>
      </div>

      {/* Thanh chọn 3 phạm vi chạy theo §4.3 */}
      <section className="df-panel" aria-label="Chọn phạm vi tái tính toán">
        <div className="df-panel-title-row">
          <h3>Ba phạm vi thực thi chuẩn (§4.3)</h3>
          <button type="button" className="df-btn df-btn-primary" disabled>
            Lập kế hoạch &amp; Thực thi (Chờ tích hợp DAG Runner)
          </button>
        </div>

        <div className="df-scope-grid" role="radiogroup" aria-label="Phạm vi chạy quy trình">
          {RUN_SCOPE_OPTIONS.map((mode) => {
            const isSelected = runnerScopeMode === mode;
            return (
              <button
                key={mode}
                type="button"
                role="radio"
                aria-checked={isSelected}
                className={`df-scope-card ${isSelected ? 'is-selected' : ''}`}
                onClick={() => setRunnerScopeMode(mode)}
              >
                <div className="df-list-card-top">
                  <strong>{RUN_MODE_LABELS_VI[mode]}</strong>
                  <code>{mode}</code>
                </div>
                <p>{RUN_MODE_DESCRIPTIONS_VI[mode]}</p>
                {mode === 'SELECTED' && (
                  <span className="df-muted-small">
                    Phần mục tiêu:{' '}
                    <code>{selectedSectionId ?? sections[0]?.id ?? 'Chưa có phần được chọn'}</code>
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </section>

      <div className="df-two-col-grid">
        {/* Khung Đồ thị DAG */}
        <section className="df-panel" aria-label="Đồ thị phụ thuộc DAG">
          <div className="df-panel-title-row">
            <h3>Đồ thị phụ thuộc (Dependency Graph)</h3>
            <span className="df-count-chip">{formatNumberVi(edges.length)} cạnh</span>
          </div>

          <div className="df-legend-row" aria-label="Chú giải loại nút và trạng thái tính toán">
            {Object.entries(DAG_NODE_TYPE_LABELS_VI).map(([nodeType, label]) => (
              <span key={nodeType} className="df-meta-chip">
                <code>{nodeType}</code>: {label}
              </span>
            ))}
          </div>

          <div className="df-legend-row">
            {(
              Object.keys(CALCULATION_STATUS_LABELS_VI) as Array<
                keyof typeof CALCULATION_STATUS_LABELS_VI
              >
            ).map((statusKey) => (
              <span
                key={statusKey}
                className={`df-badge df-badge-${CALCULATION_STATUS_TONES[statusKey]}`}
              >
                {CALCULATION_STATUS_LABELS_VI[statusKey]}
              </span>
            ))}
          </div>

          {edges.length > 0 ? (
            <ul className="df-item-list">
              {edges.map((edge) => (
                <li key={edge.id} className="df-list-card">
                  <div className="df-list-card-top">
                    <span>
                      <code>{edge.fromId}</code> → <code>{edge.toId}</code>
                    </span>
                    <span className="df-badge df-badge-info">
                      {DEPENDENCY_EDGE_TYPE_LABELS_VI[edge.type]}
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <div className="df-empty-stage">
              <h4>Đồ thị phụ thuộc đang trống</h4>
              <p>
                Chưa có đỉnh và cạnh phụ thuộc (<code>USES</code>, <code>PRODUCES</code>,{' '}
                <code>REFERENCES</code>, <code>REWRITES</code>) nào trong cơ sở dữ liệu dự án. Giao
                diện không dựng sẵn sơ đồ giả lập khi chưa nạp Recipe thật.
              </p>
            </div>
          )}
        </section>

        {/* Khung Kế hoạch chạy & Bằng chứng thực thi */}
        <section className="df-panel" aria-label="Kế hoạch thực thi và bằng chứng tính toán">
          <div className="df-panel-section">
            <h3>Kế hoạch thực thi trước khi chạy (Execution Plan)</h3>
            <div className="df-empty-box">
              <strong>Chưa có kế hoạch thực thi đang mở</strong>
              <p>
                Trước mỗi lần chạy, hệ thống sẽ liệt kê rõ nút cần tính mới, nút tái sử dụng bộ nhớ
                đệm <code>resultFingerprint</code>, nút bị chặn do thượng nguồn <code>STALE</code>{' '}
                (<code>UPSTREAM_SECTION_STALE</code>) và nguồn dữ liệu bị thiếu.
              </p>
            </div>
          </div>

          <div className="df-panel-section">
            <h3>Kết quả từng bước &amp; Bằng chứng (RunStep Evidence)</h3>
            <div className="df-empty-box">
              <strong>Chưa ghi nhận phiên chạy (Run) nào</strong>
              <p>
                Sau khi thực thi trong sandbox tất định, bảng này sẽ hiển thị dòng Excel đối chiếu,
                giá trị trung gian, kiểm tra đơn vị, nhật ký thời gian chạy và trạng thái chờ người
                dùng phê duyệt.
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
