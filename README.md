# DocFlow Studio

**DocFlow Studio** là ứng dụng desktop biên tập tài liệu nghiệp vụ theo quy tắc và dữ liệu có kiểm soát (**Controlled Document Workflow Studio**), được thiết kế theo triết lý **offline-first**, bảo toàn tuyệt đối tài liệu mẫu gốc và truy vết đầy đủ nguồn gốc số liệu.

---

## 1. Tổng quan sản phẩm

Trong thực tế doanh nghiệp, các tài liệu phức tạp như báo cáo nghiên cứu khả thi, thuyết minh dự án, hồ sơ thẩm định hay báo cáo tài chính thường dùng một tài liệu `.docx` đã chuẩn hóa bố cục làm **mẫu gốc (`Template V0`)**, trong khi số liệu và nội dung nhận xét ở nhiều phần phụ thuộc lẫn nhau và trích xuất từ bảng tính Excel hoặc tài liệu tham chiếu.

DocFlow Studio giải quyết bài toán cập nhật tài liệu nhiều vòng mà không làm hỏng định dạng gốc hay sai lệch số liệu dây chuyền thông qua 6 nguyên tắc cốt lõi:

1. **Mẫu gốc bất biến (`Immutable Template V0`) & Nguồn bất biến (`Source Snapshot`):** Mọi file mẫu `.docx` và file nguồn (`.xlsx`, `.docx`, `.pdf`) khi đưa vào dự án đều được khóa cứng bằng mã băm `sha256` ở chế độ chỉ đọc. Hệ thống luôn tạo bản sao từ `Template V0` rồi mới áp các bản vá OOXML đã duyệt.
2. **Định vị theo đơn vị nghiệp vụ (`Logical Section != Page`):** Tài liệu được phân rã theo cây cấu trúc OOXML (`DocumentBlock` và `startAnchor`/`endAnchor`), tuyệt đối không cắt nhỏ file Word theo số trang rồi ghép lại.
3. **Quy tắc thực thi có kiểu (`Typed Rule IR`) & Provenance:** Quy tắc tính toán được biên dịch thành biểu diễn trung gian có kiểm tra kiểu/đơn vị, sử dụng số học chính xác (`Decimal`) trong môi trường sandbox tất định cục bộ — không dùng `eval()`, không chạy macro Office và không để LLM tự nhẩm tính tiền tệ.
4. **Đồ thị phụ thuộc (`DAG`) & Tính lại có mục tiêu:** Theo dõi quan hệ phụ thuộc giữa nguồn, biến số, quy tắc và phần tài liệu; lan truyền trạng thái `STALE` chính xác và hỗ trợ 3 chế độ chạy (`Selected Section`, `Affected`, `Full`) kèm bộ nhớ đệm theo `resultFingerprint`.
5. **Tách biệt `Content Diff` và `Layout Diff`:** Phân biệt rõ thay đổi số liệu/câu chữ/bảng biểu với thay đổi vị trí phân trang vật lý sau khi kết xuất toàn bộ tài liệu qua Layout Engine thật.
6. **Con người giữ quyền phê duyệt cuối cùng (`Human-Approved Revisions`):** Bản nháp tính toán hoặc đề xuất của AI không bao giờ tự động ghi đè kết quả đã duyệt hay tự xuất tài liệu khi chưa có phê duyệt tường minh của người dùng.

---

## 2. Phân biệt rõ `docs/` (Đặc tả & Prototype tham chiếu) và `app/` (Ứng dụng Production)

Kho mã nguồn duy trì ranh giới tách biệt nghiêm ngặt giữa tài sản thiết kế/tham chiếu và mã nguồn sản phẩm thực tế:

| Khu vực | Vai trò trong dự án | Bản chất kỹ thuật & Quy tắc bảo vệ |
| --- | --- | --- |
| **`docs/`** | Kho lưu trữ **Đặc tả kỹ thuật (`DOCFLOW_STUDIO_SPEC.md`)**, các tài liệu kiến trúc/quy chuẩn (`00_...` đến `10_...`), **Prototype tương tác (`DocFlow_Interactive_Mockup.html`)** và 4 ảnh chụp giao diện mẫu (`mockup_*.png`). | - Prototype HTML là bản mô phỏng giao diện đơn lẻ chạy trong RAM trình duyệt (số liệu cố định, giả lập 12/13 trang, xuất JSON minh họa — **không tạo file DOCX thật**).<br>- `DOCFLOW_STUDIO_SPEC.md`, `DocFlow_Interactive_Mockup.html` và `mockup_*.png` là **tài sản tham chiếu bất biến (chỉ đọc)**. |
| **`app/`** | Mã nguồn **Ứng dụng Desktop Production** (**Electron + React + TypeScript + Zustand + SQLite**). | - Xử lý cây OOXML thật, kho lưu trữ định danh theo nội dung `sha256`, cơ sở dữ liệu `project.sqlite` có giao dịch nguyên tử, bộ thực thi Typed Rule IR tất định, DAG Runner và kết xuất kiểm tra bố cục toàn tài liệu. |

Để xem trước bản Prototype giao diện tham chiếu trên trình duyệt:

```bash
python3 -m http.server 8000 --directory docs
# Mở http://localhost:8000/DocFlow_Interactive_Mockup.html
```

---

## 3. Kiến trúc nền tảng 4 phân lớp (`Ports & Adapters`)

Ứng dụng production trong `app/` tuân thủ kiến trúc **Ports & Adapters (Hexagonal Architecture)** gồm 4 lớp với chiều phụ thuộc một chiều hướng vào lõi nghiệp vụ:

- **`app/src/ui/` (Giao diện người dùng — Renderer Process):** 5 màn hình nghiệp vụ (*Workspace*, *Recipe Studio*, *Dependency & Runner*, *Build & Preview*, *History & Versions*) viết bằng React + Zustand, hiển thị tiếng Việt chuẩn `vi-VN`, chỉ giao tiếp qua `preload` (`contextBridge`) và kênh IPC đã xác thực, không chứa logic tính toán ngầm.
- **`app/src/core/` (Trái tim nghiệp vụ — Pure TypeScript):** Định nghĩa 17 thực thể miền, 6 máy trạng thái vòng đời độc lập, bộ kiểm tra Typed Rule IR, đồ thị phụ thuộc DAG, cổng kiểm soát chất lượng `BuildManifest` và các giao diện cổng (`ports/`). Lớp `core/` hoàn toàn độc lập, không phụ thuộc Electron, React, hệ thống tệp hay SQLite.
- **`app/src/adapters/` (Bộ chuyển đổi công cụ chuyên biệt):** Cài đặt các Port cho bộ đọc/vá OOXML (`documents/`), bộ đọc bảng tính (`spreadsheets/`), bộ trích xuất tài liệu tham chiếu (`reference-files/`), bộ kết xuất kiểm tra phân trang (`rendering/`), sandbox thực thi Rule (`execution/sandbox/`) và các Strategy Adapter tích hợp AI (`ai/agy-cli`, `claude-cli`, `codex-cli`, `api`).
- **`app/src/infra/` (Hạ tầng lưu trữ & IPC):** Quản lý `project.sqlite` (migrations, giao dịch ACID), kho tệp bất biến theo `sha256` (`filesystem/`), bộ định tuyến IPC có kiểm tra schema/quyền (`ipc/`) và nhật ký kiểm toán bất biến (`logging/`).

---

## 4. Cấu trúc thư mục dự án

```text
docflow-studio/
├── AGENTS.md                        # Quy tắc bất biến luôn bật cho các AI Agent tại gốc repo (< 24KB)
├── README.md                        # Tài liệu giới thiệu tổng quan dự án
├── .nvmrc                           # Phiên bản Node.js chuẩn của dự án
├── .editorconfig                    # Quy ước định dạng tệp đồng nhất giữa các trình soạn thảo
├── .gitignore                       # Loại trừ phụ thuộc, bản dựng, DB tạm, dữ liệu người dùng và corpus/
├── .agents/                         # Cấu hình chuẩn hóa và hàng rào an toàn cho Antigravity CLI (agy)
│   ├── hooks.json                   # Lifecycle hooks (PreToolUse, PostToolUse, SessionStart) bảo vệ đường dẫn bất biến
│   ├── skills.json                  # Khai báo danh mục kỹ năng chia sẻ qua Git cho nhóm phát triển
│   ├── mcp_config.example.json      # Mẫu cấu hình MCP Server chế độ chỉ đọc (DB_READONLY=true)
│   ├── rules/                       # Quy tắc bổ sung theo phạm vi
│   ├── scripts/                     # Script kiểm tra an toàn PreToolUse / PostToolUse
│   └── skills/                      # Bộ kỹ năng chuyên biệt tải theo cơ chế Progressive Disclosure
├── docs/                            # Đặc tả sản phẩm, tài liệu kiến trúc và Prototype tham chiếu giao diện
│   ├── DOCFLOW_STUDIO_SPEC.md       # Đặc tả kỹ thuật gốc v1.0 (Bất biến)
│   ├── DocFlow_Interactive_Mockup.html # Prototype tương tác tham chiếu UI/UX (Bất biến)
│   ├── mockup_01..04_*.png          # Ảnh chụp thiết kế tham chiếu 4 màn hình chính (Bất biến)
│   ├── 09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md
│   └── 10_QuyChuan_TichHop_AI_Va_Agy_CLI.md
└── app/                             # Ứng dụng Desktop Production (khởi tạo và phát triển theo các giai đoạn)
    └── src/
        ├── main/                    # Composition Root của tiến trình Electron Main
        ├── preload/                 # Cầu nối contextBridge an toàn sang Renderer
        ├── ui/                      # Lớp giao diện React + Zustand (vi-VN)
        ├── core/                    # Lớp miền nghiệp vụ & Ports (TypeScript thuần)
        ├── adapters/                # Lớp cài đặt OOXML, Excel, Layout Renderer, Sandbox, AI Adapters
        └── infra/                   # Lớp SQLite, kho sha256 filesystem, IPC validation & Audit Log
```

---

## 5. An toàn AI và tích hợp Antigravity CLI (`agy`)

Dự án trang bị sẵn bộ tùy biến chuẩn trong `.agents/` và `AGENTS.md` để đảm bảo cả đội ngũ Agent phát triển lẫn các AI Adapter trong sản phẩm đều tuân thủ nguyên tắc quyền tối thiểu (*Capability Scoping*):

- **Rules (`AGENTS.md` & `.agents/rules/`):** Áp đặt quy ước ngôn ngữ tiếng Việt, ranh giới kiến trúc 4 lớp và danh sách đường dẫn cấm ghi đè.
- **Skills (`.agents/skills/`):** Tối ưu ngữ cảnh theo cơ chế *Progressive Disclosure* cho kiến trúc Ports & Adapters, xử lý OOXML bất biến, biên dịch Typed Rule IR, chạy DAG tăng dần và tích hợp `agy` CLI.
- **Lifecycle Safety Hooks (`.agents/hooks.json`):** Tự động chặn cứng (`"decision": "deny"`) ở bước `PreToolUse` nếu phát hiện thao tác định ghi đè hoặc xóa `original.docx`, `template-sha256.txt`, thư mục snapshot `sources/`, `corpus/`, `docs/DOCFLOW_STUDIO_SPEC.md`, `docs/DocFlow_Interactive_Mockup.html` hoặc `docs/mockup_*.png`.
- **MCP Chỉ Đọc (`.agents/mcp_config.example.json`):** Minh họa cấu hình kết nối công cụ tra cứu cấu trúc tài liệu và bảng tính ở chế độ chỉ đọc (`DB_READONLY=true`).

---

## 6. Tài liệu tham chiếu chính

- [Đặc tả kỹ thuật DocFlow Studio (`DOCFLOW_STUDIO_SPEC.md`)](./docs/DOCFLOW_STUDIO_SPEC.md)
- [Đối chiếu đặc tả và kế hoạch xây dựng ứng dụng (`08_DoiChieu_Spec_Va_KeHoach_Xay_App.md`)](./docs/08_DoiChieu_Spec_Va_KeHoach_Xay_App.md)
- [Kiến trúc nền tảng và quy ước khởi tạo (`09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md`)](./docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md)
- [Quy chuẩn tích hợp AI và Antigravity CLI (`10_QuyChuan_TichHop_AI_Va_Agy_CLI.md`)](./docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md)
