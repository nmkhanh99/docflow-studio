# 06 — Đặc tả sửa lỗi prototype (T-01..T-07)

Đối tượng sửa: **chỉ** `docs/DocFlow_Interactive_Mockup.html` (Dev). Không sửa `mockup_*.png`, không thêm framework/package manager. Nguồn: `05_BaoCao_KiemThu.md` §C–D. Đây là sửa **hành vi mô phỏng** của prototype; không phải năng lực production (xem 03) và prototype **không** tạo DOCX thật.

> **Cập nhật 2026-11-23:** người dùng đã chốt Q1–Q9, Q12–Q14, Q17, Q18, Q20, Q21 (xem `07_QuyetDinh_Va_DacTa_Prototype_V2.md`). Bảng dưới là lịch sử mặc định BA; các dòng Q1, Q2 đã bị thay thế. Triển khai Q2/Q4/Q5 theo `07`, không theo T-01 tiêu chí 3 cũ.

## 0. Quyết định mặc định đã dùng (trước 2026-11-23)
| Mã | Quyết định mặc định | Trạng thái |
|---|---|---|
| Q-A | Trạng thái ban đầu "sạch": qty **12.000**, đơn giá 250.000, tỷ lệ 65%, Recipe v3, 4 phần 02–05 **đã duyệt**, không stale, chưa có Run | Mặc định BA — chờ xác nhận |
| Q-F | Số âm bị chặn: từ chối/đưa về 0 kèm cảnh báo hiển thị; tỷ lệ chi phí giới hạn 0–100 | Mặc định BA |
| Q-G | Dòng build cũ trong Build History được giữ lại và gắn nhãn "Không còn hiệu lực" khi preview bị vô hiệu | Mặc định BA |
| Q1 | ~~HTML là chuẩn giao diện~~ → **[ĐÃ CHỐT]** không có nguồn chuẩn; ảnh và HTML đều chỉ là mockup. Khi lệch ảnh, giữ hành vi HTML hiện có trừ khi đặc tả nêu khác | Thay thế bởi quyết định người dùng |
| Q2 | **[ĐÃ CHỐT]** stale theo sự kiện, đặt lại 12.000 vẫn phải chạy/duyệt lại (07 §B.1) | Người dùng |
| Q3–Q9, Q12–Q14, Q17, Q18, Q20, Q21 | **[ĐÃ CHỐT]** (07 §A) | Người dùng |
| Q10, Q11, Q19, Q15, Q16 | **[MỞ]** | — |

Ngưỡng responsive hiện có **giữ nguyên**: `max-width:1350px` (3→2 cột) và `max-width:900px` (sidebar 72px, 1 cột).

## 1. Danh sách thay đổi cho Dev
Quy ước: "Hành vi quan sát" = đã đo ở 05; "Đề xuất" = yêu cầu mới.

### T-01 — Trạng thái khởi tạo sạch
- **Quan sát:** `state.qty` khởi tạo 15.000 (dòng 20) trong khi `results` ứng với 12.000 → mở trang đã có 4 stale, Duyệt vô hiệu, Build bị chặn.
- **Đề xuất:** khởi tạo `qty:12000` (khớp `results` và Mẫu gốc/Template V0 12.000). Mở trang không có tham số: 0 stale, 4 phần "Hợp lệ", Duyệt **bật**, Build **bật** (đã duyệt + không stale), Run chưa có, Build History có B-027.
- **Tiêu chí chấp nhận:**
  1. `?view=runner` tải mới: badge "0 phần cần tính lại", không có số cạnh menu, Nhật ký "Chưa có lần chạy".
  2. Ô qty = 12.000; doanh thu/chi phí/lợi nhuận trên bảng khớp 12.000 (3.000.000.000 / 1.950.000.000 / 1.050.000.000).
  3. Đặt qty 15.000 → 4 stale (như cũ); đặt lại 12.000 → **vẫn 4 stale** (Q2 đã chốt: stale theo sự kiện, phải chạy/duyệt lại; xem 07 §B.1, AC-Q2-2). *(Tiêu chí cũ "về 12.000 → 0 stale, vẫn Hợp lệ" bị thay thế.)*
  4. Mẫu gốc (Template V0) vẫn 12.000, bất biến sau mọi thao tác.
  5. `?seed=ran` / `?seed=approved` vẫn chạy được; Run Affected ở trạng thái sạch có thể ghi "Không có phần nào cần tính lại" — Dev phải đảm bảo `?seed=approved` vẫn cho ra bản build B-028 (qty hiện hành) và cổng mở; ghi rõ số Run thực tế trong báo cáo.
- Phụ thuộc: không. **Làm đầu tiên.**

### T-02 — Hiển thị `state.notice` ở mọi màn
- **Quan sát:** `notice` chỉ vẽ ở Runner; Build ("preview GIẢ LẬP"), Workspace ("CR-00x đã được lưu", chip qty) không hiện thông báo.
- **Đề xuất:** một vùng thông báo dùng chung (dưới tiêu đề/topbar) vẽ `state.notice` ở cả 5 màn (Workspace, Rule Studio, Runner, Build, History). Giữ cơ chế `go()` xóa notice khi đổi màn.
- **Tiêu chí:** (1) Workspace: Lưu CR → thấy thông báo CR; chip 18.000 → thấy "12.000 → 18.000". (2) Build: Tạo preview → thấy thông báo nêu rõ preview **GIẢ LẬP**/không phải DOCX. (3) Recipe: Lưu phiên bản → thấy thông báo v4 (không bị hiện đôi). (4) Đổi màn → thông báo cũ biến mất. (5) Không hiện hai khối thông báo trùng trên Runner.
- Phụ thuộc: T-01.

### T-03 — Giữ focus sau `render()`
- **Quan sát:** `render()` ghi lại `innerHTML` → `document.activeElement` = `<body>` sau thay đổi (TC-73, 75).
- **Đề xuất:** trước render lưu định danh phần tử đang focus (id/`name`/`data-*` + giá trị radio, vị trí con trỏ nếu là ô nhập), sau render khôi phục focus. Mỗi điều khiển tương tác cần định danh ổn định. Không thêm thư viện.
- **Tiêu chí:** (1) Radio phạm vi chạy: ArrowUp/ArrowDown liên tiếp đổi được ≥3 lần mà focus vẫn ở nhóm radio. (2) Ô số: gõ giá trị + Tab → `change` bắn, focus chuyển sang phần tử kế tiếp đúng thứ tự (không về đầu trang). (3) Nút "Bắt đầu chạy" bấm bằng Enter vẫn giữ focus trên nút hoặc vùng hợp lý. (4) Nếu phần tử bị vô hiệu/biến mất sau render, focus rơi về phần tử cha gần nhất, không về `<body>` khi tránh được.
- Phụ thuộc: T-01, T-05 (chung đường xử lý nhập).

### T-04 — Hết cuộn ngang toàn trang
- **Quan sát:** tràn +165px ở 901px (topbar, sidebar 226px) và +394px ở 375px; 800px không tràn.
- **Đề xuất:** topbar cho phép co/xuống dòng (`flex-wrap`, `min-width:0`, nút thu gọn) để `document.documentElement.scrollWidth <= clientWidth` ở **375, 800, 901, 1350, 1440px** (đo trừ viền khung). Giữ ngưỡng 900/1350; bảng rộng được phép cuộn **trong khung** (`overflow-x:auto`), không làm rộng trang.
- **Tiêu chí:** tại mỗi độ rộng trên, ở cả 5 màn: không cuộn ngang trang. 1351→3 cột, 1350→2 cột; 900→sidebar 72px, 901→226px. Nút "Chạy lại", "Xem trước", pill vẫn bấm được.
- Phụ thuộc: T-01 (trạng thái ban đầu thay đổi nội dung hiển thị).

### T-05 — Kiểm tra dữ liệu nhập
- **Quan sát:** qty −5.000 cho doanh thu/chi phí âm, không cảnh báo (TC-52).
- **Đề xuất (Q-F):** qty và đơn giá: giá trị âm bị từ chối, đưa về 0 (hoặc giữ giá trị trước đó — Dev chọn một cách và áp dụng thống nhất), kèm cảnh báo hiển thị (qua vùng notice T-02). Rỗng → 0 (giữ). Tỷ lệ chi phí kẹp vào 0–100, vượt thì kèm cảnh báo. Không để NaN.
- **Tiêu chí:** (1) Nhập −5000 vào qty → không có doanh thu/chi phí âm; có cảnh báo. (2) Tỷ lệ 150 → 100 kèm cảnh báo; −10 → 0. (3) Nhập 0 hợp lệ, không cảnh báo. (4) Giá trị hợp lệ vẫn kích hoạt stale như cũ (TC-01..03).
- Phụ thuộc: T-02.

### T-06 — Nhãn "Không còn hiệu lực" cho build cũ
- **Quan sát:** sau khi preview bị vô hiệu (`state.built=null`), B-028 vẫn nằm trong History không dấu hiệu gì (TC-25).
- **Đề xuất (Q-G):** khi dữ liệu nguồn đổi làm preview mất hiệu lực (đổi qty/giá/tỷ lệ, lưu Recipe, chạy lại), các dòng build do prototype tạo gắn nhãn "Không còn hiệu lực" (pill màu xám/hổ phách) ở Build History và màn History. Dòng mẫu B-027 giữ "Đã xuất". Không xóa dòng.
- **Tiêu chí:** (1) Tạo B-028 → nhãn "Preview demo". (2) Đổi tỷ lệ → B-028 hiện "Không còn hiệu lực", vẫn còn trong danh sách; Manifest vô hiệu. (3) Tạo preview mới → dòng mới "Preview demo", B-028 vẫn "Không còn hiệu lực". (4) B-027 không bị đổi nhãn.
- Phụ thuộc: T-01, T-02.

### T-07 — Hai tab Content Diff / Layout Diff bấm được (mô phỏng)
- **Quan sát:** hai tab là `<span class="tab">`, không tương tác (TC-30).
- **Đề xuất:** đổi thành nút (`role="tab"`, `aria-selected`, focus bằng bàn phím, ←/→ đổi tab). Tab **Content Diff**: hiện thay đổi **nội dung** (sản lượng, giá trị tính, nhận xét) theo Section Revision. Tab **Layout Diff**: hiện **bố cục** (số trang 12/13, Biến động ±, trang bị đẩy). Cả hai tab phải có nhãn rõ: "Mô phỏng — số trang là hằng số 12/13, không phải phân trang/diff thật, không phải Word thật". Dùng dữ liệu state sẵn có, không thêm tính toán giả vờ là thật.
- **Tiêu chí:** (1) Bấm/Enter/Space chuyển tab, tab đang chọn có `aria-selected=true`. (2) Nhãn "mô phỏng" hiển thị ở cả hai tab. (3) `?long=1`: Layout Diff nêu 13 trang, +1; không dài: 12 trang, +0. (4) Chuyển tab không đổi `state` nghiệp vụ, không tạo Run/Build. (5) Không có câu khẳng định đã tạo DOCX hay phân trang thật.
- Phụ thuộc: T-03 (focus), T-02.

## 2. Thứ tự đề xuất
T-01 → T-02 → T-05 → T-03 → T-06 → T-07 → T-04 (T-04 đo lại sau cùng trên nội dung cuối).

## 3. Ngoài phạm vi
Lưu trữ bền vững (Q12 đã chốt là yêu cầu production, không làm trong prototype), tra giá/phân trang thật, DOCX thật, trình duyệt khác, đo tương phản (TC-74 vẫn [MỞ]).

## 4. Phân biệt khái niệm (nhắc lại, chi tiết ở 02)
**Template V0** bất biến — thao tác nào cũng không đổi Mẫu gốc 12.000. **Content Diff** = khác biệt nội dung/giá trị; **Layout Diff** = khác biệt bố cục/số trang. Cả hai trong prototype chỉ là mô phỏng.
