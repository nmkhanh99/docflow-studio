---
name: desktop-ports-architecture
description: >-
  Áp dụng kiến trúc Ports & Adapters 4 lớp cho ứng dụng desktop offline-first DocFlow Studio
  (ui, core, adapters, infra, IPC validation, SQLite và kho sha256). Đọc kỹ năng này khi thiết kế
  module, tổ chức thư mục trong app/, định nghĩa interface Port hoặc xây dựng kênh API/IPC.
---

# Kiến trúc Ports & Adapters cho DocFlow Studio (`app/`)

## 1. Bốn phân lớp và chiều phụ thuộc bắt buộc
Chiều phụ thuộc hợp lệ duy nhất: `ui/ -> preload/ -> infra/ipc/ -> core/ports/ <- adapters/ & infra/`.

1. **`app/src/ui/` (Renderer Process — React + Zustand, `vi-VN`)**:
   - Tổ chức theo 5 màn hình: `workspace/`, `recipe-studio/`, `dependency-runner/`, `build-preview/`, `history/` và `shared/`.
   - Chạy với `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`.
   - Chỉ gọi qua `window.docflowApi` từ `preload/`; cấm import Node.js, SQLite, `adapters/` và cấm tự tính nhẩm lại số liệu nghiệp vụ.
2. **`app/src/core/` (Pure TypeScript Domain & Use Cases)**:
   - Chứa `domain/` (17 thực thể + 6 máy trạng thái), `change-requests/`, `section-revisions/`, `data-registry/`, `rules/`, `dependency-graph/`, `build-manifest/` và `ports/`.
   - **Cấm tuyệt đối** import `electron`, `react`, `zustand`, `fs`, `child_process`, `better-sqlite3` hoặc module của lớp ngoài.
3. **`app/src/adapters/` (Cài đặt công cụ chuyên biệt theo Strategy/Port)**:
   - `documents/` (OOXML parse/anchor/patch/compose), `spreadsheets/` (Excel), `reference-files/` (DOCX/PDF), `rendering/` (Layout Engine toàn tài liệu), `execution/sandbox/` (chạy Typed Rule IR tất định) và `ai/` (`agy-cli/`, `claude-cli/`, `codex-cli/`, `api/`).
   - Các adapter không gọi trực tiếp lẫn nhau; mọi điều phối phải đi qua `core/`.
4. **`app/src/infra/` (Hạ tầng lưu trữ, IPC & Kiểm toán)**:
   - `sqlite/` (migrations, giao dịch nguyên tử), `filesystem/` (kho bất biến `sha256`, `.project.lock`), `ipc/` (schema validation + capability check), `logging/` (`AuditEvent`).

## 2. Bền vững trạng thái ngoài lịch sử hội thoại
- Toàn bộ `SavedRule`, `DataBinding`, `SectionRevision`, `RunStep` và `BuildManifest` phải lưu xuống `project.sqlite` và cây thư mục dự án (`template/`, `sources/`, `recipe/`, `sections/`, `runs/`, `builds/`).
- Cấm dựa vào lịch sử chat của AI để tái dựng tài liệu.

## 3. Kiểm chứng nhanh ranh giới kiến trúc
- Kiểm tra không có câu lệnh `import` cấm trong `app/src/core/` và `app/src/ui/`.
- Đối chiếu danh mục kênh IPC, quyền `Capability` và mã lỗi `DocFlowErrorCode` tại [ipc-and-error-reference.md](./references/ipc-and-error-reference.md) hoặc `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md`.
