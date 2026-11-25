# Quy tắc kiến trúc bắt buộc cho `app/src/core/`

Thư mục `app/src/core/` là tầng miền nghiệp vụ thuần túy (Pure TypeScript Domain & Application Layer) của DocFlow Studio.

1. **Không phụ thuộc hạ tầng (Zero Infrastructure Dependency):**
   - CẤM import `electron`, `react`, `react-dom`, `zustand`, `better-sqlite3`, `fs`, `node:fs`, `path`, `node:path`, `child_process`, `node:child_process`.
   - CẤM import bất kỳ module nào từ `ui/`, `adapters/`, `infra/`, `main/` hoặc `preload/`.
2. **Giao tiếp qua Ports:**
   - Mọi thao tác I/O, lưu trữ SQLite, kho `sha256`, xử lý OOXML, kết xuất PDF/Layout, đọc Excel, thực thi Sandbox và gọi AI đều phải đi qua các interface định nghĩa tại `app/src/core/ports/`.
3. **Bất biến & Tách biệt trạng thái:**
   - Không gộp chung 6 nhóm trạng thái vòng đời (`Rule`, `DataBinding`, `Calculation`, `SectionRevision`, `DocumentBuild`, `LayoutDiff`).
   - Không dùng số chấm động thô IEEE-754 cho phép tính tiền tệ chính xác; không dùng `eval()` hay `new Function()`.
