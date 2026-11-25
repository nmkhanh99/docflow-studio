# Quy tắc chi tiết cấp Workspace cho Antigravity CLI (`agy`)

Tài liệu này bổ trợ cho `AGENTS.md` tại gốc dự án (đảm bảo tổng dung lượng < 24KB), định nghĩa các ranh giới kiểm soát bắt buộc khi làm việc trên DocFlow Studio.

## 1. Quy ước ngôn ngữ và vùng dữ liệu
- Giao diện, tài liệu, thông báo lỗi (`messageVi`) và báo cáo nghiệm thu sử dụng **tiếng Việt**.
- Định dạng số, tiền tệ và ngày giờ theo chuẩn `vi-VN`. Số học tiền tệ trong `app/src/core/` bắt buộc dùng kiểu `Decimal` chính xác, cấm dùng `number` dấu phẩy động IEEE-754 cho phép tính tài chính.

## 2. Danh mục đường dẫn bất biến (Hard-Protected Paths)
Mọi tác vụ tự động hoặc công cụ của Agent bị cấm ghi đè, sửa đổi hoặc xóa:
- `docs/DOCFLOW_STUDIO_SPEC.md`
- `docs/DocFlow_Interactive_Mockup.html`
- `docs/mockup_01_workspace.png`, `docs/mockup_02_recipe.png`, `docs/mockup_03_runner.png`, `docs/mockup_04_build.png`
- `**/template/original.docx` và `**/template/template-sha256.txt`
- `**/sources/**` (các bản chụp nguồn dữ liệu Excel/DOCX/PDF đã cố định theo `sha256`)
- `corpus/**` (tài liệu mẫu dùng đo kiểm)

## 3. Ranh giới kiến trúc Ports & Adapters (`app/src/`)
- `ui/` -> `preload/` -> `infra/ipc/` -> `core/ports/` <- `adapters/` & `infra/`.
- `core/` là TypeScript thuần, không phụ thuộc Electron, React, Zustand, SQLite, hệ thống tệp hay tiến trình hệ điều hành.
- Lưu trữ bền vững toàn bộ Recipe, Snapshots, Revisions, Runs và Build Manifests vào `project.sqlite` + kho `sha256`; không dùng lịch sử hội thoại chat làm nơi lưu trạng thái duy nhất.

## 4. Quyền tối thiểu của 6 vai trò AI (`Capability Scoping`)
- Mặc định chạy ở chế độ chỉ đọc (`read-only`).
- `Document Analyst`, `Source Analyst`, `Reviewer`: chỉ đọc cấu trúc/schema/bằng chứng, không sửa dữ liệu.
- `Rule Planner`: chỉ đề xuất `Typed Rule IR` (`DRAFT`) và chạy thử sandbox, cấm `eval()`.
- `Section Writer`: chỉ đề xuất OOXML Patch ở trạng thái `DRAFT`/`REVIEW_REQUIRED` trong đúng `sectionId` được giao từ số liệu đã tính xong; cấm tự nhẩm tính tiền tệ.
- Chỉ người dùng (`ui:user`) mới được gọi `section.approveRevision`, `build.approve` và `build.exportDocx`.
