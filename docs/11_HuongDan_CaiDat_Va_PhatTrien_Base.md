# 11 — Hướng dẫn cài đặt môi trường và phát triển nền tảng DocFlow Studio (`app/`)

**Ngày biên soạn:** 25/11/2026  
**Phạm vi áp dụng:** Mã nguồn ứng dụng Desktop Production tại `app/` và hàng rào an toàn Agent tại `.agents/`.  
**Tài liệu liên quan:** `docs/DOCFLOW_STUDIO_SPEC.md`, `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md`, `docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md`, `AGENTS.md`.

---

## 1. Yêu cầu môi trường phát triển

Để biên dịch, chạy kiểm thử và phát triển ứng dụng Desktop **DocFlow Studio** (`Electron + React + TypeScript + Zustand + SQLite`), máy trạm cần đáp ứng các thành phần sau:

| Thành phần | Phiên bản yêu cầu | Mục đích & Lưu ý kỹ thuật |
| --- | --- | --- |
| **Node.js** | **`>= 24.x`** (khớp `.nvmrc`: `24`) | **Bắt buộc.** Tầng hạ tầng cơ sở dữ liệu (`app/src/infra/sqlite/`) sử dụng trực tiếp module tích hợp sẵn `node:sqlite` (`DatabaseSync`) của Node 24 để đạt tính di động cao mà không phụ thuộc biên dịch native C++ ngoài. |
| **npm** | Đi kèm Node.js 24 (`>= 10.x`) | Quản lý gói phụ thuộc khóa phiên bản qua `app/package-lock.json`. |
| **SQLite** | Có sẵn trong `node:sqlite` | Chạy ở chế độ `WAL`, bật `foreign_keys = ON` và khóa cứng `PRAGMA query_only = ON` cho các kết nối chỉ đọc. Có thể cài thêm công cụ dòng lệnh `sqlite3` của hệ điều hành nếu muốn soi trực tiếp tệp `project.sqlite` khi gỡ lỗi. |
| **Python 3** *(tùy chọn)* | `>= 3.9` | Chỉ dùng khi cần mở xem đối chiếu bản Prototype HTML tĩnh (`python3 -m http.server 8000 --directory docs`). |
| **LibreOffice** *(tùy chọn — cho Phase tiếp theo)* | `>= 7.6` / `24.x` (`soffice --headless`) | **Chưa bắt buộc ở giai đoạn Base hiện tại.** Ở giai đoạn triển khai `LayoutRendererPort` (kết xuất toàn tài liệu DOCX sang PDF/ảnh trang để đo tọa độ và tách `Layout Diff`), bộ chuyển đổi trong `app/src/adapters/rendering/` sẽ gọi engine kết xuất cục bộ thông qua Strategy Port. |
| **Antigravity CLI (`agy`) / AI CLI** *(tùy chọn)* | Bản mới nhất | Phục vụ quy trình phát triển có kiểm soát qua `.agents/` và thử nghiệm `AgyCliAssistantAdapter` ở chế độ chỉ đọc (`readOnly: true`). |

### Kiểm tra nhanh phiên bản trên máy trạm

```bash
# Tại thư mục gốc docflow-studio/
node -v        # Kỳ vọng: v24.x.x (nếu dùng nvm: chạy `nvm use`)
npm -v

# (Tùy chọn cho giai đoạn kết xuất bố cục Phase 4)
soffice --version
```

---

## 2. Cài đặt và các lệnh phát triển chuẩn (`app/package.json`)

Toàn bộ mã nguồn ứng dụng Desktop nằm trong thư mục `app/`. Cài đặt phụ thuộc lần đầu:

```bash
cd app
npm ci
```

Danh mục đầy đủ các scripts trong `app/package.json`:

| Lệnh trong `app/` | Lệnh thực thi thực tế | Chức năng |
| --- | --- | --- |
| `npm run dev` | `electron-vite dev` | Khởi chạy ứng dụng Electron ở chế độ phát triển kèm Hot Reload cho Renderer (`ui/`) và tự động biên dịch lại `main/` + `preload/`. |
| `npm run build` | `electron-vite build` | Đóng gói bản dựng production cho cả 3 tiến trình vào `app/out/main`, `app/out/preload` và `app/out/renderer`. |
| `npm run preview` | `electron-vite preview` | Chạy thử trực tiếp bản dựng đã biên dịch trong `app/out/` trên Electron để kiểm chứng CSP và cấu hình `sandbox: true`. |
| `npm run typecheck` | `tsc --noEmit -p tsconfig.node.json && tsc --noEmit -p tsconfig.web.json` | Kiểm tra kiểu tĩnh nghiêm ngặt (`strict: true`, `noUncheckedIndexedAccess: true`) cho cả môi trường Node/Main/Core/Infra (`tsconfig.node.json`) và môi trường Renderer DOM/React (`tsconfig.web.json`). |
| `npm run lint` | `eslint .` | Kiểm tra chất lượng mã nguồn, quy tắc React Hooks và **cưỡng chế ranh giới kiến trúc 4 lớp** (`no-restricted-imports`). |
| `npm test` | `vitest run` | Chạy một lần toàn bộ bộ kiểm thử đơn vị (`tests/unit/**`) và kiểm thử tích hợp (`tests/integration/**`). |
| `npm run test:watch` | `vitest` | Chạy Vitest ở chế độ theo dõi liên tục trong lúc lập trình TDD. |

> **Mẹo chạy từ thư mục gốc kho mã nguồn (`docflow-studio/`):**  
> Có thể thêm cờ `--prefix app` mà không cần chuyển thư mục làm việc:
> ```bash
> npm --prefix app run typecheck && npm --prefix app run lint && npm --prefix app test && npm --prefix app run build
> ```

### Lưu ý khi Tạo / Mở dự án trên giao diện Desktop
- Theo chốt chặn an toàn `assertProjectDirOutsideSourceRepo` (`app/src/infra/filesystem/hash-and-guards.ts`), **thư mục dữ liệu dự án người dùng bắt buộc nằm bên ngoài thư mục kho mã nguồn `docflow-studio/`** (ví dụ: `/Users/<ten-ban>/DocFlowProjects/du-an-01` hoặc `/tmp/docflow-demo-01`).
- Khi khởi tạo dự án mới qua nút **`+ Tạo dự án mới`**, ứng dụng tự động tạo đầy đủ cây thư mục chuẩn (`manifest.json`, `.project.lock`, `project.sqlite`, `template/`, `sources/`, `recipe/rules/`, `sections/`, `runs/`, `builds/`, `working/`), chạy SQLite migrations và ghi nhận `AuditEvent`.

---

## 3. Cấu trúc kiến trúc 4 phân lớp và ranh giới phụ thuộc

Ứng dụng tuân thủ nghiêm ngặt kiến trúc **Ports & Adapters** với chiều phụ thuộc một chiều hướng vào `core/`:

```text
ui/ (React + Zustand, vi-VN)
  └──> preload/ (contextBridge: window.docflowApi)
         └──> main/ + infra/ipc/ (Allowlist + Capability Scoping + Zod Schema + Audit)
                └──> core/ (17 Entities, 6 State Machines, UseCases, Ports — Pure TS)
                       ▲
                       ├── implements ── adapters/ (documents, spreadsheets, reference-files, rendering, execution/sandbox, ai)
                       └── implements ── infra/ (sqlite, filesystem sha256, logging)
```

### Ba quy tắc ranh giới bắt buộc (được kiểm tra tự động bởi `npm run lint` và `tests/unit/architecture-boundaries.test.ts`)
1. **`app/src/core/` tinh khiết 100%:** Cấm import `electron`, `react`, `zustand`, `fs`, `node:*`, `path`, `child_process`, `better-sqlite3`, hoặc bất kỳ module nào từ `ui/`, `adapters/`, `infra/`, `main/`, `preload/`.
2. **`app/src/ui/` cô lập trong hộp cát (`sandbox: true`, `contextIsolation: true`, `nodeIntegration: false`):** Chỉ gọi tác vụ qua `window.docflowApi` và chỉ import kiểu dữ liệu từ `@core/domain` hoặc `@preload/api-types`. Tuyệt đối không tự tính nhẩm lại số liệu nghiệp vụ, không tự suy diễn trạng thái `STALE` và **không đưa dữ liệu giả lập của mockup HTML vào `app/`**.
3. **`app/src/adapters/` không gọi chéo nhau:** Mọi sự phối hợp giữa bộ đọc Excel, bộ thực thi Rule IR, AI Adapter, bộ vá OOXML và bộ kết xuất bố cục đều phải đi qua UseCase của `core/`.

---

## 4. Quy trình chuẩn khi thêm Port, Adapter và kênh IPC mới

Khi triển khai các tính năng nghiệp vụ ở các giai đoạn tiếp theo (ví dụ: nhập & phân tích OOXML `Template V0`, biên dịch `Typed Rule IR`, chạy `DAG Runner` hay kết xuất `Build & Preview`), hãy thực hiện tuần tự 7 bước sau:

### Bước 1 — Khai báo kiểu miền & Giao diện Port trong `app/src/core/`
1. Nếu cần bổ sung kiểu giá trị hoặc mã lỗi, cập nhật tại `app/src/core/domain/` (đồng thời cập nhật bảng nhãn tiếng Việt tương ứng tại `app/src/ui/shared/labels.ts`).
2. Định nghĩa hoặc mở rộng interface Port trong `app/src/core/ports/<ten-cong>.port.ts` và xuất qua `app/src/core/ports/index.ts`.

### Bước 2 — Hiện thực hóa UseCase thuần TypeScript trong `app/src/core/<module>/`
- Viết dịch vụ miền / UseCase trong thư mục nghiệp vụ tương ứng (`change-requests/`, `section-revisions/`, `data-registry/`, `rules/`, `dependency-graph/`, `build-manifest/`, `history/`).
- Nhận các Port qua hàm khởi tạo (Dependency Injection), kiểm tra máy trạng thái vòng đời (`core/domain/state-machines/`) và ném `AppError` có mã `DocFlowErrorCode` + thông báo tiếng Việt rõ ràng khi vi phạm điều kiện nghiệp vụ.

### Bước 3 — Cài đặt Adapter hoặc Hạ tầng (`app/src/adapters/` hoặc `app/src/infra/`)
- Viết lớp cài đặt cụ thể thực thi Port vừa định nghĩa (ví dụ: `OoxmlDocumentEngineAdapter` trong `app/src/adapters/documents/` hoặc truy vấn SQLite trong `app/src/infra/sqlite/project-repository.ts`).
- Nếu thay đổi cấu trúc bảng CSDL, bổ sung một bản ghi migration mới có số thứ tự tăng dần vào `INITIAL_SQLITE_MIGRATIONS` tại `app/src/infra/sqlite/migrations.ts` (không sửa đổi mã SQL của migration đã phát hành nếu làm lệch checksum lịch sử).

### Bước 4 — Khai báo Schema & Quyền tại cổng IPC (`app/src/infra/ipc/`)
1. Kiểm tra hoặc thêm đặc tả kênh trong `IPC_CHANNEL_SPECS` tại `app/src/infra/ipc/schemas.ts`:
   - Dùng `.strict()` của `zod` cho `inputSchema` và `safeFilePathSchema` cho mọi trường đường dẫn tệp (chống Path Traversal `..` và ký tự null).
   - Thiết lập chính xác `requiredCapabilities` (`ui:user`, `agent:read`, `agent:rule-planner`, `agent:section-writer`...), cờ `mutating` và đặt `humanOnly: true` cho mọi thao tác phê duyệt chính thức hoặc xuất tệp.
2. Đăng ký handler thực tế với `dispatcher.registerHandler(...)` tại `app/src/infra/ipc/default-handlers.ts` (hoặc module điều phối phiên trong `app/src/infra/ipc/`) và tiêm phụ thuộc tại Composition Root `app/src/main/index.ts`.

### Bước 5 — Phơi bày API định kiểu chặt qua `preload/`
- Cập nhật kiểu dữ liệu đầu vào/đầu ra (DTO) trong `app/src/preload/api-types.ts`.
- Gắn hàm gọi kênh tương ứng qua `invokeChannel<TOutput>(...)` trong `app/src/preload/index.ts` (giữ nguyên `Object.freeze`, tuyệt đối không phơi bày `ipcRenderer` thô).

### Bước 6 — Kết nối Zustand Store & Giao diện tiếng Việt (`app/src/ui/`)
- Bổ sung action bất đồng bộ vào store Zustand (`app/src/ui/shell/store.ts` hoặc store con của phân hệ) gọi qua `window.docflowApi`.
- Hiển thị dữ liệu bằng bộ định dạng `vi-VN` (`formatNumberVi`, `formatDecimalVi`, `formatCurrencyVnd`, `formatDateTimeVi`, `formatHashPreview`) và nhãn trạng thái chuẩn trong `app/src/ui/shared/`.

### Bước 7 — Viết kiểm thử và chạy chuỗi xác minh bắt buộc
- Bổ sung unit test cho `core/` & `ui/` tại `app/tests/unit/` và integration test cho `adapters/` + `infra/` + `ipc/` tại `app/tests/integration/`.
- Chạy đủ 4 lệnh kiểm tra trước khi hoàn tất:
  ```bash
  cd app
  npm run typecheck && npm run lint && npm test && npm run build
  ```

---

## 5. Kiểm tra hàng rào an toàn `.agents/` và bảo vệ tài sản bất biến

Dự án trang bị cơ chế bảo vệ đa tầng gồm quy tắc luôn bật (`AGENTS.md`, `app/src/core/AGENTS.md`), kỹ năng tải theo ngữ cảnh (`.agents/skills/`) và Lifecycle Safety Hooks (`.agents/hooks.json`) cho Antigravity CLI (`agy`).

### 5.1. Danh mục tài sản bất biến tuyệt đối không được ghi đè hoặc xóa
1. Đặc tả và Prototype tham chiếu gốc: `docs/DOCFLOW_STUDIO_SPEC.md`, `docs/DocFlow_Interactive_Mockup.html`, `docs/mockup_01_workspace.png` .. `docs/mockup_04_build.png`.
2. Tài sản dự án người dùng & bộ mẫu đo kiểm: `**/template/original.docx`, `**/template/template-sha256.txt`, `**/sources/**`, `corpus/**` và các bản dựng lịch sử đã chốt `**/builds/*/manifest.json` | `output.docx`.
3. Cấu hình bảo vệ: `.agents/hooks.json` và `.agents/scripts/guard-immutable-paths.mjs`.

### 5.2. Cách kiểm tra trực tiếp hoạt động của Safety Hooks trên máy trạm

Từ thư mục gốc `docflow-studio/`, có thể chạy kiểm chứng trực tiếp các script trong `.agents/scripts/` qua `stdin` chuẩn JSON `camelCase`:

```bash
# 1. Kiểm tra PreToolUse CHẶN CỨNG ("decision": "deny") khi cố ghi đè Template V0
printf '%s' '{"hookEventName":"PreToolUse","cwd":"/tmp","toolCall":{"name":"write_file","args":{"Path":"/tmp/demo/template/original.docx","Content":"x","Overwrite":true}}}' \
  | node ./.agents/scripts/guard-immutable-paths.mjs

# 2. Kiểm tra PreToolUse CHẶN CỨNG khi cố sửa đặc tả gốc DOCFLOW_STUDIO_SPEC.md
printf '%s' '{"hookEventName":"PreToolUse","cwd":".","toolCall":{"name":"edit_file","args":{"Path":"docs/DOCFLOW_STUDIO_SPEC.md","Target":"a","Replacement":"b"}}}' \
  | node ./.agents/scripts/guard-immutable-paths.mjs

# 3. Kiểm tra PreToolUse CHẶN CỨNG khi vai trò AI chỉ đọc (reviewer) cố gọi công cụ ghi
printf '%s' '{"hookEventName":"PreToolUse","cwd":".","toolCall":{"name":"write_file","args":{"Path":"app/src/ui/test.txt","Content":"abc"}}}' \
  | DOCFLOW_AI_ROLE=reviewer node ./.agents/scripts/guard-immutable-paths.mjs

# 4. Kiểm tra PreToolUse CHO PHÉP ("decision": "allow") với tệp mã nguồn thông thường trong app/src/
printf '%s' '{"hookEventName":"PreToolUse","cwd":".","toolCall":{"name":"edit_file","args":{"Path":"app/src/ui/shell/AppShell.tsx","Target":"a","Replacement":"b"}}}' \
  | node ./.agents/scripts/guard-immutable-paths.mjs

# 5. Kiểm tra PostToolUse xác minh toàn vẹn mã băm và ranh giới import của core/ (kỳ vọng trả về {})
printf '%s' '{"hookEventName":"PostToolUse","cwd":".","toolCall":{"name":"write_file","args":{"Path":"app/src/ui/shell/AppShell.tsx"}}}' \
  | node ./.agents/scripts/verify-post-tool-integrity.mjs
```

Nếu cả 3 lệnh đầu trả về `"decision":"deny"`, lệnh thứ 4 trả về `"decision":"allow"` và lệnh thứ 5 trả về `{}`, hàng rào bảo vệ `.agents/` đang hoạt động đúng thiết kế 100%.
