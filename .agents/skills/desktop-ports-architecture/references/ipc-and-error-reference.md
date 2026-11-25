# Tham chiếu nhanh Khung IPC & Mã lỗi chuẩn (`DocFlowErrorCode`)

Chi tiết đầy đủ xem tại `docs/09_KienTruc_NenTang_Va_QuyUoc_KhoiTao.md` (§7).

## 1. Bốn chốt chặn bắt buộc tại `app/src/infra/ipc/`
1. **Schema Validation**: Kiểm tra kiểu dữ liệu đầu vào/đầu ra (ví dụ bằng Zod) và chống Path Traversal (`..`).
2. **Capability Scoping**: Kiểm tra quyền tác nhân (`ui:user`, `agent:read`, `agent:rule-planner`, `agent:section-writer`...). Cấm mọi AI Agent gọi `section.approveRevision`, `build.approve`, `build.exportDocx`.
3. **Envelope chuẩn (`IpcResult<T>`)**: Trả về `{ ok: true, data, meta }` hoặc `{ ok: false, error: { code, messageVi, details, recoverable }, meta }`.
4. **Audit Trail**: Tự động ghi `AuditEvent` cho mọi lệnh thay đổi trạng thái.

## 2. Các mã lỗi cốt lõi cần xử lý nhất quán
- **Bảo mật & IPC**: `IPC_INVALID_CHANNEL`, `IPC_VALIDATION_FAILED`, `CAPABILITY_DENIED`
- **Toàn vẹn Artifact**: `PROJECT_LOCKED`, `ARTIFACT_INTEGRITY_VIOLATION`, `IMMUTABLE_TARGET_PROTECTED`
- **OOXML & Patch**: `DOCX_PARSE_UNSUPPORTED_SAFE`, `ANCHOR_DRIFT_OR_NOT_FOUND`, `PATCH_OUT_OF_SECTION_SCOPE`
- **Rule & Nguồn dữ liệu**: `RULE_SCHEMA_INVALID`, `DEPENDENCY_CYCLE_DETECTED`, `SOURCE_DATA_MISSING`, `SOURCE_LOOKUP_AMBIGUOUS`, `SANDBOX_EXECUTION_TIMEOUT`
- **DAG & Build Gate**: `UPSTREAM_SECTION_STALE`, `BUILD_BLOCKED_STALE_RESULTS`, `BUILD_BLOCKED_UNAPPROVED_REVISIONS`, `BUILD_BLOCKED_LAYOUT_GATE`, `RENDER_ENGINE_UNAVAILABLE`
