import {
  CHANGE_KIND_LABELS_VI,
  CHANGE_REQUEST_STATUS_LABELS_VI,
  CHANGE_SCOPE_LABELS_VI,
  SECTION_REVISION_STATUS_TONES,
  SOURCE_ARTIFACT_TYPE_LABELS_VI,
  formatDateTimeVi,
  formatHashPreview,
  formatNumberVi,
  getSectionRevisionStatusLabelVi
} from '../shared';
import { useShellStore } from '../shell/store';

export function WorkspaceScreen() {
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const workspacePreviewMode = useShellStore((s) => s.workspacePreviewMode);
  const selectedSectionId = useShellStore((s) => s.selectedSectionId);
  const changeTrayExpanded = useShellStore((s) => s.changeTrayExpanded);

  const setWorkspacePreviewMode = useShellStore((s) => s.setWorkspacePreviewMode);
  const setSelectedSectionId = useShellStore((s) => s.setSelectedSectionId);
  const setChangeTrayExpanded = useShellStore((s) => s.setChangeTrayExpanded);
  const setActiveScreen = useShellStore((s) => s.setActiveScreen);
  const setBuildDiffActiveTab = useShellStore((s) => s.setBuildDiffActiveTab);
  const setProjectDialogMode = useShellStore((s) => s.setProjectDialogMode);

  const sections = activeProjectSession?.sections ?? [];
  const sources = activeProjectSession?.sources ?? [];
  const changeRequests = activeProjectSession?.changeRequests ?? [];
  const revisions = activeProjectSession?.revisions ?? [];
  const rules = activeProjectSession?.rules ?? [];

  const activeSection =
    sections.find((sec) => sec.id === selectedSectionId) ?? sections[0] ?? null;

  const sectionRules = activeSection
    ? rules.filter((r) => r.targetSectionId === activeSection.id)
    : [];
  const sectionRevisions = activeSection
    ? revisions.filter((rev) => rev.sectionId === activeSection.id)
    : [];
  const pendingRevisionsCount = revisions.filter(
    (rev) => rev.reviewStatus === 'REVIEW_REQUIRED'
  ).length;

  const handleOpenContentDiff = () => {
    setBuildDiffActiveTab('content-diff');
    setActiveScreen('build-preview');
  };

  return (
    <div className="df-screen-stack" data-screen="workspace">
      <div className="df-screen-header">
        <div>
          <h2>01 · Không gian làm việc theo phần (Workspace)</h2>
          <p>
            Trung tâm quản lý <strong>Template V0</strong>, kho <strong>Source Snapshot</strong> và
            biên tập theo <strong>Logical Section</strong> (<code>Section != Page</code> — tuyệt đối
            không cắt ghép tệp DOCX theo trang).
          </p>
        </div>
        {!activeProjectSession && (
          <div className="df-inline-actions">
            <button
              type="button"
              className="df-btn df-btn-primary"
              onClick={() => setProjectDialogMode('create')}
            >
              Khởi tạo dự án để bắt đầu
            </button>
          </div>
        )}
      </div>

      <div className="df-workspace-grid">
        {/* Cột Trái: Template V0, Source Snapshots & Cây Logical Section */}
        <aside className="df-panel" aria-label="Tài sản nguồn và cây Logical Section">
          <div className="df-panel-section">
            <div className="df-panel-title-row">
              <h3>Mẫu gốc bất biến (Template V0)</h3>
              <span className="df-badge df-badge-neutral">Chỉ đọc · sha256</span>
            </div>
            {activeProjectSession?.template ? (
              <div className="df-kv-list">
                <div>
                  <span>Mã mẫu:</span> <code>{activeProjectSession.template.id}</code>
                </div>
                <div>
                  <span>Mã băm:</span>{' '}
                  <code>{formatHashPreview(activeProjectSession.template.sha256, 16)}</code>
                </div>
                <div>
                  <span>Thời điểm phân tích:</span>{' '}
                  <span>{formatDateTimeVi(activeProjectSession.template.parsedAt)}</span>
                </div>
              </div>
            ) : (
              <div className="df-empty-box">
                <strong>Chưa nhập Template V0 (.docx)</strong>
                <p>
                  {activeProjectSession
                    ? 'Dự án hiện đang rỗng. Ở giai đoạn tích hợp bộ đọc OOXML, tệp mẫu DOCX được chọn sẽ lưu bất biến tại template/original.docx.'
                    : 'Hãy tạo mới hoặc mở một thư mục dự án để quản lý Template V0 bất biến.'}
                </p>
              </div>
            )}
          </div>

          <div className="df-panel-section">
            <div className="df-panel-title-row">
              <h3>Nguồn dữ liệu (Source Snapshot)</h3>
              <span className="df-count-chip">{formatNumberVi(sources.length)}</span>
            </div>
            {sources.length > 0 ? (
              <ul className="df-item-list">
                {sources.map((src) => (
                  <li key={`${src.id}-v${String(src.version)}`} className="df-list-card">
                    <div className="df-list-card-top">
                      <strong>{src.id}</strong>
                      <span className="df-badge df-badge-info">v{formatNumberVi(src.version)}</span>
                    </div>
                    <div className="df-muted-small">{SOURCE_ARTIFACT_TYPE_LABELS_VI[src.type]}</div>
                    <code className="df-code-small">{formatHashPreview(src.sha256)}</code>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="df-empty-box">
                <strong>Chưa có Source Snapshot nào</strong>
                <p>
                  Các bảng tính Excel, tài liệu DOCX/PDF tham chiếu sẽ được lưu theo mã băm{' '}
                  <code>sha256</code> và không bao giờ bị ghi ngược dữ liệu.
                </p>
              </div>
            )}
          </div>

          <div className="df-panel-section">
            <div className="df-panel-title-row">
              <h3>Cây phần tài liệu (Logical Section)</h3>
              <span className="df-count-chip">{formatNumberVi(sections.length)}</span>
            </div>
            {sections.length > 0 ? (
              <ul className="df-item-list" aria-label="Danh sách Logical Section">
                {sections.map((section) => {
                  const isSelected = activeSection?.id === section.id;
                  return (
                    <li key={section.id}>
                      <button
                        type="button"
                        className={`df-selectable-item ${isSelected ? 'is-selected' : ''}`}
                        onClick={() => setSelectedSectionId(section.id)}
                      >
                        <div className="df-list-card-top">
                          <strong>
                            {formatNumberVi(section.order)}. {section.title}
                          </strong>
                          <code>{section.id}</code>
                        </div>
                        <div className="df-muted-small">
                          Neo OOXML: <code>{section.startAnchor}</code> →{' '}
                          <code>{section.endAnchor}</code>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <div className="df-empty-box">
                <strong>Danh sách Logical Section trống</strong>
                <p>
                  Chưa có phần tài liệu nào được trích xuất. Đơn vị phần được định danh theo điểm
                  neo cấu trúc OOXML, không gắn cứng với số trang.
                </p>
              </div>
            )}
          </div>
        </aside>

        {/* Cột Giữa: Vùng Xem trước Toàn bộ tài liệu hoặc Theo phần */}
        <section className="df-panel df-panel-main" aria-label="Vùng xem trước tài liệu và khối OOXML">
          <div className="df-panel-toolbar">
            <div className="df-segmented" role="tablist" aria-label="Chế độ xem trước Workspace">
              <button
                type="button"
                role="tab"
                aria-selected={workspacePreviewMode === 'full-document'}
                className={workspacePreviewMode === 'full-document' ? 'is-active' : ''}
                onClick={() => setWorkspacePreviewMode('full-document')}
              >
                Toàn bộ tài liệu (Full Preview)
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={workspacePreviewMode === 'section'}
                className={workspacePreviewMode === 'section' ? 'is-active' : ''}
                onClick={() => setWorkspacePreviewMode('section')}
              >
                Theo phần đang chọn (Section Preview)
              </button>
            </div>
            <span className="df-muted-small">
              {workspacePreviewMode === 'full-document'
                ? 'Hiển thị bản làm việc sao chép từ Template V0'
                : 'Hiển thị cây khối DocumentBlock của phần đang chọn'}
            </span>
          </div>

          {activeSection ? (
            <div className="df-section-detail">
              <div className="df-detail-banner">
                <strong>{activeSection.title}</strong>
                <span>
                  Định danh: <code>{activeSection.id}</code> · Khoảng neo:{' '}
                  <code>{activeSection.startAnchor}</code> đến <code>{activeSection.endAnchor}</code>
                </span>
              </div>
              <div className="df-empty-stage">
                <h4>Chưa có luồng kết xuất khối OOXML cho phần này</h4>
                <p>
                  Bộ phân tích cây khối (đoạn văn, bảng biểu, hình ảnh, điều khiển nội dung SDT) và
                  bộ đánh dấu thay đổi trước/sau sẽ hiển thị dữ liệu thực tại đây ở giai đoạn tích
                  hợp Document Engine.
                </p>
              </div>
            </div>
          ) : (
            <div className="df-empty-stage">
              <h4>Vùng xem trước tài liệu đang ở trạng thái trống</h4>
              <p>
                Ứng dụng không hiển thị văn bản mẫu hay số trang giả lập. Sau khi mở dự án và nhập{' '}
                <strong>Template V0</strong>, cấu trúc thực tế của tài liệu DOCX sẽ được nạp vào
                khung này để chọn khối và đối chiếu thay đổi.
              </p>
            </div>
          )}
        </section>

        {/* Cột Phải: Yêu cầu sửa, Dữ liệu liên kết, Quy tắc & Duyệt phần */}
        <aside className="df-panel" aria-label="Bảng điều khiển chỉnh sửa và phê duyệt phần">
          <div className="df-panel-section">
            <h3>Yêu cầu chỉnh sửa &amp; Liên kết dữ liệu</h3>
            {activeSection ? (
              <div className="df-kv-list">
                <div>
                  <span>Phần đang chọn:</span> <strong>{activeSection.title}</strong>
                </div>
                <div>
                  <span>Số quy tắc gắn kèm:</span>{' '}
                  <strong>{formatNumberVi(sectionRules.length)}</strong>
                </div>
                <div>
                  <span>Số bản sửa (Section Revision):</span>{' '}
                  <strong>{formatNumberVi(sectionRevisions.length)}</strong>
                </div>
              </div>
            ) : (
              <div className="df-empty-box">
                <strong>Chưa chọn Logical Section</strong>
                <p>
                  Chọn một phần tài liệu ở cột bên trái để xem dữ liệu đang dùng (Data Binding),
                  quy tắc gắn kèm (Saved Rule) và phạm vi các phần hạ nguồn bị ảnh hưởng.
                </p>
              </div>
            )}
          </div>

          <div className="df-panel-section">
            <h3>Trạng thái bản sửa (Section Revision)</h3>
            {sectionRevisions.length > 0 ? (
              <ul className="df-item-list">
                {sectionRevisions.map((rev) => (
                  <li key={rev.id} className="df-list-card">
                    <div className="df-list-card-top">
                      <code>{rev.id}</code>
                      <span
                        className={`df-badge df-badge-${SECTION_REVISION_STATUS_TONES[rev.reviewStatus]}`}
                      >
                        {getSectionRevisionStatusLabelVi(rev.reviewStatus)}
                      </span>
                    </div>
                    <div className="df-muted-small">
                      Số lệnh vá OOXML: {formatNumberVi(rev.patchSet.length)}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <div className="df-empty-box">
                <strong>Chưa có Section Revision đề xuất</strong>
                <p>
                  Mọi bản nháp tính toán hoặc câu chữ nhận xét mới sẽ dừng ở trạng thái{' '}
                  <em>Chờ duyệt</em> và không tự động ghi đè kết quả đã duyệt trước đó.
                </p>
              </div>
            )}
          </div>

          <div className="df-panel-section">
            <h3>Tác vụ trên phần hiện tại</h3>
            <div className="df-action-stack">
              <button type="button" className="df-btn" disabled>
                Lưu bản nháp yêu cầu sửa
              </button>
              <button type="button" className="df-btn" disabled>
                Chạy quy tắc phần này
              </button>
              <button type="button" className="df-btn df-btn-primary" disabled>
                Phê duyệt Section Revision
              </button>
            </div>
            <p className="df-footnote">
              Quy tắc an toàn: Chỉ người dùng giao diện mới có quyền phê duyệt Section Revision; trợ
              lý AI bị khóa cứng quyền duyệt.
            </p>
          </div>
        </aside>
      </div>

      {/* Cuối màn hình: Khay thay đổi (Change Tray) theo §4.1 */}
      <section className="df-change-tray" aria-label="Khay yêu cầu thay đổi (Change Tray)">
        <div className="df-change-tray-bar">
          <div className="df-change-tray-summary">
            <strong>Khay thay đổi (Change Tray)</strong>
            <span className="df-meta-chip">
              Yêu cầu đã lưu: <strong>{formatNumberVi(changeRequests.length)}</strong>
            </span>
            <span className="df-meta-chip">
              Bản vá chờ duyệt: <strong>{formatNumberVi(pendingRevisionsCount)}</strong>
            </span>
          </div>
          <div className="df-inline-actions">
            <button type="button" className="df-btn" onClick={handleOpenContentDiff}>
              Mở đối chiếu Content Diff
            </button>
            <button
              type="button"
              className="df-btn df-btn-ghost"
              aria-expanded={changeTrayExpanded}
              onClick={() => setChangeTrayExpanded(!changeTrayExpanded)}
            >
              {changeTrayExpanded ? 'Thu gọn khay' : 'Mở rộng khay'}
            </button>
          </div>
        </div>

        {changeTrayExpanded && (
          <div className="df-change-tray-content">
            {changeRequests.length > 0 ? (
              <ul className="df-tray-list">
                {changeRequests.map((cr) => (
                  <li key={cr.id} className="df-tray-item">
                    <code>{cr.id}</code>
                    <span className="df-badge df-badge-info">
                      {CHANGE_KIND_LABELS_VI[cr.changeKind]}
                    </span>
                    <span className="df-badge df-badge-neutral">
                      {CHANGE_SCOPE_LABELS_VI[cr.affectedScope]}
                    </span>
                    <span className="df-tray-prompt">{cr.prompt}</span>
                    <span className="df-muted-small">
                      {CHANGE_REQUEST_STATUS_LABELS_VI[cr.status]} · {formatDateTimeVi(cr.updatedAt)}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="df-empty-inline">
                Khay thay đổi hiện đang trống — chưa có yêu cầu chỉnh sửa (Change Request) hoặc bản
                vá OOXML tạm nào trong phiên dự án hiện tại.
              </p>
            )}
          </div>
        )}
      </section>
    </div>
  );
}
