# 08 — Đối chiếu DOCFLOW_STUDIO_SPEC với quyết định Q1–Q21 và kế hoạch xây ứng dụng

Ngày: **2026-11-23** · Người viết: BA · Trạng thái: **bản đề xuất, chờ người dùng chốt** các mục L-xx, K-xx, M-xx.

**Nguồn đã đọc:** `docs/DOCFLOW_STUDIO_SPEC.md` (v1.0, 22/11/2026, gọi tắt là "spec"), `docs/00`–`03`, `docs/07` (Q1–Q21 sau vòng 4). Prototype `docs/DocFlow_Interactive_Mockup.html` (116 dòng) chỉ được đọc để mô tả hiện trạng. Tài liệu này **không** sửa spec, HTML hay PNG và **không** chứa mã.

**Bối cảnh [ĐÃ CHỐT]:** người dùng đã quyết định chuyển sang **xây ứng dụng thật** theo spec (Electron/React/TypeScript, SQLite, vá DOCX thật, render, Build Snapshot). Prototype HTML được giữ riêng làm **tham chiếu giao diện**; nó không bị thay thế và không phải nền mã của ứng dụng.

**Ký hiệu**
- **KHỚP**: spec và quyết định thống nhất (có thể kèm ghi chú làm rõ).
- **LỆCH**: spec và quyết định nói khác nhau. Mỗi điểm lệch có mã **L-xx**, kèm phương án và đề xuất. **BA không tự quyết; người dùng chốt.**
- **THIẾU (spec)**: người dùng đã quyết nhưng spec chưa mô tả. Nội dung này sẽ được bổ sung vào đặc tả từng phase, không sửa file spec.
- **THIẾU (QĐ)**: spec có yêu cầu nhưng chưa có quyết định của người dùng. Mỗi mục có mã **K-xx** (kỹ thuật) hoặc **M-xx** (câu hỏi mở nhỏ).
- [QS] quan sát được · [ĐX] đề xuất · [MỞ] chưa quyết · [ĐÃ CHỐT] người dùng đã quyết.

---

## 0. Tóm tắt cho Main

1. **Đối chiếu:** 78 điểm của spec được đối chiếu với Q1–Q21 (§1.1, §1.2). Các điểm lệch và thiếu được gom thành **14 mục cần chốt (L-01..L-14)**. Mười điểm lệch đã biết đều được xác nhận: Q19, Q6, Q10, Q12, Q5, Q2/Q16 (fingerprint), Q7, Q9, Q14, Q13. Đối chiếu tìm thêm bốn mục:
   - Q18: sửa tay version và trạng thái Rule (L-11).
   - Q17: spec có **ba** bộ đếm version chứ không phải hai (L-12).
   - Q1: bố cục màn hình trong ảnh khác spec §4 (L-13).
   - Bước "duyệt theo bản build" của spec chưa có quyết định (L-14).
2. **Quyết định kỹ thuật:** cần chốt **17 mục (K-01..K-17)**. Sáu mục đến từ spec §15. Phần thêm gồm ngôn ngữ backend (K-07) và thư viện DOCX/Excel/PDF (K-08, gắn với Q10).
3. **Điều kiện để bắt đầu Phase 0:**
   - Người dùng cung cấp corpus mẫu thật. [QS] Tìm theo tên bằng Spotlight **không thấy «Kế hoạch kinh doanh 2027.docx»** trên máy.
   - Người dùng chốt K-02 (hướng), K-03, K-07, K-08, K-09, K-11, K-16.
   - Người dùng chấp thuận **đổi quy ước dự án cho `app/`**: được dùng framework, package manager và test tự động (§4.5).
4. **Phase 0 không phụ thuộc điểm lệch nào.** Phase 1 chỉ phụ thuộc L-04, L-05, L-09, L-12, L-13. Các điểm lệch còn lại ảnh hưởng Phase 2–4.
5. **Hiện trạng [QS]:** chưa có thư mục `app/`; thư mục dự án **chưa là git repository**. Prototype **không** tạo DOCX thật: số trang 12/13 là hằng số và phép tính là JS cố định. Không mục nào trong tài liệu này khẳng định prototype hay app tạo được DOCX thật.

---

## 1. Đối chiếu spec ↔ quyết định người dùng

### 1.1 Theo từng mục của spec

| ID | Mục spec | Spec nói (tóm tắt) | Quyết định liên quan | Kết luận | Xử lý |
|---|---|---|---|---|---|
| Đ-01 | §1.1(1) | Import DOCX mẫu bất biến; parse mục, đoạn, bảng, hình, header/footer, bookmark, style, break | Q10, Q15 | KHỚP | P0-04, P1-05. Q15 (đổi mẫu) xem §1.4 |
| Đ-02 | §1.1(2) | Nhập Excel, DOCX/**PDF** tham chiếu; provenance; snapshot từng nguồn | Q20, Q16, Q13 | KHỚP; THIẾU (QĐ): Q20 chỉ nêu Excel/DOCX, chưa nêu PDF | M-03, P1-07 |
| Đ-03 | §1.1(3–4) | Logical Section độc lập trang; chọn phần, yêu cầu sửa bằng ngôn ngữ tự nhiên | Q1 (chat), Q13 | KHỚP về Section; THIẾU (QĐ): có dùng LLM không | K-04 |
| Đ-04 | §1.1(5–6) | Saved Rule (lấy dữ liệu, chọn bản ghi, hiệu lực, công thức, ngoại lệ, kiểm tra); Data Binding | Q9, Q18, Q20 | KHỚP; LỆCH ở Q18 | L-11 |
| Đ-05 | §1.1(7–8) | Dependency Graph tự đánh dấu stale; chạy một phần / phần bị ảnh hưởng / toàn bộ | Q2, Q8, Q16, Q19 | LỆCH (cách xác định stale; đồ thị 03/04) | L-06, L-01 |
| Đ-06 | §1.1(9) | Duyệt theo phần **và theo bản build** | Q4, Q5 | KHỚP theo phần; THIẾU (QĐ) duyệt bản build | L-14 |
| Đ-07 | §1.1(10–11) | Dựng lại DOCX trên bản sao, layout toàn tài liệu; Build Snapshot tái lập được; xuất DOCX (PDF làm sau) | Q10, Q12 | KHỚP hướng Q10; LỆCH với Q12 (tái lập) | L-03, L-04 |
| Đ-08 | §1.2 Immutable template | V0 có hash, chỉ đọc; mọi thay đổi là Patch trên bản làm việc | Q15, Q12 | KHỚP, với điều kiện đổi mẫu = tạo Template mới (07 §H.9 #6, chờ duyệt) và «Xóa sạch» không xóa V0 | §1.4, L-04 |
| Đ-09 | §1.2 Section ≠ page | Trang chỉ xác định sau khi render toàn bộ | Q7 | LỆCH (khái niệm) | L-07 |
| Đ-10 | §1.2 Single source of truth, Separation of concerns | Dữ liệu có ID/đơn vị/nguồn; AI soạn, executor tính, composer sửa DOCX, layout engine phân trang | — | KHỚP (không có Q trái) | Kiến trúc §4 |
| Đ-11 | §1.2 Reproducible builds | Build lưu hash template, dữ liệu, rule, executor, revision, cấu hình dựng | Q10, Q12 | KHỚP với Q10 (thêm engine, phiên bản, font); LỆCH với Q12 (xóa) | L-04 |
| Đ-12 | §1.2 Explicit approval | Bản nháp không tự thay bản đã duyệt; đầu vào đổi thì bản duyệt cũ không hợp lệ cho build mới | Q2, Q4, Q5 | KHỚP (Q2 còn chặt hơn spec) | — |
| Đ-13 | §1.2 Auditable results | Số liệu truy được tới nguồn, cell, bước tính, phiên bản | Q12, Q18 | LỆCH một phần | L-04, L-11 |
| Đ-14 | §1.2 Safe defaults | Thiếu, đa nghĩa hoặc trùng thì dừng hoặc yêu cầu duyệt; không bịa số | Q9 | KHỚP (chọn nhánh "dừng") | L-08 |
| Đ-15 | §1.3 Ngoài MVP | Cộng tác thời gian thực; khớp từng pixel; đối tượng Word nâng cao; AI tự chạy code hoặc tự sửa Excel gốc | Q5, Q12, K-02, K-06 | KHỚP. Lưu ý: "ai cũng xem/xóa" (Q12) không có nghĩa là nhiều người cùng mở một dự án | L-05 |
| Đ-16 | §2.1 bước 4–5 | Sửa qty tạo CR-001 và Data Revision; downstream chuyển STALE | Q2, Q4, Q21 | KHỚP; THIẾU (spec): Phần 01 chuyển Chờ duyệt (Q4), CR đủ thuộc tính (Q21) | §1.4 |
| Đ-17 | §2.1 bước 6–9 | Mô tả bằng lời → Rule Studio tạo proposal → chạy thử → lưu Saved Rule có version | K-04, Q18 | THIẾU (QĐ) về AI | K-04 |
| Đ-18 | §2.2 bước 2, 4 | So input fingerprint để xác định node không hợp lệ; dùng cache cho node không đổi | Q2, Q16 | LỆCH | L-06 |
| Đ-19 | §2.2 bước 6–7 | Build từ V0 + revision; Content Diff và Layout Diff; lưu snapshot | Q6, Q7, Q10 | KHỚP (tách hai diff); LỆCH ở hệ quả của Q7 | L-07 |
| Đ-20 | §3.1 Rule | DRAFT, VALIDATED, APPROVED, DEPRECATED | Q18, Q14 | LỆCH (sửa tay); THIẾU nhãn tiếng Việt cho VALIDATED/DEPRECATED | L-11, Phụ lục A |
| Đ-21 | §3.1 Calculation Result, Section Revision | Trạng thái kết quả "không phải trạng thái bố cục"; có trạng thái FAILED | Q7, Q9 | LỆCH | L-07, L-08 |
| Đ-22 | §3.1 Document Build, Layout Difference | BLOCKED…LAYOUT_REVIEW, APPROVED, EXPORTED; SHIFTED, OVERFLOW… | Q6, Q7 | LỆCH (LAYOUT_REVIEW đóng vai cổng) | L-02, L-14 |
| Đ-23 | §3.2 ý 1–2 | Chỉ node phụ thuộc bị STALE, không xóa Revision cũ; chỉ chạy 02 thì 03–05 vẫn stale và build bị chặn | Q2, Q8 | KHỚP | — |
| Đ-24 | §3.2 ý 3 | Chạy 03 khi 02 stale: yêu cầu chạy upstream **hoặc** báo rõ đang dùng dữ liệu cũ | Q8, FR-09 | KHỚP (chọn nhánh "chặn" như FR-09); không có chế độ "chạy với dữ liệu cũ" | — |
| Đ-25 | §3.2 ý 4 | Sửa Rule tạo Rule Version mới và invalidation; không âm thầm áp vào bản đã duyệt | Q3, Q18 | KHỚP với Q3 (cần tổng quát hóa); LỆCH nhẹ với Q18 | L-06 (điểm phụ), L-11 |
| Đ-26 | §3.2 ý 5 | Tính lại mà output không đổi: tránh diff thừa, vẫn ghi Run | Q2 | LỆCH một phần (theo Q2 vẫn phải duyệt lại) | L-06 |
| Đ-27 | §3.2 ý 6 | Phát hiện vòng phụ thuộc khi lưu Rule | — | THIẾU (QĐ) nhưng không trái Q nào; đề xuất áp dụng nguyên văn | Phase 2 |
| Đ-28 | §4.1 Workspace | 3 vùng + Change Tray | Q1 (ảnh 01: chat, Xuất DOCX, badge, nav ngang) | KHỚP phần lớn; LỆCH/THIẾU theo cả hai chiều | L-13 |
| Đ-29 | §4.2 Recipe Studio | Tab AI diễn giải / Nguồn / Công thức / Kiểm thử / Quan hệ; sửa "theo quyền"; One-time Patch hay Reusable Rule | Q1 (ảnh 02 có 4 tab khác), Q5 | LỆCH (cấu trúc tab; "theo quyền") | L-13, L-05 |
| Đ-30 | §4.3 Dependency & Runner | Loại node/edge; màu trạng thái; 3 phạm vi chạy; execution plan (node chạy, node dùng cache, node bị chặn) | Q8, Q2 | KHỚP; phần "node dùng cache" theo L-06 | L-06 |
| Đ-31 | §4.4 Build & Preview | Manifest; trang render từ DOCX đã patch; kiểm tra; tab Content Diff tách Layout Diff | Q1 (ảnh 04), Q6, Q10 | KHỚP | Phase 4 |
| Đ-32 | §4.4 Xuất DOCX | Chỉ bật khi đạt chuẩn, **hoặc** có override được ghi nhận và **quyền rõ ràng** | Q5, Q6 | LỆCH | L-02, L-05, K-05 |
| Đ-33 | §4.5 History | Timeline; mở Build Snapshot cũ để tái dựng; tạo nhánh từ snapshot | Q12, Q1 (so sánh hai bản dựng) | LỆCH với Q12; THIẾU (QĐ) "tạo nhánh" | L-04, M-06 |
| Đ-34 | §5 ChangeRequest | id, sectionId, prompt, changeKind, status, createdAt | Q21, Q11 | THIẾU (spec): phạm vi nhiều Section, ngày cập nhật, liên kết build, giá trị cũ/mới | §1.4, P1-09 |
| Đ-35 | §5 BuildManifest, BuildArtifact | templateHash, sourceSnapshotIds, ruleVersions, selectedRevisions; checksum, layoutReport | Q10, Q11, Q17, Q21 | THIẾU (spec): mã B-xxx theo dự án; engine/phiên bản/font; danh sách CR đã bao gồm | §1.4 |
| Đ-36 | §5, §5.3 Version | Project.currentRecipeVersion; `recipe-vN.json`; `rules/<ruleId>/<version>.json` | Q17 | LỆCH (spec có 3 bộ đếm, Q17 nói 2) | L-12 |
| Đ-37 | §5.2 `approval.reviewer` | Ghi người duyệt | Q5 | LỆCH nhẹ | L-05 |
| Đ-38 | §5 LayoutIssue.severity | Mức độ lỗi bố cục | Q6 | KHỚP (dùng mức độ để cảnh báo mạnh hơn, không chặn) | L-02 |
| Đ-39 | §5.1 chính sách `resolve` | "latest-effective-date; ties are errors" | Q9 | KHỚP | — |
| Đ-40 | §5.1 `requiresHumanReview`; §6.3 | Gặp mơ hồ thì hỏi lại; UI nêu phương án và hậu quả | Q9 | LỆCH một phần (Q9: dừng và sửa dữ liệu, không chọn trong app) | L-08 |
| Đ-41 | §5.3 Thư mục dự án | Lưu theo nội dung (content-addressed); `builds/`, `runs/`, `project.sqlite` | Q11, Q12, Q13 | KHỚP; cần quy tắc xóa file (Q12) và đặt tên build theo B-xxx | L-04, §4.2 |
| Đ-42 | §6.1–6.2 Pipeline NL → IR | AI phân tích ý định, đề xuất plan; người dùng xác nhận; biên dịch IR; chạy sandbox | K-04 | THIẾU (QĐ) | K-04 |
| Đ-43 | §6.4 Executor an toàn | Không `eval`; sandbox; không chạy macro; test giá trị biên | — | KHỚP (áp dụng nguyên văn) | R-04 |
| Đ-44 | §7.1 Đồ thị | Rule 04 dùng Section 02 **và** 03 | Q19 | LỆCH | L-01 |
| Đ-45 | §7.2 Ba chế độ chạy | Selected (cần upstream hợp lệ); Affected (bỏ qua node có fingerprint không đổi); Full (chạy lại mọi Rule, tạo Run mới) | Q8, Q2 | KHỚP về chế độ; LỆCH ở ý "bỏ qua node" | L-06 |
| Đ-46 | §7.3 Fingerprint | Dùng cache khi fingerprint khớp; output trùng thì giữ Patch cũ; đổi rule viết nhận xét thì phải chạy lại | Q2, Q3 | LỆCH với Q2; ý "đổi rule thì chạy lại" KHỚP Q3 | L-06 |
| Đ-47 | §8.1–8.2 Anchor và Patch | Không cắt ghép theo trang; anchor ưu tiên bookmark/content control có sẵn, nếu không có thì ánh xạ nội bộ; danh sách lệnh Patch | Q10 | KHỚP. Lưu ý: Q10 thêm bookmark vào **bản sao**, vậy bookmark có còn trong DOCX xuất ra không? | M-04, P0-08 |
| Đ-48 | §8.3 cổng đầu của build | "All required results valid and approved?" | Q2, Q4, Q5 | KHỚP | — |
| Đ-49 | §8.3 bước "Layout approved?" | Bố cục chưa được duyệt thì sửa và build lại | Q6, Q7 | LỆCH | L-02, L-07, L-14 |
| Đ-50 | §8.4 Phân loại diff | Value / Content / Table / Layout Diff / Layout Problem ("cần xem lại trước khi export") | Q6 | KHỚP, hiểu "cần xem lại" là cảnh báo | L-02 |
| Đ-51 | §8.5 Chính sách bố cục | NATURAL_REFLOW (mặc định) / PRESERVE_TEMPLATE_BREAKS / STRICT_LAYOUT; preview dùng cùng engine với build; ghi font | Q6, Q10 | KHỚP về engine và font; THIẾU (QĐ) chọn chính sách mặc định | K-13 |
| Đ-52 | §8.6 Ca biên | Danh sách ca biên DOCX cần ưu tiên kiểm thử | K-03 | KHỚP; đưa vào corpus | P0-02 |
| Đ-53 | §9.1 Thành phần | UI Electron + React + TS; backend; SQLite | Quyết định xây app | KHỚP | §4 |
| Đ-54 | §9.2 DOCX và render | Sửa DOCX: docx4j / Open XML SDK / engine thương mại; render: Aspose.Words / tự động hóa Word | Q10 | LỆCH | L-03 |
| Đ-55 | §9.2 Excel và tính toán | openpyxl hoặc ExcelJS; executor Python/SQL, có thể dùng DuckDB | — | THIẾU (QĐ): ngôn ngữ backend | K-07, K-08 |
| Đ-56 | §9.2 AI adapters | Claude CLI, Codex CLI, API | — | THIẾU (QĐ) | K-04 |
| Đ-57 | §9.3 Ranh giới module | ui / core / adapters / infra | — | KHỚP | §4.1 |
| Đ-58 | §9.4 API | Danh sách lệnh chính; validation, capability scoping, error codes, audit | Q5 | KHỚP: capability là quyền của thành phần/agent, không phải vai trò người dùng | P1-02 |
| Đ-59 | §10 AI và phân quyền | 6 vai trò AI; mọi Agent làm việc qua tool có quyền cụ thể | Q5, K-04 | THIẾU (QĐ), phụ thuộc K-04; không mâu thuẫn Q5 | K-04 |
| Đ-60 | §11 Lưu ngữ cảnh lâu dài | Recipe, Snapshot, Decision, Section, Run và Build | Q12 | LỆCH (phạm vi «Xóa sạch») | L-04 |
| Đ-61 | §12.1 AC1 | Hash V0 không đổi qua 10 lần build | — | KHỚP | P1-12, P1-17 |
| Đ-62 | §12.1 AC2 | Nhận ≥5 Section; sửa ranh giới không làm mất block | Q13 | KHỚP | P1-06 |
| Đ-63 | §12.1 AC3 | Đổi qty thì 02–05 stale; 01 là thay đổi trực tiếp | Q2, Q4 | KHỚP; bổ sung: Phần 01 "Chờ duyệt" | Phase 2 |
| Đ-64 | §12.1 AC4 | Chỉ chạy 02 thì 03–05 vẫn stale, build bị chặn | Q8 | KHỚP | Phase 2 |
| Đ-65 | §12.1 AC5 | Chạy Affected theo thứ tự 02→03→04→05 | Q19 | LỆCH | L-01 |
| Đ-66 | §12.1 AC6–7 | Chạy Full tạo Run mới, giữ version cũ; đổi Excel chỉ ảnh hưởng Rule phụ thuộc nguồn đó | Q16 | KHỚP | Phase 2 |
| Đ-67 | §12.1 AC8 | Hai dòng trùng thời điểm thì báo mơ hồ, không chọn tùy tiện | Q9 | KHỚP (dừng Section) | L-08 |
| Đ-68 | §12.1 AC9 | Sửa mô tả Rule tạo version mới; output đã duyệt không đổi cho tới khi chạy và duyệt | Q3, Q18 | KHỚP; có rủi ro bị bỏ qua khi sửa tay | L-11 |
| Đ-69 | §12.1 AC10 | ≥2 Revision đã duyệt + 1 Section không đổi; build không làm mất định dạng | — | KHỚP | P1-12 (một phần), Phase 4 |
| Đ-70 | §12.1 AC11–12 | Chèn/rút ngắn nội dung thì vị trí cập nhật; chuyển trang không bị coi là Content Diff; không sinh trang trắng | Q6, Q7 | KHỚP về diff; bổ sung hệ quả Q7 (thu hồi duyệt Section bị dịch trang) | L-07 |
| Đ-71 | §12.1 AC13 | Xuất DOCX, mở lại, trích số liệu đối chiếu với Data Registry | — | KHỚP | Phase 4 |
| Đ-72 | §12.1 AC14 | Lỗi layout nghiêm trọng thì chặn xuất hoặc yêu cầu override có căn cứ | Q6 | LỆCH | L-02 |
| Đ-73 | §12.1 AC15 | Mở Build Snapshot cũ để tái dựng | Q12 | LỆCH (chỉ làm được khi bản đó chưa bị xóa) | L-04 |
| Đ-74 | §12.2 Bộ tài liệu kiểm thử | 6 nhóm mẫu DOCX/Excel | K-03 | THIẾU (QĐ): người dùng cung cấp mẫu | K-03, P0-02 |
| Đ-75 | §12.3 Chỉ số chất lượng | Correctness, Traceability, Layout regressions, Recoverability, Editing ergonomics | Q13, Q12 | THIẾU (QĐ): chưa có mục tiêu số; Recoverability phụ thuộc L-04 | K-15 |
| Đ-76 | §13 Roadmap | Phase 0–5 | — | KHỚP (dùng làm khung cho §3) | §3 |
| Đ-77 | §14 Mockup | HTML + 4 ảnh + `concept_*.png` | Q1 | THIẾU: [QS] trong `docs/` không có file `concept_*.png` nào | M-07 |
| Đ-78 | §15 | 6 quyết định cần chốt khi bắt đầu lập trình | — | THIẾU (QĐ) | K-01..K-06 |

### 1.2 Theo từng quyết định Q1–Q21

| Q | Quyết định (tóm tắt, theo 07) | Mục spec liên quan | Kết luận | Mã |
|---|---|---|---|---|
| Q1 | Mọi chức năng trong ảnh là cần có; không có nguồn giao diện chuẩn | §4, §14 | KHỚP phần lớn; LỆCH/THIẾU về bố cục | L-13 |
| Q2 | Stale theo sự kiện; đặt lại giá trị cũ không hết stale; chỉ Run xóa stale; sau Run phải duyệt lại | §2.2, §3.2, §7.2, §7.3 | LỆCH | L-06 |
| Q3 | Lưu version Recipe mới thì 02–05 stale | §3.2 ý 4, §7.3 | KHỚP (cần tổng quát hóa khi có nhiều Rule) | L-06 |
| Q4 | Phần 01 cần duyệt | §1.2 Explicit approval, §12.1 AC3 | KHỚP; THIẾU (spec) | §1.4 |
| Q5 | Không có vai trò; duyệt từng Section và duyệt tất cả | §15.5, §4.2, §4.4, §5.2 | LỆCH | L-05 |
| Q6 | Layout Diff chỉ cảnh báo, không ngoại lệ; lỗi nặng cảnh báo mạnh hơn | §4.4, §8.3, §12.1 AC14 | LỆCH | L-02 |
| Q7 | Phân trang đổi thì thu hồi duyệt; build bị chặn gián tiếp | §1.2, §3.1, §8.3, §8.4 | LỆCH | L-07 |
| Q8 | Cho chạy riêng một Section (Single) | §7.2 Selected, §3.2 ý 3 | KHỚP | — |
| Q9 | Nhiều dòng hợp lệ chọn ngày hiệu lực mới nhất; hòa/thiếu thì dừng, không ghi kết quả/Run | §5.1, §6.3, §3.1, §12.1 AC8 | KHỚP cốt lõi; LỆCH chi tiết | L-08 |
| Q10 | P1 + bộ định vị Section trên bản sao + LibreOffice headless; ghi engine vào manifest | §9.2, §8.2, §8.5, §13 | LỆCH (khác danh sách công nghệ của spec) | L-03 |
| Q11 | Mã bản dựng B-xxx đếm theo dự án, không tái dùng | §5 BuildManifest, §5.3 | THIẾU (spec) | §1.4 |
| Q12 | Lưu bền; ai cũng xem/xóa; xóa từng bản ghi và «Xóa sạch» | §1.2, §4.5, §11, §12.1 AC15 | LỆCH | L-04 |
| Q13 | Không giới hạn kích thước, số Section, số nguồn | §12.3 | KHỚP; THIẾU mục tiêu đo | L-10, K-15 |
| Q14 | Chỉ tiếng Việt | Toàn spec (có nhãn tiếng Anh) | KHỚP, có ghi chú | L-09 |
| Q15 | Được đổi template của dự án đã có lịch sử | §1.2 Immutable template | THIẾU (spec) | §1.4 |
| Q16 | Nguồn đổi version thì đánh dấu stale kèm lý do, không tự chạy | §2.2, §12.1 AC7 | KHỚP (cách xác định stale thuộc L-06) | L-06 |
| Q17 | Hai bộ đếm: bản dựng và version Rule | §5, §5.3 | LỆCH (spec có 3 bộ đếm) | L-12 |
| Q18 | Sửa tay version/trạng thái Rule; version tay chỉ là nhãn | §3.1, §3.2, §7.3 | LỆCH | L-11 |
| Q19 | 03 và 04 song song; công thức 04 [MỞ] | §7.1, §12.1 AC5 | LỆCH | L-01 |
| Q20 | Nhiều nguồn Excel/DOCX; cách dùng định nghĩa trong Rule; đếm liên kết hợp lệ/tổng | §1.1(2), §1.1(6), §5 DataBinding | KHỚP; THIẾU (QĐ) về PDF | M-03 |
| Q21 | CR có trạng thái, phạm vi, ngày cập nhật; CR gắn với build | §5 ChangeRequest | THIẾU (spec) | §1.4 |

### 1.3 Chi tiết điểm lệch và phương án (chờ người dùng chốt)

> Nguyên tắc trình bày: mỗi mục nêu **spec nói gì**, **người dùng đã quyết gì**, **xung đột cụ thể**, **phương án** và **đề xuất của BA**. Đề xuất chỉ để tham khảo; **người dùng là người chốt**. Nếu người dùng muốn một nguyên tắc chung (ví dụ "khi lệch thì quyết định Q ưu tiên hơn spec"), xem M-00.

#### L-01 — Q19 (03 và 04 song song) so với spec §7.1, §12.1 AC5
- **Spec:** đồ thị §7.1 có `S2 → R4` và `S3 → R4`, tức Lợi nhuận dùng Doanh thu và Chi phí. AC5 yêu cầu chạy Affected theo thứ tự 02→03→04→05.
- **Người dùng:** chọn song song 01→02→{03,04}→05. Công thức Phần 04 vẫn **[MỞ]**; 07 §H.11 đề xuất Lợi nhuận = Doanh thu × (1 − tỷ lệ chi phí), chưa được xác nhận.
- **Xung đột:** khác nhau ở đồ thị, ở công thức Phần 04 và ở thứ tự trong AC5.
- **Nhận xét kiến trúc:** trong app thật, phụ thuộc được lấy từ `inputs`/`dependsOn` của Saved Rule (spec §5.1, §7). Đồ thị **là dữ liệu**, không cố định trong mã như `stale()` của prototype. Vì vậy Q19 chỉ quyết định **Recipe mẫu** (dự án minh họa và bộ nghiệm thu), không quyết định kiến trúc.
- **Phương án:**
  - **A (theo Q19, công thức [ĐX]):** Rule 04 dùng S2 và tỷ lệ chi phí (Excel 2). AC5 sửa thành "02 → {03, 04} (thứ tự bất kỳ hoặc song song) → 05". Đổi tỷ lệ vẫn làm 03, 04, 05 stale.
  - **B (theo spec):** Rule 04 = Doanh thu − Chi phí (dùng S3), thành chuỗi tuyến tính. Phương án này trái Q19.
  - **C:** song song, nhưng người dùng đưa công thức khác cho Phần 04.
- **Đề xuất BA:** engine DAG tổng quát là bắt buộc với cả ba phương án. Recipe mẫu theo A nếu người dùng xác nhận công thức. Cần chốt cách làm tròn (K-14), vì làm tròn từng bước có thể khiến "Doanh thu × (1 − r)" lệch 1 đồng so với "Doanh thu − Doanh thu × r".
- **Câu hỏi:** «Đồng ý Lợi nhuận = Doanh thu × (1 − tỷ lệ chi phí) để Phần 04 độc lập với Phần 03 không? Nếu không, công thức Phần 04 là gì?»
- **Ảnh hưởng:** Phase 2 (Recipe mẫu, AC5). Không chặn Phase 0–1.

#### L-02 — Q6 (Layout Diff chỉ cảnh báo) so với spec §4.4, §8.3, §8.4, §12.1 AC14, §3.1
- **Spec:**
  - §4.4: chỉ bật «Xuất DOCX» khi đạt chuẩn, hoặc có override được ghi nhận và có quyền rõ ràng.
  - §8.3: có bước "Layout approved? No → sửa và build lại".
  - §8.4: Layout Problem là "issue cần xem lại trước khi export".
  - AC14: lỗi layout nghiêm trọng thì chặn xuất hoặc yêu cầu override có căn cứ.
  - §3.1: Build có trạng thái `LAYOUT_REVIEW`.
- **Người dùng:** Layout Diff **luôn chỉ cảnh báo, không ngoại lệ**; lỗi nặng (bảng tràn, trang trắng) cảnh báo mạnh hơn (07 §H.13).
- **Phương án:**
  - **A (theo Q6):** LayoutIssue có ba mức: Thông tin / Cảnh báo / Cảnh báo nặng. Không mức nào chặn Xuất DOCX. Danh sách cảnh báo tại lúc xuất được ghi vào `layout-report` và manifest, để giữ tính kiểm toán của spec. AC14 thay bằng: "lỗi nặng hiển thị nổi bật, được ghi vào layout-report và manifest; Xuất DOCX vẫn bật khi cổng stale/duyệt đạt".
  - **B (theo spec):** chặn xuất khi có lỗi nặng; cho override kèm lý do. Phương án này trái Q6.
  - **C (trung gian):** không chặn, nhưng khi có cảnh báo nặng thì hiện hộp "Vẫn xuất?" (một cú bấm, không cần lý do).
- **Đề xuất BA:** A, đúng Q6 đã xác nhận ở vòng 4. C là tùy chọn nếu người dùng muốn thêm một bước xác nhận.
- **Lưu ý:** build vẫn có thể bị chặn **gián tiếp** qua Q7 (L-07).
- **Ảnh hưởng:** Phase 4.

#### L-03 — Q10 (patch OOXML + LibreOffice headless) so với spec §9.2
- **Spec §9.2:**
  - Sửa DOCX bằng "OOXML via docx4j / Open XML SDK / commercial engine".
  - Render toàn tài liệu: "đánh giá Aspose.Words, Word automation".
  - **Spec không nêu LibreOffice.**
  - §13 Phase 0: chốt document engine **sau** khi thử nghiệm.
- **Người dùng (07 §H.7):**
  - Chọn P1: patch OOXML trên bản sao V0.
  - Bộ định vị Section chỉ thêm vào bản sao.
  - Render bằng LibreOffice headless.
  - Manifest ghi "theo engine X phiên bản Y".
  - Làm spike trên «Kế hoạch kinh doanh 2027.docx».
  - Thư viện còn [MỞ], phụ thuộc ngôn ngữ backend.
- **Xung đột:**
  - Engine render được chọn nằm ngoài danh sách của spec.
  - Thư viện mà spec gợi ý cần runtime thứ hai bên cạnh Electron/Node: docx4j cần Java, Open XML SDK cần .NET.
  - Spec muốn chốt engine sau Phase 0, còn Q10 đã chốt trước.
- **Phương án:**
  - **A (theo Q10):** patch ở mức XML (thư viện theo K-07/K-08) + LibreOffice headless. Bộ render là một Port (Strategy) để có thể thay sau. Phase 0 đo chênh lệch với Word để **xác nhận** Q10.
  - **B:** như A, thêm "Word automation" trên macOS chỉ để đối chiếu trong kiểm thử, không nằm trong luồng build. [QS] máy hiện có Microsoft Word for Mac 16.109.3.
  - **C:** engine thương mại (ví dụ Aspose.Words). Có chi phí giấy phép và cần runtime .NET/Java hoặc dịch vụ đám mây (dữ liệu rời máy). Phương án này trái hướng Q10.
- **Đề xuất BA:** A; dùng B chỉ ở Phase 0 và QA. Đặt tiêu chí mở lại Q10 nếu Phase 0 cho kết quả dưới ngưỡng K-02.
- **Câu hỏi:** «Giữ LibreOffice làm engine duy nhất của app và dùng Word trên máy chỉ để đối chiếu khi kiểm thử, đồng ý không? Nếu Phase 0 cho thấy chênh lệch số trang vượt ngưỡng K-02, có xem xét lại engine không?»
- **Ảnh hưởng:** Phase 0 (spike) và Phase 4.

#### L-04 — Q12 (xóa từng bản ghi + «Xóa sạch») so với spec §1.2, §4.5, §11, §12.1 AC15, §5.3
- **Spec:**
  - Build phải tái lập được (Reproducible builds) và kết quả phải kiểm toán được (Auditable).
  - §4.5: mở Build Snapshot cũ để tái dựng.
  - §11: lưu lâu dài Recipe, Snapshot, Decision, Run và Build.
  - AC15: mở snapshot cũ để tái dựng.
  - §5.3: artifact lưu theo nội dung (một snapshot nguồn có thể được nhiều build dùng chung).
- **Người dùng (07 §H.14):**
  - Lịch sử lưu bền; ai cũng xem và xóa được.
  - Người dùng tự xóa từng bản ghi và có chức năng «Xóa sạch».
  - Bản ghi bất biến về nội dung.
  - Còn [MỞ nhỏ]: phạm vi «Xóa sạch», thời gian lưu, hệ quả của việc xóa với trạng thái Section.
- **Xung đột:**
  - Xóa làm mất khả năng tái lập và kiểm toán.
  - Có thể xóa một Run hoặc Revision mà trạng thái hiện hành đang dựa vào.
  - Có thể xóa file artifact mà bản ghi khác còn dùng chung.
- **Phương án xóa:**
  - **A (xóa cứng):** xóa bản ghi và mọi file không còn tham chiếu. Mã không tái dùng. Hộp xác nhận nêu phạm vi và ghi "không hoàn tác". Không để lại dấu vết.
  - **B (xóa mềm):** chỉ ẩn khỏi giao diện; dữ liệu vẫn còn trên đĩa và có thể dọn vĩnh viễn sau. Giữ được tái lập, nhưng có thể không đúng với kỳ vọng "xóa" của người dùng.
  - **C (xóa kèm bản ghi tối thiểu):** xóa nội dung và file, chỉ giữ một dòng gồm mã, loại, thời điểm xóa và hash. Nhờ đó mã không bị tái dùng; lịch sử hiển thị "B-012 (đã xóa)"; khi so sánh hoặc tái dựng thì báo rõ đó là bản đã xóa.
- **Quy tắc toàn vẹn cần chốt (áp dụng cho mọi phương án):**
  - (i) Khi xóa một bản ghi mà trạng thái hiện hành đang dùng:
    - (i-a) chặn xóa và nêu lý do; hoặc
    - (i-b) cho xóa và đưa Section liên quan về "Cần tính lại" / "Chưa chạy", đúng tinh thần Q2.
  - (ii) Chỉ xóa file artifact khi không còn bản ghi nào tham chiếu (đếm tham chiếu).
  - (iii) «Xóa sạch» **không** xóa Template V0 và nguồn (đề xuất của 07 §H.14). Đề xuất mở rộng: cũng không xóa Recipe/Rule, vì đó là định nghĩa chứ không phải lịch sử.
- **Đề xuất BA:** C + (i-b) + (ii) + (iii). Hộp xác nhận phải nêu rõ hệ quả với các Section bị ảnh hưởng.
- **Câu hỏi:**
  - «Khi xóa, giữ lại một dòng tối thiểu "đã xóa" (mã, thời điểm) để không tái dùng mã và để lịch sử dễ hiểu (C), hay xóa không để lại dấu vết (A)?»
  - «Xóa một Run đang được Section sử dụng thì Section quay về "Cần tính lại" (i-b), hay app chặn việc xóa (i-a)?»
  - ««Xóa sạch» có giữ Template V0, nguồn và Recipe/Rule không?»
  - «Thời gian lưu là bao lâu?»
- **Ảnh hưởng:** Phase 1 (P1-14 chờ L-04) và Phase 4 (xóa build, tái dựng).

#### L-05 — Q5 (không có vai trò) so với spec §15.5, §4.4, §4.2, §5.2
- **Spec:**
  - §15.5: ai được duyệt số liệu và layout; có cho override không.
  - §4.4: override cần "quyền rõ ràng".
  - §4.2: mã hiển thị chỉ đọc hay chỉnh sửa được "theo quyền".
  - §5.2: lưu `approval.reviewer`.
- **Người dùng:** Q5 không có vai trò, duyệt từng Section và duyệt tất cả. Q12: ai cũng xem và xóa được.
- **Phương án:**
  - **A (theo Q5):** không đăng nhập, không vai trò. Bản ghi duyệt lưu thời điểm và phạm vi; trường reviewer là hằng "người dùng ứng dụng". "Theo quyền" (§4.2) nghĩa là ai cũng sửa được. Không có override, nhất quán với L-02 và K-05.
  - **B:** như A, thêm **tên hiển thị** tùy chọn, cấu hình một lần trên máy (không phải quyền), để lịch sử ghi được "ai đã làm". Không chặn thao tác nào.
  - **C (theo spec):** có vai trò và quyền. Phương án này trái Q5.
- **Đề xuất BA:** A; chọn B nếu người dùng muốn lịch sử ghi tên người.
- **Lưu ý phạm vi:** app là desktop, offline-first (mặc định đề xuất của spec §15). Vì vậy "ai cũng" nghĩa là những người dùng mở cùng thư mục dự án trên máy. Nhiều người mở một dự án cùng lúc nằm ngoài MVP (spec §1.3), nên app khóa dự án khi đang mở (P1-03).
- **Ảnh hưởng:** Phase 1 (dữ liệu duyệt).

#### L-06 — Q2 (stale theo sự kiện) và Q16, Q3 so với spec §2.2, §3.2, §7.2, §7.3 (fingerprint, bỏ qua node không đổi)
- **Spec:**
  - §2.2 bước 2: so input fingerprint để xác định chính xác Rule/Section không còn hợp lệ.
  - §7.2: chế độ Affected bỏ qua node có fingerprint không đổi.
  - §7.3: chỉ dùng cache khi fingerprint khớp; input đổi mà output trùng thì có thể giữ Section Patch cũ.
  - §3.2 ý 5: hash/giá trị không đổi thì tránh diff thừa, nhưng vẫn ghi Run.
- **Người dùng:**
  - Q2: stale theo **sự kiện** cam kết đầu vào khác giá trị hiện hành. Đặt lại giá trị cũ **không** hết stale. Chỉ Run mới xóa stale, và sau Run **phải duyệt lại** (07 §B.1).
  - Q16: nguồn đổi version thì stale, không tự chạy.
  - Q3: lưu version mới thì stale.
- **Ví dụ xung đột:** qty đổi 12.000 → 15.000 → 12.000.
  - Theo spec: fingerprint bằng lần đã duyệt, nên không stale (hoặc Affected dùng cache và giữ duyệt).
  - Theo Q2: 4 Section stale; phải Run rồi duyệt lại.
- **Phương án:**
  - **A (theo Q2; fingerprint chỉ dùng cho cache và tái lập):** stale được xác định theo sự kiện. Khi Run một node stale có fingerprint trùng kết quả đã có, executor **được tái dùng kết quả** (không tính lại phép nặng) nhưng vẫn tạo Run/RunStep ghi "dùng lại kết quả", và kết quả về "Chờ duyệt". Không tạo Content Diff mới nếu output trùng (đáp ứng spec §3.2 ý 5). Affected chạy mọi node stale theo sự kiện, không bỏ qua node vì fingerprint.
  - **B (theo spec):** fingerprint quyết định stale; đặt lại giá trị cũ thì hết stale và khôi phục duyệt. Phương án này trái Q2.
  - **C (lai):** stale theo sự kiện, nhưng nếu Run cho fingerprint trùng một Revision đã duyệt thì tự khôi phục "Hợp lệ", không cần duyệt lại. Phương án này trái ý "phải duyệt lại" của Q2.
- **Đề xuất BA:** A.
- **Điểm phụ [MỞ nhỏ]:**
  - (a) **Độ mịn sự kiện nguồn (Q16).** Có hai cách: tính sự kiện theo cả file nguồn (đúng chữ Q16), hoặc chỉ khi sheet/vùng mà Binding dùng thay đổi. AC7 của spec ("không ép chạy Rule không liên quan") vẫn thỏa ở mức file. Đề xuất: mức file; mức vùng để Phase 5.
  - (b) **Tổng quát hóa Q3 khi có nhiều Rule.** Lưu version mới của Rule X thì stale các Section dùng Rule X và mọi node downstream của chúng, chứ không phải toàn bộ 02–05 như prototype đang làm. Cần người dùng xác nhận.
- **Câu hỏi:** «Dùng fingerprint chỉ để tái dùng phép tính và tái lập; trạng thái "Cần tính lại" vẫn theo sự kiện như Q2 (phương án A), đồng ý không?»
- **Ảnh hưởng:** Phase 2.

#### L-07 — Q7 (thu hồi duyệt khi phân trang đổi) so với spec §1.2 "Section ≠ page", §3.1, §4.4, §8.3, §8.4, AC11
- **Spec:**
  - Trang chỉ xác định được sau khi render.
  - Layout Diff hiển thị badge "Dịch trang" và "không coi là sửa chữ".
  - Trạng thái kết quả "không phải trạng thái bố cục" (§3.1).
  - Bố cục được duyệt ở mức **bản build** (§8.3 "Layout approved?"; trạng thái `LAYOUT_REVIEW`).
- **Người dùng (vòng 2, xác nhận "đúng ý"):** phân trang của Section đổi trong khi Content Diff rỗng thì thu hồi duyệt Section, Section về Chờ duyệt, build bị chặn gián tiếp.
- **Xung đột:**
  1. Trạng thái bố cục bị trộn vào trạng thái duyệt nội dung của Section.
  2. Bố cục được duyệt ở mức Section thay vì mức build.
  3. Chưa có **mốc so sánh** (baseline), dẫn tới nguy cơ vòng lặp: build → thu hồi → duyệt → build → …
  4. Chèn một đoạn dài vào Phần 01 (AC11) sẽ thu hồi duyệt của **mọi** Section phía sau.
  5. Phân trang theo LibreOffice có thể khác Word (L-03, R-03), nên có thể thu hồi duyệt vì một khác biệt mà người dùng không thấy trong Word.
- **Phương án:**
  - **A (theo Q7, có định nghĩa mốc):**
    - Mỗi lần duyệt Section, lưu "vị trí trang đã duyệt" (trang đầu/cuối theo engine X phiên bản Y) nếu có.
    - Khi render build: Section có Content Diff rỗng nhưng vị trí khác mốc thì bị thu hồi duyệt, với lý do "Thay đổi phân trang (trang 7→8)".
    - Duyệt lại sẽ cập nhật mốc và **không cần chạy lại hay render lại** khi manifest không đổi, nên không có vòng lặp.
    - Lần render đầu tiên (chưa có mốc) chỉ tạo mốc, không thu hồi.
    - Section có nội dung mới vừa được duyệt trước khi render thì lấy vị trí của lần render này làm mốc, không thu hồi [ĐX].
  - **B (giữ hiệu ứng Q7, tách trạng thái như spec):** Section có thêm trạng thái riêng "Chờ xác nhận bố cục", không đụng tới trạng thái duyệt nội dung. Cổng xuất yêu cầu xác nhận hết. Người dùng thấy hiệu ứng như Q7, còn mô hình dữ liệu vẫn tách như spec §3.1.
  - **C (theo spec):** chỉ duyệt bố cục ở mức build, không thu hồi duyệt Section. Phương án này trái Q7.
- **Đề xuất BA:** A, vì đúng Q7 đã được xác nhận hai lần, cộng định nghĩa mốc như trên. Chọn B nếu người dùng chấp nhận một trạng thái mới.
- **Phụ thuộc kỹ thuật:** cần trích được trang bắt đầu của từng Section từ bản render LibreOffice; việc này được kiểm chứng ở P0-08 và P0-09. Nếu không khả thi, Q7 không thực hiện được đúng nghĩa và phải hỏi lại người dùng.
- **Câu hỏi:**
  - «Mốc so sánh phân trang là vị trí trang tại lần Section được duyệt gần nhất, và duyệt lại không cần render lại, đồng ý không?»
  - «Khi sửa Phần 01 làm mọi Section phía sau dịch trang thì phải duyệt lại tất cả (có nút "Duyệt tất cả"), chấp nhận không?»
- **Ảnh hưởng:** Phase 0 (tính khả thi), Phase 4. Chi tiết luồng ở Phụ lục B.

#### L-08 — Q9 (hòa/thiếu thì dừng) so với spec §5.1, §3.1, §6.3, §1.2 Safe defaults
- **KHỚP ở cốt lõi:** spec ghi "latest-effective-date; ties are errors", "dừng hoặc yêu cầu duyệt; không tự bịa số" (§1.2), và có AC8.
- **LỆCH ở chi tiết:**
  1. Spec có trạng thái kết quả `FAILED` và `RunStep.errors`, tức Run được ghi lại cả khi lỗi. Q9 nói "không ghi kết quả/Run".
  2. Spec §5.1 có `requiresHumanReview: ambiguous-match, missing-price`, và §6.3 yêu cầu UI nêu "các phương án, hậu quả", ngụ ý người dùng chọn phương án ngay trong app. Q9 yêu cầu dừng cho tới khi người dùng **sửa dữ liệu**.
- **Phương án:**
  - **A:** lần chạy lỗi được ghi thành "Sự kiện lỗi chạy": không đánh số Run, không có kết quả, không có Revision. Lịch sử vẫn hiển thị sự kiện này. Số Run chỉ dùng cho lần chạy thành công. UI chỉ rõ file, sheet, dòng và khóa tra (đáp ứng ý "chỉ đúng chỗ mơ hồ" của §6.3) nhưng không cho chọn dòng trong app.
  - **B:** Run có trạng thái "Lỗi" và có số Run, nhưng không ghi kết quả/Revision. Phương án này lệch chữ "không ghi Run".
  - **C:** cho người dùng chọn một dòng trong app và ghi lại thành Decision. Phương án này trái Q9.
- **Đề xuất BA:** A. Ngoài ra, khi chạy Affected/Full, các Section không phụ thuộc Section lỗi vẫn chạy tiếp (07 §H.5 [ĐX]; cần người dùng xác nhận).
- **Ảnh hưởng:** Phase 2. Chính sách tra cứu được thử từ Phase 0 (P0-10).

#### L-09 — Q14 (chỉ tiếng Việt) so với nhãn tiếng Anh trong spec: KHỚP, có ghi chú
- **Spec:** viết bằng tiếng Việt nhưng có nhiều nhãn và trạng thái tiếng Anh (Selected Section, Affected Transitive Closure, Full Recipe, NATURAL_REFLOW, DRAFT, STALE, Change Tray…).
- **Prototype [QS]:** cũng hiển thị một số thuật ngữ tiếng Anh như "Dependencies & Run", "Content Diff", "Layout Diff".
- **Đề xuất BA:**
  - Mã trạng thái nội bộ giữ tiếng Anh và không hiển thị ra giao diện.
  - Mọi nhãn giao diện dùng tiếng Việt theo Phụ lục A.
  - Định dạng số và ngày theo `vi-VN`; không làm đa ngôn ngữ.
- **[MỞ nhỏ]:** giữ nguyên thuật ngữ sản phẩm đã dùng (Section, Recipe, Rule, Run, Build, Content Diff, Layout Diff, Template V0) hay Việt hóa hoàn toàn (Phần, Công thức tài liệu, Quy tắc, Lần chạy, Bản dựng, Khác biệt nội dung, Khác biệt bố cục, Mẫu V0)? Đề xuất: giữ như prototype vì người dùng đã quen.
- **Ảnh hưởng:** Phase 1 (nhãn giao diện).

#### L-10 — Q13 (không giới hạn) so với spec: KHỚP, nhưng THIẾU mục tiêu đo
- **Spec và Q13:** spec không đặt giới hạn; §12.3 có chỉ số chất lượng nhưng không có con số. Q13 quyết định không giới hạn.
- **Vấn đề:** "không giới hạn" thì không kiểm thử được. Thực tế LibreOffice, SQLite và bộ nhớ đều có giới hạn.
- **Đề xuất BA:** sản phẩm không đặt giới hạn cứng, nhưng có **mục tiêu kiểm thử** (K-15). Ví dụ [ĐX]: tài liệu 300 trang, 100 Section, 20 nguồn, Excel 50.000 dòng. Vượt mục tiêu thì app vẫn chạy nhưng không cam kết thời gian.
- **Ảnh hưởng:** Phase 0 (đo), Phase 2 và 4.

#### L-11 — Q18 (sửa tay version/trạng thái Rule) so với spec §3.1, §3.2, §7.3, §1.2
- **Spec:**
  - Vòng đời Rule: DRAFT → VALIDATED → APPROVED → DEPRECATED.
  - Sửa mô tả mà chưa biên dịch và duyệt version mới thì không được dùng mô tả mới như Rule đã thực thi.
  - Version bất biến (`rules/<ruleId>/<version>.json`).
- **Người dùng:**
  - Được sửa tay version (chỉ là nhãn, không trùng version cũ) và trạng thái.
  - Đổi sang Nháp thì Section dùng Rule bị stale và mất duyệt.
  - Đổi lại Đã duyệt không tự hết stale.
  - Rule Nháp không được chạy hay build.
- **Xung đột:**
  - "Version" vừa là định danh bất biến (spec) vừa là nhãn sửa tay (Q18).
  - Sửa tay sang Đã duyệt có thể bỏ qua bước biên dịch và kiểm thử (VALIDATED).
- **Phương án:**
  - **A:** tách hai khái niệm:
    - **Mã phiên bản nội bộ:** tự tăng, bất biến, dùng trong manifest và fingerprint.
    - **Nhãn phiên bản:** sửa tay, không trùng trong cùng Rule, dùng để hiển thị.
    - Trạng thái được sửa tay, nhưng muốn sang Đã duyệt thì Rule phải có kế hoạch thực thi biên dịch được. Mọi lần sửa tay đều ghi lịch sử.
  - **B:** sửa tay tự do, đúng chữ Q18, chỉ ghi lịch sử.
  - **C (theo spec):** phải qua kiểm thử mới được Đã duyệt; không cho sửa tay version.
- **Đề xuất BA:** A. Nhãn tiếng Việt cho VALIDATED và DEPRECATED xem Phụ lục A.
- **Ảnh hưởng:** Phase 2.

#### L-12 — Q17 (hai bộ đếm) so với spec §5, §5.3 (ba bộ đếm)
- **Spec có ba bộ đếm:**
  - Version của cả Recipe: `Project.currentRecipeVersion`, `recipe/recipe-vN.json`.
  - Version của từng Rule: `rules/<ruleId>/<version>.json`.
  - Số build: `builds/build-000N`.
- **Người dùng:**
  - Q17: "v2.3" (dự án/bản dựng) khác "v3" (Rule).
  - Q11: mã bản dựng là B-xxx theo dự án. Vì vậy kiểu "v2.3" trong ảnh 02 được thay bằng B-xxx.
- **Xung đột:** spec có thêm "Recipe version" cho cả tập Rule. Prototype gọi "Recipe v3" cho thứ thực chất là một `ruleV` dùng chung.
- **Phương án:**
  - **A (ba bộ đếm):**
    - Mã bản dựng B-xxx (Q11).
    - Phiên bản Recipe: tăng khi bất kỳ Rule, Binding hay quan hệ nào đổi; được ghi vào manifest.
    - Phiên bản từng Rule (Q18).
  - **B (hai bộ đếm):** bỏ Recipe version; manifest ghi danh sách version của từng Rule.
- **Đề xuất BA:** A, đúng spec §5.3 và giữ header "Recipe vN" như prototype. Chọn B nếu người dùng thấy ba bộ đếm gây rối.
- **Ảnh hưởng:** Phase 1 (hiển thị header), Phase 2 (Recipe), Phase 4 (manifest).

#### L-13 — Q1 (mọi chức năng trong ảnh là cần có) so với spec §4 (bố cục màn hình)
- **KHỚP phần lớn:** cả hai đều có 5 màn Workspace, Recipe Studio, Runner, Build & Preview, History.
- **LỆCH/THIẾU:**
  - **Ảnh có, spec không có:**
    - chat;
    - nav ngang (Trang chủ / Dự án / Mẫu tài liệu / Nguồn dữ liệu / Lịch sử);
    - "So sánh hai bản dựng";
    - checklist tiến độ;
    - 4 tab Rule: Định nghĩa · Thực thi & Kiểm thử · Lịch sử phiên bản · Sử dụng;
    - ở màn Build (ảnh 04): "Kiểm tra bố cục", "Trang đơn / Toàn bộ / So sánh".
  - **Spec có, ảnh không có:**
    - Change Tray;
    - 5 tab Recipe: AI diễn giải · Nguồn · Công thức · Kiểm thử · Quan hệ;
    - execution plan hiển thị trước khi chạy;
    - "tạo nhánh từ snapshot";
    - chính sách bố cục.
- **Phương án:**
  - **A (hợp nhất):** lấy 4 tab của ảnh làm khung và đặt nội dung tab của spec vào trong:
    - AI diễn giải, Nguồn, Công thức → tab Định nghĩa;
    - Kiểm thử → tab Thực thi & Kiểm thử;
    - Quan hệ → tab Sử dụng và đồ thị.
    - Giữ thêm Change Tray và execution plan.
  - **B:** theo spec, bỏ cấu trúc tab của ảnh. Phương án này trái Q1.
  - **C:** theo ảnh, bỏ các mục chỉ có trong spec.
- **Đề xuất BA:** A. Chat phụ thuộc K-04.
- **Ảnh hưởng:** Phase 1 (khung điều hướng, Workspace), Phase 3 (Recipe Studio).

#### L-14 — "Duyệt theo bản build" của spec §1.1(9), §3.1, §8.3: THIẾU (QĐ)
- **Spec:** duyệt theo phần **và theo bản build**. Build có trạng thái `LAYOUT_REVIEW → APPROVED → EXPORTED`.
- **Người dùng:** Q5 nói duyệt từng Section và duyệt tất cả; Q6 nói Layout chỉ cảnh báo. Chưa có quyết định nào về duyệt bản build.
- **Phương án:**
  - **A:** không có bước duyệt bản build riêng. Bấm «Xuất DOCX» khi cổng mở chính là xác nhận, và được ghi vào lịch sử.
  - **B:** có bước bắt buộc "Duyệt bản dựng" trước khi xuất. Bước này không bị Layout Diff chặn.
- **Đề xuất BA:** A, vì ít thao tác hơn và nhất quán với Q6. Chọn B nếu người dùng muốn tách bước xem trước và bước xuất.
- **Ảnh hưởng:** Phase 4.

### 1.4 THIẾU (spec): bổ sung vào đặc tả app theo quyết định đã chốt

Các mục sau không mâu thuẫn với spec, chỉ cần bổ sung vào đặc tả từng phase:
- **Q4:** mọi Section Revision đều phải "Chờ duyệt", dù sinh ra từ sửa trực tiếp hay từ Rule; Phần 01 chỉ là một trường hợp. Phần 01 tính vào cổng build.
- **Q11:** mã bản dựng B-001, B-002… đếm theo dự án, không tái dùng, có mô tả tự do. Hiển thị dạng «B-028 · Rule v3 · Mẫu V0 (hash…)». Prototype bắt đầu từ B-028 chỉ là dữ liệu mock.
- **Q21:** CR có các thuộc tính bắt buộc: trạng thái, phạm vi ảnh hưởng (danh sách Section hoặc Toàn bộ), ngày cập nhật, liên kết tới build. Ngoài ra lưu giá trị cũ/mới, Section đích và mã CR-xxx không tái dùng [ĐX]. Build liệt kê các CR đã bao gồm.
- **Q15:** đổi template = tạo Template mới (V1…) và ánh xạ lại Section. Các hệ quả 1–6 ở 07 §H.9 vẫn chờ duyệt; phase thực hiện xem M-05.
- **Q16 và Q2:** hiển thị lý do stale, ví dụ «Nguồn X đổi v1→v2» hoặc «Sản lượng đã thay đổi (12.000 → 15.000 → 12.000)».
- **Q10:** manifest ghi engine render, phiên bản engine, danh sách font và font bị thay thế. UI ghi rõ "số trang theo LibreOffice x.y".
- **Q20:** đếm "liên kết hợp lệ / tổng liên kết thật". Chính sách Q9 áp dụng cho cả tra cứu y theo khóa x.
- **Spec có, chưa có Q nhưng không trái Q nào; đề xuất áp dụng nguyên văn:** phát hiện vòng phụ thuộc (§3.2), hiển thị execution plan (§4.3), quy tắc an toàn của executor (§6.4), danh sách ca biên DOCX (§8.6).

---

## 2. Quyết định kỹ thuật cần người dùng chốt trước khi lập trình

**Đề xuất mặc định của spec §15:** "Electron desktop offline-first, template/source bất biến, rule executor local sandbox, human-approved section revisions, full-document render trước khi xuất, và release MVP tập trung vào đúng chất lượng xuất DOCX."

**Môi trường quan sát được trên máy người dùng ngày 2026-11-23 [QS]:**

| Hạng mục | Hiện trạng |
|---|---|
| Hệ điều hành | macOS (Darwin 24.2.0) |
| Node.js | v24.21.0 (cài qua nvm) |
| Package manager | npm 11.19.0, pnpm 11.26.0 |
| Python | 3.11.9 |
| LibreOffice | 25.2.5.2, có trong `/Applications` nhưng **không có trong PATH** |
| Microsoft Word for Mac | 16.109.3 |
| git | 2.39.5; thư mục dự án **chưa là git repo** |
| Xcode Command Line Tools | đã cài |
| Mẫu «Kế hoạch kinh doanh 2027.docx» | không tìm thấy |

| Mã | Câu hỏi | Mặc định của spec | Phương án và tác động | Đề xuất BA | Cần chốt trước |
|---|---|---|---|---|---|
| K-01 | Nền tảng phát hành (§15.1) | Electron desktop (không nêu hệ điều hành) | (a) **macOS trước**, Windows sau: chỉ cần một máy kiểm thử; dùng được Word for Mac để đối chiếu. (b) **macOS + Windows ngay**: cần máy Windows, đường dẫn LibreOffice và font khác nhau, ký số/notarize cho cả hai; Word Windows có thể phân trang khác Word Mac | (a); mã nghiệp vụ không dùng API riêng của macOS ngoài lớp adapter | Phase 1 |
| K-02 | Mức trung thực DOCX (§15.2) | Không cam kết khớp từng pixel (§1.3); ghi rõ phụ thuộc font (§8.5) | (a) **Chấp nhận sai khác nhỏ, có ngưỡng đo**: hợp với Q10. (b) **Gần như khớp Word tuyệt đối**: LibreOffice có thể không đạt, phải xét lại L-03 (Word automation hoặc engine thương mại) | Chọn (a). Ngưỡng [ĐX] để chốt sau Phase 0: mở bằng Word không mất style, đánh số, header/footer, bảng (100% với mẫu chính); số trang LibreOffice so với Word chênh ≤1 trang ở ≥80% tài liệu dưới 50 trang | Hướng: trước Phase 0. Ngưỡng: sau P0-12 |
| K-03 | Số mẫu thật và độ phức tạp (§15.3, §12.2) | 10–20 mẫu thật, 6 nhóm | Người dùng cung cấp ≥10 DOCX (bảng, header/footer, hình, TOC, nhiều section, trang ngang/dọc…), ≥2 Excel và **«Kế hoạch kinh doanh 2027.docx»** (hiện không có trên máy). Cần biết dữ liệu có nhạy cảm không, để không commit và không gửi ra ngoài | 12 mẫu (2 mẫu mỗi nhóm) + mẫu chính | **Chặn Phase 0** |
| K-04 | Thực thi Rule offline hay dùng LLM/API (§15.4, §6, §10; chat theo Q1) | Executor chạy cục bộ trong sandbox; AI adapter (Claude CLI, Codex CLI, API) | (a) **Offline hoàn toàn**: Rule nhập qua biểu mẫu/IR có cấu trúc; không có chat. (b) **Executor offline + LLM chỉ để đề xuất** (diễn giải lời, chat), bật theo từng dự án, có cảnh báo dữ liệu gửi ra ngoài. (c) **LLM cả khi thực thi**: không khuyến nghị, vì spec §10 nói "không tự tính lại tiền bằng LLM". Chat (Q1) chỉ có ở (b) | Chọn (b), nhưng chỉ từ Phase 3. Phase 0–2 không dùng LLM | Phase 2 (thiết kế IR) |
| K-05 | Quy tắc duyệt và override (§15.5) | Có quyền và có override (§4.4) | Theo Q5, Q6, Q9: không vai trò; **không có override nào trong MVP**. Layout chỉ cảnh báo; lỗi dữ liệu Q9 phải sửa nguồn; stale hoặc chưa duyệt luôn chặn build | Xác nhận "không override trong MVP" (liên quan L-02, L-05, L-07, L-14) | Phase 2 |
| K-06 | Có ghi ngược vào Excel không (§15.6) | Không sửa Excel nguồn gốc (§1.3, §6.4) | (a) Nguồn chỉ đọc, kết quả ghi vào DOCX. (b) Xuất kết quả ra một file Excel **mới**. (c) Ghi ngược vào nguồn: phá snapshot bất biến, và theo Q16 sẽ sinh version mới liên tục | (a); (b) để Phase 5 nếu cần | Phase 2 |
| K-07 | **Ngôn ngữ backend** (spec chưa chọn) | Orchestrator viết bằng TS (§9.2); Excel/tính toán có thể dùng Python | (a) **Node/TypeScript toàn bộ**: một ngôn ngữ, đóng gói Electron đơn giản. (b) **Python sidecar** (python-docx + lxml, openpyxl, DuckDB): thư viện OOXML/Excel trưởng thành, nhưng phải đóng gói Python runtime và có IPC giữa hai tiến trình. (c) **Java/.NET** (docx4j / Open XML SDK): phải kèm JVM/.NET | (a); nếu Phase 0 cho thấy thư viện Node không đủ cho một phần (patch phức tạp, Excel) thì chuyển riêng phần đó sang (b) | **Phase 0** (spike viết bằng ngôn ngữ nào) |
| K-08 | **Thư viện DOCX/Excel/PDF** (gắn Q10, K-07) | docx4j / Open XML SDK / thương mại; openpyxl / ExcelJS | **Node:** JSZip (đọc/ghi gói zip) + @xmldom/xmldom + xpath để patch XML giữ namespace. Không dùng gói `docx` (chỉ sinh tài liệu mới, tức P3) hay docxtemplater (cần placeholder, tức P2, trái V0 bất biến). ExcelJS hoặc SheetJS (lưu ý cách phân phối gói của SheetJS). pdfjs-dist để đọc số trang, chữ từng trang, bookmark/đích. decimal.js cho số tiền. **Python:** python-docx + lxml, openpyxl | Danh sách Node ở cột trước; chốt cuối sau Phase 0 | Phase 0 |
| K-09 | Package manager và toolchain | — | npm (có sẵn, ít cấu hình với Electron) hoặc pnpm (nhanh, tiết kiệm đĩa; với electron-builder thường phải cấu hình `node-linker=hoisted`) | npm, commit lockfile, ghim phiên bản Node bằng `.nvmrc`/`engines` | Phase 0 |
| K-10 | Kiểm thử tự động | — | Vitest (unit/integration cho core và adapter); Playwright (e2e Electron); golden test trên fixture ẩn danh; vẫn có bước mở thủ công bằng Word | Như cột trước. QA nay có test tự động | Phase 1 |
| K-11 | LibreOffice: cài riêng hay đóng gói kèm app | — | (a) Người dùng tự cài; app dò đường dẫn, cho cấu hình và kiểm tra phiên bản tối thiểu. (b) Đóng gói kèm app: bộ cài lớn, phải tự lo cập nhật bảo mật | (a); ghim phiên bản dùng để nghiệm thu; manifest ghi phiên bản | Phase 0 |
| K-12 | Font | Ghi rõ phụ thuộc font (§8.5) | Phase 0 liệt kê các font mà mẫu dùng; cài đủ trên máy dựng; cảnh báo khi font bị thay thế; manifest ghi danh sách font | Như cột trước | Trong Phase 0 |
| K-13 | Chính sách bố cục mặc định (§8.5) | NATURAL_REFLOW | NATURAL_REFLOW / PRESERVE_TEMPLATE_BREAKS / STRICT_LAYOUT; theo Q6, chính sách nào cũng chỉ sinh cảnh báo | NATURAL_REFLOW, có thể chọn theo dự án | Phase 4 |
| K-14 | Làm tròn tiền tệ và số học (01 §6, 03 B3; spec §6.2) | Cấu hình được độ chính xác và thứ tự làm tròn | Không dùng số thực dấu phẩy động cho tiền; dùng Decimal; làm tròn tới đồng khi nào; cấu hình theo Rule | Decimal; chỉ làm tròn ở bước ghi ra tài liệu; cấu hình theo Rule | Phase 2 (và L-01) |
| K-15 | Mục tiêu hiệu năng (Q13) | Không có | Xem L-10 | Số [ĐX] ở L-10; đo trong Phase 0 | Phase 2 |
| K-16 | Quản lý mã nguồn | — | [QS] dự án chưa là git repo | `git init` trước khi viết mã; `.gitignore` loại corpus nhạy cảm, dữ liệu dự án và output. Agent không tự commit nếu người dùng chưa yêu cầu | Phase 0 |
| K-17 | Vị trí thư mục dữ liệu dự án (§5.3) | `project/` | Người dùng chọn thư mục khi tạo dự án, nằm **ngoài** repo mã nguồn | Mặc định [ĐX]: thư mục "DocFlow" trong Documents của người dùng | Phase 1 |

---

## 3. Kế hoạch theo giai đoạn (dựa trên roadmap spec §13)

### 3.0 Điều kiện bắt đầu
- **Trước Phase 0:** chốt K-02 (hướng), K-03 (có corpus), K-07, K-08, K-09, K-11, K-16 và M-01 (đổi quy ước cho `app/` và `spikes/`).
- **Trước Phase 1:**
  - Báo cáo Phase 0 (P0-13) được người dùng chấp nhận.
  - Chốt K-01, K-10, K-17 và L-04, L-05, L-09, L-12, L-13.
- **Không chặn Phase 0–1:** L-01, L-02, L-03 (xác nhận lại sau Phase 0), L-06, L-07, L-08, L-11, L-14.

Mức ưu tiên dùng: **Cao / TB / Thấp**. Tên các file `docs/09…15` dưới đây là **đề xuất**; Main có thể đổi số thứ tự.

### 3.1 Phase 0 — Feasibility & DOCX corpus

**Mục tiêu:** chứng minh có thể parse, patch và render DOCX thật; đo độ trung thực, anchor và reflow; đo chênh lệch giữa LibreOffice và Word; kiểm chứng chính sách tra cứu Q9. **Phase 0 không xây UI.** Mã chỉ là spike, nằm ngoài `app/`.

**P0-01 · ba · Cao — Ghi nhận quyết định đầu vào Phase 0**
- *Mục tiêu:* có văn bản quyết định cho K-02 (hướng), K-03, K-07, K-08, K-09, K-11, K-16 và M-01.
- *Phạm vi:* file mới `docs/09_QuyetDinh_KyThuat_Phase0.md`. Không sửa spec, HTML, PNG.
- *Tiêu chí chấp nhận:*
  - Mỗi mục ghi câu hỏi, lựa chọn của người dùng, ngày chốt, phạm vi áp dụng.
  - Mục chưa chốt ghi [MỞ] và nêu task nào bị chặn.
- *Phụ thuộc:* người dùng trả lời §2 (qua Main).
- *QA kiểm tra:* QA đọc chéo khi lập test cho Phase 0.

**P0-02 · ba · Cao — Danh mục corpus và chú giải**
- *Mục tiêu:* có corpus 10–20 DOCX thật và các file Excel, kèm chú giải đủ để đo.
- *Phạm vi:*
  - `corpus/` chứa file do người dùng cung cấp; chỉ đọc.
  - `docs/10_Corpus_Phase0.md` chỉ chứa metadata (tên, sha256, nhóm §12.2, đặc điểm), không chép nội dung nhạy cảm.
- *Tiêu chí chấp nhận:*
  1. Có ≥10 DOCX; mỗi nhóm DOCX của §12.2 có ít nhất 1 mẫu.
  2. Có «Kế hoạch kinh doanh 2027.docx».
  3. Có ≥1 Excel đơn giá nhiều giai đoạn hiệu lực, trong đó có ≥1 khóa bị hòa ngày, ≥1 khóa thiếu, sheet ẩn và ô công thức. Nếu mẫu thật không có, tạo một bản sao chỉnh sửa và ghi rõ "mẫu dựng".
  4. Có sha256 của từng file.
  5. Mỗi DOCX có danh sách Section mong đợi (tiêu đề hoặc đoạn mở đầu) và số trang khi mở bằng Word (ghi phiên bản Word và máy).
  6. Mẫu chính có thêm 3 vùng patch mong muốn và giá trị mới.
- *Phụ thuộc:* K-03 (người dùng cung cấp file).
- *QA kiểm tra:* P0-11 tính lại sha256 và kiểm tra đủ nhóm.
- *Rủi ro:* dữ liệu nhạy cảm: không commit, không gửi ra ngoài.

**P0-03 · dev · Cao — Khung spike Phase 0**
- *Mục tiêu:* một dự án TypeScript/Node độc lập (hoặc ngôn ngữ chọn ở K-07) để chạy thí nghiệm bằng lệnh CLI. Đây không phải mã app.
- *Phạm vi:*
  - Được sửa: `spikes/phase0/**` (package.json, lockfile, tsconfig, `src/`, `tests/`, `out/` bị gitignore).
  - **Không đụng** `docs/`; `corpus/` chỉ đọc; không tạo `app/`.
- *Tiêu chí chấp nhận:*
  1. `npm ci` rồi `npm test` chạy xanh trên Node theo `.nvmrc`.
  2. Có các lệnh `npm run parse | patch | render | locate | reflow | excel -- <đường dẫn>`.
  3. Mọi lệnh chỉ ghi kết quả vào `spikes/phase0/out/`.
  4. Test "corpus chỉ đọc": sha256 và mtime của mọi file corpus không đổi trước và sau khi chạy toàn bộ lệnh.
  5. README tiếng Việt mô tả các lệnh; đường dẫn LibreOffice cấu hình qua biến môi trường (vì `soffice` không có trong PATH).
- *Phụ thuộc:* P0-01.
- *QA kiểm tra:* P0-11.

**P0-04 · dev · Cao — Parse DOCX thành cây block**
- *Mục tiêu:* đọc DOCX ở chế độ chỉ đọc và sinh `parsed-document.json` gồm:
  - các block: đoạn, bảng, hàng, ô, hình, section break, bookmark, content control, field;
  - style được tham chiếu và header/footer;
  - `ooxmlLocator` cho từng block;
  - báo cáo các phần tử không hỗ trợ.
- *Phạm vi:* `spikes/phase0/src/parse/`.
- *Tiêu chí chấp nhận:*
  1. 100% file corpus parse được, hoặc trả lỗi có mã; không treo, không crash.
  2. Số đoạn và số bảng ở thân tài liệu khớp số đếm độc lập do QA lấy bằng công cụ khác (ví dụ XPath riêng đếm `w:p`/`w:tbl`), ở 100% file.
  3. Phần tử không hỗ trợ (textbox, equation, track changes…) được liệt kê, không bị bỏ qua im lặng.
  4. An toàn khi đọc gói: tắt DTD và thực thể ngoài (chống XXE), giới hạn tổng dung lượng giải nén, từ chối đường dẫn zip bất thường. Có test với file độc hại tự tạo.
  5. Parse cùng một file hai lần cho JSON giống hệt (xác định).
- *Phụ thuộc:* P0-03, P0-02.
- *QA kiểm tra:* P0-11.

**P0-05 · dev · Cao — Anchor, Section ứng viên và fingerprint**
- *Mục tiêu:*
  - Đề xuất ranh giới Logical Section: ưu tiên heading style, rồi bookmark/content control có sẵn; nếu không có thì dùng heuristic.
  - Tính `anchorFingerprint` cho từng block.
  - Đo độ khớp với chú giải của P0-02.
- *Phạm vi:* `spikes/phase0/src/locate/`.
- *Tiêu chí chấp nhận:*
  1. Mỗi block thuộc đúng một Section ứng viên, hoặc thuộc vùng "trước Section đầu".
  2. Báo cáo precision/recall so với chú giải cho từng file. Mẫu dùng heading chuẩn đạt 100% điểm bắt đầu Section. Mẫu không chuẩn phải báo độ tin cậy thấp thay vì im lặng.
  3. Fingerprint xác định (hai lần chạy giống nhau). Khi so bản gốc với bản patch của P0-06, fingerprint chỉ đổi ở block bị sửa.
- *Phụ thuộc:* P0-04.
- *QA kiểm tra:* P0-11.

**P0-06 · dev · Cao — Patch OOXML trên bản sao V0 (spike Q10, phần a)**
- *Mục tiêu:*
  - Các lệnh Patch theo mẫu Command, chỉ áp lên **bản sao**:
    - `replaceText`, xử lý được văn bản bị chia thành nhiều run;
    - `setCellValue`, kể cả ô gộp;
    - `insertParagraphAfter`;
    - `removeBlock`.
  - Patch 3 vùng trên «Kế hoạch kinh doanh 2027.docx».
- *Phạm vi:* `spikes/phase0/src/patch/`.
- *Tiêu chí chấp nhận:*
  1. sha256 của V0 không đổi sau mọi lần chạy (test tự động).
  2. Mọi part trong gói zip **ngoài** part bị patch giống từng byte. Trong part bị patch, XML chuẩn hóa chỉ khác ở các node đích.
  3. Thuộc tính định dạng (rPr, pPr, tblPr) của run/đoạn đích được giữ nguyên.
  4. LibreOffice headless chuyển đổi bản patch không lỗi.
  5. Văn bản trích từ 3 vùng đúng giá trị mong đợi; phần còn lại của tài liệu trích ra giống bản gốc.
  6. Patch trỏ ra ngoài phạm vi Section được phép thì bị từ chối kèm mã lỗi.
- *Phụ thuộc:* P0-04, P0-05.
- *QA kiểm tra:* P0-11 (tự động); P0-12 (mở bằng Word, không được hiện hộp "sửa chữa tệp").

**P0-07 · dev · Cao — Bộ render LibreOffice headless**
- *Mục tiêu:* chuyển DOCX→PDF; lấy số trang, chữ từng trang và ảnh thu nhỏ; ghi phiên bản engine và font.
- *Phạm vi:* `spikes/phase0/src/render/`.
- *Tiêu chí chấp nhận:*
  1. Render được toàn bộ corpus.
  2. Mỗi lần render dùng một hồ sơ người dùng LibreOffice riêng (thư mục tạm), để không xung đột với LibreOffice người dùng đang mở.
  3. Có timeout cấu hình được. Quá hạn thì dừng tiến trình và không để lại tiến trình mồ côi (có test).
  4. Render cùng một file hai lần cho cùng số trang và cùng chữ từng trang.
  5. Ghi chuỗi phiên bản (hiện là LibreOffice 25.2.5.2). So font nhúng trong PDF với font mà DOCX yêu cầu, và báo font bị thay thế.
- *Phụ thuộc:* P0-03, K-11, K-12.
- *QA kiểm tra:* P0-11.

**P0-08 · dev · Cao — Định vị Section trên bản render (khả thi cho Q7 và Layout Diff)**
- *Mục tiêu:* thêm bộ định vị Section (bookmark hoặc content control) vào **bản sao**, render, rồi trích trang bắt đầu và kết thúc của từng Section từ PDF.
- *Phạm vi:* `spikes/phase0/src/locate/`.
- *Tiêu chí chấp nhận:*
  1. Với ≥3 tài liệu, trang bắt đầu của từng Section trích tự động khớp kiểm tra thủ công trên PDF ở 100% trường hợp.
  2. Bản sao có và không có bộ định vị cho cùng số trang và cùng chữ từng trang, tức bộ định vị không làm đổi bố cục.
  3. Báo cáo bộ định vị có còn trong DOCX nếu xuất bản sao đó không, và Word hiển thị nó thế nào (đầu vào cho M-04). V0 không đổi.
- *Phụ thuộc:* P0-05, P0-06, P0-07.
- *QA kiểm tra:* P0-12.
- *Rủi ro:* nếu không đạt (1), Q7 không thực hiện được đúng nghĩa (L-07).

**P0-09 · dev · TB — Thử nghiệm reflow và Layout Diff**
- *Mục tiêu:* chèn một đoạn dài hoặc rút ngắn Section 01 trên bản sao, render, rồi so vị trí các Section trước/sau và Content Diff của từng Section.
- *Phạm vi:* `spikes/phase0/src/reflow/`.
- *Tiêu chí chấp nhận:*
  1. Với ≥3 tài liệu, có bảng vị trí trang của từng Section trước và sau.
  2. Section không bị sửa có Content Diff rỗng nhưng có thể có Layout Diff (dịch trang); báo cáo tách riêng hai loại.
  3. Phát hiện được trang trắng (không có chữ hay đối tượng) trên một mẫu dựng sẵn.
  4. Phát hiện bảng bị ngắt ở trang khác (nếu có).
- *Phụ thuộc:* P0-08.
- *QA kiểm tra:* P0-12.

**P0-10 · dev · Cao — Đọc Excel và chính sách tra cứu Q9**
- *Mục tiêu:* đọc xlsx (sheet, sheet ẩn, giá trị đã lưu của ô công thức, ngày, ô gộp) và tra đơn giá theo khóa với điều kiện ngày hiệu lực ≤ ngày lập kế hoạch.
- *Phạm vi:* `spikes/phase0/src/excel/`.
- *Tiêu chí chấp nhận (test tự động):*
  1. Nhiều dòng hợp lệ thì chọn ngày hiệu lực mới nhất; evidence ghi file, sheet, dòng, cột, ngày.
  2. Hòa ở ngày mới nhất thì báo lỗi "đơn giá trùng ngày hiệu lực" kèm khóa và các dòng trùng.
  3. Thiếu thì báo lỗi "thiếu đơn giá" kèm khóa và nguồn.
  4. Ngày hiệu lực bằng ngày lập kế hoạch được tính là hợp lệ.
  5. Ô công thức: đọc giá trị đã lưu và đánh dấu là công thức, không tính lại.
  6. Nhận diện được sheet ẩn.
  7. Ngày dạng số serial và dạng chữ đều được xử lý, hoặc báo lỗi rõ.
  8. sha256 của file nguồn không đổi.
- *Phụ thuộc:* P0-03, P0-02.
- *QA kiểm tra:* P0-11.

**P0-11 · qa · Cao — Kiểm chứng độc lập parse/patch/render/Excel**
- *Mục tiêu:* xác nhận các tiêu chí chấp nhận của P0-02 (metadata), P0-03…P0-07 và P0-10 bằng test tự động độc lập và ca biên mới.
- *Phạm vi:* `spikes/phase0/tests/qa/` (QA chỉ thêm test, không sửa mã Dev); báo cáo `docs/11_BaoCao_KiemThu_Phase0.md`, phần 1.
- *Tiêu chí chấp nhận:*
  - Mỗi tiêu chí có kết quả Đạt/Không đạt kèm bằng chứng (lệnh, đầu ra, hash).
  - Mỗi task có ít nhất 1 ca biên mới, ví dụ run tách ngay giữa một con số, ô gộp dọc, file XXE.
- *Phụ thuộc:* P0-04…P0-07, P0-10.

**P0-12 · qa · Cao — Đo Word so với LibreOffice; kiểm P0-08, P0-09 (spike Q10, phần b)**
- *Mục tiêu:* so số trang và trang bắt đầu của từng Section giữa Word for Mac và LibreOffice, cho cả bản gốc và bản patch.
- *Phạm vi:* `docs/11_BaoCao_KiemThu_Phase0.md`, phần 2. Word trên máy chỉ dùng để đọc. Nếu tự động hóa Word không ổn định thì đếm thủ công.
- *Tiêu chí chấp nhận:*
  1. Với ≥10 tài liệu: ghi số trang theo Word, theo LibreOffice và mức chênh. Ghi trang bắt đầu từng Section cho mẫu chính và ít nhất 2 mẫu khác.
  2. «Kế hoạch kinh doanh 2027.docx» có đủ bản gốc và bản patch 3 vùng.
  3. Bản patch mở bằng Word không hiện hộp sửa chữa tệp.
  4. Phân loại nguyên nhân chênh lệch: font thay thế, bảng, ngắt dòng, khoảng cách đoạn…
  5. Ghi phiên bản Word, LibreOffice và hệ điều hành; nêu giới hạn là Word for Mac có thể khác Word for Windows.
- *Phụ thuộc:* P0-06…P0-09.

**P0-13 · ba · Cao — Báo cáo Phase 0 và đề xuất có đi tiếp hay không**
- *Mục tiêu:* tổng hợp số liệu, đối chiếu tiêu chí thoát E1–E6, rồi đề xuất:
  - xác nhận hay mở lại Q10/L-03;
  - ngưỡng cho K-02;
  - kết luận tính khả thi của Q7;
  - chốt K-08;
  - danh sách điều chỉnh cho Phase 1.
- *Phạm vi:* `docs/12_BaoCao_Phase0_Va_DeXuat.md`.
- *Tiêu chí chấp nhận:*
  - Bảng E1–E6 ghi Đạt/Không đạt kèm bằng chứng từ P0-11, P0-12.
  - Mỗi đề xuất được ghi [ĐX] kèm câu hỏi cần người dùng chốt.
  - Không khẳng định năng lực nào chưa được đo.
- *Phụ thuộc:* P0-11, P0-12.

**Tiêu chí thoát Phase 0** (ngưỡng [ĐX], chờ người dùng chốt theo K-02):

| Mã | Tiêu chí | Ngưỡng |
|---|---|---|
| E1 | Bất biến | 100% lần chạy: sha256 của V0 và file nguồn không đổi |
| E2 | Parse | 100% corpus parse được hoặc báo lỗi có mã; 0 phần tử bị bỏ qua im lặng |
| E3 | Patch | 100% bản patch render được bằng LibreOffice; mẫu chính mở bằng Word không hiện hộp sửa chữa; ≥90% corpus cũng vậy [ĐX] |
| E4 | Định vị Section | Trang bắt đầu trích đúng ở 100% Section của ≥3 tài liệu (điều kiện để làm Q7) |
| E5 | Chênh lệch Word–LibreOffice | Đã đo; người dùng chấp nhận theo K-02 |
| E6 | Excel | 100% ca kiểm thử chính sách Q9 đạt |

Nếu E3 hoặc E5 không đạt, phải quay lại L-03 (engine) trước khi vào Phase 1. Nếu E4 không đạt, phải quay lại L-07.

**Thứ tự và song song trong Phase 0:**

```text
P0-01 ──► P0-03 ──┬─► P0-04 ─► P0-05 ─► P0-06 ─┐
P0-02 (song song; chờ người dùng gửi file) ─────┤
                  ├─► P0-07 (song song) ───────┼─► P0-08 ─► P0-09 ─┐
                  └─► P0-10 (song song) ───────┤                   │
                         P0-11 (sau P0-04..07, P0-10) ◄────────────┤
                         P0-12 (sau P0-06..09) ◄───────────────────┘
                                  └──► P0-13
```

### 3.2 Phase 1 — Immutable Template + Section Workspace

**Mục tiêu (spec §13):** nhập template và nguồn; nhận diện Logical Section; xem trước nội dung và áp Patch đơn giản; quản lý revision, Content Diff, lưu và khôi phục trạng thái.

**Ngoài phạm vi Phase 1:** Rule, DAG, stale, Run (Phase 2); AI và chat (Phase 3); render phân trang, Layout Diff, Build Snapshot, Xuất DOCX (Phase 4).

**P1-01 · ba · Cao — Đặc tả chi tiết Phase 1**
- *Mục tiêu:* đặc tả màn hình, dữ liệu và tiêu chí chấp nhận của Phase 1 sau khi có kết quả Phase 0 và các quyết định L-04, L-05, L-09, L-12, L-13, K-01, K-10, K-17.
- *Phạm vi:* `docs/13_DacTa_App_Phase1.md`, gồm:
  - màn Workspace, hợp nhất ảnh 01 với spec §4.1 theo L-13;
  - mô hình dữ liệu: Project, TemplateArtifact, SourceArtifact, LogicalSection, DocumentBlock, ChangeRequest, SectionRevision, AuditEvent;
  - bảng nhãn tiếng Việt;
  - mã lỗi.
- *Tiêu chí chấp nhận:*
  - Mỗi màn hình và thực thể có trường, trạng thái và tiêu chí chấp nhận kiểm chứng được.
  - Tách rõ phạm vi Phase 1 với Phase 2–4.
  - Không mục nào dựa trên phép tính JS hay số trang mô phỏng của prototype.
- *Phụ thuộc:* P0-13 được chấp nhận; các quyết định nêu trên.

**P1-02 · dev · Cao — Khung ứng dụng Electron**
- *Mục tiêu:* dựng `app/` (Electron + React + TypeScript + Zustand; công cụ build theo K-09, K-10) với vỏ giao diện tiếng Việt, điều hướng theo Q1 và nền tảng bảo mật.
- *Phạm vi:*
  - Được sửa: `app/**`, chỉ phần khung (`main/`, `preload/`, `ui/shell/`, `infra/ipc/`, cấu hình test và lint).
  - **Không đụng** `docs/`, `spikes/`.
- *Tiêu chí chấp nhận:*
  1. `npm run dev` mở cửa sổ có tiêu đề tiếng Việt.
  2. `npm run typecheck`, `npm run lint`, `npm test`, `npm run test:e2e` đều chạy xanh.
  3. Renderer chạy với contextIsolation bật, nodeIntegration tắt, sandbox bật, có CSP. Test e2e xác nhận renderer không truy cập được `require` hay `process`.
  4. IPC chỉ nhận kênh trong danh sách cho phép và payload đúng lược đồ. Gọi kênh lạ hoặc gửi payload sai thì nhận mã lỗi (có test).
  5. Có điều hướng theo ảnh 01 và 5 màn Workspace / Recipe / Runner / Build / History. Màn chưa làm hiển thị "Chưa có trong giai đoạn này" và không giả lập dữ liệu.
- *Phụ thuộc:* P1-01.
- *QA kiểm tra:* P1-16.

**P1-03 · dev · Cao — SQLite, migration và thư mục dự án**
- *Mục tiêu:* tạo, mở, đóng dự án theo cấu trúc §4.2; SQLite có migration; giao dịch nguyên tử; khóa dự án khi đang mở.
- *Phạm vi:* `app/src/infra/sqlite/`, `app/src/infra/filesystem/`, `app/src/core/domain/` (Project).
- *Tiêu chí chấp nhận:*
  1. Tạo dự án sinh thư mục có `manifest.json`, `project.sqlite`, `template/`, `sources/`, `sections/`, `runs/`, `builds/`.
  2. Chạy migration lần hai không lỗi và không đổi dữ liệu.
  3. Lỗi xảy ra giữa giao dịch thì rollback, không còn bản ghi dở dang (test tiêm lỗi).
  4. Mở cùng dự án ở cửa sổ hoặc tiến trình thứ hai thì báo "Dự án đang được mở".
  5. Đóng rồi mở lại giữ nguyên dữ liệu.
- *Phụ thuộc:* P1-02.
- *QA kiểm tra:* P1-16.

**P1-04 · dev · Cao — Kho artifact theo nội dung và nhập Template V0 bất biến**
- *Mục tiêu:* `project.importTemplate(path)` sao chép DOCX vào kho theo sha256, đặt chỉ đọc và ghi TemplateArtifact. Kiểm tra hash khi mở dự án và trước mọi thao tác dùng mẫu.
- *Phạm vi:* `app/src/infra/filesystem/`, `app/src/core/domain/`, `app/src/adapters/documents/` (chỉ đọc).
- *Tiêu chí chấp nhận:*
  1. Sau khi nhập có `template/original.docx` và `template-sha256.txt`; file gốc của người dùng không đổi (so hash trước/sau).
  2. API/IPC không có lệnh ghi đè hay xóa template (kiểm bằng test danh sách kênh).
  3. Nếu file mẫu trong kho bị sửa từ bên ngoài, mở dự án sẽ báo "Mẫu V0 đã bị thay đổi ngoài ứng dụng" và chặn thao tác.
  4. UI hiển thị "Mẫu V0 · sha256:<8 ký tự đầu>…".
  5. Ở Phase 1, mỗi dự án chỉ có một mẫu; đổi mẫu (Q15) làm sau (M-05).
- *Phụ thuộc:* P1-03.
- *QA kiểm tra:* P1-17.

**P1-05 · dev · Cao — Parse DOCX trong app**
- *Mục tiêu:* chuyển parser của spike (P0-04, P0-05) thành adapter `documents` có test; lưu DocumentBlock và parse report.
- *Phạm vi:* `app/src/adapters/documents/parse/`, `app/src/core/domain/` (DocumentBlock), migration các bảng liên quan.
- *Tiêu chí chấp nhận:*
  1. Trên bộ fixture, kết quả giống kết quả của spike (golden test).
  2. Parse lại cùng mẫu cho cùng blockId và fingerprint.
  3. Phần tử không hỗ trợ được nêu trong parse report bằng tiếng Việt.
  4. Parse chạy ngoài luồng UI; giao diện không đóng băng (e2e đo độ phản hồi khi parse mẫu lớn nhất trong corpus).
- *Phụ thuộc:* P1-04.
- *QA kiểm tra:* P1-17.

**P1-06 · dev · Cao — Cây Section và chỉnh ranh giới**
- *Mục tiêu:* nhận diện Logical Section ban đầu; cho người dùng tách, gộp, dời điểm đầu/cuối và đổi tên Section; lưu kết quả.
- *Phạm vi:* `app/src/core/domain/` (LogicalSection), `app/src/ui/workspace/` (cây Section).
- *Tiêu chí chấp nhận:*
  1. Mẫu dùng heading chuẩn nhận được ≥5 Section (spec AC2).
  2. Sau mọi chuỗi thao tác (test sinh ngẫu nhiên), tổng số block không đổi và mỗi block thuộc đúng một Section.
  3. Section không dùng số trang làm định danh.
  4. Mỗi thao tác ghi một AuditEvent.
  5. Đóng rồi mở lại vẫn giữ ranh giới.
- *Phụ thuộc:* P1-05.
- *QA kiểm tra:* P1-18.

**P1-07 · dev · TB — Nhập nguồn thành snapshot**
- *Mục tiêu:* `project.addSource(path)` cho Excel/DOCX (PDF tùy M-03). Mỗi lần nhập tạo snapshot sha256, version, mẫu lược đồ (Excel: sheet, cột, vài dòng; DOCX: tiêu đề, bảng) và provenance.
- *Phạm vi:* `app/src/core/data-registry/` (SourceArtifact), `app/src/adapters/spreadsheets/`, `app/src/adapters/reference-files/`, `app/src/ui/workspace/` (danh sách nguồn).
- *Tiêu chí chấp nhận:*
  1. Nhập lại một file giống hệt thì không tạo version mới.
  2. File cùng tên nhưng khác nội dung thì tạo version mới, lịch sử ghi «Nguồn <tên> đổi v1→v2». Đây là bước chuẩn bị cho Q16; chưa có stale vì chưa có Rule.
  3. File nguồn gốc không bị ghi (so hash trước/sau).
  4. Sheet ẩn được đánh dấu.
  5. Định dạng không hỗ trợ thì báo bằng tiếng Việt và không nhập.
- *Phụ thuộc:* P1-04, P0-10.
- *QA kiểm tra:* P1-18.

**P1-08 · dev · Cao — Workspace 3 vùng**
- *Mục tiêu:* màn Workspace theo spec §4.1 và ảnh 01, hợp nhất theo L-13:
  - Trái: Mẫu V0, nguồn, cây Section kèm trạng thái.
  - Giữa: xem trước Section dựng từ block, với tab Bản nháp / Mẫu gốc.
  - Phải: yêu cầu chỉnh sửa, Lưu bản nháp, Duyệt.
  - Dưới: Change Tray.
- *Phạm vi:* `app/src/ui/workspace/`, `app/src/ui/shared/`.
- *Tiêu chí chấp nhận:*
  1. Chọn một Section thì vùng giữa hiển thị đúng các đoạn/bảng của Section đó (e2e so với kết quả parse).
  2. Vùng giữa có nhãn "Xem trước nội dung — chưa phân trang"; Phase 1 không hiển thị số trang.
  3. Tab Mẫu gốc luôn hiển thị nội dung V0, kể cả sau khi sửa.
  4. Mọi chuỗi giao diện là tiếng Việt theo bảng nhãn (test quét chuỗi); số và ngày định dạng `vi-VN`.
  5. Change Tray hiển thị số CR và số Revision đang chờ duyệt.
- *Phụ thuộc:* P1-06. P1-07 có thể làm song song; nếu chưa xong thì danh sách nguồn hiển thị rỗng.
- *QA kiểm tra:* P1-19.

**P1-09 · dev · Cao — Change Request (Q21)**
- *Mục tiêu:* thực thể CR có:
  - mã CR-xxx đếm theo dự án, không tái dùng;
  - các thuộc tính bắt buộc: trạng thái, phạm vi ảnh hưởng (danh sách Section hoặc Toàn bộ), ngày tạo, ngày cập nhật, Section đích, mô tả;
  - giá trị cũ/mới nếu là yêu cầu sửa giá trị;
  - liên kết build, để trống tới Phase 4.
- *Phạm vi:* `app/src/core/change-requests/`, `app/src/ui/workspace/` (form và Change Tray), `app/src/ui/history/` (danh sách).
- *Tiêu chí chấp nhận:*
  1. Thiếu thuộc tính bắt buộc thì bị từ chối, và app báo trường còn thiếu.
  2. Mã tăng dần CR-001, CR-002… trong từng dự án. Xóa CR (nếu L-04 cho phép) không làm tái dùng mã.
  3. Mỗi lần đổi trạng thái thì cập nhật "ngày cập nhật" và ghi AuditEvent.
  4. Bảng CR có các cột nội dung, phạm vi, trạng thái, ngày giờ (như ảnh 02).
- *Phụ thuộc:* P1-06.
- *QA kiểm tra:* P1-19.

**P1-10 · dev · Cao — Patch thủ công, Section Revision và duyệt (Q4, Q5)**
- *Mục tiêu:*
  - Cho sửa trực tiếp nội dung Section bằng `replaceText`, `setCellValue`, `insertParagraphAfter`, `removeBlock` (lấy từ P0-06); mỗi lần sửa tạo một Section Revision.
  - Vòng đời Revision: Bản nháp → Chờ duyệt → Hợp lệ → Đã thay thế.
  - Có nút "Duyệt" cho từng Section và nút "Duyệt tất cả".
- *Phạm vi:* `app/src/core/section-revisions/`, `app/src/adapters/documents/patch/`, `app/src/ui/workspace/`.
- *Tiêu chí chấp nhận:*
  1. Patch ra ngoài phạm vi Section bị từ chối kèm mã lỗi.
  2. Revision đã gửi duyệt thì không sửa được. Sửa tiếp sẽ tạo Revision mới; bản cũ chuyển "Đã thay thế".
  3. "Duyệt" một Section chỉ đổi Section đó. "Duyệt tất cả" chỉ duyệt các Revision đang Chờ duyệt và thông báo số đã duyệt.
  4. Mọi Section có sửa trực tiếp, kể cả Section đầu (Q4), đều phải được duyệt.
  5. Không có giao diện vai trò hay đăng nhập; dữ liệu duyệt theo L-05.
  6. Duyệt không đổi nội dung và không tạo Run.
  7. Mọi thao tác đều ghi AuditEvent.
- *Phụ thuộc:* P1-06, P1-09, P0-06.
- *QA kiểm tra:* P1-19.
- *Ghi chú:* stale và Run thuộc Phase 2; Phase 1 chưa có trạng thái "Cần tính lại".

**P1-11 · dev · TB — Content Diff**
- *Mục tiêu:* Value / Content / Table Diff theo block và theo ô (`cellKey`) giữa V0 và Revision; tô sáng thay đổi trong vùng xem trước.
- *Phạm vi:* module diff trong `app/src/core/section-revisions/`, `app/src/ui/workspace/`.
- *Tiêu chí chấp nhận:*
  1. Đổi một ô thì diff ra đúng một ô.
  2. Section không sửa có diff rỗng.
  3. Diff không dùng thông tin trang.
  4. Đoạn bị viết lại hiển thị đỏ (xóa) / xanh (thêm), hoặc hai cột song song (spec §8.4).
- *Phụ thuộc:* P1-10.
- *QA kiểm tra:* P1-19.

**P1-12 · dev · TB — Bản làm việc DOCX (bước kỹ thuật, chưa phải Build)**
- *Mục tiêu:* áp các Revision "Hợp lệ" lên bản sao V0 và lưu thành `working/latest.docx`, để kiểm chứng patch trên DOCX thật.
- *Phạm vi:* `app/src/adapters/documents/patch/`, dịch vụ áp Revision trong `app/src/core/`.
- *Ngoài phạm vi:* đây **không** phải Build Snapshot — không có manifest đầy đủ, không phân trang, không có «Xuất DOCX» cho người dùng cuối (Phase 4).
- *Tiêu chí chấp nhận:*
  1. Tạo bản làm việc 10 lần liên tiếp mà sha256 của V0 không đổi (spec AC1).
  2. Chữ trích từ bản làm việc khớp các Revision đã duyệt; Revision chưa duyệt không được áp.
  3. Với Section không sửa: XML chuẩn hóa giống V0 và style giữ nguyên (phần định dạng của spec AC10).
  4. LibreOffice headless chuyển đổi bản làm việc không lỗi (kiểm tự động).
- *Phụ thuộc:* P1-10, P0-06.
- *QA kiểm tra:* P1-17.

**P1-13 · dev · TB — Lưu/khôi phục và History cơ bản**
- *Mục tiêu:* mọi thực thể của Phase 1 được giữ qua lần đóng/mở. History hiển thị timeline các AuditEvent: nhập mẫu, nhập/đổi nguồn, ranh giới Section, CR, Revision, duyệt.
- *Phạm vi:* `app/src/core/history/`, `app/src/ui/history/`.
- *Tiêu chí chấp nhận:*
  1. E2e: tạo dữ liệu mẫu, thoát, mở lại; trạng thái giống hệt (so bản xuất JSON của trạng thái).
  2. Timeline sắp theo thời gian, nhãn tiếng Việt, lọc được theo loại.
  3. Không API nào sửa được nội dung bản ghi.
- *Phụ thuộc:* P1-09, P1-10.
- *QA kiểm tra:* P1-20.

**P1-14 · dev · TB (chờ L-04) — Xóa từng bản ghi và «Xóa sạch» (Q12)**
- *Mục tiêu:* thực hiện Q12 theo phương án được chốt ở L-04.
- *Phạm vi:* `app/src/core/history/`, `app/src/infra/filesystem/` (dọn artifact theo đếm tham chiếu), `app/src/ui/history/`.
- *Tiêu chí chấp nhận (theo đề xuất ở L-04; sửa lại khi người dùng chốt):*
  1. Hộp xác nhận nêu loại bản ghi, số bản ghi và ghi "không hoàn tác".
  2. Mã đã xóa không bao giờ được tái dùng.
  3. «Xóa sạch» không xóa Template V0, nguồn và Recipe/Rule (nếu người dùng chốt như vậy).
  4. Xóa bản ghi đang được trạng thái hiện hành dùng thì xử lý đúng quy tắc toàn vẹn đã chốt.
  5. File artifact chỉ bị xóa khi không còn tham chiếu.
- *Phụ thuộc:* P1-13, L-04.
- *QA kiểm tra:* P1-20.

**Các task QA của Phase 1** (mỗi task dev có ít nhất một task QA tương ứng):

| ID | Ưu tiên | Kiểm task | Nội dung kiểm | Phụ thuộc |
|---|---|---|---|---|
| P1-15 | Cao | (kế hoạch) | Viết `docs/14_KeHoach_KiemThu_App_Phase1.md`: ma trận từ từng tiêu chí chấp nhận (P1-02…P1-14; spec AC1, AC2, AC10 phần định dạng; Q4, Q5, Q14, Q21) tới test tự động (Vitest/Playwright) hoặc test thủ công; fixture ẩn danh; lệnh chạy | P1-01 |
| P1-16 | Cao | P1-02, P1-03 | Bảo mật renderer (không có `require`/`process`, có CSP); IPC từ chối kênh lạ và payload sai; migration chạy lại được; rollback khi lỗi; khóa dự án | P1-03 |
| P1-17 | Cao | P1-04, P1-05, P1-12 | V0 bất biến qua ≥10 lần tạo bản làm việc; sửa file mẫu từ bên ngoài thì bị chặn; golden test cho parse; XML của Section không sửa giữ nguyên; mở bản làm việc bằng Word (thủ công) không hiện hộp sửa chữa | P1-12 |
| P1-18 | TB | P1-06, P1-07 | Test thao tác ranh giới Section sinh ngẫu nhiên (không mất/trùng block); version nguồn; hash nguồn không đổi; sheet ẩn | P1-07 |
| P1-19 | Cao | P1-08…P1-11 | E2e luồng Workspace: tạo CR thiếu/đủ thuộc tính, patch trong/ngoài Section, diff đúng ô, duyệt từng Section và duyệt tất cả, Section đầu cần duyệt; quét chuỗi tiếng Việt | P1-11 |
| P1-20 | TB | P1-13, P1-14 | Lưu và khôi phục; timeline; xóa từng bản ghi và «Xóa sạch» theo L-04 | P1-14 |
| P1-21 | Cao | Toàn Phase 1 | Hồi quy và báo cáo `docs/15_BaoCao_KiemThu_App_Phase1.md`, ghi Đạt/Không đạt kèm bằng chứng cho từng tiêu chí | P1-16…P1-20 |

**Thứ tự và song song trong Phase 1:**

```text
P1-01 ─► P1-02 ─► P1-03 ─► P1-04 ─┬─► P1-05 ─► P1-06 ─┬─► P1-08 ─┐
                                  └─► P1-07 (song song)┘           ├─► P1-10 ─┬─► P1-11 ─┐
                                               P1-06 ─► P1-09 ─────┘          └─► P1-12 ─┼─► P1-13 ─► P1-14 (chờ L-04)
QA: P1-15 sau P1-01 · P1-16 sau P1-03 · P1-17 sau P1-12 · P1-18 sau P1-07 · P1-19 sau P1-11 · P1-20 sau P1-14 · P1-21 cuối
```

**Tiêu chí thoát Phase 1:**
- Đạt spec AC1 (V0 bất biến, kiểm trên bản làm việc), AC2 và AC10 phần định dạng.
- Đạt Q4, Q5, Q14, Q21 cho phạm vi Phase 1.
- P1-21 không còn lỗi mức Cao.

### 3.3 Phase 2–5 (mức khung)

| Phase | Nội dung chính | Quyết định phải có | Spec AC chính |
|---|---|---|---|
| **2. Data Registry + Saved Rules + DAG** | DataDefinition / DataRevision / DataBinding (Q20: sheet/cột, "+ Liên kết", đếm hợp lệ/tổng); SavedRule có version và trạng thái (L-11, L-12); Rule IR có kiểu, không `eval`, không LLM; executor xác định, dùng Decimal (K-14); đồ thị lấy từ `inputs`/`dependsOn`, phát hiện vòng; stale theo sự kiện kèm lý do (Q2, Q3, Q16, Q18 theo L-06); Runner Single / Affected / Full có execution plan, evidence, nhật ký Run; dừng khi hòa/thiếu (Q9, L-08); kết quả thành Section Revision chờ duyệt; Recipe mẫu theo L-01 | L-01, L-06, L-08, L-11, L-12, K-04, K-05, K-06, K-14, K-15 | AC3–AC9 |
| **3. Natural-language Rule Studio + Agents** | Chat (Q1); AI diễn giải lời thành plan, người dùng xác nhận chỗ mơ hồ; thư viện Rule có tìm, lọc, tạo; 4 tab Rule (L-13); sandbox nếu có mã do AI sinh (spec §6.4); không gửi dữ liệu ra ngoài khi chưa bật | K-04 | §6, §10 |
| **4. Full Document Reflow + Layout QA** | Composer: áp mọi Revision hợp lệ lên bản sao V0, cập nhật field và TOC; render bằng LibreOffice (Q10); Content Diff và Layout Diff; LayoutIssue chia mức, chỉ cảnh báo (Q6, L-02); thu hồi duyệt khi phân trang đổi (Q7, L-07); cổng build; Build Manifest (engine, font, CR, version Recipe/Rule, hash); mã B-xxx (Q11); liên kết CR với build (Q21); Xuất DOCX; lịch sử build và "So sánh hai bản dựng" (Q1); xóa build (L-04); tái dựng snapshot | L-02, L-03 (xác nhận), L-07, L-14, K-13, M-04 | AC10–AC15 |
| **5. Advanced features** | Windows (K-01); xuất PDF; đổi template (Q15, nếu chưa làm ở Phase 4 — M-05); tạo nhánh từ snapshot (M-06); stale theo vùng nguồn; build hàng loạt; danh mục template; cộng tác và đồng bộ đám mây (ngoài MVP) | Tùy mục | — |

---

## 4. Cấu trúc thư mục mã nguồn và công cụ cần cài đặt

### 4.1 Cây thư mục repo đề xuất (theo spec §9.3; đặt ngoài `docs/`)

```text
docflow-studio/
  docs/                         tài liệu + prototype HTML + ảnh PNG (giữ nguyên, chỉ là tham chiếu giao diện)
  corpus/                       DOCX/Excel mẫu thật cho Phase 0 (chỉ đọc; KHÔNG commit nếu nhạy cảm)
  spikes/
    phase0/                     mã thử nghiệm Phase 0; bỏ đi sau khi chuyển sang app/
      src/  parse/ patch/ render/ locate/ reflow/ excel/
      tests/                    test của Dev + tests/qa/ của QA
      out/                      kết quả sinh ra (gitignore)
  app/                          ứng dụng Electron
    package.json  package-lock.json  tsconfig*.json  .nvmrc  (cấu hình build/test)
    src/
      main/                     tiến trình main của Electron: cửa sổ, vòng đời, đăng ký IPC; KHÔNG chứa nghiệp vụ
      preload/                  contextBridge: API tối thiểu, đã kiểm tra lược đồ
      ui/                       renderer React (spec: app/ui)
        shell/                  điều hướng, thanh trên (Q1), thông báo
        workspace/  recipe-studio/  dependency-runner/  build-preview/  history/
        shared/                 thành phần dùng chung, định dạng vi-VN, bảng nhãn tiếng Việt (Phụ lục A)
      core/                     nghiệp vụ TypeScript thuần; KHÔNG import Electron hay fs; test bằng Vitest
        domain/                 entity, value object, state machine (spec §3.1, §5)
        change-requests/        CR (Q21)
        section-revisions/      Revision, duyệt, diff (Q4, Q5, Q7)
        data-registry/          nguồn, DataDefinition/Revision/Binding
        rules/                  SavedRule, IR, version (Phase 2–3)
        dependency-graph/       DAG, stale theo sự kiện, scheduler (Phase 2)
        build-manifest/         manifest, cổng build, mã B-xxx (Phase 4)
        history/                AuditEvent, xóa / «Xóa sạch» (Q12); bổ sung so với spec §9.3
        ports/                  interface cho adapter: DocumentEngine, Renderer, SpreadsheetReader, ArtifactStore…
      adapters/
        documents/              parse OOXML, Patch (Command), bộ định vị Section
        rendering/libreoffice/  DOCX→PDF, trích số trang và vị trí; bổ sung (spec gộp vào "Composer + Layout Renderer")
        spreadsheets/           đọc Excel
        reference-files/        DOCX/PDF nguồn tham chiếu
        ai/claude-cli/  ai/codex-cli/  ai/api/     (Phase 3, theo K-04)
        execution/sandbox/      (Phase 2–3)
      infra/
        sqlite/ (migrations/)   filesystem/ (kho sha256, khóa dự án)   ipc/ (kênh + lược đồ + mã lỗi)   logging/
    tests/
      unit/  integration/  e2e/
      fixtures/                 mẫu nhỏ tự tạo hoặc đã ẩn danh; không chứa corpus nhạy cảm
```

**Quy tắc ranh giới [ĐX]:**
- `core/` chỉ phụ thuộc vào `ports/`.
- `adapters/` hiện thực các `ports/`.
- `main/` lắp ghép các phần lại với nhau.
- `ui/` chỉ gọi xuống qua `preload/` và IPC.
- Tác vụ nặng (parse, render, chạy Rule) chạy ở tiến trình phụ, để giao diện không bị đóng băng.

### 4.2 Thư mục dữ liệu của từng dự án (spec §5.3; là dữ liệu người dùng, không nằm trong repo)

Giữ cấu trúc của spec §5.3 (`manifest.json`, `template/`, `sources/<id>/<sha256>/`, `recipe/`, `sections/`, `runs/`, `builds/`, `project.sqlite`), với các điều chỉnh [ĐX]:
- Thư mục build đặt theo mã Q11, ví dụ `builds/B-001/`, thay cho `build-0001`.
- Thêm `working/` cho bản làm việc của P1-12.
- Thêm file khóa dự án.
- Artifact dùng chung giữa nhiều bản ghi được đếm tham chiếu (phục vụ L-04).

Vị trí thư mục dữ liệu theo K-17.

### 4.3 Công cụ và phụ thuộc cần người dùng chấp thuận

| Công cụ / phụ thuộc | Hiện trạng trên máy [QS 2026-11-23] | Việc cần làm | Cần chấp thuận |
|---|---|---|---|
| Node.js | v24.21.0, qua nvm | Ghim phiên bản (`.nvmrc`, `engines`); Electron dùng Node riêng đi kèm | Có |
| Package manager | npm 11.19.0 và pnpm 11.26.0 có sẵn | Chọn một (K-09); commit lockfile | Có |
| LibreOffice | 25.2.5.2 trong `/Applications`, không có trong PATH | App dò hoặc cho cấu hình đường dẫn; ghim phiên bản dùng nghiệm thu (K-11) | Có |
| Microsoft Word for Mac | 16.109.3 | Chỉ dùng để đối chiếu trong QA (P0-12, P1-17); không phải phụ thuộc lúc chạy app | Xác nhận được dùng |
| Python | 3.11.9 | Chỉ cần nếu K-07 chọn Python hoặc lai | Theo K-07 |
| git | 2.39.5; dự án chưa là repo | `git init` + `.gitignore` (K-16) | Có |
| Xcode Command Line Tools | Đã cài | Dùng để biên dịch native module (ví dụ better-sqlite3) | — |
| Gói npm, **chưa cài** (đề xuất) | — | `electron`, `electron-vite` + `vite`, `react`, `react-dom`, `zustand`, `typescript`, `vitest`, `@playwright/test`, `eslint`, `zod`, `better-sqlite3`, `jszip`, `@xmldom/xmldom`, `xpath`, `exceljs`, `pdfjs-dist`, `decimal.js`; sau này thêm `electron-builder` để đóng gói | Có (danh sách cuối chốt sau Phase 0) |
| Font | Chưa xác định | Phase 0 liệt kê font mẫu dùng và cài đủ (K-12) | Có |

### 4.4 Thay đổi quy ước dự án (M-01; cần người dùng xác nhận)

- **Quy ước cũ** (skill `prototype-conventions`): "không có framework, package manager hay lệnh test tự động". Quy ước này **chỉ áp dụng cho `docs/DocFlow_Interactive_Mockup.html`**.
- **Đề xuất:**
  - Giữ nguyên quy ước cũ cho prototype. Prototype không bị thay thế; sửa thêm hay không theo M-02.
  - Cho phép `app/` và `spikes/` dùng framework, npm/pnpm, công cụ build và test tự động.
- **Hệ quả cho đội agent** (Main cân nhắc; BA không tự sửa `.claude/`):
  - Mô tả của agent `dev` ("Lập trình viên prototype… file HTML mockup") và skill của QA đang hướng vào prototype.
  - Cần bổ sung quy ước cho app (cấu trúc §4.1, lệnh test, cấm sửa `docs/*.html`/`*.png`) trước khi giao task P0-03 trở đi.

---

## 5. Prototype (mô phỏng) và kiến trúc production

**Phân biệt bắt buộc:**
- Prototype HTML là **tham chiếu giao diện** và mô phỏng nghiệp vụ trong bộ nhớ.
- Không lấy logic JS của prototype làm logic production.
- Không coi số trang hay phép tính của prototype là năng lực thật.
- [QS] Thư mục `app/` chưa tồn tại: **chưa có ứng dụng nào tạo DOCX thật**.

| Năng lực | Prototype HTML [QS] (dòng trong file 116 dòng) | Yêu cầu production (spec) | Phase của app |
|---|---|---|---|
| Đọc DOCX mẫu | Không. Tab "Mẫu gốc" chỉ là số cố định 12.000 × 250.000 | §1.1(1), §8.2: parse OOXML, anchor | P0, P1 |
| Template V0 bất biến | Chỉ là nhãn và hằng số, không có file | sha256, chỉ đọc, kiểm tra hash | P1 |
| Đọc Excel | Không; đơn giá và tỷ lệ gõ tay | §1.1(2): snapshot, Binding | P0 (spike), P1 (nhập), P2 (Binding) |
| Tính toán | Hàm JS cố định `eval2..eval5` (dòng 67–70) | IR có kiểu, executor xác định, Decimal, evidence | P2 |
| Stale | Theo sự kiện, dùng bộ đếm `rev` + `basedOn` trong bộ nhớ (dòng 24, 33–34); đã áp Q2. Đồ thị cố định trong mã; Phần 04 vẫn dùng 03, **chưa theo Q19** | DAG lấy từ Rule, lý do stale, lưu bền | P2 |
| Duyệt | `approveSection`, `approveAll`, cờ Phần 01 `approved1` (dòng 24, 74–75) | Section Revision bất biến, AuditEvent; thu hồi khi phân trang đổi (Q7) | P1 (duyệt), P4 (Q7) |
| Cổng build | `canBuild()` = 0 stale và 0 chờ duyệt (dòng 76) | §8.3 kết hợp Q6, Q7 | P4 |
| Build | `createBuild`: số trang `longContent ? 13 : 12` là **hằng số**; mã `B-0xx` đếm trong bộ nhớ (dòng 77) | Sao chép V0, patch, render LibreOffice, manifest, mã B-xxx lưu bền | P4 |
| Manifest | JSON tải về ghi "Mockup-only — not a DOCX file" (dòng 78) | Manifest thật có hash, engine, font, CR | P4 |
| Content/Layout Diff | Chỉ có nhãn và ô mô tả | Diff thật, tách hai loại | P1 (Content), P4 (Layout) |
| Lưu bền / xóa | Không; mất khi tải lại; không có chức năng xóa | SQLite + kho artifact; Q12 | P1 |
| AI / chat / Xuất DOCX | Không | K-04; spec §4.4 | P3 / P4 |

---

## 6. Rủi ro và câu hỏi mở

### 6.1 Rủi ro

| Mã | Rủi ro | Mức | Giảm thiểu | Phase |
|---|---|---|---|---|
| R-01 | DOCX phức tạp: run bị chia, field, content control, track changes, auto-numbering, ô gộp, hình nổi, textbox | Cao | Corpus đa dạng (K-03); chỉ patch loại block được hỗ trợ, gặp loại khác thì báo "không hỗ trợ" thay vì làm hỏng; kiểm tra XML ngoài vùng patch không đổi (P0-06) | P0, P1, P4 |
| R-02 | Font: thiếu font tiếng Việt hoặc font của mẫu; font bị thay thế làm đổi phân trang | Cao | Liệt kê font, cảnh báo khi thiếu, ghi vào manifest (K-12) | P0, P4 |
| R-03 | Word và LibreOffice phân trang khác nhau; Word Mac cũng có thể khác Word Windows | Cao | Đo trong Phase 0 (P0-12); UI ghi "theo LibreOffice x.y"; ngưỡng K-02; ảnh hưởng trực tiếp tới việc thu hồi duyệt của Q7 (L-07) | P0, P4 |
| R-04 | Sandbox thực thi: mã do LLM sinh; macro trong Excel/DOCX; XXE, zip bomb, đường dẫn bất thường khi giải nén DOCX/XLSX | Cao | Không `eval`; IR có kiểu; không chạy macro; parser tắt DTD, giới hạn dung lượng giải nén (P0-04); mã do LLM sinh chỉ chạy trong sandbox, từ Phase 3 (spec §6.4) | P0–P3 |
| R-05 | Tiến trình LibreOffice treo, khóa hồ sơ người dùng, xung đột khi chạy song song, khởi động chậm | TB | Hồ sơ riêng cho mỗi lần render, hàng đợi, timeout, dừng tiến trình (P0-07) | P0, P4 |
| R-06 | Mệt vì phải duyệt lại nhiều do Q7: một thay đổi ở đầu tài liệu thu hồi duyệt mọi Section phía sau | TB | Định nghĩa mốc và "Duyệt tất cả" (L-07, Phụ lục B) | P4 |
| R-07 | Q12 cho xóa làm mất khả năng tái lập và kiểm toán | TB | Phương án C và quy tắc toàn vẹn (L-04) | P1, P4 |
| R-08 | Q18 cho sửa tay trạng thái, có thể bỏ qua biên dịch và kiểm thử | TB | Phương án A (L-11) | P2 |
| R-09 | "Không giới hạn" (Q13) nhưng hiệu năng thực tế có giới hạn | TB | Mục tiêu kiểm thử (K-15); xử lý nặng ở tiến trình phụ | P0, P2, P4 |
| R-10 | Lộ dữ liệu doanh nghiệp khi dùng LLM | Cao nếu bật | Mặc định không dùng LLM; bật theo dự án và có cảnh báo (K-04) | P3 |
| R-11 | Native module (better-sqlite3) phải rebuild cho Electron; ký số và notarize trên macOS | TB | Kiểm ngay ở P1-02; đóng gói ở phase sau | P1 |
| R-12 | Bookmark định vị thêm vào bản sao vẫn còn trong DOCX xuất ra | TB | Đo ở P0-08; chốt ở M-04 (gỡ bỏ trước khi xuất, hoặc dùng bookmark ẩn) | P0, P4 |
| R-13 | Sai số tiền tệ do dùng số thực dấu phẩy động | TB | Dùng Decimal và chính sách làm tròn (K-14) | P2 |
| R-14 | Phạm vi lớn vì Q1 coi mọi chức năng trong ảnh là cần có | Cao | Chia theo phase; MVP tập trung vào chất lượng xuất DOCX (spec §15) | Toàn bộ |
| R-15 | Không có corpus thật (mẫu chính không có trên máy) | Cao | K-03; **chặn Phase 0** | P0 |
| R-16 | Đội agent đang được cấu hình cho prototype | TB | Main cập nhật mô tả agent và skill cho app (§4.4) | Trước P0-03 |
| R-17 | Làm lại việc vì điểm lệch chốt muộn | TB | Phase 0 không phụ thuộc điểm lệch; Phase 1 chỉ phụ thuộc L-04, L-05, L-09, L-12, L-13 | — |

### 6.2 Câu hỏi mở tổng hợp (theo thời điểm cần chốt)

**Trước Phase 0**
- **M-00:** Có muốn đặt nguyên tắc chung "khi spec và quyết định Q lệch nhau thì Q ưu tiên, trừ khi chốt khác ở L-xx" không?
- **M-01:** Đồng ý đổi quy ước dự án: `app/` và `spikes/` được dùng framework, package manager và test tự động; prototype giữ quy ước cũ (§4.4)?
- **K-03:** Gửi corpus và mẫu «Kế hoạch kinh doanh 2027.docx».
- **K-02** (hướng), **K-07, K-08, K-09, K-11, K-16.**

**Trước Phase 1**
- **K-01, K-10, K-17.**
- **L-04, L-05, L-09, L-12, L-13.**
- **M-02:** Thứ tự giai đoạn G1–G6 cho prototype (07 §H.2) vẫn đang [MỞ]. Khi đã chuyển sang xây app, có **dừng mở rộng prototype** (chỉ giữ làm tham chiếu) không? Đề xuất: dừng, trừ khi người dùng muốn thử giao diện trên prototype trước.
- **M-03:** Nguồn PDF tham chiếu (spec §1.1(2)) có thuộc MVP không, hay chỉ Excel/DOCX như Q20?

**Trước Phase 2**
- **L-01, L-06, L-08, L-11.**
- **K-04, K-05, K-06, K-14, K-15.**
- Nội dung chính xác của thông báo lỗi Q9.

**Trước Phase 4**
- **L-02, L-03** (xác nhận lại sau Phase 0), **L-07, L-14, K-13.**
- **M-04:** Bookmark định vị Section có được gỡ khỏi DOCX trước khi xuất không?
- **M-05:** Làm luồng đổi template (Q15) ở Phase 4 hay Phase 5? Duyệt hệ quả 1–6 ở 07 §H.9; ánh xạ lại Section làm thủ công hay có gợi ý tự động?
- **M-06:** Chức năng "tạo nhánh từ Build Snapshot" (spec §4.5) có thuộc MVP không?
- Q12: thời gian lưu lịch sử.

**Khác**
- **M-07:** Spec §14 nêu `concept_*.png` nhưng `docs/` không có file nào như vậy. Có cần bổ sung không?

---

## Phụ lục A — Bảng nhãn trạng thái tiếng Việt đề xuất (Q14)

Mã nội bộ lấy theo spec §3.1 và không hiển thị ra giao diện. Nhãn có nguồn từ prototype hoặc ảnh được giữ nguyên; các nhãn còn lại là [ĐX] chờ chốt cùng L-09.

| Đối tượng | Mã nội bộ | Nhãn hiển thị | Nguồn nhãn |
|---|---|---|---|
| Rule | DRAFT / VALIDATED / APPROVED / DEPRECATED | Nháp / Đã kiểm thử / Đã duyệt / Ngừng dùng | Ảnh 02 (Nháp, Đã duyệt); còn lại [ĐX] |
| Nguồn / Binding | READY / MISSING / AMBIGUOUS / CHANGED | Đã liên kết / Thiếu / Mơ hồ / Đã thay đổi | Ảnh 02 ("Đã liên kết"); còn lại [ĐX] |
| Kết quả tính | NOT_RUN / STALE / RUNNING / FAILED / RESULT_READY / APPROVED | Chưa chạy / Cần tính lại / Đang chạy / Lỗi — đã dừng / Chờ duyệt / Hợp lệ | Prototype (Cần tính lại, Chờ duyệt, Hợp lệ); Q9 (dừng) |
| Section Revision | DRAFT / REVIEW_REQUIRED / APPROVED / SUPERSEDED | Bản nháp / Chờ duyệt / Hợp lệ / Đã thay thế | Prototype; [ĐX] |
| Bản dựng | BLOCKED / BUILDING / RENDERED / LAYOUT_REVIEW / APPROVED / EXPORTED | Bị chặn / Đang dựng / Đã dựng xem trước / Chờ duyệt lại phân trang (Q7) / Đã duyệt (tùy L-14) / Đã xuất | Prototype ("Đã xuất"); [ĐX] |
| Khác biệt bố cục | SHIFTED / SPLIT_CHANGED / OVERFLOW / EMPTY_PAGE / NO_CHANGE | Dịch trang / Đổi điểm ngắt / Tràn lề / Trang trắng / Không đổi | Spec §8.4 ("Dịch trang"); [ĐX] |
| Mức cảnh báo bố cục (Q6) | INFO / WARNING / SEVERE | Thông tin / Cảnh báo / Cảnh báo nặng | [ĐX] |
| Change Request (Q21) | NEW / IN_PROGRESS / REVIEW / DONE / CANCELLED | Mới / Đang xử lý / Chờ duyệt / Đã xử lý / Đã hủy | Ảnh 02 ("Đã xử lý"); [ĐX] |
| Phạm vi chạy | SELECTED / AFFECTED / FULL | Chỉ phần đã chọn / Các phần bị ảnh hưởng / Toàn bộ Recipe | [ĐX] |
| Chính sách bố cục | NATURAL_REFLOW / PRESERVE_TEMPLATE_BREAKS / STRICT_LAYOUT | Dàn trang tự nhiên / Giữ ngắt trang của mẫu / Bố cục chặt | [ĐX] |

## Phụ lục B — Luồng build đề xuất khi áp dụng Q6 và Q7 (nếu chọn phương án A ở L-02 và L-07)

1. **Kiểm cổng.** Cần đủ các điều kiện:
   - 0 Section "Cần tính lại";
   - 0 Revision "Chờ duyệt";
   - không Rule Nháp nào đang được Recipe dùng;
   - nguồn đúng snapshot.
   Nếu thiếu điều kiện nào thì build "Bị chặn" và nêu lý do cụ thể.
2. **Ghim manifest:** hash V0, version Recipe/Rule, snapshot nguồn, các Revision, engine + phiên bản + font, chính sách bố cục, danh sách CR.
3. **Dựng tài liệu:** sao chép V0, áp Patch theo thứ tự, cập nhật field và TOC (trong phạm vi hỗ trợ).
4. **Render** bằng LibreOffice ra PDF và ảnh.
5. **Tính diff:**
   - Content Diff so với V0 hoặc bản dựng trước.
   - Layout Diff so với **mốc phân trang đã duyệt** của từng Section.
6. **Cảnh báo bố cục:** tạo LayoutIssue theo mức (Q6). Không mức nào chặn xuất; danh sách được ghi vào layout-report.
7. **Thu hồi duyệt (Q7):** Section có Content Diff rỗng nhưng vị trí khác mốc thì bị thu hồi duyệt, lý do "Thay đổi phân trang (trang a→b)". Bản dựng chuyển sang "Chờ duyệt lại phân trang", và «Xuất DOCX» tắt.
   - Lần render đầu tiên chỉ tạo mốc.
   - Section vừa có nội dung mới được duyệt thì lấy vị trí của lần render này làm mốc, không bị thu hồi.
8. **Duyệt lại:** người dùng duyệt từng Section hoặc dùng "Duyệt tất cả". Mốc được cập nhật và «Xuất DOCX» bật lại, **không cần render lại** vì manifest không đổi. Do đó không có vòng lặp.
9. **Xuất DOCX:**
   - Ghi BuildArtifact (checksum) với mã B-xxx (Q11).
   - Các CR liên quan chuyển sang "Đã xử lý" và được liên kết với bản dựng (Q21).
   - Lịch sử ghi sự kiện xuất (L-14, phương án A).
