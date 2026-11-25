# Quy tắc bắt buộc của dự án DocFlow Studio

Tài liệu này áp dụng tự động cho mọi phiên làm việc của AI Agent (Antigravity `agy` CLI, Claude CLI, Codex CLI và các subagent) trong kho mã nguồn `docflow-studio`.

## 1. Ngôn ngữ và định dạng chuẩn
- Sử dụng **tiếng Việt** rõ ràng, chuẩn thuật ngữ nghiệp vụ của dự án (`Template V0`, `Source Snapshot`, `Logical Section`, `Saved Rule`, `Typed Rule IR`, `Section Revision`, `Content Diff`, `Layout Diff`, `Build Manifest`) trong tài liệu, nhãn giao diện, thông báo lỗi người dùng và báo cáo kiểm thử.
- Định dạng hiển thị số liệu, tiền tệ và ngày tháng trên giao diện theo chuẩn vùng **`vi-VN`**.

## 2. Tài sản bất biến — CẤM GHI ĐÈ HOẶC XÓA
Tuyệt đối không chỉnh sửa, ghi đè, đổi tên hoặc xóa các tệp và thư mục sau (trừ khi có yêu cầu tường minh và phê duyệt trực tiếp từ người dùng cho riêng bản mockup):
1. **Đặc tả & Prototype tham chiếu gốc trong `docs/`:**
   - `docs/DOCFLOW_STUDIO_SPEC.md`
   - `docs/DocFlow_Interactive_Mockup.html`
   - `docs/mockup_01_workspace.png`, `docs/mockup_02_recipe.png`, `docs/mockup_03_runner.png`, `docs/mockup_04_build.png`
2. **Dữ liệu mẫu và nguồn bất biến của dự án người dùng:**
   - `**/template/original.docx` và `**/template/template-sha256.txt` (`Template V0` chỉ đọc, khóa bằng mã băm `sha256`).
   - `**/sources/**` (mọi `Source Snapshot` Excel/DOCX/PDF lưu định danh theo `sha256`, không bao giờ ghi ngược kết quả vào file nguồn).
   - `corpus/**` (tập tài liệu mẫu dùng đo kiểm kỹ thuật, chỉ đọc).
3. **Hàng rào bảo vệ Agent:**
   - Không tự ý vô hiệu hóa hoặc nới lỏng quy tắc chặn trong `.agents/hooks.json` và `.agents/scripts/`.

## 3. Ranh giới giữa `docs/` và `app/`
- `docs/DocFlow_Interactive_Mockup.html` chỉ là bản mô phỏng giao diện chạy trong bộ nhớ trình duyệt (không đọc/ghi DOCX thật). Tuyệt đối không sao chép hàm tính cố định hay cơ chế giả lập trang của prototype vào `app/`.
- `app/` là ứng dụng Desktop Production (**Electron + React + TypeScript + Zustand + SQLite**), xử lý cây OOXML thật, tính toán tất định và kết xuất bố cục toàn tài liệu.

## 4. Kiến trúc Ports & Adapters 4 phân lớp trong `app/`
Tuân thủ nghiêm ngặt chiều phụ thuộc `ui/ -> core/ <- adapters/ & infra/`:
- **`app/src/core/` (Pure TypeScript):** Chứa 17 thực thể miền, 6 máy trạng thái vòng đời tách biệt, kiểm tra Typed Rule IR, đồ thị phụ thuộc DAG, cổng kiểm duyệt `BuildManifest` và các interface `ports/`. **CẤM import** `electron`, `react`, `zustand`, `fs`, `path` phụ thuộc OS, `child_process`, `better-sqlite3` hoặc bất kỳ module nào từ `ui/`, `adapters/`, `infra/`, `main/`, `preload/`.
- **`app/src/ui/` (Renderer Process):** Bật `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`. Chỉ giao tiếp với Main qua `preload` (`contextBridge`) và kênh IPC có kiểm tra schema; không tự tính nhẩm lại kết quả nghiệp vụ hay tự suy diễn trạng thái `STALE`.
- **`app/src/adapters/` & `app/src/infra/`:** Cài đặt các interface trong `core/ports/`. Các adapter không gọi chéo nhau trực tiếp để vượt qua kiểm soát của `core/`.

## 5. Nguyên tắc xử lý DOCX, Rule Engine, DAG và Phân quyền AI
1. **Áp OOXML Patch không cắt trang (`Section != Page`):** Cấm cắt nhỏ file DOCX theo trang rồi ghép lại. Luôn clone `Template V0` sang bản làm việc rồi áp tập lệnh Patch nguyên tử theo `blockId` / `LogicalSection` anchor, bảo toàn `rPr`, `pPr`, `tblPr`.
2. **Typed Rule IR & Sandbox tất định:** Cấm dùng `eval()`, `new Function()` hoặc chạy macro Office. Số học tiền tệ bắt buộc dùng kiểu chính xác `Decimal` (không dùng số chấm động IEEE-754 thô). Khi nguồn thiếu hoặc trùng bản ghi cùng ngày hiệu lực (`SOURCE_LOOKUP_AMBIGUOUS`), phải dừng an toàn và báo rõ tọa độ nguồn.
3. **DAG & Tách biệt trạng thái:** Không gộp chung trạng thái tính toán (`STALE`/`RESULT_READY`), phê duyệt nội dung (`REVIEW_REQUIRED`/`APPROVED`) và khác biệt bố cục (`SHIFTED`/`OVERFLOW`). Chỉ cho phép xuất DOCX chính thức qua `Build Gate` khi không còn phần bắt buộc `STALE` và mọi Revision trong `BuildManifest` đã được người dùng `APPROVED`.
4. **Giới hạn quyền của AI (`Capability Scoping`):** AI chỉ diễn giải yêu cầu sang đề xuất Typed Rule IR, gợi ý ánh xạ nguồn có provenance và soạn thảo câu chữ nhận xét từ con số đã được Sandbox tính xong. AI **cấm tự nhẩm tính tiền**, **cấm tự gọi lệnh duyệt Revision/Build** và **cấm tự xuất DOCX**.
