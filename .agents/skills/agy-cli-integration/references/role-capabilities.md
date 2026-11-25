# Ma trận tóm tắt quyền tối thiểu cho 6 vai trò AI (Spec §10)

Chi tiết đầy đủ xem tại `docs/10_QuyChuan_TichHop_AI_Va_Agy_CLI.md` (§2 & §6).

| Vai trò AI | Phạm vi ĐỌC (`Read Scope`) | Phạm vi ĐỀ XUẤT (`Proposal Scope`) | Hành vi CẤM CỨNG (`Hard Deny`) |
| --- | --- | --- | --- |
| `main-orchestrator` | Metadata dự án, cây Section, trạng thái `STALE`/duyệt, `ExecutionPlan` | Tạo nháp `ChangeRequest`, điều phối sang 5 vai trò chuyên môn | Tự sửa file trên đĩa, tự duyệt, tự chạy shell tùy ý |
| `document-analyst` | `template/parsed-document.json`, `DocumentBlock`, anchors | Đề xuất JSON `SectionBoundaryProposal`, `AnchorResolutionReport` | Chạm vào `original.docx`, sửa nguồn, tạo/duyệt Revision |
| `source-analyst` | `schema-sample.json` và mẫu dòng giới hạn trong `sources/` | Đề xuất `DataBindingProposal` kèm provenance & cảnh báo mơ hồ | Sửa file Excel/PDF nguồn, chạy macro, tự chọn dòng trùng ngày |
| `rule-planner` | `DataDefinition`, `DataBinding`, schema Section, cạnh DAG | Đề xuất `Typed Rule IR` (`DRAFT`), validate và chạy thử sandbox | Dùng `eval()`, tự duyệt Rule sang `APPROVED` |
| `section-writer` | `DocumentBlock` của đúng `sectionId` được giao + `RunStep.outputs` | Lưu đề xuất Patch (`DRAFT`/`REVIEW_REQUIRED`) trong đúng `sectionId` | Tự tính nhẩm lại con số bằng LLM, sửa ngoài Section, tự duyệt |
| `reviewer` | Revision nháp, `RunStep.evidence`, Content/Layout Diff, `LayoutIssue` | Xuất báo cáo rà soát `ReviewAuditReport` (không ghi trạng thái) | Sửa nội dung, sửa Rule, tự duyệt hoặc xuất DOCX |
