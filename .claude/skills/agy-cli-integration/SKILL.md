---
name: agy-cli-integration
description: "Cấu hình, tùy biến và tích hợp Antigravity CLI (agy) gồm .agents/skills, rules (AGENTS.md/GEMINI.md), safety hooks (hooks.json), MCP (mcp_config.json) và chế độ SDK/adapter; dùng khi làm việc với agy CLI hoặc xây dựng AI CLI adapter."
---

## Mục đích
Chuẩn hóa cách cấu hình, tùy biến và tích hợp **Antigravity CLI (`agy`)** trong quy trình phát triển của nhóm cũng như khi xây dựng AI CLI Adapter gọi `agy` theo kiến trúc sản phẩm.

## 1. Cấu trúc tùy biến trong Workspace (`.agents/`)
Antigravity CLI tự động khám phá cấu hình từ thư mục hiện tại ngược lên gốc dự án theo thứ tự ưu tiên: Workspace (`.agents/`) > Khai báo tường minh (`skills.json`, `plugins.json`) > Global (`~/.gemini/config/`).
- **Rules (`AGENTS.md`, `GEMINI.md`, `.agents/rules/*.md`)**: Viết ngắn gọn dưới giới hạn 24KB/file để áp đặt quy ước cố định theo thư mục (như cấm ghi đè template/ảnh tham chiếu, chuẩn ngôn ngữ tiếng Việt).
- **Skills (`.agents/skills/<ten-skill>/SKILL.md`)**: Bắt buộc có YAML frontmatter `name` (chữ thường nối gạch ngang) và `description` (nêu rõ làm gì và khi nào kích hoạt). Giữ `SKILL.md` súc tích theo nguyên lý *progressive disclosure*, tách tài liệu dài sang `references/` và script hỗ trợ sang `scripts/`.
- **Chia sẻ nhóm qua Git**: Đặt cấu hình chung trong repo và khai báo đường dẫn tương đối trong `.agents/skills.json` hoặc đóng gói thành plugin trong `.agents/plugins/<ten>/plugin.json` (lưu ý `hooks.json` của native plugin phải đặt ngay tại gốc thư mục plugin).

## 2. Kiểm soát an toàn bằng Lifecycle Hooks (`.agents/hooks.json`)
Dùng command hooks nhận/trả JSON (khóa `camelCase` trên `stdin`/`stdout`) để cưỡng chế các nguyên tắc bất biến:
- **`PreToolUse`** (matcher `run_command`, `edit_file`, `write_file`...): Kiểm tra đối số lệnh/đường dẫn; trả về `{"decision": "deny", "reason": "..."}` nếu agent định ghi đè file mẫu `original.docx`, snapshot nguồn `sources/` hoặc ảnh tham chiếu `mockup_*.png`; dùng `"ask"` / `"force_ask"` cho thao tác nhạy cảm.
- **`PostToolUse`**: Tự động chạy kiểm tra định dạng, schema JSON của Rule/Manifest hoặc kiểm tra mã băm sau khi công cụ hoàn tất (trả về `{}`).
- **`SessionStart` / `PreInvocation`**: Tiêm ngữ cảnh trạng thái dự án hiện tại thông qua `injectSteps` (`systemMessage`).

## 3. Tích hợp Công cụ qua MCP và Điều phối (`agy` CLI / SDK)
- **MCP (`mcp_config.json`)**: Kết nối công cụ cục bộ qua giao thức **Stdio** (`command`, `args`, `env` như `DB_READONLY=true`) hoặc dịch vụ qua **Streamable HTTP** (`url` trỏ tới endpoint `/mcp`, không dùng SSE cũ) để cung cấp các tool đọc cấu trúc DOCX/Excel và ghi Patch/Proposal có kiểm soát.
- **Vận hành & Adapter `agy`**: Cấu hình máy trạm tại `~/.gemini/antigravity-cli/settings.json`. Khi tích hợp `agy` hoặc Antigravity Python SDK (`google.antigravity.Agent` với `LocalAgentConfig`) làm AI Adapter trong ứng dụng, mặc định khởi chạy ở chế độ chỉ đọc (read-only sandbox) và chỉ bật `CapabilitiesConfig` hoặc MCP tools tối thiểu theo từng vai trò (Document Analyst, Source Analyst, Rule Planner, Section Writer, Reviewer).
