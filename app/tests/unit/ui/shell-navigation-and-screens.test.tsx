import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import { AppShell, SCREEN_TABS, useShellStore } from '@ui/shell';

const FORBIDDEN_PROTOTYPE_ARTIFACTS = [
  '12.000',
  '15.000',
  '18.000',
  '250.000',
  '3.750.000.000',
  '3,75 tỷ',
  'Mockup-only',
  '12 trang',
  '13 trang'
];

describe('Khung giao diện 5 phân hệ tiếng Việt (AppShell & Screens §4.1–4.5)', () => {
  beforeEach(() => {
    useShellStore.getState().resetShellStore();
  });

  it('hiển thị thanh tiêu đề dự án, đủ 5 phân hệ điều hướng và mặc định mở Workspace ở trạng thái trống sạch', () => {
    expect(SCREEN_TABS.map((t) => t.key)).toEqual([
      'workspace',
      'recipe-studio',
      'dependency-runner',
      'build-preview',
      'history'
    ]);

    const html = renderToStaticMarkup(<AppShell />);

    expect(html).toContain('DocFlow Studio');
    expect(html).toContain('Chưa mở dự án nào');
    expect(html).toContain('+ Tạo dự án mới');
    expect(html).toContain('Mở dự án');

    // Kiểm tra đủ 5 nhãn điều hướng
    expect(html).toContain('Không gian làm việc');
    expect(html).toContain('Xưởng quy tắc');
    expect(html).toContain('Phụ thuộc &amp; Chạy');
    expect(html).toContain('Dựng &amp; Xem trước');
    expect(html).toContain('Lịch sử &amp; Phiên bản');

    // Kiểm tra bố cục 3 cột + Change Tray của màn 01 Workspace (§4.1)
    expect(html).toContain('Mẫu gốc bất biến (Template V0)');
    expect(html).toContain('Nguồn dữ liệu (Source Snapshot)');
    expect(html).toContain('Cây phần tài liệu (Logical Section)');
    expect(html).toContain('Toàn bộ tài liệu (Full Preview)');
    expect(html).toContain('Theo phần đang chọn (Section Preview)');
    expect(html).toContain('Khay thay đổi (Change Tray)');
    expect(html).toContain('Phê duyệt Section Revision');
  });

  it('điều hướng mượt qua cả 5 màn hình, các tab con và không chứa bất kỳ dữ liệu giả lập nào của prototype', () => {
    const store = useShellStore.getState();

    // 1. Kiểm tra chuyển từ Change Tray của Workspace sang tab Content Diff của Build & Preview
    store.setBuildDiffActiveTab('content-diff');
    store.setActiveScreen('build-preview');
    const buildContentDiffHtml = renderToStaticMarkup(<AppShell />);
    expect(buildContentDiffHtml).toContain('Hồ sơ Build Manifest');
    expect(buildContentDiffHtml).toContain('Tab Content Diff — Đối chiếu nội dung, số liệu và bảng biểu');
    expect(buildContentDiffHtml).toContain('Cổng kiểm duyệt xuất bản (Build Gate)');

    // Chuyển sang tab Layout Diff tách biệt (§4.4)
    store.setBuildDiffActiveTab('layout-diff');
    const buildLayoutDiffHtml = renderToStaticMarkup(<AppShell />);
    expect(buildLayoutDiffHtml).toContain('Tab Layout Diff — Đối chiếu vị trí phân trang vật lý');
    expect(buildLayoutDiffHtml).toContain('Dịch trang (SHIFTED)');

    // 2. Kiểm tra màn 02 Recipe Studio và 5 tab định nghĩa (§4.2)
    store.setActiveScreen('recipe-studio');
    for (const tab of [
      'ai-interpretation',
      'sources',
      'formula',
      'tests',
      'relationships'
    ] as const) {
      store.setRecipeStudioActiveTab(tab);
      const recipeHtml = renderToStaticMarkup(<AppShell />);
      expect(recipeHtml).toContain('Danh mục Saved Rule');
      expect(recipeHtml).toContain('Quy tắc tái sử dụng (Reusable Rule)');
      expect(recipeHtml).toContain('Bản vá một lần (One-time Patch)');
      for (const forbidden of FORBIDDEN_PROTOTYPE_ARTIFACTS) {
        expect(recipeHtml).not.toContain(forbidden);
      }
    }

    // 3. Kiểm tra màn 03 Dependency & Runner và 3 phạm vi chạy (§4.3)
    store.setActiveScreen('dependency-runner');
    for (const scope of ['SELECTED', 'AFFECTED', 'FULL'] as const) {
      store.setRunnerScopeMode(scope);
      const runnerHtml = renderToStaticMarkup(<AppShell />);
      expect(runnerHtml).toContain('Ba phạm vi thực thi chuẩn (§4.3)');
      expect(runnerHtml).toContain('Đồ thị phụ thuộc (Dependency Graph)');
      expect(runnerHtml).toContain('Kế hoạch thực thi trước khi chạy (Execution Plan)');
      expect(runnerHtml).toContain('Kết quả từng bước &amp; Bằng chứng (RunStep Evidence)');
      for (const forbidden of FORBIDDEN_PROTOTYPE_ARTIFACTS) {
        expect(runnerHtml).not.toContain(forbidden);
      }
    }

    // 4. Kiểm tra màn 05 History & Versions (§4.5)
    store.setActiveScreen('history');
    const historyHtml = renderToStaticMarkup(<AppShell />);
    expect(historyHtml).toContain('Nhật ký kiểm toán &amp; Lịch sử phiên bản');
    expect(historyHtml).toContain('Kho Build Snapshot');

    // 5. Kiểm tra mở khung khởi tạo dự án mới trên thanh tiêu đề
    store.setProjectDialogMode('create');
    const createDialogHtml = renderToStaticMarkup(<AppShell />);
    expect(createDialogHtml).toContain('Khởi tạo dự án DocFlow Studio mới');
    expect(createDialogHtml).toContain('Khởi tạo dự án rỗng');

    // Xác minh toàn diện không rò rỉ dữ liệu mockup trên mọi màn hình
    for (const screenTab of SCREEN_TABS) {
      store.setActiveScreen(screenTab.key);
      const rendered = renderToStaticMarkup(<AppShell />);
      for (const forbidden of FORBIDDEN_PROTOTYPE_ARTIFACTS) {
        expect(rendered, `Phát hiện chuỗi giả lập '${forbidden}' ở màn '${screenTab.key}'`).not.toContain(
          forbidden
        );
      }
    }
  });

  it('hiển thị đúng thông tin dự án thật trên thanh tiêu đề và nhật ký kiểm toán khi store đã đồng bộ phiên dự án', () => {
    useShellStore.setState({
      activeProjectSession: {
        project: {
          id: 'proj-99aabbcc',
          title: 'Hồ sơ thẩm định phương án kỹ thuật',
          status: 'ACTIVE',
          currentRecipeVersion: 2,
          createdAt: '2026-11-25T08:00:00.000Z',
          updatedAt: '2026-11-25T09:00:00.000Z'
        },
        projectDir: '/tmp/docflow-test/ho-so-tham-dinh',
        dbFilePath: '/tmp/docflow-test/ho-so-tham-dinh/project.sqlite',
        manifestPath: '/tmp/docflow-test/ho-so-tham-dinh/manifest.json',
        template: null,
        sources: [],
        sections: [
          {
            id: 'sec-tong-quan',
            parentId: null,
            title: 'Tổng quan dự án',
            order: 1,
            startAnchor: 'bk_sec01_start',
            endAnchor: 'bk_sec01_end'
          }
        ],
        changeRequests: [],
        rules: [],
        dependencyEdges: [],
        revisions: [],
        builds: []
      },
      auditHistory: [
        {
          id: 'aud-0001',
          correlationId: 'corr-0001',
          timestamp: '2026-11-25T09:00:00.000Z',
          channel: 'project.open',
          actorType: 'USER',
          actorId: 'electron-renderer',
          mutating: false,
          outcome: 'ALLOWED',
          targetEntityId: 'proj-99aabbcc'
        }
      ]
    });

    const workspaceHtml = renderToStaticMarkup(<AppShell />);
    expect(workspaceHtml).toContain('Đang hoạt động');
    expect(workspaceHtml).toContain('Hồ sơ thẩm định phương án kỹ thuật');
    expect(workspaceHtml).toContain('proj-99aabbcc');
    expect(workspaceHtml).toContain('Recipe v2');
    expect(workspaceHtml).toContain('Tổng quan dự án');
    expect(workspaceHtml).toContain('bk_sec01_start');

    useShellStore.getState().setActiveScreen('history');
    const historyHtml = renderToStaticMarkup(<AppShell />);
    expect(historyHtml).toContain('project.open');
    expect(historyHtml).toContain('Hợp lệ');
    expect(historyHtml).toContain('aud-0001');
  });
});
