# 01 — Phạm vi và yêu cầu chức năng DocFlow Studio

Ký hiệu: **[QS]** quan sát được trong prototype · **[ĐX]** đề xuất · **[MỞ]** còn mở. Khái niệm chi tiết: xem `02_…`. Ranh giới prototype/production: xem `03_…`.

## 1. Phạm vi
- **Trong phạm vi sản phẩm [ĐX]:** từ một DOCX mẫu (Template V0 bất biến) và các nguồn Excel, người dùng đưa Change Request, lưu quy tắc (Recipe), chạy lại các Section bị ảnh hưởng, duyệt kết quả, dựng tài liệu mới, xem Content/Layout Diff, tra cứu lịch sử.
- **Dự án minh họa [QS]:** "Kế hoạch kinh doanh 2027", 5 Section, 2 Excel (Bảng giá, Định mức), 5 Rule (production-quantity, revenue.price-lookup, cost-allocation, profit-rule, conclusion-writer).
- **Ngoài phạm vi prototype:** tạo DOCX thật, phân trang thật, đọc Excel thật, AI biên dịch quy tắc, lưu bền, xác thực/phân quyền.

## 2. Bản đồ màn hình [QS]
Điều hướng: `?view=workspace|recipe|runner|build|history` (mặc định workspace). Thanh bên + tab: Workspace · Recipe Studio · Dependencies & Run · Build & Preview · History & Versions. Tham số phụ: `long=1` (nội dung dài), `seed=ran` (chạy sẵn), `seed=approved` (chạy + duyệt + build).

## 3. Mô tả luồng
### 3.1 Workspace
Danh sách 5 Section (trạng thái ✓/◔), nguồn tài liệu, preview giấy HTML (tab "Bản nháp"/"Mẫu gốc"), form sửa Phần 01 (sản lượng, chip 12.000/15.000/18.000), hộp "Thêm đoạn giải thích dài (demo reflow)", nút Lưu Change Request, danh sách CR đã lưu (3 gần nhất), bảng Ảnh hưởng & kết quả.
### 3.2 Change Request
**[QS]** Lưu CR tạo `CR-00n` (n = số CR + 1; khởi tạo có CR-001 "từ 12.000 sản phẩm") với mô tả "Yêu cầu chỉnh giá trị sản lượng thành X sản phẩm", Section 1, chèn đầu danh sách. Thay đổi sản lượng **không** tự tạo CR; CR là hành động riêng và chỉ ghi mô tả, không lưu giá trị cũ/mới có cấu trúc.
### 3.3 Recipe
Thư viện 5 Rule; soạn Rule `revenue.price-lookup` (đối tượng đầu ra `section-02.revenue`, văn bản nghiệp vụ, kiểu lưu); 5 bước AI đề xuất; Data Binding; schema JSON demo. Lưu = tăng `ruleV`.

**Đối chiếu ảnh 02 (`mockup_02_recipe.png`, màn "Quy tắc đã lưu")** — chỉ đọc, ảnh là gợi ý giao diện [ĐX], không phải hành vi:
| Nội dung | Ảnh 02 | HTML |
|---|---|---|
| Thư viện Rule | "Quy tắc đã lưu (5)", ô tìm kiếm, lọc "Tất cả trạng thái", nút "+ Tạo quy tắc"; thẻ: revenue-rule v3 Đã duyệt, cost-rule v2 Đã duyệt, profit-rule v2 Đã duyệt, conclusion-rule v4 Đã duyệt (AI), price-lookup-rule v1 Nháp | 5 Rule (production-quantity, revenue.price-lookup, cost-allocation, profit-rule, conclusion-writer), không version/trạng thái từng Rule, không tìm kiếm/lọc/tạo |
| Chi tiết Rule | 4 tab: Định nghĩa · Thực thi & Kiểm thử · Lịch sử phiên bản · Sử dụng (3); chọn "Phiên bản: v3 (hiện tại)" | Một màn soạn duy nhất, không tab, không chọn version |
| Trường | Mã quy tắc, Phiên bản (ô số), Mục tiêu, Hướng dẫn, Đầu vào (+ Thêm đầu vào), Phụ thuộc (+ Thêm phụ thuộc), Trạng thái (menu) | Đối tượng đầu ra (chỉ đọc), Cách lưu (select), Yêu cầu nghiệp vụ (textarea) |
| JSON | `ruleId, version, target, instruction, inputs, dependsOn, execution{type:workflow, steps…}, output, status` | `ruleId, version, target, inputs(+project.plan-date), dependsOn, steps[4], status` — không có `execution`/`instruction` |
| Các bước AI | Không thấy | 5 bước + cảnh báo |
| Lưu | Không thấy nút lưu Rule | "Lưu phiên bản quy tắc" |
| Đồ thị phụ thuộc | Có ngay trên màn Recipe: 01→02→{03,04}→05 | Chỉ nút "Xem quan hệ" sang Runner (chuỗi tuyến tính) |
| Data Binding | Excel 1 (sheet Bảng giá; cột Sản phẩm/Đơn giá/Hiệu lực), Excel 2 (Định mức; Loại chi phí/Tỷ lệ), Hồ sơ nhân sự.docx; nút "+ Liên kết"; trạng thái "Đã liên kết" | `section-01.quantity` + Excel 1 (nhãn "Tra theo mã, ngày hiệu lực"); chưa có sheet/cột |
| Xem trước | Khung DOCX "Trang 4/12", phóng to/phân trang/zoom 100% | Không có ở màn Recipe |
| Lịch sử bản dựng | v2.3…v2.0 kèm mô tả, "Chạy lại: Phần 02,03,04,05 (theo phụ thuộc)", "Mẫu: …docx (v1.0)", nút "So sánh hai bản dựng" | Build History ở màn Build/History (B-027, B-028…) |
| CR liên quan | Bảng CR-003/002/001: nội dung, phạm vi (P01•…•P05, P02, Toàn bộ), "Đã xử lý", ngày giờ | Danh sách CR chỉ có mã + mô tả + Section, ở Workspace/History |
| Header | "v2.3", "Đang thiết kế", Chạy tính toán, Tạo bản dựng, Xuất DOCX | "Recipe v{n}", "Mẫu DOCX V0", Chạy lại, Xem trước |
Hệ quả: [QS] ảnh có nhiều điều khiển mà HTML không có (kể cả khái niệm trạng thái/version từng Rule). **[ĐÃ CHỐT Q1 vòng 2]** các điều khiển đó là **yêu cầu cần có** (không còn chỉ là [ĐX]); prototype HTML hiện **chưa có** chúng; kế hoạch giai đoạn G1–G6 ở 07 §H.2 (đề xuất, chưa triển khai). Q1 đã chốt (không có nguồn chuẩn: ảnh và HTML đều là mockup); Q17, Q18, Q20, Q21 đã chốt (xem `07`); Q19 còn [MỞ]. Ảnh minh họa Rule đã duyệt nhưng không cho thấy quy trình duyệt hay kiểm thử.
### 3.4 Runner
Nhập qty, đơn giá, tỷ lệ chi phí; đồ thị phụ thuộc; ba phạm vi chạy — Single (Phần được chọn 02–05), Affected (02→05 chỉ phần stale), Full (cả 4 phần); bảng kết quả; Duyệt; Nhật ký chạy (4 gần nhất).
### 3.5 Build
Build Manifest (V0 PIN, Recipe vN, nguồn Excel, trạng thái 5 Section Revision), Build readiness, preview giả lập, các ô Content/Layout, nút tải manifest JSON, Build History.
### 3.6 History
Dòng thời gian: Run, CR, thay đổi số liệu, Recipe, Template V0; Build Snapshots; ô "Phạm vi ghi nhận trong sản phẩm thật" (template hash, sources, recipe, run, build).

## 4. Yêu cầu chức năng
Mỗi FR gồm: loại, mô tả, tiêu chí chấp nhận (AC) kiểm chứng được. Ví dụ số theo dữ liệu seed: qty gốc 12.000, đơn giá 250.000, tỷ lệ 65%.

**FR-01 Hiển thị cấu trúc tài liệu** [QS/ĐX] — Liệt kê 5 Section có tên và nguồn. AC: Workspace hiện đủ 01–05; Phần đang stale có biểu tượng ◔, còn lại ✓.

**FR-02 Xem Mẫu gốc đối chiếu bản nháp** [QS/ĐX] — AC: sau khi đổi qty=15.000, tab "Mẫu gốc" vẫn hiển thị 12.000 và doanh thu 3.000.000.000; tab "Bản nháp" hiển thị 15.000.

**FR-03 Ghi nhận Change Request** [QS/ĐX] — AC: bấm "Lưu Change Request" thêm một CR có mã tăng dần (CR-002…) ở đầu danh sách, xuất hiện cả ở History; thông báo chứa mã CR. [ĐX] CR phải lưu giá trị cũ/mới, người tạo, thời điểm, Section đích.

**FR-04 Sửa đầu vào Phần 01** [QS] — AC: nhập số ≥ 0 (số không hợp lệ → 0); chip đặt đúng giá trị; hiển thị "12.000 → 15.000"; xóa preview build hiện có. Số âm bị đưa về 0 kèm cảnh báo (06 T-05). [MỞ] Giới hạn trên: Q13 đã chốt không giới hạn kích thước/quy mô nghiệp vụ; giới hạn kỹ thuật của ô nhập chưa nêu. Sự kiện đổi qty làm Phần 01 `Chờ duyệt` (Q4, 07 §B.2).

**FR-05 Quản lý đầu vào Phần 02–03** [QS] — Đơn giá (đ) và tỷ lệ chi phí (%) chỉnh ở Runner. AC: tỷ lệ 70 lưu 0,70; đổi tỷ lệ làm 03–05 stale, 02 không stale.

**FR-06 Lưu mô tả Recipe** [QS/ĐX] — AC: bấm "Lưu phiên bản quy tắc" tăng version (v3→v4), hiển thị thông báo, header/tab cập nhật "Recipe v4", làm 02–05 stale, xóa preview. [ĐX] Mô tả được AI biên dịch thành kế hoạch thực thi, kiểm thử, duyệt; chính sách chọn đơn giá phải được thi hành và có test. **Q9 [ĐÃ CHỐT — phương án A; yêu cầu production [ĐX], prototype không thi hành tra giá thật]:** nhiều dòng hợp lệ → chọn ngày hiệu lực mới nhất; dòng hòa (cùng ngày hiệu lực) hoặc thiếu dữ liệu → **dừng chạy Section đó**, hiện lỗi nêu rõ nguyên nhân, không ghi kết quả/Run cho Section đó cho tới khi người dùng sửa dữ liệu. AC kiểm chứng: (1) nhiều dòng hợp lệ khác ngày → kết quả dùng dòng có ngày mới nhất, evidence ghi nguồn/sheet/cột/dòng và ngày hiệu lực; (2) hòa → Section không chạy, lỗi nêu "đơn giá trùng ngày hiệu lực" kèm khóa tra và các dòng trùng; (3) thiếu dữ liệu → Section không chạy, lỗi nêu "thiếu đơn giá" kèm khóa tra/nguồn; (4) khi dừng: không tạo Run, không ghi kết quả mới vào Section, giữ nguyên kết quả/duyệt của lần chạy hợp lệ trước (không ghi đè bằng số đoán), lịch sử có thể ghi sự kiện lỗi nhưng không phải Run thành công; (5) **stale/cổng build:** Section dừng chưa có kết quả hợp lệ cho Recipe/đầu vào hiện tại ⇒ giữ trạng thái stale/chưa chạy, không thể duyệt; các Section phụ thuộc downstream (theo đồ thị phụ thuộc) không chạy được (kể cả Chạy lại/Single) vì đầu vào upstream không hợp lệ; cổng build (02 §6) chặn build vì có Section stale/chưa duyệt; (6) người dùng sửa dữ liệu rồi chạy lại ⇒ Section chạy bình thường, lỗi biến mất, downstream chạy được và quy trình stale/duyệt tiếp diễn theo Q2/Q3/Q7. Test bắt buộc: nhiều dòng, hòa, thiếu, sửa dữ liệu rồi chạy lại, downstream bị chặn. Q3 [ĐÃ CHỐT]: lưu version mới bắt buộc làm stale 02–05.

**FR-07 Phiên bản Recipe bất biến** [ĐX] — AC: mỗi version có định danh, người lưu, thời điểm, trạng thái duyệt; Run và Build ghi version đã dùng.

**FR-08 Phát hiện stale và lan truyền** [QS] — AC: (a) đổi qty → 02,03,04,05 stale, badge "4 phần cần tính lại"; (b) đổi tỷ lệ → 03,04,05 stale; (c) đổi đơn giá → 02..05 stale; (d) badge đếm hiển thị cạnh "Dependencies & Run". [ĐÃ CHỐT Q2] stale theo **sự kiện thay đổi**: đặt lại giá trị cũ (ví dụ qty về 12.000) **không** hết stale; phải chạy/duyệt lại (07 §B.1, AC-Q2-1..12). Mô tả 'so sánh giá trị' ở trên là hành vi prototype *trước* Prototype V2.

**FR-09 Chạy theo phạm vi** [QS] — AC:
- Affected: chỉ tính lại các Phần stale, theo thứ tự 02→05; Run log ghi danh sách đã chạy; nếu không có Phần stale: thông báo "Không có phần nào cần tính lại" và vẫn ghi một Run rỗng.
- Full: tính lại 02–05 kể cả không stale.
- Single Phần k: tính lại đúng Phần k. Nếu k>2 và có Phần upstream (02..k−1) stale → chặn, thông báo nêu số Phần, không ghi Run. Nếu cho chạy, downstream giữ giá trị cũ và (nếu upstream đổi) stale [ĐÃ CHỐT Q8: cho phép Single].
- Sau khi chạy: kết quả mới `Chờ duyệt`; preview build bị xóa.
Ví dụ: qty=15.000, Affected → doanh thu 3.750.000.000; chi phí 2.437.500.000; lợi nhuận 1.312.500.000 (3,75 / 2,44 / 1,31 tỷ).

**FR-10 Phê duyệt kết quả** [QS/ĐX] — AC: "Duyệt kết quả hợp lệ" bị vô hiệu khi còn stale; khi bật, chuyển mọi Phần chờ duyệt thành "✓ Hợp lệ". [ĐÃ CHỐT Q4, Q5] Phần 01 có trạng thái duyệt và ảnh hưởng cổng build; không có vai trò; duyệt từng Section và "Duyệt tất cả" (07 §B.2–B.3, AC-Q4/Q5). [ĐX] thời điểm/ghi chú duyệt; không dùng quyền theo vai trò.

**FR-11 Cổng build** [QS/ĐX] — AC: nút "Tạo preview build demo" chỉ bật khi không stale và không chờ duyệt; nếu không, panel hiển thị "Còn N phần cần tính lại và M kết quả cần duyệt"; gọi trực tiếp hàm cũng bị từ chối với thông báo.

**FR-12 Thu hồi hiệu lực khi đầu vào đổi** [QS] — AC: mọi thay đổi qty/đơn giá/tỷ lệ/ruleV/chạy/nhập "dài" xóa build preview đã tạo, tắt nút tải manifest.

**FR-13 Preview build** [QS] — AC: build thành công thêm một dòng `B-0xx` trạng thái "Preview demo" (mã đầu tiên B-028), số trang 12 (13 nếu bật "dài"); hiển thị cảnh báo "preview GIẢ LẬP". [ĐX] Preview phải render từ DOCX đầu ra thật.

**FR-14 Content Diff & Layout Diff** [ĐX, QS một phần] — AC (production): hai tab hoạt động riêng; Content Diff liệt kê thay đổi chữ/số/bảng theo Section; Layout Diff liệt kê thay đổi số trang/vị trí; thay đổi chỉ-do-layout không xuất hiện trong Content Diff. [QS] Prototype: hai tab không bấm được; chỉ có hai ô mô tả và số "Biến động" = trang − 12.

**FR-15 Build Manifest** [QS/ĐX] — AC: nút chỉ bật sau khi có build; tải `docflow_build_manifest_demo.json` chứa `notice:"Mockup-only — not a DOCX file"`, project, template V0, ruleVersion, runMode, values (quantity, unitPrice, costRate, revenue, cost, profit), mockBuild. [ĐX] manifest thật gồm hash template, version recipe, snapshot nguồn, Section Revision đã duyệt, hash đầu ra, người duyệt; không dùng nhãn "demo".

**FR-16 Nhật ký chạy** [QS] — AC: Runner hiện tối đa 4 Run mới nhất (Run #n, giờ, phạm vi, các phần đã chạy).

**FR-17 Lịch sử và snapshot** [QS/ĐX] — AC: History liệt kê Run, CR, thay đổi số liệu, Recipe vN, Template V0; Build Snapshots liệt kê mọi build kể cả mẫu B-027 "Đã xuất". [ĐX] lưu bền qua phiên; mỗi bản ghi **bất biến về nội dung (không sửa)** và truy vết đủ để tái lập khi còn tồn tại. [ĐÃ CHỐT Q12, SỬA vòng 4] lưu bền (production); ai cũng xem được và **ai cũng xóa được** (không phân quyền); người dùng **được tự xóa từng bản ghi** và có chức năng **«Xóa sạch»**; KHÔNG còn nguyên tắc «chỉ thêm, không xóa». AC [ĐX]: (a) xóa từng bản ghi / «Xóa sạch» hiện hộp xác nhận nêu rõ phạm vi (số bản ghi, loại) và **không hoàn tác**; (b) mã bản dựng đã xóa không tái dùng (Q11); (c) xóa bản dựng làm mất khả năng tái lập của bản đó; (d) «Xóa sạch» chỉ xóa lịch sử Run/CR/bản dựng, KHÔNG xóa Template V0 và nguồn dữ liệu — [MỞ nhỏ], đề xuất; (e) không sửa nội dung bản ghi. [MỞ nhỏ] thời gian lưu (07 §H.3, §H.14). Prototype vẫn mất mọi dữ liệu khi tải lại và **chưa triển khai xóa**.

**FR-18 Bố cục đáp ứng và bàn phím** [QS một phần] — AC: ≤1350px: cột phải xuống dưới thành 2 cột; ≤900px: thanh bên thu về 72px chỉ icon, bố cục 1 cột. Mọi hành động bằng `button`/`input` nên truy cập được bằng Tab/Enter (chưa kiểm chứng focus-visible, ARIA — [MỞ]).

**FR-19 Nhãn minh bạch prototype** [QS] — AC: UI ghi "dữ liệu giả lập", "Không phải Word thật", "Preview giả lập"; chân trang: "Không tạo hoặc thay đổi DOCX thật". Phải giữ các nhãn này.

**FR-20 Thư viện Rule có version/trạng thái** [ĐX, từ ảnh 02; HTML [QS] chỉ liệt kê tên] — Mỗi Rule hiển thị mã, mô tả, version, trạng thái (Nháp/Đã duyệt…), nhãn nguồn tạo (AI nếu có). AC: tìm theo mã/tên/mô tả; lọc theo trạng thái; "+ Tạo quy tắc" tạo Rule ở trạng thái Nháp v1; Rule Nháp không được dùng để chạy/build. [ĐÃ CHỐT Q18] cho phép sửa tay version/trạng thái; Rule Nháp không được chạy/build (xác nhận); hệ quả sửa tay: 07 §H.4.

**FR-21 Chi tiết Rule: Định nghĩa, Thực thi & Kiểm thử, Lịch sử phiên bản, Sử dụng** [ĐX, từ ảnh 02] — AC: tab Định nghĩa hiển thị ruleId, version, target, instruction, inputs, dependsOn, status và JSON tương ứng, hai chiều nhất quán; tab Lịch sử liệt kê mọi version bất biến (FR-07); tab Sử dụng liệt kê Section/Run/Build đang tham chiếu Rule (ảnh: 3); chọn version cũ chỉ xem, không sửa. Tab Thực thi & Kiểm thử: chưa có nội dung trong ảnh [MỞ]. Prototype [QS] không có các tab này; JSON hiển thị chỉ là schema demo.

**FR-22 Data Binding có sheet/cột** [ĐX, từ ảnh 02] — AC: mỗi liên kết lưu nguồn, sheet, cột/range, trạng thái liên kết; "+ Liên kết" thêm nguồn; Rule chỉ tham chiếu nguồn đã liên kết. [ĐÃ CHỐT Q20] thêm được **nhiều nguồn** Excel/DOCX, **không giới hạn số nguồn**; cách dùng nguồn do người dùng định nghĩa trong Rule. Ví dụ: Section A có thông tin x, y → Rule lấy y tham chiếu theo x trong tài liệu nguồn (AC: khai báo khóa x, cột/trường y, nguồn; kết quả ghi evidence nguồn/sheet/cột/dòng; x thiếu/trùng → áp dụng chính sách Q9 [ĐÃ CHỐT A]: dừng chạy Section, hiện lỗi rõ nguyên nhân, không ghi kết quả/Run). [ĐÃ CHỐT vòng 4] «4/4» chỉ là số mock trong ảnh; hệ thống đếm **liên kết hợp lệ / tổng liên kết thật**, không giới hạn số nguồn (07 §H.16).

**FR-23 Truy vết CR ↔ Build/Recipe** [ĐX, từ ảnh 02] — AC: bảng "Yêu cầu thay đổi liên quan" của một Rule/dự án hiện mã CR, nội dung, phạm vi ảnh hưởng (P01…P05/Toàn bộ), trạng thái, ngày cập nhật; CR xử lý xong liên kết tới bản dựng sinh ra (ảnh: CR-003 ↔ v2.3). Mở rộng FR-03. [ĐÃ CHỐT Q21] trạng thái CR, phạm vi, ngày cập nhật là thuộc tính bắt buộc và CR gắn với build (07 §C.10).

## 5. Yêu cầu phi chức năng [ĐX]
Tái lập (cùng đầu vào + recipe + snapshot ⇒ cùng kết quả); truy vết; V0 bất biến; định dạng số vi-VN; chỉ tiếng Việt, số `vi-VN` [ĐÃ CHỐT Q14]; không giới hạn Section/nguồn [ĐÃ CHỐT Q13]; hiệu năng và dung lượng **[MỞ]** (chưa có số liệu; ảnh ghi "~10 giây" chỉ là mock).

## 6. Lưu ý về tính toán
Công thức: doanh thu = qty×đơn giá; chi phí = doanh thu×tỷ lệ; lợi nhuận = doanh thu − chi phí; Phần 05 sinh câu cố định theo số. Đây là mã JS cố định, **không** là năng lực production. Số thập phân dấu phẩy động chưa xử lý làm tròn tiền tệ [MỞ].

## 7. Điểm cần người dùng quyết định
Xem `00_…` §5 và `07_…`. Vòng 4: Q16, Q18, Q6, Q20 đóng; Q12 sửa (được xóa). Vòng 3: Q10, Q11 đã chốt; Q15 chốt (hệ quả [ĐX]); Q19 chốt song song nhưng [MỞ] công thức Phần 04 (07 §H.7–H.11). Đã chốt: Q1–Q11, Q12–Q15, Q17, Q18, Q20, Q21 (Q9 = phương án A: dừng chạy Section khi hòa/thiếu dữ liệu giá; thi hành là yêu cầu production [ĐX]). Vòng 2: xem 07 §H.

### Bổ sung vòng 3 (2026-11-23)
- **FR-15 (Q11):** mã bản dựng đếm tăng theo từng dự án, bất biến, không tái dùng; hiển thị «B-028 · Rule v3 · Mẫu V0 (hash…)» [PROD]. AC: tạo build thứ 2 trong dự án → B-002 khác dự án khác; xóa/hủy build không làm tái dùng số.
- **FR-08 (Q19):** đồ thị mục tiêu song song 01→02→{03,04}→05 **chờ chốt công thức Phần 04** (07 §H.11). Prototype giữ đồ thị hiện có (04 phụ thuộc 03) tới khi xác nhận; AC (b) «đổi tỷ lệ → 03,04,05 stale» vẫn đúng ở cả hai phương án nếu 04 dùng tỷ lệ trực tiếp.
- **Q16:** chạy lại do người dùng tự bấm; không tự chạy lại khi nguồn Excel đổi phiên bản [PROD]. **Vòng 4 [ĐÃ CHỐT]:** nguồn đổi phiên bản ⇒ hệ thống đánh dấu stale các Section dùng nguồn và nêu lý do; không tự chạy.

### Bổ sung vòng 4 (2026-11-23)
- **FR-17 (Q12 sửa):** xem FR-17: được xóa từng bản ghi và «Xóa sạch»; bản ghi bất biến về nội dung nhưng xóa được.
- **FR-07/FR-20 (Q18):** sửa tay version chỉ là nhãn, không trùng version cũ; Rule đổi sang Nháp ⇒ Section dùng Rule stale + mất phê duyệt; đổi lại Đã duyệt không tự hết stale — phải chạy và duyệt lại.
- **FR-14 (Q6):** Layout Diff luôn chỉ cảnh báo, không ngoại lệ; lỗi nặng (bảng tràn, trang trắng) cảnh báo mạnh hơn.
- **FR-22 (Q20):** «4/4» là mock; đếm liên kết hợp lệ / tổng liên kết thật.
- **[MỞ] giữ:** Q19 công thức Phần 04 (đề xuất Doanh thu × (1 − tỷ lệ chi phí), CHƯA xác nhận); thứ tự giai đoạn G1–G6 chưa xác nhận. **Vòng 4 [ĐÃ CHỐT]:** nguồn đổi phiên bản ⇒ hệ thống đánh dấu stale các Section dùng nguồn và nêu lý do; không tự chạy.

### Bổ sung vòng 4 (2026-11-23)
- **FR-17 (Q12 sửa):** xem FR-17: được xóa từng bản ghi và «Xóa sạch»; bản ghi bất biến về nội dung nhưng xóa được.
- **FR-07/FR-20 (Q18):** sửa tay version chỉ là nhãn, không trùng version cũ; Rule đổi sang Nháp ⇒ Section dùng Rule stale + mất phê duyệt; đổi lại Đã duyệt không tự hết stale — phải chạy và duyệt lại.
- **FR-14 (Q6):** Layout Diff luôn chỉ cảnh báo, không ngoại lệ; lỗi nặng (bảng tràn, trang trắng) cảnh báo mạnh hơn.
- **FR-22 (Q20):** «4/4» là mock; đếm liên kết hợp lệ / tổng liên kết thật.
- **[MỞ] giữ:** Q19 công thức Phần 04 (đề xuất Doanh thu × (1 − tỷ lệ chi phí), CHƯA xác nhận); thứ tự giai đoạn G1–G6 chưa xác nhận.
- **Q10/Q15:** xem 03 §B và 02 §2; prototype không tạo DOCX thật, không đổi template.
