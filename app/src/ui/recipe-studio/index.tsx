import {
  DEPENDENCY_EDGE_TYPE_LABELS_VI,
  RULE_STATUS_TONES,
  SOURCE_ARTIFACT_TYPE_LABELS_VI,
  formatHashPreview,
  formatNumberVi,
  getRuleStatusLabelVi
} from '../shared';
import { useShellStore, type RecipeStudioTabKey } from '../shell/store';

const RECIPE_STUDIO_TABS: readonly {
  readonly key: RecipeStudioTabKey;
  readonly label: string;
}[] = [
  { key: 'ai-interpretation', label: 'AI diễn giải' },
  { key: 'sources', label: 'Nguồn dữ liệu' },
  { key: 'formula', label: 'Công thức (Typed IR)' },
  { key: 'tests', label: 'Kiểm thử & Provenance' },
  { key: 'relationships', label: 'Quan hệ phụ thuộc' }
];

export function RecipeStudioScreen() {
  const activeProjectSession = useShellStore((s) => s.activeProjectSession);
  const recipeStudioActiveTab = useShellStore((s) => s.recipeStudioActiveTab);
  const recipePersistenceMode = useShellStore((s) => s.recipePersistenceMode);
  const selectedRuleId = useShellStore((s) => s.selectedRuleId);

  const setRecipeStudioActiveTab = useShellStore((s) => s.setRecipeStudioActiveTab);
  const setRecipePersistenceMode = useShellStore((s) => s.setRecipePersistenceMode);
  const setSelectedRuleId = useShellStore((s) => s.setSelectedRuleId);

  const rules = activeProjectSession?.rules ?? [];
  const sources = activeProjectSession?.sources ?? [];
  const edges = activeProjectSession?.dependencyEdges ?? [];

  const activeRule = rules.find((r) => r.id === selectedRuleId) ?? rules[0] ?? null;
  const relatedEdges = activeRule
    ? edges.filter((edge) => edge.fromId === activeRule.id || edge.toId === activeRule.id)
    : [];

  return (
    <div className="df-screen-stack" data-screen="recipe-studio">
      <div className="df-screen-header">
        <div>
          <h2>02 · Xưởng quy tắc nghiệp vụ (Recipe Studio)</h2>
          <p>
            Định nghĩa lâu dài <strong>Saved Rule</strong> từ ngôn ngữ tự nhiên sang{' '}
            <strong>Typed Rule IR</strong> thực thi tất định trong hộp cát — tuyệt đối cấm{' '}
            <code>eval()</code>, cấm macro Office và dùng số học chính xác <code>Decimal</code>.
          </p>
        </div>
      </div>

      <div className="df-two-col-grid">
        {/* Cột Trái: Danh sách Rule trong Recipe */}
        <aside className="df-panel" aria-label="Thư viện Saved Rule của dự án">
          <div className="df-panel-title-row">
            <h3>Danh mục Saved Rule</h3>
            <span className="df-count-chip">{formatNumberVi(rules.length)}</span>
          </div>

          {rules.length > 0 ? (
            <ul className="df-item-list">
              {rules.map((rule) => {
                const isSelected = activeRule?.id === rule.id;
                return (
                  <li key={`${rule.id}-v${String(rule.version)}`}>
                    <button
                      type="button"
                      className={`df-selectable-item ${isSelected ? 'is-selected' : ''}`}
                      onClick={() => setSelectedRuleId(rule.id)}
                    >
                      <div className="df-list-card-top">
                        <code>{rule.id}</code>
                        <span className={`df-badge df-badge-${RULE_STATUS_TONES[rule.status]}`}>
                          {getRuleStatusLabelVi(rule.status)}
                        </span>
                      </div>
                      <div className="df-muted-small">
                        Phiên bản v{formatNumberVi(rule.version)} · Đích:{' '}
                        <code>{rule.targetSectionId ?? 'Chưa gắn phần'}</code>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="df-empty-box">
              <strong>Thư viện quy tắc đang trống</strong>
              <p>
                {activeProjectSession
                  ? 'Dự án hiện chưa lưu Saved Rule nào trong Recipe. Các quy tắc sau khi kiểm thử sẽ được lưu phiên bản bất biến tại recipe/rules/<ruleId>/<version>.json.'
                  : 'Mở hoặc khởi tạo một dự án để quản lý danh sách quy tắc nghiệp vụ.'}
              </p>
            </div>
          )}
        </aside>

        {/* Vùng Chính: Mô tả nghiệp vụ, hình thức lưu & 5 Tab chuyên biệt */}
        <section className="df-panel df-panel-main" aria-label="Chi tiết quy tắc và các tab định nghĩa">
          <div className="df-panel-toolbar">
            <div>
              <strong>Chế độ lưu thay đổi (§4.2):</strong>
            </div>
            <div className="df-segmented" role="group" aria-label="Phân loại lưu quy tắc">
              <button
                type="button"
                className={recipePersistenceMode === 'REUSABLE_RULE' ? 'is-active' : ''}
                aria-pressed={recipePersistenceMode === 'REUSABLE_RULE'}
                onClick={() => setRecipePersistenceMode('REUSABLE_RULE')}
              >
                Quy tắc tái sử dụng (Reusable Rule)
              </button>
              <button
                type="button"
                className={recipePersistenceMode === 'ONE_OFF_CHANGE' ? 'is-active' : ''}
                aria-pressed={recipePersistenceMode === 'ONE_OFF_CHANGE'}
                onClick={() => setRecipePersistenceMode('ONE_OFF_CHANGE')}
              >
                Bản vá một lần (One-time Patch)
              </button>
            </div>
          </div>

          <div className="df-instruction-box">
            <label className="df-field">
              <span>Mô tả quy tắc nghiệp vụ bằng ngôn ngữ tự nhiên</span>
              <textarea
                rows={3}
                readOnly
                value={
                  activeRule
                    ? activeRule.textInstruction
                    : 'Chưa chọn hoặc khởi tạo quy tắc. Bộ biên dịch mô tả tự nhiên sang Typed Rule IR (Rule Planner) sẽ được kích hoạt ở giai đoạn tiếp theo.'
                }
              />
            </label>
          </div>

          <div className="df-tab-strip" role="tablist" aria-label="Các khía cạnh định nghĩa quy tắc">
            {RECIPE_STUDIO_TABS.map((tab) => (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={recipeStudioActiveTab === tab.key}
                className={`df-subtab ${recipeStudioActiveTab === tab.key ? 'is-active' : ''}`}
                onClick={() => setRecipeStudioActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="df-tab-panel" role="tabpanel">
            {recipeStudioActiveTab === 'ai-interpretation' && (
              <div className="df-empty-stage">
                <h4>Tab AI diễn giải kế hoạch thực thi</h4>
                {activeRule ? (
                  <p>
                    Quy tắc <code>{activeRule.id}</code> (v{formatNumberVi(activeRule.version)}) có{' '}
                    {formatNumberVi(activeRule.executionPlan.steps.length)} bước thực thi đã khai
                    báo trong kế hoạch Typed IR.
                  </p>
                ) : (
                  <p>
                    Trạng thái trống: Chưa có bản đề xuất kế hoạch lọc / tra cứu / kết nối / chọn
                    bản ghi hiệu lực / tính toán / viết lại nhận xét. Vai trò AI{' '}
                    <code>rule-planner</code> chỉ sinh đề xuất nháp và cảnh báo điểm mơ hồ để con
                    người xác nhận.
                  </p>
                )}
              </div>
            )}

            {recipeStudioActiveTab === 'sources' && (
              <div className="df-empty-stage">
                <h4>Tab Nguồn dữ liệu &amp; Liên kết (Data Binding)</h4>
                {sources.length > 0 ? (
                  <ul className="df-item-list">
                    {sources.map((src) => (
                      <li key={`${src.id}-${String(src.version)}`} className="df-list-card">
                        <strong>{src.id}</strong> · {SOURCE_ARTIFACT_TYPE_LABELS_VI[src.type]} ·{' '}
                        <code>{formatHashPreview(src.sha256)}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Trạng thái trống: Chưa gắn bảng tính Excel, vùng ô, cột khóa kết nối hoặc cột
                    ngày hiệu lực. Khi nguồn có từ 2 dòng trùng ngày hiệu lực trở lên, hệ thống sẽ
                    dừng an toàn với mã lỗi <code>SOURCE_LOOKUP_AMBIGUOUS</code>.
                  </p>
                )}
              </div>
            )}

            {recipeStudioActiveTab === 'formula' && (
              <div className="df-empty-stage">
                <h4>Tab Công thức &amp; Biểu diễn trung gian có kiểu (Typed Rule IR)</h4>
                {activeRule ? (
                  <p>
                    Đầu vào khai báo: {formatNumberVi(activeRule.ioSchema.inputs.length)} biến · Đầu
                    ra khai báo: {formatNumberVi(activeRule.ioSchema.outputs.length)} biến.
                  </p>
                ) : (
                  <p>
                    Trạng thái trống: Chưa có cây biểu thức (AST) và quy tắc kiểm tra đơn vị tiền tệ
                    / số lượng. Mọi phép tính số học tiền tệ bắt buộc thực thi bằng kiểu chính xác{' '}
                    <code>Decimal</code>.
                  </p>
                )}
              </div>
            )}

            {recipeStudioActiveTab === 'tests' && (
              <div className="df-empty-stage">
                <h4>Tab Kiểm thử cô lập &amp; Truy vết nguồn gốc (Provenance)</h4>
                {activeRule && activeRule.testCases.length > 0 ? (
                  <p>
                    Quy tắc hiện có {formatNumberVi(activeRule.testCases.length)} ca kiểm thử tất
                    định đã lưu.
                  </p>
                ) : (
                  <p>
                    Trạng thái trống: Chưa có tập ca kiểm thử biên (thiếu dòng, trùng ngày hiệu lực,
                    chia cho 0, kiểm tra làm tròn) và bằng chứng dòng Excel đối chiếu.
                  </p>
                )}
              </div>
            )}

            {recipeStudioActiveTab === 'relationships' && (
              <div className="df-empty-stage">
                <h4>Tab Quan hệ Thượng nguồn &amp; Hạ nguồn (Upstream / Downstream)</h4>
                {relatedEdges.length > 0 ? (
                  <ul className="df-item-list">
                    {relatedEdges.map((edge) => (
                      <li key={edge.id} className="df-list-card">
                        <code>{edge.fromId}</code> →{' '}
                        <span className="df-badge df-badge-info">
                          {DEPENDENCY_EDGE_TYPE_LABELS_VI[edge.type]}
                        </span>{' '}
                        → <code>{edge.toId}</code>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p>
                    Trạng thái trống: Chưa có cạnh phụ thuộc nào liên kết quy tắc đang chọn với các{' '}
                    <strong>Logical Section</strong> hoặc <strong>Saved Rule</strong> khác. Hệ thống
                    sẽ kiểm tra chống chu trình (<code>DEPENDENCY_CYCLE_DETECTED</code>) ngay khi lưu
                    quy tắc.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
