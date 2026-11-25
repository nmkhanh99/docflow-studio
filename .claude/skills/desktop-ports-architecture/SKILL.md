---
name: desktop-ports-architecture
description: "Áp dụng kiến trúc Ports & Adapters cho ứng dụng desktop offline-first (UI, Core Domain, SQLite, Content-Addressed Storage và AI CLI Adapters); dùng khi thiết kế module, tổ chức mã nguồn và định nghĩa giao diện API/IPC."
---

## Mục đích
Định hướng cấu trúc phần mềm theo kiến trúc Ports & Adapters cho ứng dụng offline-first, bảo đảm phân tách ranh giới giữa giao diện, miền nghiệp vụ, lưu trữ bất biến và các bộ điều phối AI.

## Cấu trúc và nguyên tắc kiến trúc
1. **Phân lớp Module rõ ràng**:
   - `ui/`: Giao diện (Workspace 3 cột + Change Tray, Recipe Studio, Dependency & Runner, Build & Preview, History & Versions) chỉ gọi qua lớp dịch vụ/IPC đã kiểm tra hợp lệ, không chứa logic tính toán nghiệp vụ ngầm.
   - `core/`: Thực thể miền, máy trạng thái Revision/Approval, Rule Schema, Dependency Graph và Build Manifest — hoàn toàn độc lập với framework UI, engine DOCX cụ thể hay nhà cung cấp LLM.
   - `adapters/`: Cài đặt cụ thể theo mẫu Ports & Adapters / Strategy cho bộ đọc bảng tính, bộ parse/patch/render DOCX, bộ thực thi sandbox và các AI adapters (Claude CLI, Codex CLI, Antigravity `agy` CLI, API).
   - `infra/`: SQLite (giao dịch nguyên tử, migrations), lưu trữ file định danh theo nội dung (`sha256` content-addressed), IPC có kiểm tra quyền và nhật ký kiểm toán.
2. **Lưu trữ ngữ cảnh bền vững ngoài lịch sử chat**:
   - Mọi Recipe, Source Snapshot, Quyết định xử lý ngoại lệ của người dùng, Section Revision, Run Evidence và Build Manifest phải được lưu có cấu trúc trong SQLite và cây thư mục dự án (`template/`, `sources/`, `recipe/`, `sections/`, `runs/`, `builds/`).
   - Tuyệt đối không dựa vào lịch sử hội thoại chat của LLM làm nơi lưu trạng thái duy nhất để tái dựng tài liệu.
3. **Kiểm soát quyền của AI Adapters**:
   - Agent chỉ nhận công cụ theo đúng vai trò (ví dụ: phân tích tài liệu/nguồn chỉ đọc; đề xuất Rule/Patch qua API trung gian có kiểm duyệt), không cấp quyền cho AI tự ý ghi đè file hệ thống hay sửa dữ liệu nguồn.
