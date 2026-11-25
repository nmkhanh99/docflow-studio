# 00 — Kế hoạch tài liệu DocFlow Studio

Nguồn đã đọc: `docs/DocFlow_Interactive_Mockup.html` (77 dòng, JS nằm trong dòng 9–73) và 4 ảnh `mockup_01..04_*.png` (chỉ đọc). Không sửa HTML/PNG.

Quy ước phân loại trong toàn bộ bộ tài liệu:
- **[QS]** Hành vi quan sát được trong prototype (kèm dòng/hàm tham chiếu khi cần).
- **[ĐX]** Yêu cầu đề xuất cho sản phẩm thật.
- **[MỞ]** Quyết định/điểm chưa rõ cần người dùng chốt.

## 1. Danh sách tài liệu

| # | File | Mục đích | Người đọc chính |
|---|------|----------|-----------------|
| 00 | `00_KeHoach_TaiLieu.md` | Kế hoạch, thứ tự, câu hỏi mở tổng hợp | Chủ sản phẩm, BA |
| 01 | `01_PhamVi_YeuCau.md` | Luồng workspace–recipe–runner–build–history; FR-xx + tiêu chí chấp nhận | BA, Dev, QA |
| 02 | `02_KhaiNiem_Template_V0_ContentDiff_LayoutDiff.md` | Định nghĩa Template V0 bất biến, Content Diff, Layout Diff, stale/phê duyệt/cổng build | Mọi vai trò |
| 03 | `03_KhaNang_Prototype_va_Kien_Truc_Production.md` | (A) Prototype thực sự làm gì; (B) kiến trúc production đề xuất | Kiến trúc sư, Dev |
| 04 | `04_KeHoach_KiemThu.md` | Kịch bản kiểm thử thủ công trên prototype | QA |
| 05 | `05_BaoCao_KiemThu.md` | Báo cáo kiểm thử | QA |
| 06 | `06_DacTa_SuaLoi_Prototype.md` | Đặc tả sửa lỗi T-01..T-07 | Dev |
| 07 | `07_QuyetDinh_Va_DacTa_Prototype_V2.md` | Quyết định Q1–Q21, đặc tả Q2/Q4/Q5, đánh giá Q10, giải thích Q11/Q19 | Mọi vai trò |

## 2. Thứ tự đọc/viết
02 (khái niệm) → 01 (yêu cầu dựa trên khái niệm) → 03 (ranh giới prototype/production) → 04 (kiểm thử bám FR). 00 là mục lục. Trong repo, file được đánh số theo thứ tự đọc.

## 3. Bản đồ chủ đề → tài liệu
| Chủ đề | Nơi mô tả chính |
|---|---|
| Change request (CR-xxx) | 01 §3.2, FR-03/04 |
| Phiên bản Recipe (ruleV) | 01 §3.3, 02 §5 |
| Phụ thuộc giữa 5 Section | 02 §4 |
| Stale / phê duyệt / cổng build | 02 §5–6, FR-08..FR-12 |
| Build manifest | 01 FR-15, 03 §B |
| Lịch sử | 01 FR-17 |
| Content Diff vs Layout Diff | 02 §3 |

## 4. Điểm lệch giữa ảnh và HTML (Q1: không có nguồn chuẩn)
Quan sát được khi so sánh [QS]:
1. Ảnh 01 có ô chat "Hỏi hoặc yêu cầu chỉnh sửa tài liệu…", nút "Xuất DOCX", badge "4 thay đổi chờ duyệt", thanh nav trên (Trang chủ/Dự án/Mẫu tài liệu/Nguồn dữ liệu/Lịch sử). HTML không có chat, không có nút Xuất DOCX, nav dọc 5 mục.
2. Ảnh 03 ghi "Recipe v3.2 (Đã phê duyệt)"; HTML hiển thị "Recipe v3" và tăng số nguyên (v4, v5…).
3. Ảnh 03 chọn sản lượng bằng 3 radio (12.000/15.000/18.000); HTML dùng ô số + nút chip (ở Workspace) và ô số (ở Runner).
4. Ảnh 03 ước tính "~10 giây", "Lần chạy #7", lịch sử #5–#7 có sẵn; HTML bắt đầu với 0 lần chạy.
5. Ảnh 03 cho Phần 05 trạng thái "Cần xem lại"; HTML dùng "Chờ duyệt".
6. Ảnh 04 có "Kiểm tra bố cục" (checkbox), tab "Trang đơn / Toàn bộ / So sánh", panel "Ảnh hưởng (4)"; HTML dùng tab "Toàn bộ tài liệu / Content Diff / Layout Diff".
7. Ảnh 01 hiển thị "Trang 4/12" cho Phần 02 và tăng trưởng +25%, trong khi HTML hiển thị tài liệu 1 trang minh họa không có cột tăng trưởng.
8. **Ảnh 02 (màn Recipe) — chi tiết ở `01` §3.3, FR-20..FR-23 và `02` §7.** Tóm tắt [QS] điểm khác HTML:
   - **Ảnh có, HTML không có:** (a) badge phiên bản dự án "v2.3" + trạng thái "Đang thiết kế" cạnh tên dự án, nút "Tạo bản dựng", "Xuất DOCX", chuông/avatar; (b) thư viện Rule có ô tìm kiếm, bộ lọc trạng thái, nút "+ Tạo quy tắc", mỗi Rule có version và trạng thái (Đã duyệt/Nháp); (c) chi tiết Rule có 4 tab (Định nghĩa · Thực thi & Kiểm thử · Lịch sử phiên bản · Sử dụng (3)), chọn "Phiên bản: v3 (hiện tại)", trường Mã quy tắc/Phiên bản (ô số)/Mục tiêu/Hướng dẫn/Đầu vào có "Thêm đầu vào"/Phụ thuộc/Trạng thái (menu); (d) JSON có khối `execution` (workflow: lookup-price → calc-revenue → update-section); (e) đồ thị phụ thuộc ngay trên màn Recipe, 03 và 04 là hai nhánh song song cùng đổ vào 05; (f) Data Binding ghi sheet/cột và có nguồn thứ ba "Hồ sơ nhân sự.docx"; (g) xem trước DOCX (Trang 4/12, bảng có cột Đơn vị, dòng "Tỷ lệ tăng trưởng 20%"); (h) "Lịch sử bản dựng" v2.0–v2.3 kèm nút so sánh; (i) bảng "Yêu cầu thay đổi liên quan" có Phạm vi ảnh hưởng/Trạng thái "Đã xử lý"/Ngày cập nhật; (j) checklist tiến độ 85%.
   - **HTML có, ảnh không có:** ô "Cách lưu" (Quy tắc dùng lại / Patch một lần), nút "Lưu phiên bản quy tắc" + thông báo lưu, 5 bước "AI đề xuất", nhãn "AI plan: Demo"/"Type: Data + Content Rule", cảnh báo "executor cố định", ghi chú "Đơn giá demo hiện tại", Rule `production-quantity` cho Phần 01 và mã `revenue.price-lookup`, đầu vào `project.plan-date`, chính sách chọn đơn giá (ngày hiệu lực mới nhất; hòa/thiếu → báo).
   - **Cả hai có (nhưng khác chi tiết):** thư viện 5 Rule, soạn Rule doanh thu, `target = section-02.revenue`, JSON định nghĩa, Data Binding tới Excel 1, nút Chạy. Tên Rule/nhãn khác nhau (`revenue-rule` ↔ `revenue.price-lookup`).

→ **[ĐÃ CHỐT]** Q1: không có nguồn giao diện chuẩn; cả ảnh và HTML đều chỉ là mockup. HTML vẫn là nơi *quan sát* hành vi prototype hiện có; ảnh là gợi ý giao diện. Chênh lệch ở §4 là danh sách mục cần quyết từng mục, không bên nào mặc định thắng.

## 5. Câu hỏi / quyết định (cập nhật 2026-11-23)
Chi tiết, tiêu chí chấp nhận và phân biệt PROTO/PROD: `07_QuyetDinh_Va_DacTa_Prototype_V2.md`. Nhãn: **[ĐÃ CHỐT]** người dùng đã quyết · **[MỞ]** chưa quyết.
| ID | Câu hỏi | Nhãn | Quyết định (2026-11-23) | Ảnh hưởng |
|---|---|---|---|---|
| Q1 | Ảnh vs HTML: nguồn nào là chuẩn giao diện? (§4) | [ĐÃ CHỐT] | Không có nguồn chuẩn (ảnh và HTML đều là mockup). **Vòng 2:** mọi chức năng thấy trong ảnh là cần có và được giữ; HTML hiện chưa có nhiều mục; kế hoạch giai đoạn G1–G6 là đề xuất (07 §H.2) | 01, 04 |
| Q2 | Đưa qty về 12.000 có hết stale? | [ĐÃ CHỐT] | Không: phải chạy/duyệt lại; stale theo sự kiện thay đổi, không so giá trị | FR-08, 02 §5 |
| Q3 | Lưu Recipe version mới có làm stale 02–05? | [ĐÃ CHỐT] | Có, bắt buộc | FR-06, 02 |
| Q4 | Phần 01 có cần phê duyệt? | [ĐÃ CHỐT] | Có | FR-10, FR-11 |
| Q5 | Ai duyệt; từng Section hay tất cả? | [ĐÃ CHỐT] | Không có vai trò; duyệt từng Section và duyệt tất cả | FR-10 |
| Q6 | Layout Diff chặn build hay chỉ cảnh báo? | [ĐÃ CHỐT, xác nhận vòng 4] | Luôn chỉ cảnh báo, KHÔNG có ngoại lệ chặn; lỗi nặng (bảng tràn, trang trắng) cảnh báo mạnh hơn (07 §H.13) | FR-14, 02 §3 |
| Q7 | Duyệt có bị thu hồi khi chỉ phân trang đổi? | [ĐÃ CHỐT] | Có; vòng 2 xác nhận "đúng ý": phân trang đổi → thu hồi duyệt → phải duyệt lại → build bị chặn gián tiếp vì chưa duyệt (07 §H.1) | 02 |
| Q8 | Chạy riêng Single một Section? | [ĐÃ CHỐT] | Cho phép | FR-09 |
| Q9 | Chính sách chọn đơn giá | [ĐÃ CHỐT] (phương án A) | Nhiều dòng hợp lệ → ngày hiệu lực mới nhất. Dòng hòa (cùng ngày hiệu lực) hoặc thiếu dữ liệu → **DỪNG chạy Section đó**, hiện lỗi rõ nguyên nhân, không ghi kết quả/Run cho Section đó cho tới khi người dùng sửa dữ liệu. Yêu cầu production [ĐX]; prototype không thi hành (07 §H.5) | FR-06 |
| Q10 | Công cụ tạo/patch DOCX, engine render | [ĐÃ CHỐT, PROD] | Chọn khuyến nghị 07 §D.4: P1 patch OOXML bản sao V0 + bộ định vị Section thêm vào bản sao + LibreOffice headless; manifest ghi «theo engine X phiên bản Y»; làm spike trên «Kế hoạch kinh doanh 2027.docx». Prototype vẫn KHÔNG tạo DOCX thật (07 §H.7) | 03 §B |
| Q11 | Quy ước mã bản dựng `B-028` | [ĐÃ CHỐT, PROD] | Dùng phương án A: đếm tăng theo từng dự án, mã bất biến, không tái dùng; hiển thị «B-028 · Rule v3 · Mẫu V0 (hash…)» (07 §H.8) | FR-15 |
| Q12 | Lưu bền lịch sử | [ĐÃ CHỐT, SỬA vòng 4] | Lưu bền; ai cũng xem, không phân quyền; **người dùng ĐƯỢC TỰ XÓA từng bản ghi và có «Xóa sạch»** (thay đề xuất cũ «chỉ thêm, không xóa»). Bản ghi bất biến về nội dung nhưng xóa được; hệ quả [ĐX]/[MỞ nhỏ] ở 07 §H.14; [MỞ nhỏ] thời gian lưu | FR-17 |
| Q13 | Giới hạn kích thước/số Section/nguồn | [ĐÃ CHỐT] | Không giới hạn | 01 |
| Q14 | Ngôn ngữ | [ĐÃ CHỐT] | Chỉ tiếng Việt | 01 |
| Q15 | Đổi template của dự án đang có lịch sử | [ĐÃ CHỐT: được phép; hệ quả [ĐX]] | Người dùng được đổi template; hệ quả (build cũ giữ hash V0 cũ; ánh xạ lại Section; stale + hủy duyệt; baseline Layout Diff đổi) là [ĐX] chưa duyệt (07 §H.9, 02 §2) | 02 §2 |
| Q16 | Ranh giới "chạy lại" khi nguồn Excel đổi phiên bản | [ĐÃ CHỐT, vòng 4] | Nguồn đổi phiên bản ⇒ hệ thống ĐÁNH DẤU stale các Section dùng nguồn đó và nêu lý do; KHÔNG tự chạy; người dùng tự bấm chạy lại (07 §H.10) | 02 §8 |
| Q17 | "v2.3" vs "v3": một hay hai bộ đếm? | [ĐÃ CHỐT] | Hai bộ đếm khác nhau (bản dựng/dự án vs version Rule) | FR-07, FR-15 |
| Q18 | Sửa tay version/trạng thái Rule | [ĐÃ CHỐT] | Cho phép sửa tay; Rule Nháp không dùng để chạy/build. Vòng 4: sửa tay version chỉ là nhãn, không trùng version cũ; đổi sang Nháp ⇒ Section dùng Rule stale + mất duyệt; đổi lại Đã duyệt KHÔNG tự hết stale (07 §H.4, §H.15) | FR-07, FR-20 |
| Q19 | 03 và 04 song song hay 04 phụ thuộc 03? | [ĐÃ CHỐT một phần: song song; MỞ: công thức 04] | Người dùng chọn song song 01→02→{03,04}→05. MÂU THUẪN với «Lợi nhuận = Doanh thu − Chi phí (03)»: cần chốt công thức 04 độc lập (07 §H.11). Dev CHƯA đổi đồ thị prototype | 02 §4, FR-08 |
| Q20 | Nguồn thứ ba "Hồ sơ nhân sự.docx" | [ĐÃ CHỐT; "4/4" đã đóng vòng 4] | Nhiều nguồn Excel/DOCX, không giới hạn; cách dùng do Rule định nghĩa (07 §H.6). «4/4» chỉ là số mock; hệ thống đếm liên kết hợp lệ / tổng liên kết thật (07 §H.16) | FR-22 |
| Q21 | Thuộc tính bắt buộc của CR và gắn build | [ĐÃ CHỐT] | Trạng thái, phạm vi, ngày cập nhật bắt buộc; CR gắn với build | FR-03, FR-23 |

Vòng 3 (2026-11-23): Q10, Q11 đã chốt; Q15 được phép đổi template (hệ quả [ĐX]); Q16 chốt một phần ([MỞ nhỏ] stale khi nguồn đổi); Q19 chốt song song nhưng [MỞ] công thức Phần 04 (xem 07 §H.7–H.11). Dev chưa đổi đồ thị phụ thuộc cho tới khi người dùng xác nhận công thức.

Vòng 4 (2026-11-23): Q16 đóng (đánh dấu stale, không tự chạy); Q12 SỬA (được tự xóa từng bản ghi + «Xóa sạch»; hệ quả [ĐX]); Q18 đóng; Q6 đóng không ngoại lệ; Q20 «4/4» đóng. Còn [MỞ]: Q19 công thức Phần 04 (chưa xác nhận), thứ tự giai đoạn G1–G6 (chưa xác nhận), phạm vi «Xóa sạch» (V0/nguồn), thời gian lưu, duyệt hệ quả Q15, Q10 spike (07 §H.17).

Vòng 4 (2026-11-23): Q16 đóng (đánh dấu stale, không tự chạy); Q12 SỬA (được tự xóa từng bản ghi + «Xóa sạch»; hệ quả [ĐX]); Q18 đóng; Q6 đóng không ngoại lệ; Q20 «4/4» đóng. Còn [MỞ]: Q19 công thức Phần 04 (chưa xác nhận), thứ tự giai đoạn G1–G6 (chưa xác nhận), phạm vi «Xóa sạch» (V0/nguồn), thời gian lưu, duyệt hệ quả Q15, Q10 spike (07 §H.17).

## 6. Rủi ro hiểu nhầm cần lưu ý
- Số trang 12/13 trong prototype là hằng số (`longContent ? 13 : 12`), **không** phải kết quả phân trang.
- Tính doanh thu/chi phí/lợi nhuận là phép nhân/trừ cố định trong JS; mô tả Recipe bằng ngôn ngữ tự nhiên **không** được diễn giải.
- Ảnh 02: "Trang 4/12", xem trước DOCX, tab "Thực thi & Kiểm thử", JSON `execution`, "Đã xử lý" chỉ là hình minh họa; HTML không có các năng lực đó (xem `03` §A). Đồ thị trong ảnh không chứng minh có bộ phân tích phụ thuộc thật.
- "Manifest" tải về là JSON giả, tự ghi "Mockup-only — not a DOCX file".

> Vòng 2 (2026-11-23): xem `07` §H. Q9 đã chốt phương án A (dừng chạy Section khi hòa/thiếu dữ liệu giá). Câu hỏi còn mở mới/giữ: Q12 (thời gian lưu), Q18 (đổi version tay có làm stale?), thứ tự giai đoạn G1–G6, Q6 (lỗi layout nghiêm trọng), "4/4".
