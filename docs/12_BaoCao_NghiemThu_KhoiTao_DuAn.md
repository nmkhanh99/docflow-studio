# 12 — Báo cáo Nghiệm thu Độc lập Giai đoạn Khởi tạo Dự án DocFlow Studio

**Ngày nghiệm thu:** 25/11/2026  
**Vai trò thực hiện:** QA — Kiểm thử độc lập (`task-dbf8a7ff`, Bước 7/7 của nhóm công việc khởi tạo)  
**Môi trường thực thi thực tế:** macOS · Node.js `v24.21.0` (khớp `.nvmrc`: `24`) · npm `11.19.0` · Vitest `3.2.7` · Electron-Vite `3.0.0` (Vite `6.4.6`)  
**Tài liệu chuẩn đối chiếu:** `docs/DOCFLOW_STUDIO_SPEC.md` (v1.0), `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md`, `docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md`, `docs/11_HuongDan_CaiDat_Va_PhatTrien_Base.md`, `README.md`, `AGENTS.md`.

---

## 1. Kết luận tổng quan nghiệm thu

| Hạng mục kiểm định độc lập | Kết quả | Tóm tắt bằng chứng chính |
| --- | :---: | --- |
| **1. Tính toàn vẹn tài sản gốc & Đối chiếu tài liệu (`docs/`, `README.md`)** | **ĐẠT (PASS)** | 100% mã băm `SHA-256` của `DOCFLOW_STUDIO_SPEC.md`, `DocFlow_Interactive_Mockup.html` và 4 ảnh `mockup_01..04_*.png` giữ nguyên tuyệt đối không đổi. Tài liệu `README.md`, `09_...`, `10_...`, `11_...` nhất quán 100% với đặc tả gốc. |
| **2. Ranh giới kiến trúc Ports & Adapters 4 lớp (`app/src/`)** | **ĐẠT (PASS)** | Quét tĩnh độc lập trên toàn bộ cây `app/src/core/` (25 tệp), `app/src/ui/` (13 tệp) và `app/src/adapters/`: 0 câu lệnh import cấm, 0 `eval()`/`new Function()` thực thi động, 0 gọi chéo giữa các adapter chuyên biệt. |
| **3. Bảo mật Electron, IPC Validation & Capability Scoping** | **ĐẠT (PASS)** | `BrowserWindow` khóa cứng `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false`, `webviewTag: false`, CSP chặt không `unsafe-eval`. `registerElectronIpcBridge` gán cứng `USER` ở phía Main (chống giả mạo `actor` từ Renderer). 29 kênh IPC có schema `zod` `.strict()`, chống Path Traversal (`..`), khóa cứng 3 kênh duyệt/xuất chỉ cho con người (`CAPABILITY_DENIED` với cả 6 vai trò AI). |
| **4. Hạ tầng SQLite, Kho `sha256` bất biến & Khóa `.project.lock`** | **ĐẠT (PASS)** | SQLite migrations nguyên tử/lũy đẳng trên `node:sqlite`, 18 bảng miền + triggers chống sửa/xóa `template_artifacts` và `audit_events`. Kiểm thử QA xác nhận phát hiện 100% hành vi đảo bit 1 byte trên `original.docx`, sửa/xóa `template-sha256.txt` hoặc sửa `Source Snapshot` (`ARTIFACT_INTEGRITY_VIOLATION`), đồng thời xử lý đúng đua tranh 5 yêu cầu `.project.lock` song song (`PROJECT_LOCKED`). |
| **5. Khung giao diện Base UI Shell 5 phân hệ (`vi-VN`)** | **ĐẠT (PASS)** | Đủ 5 phân hệ chuẩn Spec §4.1–4.5, bảng nhãn cho 6 nhóm trạng thái tách biệt (§3.1) và 22 mã lỗi miền, bộ định dạng `DecimalString` chuẩn `vi-VN` không qua số chấm động IEEE-754, 0 rò rỉ dữ liệu giả lập của Prototype HTML sang `app/`. |
| **6. Hàng rào an toàn Antigravity CLI (`.agents/` & `AGENTS.md`)** | **ĐẠT (PASS)** | Các tệp Rules đều `< 24.000` bytes (`AGENTS.md`: `5.079` bytes; `core/AGENTS.md`: `1.045` bytes; `project-rules.md`: `2.486` bytes). 9/9 `SKILL.md` chuẩn YAML frontmatter (`name`, `description`) và *progressive disclosure*. Thực thi trực tiếp `.agents/hooks.json` (`PreToolUse`): chặn `decision: "deny"` 100% (14/14 ca ghi đè/xóa tài sản bất biến & vượt quyền vai trò AI), trả `force_ask` cho `rm -rf`, và `allow` cho chỉnh sửa hợp lệ trong `app/src/`. |
| **7. Chuỗi lệnh kiểm tra tự động & Đóng gói (`typecheck`, `lint`, `test`, `build`)** | **ĐẠT (PASS)** | Cả 4 lệnh chạy độc lập thoát với mã `0`: **16 bộ kiểm thử / 54 ca kiểm thử đạt 100%** (bao gồm **3 bộ test độc lập mới của QA tại `app/tests/qa/`**), đóng gói thành công `out/main/index.js`, `out/preload/index.js` và `out/renderer/`. |

> **Phán quyết chung của QA cho Giai đoạn Khởi tạo (Tasks 1/7 → 7/7): ĐẠT NGHIỆM THU (`PASS`)** — Không có lỗi chặn (blocker); nền tảng dự án đủ điều kiện an toàn và vững chắc để chuyển sang triển khai nghiệp vụ chuyên sâu ở các giai đoạn tiếp theo (Phase 0–4 theo Roadmap §13).

---

## 2. Kiểm tra Tài liệu & Tính toàn vẹn Tài sản Tham chiếu Gốc

### 2.1. Xác minh mã băm `SHA-256` của các tài sản bất biến trong `docs/`

**Lệnh tái hiện:**
```bash
shasum -a 256 docs/DOCFLOW_STUDIO_SPEC.md docs/DocFlow_Interactive_Mockup.html docs/mockup_*.png
```

**Kỳ vọng vs. Thực tế:**

| Tệp tài sản gốc chỉ đọc | Kích thước (bytes) | Mã băm `SHA-256` thực tế đo độc lập | Đối chiếu với mốc gốc ban đầu | Kết luận |
| --- | ---: | --- | --- | :---: |
| `docs/DOCFLOW_STUDIO_SPEC.md` | `36.250` | `ec920f874704929d6d7e64598621c4da75be40f25f1ebd58aa5ee6a1f6a5dd7b` | Khớp 100% | **ĐẠT** |
| `docs/DocFlow_Interactive_Mockup.html` | `63.795` | `75f344c9e7161c8f8fb34aa765a36c527fcb36ce8ffdd61b17bb890eeb3debf9` | Khớp 100% | **ĐẠT** |
| `docs/mockup_01_workspace.png` | `1.754.206` | `80aa2fd52159c29423767ab95e3626f5773fe3a11b31eeb46a2822dac3d52831` | Khớp 100% | **ĐẠT** |
| `docs/mockup_02_recipe.png` | `1.838.453` | `9034c77d00d3f54030c8a781a5510db2b5a57b3a2d408578cd981a7843dfc36d` | Khớp 100% | **ĐẠT** |
| `docs/mockup_03_runner.png` | `1.700.607` | `4382594dd6203c9a314baa96bc93ab92b7cef57bda557a3d41c6afa2e3886efc` | Khớp 100% | **ĐẠT** |
| `docs/mockup_04_build.png` | `1.483.275` | `e5ac305b1439b2f252e419941062c71f999e8ea9ba822b3c5ef6b3ba3dfa0381` | Khớp 100% | **ĐẠT** |

*(Lưu ý kiểm chứng trung thực: Do ở giai đoạn khởi tạo nền tảng chưa tích hợp engine kết xuất bố cục Word/LibreOffice thực tế cho các tệp DOCX phức tạp, QA tuyệt đối không khẳng định độ chính xác phân trang Word thật; mọi thông số `12/13 trang` trong `DocFlow_Interactive_Mockup.html` được phân định rõ chỉ là hằng số minh họa giao diện).*

### 2.2. Đối chiếu hệ thống tài liệu khởi tạo với `docs/DOCFLOW_STUDIO_SPEC.md`

| Tài liệu được rà soát | Nội dung kỳ vọng theo `DOCFLOW_STUDIO_SPEC.md` | Kết quả đối chiếu thực tế | Kết luận |
| --- | --- | --- | :---: |
| `README.md` | Giới thiệu đúng định vị sản phẩm bằng tiếng Việt, 6 nguyên tắc cốt lõi (§1.2), kiến trúc Ports & Adapters 4 lớp (§9.3), phân tách ranh giới `docs/` (Prototype trong RAM, không tạo DOCX thật) và `app/` (Desktop Production). | Khớp đầy đủ; có hướng dẫn mở Prototype tham chiếu riêng và mô tả rõ cây thư mục dự án cùng hàng rào `.agents/`. | **ĐẠT** |
| `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md` | Cụ thể hóa quyết định khởi tạo (§15), kiến trúc 4 lớp (§9.1–9.3), cấu trúc thư mục dự án (§5.3), 6 nhóm trạng thái tách biệt (§3.1–3.2), đủ 17 thực thể miền (§5), danh mục API/IPC kèm validation, capability scoping và mã lỗi (§9.4). | Đối chiếu khớp 100% toàn bộ 17 thực thể, 6 nhóm trạng thái vòng đời, 28+1 kênh IPC và bảng mã lỗi `DocFlowErrorCode`; đánh dấu rõ ràng các điểm `[QS]`, `[ĐX]`, `[MỞ]`. | **ĐẠT** |
| `docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md` | Cụ thể hóa phân quyền tối thiểu cho 6 vai trò AI (§10), không lưu trạng thái duy nhất trong lịch sử chat (§11), Strategy Adapter cho `agy` CLI / Claude CLI / Codex CLI / API (§9.2), quy chuẩn `.agents/` (`< 24KB` rules, progressive disclosure skills, `camelCase` safety hooks, MCP chỉ đọc). | Đầy đủ ma trận Read/Proposal/Hard-Deny cho cả 6 vai trò AI, hợp đồng JSON `camelCase` cho `SessionStart`/`PreToolUse`/`PostToolUse` và cấu hình MCP Stdio chỉ đọc (`DB_READONLY=true`, không dùng `/sse` cũ). | **ĐẠT** |
| `docs/11_HuongDan_CaiDat_Va_PhatTrien_Base.md` | Hướng dẫn yêu cầu môi trường khớp thực tế mã nguồn (`.nvmrc`, `app/package.json`), quy trình mở rộng Port/Adapter/IPC và cách kiểm chứng trực tiếp safety hooks. | Khớp chính xác 100% cả 7 scripts trong `app/package.json` (`dev`, `build`, `preview`, `typecheck`, `lint`, `test`, `test:watch`), yêu cầu Node.js `>= 24.x` cho `node:sqlite`, quy tắc tạo thư mục dự án ngoài repo và 5 lệnh kiểm chứng `.agents/scripts/`. | **ĐẠT** |

---

## 3. Kiểm tra Kiến trúc, Bảo mật, Hạ tầng & Bộ Kiểm thử Tự động (`app/`)

### 3.1. Quét độc lập Ranh giới Kiến trúc 4 phân lớp (`Ports & Adapters`)

- **Bước tái hiện:** Thực thi ESLint (`npm --prefix app run lint`) kết hợp bài quét tĩnh độc lập của QA (`app/tests/qa/architecture-security-and-build-gate.qa.test.ts` — Mục 1) sau khi loại bỏ chú thích để kiểm tra câu lệnh `import` / `require` / dynamic `import()` thực tế.
- **Kỳ vọng:**
  1. `app/src/core/**` hoàn toàn tinh khiết (Pure TypeScript): không import `electron`, `react`, `react-dom`, `zustand`, `better-sqlite3`, `fs`, `path`, `child_process`, `node:*` hoặc module từ `ui/`, `adapters/`, `infra/`, `main/`, `preload/`; không chứa `eval()` hay `new Function()`.
  2. `app/src/ui/**` không import trực tiếp `electron`, Node.js `fs`/`child_process`, SQLite, `adapters/` hay `infra/`.
  3. Các thư mục con trong `app/src/adapters/` (`documents`, `rendering`, `spreadsheets`, `reference-files`, `execution`, `ai`) không gọi chéo nhau trực tiếp.
- **Thực tế:** Quét toàn bộ **25 tệp** trong `app/src/core/`, **13 tệp** trong `app/src/ui/` và toàn bộ các module trong `app/src/adapters/`: **0 vi phạm**. `eslint.config.mjs` cấu hình tường minh `no-restricted-imports` cho cả `src/core/**/*.ts` và `src/ui/**/*.{ts,tsx}`. → **ĐẠT**.

### 3.2. Kiểm tra Cấu hình Bảo mật Tiến trình Electron & Biên IPC

- **Bước tái hiện:** Rà soát trực tiếp `app/src/main/security.ts`, `app/src/main/index.ts`, `app/src/main/ipc-bridge.ts`, `app/src/preload/index.ts`, `app/src/infra/ipc/dispatcher.ts`, `app/src/infra/ipc/schemas.ts` và chạy kiểm thử tấn công giả lập trong `architecture-security-and-build-gate.qa.test.ts` (Mục 2 & 3).
- **Kỳ vọng:**
  - `contextIsolation: true`, `sandbox: true`, `nodeIntegration: false` (kể cả trong Worker và SubFrames), `webSecurity: true`, `webviewTag: false`.
  - CSP khóa `default-src 'self'`, `script-src 'self'`, `object-src 'none'`, `frame-ancestors 'none'`, không có `unsafe-eval`; chặn `will-navigate` và `setWindowOpenHandler` ra URL bên ngoài.
  - `preload` đóng băng sâu `window.docflowApi` bằng `Object.freeze`, không lộ `ipcRenderer` thô.
  - Mọi kênh IPC kiểm tra allowlist, phân quyền `Capability`, schema `zod` `.strict()`, chống Path Traversal (`..`), chặn ghi đè đường dẫn bất biến và tự động ghi `AuditEvent`.
- **Thực tế:**
  - Cấu hình `createSecureBrowserWindowOptions` và `DOCFLOW_CONTENT_SECURITY_POLICY` đáp ứng đầy đủ 100% tiêu chuẩn bảo mật. *(Ghi chú nhỏ không chặn: thẻ `<meta http-equiv="Content-Security-Policy">` trong `app/src/ui/index.html` có `'unsafe-inline'` cho Vite HMR lúc dev, nhưng khi chạy bản dựng production Electron, `installContentSecurityPolicy` trong `app/src/main/index.ts` tiêm thêm header `DOCFLOW_CONTENT_SECURITY_POLICY` với `script-src 'self'`, và theo chuẩn trình duyệt nhiều chính sách CSP đồng thời sẽ áp giao — tức khóa chặt `script-src 'self'`).*
  - Khi QA bơm gói tin IPC giả mạo trường `actor: { actorType: 'AI_AGENT', actorId: 'spoofed-root-actor', capabilities: ['ui:user'] }` qua `registerElectronIpcBridge`, tiến trình Main bỏ qua hoàn toàn trường `actor` từ Renderer và gán cứng `createUserActorContext('electron-renderer')`.
  - Khi thử cả **6 vai trò AI** (`main-orchestrator`, `document-analyst`, `source-analyst`, `rule-planner`, `section-writer`, `reviewer`) gọi `section.approveRevision`, `build.approve`, `build.exportDocx`: bị từ chối 100% với mã lỗi `CAPABILITY_DENIED` và lưu nhật ký `outcome: 'DENIED'`.
  - Kênh lạ `shell.execArbitrary` trả `IPC_INVALID_CHANNEL`; đường dẫn `/tmp/projects/../../../etc` trả `IPC_VALIDATION_FAILED`. → **ĐẠT**.

### 3.3. Kiểm thử Độc lập của QA cho các Ca biên (`app/tests/qa/`)

QA đã viết bổ sung **3 tệp kiểm thử độc lập mới** tại `app/tests/qa/` (tổng cộng **8 bài kiểm thử chuyên sâu** mới, nâng tổng số toàn dự án lên **16 tệp / 54 bài kiểm thử**):

1. **[architecture-security-and-build-gate.qa.test.ts](../app/tests/qa/architecture-security-and-build-gate.qa.test.ts)** *(4 bài test)*:
   - Quét tĩnh ranh giới kiến trúc `core/`, `ui/`, `adapters/` và cấm `eval()`/`new Function()`.
   - Kiểm chứng bảo mật `BrowserWindow`, CSP header, chặn điều hướng ngoài và chống giả mạo `ActorContext` qua biên IPC.
   - Kiểm thử vét cạn **14 cặp chuyển trạng thái bất hợp lệ** trên `DocumentBuild` (`BLOCKED -> APPROVED`, `LAYOUT_REVIEW -> EXPORTED`, `EXPORTED -> BUILDING`... → `INVALID_STATE_TRANSITION`), chuyển sang `APPROVED` thiếu `gate` (`DOMAIN_INVARIANT_VIOLATION`), `SectionRevision` cũ đã duyệt nhưng lệch `expectedInputFingerprint` (`BUILD_BLOCKED_UNAPPROVED_REVISIONS`), vi phạm `STRICT_LAYOUT` kèm `overrideReason` quá ngắn `< 5` ký tự hoặc khi `allowHumanOverrideWithReason: false` (`BUILD_BLOCKED_LAYOUT_GATE`), và kiểm tra phép tính `ExactDecimal` (`15.000 × 250.000 = 3.750.000.000`; chi phí `65% = 2.437.500.000`; lợi nhuận `= 1.312.500.000`; `0.1 + 0.2 = 0.3`).
   - Kiểm chứng tự động mã băm `SHA-256` của cả 6 tệp tài sản bất biến trong `docs/`.
2. **[artifact-tampering-and-concurrency.qa.test.ts](../app/tests/qa/artifact-tampering-and-concurrency.qa.test.ts)** *(2 bài test)*:
   - Clone liên tiếp **10 bản làm việc** từ `Template V0` và ghi dữ liệu mới lên bản clone → xác nhận mã băm `SHA-256` của `template/original.docx` không đổi 100%.
   - Giả mạo ngoài ứng dụng ở **4 ca biên**: (a) đảo bit 1 byte giữa thân `template/original.docx`, (b) sửa lệch `template/template-sha256.txt`, (c) xóa `template/template-sha256.txt`, (d) sửa 1 byte trong `sources/bang-gia/<sha256>/source.csv` → cả 4 ca đều bị `ProjectWorkspaceManager.openProject` chặn ngay với `ARTIFACT_INTEGRITY_VIOLATION` và **tự động giải phóng sạch `.project.lock`** (không để kẹt khóa mồ côi).
   - Đua tranh bất đồng bộ **5 lời gọi `acquireProjectLock` đồng thời (`Promise.allSettled`)** trên cùng thư mục dự án → đúng **1 phiên giành được khóa**, **4 phiên còn lại bị từ chối với `PROJECT_LOCKED`**; kiểm tra chặn khóa từ PID ngoại lai đang hoạt động và tự động nhả khóa dự án A khi chuyển phiên sang dự án B qua `ProjectSessionCoordinator`.
3. **[agy-cli-safety-hooks.qa.test.ts](../app/tests/qa/agy-cli-safety-hooks.qa.test.ts)** *(2 bài test)*:
   - Kiểm tra tự động dung lượng `< 24KB` của các tệp Rules, chuẩn không frontmatter của `AGENTS.md`, đường dẫn tương đối của `.agents/skills.json`, chuẩn YAML frontmatter của toàn bộ 9 `SKILL.md` và cờ `DB_READONLY=true` trong `.agents/mcp_config.example.json`.
   - Khởi chạy tiến trình thực tế `.agents/scripts/guard-immutable-paths.mjs`, `session-context.mjs`, `verify-post-tool-integrity.mjs` với 18 kịch bản đầu vào JSON `camelCase`.

### 3.4. Bằng chứng thực thi độc lập chuỗi lệnh `typecheck / lint / test / build`

**Lệnh tái hiện:**
```bash
cd app && npm run typecheck && npm run lint && npm test && npm run build
```

**Kết quả thực tế (Exit code: `0`):**
- `npm run typecheck` (`tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json`): **0 lỗi kiểu dữ liệu**.
- `npm run lint` (`eslint .`): **0 lỗi, 0 cảnh báo**.
- `npm test` (`vitest run`): **16/16 Test Files passed · 54/54 Tests passed** (`~3.13s`).
- `npm run build` (`electron-vite build`): Đóng gói thành công cả 3 phân hệ:
  - `out/main/index.js` (`176.47 kB`)
  - `out/preload/index.js` (`3.34 kB`)
  - `out/renderer/index.html` (`0.74 kB`), `index-*.css` (`13.55 kB`), `index-*.js` (`738.96 kB`).

---

## 4. Kiểm chứng Rào chắn An toàn Antigravity CLI (`.agents/`)

### 4.1. Kiểm tra cấu trúc Rules, Skills và MCP mẫu

| Tệp / Thư mục cấu hình | Tiêu chuẩn quy định (`docs/10_...` §4 & §6) | Kết quả đo thực tế | Đánh giá |
| --- | --- | --- | :---: |
| `AGENTS.md` | `< 24.000` bytes, không dùng YAML frontmatter | `5.079` bytes, không có frontmatter | **ĐẠT** |
| `app/src/core/AGENTS.md` | `< 24.000` bytes, không dùng YAML frontmatter | `1.045` bytes, không có frontmatter | **ĐẠT** |
| `.agents/rules/project-rules.md` | `< 24.000` bytes | `2.486` bytes | **ĐẠT** |
| `.agents/skills.json` | Khai báo đường dẫn tương đối (không bắt đầu bằng `/` hoặc `~/`) | `entries: [{ "path": ".agents/skills" }]` | **ĐẠT** |
| `.agents/skills/*/SKILL.md` (9 skills) | Có YAML frontmatter `name` (chữ thường gạch ngang khớp tên thư mục), `description` rõ ràng, gọn dưới 150 dòng (*progressive disclosure* tách sang `references/`) | Cả 9 skills (`desktop-ports-architecture`, `immutable-docx-patching`, `typed-rule-and-provenance`, `dag-incremental-runner`, `agy-cli-integration`, `task-breakdown`, `prototype-conventions`, `dependency-and-approval-contract`, `prototype-browser-verification`) đều hợp lệ (dài 6–33 dòng, có `references/` cho IPC/Error và Role Capabilities) | **ĐẠT** |
| `.agents/mcp_config.example.json` | Dùng giao thức Stdio, khóa cứng chế độ chỉ đọc | `DB_READONLY="true"`, `SQLITE_OPEN_READONLY="true"`, `DISABLE_OFFICE_MACROS="true"`, `ALLOW_EXTERNAL_NETWORK="false"` | **ĐẠT** |

### 4.2. Kết quả kiểm thử thực tế trên `.agents/hooks.json` (`PreToolUse`, `PostToolUse`, `SessionStart`)

*(Ghi chú thực tế trong phiên làm việc: Bản thân phiên Antigravity CLI của QA cũng đang chạy dưới sự giám sát trực tiếp của `.agents/hooks.json` — thông điệp `SessionStart` đã tự động tiêm vào đầu phiên và `PreToolUse` đã thực sự chặn ngay tại chỗ khi một lệnh shell thử nghiệm chứa chuỗi chạm mẫu đường dẫn bảo vệ).*

Bảng kết quả bơm payload JSON `camelCase` trực tiếp vào `.agents/scripts/guard-immutable-paths.mjs` (chạy tại thư mục làm việc `.agents/` đúng như cơ chế của `agy` CLI):

| Mã ca | Kịch bản công cụ / Lệnh kiểm thử | Kỳ vọng | Thực tế (`stdout`) | Kết luận |
| --- | --- | :---: | --- | :---: |
| **H-01** | `write_file` ghi đè `/tmp/proj/template/original.docx` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Tệp mẫu gốc 'original.docx' (Template V0) là bất biến..."}` | **ĐẠT** |
| **H-02** | `edit_file` sửa `/tmp/proj/template/template-sha256.txt` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Tệp mẫu gốc 'template-sha256.txt' (Template V0) là bất biến..."}` | **ĐẠT** |
| **H-03** | `delete_file` xóa snapshot trong `sources/excel-1/<sha256>/source.xlsx` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Thư mục Source Snapshot (sources/) là kho dữ liệu bất biến..."}` | **ĐẠT** |
| **H-04** | `write_file` ghi vào `corpus/mau-kiem-thu-01.docx` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Thư mục tài liệu mẫu kiểm thử (corpus/) ở chế độ chỉ đọc..."}` | **ĐẠT** |
| **H-05** | `edit_file` sửa `docs/DOCFLOW_STUDIO_SPEC.md` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Tài liệu đặc tả gốc docs/DOCFLOW_STUDIO_SPEC.md là bất biến (chỉ đọc)."}` | **ĐẠT** |
| **H-06** | `write_file` ghi đè `docs/DocFlow_Interactive_Mockup.html` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Tệp Prototype tham chiếu docs/DocFlow_Interactive_Mockup.html bị khóa bảo vệ..."}` | **ĐẠT** |
| **H-07** | `write_file` ghi đè `docs/mockup_01_workspace.png` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Ảnh tham chiếu giao diện 'mockup_01_workspace.png' là bất biến..."}` | **ĐẠT** |
| **H-08** | `run_command` chạy `rm -f docs/mockup_04_build.png` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN (run_command): Ảnh tham chiếu giao diện 'mockup_04_build.png' là bất biến..."}` | **ĐẠT** |
| **H-09** | `run_command` chạy `echo bad > /tmp/proj/template/original.docx` | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN (run_command): Tệp mẫu gốc 'original.docx' (Template V0) là bất biến..."}` | **ĐẠT** |
| **H-10** | `run_command` chạy `cp /tmp/fake.json .agents/hooks.json` | `deny` | `{"decision":"deny","reason":"Không được phép dùng lệnh shell để vô hiệu hóa hoặc ghi đè cấu hình safety hooks (.agents/hooks.json)."}` | **ĐẠT** |
| **H-11** | `write_file` ghi đè `builds/build-0001/manifest.json` đã tồn tại | `deny` | `{"decision":"deny","reason":"VI PHẠM NGUYÊN TẮC BẤT BIẾN: Bản dựng lịch sử (builds/<buildId>/manifest.json hoặc output.docx) đã chốt là bất biến..."}` | **ĐẠT** |
| **H-12** | Vai trò `DOCFLOW_AI_ROLE=reviewer` gọi `write_file` vào `app/src/ui/temp.ts` | `deny` | `{"decision":"deny","reason":"Vai trò AI 'reviewer' chỉ có quyền đọc (Read-Only Capability Scoping), không được phép gọi 'write_file'."}` | **ĐẠT** |
| **H-13** | Vai trò `DOCFLOW_AI_ROLE=section-writer` gọi `call_mcp_tool` (`approve_revision`) | `deny` | `{"decision":"deny","reason":"AI Agent không được phép gọi công cụ phê duyệt chính thức hoặc xuất tài liệu DOCX."}` | **ĐẠT** |
| **H-14** | Gửi chuỗi JSON lỗi cú pháp vào `stdin` của `PreToolUse` (Fail-closed) | `deny` | `{"decision":"deny","reason":"Payload JSON gửi tới PreToolUse hook không hợp lệ — từ chối thực thi để đảm bảo an toàn."}` | **ĐẠT** |
| **H-15** | `run_command` chạy `rm -rf /tmp/docflow-temp-cache` | `force_ask` | `{"decision":"force_ask","reason":"Lệnh xóa đệ quy (rm -rf) có rủi ro cao — cần người dùng xác nhận trực tiếp."}` | **ĐẠT** |
| **H-16** | `edit_file` sửa tệp mã nguồn hợp lệ `app/src/ui/shell/AppShell.tsx` | `allow` | `{"decision":"allow"}` | **ĐẠT** |
| **H-17** | `run_command` chỉ đọc `shasum -a 256 docs/DOCFLOW_STUDIO_SPEC.md` | `allow` | `{"decision":"allow"}` | **ĐẠT** |
| **H-18** | Chạy `session-context.mjs` (`SessionStart`) & `verify-post-tool-integrity.mjs` (`PostToolUse`) | `injectSteps` & `{}` | Trả đúng cấu trúc `{"injectSteps":[{"systemMessage":{"systemMessage":"..."}}]}` và `{}` | **ĐẠT** |

---

## 5. Bảng đối chiếu nghiệm thu toàn bộ 7 Task của Giai đoạn Khởi tạo & Mức độ sẵn sàng cho 15 Kịch bản MVP

### 5.1. Đối chiếu tiêu chí chấp nhận của toàn bộ 7 bước khởi tạo

| Bước khởi tạo | Sản phẩm bàn giao trọng tâm | Tiêu chí chấp nhận cốt lõi | Kết quả kiểm chứng độc lập của QA | Trạng thái |
| --- | --- | --- | --- | :---: |
| **Khởi tạo 1/7 (BA)** | `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md`, `docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md` | Đặc tả kiến trúc 4 lớp, 17 thực thể, 6 nhóm trạng thái, hợp đồng IPC/mã lỗi, phân quyền 6 vai trò AI và quy chuẩn `.agents/`; không sửa tài liệu gốc. | Đầy đủ, chính xác theo `DOCFLOW_STUDIO_SPEC.md`, đánh dấu rõ `[QS]`/`[ĐX]`/`[MỞ]`. | **ĐẠT** |
| **Khởi tạo 2/7 (Dev)** | `.git/`, `.gitignore`, `.nvmrc`, `.editorconfig`, `README.md`, `AGENTS.md`, `.agents/**` | Khởi tạo Git (không tự commit), cấu hình `.agents/` đúng chuẩn dung lượng `< 24KB`, progressive disclosure skills, `PreToolUse` chặn 100% đường dẫn bất biến. | Đã kiểm chứng trực tiếp bằng script và `agy-cli-safety-hooks.qa.test.ts` (18 kịch bản). | **ĐẠT** |
| **Khởi tạo 3/7 (Dev)** | Toolchain `app/` (`package.json`, `tsconfig.*.json`, `eslint.config.mjs`, `electron.vite.config.ts`, `vitest.config.ts`), Electron security & `IpcDispatcher` | Cấu hình TypeScript strict, ESLint khóa ranh giới lớp, Electron `sandbox: true` + `contextIsolation: true` + CSP, cổng IPC có validation/capability scoping/audit. | `typecheck`, `lint`, `build` chạy sạch; `architecture-security-and-build-gate.qa.test.ts` xác nhận chống leo thang quyền và chống Path Traversal. | **ĐẠT** |
| **Khởi tạo 4/7 (Dev)** | `app/src/core/domain/**`, `app/src/core/ports/**` | 17 thực thể miền bất biến (`deepFreeze`), `ExactDecimal`, `Section != Page`, Typed Rule IR 4 bước cấm `eval()`, 6 máy trạng thái độc lập, lan truyền `STALE`, `Build Gate` và 8 interface Ports thuần TS. | 0 phụ thuộc hạ tầng trong `core/`; kiểm thử đầy đủ cả đường đi hợp lệ lẫn ma trận chuyển trạng thái cấm. | **ĐẠT** |
| **Khởi tạo 5/7 (Dev)** | `app/src/infra/sqlite/**`, `app/src/infra/filesystem/**`, `app/src/infra/logging/**`, `app/src/adapters/ai/**` | SQLite migrations nguyên tử/idempotent + triggers bảo vệ bất biến, kho `sha256` chỉ đọc (`0o444`), khóa `.project.lock` và `AgyCliAssistantAdapter` chỉ đọc. | Xác minh qua các ca giả mạo byte thực tế trên đĩa, rollback giao dịch SQLite, đua tranh khóa song song và kiểm toán tool-calls của `agy` CLI. | **ĐẠT** |
| **Khởi tạo 6/7 (Dev)** | `app/src/ui/**` (5 màn hình + Zustand store + formatters `vi-VN`), `ProjectSessionCoordinator`, `docs/11_HuongDan_CaiDat_Va_PhatTrien_Base.md` | Đủ 5 màn hình chuẩn §4.1–4.5 bằng tiếng Việt, không sao chép dữ liệu giả lập của Prototype HTML, kết nối thực tế tạo/mở dự án qua Preload IPC tới SQLite, tài liệu hướng dẫn khớp 100% scripts. | Đã kiểm chứng kết nối thực tế UI Store ↔ Preload ↔ IPC ↔ SQLite và quét 0 chuỗi giả lập mockup trên toàn bộ 5 màn hình. | **ĐẠT** |
| **Khởi tạo 7/7 (QA)** | `app/tests/qa/*.qa.test.ts` (3 bộ test), `docs/12_BaoCao_NghiemThu_KhoiTao_DuAn.md` | Kiểm thử độc lập toàn diện tài liệu, ranh giới kiến trúc, bảo mật Electron/IPC, ca biên Build Gate/giả mạo byte/khóa đồng thời, safety hooks `.agents/` và xuất báo cáo nghiệm thu. | Hoàn thành đầy đủ; 16/16 tệp kiểm thử (54/54 bài test) và bản dựng production đạt 100%. | **ĐẠT** |

### 5.2. Rà soát hiện trạng nền tảng đối với 15 Kịch bản MVP (`DOCFLOW_STUDIO_SPEC.md` §12.1) & Đối chiếu Prototype HTML

Để làm căn cứ minh bạch cho các giai đoạn triển khai kế tiếp, QA phân định rõ mức độ đáp ứng hiện tại giữa **Prototype HTML (`docs/`)**, **Lõi miền & Hạ tầng nền tảng (`app/` sau Giai đoạn Khởi tạo)** và **Phần Adapter chuyên sâu thuộc Phase 0–4 sắp tới**:

| Nhóm kịch bản MVP (§12.1) | Hành vi trên Prototype HTML (`docs/DocFlow_Interactive_Mockup.html`) [Tham chiếu UI] | Nền tảng đã sẵn sàng & Đã kiểm thử trong `app/` (Sau Khởi tạo) | Hạng mục thuộc Phase tiếp theo (Chưa giả định hoàn tất ở bước Base) |
| --- | --- | --- | --- |
| **AC1:** Hash `Template V0` không đổi qua 10 lần build | Chỉ hiển thị nhãn chữ `"Mẫu DOCX V0"` tĩnh trong RAM. | **Đã hiện thực & kiểm thử thực tế:** `ContentAddressedArtifactStore` khóa `0o444`, lưu `template-sha256.txt`, trigger SQLite chặn sửa/xóa, clone 10 lần liên tiếp giữ nguyên `SHA-256` 100% và phát hiện ngay khi lệch 1 byte (`ARTIFACT_INTEGRITY_VIOLATION`). | Kết nối với bộ ghép OOXML thực tế ở Phase 1 & Phase 4. |
| **AC2 & AC10:** Nhận diện/sửa ranh giới ≥ 5 `LogicalSection`; giữ nguyên định dạng Section không đổi | Cố định 5 phần `01..05` bằng mảng JS. | Đã có thực thể `LogicalSection` (chặn ID theo số trang `Section != Page`), `DocumentBlock`, kiểm tra phạm vi `PATCH_OUT_OF_SECTION_SCOPE`, bảng SQLite và `DocumentEnginePort`. | Cài đặt bộ đọc/vá gói ZIP/OOXML thật (`w:rPr`, `w:pPr`, `w:tblPr`) trên bộ `corpus/` ở Phase 0–1. |
| **AC3, AC4, AC5, AC6, AC7:** Lan truyền `STALE` bắc cầu (`12.000 → 15.000`), chạy `Selected` / `Affected` / `Full`, chặn khi upstream `STALE` | Đã mô phỏng đúng trên UI (`?view=runner`, `?seed=ran`, `?seed=approved`): với `qty=15.000`, `price=250.000`, `rate=65%` cho doanh thu `3.750.000.000`, chi phí `2.437.500.000`, lợi nhuận `1.312.500.000` (chuẩn `vi-VN`), chặn chạy riêng Phần 03–05 khi Phần 02 đang `stale`, vô hiệu hóa build khi đổi input/rule. | **Đã hiện thực & kiểm thử ở `core/`:** `assertAcyclicDependencyGraph`, `propagateDownstreamInvalidation`, `assertSelectedSectionUpstreamReady` (`UPSTREAM_SECTION_STALE`), `completeSelectedSectionCalculation` và `ExactDecimal` khớp chính xác tuyệt đối số liệu chuẩn. | Cài đặt bộ lập lịch `DAG Scheduler` nối với `RuleExecutorPort` và `resultFingerprint` cache ở Phase 2. |
| **AC8 & AC9:** Báo `AMBIGUOUS` khi trùng ngày hiệu lực; sửa lời mô tả Rule tạo version mới ở `DRAFT` | Sửa lời Rule tăng `v3 → v4` và vô hiệu hóa build hiện tại (nhưng công thức tính trong HTML vẫn cố định). | **Đã hiện thực & kiểm thử ở `core/`:** `assertInputBindingExecutable` ném `SOURCE_LOOKUP_AMBIGUOUS` / `SOURCE_DATA_MISSING`; `createNextRuleDraftVersion` tạo `version + 1` ở `DRAFT` mà không sửa bản `APPROVED` cũ; `TypedRuleExecutionPlan` chặn `eval()`/macro. | Cài đặt `SpreadsheetReaderPort` đọc file `.xlsx` thật và trình thông dịch AST trong `execution/sandbox/` ở Phase 2–3. |
| **AC11, AC12, AC13, AC14, AC15:** Tách `Content Diff` vs `Layout Diff`, chặn lỗi layout nghiêm trọng (`Build Gate`), xuất DOCX & tái dựng từ `Build Snapshot` | Có 3 tab điều hướng phím mũi tên (`full`, `content`, `layout`), đáp ứng mốc `900px`/`1350px` và tải JSON `docflow_build_manifest_demo.json`, nhưng số trang chỉ là hằng số `12/13` (không tạo DOCX thật). | **Đã hiện thực & kiểm thử hợp đồng lõi:** `recordLayoutObservationPreservingContentState` giữ nguyên `APPROVED` nội dung khi `SHIFTED`; `evaluateBuildQualityGate` chặn `BUILD_BLOCKED_STALE_RESULTS`, `BUILD_BLOCKED_UNAPPROVED_REVISIONS`, `BUILD_BLOCKED_LAYOUT_GATE` (hỗ trợ override có lý do); lưu trữ `BuildManifest` trong SQLite. | Tích hợp `LayoutRendererPort` (ví dụ LibreOffice headless) để render PDF/ảnh thật, đo phân trang thực tế và xuất DOCX hoàn chỉnh ở Phase 4. |

---

## 6. Danh mục Tệp Kiểm thử & Báo cáo do QA tạo mới

1. `app/tests/qa/architecture-security-and-build-gate.qa.test.ts` — Bộ kiểm thử độc lập ranh giới kiến trúc 4 lớp, bảo mật Electron/CSP/IPC spoofing, ma trận ca biên chuyển trạng thái cấm ở `Build Gate`, số học `ExactDecimal` và đối chiếu `SHA-256` tài sản gốc `docs/`.
2. `app/tests/qa/artifact-tampering-and-concurrency.qa.test.ts` — Bộ kiểm thử độc lập 10 vòng clone `Template V0` liên tiếp, 4 kịch bản giả mạo byte trên `original.docx` / `template-sha256.txt` / `Source Snapshot` và đua tranh khóa dự án đồng thời `.project.lock`.
3. `app/tests/qa/agy-cli-safety-hooks.qa.test.ts` — Bộ kiểm thử độc lập cấu trúc `.agents/` (`AGENTS.md`, `skills.json`, 9 `SKILL.md`, `mcp_config.example.json`) và thực thi trực tiếp 18 kịch bản `PreToolUse` / `PostToolUse` / `SessionStart` trên `.agents/hooks.json`.
4. `docs/12_BaoCao_NghiemThu_KhoiTao_DuAn.md` — Báo cáo nghiệm thu độc lập giai đoạn khởi tạo dự án DocFlow Studio.
