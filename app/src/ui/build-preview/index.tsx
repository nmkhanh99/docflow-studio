import {
  DOCUMENT_BUILD_STATUS_TONES,
  LAYOUT_DIFF_LABELS_VI,
  LAYOUT_DIFF_TONES,
  LAYOUT_POLICY_MODE_LABELS_VI,
  formatHashPreview,
  formatNumberVi,
  getDocumentBuildStatusLabelVi
} from '../shared';
import { useShellStore, type BuildPreviewTabKey } from '../shell/store';

const BUILD_VIEW_TABS: readonly {
  readonly key: BuildPreviewTabKey;
  readonly label: string;
}[] = [
  { key: 'preview-pages', label: 'Xem trước trang kết xuất' },
  { key: 'content-diff', label: 'Content Diff (Khác biệt nội dung)' },
  { key: 'layout-diff', label: 'Layout Diff (Khác biệt bố cục)' }
];

export function BuildPreviewScreen() {
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const buildDiffActiveTab = useShellStore((s) => s.buildDiffActiveTab);
  const setBuildDiffActiveTab = useShellStore((s) => s.setBuildDiffActiveTab);

  const builds = activeProjectSession?.builds ?? [];
  const revisions = activeProjectSession?.revisions ?? [];
  const latestBuild = builds[0] ?? null;

  const approvedRevisionsCount = revisions.filter((r) => r.reviewStatus === 'APPROVED').length;
  const unapprovedRevisionsCount = revisions.filter(
    (r) => r.reviewStatus === 'DRAFT' || r.reviewStatus === 'REVIEW_REQUIRED'
  ).length;

  return (
    <div className="df-screen-stack" data-screen="build-preview">
      <div className="df-screen-header">
        <div>
          <h2>04 · Dựng toàn tài liệu &amp; Kiểm duyệt bố cục (Build &amp; Preview)</h2>
          <p>
            Đóng gói <strong>Build Manifest</strong> tái lập được, kết xuất trên bản sao của{' '}
            <strong>Template V0</strong> và tách biệt tuyệt đối <strong>Content Diff</strong> với{' '}
            <strong>Layout Diff</strong> trước khi xuất DOCX.
          </p>
        </div>
      </div>

      <div className="df-workspace-grid">
        {/* Cột Trái: Build Manifest */}
        <aside className="df-panel" aria-label="Thông tin Build Manifest">
          <div className="df-panel-title-row">
            <h3>Hồ sơ Build Manifest</h3>
            <span className="df-count-chip">{formatNumberVi(builds.length)}</span>
          </div>

          {latestBuild ? (
            <div className="df-panel-section">
              <div className="df-list-card-top">
                <code>{latestBuild.id}</code>
                <span
                  className={`df-badge df-badge-${DOCUMENT_BUILD_STATUS_TONES[latestBuild.status]}`}
                >
                  {getDocumentBuildStatusLabelVi(latestBuild.status)}
                </span>
              </div>
              <div className="df-kv-list">
                <div>
                  <span>Template V0:</span>{' '}
                  <code>{formatHashPreview(latestBuild.templateHash)}</code>
                </div>
                <div>
                  <span>Phiên bản Recipe:</span>{' '}
                  <strong>v{formatNumberVi(latestBuild.recipeVersion)}</strong>
                </div>
                <div>
                  <span>Số Source Snapshot ghim:</span>{' '}
                  <strong>{formatNumberVi(latestBuild.sourceSnapshotIds.length)}</strong>
                </div>
                <div>
                  <span>Chính sách bố cục:</span>{' '}
                  <span>
                    {LAYOUT_POLICY_MODE_LABELS_VI[latestBuild.layoutPolicy.mode ?? 'NATURAL_REFLOW']}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <div className="df-empty-box">
              <strong>Chưa có Build Manifest nào</strong>
              <p>
                Mỗi bản dựng sẽ ghim cứng mã băm của <strong>Template V0</strong>, phiên bản{' '}
                <strong>Recipe</strong>, danh sách <strong>Source Snapshot</strong> và các{' '}
                <strong>Section Revision</strong> đã duyệt để đảm bảo tái dựng chính xác về sau.
              </p>
            </div>
          )}

          <div className="df-panel-section">
            <h3>Chính sách dàn trang hỗ trợ (§8.5)</h3>
            <ul className="df-plain-list">
              {Object.entries(LAYOUT_POLICY_MODE_LABELS_VI).map(([mode, label]) => (
                <li key={mode}>
                  <code>{mode}</code>: {label}
                </li>
              ))}
            </ul>
          </div>
        </aside>

        {/* Cột Giữa: Xem trước trang + Tách tab Content Diff và Layout Diff */}
        <section
          className="df-panel df-panel-main"
          aria-label="Vùng xem trước bản dựng và đối chiếu khác biệt"
        >
          <div
            className="df-tab-strip"
            role="tablist"
            aria-label="Chế độ xem trước và đối chiếu Diff"
          >
            {BUILD_VIEW_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={buildDiffActiveTab === tab.key}
                className={`df-subtab ${buildDiffActiveTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setBuildDiffActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="df-tab-panel" role="tabpanel">
            {buildDiffActiveTab === 'preview-pages' && (
              <div className="df-empty-stage">
                <h4>Chưa có bản PDF / ảnh trang kết xuất từ tài liệu sau khi vá</h4>
                <p>
                  Trạng thái trống: Vùng xem trước này chỉ hiển thị các trang thực tế được kết xuất
                  bởi Layout Engine từ bản sao DOCX sau khi áp tập lệnh OOXML Patch — tuyệt đối
                  không giả lập số trang cố định.
                </p>
              </div>
            )}

            {buildDiffActiveTab === 'content-diff' && (
              <div className="df-empty-stage">
                <h4>Tab Content Diff — Đối chiếu nội dung, số liệu và bảng biểu</h4>
                <p>
                  Trạng thái trống: Chưa có cặp <strong>Section Revision</strong> trước/sau để so
                  sánh. Tab này chỉ hiển thị thay đổi ngữ nghĩa thực sự (Value Diff, Content Diff,
                  Table Diff theo <code>blockId</code>), không gộp lẫn hiện tượng trôi trang vật lý.
                </p>
              </div>
            )}

            {buildDiffActiveTab === 'layout-diff' && (
              <div className="df-empty-stage">
                <h4>Tab Layout Diff — Đối chiếu vị trí phân trang vật lý</h4>
                <div className="df-legend-row">
                  {(
                    Object.keys(LAYOUT_DIFF_LABELS_VI) as Array<keyof typeof LAYOUT_DIFF_LABELS_VI>
                  ).map((kind) => (
                    <span key={kind} className={`df-badge df-badge-${LAYOUT_DIFF_TONES[kind]}`}>
                      {LAYOUT_DIFF_LABELS_VI[kind]} ({kind})
                    </span>
                  ))}
                </div>
                <p>
                  Trạng thái trống: Chưa có báo cáo kiểm tra bố cục (<code>BuildLayoutReport</code>).
                  Khi một phần dài ra khiến phần kế tiếp dời sang trang mới mà không sửa chữ, hệ
                  thống ghi nhận tại đây là <strong>Dịch trang (SHIFTED)</strong> thay vì báo nhầm
                  là sửa nội dung.
                </p>
              </div>
            )}
          </div>
        </section>

        {/* Cột Phải: Cổng chất lượng Build Gate & Xuất DOCX */}
        <aside className="df-panel" aria-label="Cổng kiểm duyệt chất lượng Build Gate và xuất DOCX">
          <div className="df-panel-section">
            <h3>Cổng kiểm duyệt xuất bản (Build Gate)</h3>
            <div className="df-kv-list">
              <div>
                <span>Section Revision đã duyệt:</span>{' '}
                <strong>{formatNumberVi(approvedRevisionsCount)}</strong>
              </div>
              <div>
                <span>Section Revision chờ duyệt / nháp:</span>{' '}
                <strong>{formatNumberVi(unapprovedRevisionsCount)}</strong>
              </div>
              <div>
                <span>Trạng thái cổng xuất:</span>{' '}
                <span className="df-badge df-badge-danger">Bị chặn (Chưa đủ điều kiện)</span>
              </div>
            </div>
          </div>

          <div className="df-panel-section">
            <h3>Danh mục kiểm tra bố cục (§4.4)</h3>
            <ul className="df-plain-list">
              <li>Không còn phần bắt buộc ở trạng thái Cần tính lại (STALE)</li>
              <li>Mọi Section Revision trong Manifest đã được người dùng APPROVED</li>
              <li>Kiểm tra số trang, ngắt dòng bảng biểu, tiêu đề mồ côi, Header/Footer &amp; TOC</li>
              <li>Đối chiếu danh sách phông chữ phụ thuộc của môi trường kết xuất</li>
            </ul>
          </div>

          <div className="df-panel-section">
            <div className="df-action-stack">
              <button type="button" className="df-btn" disabled>
                Kết xuất xem trước toàn tài liệu
              </button>
              <button type="button" className="df-btn" disabled>
                Phê duyệt bản dựng (Người dùng)
              </button>
              <button type="button" className="df-btn df-btn-primary" disabled>
                Xuất DOCX chính thức
              </button>
            </div>
            <p className="df-footnote">
              Cốt lõi an toàn: Cấm xuất đè lên <code>template/original.docx</code> hoặc kho{' '}
              <code>sources/</code>; cấm mọi AI Agent tự gọi lệnh xuất tài liệu.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
