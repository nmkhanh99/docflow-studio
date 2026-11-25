# 05 — Báo cáo kiểm thử độc lập (prototype)

Đối tượng: `docs/DocFlow_Interactive_Mockup.html` (không sửa). Kế hoạch: `docs/04_KeHoach_KiemThu.md`.
Môi trường: Chrome, trang phục vụ qua `http://127.0.0.1` (Chrome chặn `file://` đối với công cụ tự động; HTML không đổi). Ca được chạy bằng cách thao tác DOM/gọi sự kiện trên trang tải mới (iframe có độ rộng chỉ định), riêng TC-71, 73, 75 dùng phím thật (Enter/Space/ArrowUp/Tab).
Giới hạn: không có ảnh chụp màn hình kèm theo; số đo độ rộng lấy từ DOM (`scrollWidth`, `getComputedStyle`), đã trừ 4px viền khung. Đây là kiểm thử hành vi mô phỏng, **không** khẳng định layout Word thật và prototype **không** tạo DOCX thật (manifest tự ghi "Mockup-only — not a DOCX file").

## A. Phát hiện chính: tài liệu 04 suy ra sai về trạng thái ban đầu
`state.qty` khởi tạo là **15.000** (dòng 20 của HTML) trong khi kết quả lưu (`results`) là của **12.000**. Vì vậy trang tải mới **không** phải "seed qty 12.000, đã duyệt": ngay khi mở đã có **4 phần stale**, nút Duyệt bị vô hiệu, Build bị chặn. Hệ quả: nhiều ca trong 04 (TC-00, 01, 04, 10…) phải đọc lại. Trạng thái "sạch, đã duyệt" chỉ có sau `?seed=approved` (và khi đó qty = 15.000, không phải 12.000) hoặc khi người dùng đặt lại 12.000 thủ công.

Giá trị mặc định sau khi tính (qty 15.000 × 250.000; tỷ lệ 65%): doanh thu **3.750.000.000**, chi phí **2.437.500.000**, lợi nhuận **1.312.500.000** — **Đạt**, xác nhận trong manifest xuất ra. Trên giao diện chỉ hiện làm tròn "3,75 / 2,44 / 1,31 tỷ đ" (định dạng vi-VN dấu phẩy thập phân, dấu chấm hàng nghìn đúng); bảng preview hiện đủ 3.750.000.000 cho doanh thu.

## B. Kết quả từng ca
| ID | Kết quả | Kỳ vọng (04) | Thực tế |
|---|---|---|---|
| TC-00 | **Không đạt** | Badge 0 (xanh), Duyệt bật | Badge "4 phần cần tính lại" (hổ phách), số 4 cạnh menu, Duyệt **vô hiệu**. Nhật ký "Chưa có lần chạy" đúng. Xem mục A |
| TC-01 | Đạt* | Đặt qty 15.000 → 4 stale, 02–05 hổ phách, menu 4, Duyệt vô hiệu | Đúng, nhưng đã xảy ra sẵn từ lúc tải (qty mặc định 15.000) nên bước "đặt" không tạo thay đổi |
| TC-02 | Đạt | Từ seed đặt tỷ lệ 70 → chỉ 03–05 stale | Badge 3; 02 "Hợp lệ" (seed = `?seed=approved`) |
| TC-03 | Đạt | Đơn giá 260000 → 4 stale | Badge 4 |
| TC-04 | Đạt (có điều kiện) | 15.000 rồi 12.000 → về 0 | Từ trang mới: đặt 12.000 → badge 0, cả 4 "Hợp lệ" (kết quả gốc 12.000 đã duyệt sẵn nên phục hồi cả trạng thái duyệt). Từ `?seed=approved` (kết quả ở 15.000) đặt 12.000 → vẫn 4 stale. Hành vi khớp "so sánh với kết quả lưu", ghi nhận Q2 |
| TC-05 | Đạt | Header Recipe v4, thông báo v4, 02–05 stale | Header v4; thông báo "Đã lưu bản mô tả v4…" hiện trên màn Recipe; 4 stale |
| TC-06 | Đạt | Chip 18.000 → ô 18.000, thông báo 12.000 → 18.000, Mẫu gốc 12.000 | Đúng cả ba |
| TC-10 | Đạt* | qty 15.000, Affected, chạy → 4 phần, 3,75/2,44/1,31 tỷ, chờ duyệt, Run #1 | Đúng ("Đã chạy 4 phần (02, 03, 04, 05)", cả 4 "Chờ duyệt", Run #1). Chế độ mặc định đã là Affected |
| TC-11 | Đạt | Không stale, Affected → "Không có phần nào cần tính lại"; log 'Không có' | Đúng (`?seed=approved` tự thực hiện 1 run nên run này là Run #2) |
| TC-12 | Đạt | Full → chạy 4 phần, chờ duyệt | Đúng |
| TC-13 | Đạt | Single Phần 03 khi 02 stale → bị chặn, không thêm Run | Thông báo "…upstream 02 đang stale…"; nhật ký vẫn Run #0 |
| TC-14 | Đạt | Single Phần 02 → 03–05 stale, badge 3 | Đúng |
| TC-15 | Đạt | Single 02 rồi Single 03 → lần 2 được phép, 04,05 stale | Lần 2 chạy được; badge 2 (04, 05 stale) |
| TC-16 | Đạt | History có "Run #1 · affected", sản lượng 15.000 | Đúng |
| TC-20 | Đạt | Sau TC-10 Build vô hiệu; "Còn 0 phần cần tính lại và 4 kết quả cần duyệt" | Đúng nguyên văn |
| TC-21 | Đạt | Duyệt → 4 "✓ Hợp lệ" + thông báo | Đúng |
| TC-22 | Đạt | Build bật; "Tất cả kết quả demo nhất quán và đã duyệt" | Đúng |
| TC-23 | **Một phần** | Dòng `B-028 · Preview demo`, thông báo "preview GIẢ LẬP", 12 trang, +0, Manifest bật | Dòng lịch sử là "B-028 · Báo cáo kế hoạch kinh doanh — 15.000 SP" với nhãn trạng thái "Preview demo" (không phải chuỗi `B-028 · Preview demo`). 12 trang, +0, Manifest bật: đúng. **Thông báo "GIẢ LẬP" không hiển thị ở màn Build** (`state.notice` chỉ được vẽ ở màn Runner; xuất hiện khi quay lại Runner) — 04 suy ra sai vị trí |
| TC-24 | Đạt | File `docflow_build_manifest_demo.json`, notice Mockup-only, ruleVersion, giá trị đúng | Tên file đúng; có `"notice":"Mockup-only — not a DOCX file"`, `ruleVersion:3`, revenue 3750000000, cost 2437500000, profit 1312500000 (chặn blob để đọc, không lưu file xuống đĩa) |
| TC-25 | Đạt (diễn giải khác) | Đổi tỷ lệ → preview xóa, trang "—", Manifest vô hiệu | Trang "— trang", Manifest vô hiệu, cảnh báo "Còn 3 phần cần tính lại…". Lưu ý: dòng B-028 **vẫn còn** trong Build History (`state.built=null` chỉ xóa preview hiện hành) |
| TC-26 | Đạt | `?seed=approved` có B-028, cổng mở | Có B-028 và B-027; nút bật; 12 trang |
| TC-27 | Đạt | Qty chưa chạy → Build vô hiệu; "Còn 4 phần cần tính lại" | Đúng ("Còn 4 phần… và 0 kết quả cần duyệt"); đây cũng là trạng thái ngay khi tải |
| TC-30 | Đạt | Tab Content/Layout Diff không đổi | Là thẻ `<span>`, không tương tác, không focus được |
| TC-31 | Đạt | `?view=build&seed=approved&long=1` → 13 trang, +1, ô Layout Diff nói nội dung dài | 13 trang, Biến động +1, "Trang 2 / 13", nội dung "Nội dung phần 1 dài thêm…". Là hằng số 13, không phải phân trang thật |
| TC-32 | Đạt | Bản nháp thêm 2 đoạn; Mẫu gốc không | Bản nháp 5 đoạn, Mẫu gốc 3 đoạn |
| TC-40 | Đạt | Sửa mô tả, Lưu → version +1, giữ văn bản khi đổi tab | v4; văn bản giữ lại sau đổi tab |
| TC-41 | Đạt | Không thay đổi hiển thị | Select đổi nhưng không có hiệu ứng nào khác (`rulePersistence` chỉ lưu vào state) |
| TC-42 | Đạt | `<b>x</b>` hiển thị dạng chữ | Hiển thị nguyên văn trong textarea, không có thẻ `<b>` được chèn (có `esc()`) |
| TC-50 | Đạt | Lưu CR 2 lần → CR-002, CR-003 đầu danh sách (tối đa 3); History đủ | Danh sách hiện CR-003, CR-002, CR-001; History liệt kê cả ba |
| TC-51 | Không kiểm lại | Tải lại mất dữ liệu | Theo mã: toàn bộ trạng thái nằm trong biến JS, không lưu trữ (Q12). Mỗi ca ở đây đều bắt đầu từ trang tải mới nên đã quan sát gián tiếp |
| TC-52 | Đạt (ghi nhận) | Rỗng → 0; số âm ghi nhận | Rỗng → 0. Số âm chấp nhận (`min=0` chỉ là gợi ý): qty −5.000 chạy ra doanh thu/chi phí âm (ví dụ chi phí −0,81 tỷ đ), không có cảnh báo |
| TC-60 | Đạt | 1440px: 3 cột, không cuộn ngang | 3 cột (≥1351px); không cuộn ngang |
| TC-61 | Đạt | 1200px: cột phải xuống dưới thành 2 cột | Lưới 2 cột; `.grid-right` thành lưới 2 cột. Ngưỡng: 1351→3 cột, 1350→2 cột |
| TC-62 | **Không đạt (một phần)** | 800px: sidebar 72px icon, 1 cột, bảng cuộn ngang trong khung | Sidebar 72px, nhãn ẩn, 1 cột: đúng. Bảng kết quả **không cần** cuộn ngang (vừa 796px) — kỳ vọng cuộn ngang là suy diễn sai. Ngưỡng ≤900px (900→72px; 901→226px) |
| TC-63 | Ghi nhận | 375px: không vỡ nghiêm trọng; ghi phần tràn | **Trang cuộn ngang 394px** do thanh topbar (pill Recipe/Mẫu DOCX, nút "Chạy lại", "Xem trước" không co/xuống dòng); các màn Runner/Build đều bị |
| TC-64 | Đạt | ≤900px chuyển được 5 màn | Cả 5 tab chuyển được (Workspace → History) |
| TC-70 | Đạt (một phần kiểm) | Tab hết trang Runner | Runner có 21 điểm tab (15 nút, 3 ô số, 3 radio — theo nhóm radio thực tế chỉ 1 điểm dừng). Không duyệt hết bằng phím thật từng bước |
| TC-71 | Đạt | Enter/Space trên "Bắt đầu chạy" kích hoạt | Enter → Run #1; Space → Run #2 |
| TC-72 | Đạt | Nút vô hiệu không focus được | "Duyệt kết quả hợp lệ" (khi stale) `disabled`, `focus()` không có hiệu lực |
| TC-73 | **Đạt một phần** | Mũi tên đổi radio, hiện chọn Phần khi Single | ArrowUp đổi từ Affected sang Single, hộp chọn Phần xuất hiện. Nhưng sau khi đổi, **focus mất về `<body>`** (do render lại toàn bộ), nên không thể bấm mũi tên liên tiếp |
| TC-74 | Ghi nhận | Dấu focus/tương phản | Nút dùng viền focus mặc định của trình duyệt; ô nhập `outline:none` + viền tím và bóng `#6d6ef11c` (độ trong suốt thấp, tương phản yếu). Chưa đo tỷ số tương phản |
| TC-75 | Đạt + ghi nhận | `change` kích hoạt khi Tab rời ô; mất focus | Gõ 18000 + Tab → `change` bắn, badge cập nhật; `document.activeElement` = `<body>` (mất focus, lần Tab kế tiếp bắt đầu lại từ đầu trang) |

\* Đạt nhưng bước tái hiện cần đọc lại theo mục A.

## C. Lỗi/lệch thực tế (không sửa mã theo yêu cầu)
1. **Trạng thái ban đầu không phải 12.000** (mục A): `qty` khởi tạo 15.000, kết quả lưu 12.000 → 4 stale ngay khi mở. Ảnh hưởng TC-00/01/10/27 và mọi ca "từ seed".
2. **Cuộn ngang toàn trang**: 901px (+165px, do topbar ở layout 2 cột với sidebar 226px, trùng ngay trên ngưỡng 900) và 375px (+394px). Ở 900px trở xuống đến 800px không tràn.
3. **Mất focus sau mỗi thay đổi** (render lại `innerHTML`): ảnh hưởng nhập liệu số, radio, tab bằng bàn phím.
4. **Thông báo `state.notice` chỉ hiện ở Runner**: các hành động ở Build (tạo preview) và Workspace (Lưu CR, chip qty) không hiển thị thông báo mà 04 mong đợi (TC-23; "CR-00x đã được lưu…").
5. **Lịch sử build giữ B-028 sau khi preview bị vô hiệu** (TC-25) — thông tin có thể gây hiểu nhầm là bản build còn hiệu lực.
6. **Số âm không bị chặn** (TC-52).
7. `?seed=approved` thực hiện 1 run nên các ca đếm Run (TC-11) lệch 1 so với "từ seed sạch".

## D. Chỗ tài liệu 04 cần sửa
- Mô tả seed ban đầu ("qty 12.000, 02–05 đã duyệt") sai; thực tế qty 15.000, 4 stale, chưa chạy.
- TC-00: badge phải là "4 phần cần tính lại", Duyệt **vô hiệu**.
- TC-23: nhãn dòng build và vị trí thông báo "GIẢ LẬP".
- TC-62: bảng kết quả không cuộn ngang ở 800px.
- TC-25: cần nêu rõ B-028 vẫn nằm trong lịch sử.
- TC-61/60: nên ghi rõ ngưỡng chính xác (>1350px 3 cột; ≤900px 1 cột + sidebar 72px).
- TC-73/75: ghi nhận cụ thể mất focus sau thay đổi.

## E. Chưa kiểm
Ảnh chụp màn hình, các trình duyệt khác, duyệt Tab đầy đủ từng bước trên mọi màn, đo tỷ số tương phản, tải file thật xuống đĩa.

---

# F. Kiểm thử hồi quy độc lập sau sửa T-01..T-07 (task-29e178b5)

**Phạm vi/phương pháp:** Chrome thật qua `python3 -m http.server 8000 --directory docs`; mỗi kịch bản bắt đầu bằng tải lại trang. Thao tác nghiệp vụ dùng API `app.*` của trang (setQty/run/approveAll/createBuild…) để lặp lại được; **bàn phím dùng phím thật** (công cụ computer) cho TC-73/75/71/72/30. Responsive đo bằng iframe cùng nguồn (375/800/900/901/1350/1351/1440 × 5 màn, `?seed=approved&long=1`) — `scrollWidth − clientWidth`. Manifest chỉ bắt blob, không lưu file ra đĩa. Không sửa HTML/PNG, không cài công cụ. Mọi kết quả là hành vi **mô phỏng**; không khẳng định bố cục Word thật.
**Chưa làm:** ảnh chụp màn hình; TC-74 (đo tương phản, vẫn [MỞ]); trình duyệt khác; resize cửa sổ thật (dùng iframe thay thế); Tab thật qua toàn bộ Runner (TC-70).

## F.1 Kết quả theo ca
| ID | Kết quả | Kỳ vọng | Thực tế |
|---|---|---|---|
| TC-00 | Đạt | 0 stale, 4 Hợp lệ, Duyệt bật, chưa có Run | `?view=runner`: "0 phần cần tính lại", qty 12000/250000/65, "Chưa có lần chạy", không nút bị vô hiệu |
| TC-01 | Đạt | qty 15.000 → 4 stale, Duyệt vô hiệu | badge 4; chỉ "Duyệt kết quả hợp lệ" bị vô hiệu |
| TC-02 | Đạt | tỷ lệ 70 → 03,04,05 stale | badge 3; 03 và 04 "Cần tính lại", dòng phần 05 cũng "Cần tính lại"; 02 giữ Hợp lệ |
| TC-03 | Đạt | đơn giá 260000 → 4 stale | badge 4; trả đơn giá 250000 → 0 |
| TC-04 | Đạt | 15.000 rồi 12.000 → 0 stale, 4 Hợp lệ | badge 0, 4 "Hợp lệ" (ghi nhận Q2: so với kết quả lưu) |
| TC-05 | Đạt | Lưu Recipe → v4, thông báo, stale | Header "Recipe v4" (không hiện đôi), thông báo v4 hiện; build cũ bị vô hiệu |
| TC-06 | Đạt | chip 18.000 → "12.000 → 18.000"; Mẫu gốc 12.000 | khối ghi nhận "12.000 → 18.000" hiện; Mẫu gốc 12.000 (khối này là `.notice` tĩnh, không phải `role=status` — không ảnh hưởng nội dung) |
| TC-10 | Đạt | qty 15.000, Affected | "Đã chạy 4 phần (02, 03, 04, 05)…"; bảng 3,75 / 2,44 / 1,31 tỷ; 4 "Chờ duyệt"; Run #1 |
| TC-11 | Đạt | Không stale, Affected | "Không có phần nào cần tính lại." ghi Run (xem seed lệch 1 ở §A) |
| TC-12 | Đạt | Full | chạy 4 phần, 4 chờ duyệt |
| TC-13 | Đạt | Single 03 khi 02 stale bị chặn | "Không thể chạy riêng Phần 03: các phần upstream 02 đang stale…"; số Run không đổi |
| TC-14 | Đạt | Single 02 | "Đã chạy 1 phần (02)"; badge 3 |
| TC-15 | Đạt | Single 02 rồi 03 | lần 2 được phép; badge 2 (04,05 còn stale) |
| TC-16 | Đạt | History có "Run #1 · affected" sản lượng 15.000 | "Run #1 · affected … Sản lượng 15.000" |
| TC-20 | Đạt | Build vô hiệu, "Còn 0 … 4 cần duyệt" | "Còn 0 phần cần tính lại và 4 kết quả cần duyệt." Nút Tạo preview/Manifest vô hiệu |
| TC-21/22 | Đạt | Duyệt → 4 Hợp lệ; Build mở | 4 Hợp lệ + thông báo; "✓ Tất cả kết quả demo nhất quán và đã duyệt."; Manifest vẫn vô hiệu đến khi có preview |
| TC-23 | Đạt | B-028 "Preview demo", thông báo GIẢ LẬP ngay trên Build, 12 trang | thông báo "preview GIẢ LẬP — không phải file DOCX thật" hiện trên Build; "B-028 · … 15.000 SP" nhãn "Preview demo"; 12 trang; Manifest bật |
| TC-24 | Đạt | JSON đúng | tên `docflow_build_manifest_demo.json`; "Mockup-only — not a DOCX file"; ruleVersion 3; revenue 3750000000, cost 2437500000, profit 1312500000 |
| TC-25 | Đạt | đổi tỷ lệ → preview bị xóa, B-028 "Không còn hiệu lực", B-027 "Đã xuất" | đúng; số trang "—", Manifest vô hiệu; B-028 vẫn trong danh sách ở Build và History. Tạo preview mới → B-029 "Preview demo", B-028 vẫn "Không còn hiệu lực". Lưu Recipe cũng vô hiệu build (nhãn đổi) |
| TC-26 | Đạt | `?seed=approved` có B-028, cổng mở | B-028 (12.000 SP), nút bật. Với `?seed=approved` "executed rỗng": số Run lệch 1 như Dev ghi |
| TC-27 | Đạt | đổi qty → Build vô hiệu "Còn 4 … 0" | đúng |
| TC-30 | Đạt | hai tab bấm/phím, aria-selected, nhãn mô phỏng, không đổi state | click và ArrowRight×2 thật chuyển Content→Layout; `aria-selected` + roving tabindex đúng; nhãn "Mô phỏng" ở cả hai; state/Run/Build không đổi. Chưa thử riêng Space/Home/End |
| TC-31 | Đạt | `?long=1` → 13 trang, +1 | Layout Diff "13 trang", "+1"; không long: 12 trang |
| TC-52 | Đạt | số âm chặn kèm cảnh báo; tỷ lệ kẹp | qty −5000 → 0 + "Sản lượng không được âm: … bị từ chối và đưa về 0."; đơn giá −1 → 0 + cảnh báo; tỷ lệ 150 → 100, −10 → 0 kèm cảnh báo; rỗng → 0 và 0 → không cảnh báo; không có NaN; giá trị hợp lệ xóa cảnh báo và vẫn gây stale |
| TC-60 | Đạt (có ghi chú) | 3 cột, không cuộn ngang ở 1440/1351 | không cuộn ngang. 1351/1440: Workspace/Recipe/Build 3 cột; **Runner và History luôn 2 cột** ở mọi độ rộng >900px (thiết kế nội dung 2 cột, không phải lỗi mới; tài liệu 04 nên nêu rõ) |
| TC-61 | Đạt | ≤1350 → 2 cột | 1350: Workspace/Recipe/Build 2 cột; 1351: 3 cột; không cuộn ngang |
| TC-62 | Đạt | 900 → sidebar 72px, 901 → 226px; không cuộn ngang | 72 / 226 đúng; 800, 900, 901 không cuộn ngang ở 5 màn |
| TC-63 | Đạt | 375px không cuộn ngang | 0px ở 5 màn; 1 cột; nút topbar nằm trong khung (2/2) |
| TC-64 | Đạt (đo gián tiếp) | chuyển 5 màn ≤900px | tab có mặt ở 72px; các màn đo được ở 375–900px (chưa bấm từng tab ở độ rộng đó) |
| TC-71 | Đạt | Enter trên "Bắt đầu chạy" kích hoạt, giữ focus | Enter thật → Run #1 rồi #2; focus giữ trên nút |
| TC-72 | Đạt | nút vô hiệu không nhận focus/kích hoạt | "Duyệt kết quả hợp lệ" khi stale: `disabled`, `focus()` không có hiệu lực, Enter không kích hoạt |
| TC-73 | Đạt | ArrowUp/Down ≥3 lần, focus giữ ở nhóm radio | ArrowDown thật ×3 (Single→Affected→Full→Single), 3 sự kiện đều trên radio `mode`, activeElement vẫn là radio; chọn Single hiện hộp chọn Phần |
| TC-74 | Ghi nhận | [MỞ] | Có luật `:focus-visible` trong CSS; chưa đo tỷ số tương phản |
| TC-75 | **Không đạt** | gõ giá trị + Tab: `change` bắn, focus sang phần tử kế, ≠ `<body>` | Bấm focus ô qty, gõ 18000, nhấn Tab thật (lặp 2 lần, trang tải mới): qty = 18000, badge cập nhật, nhưng `document.activeElement` = `<body>`; phần tử kế đúng ra là ô Đơn giá (250000). Dev ghi chỉ đã thử bằng sự kiện giả lập; phím Tab thật không được giữ |

## F.2 Lỗi cần Dev sửa (task kế tiếp)
1. **TC-75 / T-03 tiêu chí 2 (Cao):** Tab thật rời ô số → focus rơi về `<body>`. *Bước:* `?view=runner` → click ô Sản lượng, chọn hết, gõ 18000, nhấn Tab → đọc `document.activeElement`. *Kỳ vọng:* ô Đơn giá. *Thực tế:* `BODY`. Gợi ý (không sửa ở đây): cơ chế `tabIntent` trong keydown (đặt 60 ms) và `focusRestore` chạy sau khi trình duyệt tự dời focus hoặc nhận `change` sau thời điểm render, nên focus bị ghi đè bởi render.

## F.3 Ghi chú
- Các ca TC-73, 71, 72, 30 dùng phím thật nên đã đóng được lưu ý "chỉ thử bằng sự kiện giả lập" của Dev, trừ TC-75 vẫn lỗi.
- Giá trị mặc định kỳ vọng (15.000): doanh thu 3.750.000.000, chi phí 2.437.500.000, lợi nhuận 1.312.500.000 — khớp Manifest; định dạng vi-VN dùng dấu chấm nghìn và "3,75 tỷ".
- Sửa 04 gợi ý: TC-60 thêm "Runner/History 2 cột".

# G. Kiểm chứng lại TC-75 sau khi Dev sửa `focusRestore()` (task-d75556bc)

**Phương pháp:** Chrome thật. `file://` bị extension chặn nên dùng `python3 -m http.server 8765 --bind 127.0.0.1 --directory docs`; mỗi ca bắt đầu bằng tải mới `?view=runner`. Phím **thật** qua công cụ computer (click ô → ⌘A → gõ → Tab/Shift+Tab). Đã xác nhận mã trong file có bản sửa (`focusRestore` có nhánh `if(f.intent){…setTimeout(()=>{…t.focus()…},0)…}`). Không sửa HTML/PNG; kết quả chỉ là hành vi mô phỏng, không khẳng định bố cục Word thật.

## G.1 Kết quả
| ID | Kết quả | Kỳ vọng | Thực tế |
|---|---|---|---|
| TC-75a (Tab: Sản lượng → Đơn giá) | **Không đạt** | click ô Sản lượng, chọn hết, gõ 18000, Tab → `activeElement` = ô Đơn giá (250000) | Giá trị 18000 được ghi nhận (`change` bắn), nhưng `document.activeElement` = `<body>` (không phải ô số nào). Lặp 2 lần (tải mới mỗi lần): cùng kết quả |
| TC-75b (Tab: Đơn giá → Tỷ lệ) | **Không đạt** | gõ 260000, Tab → focus ở ô Tỷ lệ | Giá trị 260000 lưu đúng; `activeElement` = `<body>` |
| TC-75c (Shift+Tab: Tỷ lệ → Đơn giá) | **Không đạt** | gõ 70, Shift+Tab → focus ở ô Đơn giá | Giá trị 70 lưu đúng; `activeElement` = `<body>` |
| T-03 hồi quy: radio ArrowDown | Đạt | ArrowDown ×3 trên nhóm radio, focus giữ ở radio | 3 phím ArrowDown đều `keydown`+`change` trên `INPUT:radio`; `activeElement` vẫn là radio `mode`; chọn quay lại Affected (Affected→Full→Single→Affected) |
| T-03 hồi quy: Enter trên nút | Đạt | Enter trên "Bắt đầu chạy" kích hoạt, giữ focus | Click → Run #1; Enter thật → Run #2; focus giữ trên nút |
| Cuộn ngang (1665px) | Đạt | không cuộn ngang | `scrollWidth` = `clientWidth` = 1665 |

**Kết luận:** bản sửa **chưa đạt** TC-75 — lỗi T-03 tiêu chí 2 vẫn tồn tại với Tab và Shift+Tab; các phần hồi quy khác không bị hỏng.

## G.2 Bằng chứng chẩn đoán (cho Dev)
Nhật ký sự kiện (capture) khi Tab thật ở Sản lượng: `keydown Tab` → `change` (cách nhau ~1 ms) → **không có `focusin`/`focusout` nào sau đó**. Nghĩa là: sau `change` ô bị thay thế bởi `render()` (innerHTML), nhưng lệnh `t.focus()` trong `setTimeout(0)` không dẫn đến `focusin` nào (không có phần tử nào nhận focus), và hành vi dời focus mặc định của Tab cũng không rơi vào ô kế. Gợi ý (không sửa ở đây): khi `change` bắn do Tab, `focusSnap` đọc `document.activeElement` đã/đang đổi hoặc `list[f.i+1]` bị chỉ tới nút/phần tử không nhận focus; nên log `f.i`, `f.intent` và `el` bên trong `focusRestore` để xác định nhánh nào trả về sớm. Cách tránh gốc rễ: không render lại toàn bộ `#app` khi `change` đến từ Tab (chỉ cập nhật phần bị ảnh hưởng) hoặc khôi phục focus theo `data-focus-id` ổn định trên từng ô.

## G.3 Chưa làm
Không chụp ảnh màn hình; không đo lại độ rộng 900/1350px (chỉ cuộn ngang ở 1665px); chưa thử Tab qua toàn bộ Runner; chỉ Chrome. Server tĩnh cổng 8765 vẫn chạy nền, cần dừng khi xong.

## G.4 Vòng 2 — kiểm chứng lại sau bản sửa keydown-Tab capture (task-5b66eaa1)

**Phương pháp:** Chrome thật, phím thật qua công cụ computer (click ô → ⌘A → gõ → Tab/Shift+Tab), tải mới `?view=runner`, phục vụ qua máy chủ tĩnh có sẵn ở cổng 8000 (`--directory docs`, không phải tôi khởi chạy; việc tự chạy thêm máy chủ bị hệ thống từ chối). Không sửa HTML/PNG. Kết quả chỉ là hành vi mô phỏng prototype, không khẳng định bố cục Word thật.

| ID | Kết quả | Kỳ vọng | Thực tế |
|---|---|---|---|
| TC-75a (Tab: Sản lượng → Đơn giá) | **Đạt** | gõ 18000 + Tab → focus ở Đơn giá | `activeElement` = ô số thứ 2 (Đơn giá, 250000); giá trị Sản lượng = 18000 được ghi nhận |
| TC-75b (Tab: Đơn giá → Tỷ lệ) | **Đạt** | gõ 260000 + Tab → focus ở Tỷ lệ | `activeElement` = ô số thứ 3 (Tỷ lệ, 65); Đơn giá = 260000 |
| TC-75c (Shift+Tab: Tỷ lệ → Đơn giá) | **Đạt** | gõ 70 + Shift+Tab → focus ở Đơn giá | `activeElement` = ô Đơn giá (260000); Tỷ lệ = 70 |
| T-03 radio ArrowDown | Đạt | focus giữ ở radio | 3 ArrowDown đều ghi nhận; `activeElement` vẫn là `INPUT:radio`, chọn quay về mục ban đầu (vòng 3 mục) |
| T-03 Enter trên nút | Đạt | Enter kích hoạt, giữ focus | Enter trên "▶ Bắt đầu chạy" tạo Run #1; focus vẫn ở nút |
| Badge stale sau commit bằng Tab | Đạt (quan sát ảnh) | các phần phụ thuộc hiện "Cần tính lại" | Ảnh chụp sau 3 lần Tab: "4 phần cần tính lại", các dòng kết quả hiện "Cần tính lại" |
| Cuộn ngang 375/900/901/1350/1440 | Đạt | không cuộn ngang | Đo bằng iframe cùng origin (resize cửa sổ không đổi viewport thật): `scrollWidth` = `clientWidth` ở cả 5 cỡ (360/885/886/1335/1425 do thanh cuộn dọc 15px); cửa sổ thật 1680: 1665 = 1665 |

**Kết luận:** TC-75a/b/c **đạt** — lỗi ở G.1 đã được sửa; hồi quy T-03 không hỏng.

**Chưa kiểm:** chưa kiểm sau-Tab với nút Duyệt/cổng Build (chỉ badge stale), chưa thử Tab qua toàn bộ Runner và các màn khác, chỉ Chrome, không đo bằng cửa sổ trình duyệt thật ở 375/900/901 (dùng iframe), chưa chụp ảnh lưu file.

**Máy chủ:** tôi không khởi chạy máy chủ nào trong vòng này. Cổng 8765 (từ vòng trước) không còn lắng nghe. Máy chủ cổng 8000 (PID 88661, bắt đầu 10:37) không phải của tôi nên để nguyên — người dùng tự dừng nếu không cần.


---

# H. Kiểm thử độc lập Q2/Q4/Q5 + hồi quy trên bản HTML mới (task-17026057)

**Đối tượng:** `docs/DocFlow_Interactive_Mockup.html` (sha256 Dev báo 569caa1b…, 63.413 byte). **Phương pháp:** Chrome thật qua máy chủ tĩnh cổng 8000 có sẵn (PID 88661, **không phải tôi khởi chạy**, để nguyên). Mỗi nhóm kịch bản tải mới trang (`?view=runner`, `?view=runner&seed=approved`, `?view=build&seed=approved&long=1`). Thao tác logic đi qua `window.app.*` + đọc `state`/DOM; phím Tab/Enter dùng phím thật qua công cụ computer. Không sửa HTML/PNG. Không chụp ảnh lưu file. Chỉ Chrome. Không khẳng định layout Word thật (prototype không tạo DOCX).

## H.1 Q2 — stale theo sự kiện
| ID | Kết quả | Kỳ vọng | Thực tế (URL `?view=runner`) |
|---|---|---|---|
| AC-Q2-0 khởi tạo | Đạt | 0 stale, build mở | stale 0000, badge "0 phần cần tính lại", `canBuild`=true |
| AC-Q2-1 qty 15.000 | Đạt | 4 stale (02–05) | badge "4 phần cần tính lại"; 01 → Chờ duyệt |
| AC-Q2-2 về 12.000 | **Đạt** | vẫn 4 stale | vẫn 4; không phần nào "Hợp lệ"; build khóa |
| AC-Q2-9 lý do | Đạt | nêu sự kiện qty | "Sản lượng đã thay đổi (12.000 → 15.000 → 12.000). Giá trị trùng lần tính trước nhưng đầu vào đã thay đổi…" |
| AC-Q2-3 chạy Affected (sau 15k→12k) | Đạt | 3.000.000.000 / 1.950.000.000 / 1.050.000.000; chờ duyệt; badge 0 | đúng giá trị; 02–05 chưa duyệt; badge 0 |
| AC-Q2-5 cùng giá trị | Đạt | không tăng rev, không stale | `rev.qty`=0, `rev.rate`=0, stale 0000; preview build vẫn còn khi nhập lại 65 |
| AC-Q2-6 tỷ lệ 65→70→65 | Đạt | 03–05 stale, 02 không, sau về 65 vẫn stale | 0111 và vẫn 0111 sau khi đặt lại |
| AC-Q2-7 đơn giá đổi rồi về | Đạt | 02–05 stale | 1111 sau khi về 250.000 |
| AC-Q2-8 Lưu quy tắc | Đạt | 02–05 stale | stale 4 (Recipe version tăng) |
| AC-Q2-10 Mẫu gốc | Chưa kiểm riêng | Mẫu gốc 12.000 | chỉ đọc state, không quan sát màn Workspace |
| AC-Q2-11 seed | Đạt | `seed=approved` không stale, B-028, cổng mở | 0000, pending rỗng, B-028, Phần 01 duyệt |
| AC-Q2-12 Single | Đạt | chặn khi upstream stale | qty 15.000, Single 03: "Không thể chạy riêng Phần 03: các phần upstream 02 đang stale…", không thêm Run |

**Giá trị mặc định sau tính (qty 15.000):** 3.750.000.000 / 2.437.500.000 / 1.312.500.000 — **Đạt**; hiển thị VN: 3.750.000.000, 2.437.500.000, 1.312.500.000, `-5` (dấu thập phân/nghìn vi-VN đúng).

## H.2 Q4/Q5 — duyệt Phần 01 và từng Section
| ID | Kết quả | Kỳ vọng | Thực tế |
|---|---|---|---|
| AC-Q4-1 | Đạt | 01 "Hợp lệ", build bật | đúng |
| AC-Q4-2 | Đạt | đổi qty → 01 Chờ duyệt; 02–05 duyệt mà 01/05 chưa → build khóa | pending "1", khóa; thiếu 05 → pending "5", vẫn khóa |
| AC-Q4-4 | Đạt | về 12.000 vẫn 01 chờ duyệt | pending "1" |
| AC-Q4-5 | Đạt | gọi `createBuild` bị từ chối | "Chưa thể build: còn kết quả cần tính lại hoặc chờ duyệt (gồm Phần 01).", không có bản ghi |
| AC-Q4-3 | Đạt | duyệt 01 + 02–05 → build bật | build B-028 tạo được, 12 trang, 3,75/2,4375/1,3125 tỷ |
| AC-Q5-1 | Đạt | duyệt riêng 03 chỉ đổi 03 | `[01,02,03,04,05]` = false,false,**true**,false,false |
| AC-Q5-2 | Đạt | "Duyệt tất cả" mở cổng | pending rỗng, `canBuild` true |
| AC-Q5-3 | Một phần | khi stale: nút 02–05 vô hiệu; "Duyệt tất cả" chỉ duyệt 01 | nút 02–05 vô hiệu (quan sát DOM: false,true,true,true,true,false). Chưa bấm "Duyệt tất cả" khi đang stale |
| AC-Q5-4 | Đạt | không có chữ về vai trò | regex "vai trò\|quyền\|người duyệt" không khớp |
| AC-Q5-5 | Đạt | duyệt không thêm Run/build | không đổi số Run/build |
| Bàn phím | Đạt | Tab từ qty: → đơn giá → tỷ lệ → nút "✓ Duyệt" (nút vô hiệu bị bỏ qua); Enter duyệt | gõ 15000 + Tab ×3: `activeElement` = nút "✓ Duyệt" (01); qty ghi nhận, 4 stale; Enter → `approved1`=true |

## H.3 Hồi quy
| ID | Kết quả | Thực tế |
|---|---|---|
| Single 02 khi 02 chưa stale; Single 03 sau đó (`seed=approved`, tỷ lệ 70) | Đạt | 03–05 vẫn stale sau Single 02; Single 03 được chạy → 0011; Affected → 0000 |
| Vô hiệu build khi đổi input | Đạt | đổi tỷ lệ → `built` null; B-028 "Không còn hiệu lực", B-027 giữ "Đã xuất" |
| Xuất manifest (`?view=build&seed=approved&long=1`) | **Đạt một phần** | file `docflow_build_manifest_demo.json`; notice "Mockup-only — not a DOCX file"; ruleVersion 3; 13 trang. **Chỉ đọc nội dung Blob, không lưu file ra đĩa.** Lỗi nhỏ: `profit` = `1049999999.9999999` (sai số dấu phẩy động, qty 12.000) — hiển thị tỷ giá "1,05 tỷ" đúng, nhưng JSON không sạch |
| `long=1` | Đạt | "13 trang", Biến động +1 |
| Tab Content/Layout Diff | Đạt | 3 tab; bấm tab 2 → `aria-selected` đổi đúng; có nhãn "Mô phỏng — số trang là hằng số 12/13…không phải Word thật". Chưa thử phím mũi tên ở lượt này |
| Số âm / kẹp tỷ lệ | Đạt | qty −5 → 0 + cảnh báo "không được âm"; tỷ lệ −10 → 0; 150 → 1 (100%) |
| Cuộn ngang, 5 màn × 375/900/901/1350/1351/1440 | Đạt | `scrollWidth`=`clientWidth` mọi cỡ (đo bằng iframe cùng origin, trừ thanh cuộn 15px). Sidebar: 72px ở 375/900, 226px ở 901+ |
| Notice "dữ liệu giả lập" ở mọi màn | **Không đạt** | Ở ≤900px (gồm 375, 900), màn Workspace, Runner, History **không còn notice hiển thị**: dòng "Prototype tương tác — dữ liệu giả lập" (`.tiny` trong sidebar) có chiều rộng 0 khi sidebar thu về 72px; Recipe/Build có notice riêng trong nội dung nên vẫn thấy. Từ 901px trở lên hiển thị ở cả 5 màn. Chưa biết bản trước đã vậy hay hồi quy mới — cần Dev/BA quyết |

## H.4 Chưa kiểm / hạn chế
- Không chụp ảnh nhìn bằng mắt: CSS `.stale-why` (260px) ở 900px/1350px chỉ kiểm không tràn ngang bằng số đo, chưa kiểm cắt chữ/chồng lấn; bảng Runner 4 cột/5 hàng không tràn ở mọi độ rộng đã đo.
- Tab/Shift+Tab chỉ kiểm đoạn qty → đơn giá → tỷ lệ → nút Duyệt; chưa đi hết 5 màn. Sau Enter trên "✓ Duyệt" focus chuyển sang một `DIV` (thẻ "③ Kết quả…"), không về `<body>` — chấp nhận được nhưng nút bị thay nên mất vị trí nhấn Enter liên tiếp (ghi nhận).
- Radio phạm vi chạy, Enter trên "Bắt đầu chạy" không chạy lại ở lượt này (G.4 đã Đạt, bản HTML sau G.4 chưa đo lại ngoài Single/Affected qua `app.run`).
- Resize cửa sổ không đổi viewport thật nên đo bằng iframe.

## H.5 Cần xử lý
1. Notice mô phỏng bị ẩn ở ≤900px trên Workspace/Runner/History (xem H.3).
2. Manifest `profit` dấu phẩy động (làm tròn khi xuất).

**Máy chủ:** không khởi chạy máy chủ; cổng 8000 (PID 88661) của người dùng, để nguyên.

> **Ghi chú đồng bộ vòng 2 (2026-11-23, không chạy kiểm thử):** TC-51 (tải lại mất dữ liệu) vẫn đúng cho prototype; Q12 lưu bền là PROD. Chưa có TC cho: Rule Nháp bị khóa chạy/build, sửa tay trạng thái Rule (Q18), nhiều nguồn/tra y theo x (Q20), chính sách đơn giá hòa/thiếu (Q9 đã chốt A: dừng chạy Section; production [ĐX], 07 §H.5), thu hồi duyệt khi đổi phân trang (Q7; prototype không có phân trang theo Section). Các mục này chờ triển khai giai đoạn 07 §H.2; không ảnh hưởng kết quả kiểm thử hiện có.

---

# H.6 Kiểm lại 2 lỗi H.5 + hồi quy nhanh (task-2246f9c3)

**Đối tượng:** `docs/DocFlow_Interactive_Mockup.html`, sha256 `75f344c9…debf9` (khớp Dev báo, 63.795 byte). **Phương pháp:** Chrome thật, máy chủ tĩnh cổng 8000 có sẵn (**không phải tôi khởi chạy, không dừng**). Độ rộng đo bằng iframe cùng origin (resize cửa sổ không đổi viewport thật; `clientWidth` đã trừ thanh cuộn 15px: 375→360, 1440→1425). Phím Tab/Shift+Tab/mũi tên/Enter là phím thật; logic qua `window.app.*` và đọc `state`. Không sửa HTML/PNG, không lưu file ra đĩa (manifest chỉ đọc nội dung Blob). Không chụp ảnh lưu file → **chưa đánh giá bằng mắt** việc cắt chữ/đẹp của notice.

## H.6.1 Lỗi 1 — notice "Prototype tương tác — dữ liệu giả lập"
Đo 5 màn × 375/800/900/901/1350/1440 = 30 tổ hợp. Tiêu chí: phần tử hiển thị (display≠none, rộng>0, cao≥10px), nằm trọn trong viewport, không bị cắt (`scrollWidth ≤ clientWidth`), và trang không cuộn ngang.

| Kết quả | Kỳ vọng | Thực tế |
|---|---|---|
| **Đạt** (30/30) | Notice thấy đầy đủ ở mọi màn/độ rộng, không cuộn ngang | 0 tổ hợp lỗi. Runner: 375 → `.demo-flag` 260×29; 800 → 685×29; 900 → 785×29 (dòng riêng dưới topbar); 901/1350/1440 → bản `.tiny` trong sidebar 168×23. `scrollWidth = clientWidth` ở cả 30 tổ hợp |

Ghi nhận: ở ≥901px notice nằm cuối sidebar (vị trí y≈1141–1384 trên trang dài), phải cuộn xuống mới thấy — không phải lỗi, nhưng không nằm trong khung nhìn đầu trang.

## H.6.2 Lỗi 2 — số nguyên cho manifest/giao diện
| ID | Kết quả | Kỳ vọng | Thực tế |
|---|---|---|---|
| Mặc định qty 12.000 (`seed=approved&long=1`, xuất manifest) | **Đạt** | 3.000.000.000 / 1.950.000.000 / 1.050.000.000 | JSON `revenue 3000000000, cost 1950000000, profit 1050000000`; regex số lẻ dài trên JSON: không khớp; `ruleVersion` 3 |
| qty 15.000 → chạy Affected → duyệt → build → manifest | **Đạt** | 3.750.000.000 / 2.437.500.000 / 1.312.500.000 | đúng từng giá trị, số nguyên; notice "Mockup-only — not a DOCX file" |
| qty 15.000 → về 12.000 → chạy → build → manifest | **Đạt** | profit 1.050.000.000 (trước: 1049999999.9999999) | `profit 1050000000` |
| Giao diện Build (long=1) | Đạt | định dạng vi-VN, không số lẻ dài | hiển thị `12.000`, `250.000`, `3.000.000.000`; không có chuỗi số lẻ ≥5 chữ số; "13 trang" |

## H.6.3 Hồi quy nhanh
| ID | Kết quả | Thực tế |
|---|---|---|
| Q2: khởi tạo / qty 15.000 / về 12.000 | Đạt | 0000 → 1111 → vẫn 1111, `canBuild`=false |
| Q2: Single 03 khi upstream stale | Đạt | bị chặn, "các phần upstream 02 đang stale…", không thêm Run, stale giữ 1111 |
| Q2: Affected sau 15k→12k | Đạt | 0000; 3.000.000.000/1.950.000.000/1.050.000.000; chưa duyệt (00000) |
| Q5: duyệt riêng 03 / Duyệt tất cả | Đạt | 00100; sau "Duyệt tất cả" pending=0, `canBuild`=true |
| Q4: đổi qty → 01 chờ duyệt; build bị từ chối | Đạt | pending=[1]; `createBuild` → "Chưa thể build: còn kết quả cần tính lại hoặc chờ duyệt (gồm Phần 01)." |
| Chạy toàn bộ (full) rồi duyệt, build | Đạt | 0000; 3.750.000.000/2.437.500.000/1.312.500.000; build tạo được |
| Đổi input vô hiệu build + nhãn "Không còn hiệu lực" | Đạt | đổi tỷ lệ 70% → `built`=null; B-029 và B-028 "Không còn hiệu lực", B-027 giữ "Đã xuất"; nhãn hiện ở màn History |
| Bàn phím thật | Đạt | gõ 15000 + Tab×3 → nút "✓ Duyệt"; Shift+Tab → ô tỷ lệ (65); Tab+Enter → `approved1`=true |
| Radio phạm vi bằng mũi tên | Đạt | 3 radio; Mũi tên xuống: Affected → Full, `mode`=full, focus ở radio |
| Enter trên "Bắt đầu chạy" | Đạt | Enter chạy: runs 0→1, 0000, giá trị đúng 3,75/2,4375/1,3125 tỷ |

## H.6.4 Hạn chế
- Không đánh giá bằng mắt (chưa lưu ảnh); độ rộng đo bằng iframe, 15px thanh cuộn đã trừ.
- Chưa đi hết Tab qua cả 5 màn; chưa thử phím mũi tên trên tab Content/Layout Diff ở lượt này.
- Không khẳng định layout Word thật (prototype không tạo DOCX).

## H.6.5 Kết luận
Cả 2 lỗi ở H.5 đã được sửa trong phạm vi đo; không phát hiện hồi quy mới. **Máy chủ:** cổng 8000 là của người dùng, để nguyên; tôi không bật/dừng máy chủ nào.
