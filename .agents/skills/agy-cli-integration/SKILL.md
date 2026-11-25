---
name: agy-cli-integration
description: >-
  Cấu hình, tùy biến và tích hợp Antigravity CLI (agy) gồm .agents/rules, progressive disclosure skills,
  lifecycle safety hooks (hooks.json), MCP chỉ đọc (mcp_config.json) và Strategy Adapter trong ứng dụng.
  Đọc kỹ năng này khi cập nhật thư mục .agents/, viết hook bảo vệ đường dẫn hoặc xây dựng AI CLI Adapter.
---

# Quy chuẩn Tùy biến & Tích hợp Antigravity CLI (`agy`)

## 1. Tổ chức tùy biến trong `.agents/` và thứ tự ưu tiên
`agy` khám phá cấu hình từ thư mục hiện tại ngược lên gốc repo theo thứ tự ưu tiên: Workspace (`.agents/`, `AGENTS.md`, `GEMINI.md`) > Khai báo tường minh (`.agents/skills.json`, `.agents/plugins.json`) > Global (`~/.gemini/config/`).
- **Rules (`AGENTS.md`, `GEMINI.md`, `.agents/rules/*.md`)**: Mỗi tệp bắt buộc nhỏ hơn **24KB (`24.000` bytes)**; tệp `AGENTS.md` độc lập không dùng YAML frontmatter.
- **Skills (`.agents/skills/<skill-name>/SKILL.md`)**: Bắt buộc có YAML frontmatter `name` (chữ thường nối gạch ngang) và `description` (mô tả ngôi thứ ba: làm gì và khi nào kích hoạt). Áp dụng *progressive disclosure*: giữ `SKILL.md` súc tích, đẩy bảng tra cứu dài sang `references/`.
- **Chia sẻ qua Git (`.agents/skills.json`)**: Khai báo đường dẫn tương đối từ gốc workspace trong mảng `entries` (không bắt đầu bằng `/` hoặc `~/`). Nếu đóng gói native plugin trong `.agents/plugins/<name>/`, đặt `hooks.json` ngay tại gốc thư mục plugin.

## 2. Hợp đồng Lifecycle Safety Hooks (`.agents/hooks.json`)
Hooks chạy đồng bộ (working directory tại thư mục chứa `hooks.json`), nhận JSON trên `stdin` và trả JSON trên `stdout` với **mọi khóa ở dạng `camelCase`**:
- **`PreToolUse`** (nhóm theo `matcher` regex, ví dụ `write_file|edit_file|delete_file|run_command|call_mcp_tool`):
  - Trả về `{"decision": "deny", "reason": "..."}` ngay lập tức nếu lệnh hoặc đối số đường dẫn nhắm vào tài sản bất biến: `original.docx`, `template-sha256.txt`, `sources/`, `corpus/`, `docs/DOCFLOW_STUDIO_SPEC.md`, `docs/DocFlow_Interactive_Mockup.html`, `docs/mockup_*.png`, hoặc cố sửa `.agents/hooks.json` / `.agents/scripts/`.
  - Trả về `{"decision": "force_ask", "reason": "..."}` cho thao tác nhạy cảm (như `rm -rf`), hoặc `{"decision": "allow"}` cho thao tác hợp lệ.
- **`PostToolUse`**: Kiểm tra toàn vẹn sau khi chạy công cụ và xuất `{}` trên `stdout`.
- **`SessionStart`**: Tiêm thông điệp nhắc nhở chế độ bảo vệ qua `{"injectSteps": [{"systemMessage": {"systemMessage": "..."}}]}`.

## 3. Tích hợp MCP chỉ đọc & AI Strategy Adapter (`app/src/adapters/ai/agy-cli/`)
- **Giao thức MCP**: Chỉ dùng **Stdio** (`command`, `args`, `env`) cho kết nối cục bộ offline-first hoặc **Streamable HTTP** (`url` trỏ tới `/mcp`, không dùng `/sse` cũ). Mặc định khóa chế độ chỉ đọc (`DB_READONLY=true`, `SQLITE_OPEN_READONLY=true`). Tham khảo mẫu tại `.agents/mcp_config.example.json` và [role-capabilities.md](./references/role-capabilities.md).
- **Adapter `agy` / SDK**: Gọi tiến trình con qua `spawn` (không nối chuỗi shell `exec`) kèm timeout/abort hoặc dùng `google.antigravity.Agent` (`LocalAgentConfig` mặc định chỉ đọc), chỉ cấp đúng allowlist MCP tools theo từng vai trò trong 6 vai trò AI.
