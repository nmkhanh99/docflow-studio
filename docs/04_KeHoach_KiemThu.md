# 04 — Kế hoạch kiểm thử thủ công (prototype, đã cập nhật theo 05 §D và 06)

Đối tượng: `docs/DocFlow_Interactive_Mockup.html` mở bằng trình duyệt. Không kiểm thử khả năng production (xem 03). Mỗi ca bắt đầu từ trang tải mới. **Trạng thái ban đầu sạch (sau sửa T-01, quyết định mặc định Q-A, xem 06):** qty 12.000, đơn giá 250.000, tỷ lệ 65%, Recipe v3, 02–05 đã duyệt/hợp lệ, không stale, chưa có Run, Build History có B-027. (Trước sửa, prototype khởi tạo qty 15.000 → 4 stale ngay khi mở; xem 05 §A.) Cập nhật theo 05 §D và 06. Trình duyệt thử: Chrome mới nhất (các trình duyệt khác [MỞ]). Ghi kết quả Đạt/Không đạt + ảnh chụp.

Điều hướng nhanh: `?view=runner`, `?seed=ran`, `?seed=approved`, `?long=1`. Lưu ý: `?seed=*` tự thực hiện Run/Duyệt/Build nên số Run lệch 1 so với "từ trang sạch"; ca đếm Run nên bắt đầu từ trang không tham số.

## 1. Trạng thái ban đầu
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-00 | Mở `?view=runner` | Badge "0 phần cần tính lại" (xanh); không có badge số cạnh menu; qty 12.000; 4 phần "Hợp lệ"; Nhật ký "Chưa có lần chạy"; nút "Duyệt kết quả hợp lệ" **bật** (chỉ bị vô hiệu khi còn stale). Lỗi cũ (05 TC-00): badge "4 phần cần tính lại", Duyệt vô hiệu — không được tái hiện |

## 2. Phụ thuộc và stale (FR-08)
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-01 | Từ trang sạch (qty 12.000), Runner: **đổi** qty sang 15.000 (phải tạo thay đổi thật) | Badge "4 phần cần tính lại"; đồ thị: 02–05 màu hổ phách; menu hiện số 4; Duyệt 02–05 bị vô hiệu; Phần 01 "Chờ duyệt" (nút Duyệt 01 bật, Q4/Q5); mỗi phần stale có lý do "Sản lượng đã thay đổi (12.000 → 15.000)" |
| TC-02 | Từ seed: đặt tỷ lệ chi phí 70 | Chỉ 03,04,05 stale (badge 3); 02 vẫn "Hợp lệ" |
| TC-03 | Từ seed: đặt đơn giá 260000 | 02–05 stale (4) |
| TC-04 | Đặt qty 15.000 rồi đặt lại 12.000 | **Cập nhật theo Q2 (07 §B.1, AC-Q2-2):** badge **vẫn 4**, 02–05 vẫn "Cần tính lại" (không tự hết stale khi về 12.000); lý do hiển thị "12.000 → 15.000 → 12.000"; Phần 01 vẫn "Chờ duyệt"; Tạo preview vô hiệu. Chỉ Run (Affected/Full) làm hết stale. Kỳ vọng cũ "về 0" bị thay thế |
| TC-05 | Recipe: "Lưu phiên bản quy tắc" | Header "Recipe v4"; thông báo v4 hiện; 02–05 stale |
| TC-06 | Workspace: chip 18.000 | Ô số = 18.000; thông báo "12.000 → 18.000"; Mẫu gốc vẫn 12.000 |

## 3. Chạy và phạm vi (FR-09)
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-10 | Đặt qty 15.000 (từ 12.000), Affected (mặc định), Bắt đầu chạy | Thông báo "Đã chạy 4 phần (02, 03, 04, 05)" (nếu 02 chưa chạy trước đó); bảng: 3,75 / 2,44 / 1,31 tỷ; cả 4 "Chờ duyệt" **và Phần 01 cũng "Chờ duyệt"** (Q4); Run #1 trong nhật ký. **Q2:** đặt 15.000 → 12.000 rồi Affected cũng chạy 02–05 → 3,00 / 1,95 / 1,05 tỷ (AC-Q2-3) |
| TC-11 | Từ trang sạch (không stale), Affected, chạy | "Không có phần nào cần tính lại"; Run #1 ghi 'Không có' (với `?seed=approved` số Run lệch 1) |
| TC-12 | Từ seed, Full, chạy | Chạy 4 phần, kết quả chờ duyệt |
| TC-13 | qty 15.000, Single, chọn Phần 03, chạy | Bị chặn: "…upstream 02 đang stale…"; không thêm Run |
| TC-14 | qty 15.000, Single, chọn Phần 02, chạy | Chạy 1 phần (02); 03–05 vẫn stale; badge 3 |
| TC-15 | Single Phần 02 rồi Single Phần 03 | Lần 2 được phép; 04,05 còn stale |
| TC-16 | Sau TC-10, mở History | Dòng "Run #1 · affected" có sản lượng 15.000 |

## 4. Phê duyệt và cổng build (FR-10..13)
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-20 | Sau TC-10 mở Build | Nút "Tạo preview build demo" **vô hiệu**; thông báo "Còn 0 phần cần tính lại và **5** kết quả cần duyệt" (gồm Phần 01) |
| TC-21 | Quay Runner, "Duyệt tất cả" (đổi tên từ "Duyệt kết quả hợp lệ", Q5) | 5 phần (01–05) "✓ Hợp lệ"; thông báo duyệt; không có chữ về vai trò/người duyệt |
| TC-22 | Mở Build | Nút bật; "Tất cả kết quả demo nhất quán và đã duyệt" |
| TC-23 | Tạo preview | Dòng lịch sử mới "B-028 · Báo cáo kế hoạch kinh doanh — 15.000 SP" kèm nhãn trạng thái "Preview demo"; thông báo "preview GIẢ LẬP" **hiển thị ngay trên màn Build** (sau sửa T-02; trước sửa chỉ hiện ở Runner); "12 trang", Biến động +0, nút Manifest bật |
| TC-24 | Tải Manifest | File `docflow_build_manifest_demo.json`; chứa notice "Mockup-only — not a DOCX file", `ruleVersion`, giá trị đúng (revenue 3750000000, cost 2437500000, profit 1312500000) |
| TC-25 | Sau TC-23 đổi tỷ lệ | Preview bị xóa: số trang "—", nút Manifest vô hiệu; dòng B-028 **vẫn còn** trong Build History và (sau sửa T-06, Q-G) gắn nhãn "Không còn hiệu lực"; B-027 giữ "Đã xuất" |
| TC-26 | Truy cập `?seed=approved` | Đã có build B-028; cổng mở |
| TC-27 | Đổi qty 15.000 (chưa chạy), mở Build | Nút vô hiệu; "Còn 4 phần cần tính lại và **1** kết quả cần duyệt" (Phần 01 chờ duyệt, Q4). **Q2:** đặt lại 12.000 (chưa chạy) vẫn vô hiệu, vẫn 4 stale. Trang sạch chưa đổi gì: nút **bật** |

### 4b. Phê duyệt Phần 01 và từng Section (Q4, Q5) — thêm mới

| ID | Thao tác | Kỳ vọng |
|---|---|---|
| TC-28 | Tải mới `?view=runner` | Phần 01 "✓ Hợp lệ"; build bật (AC-Q4-1) |
| TC-29 | Đổi qty 15.000 | Phần 01 "Chờ duyệt" (không "Cần tính lại"); đặt lại 12.000 vẫn "Chờ duyệt" (AC-Q4-2, Q4-4) |
| TC-29a | Run Affected, duyệt 02–05 nhưng chưa duyệt 01 | Build vô hiệu, ghi 1 kết quả cần duyệt; gọi `createBuild` trực tiếp bị từ chối, không tạo bản ghi (AC-Q4-2, Q4-5) |
| TC-29b | Duyệt Phần 01 (nút ✓ Duyệt hàng 01) | Cổng build mở khi 02–05 đã duyệt, không stale (AC-Q4-3) |
| TC-29c | Sau Run (5 phần chờ duyệt) bấm Duyệt riêng ở Phần 03 | Chỉ Phần 03 "Hợp lệ"; 4 phần còn lại giữ "Chờ duyệt"; không thêm Run/build (AC-Q5-1, Q5-5) |
| TC-29d | 02 đang stale: xem nút Duyệt 02–05 và "Duyệt tất cả" | Nút 02–05 vô hiệu; "Duyệt tất cả" chỉ duyệt Phần 01 (nếu chờ) và nêu số phần bị bỏ qua (AC-Q5-3) |
| TC-29e | "Duyệt tất cả" sau Run | Duyệt mọi phần chờ duyệt; build mở khi không stale (AC-Q5-2) |
| TC-29f | `?seed=approved` | Phần 01 đã duyệt, B-028, cổng mở (AC-Q4-6, Q2-11) |
| TC-29g | Cam kết cùng giá trị (qty 12.000 → 12.000; tỷ lệ 65 → 65) | Không stale, không xóa preview, không đổi trạng thái duyệt (AC-Q2-5) |
| TC-29h | Tỷ lệ 65→70→65 / đơn giá đổi rồi về | 03–05 stale (02 không) / 02–05 stale; vẫn stale sau khi đặt lại (AC-Q2-6, Q2-7) |
| TC-29i | Lưu phiên bản quy tắc | 02–05 stale, chỉ Run xóa được (AC-Q2-8) |

## 5. Content Diff / Layout Diff
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-30 | `?view=build`, bấm "Content Diff"/"Layout Diff" (sau sửa T-07) | Hai tab bấm/Enter/Space/phím mũi tên được, `aria-selected` đổi; mỗi tab có nhãn "Mô phỏng — không phải phân trang/diff thật"; không đổi state nghiệp vụ |
| TC-31 | Mở `?seed=approved&long=1` (hoặc bật "Mô phỏng phần 1 dài thêm" rồi chạy Full, duyệt, tạo preview) | "13 trang", Biến động +1; ô Layout Diff nói nội dung dài; đây là hằng số, **không** coi là phân trang thật |
| TC-32 | Workspace bật "dài" | Bản nháp có thêm 2 đoạn; Mẫu gốc không |

## 6. Recipe
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-40 | Sửa ô mô tả rồi Lưu | Version +1; văn bản giữ lại khi chuyển tab và quay lại |
| TC-41 | Đổi "Cách lưu" thành Patch một lần | Không có thay đổi hiển thị (ghi nhận) |
| TC-42 | Nhập ký tự HTML `<b>x</b>` vào mô tả, lưu, tải lại giao diện (đổi tab) | Hiển thị dạng chữ, không in đậm (kiểm tra thoát HTML) |

## 7. Change Request / History
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-50 | Workspace: Lưu CR 2 lần | CR-002, CR-003 đầu danh sách (hiện tối đa 3); History liệt kê đủ |
| TC-51 | Tải lại trang | Mọi dữ liệu mất, về seed (ghi nhận Q12) |
| TC-52 | Nhập giá trị rỗng/âm vào qty; tỷ lệ −10 và 150 | Rỗng → 0; số âm bị chặn kèm cảnh báo hiển thị, không ra doanh thu/chi phí âm (T-05, Q-F); tỷ lệ kẹp 0–100 kèm cảnh báo |

## 8. Responsive (FR-18)
| ID | Kích thước | Kỳ vọng |
|---|---|---|
| TC-60 | 1440px và 1351px | 3 cột (trái/giữa/phải), không cuộn ngang trang |
| TC-61 | 1200px và 1350px | Ngưỡng chính xác: >1350px 3 cột; ≤1350px 2 cột, cột phải xuống hàng dưới thành lưới 2 cột; không cuộn ngang trang |
| TC-62 | 800px và 901px | ≤900px: thanh bên 72px chỉ icon, nhãn ẩn, 1 cột; 901px: sidebar 226px. Bảng kết quả **vừa khung, không cần cuộn ngang** ở 800px (kỳ vọng cũ sai); trang không cuộn ngang ở cả hai độ rộng (T-04) |
| TC-63 | 375px | Sau sửa T-04: không cuộn ngang trang ở cả 5 màn; topbar co/xuống dòng, nút vẫn bấm được |
| TC-64 | Tab menu ≤900px | Vẫn chuyển được 5 màn |

## 9. Bàn phím và truy cập
| ID | Bước | Kỳ vọng |
|---|---|---|
| TC-70 | Chỉ dùng Tab/Shift+Tab đi hết trang Runner | Tiếp cận được mọi nút, ô nhập, radio |
| TC-71 | Enter/Space trên nút "Bắt đầu chạy" | Kích hoạt như click |
| TC-72 | Nút bị vô hiệu (Duyệt, Tạo preview) | Không nhận focus/kích hoạt |
| TC-73 | Mũi tên trên nhóm radio phạm vi chạy | Đổi lựa chọn, hiển thị chọn Phần khi Single; **focus giữ ở nhóm radio** (sau sửa T-03) nên nhấn mũi tên liên tiếp ≥3 lần được. Lỗi cũ: focus mất về `<body>` sau lần đổi đầu |
| TC-74 | Quan sát dấu focus và độ tương phản | Ghi nhận (chưa có yêu cầu AC) [MỞ] |
| TC-75 | Ô nhập số: gõ giá trị, Tab rời ô | Sự kiện `change` kích hoạt, giao diện cập nhật; focus chuyển đến phần tử kế tiếp đúng thứ tự, `document.activeElement` ≠ `<body>` (sau sửa T-03). Lỗi cũ: mất focus về `<body>` |

## 10. Ghi chú chung
- Đây là kiểm thử hành vi mô phỏng; kết quả Đạt không chứng minh năng lực production.
- Cập nhật theo 07 (Q2/Q4/Q5): TC-04 không còn "về 0"; TC-01/10/20/21/27 tính cả Phần 01; thêm TC-28..29i (§4b). Kết quả thực thi xem 05 §H.
- TC-01/10/27 cần thao tác đổi giá trị thật vì trạng thái ban đầu đã sạch. Các ca "ghi nhận" tạo danh sách hạn chế đã biết, đưa cho người dùng quyết định (Q2, Q8, Q12…).

> **Ghi chú đồng bộ vòng 2 (2026-11-23, không chạy kiểm thử):** TC-51 (tải lại mất dữ liệu) vẫn đúng cho prototype; Q12 lưu bền là PROD. Chưa có TC cho: Rule Nháp bị khóa chạy/build, sửa tay trạng thái Rule (Q18), nhiều nguồn/tra y theo x (Q20), chính sách đơn giá hòa/thiếu (Q9 đã chốt A: dừng chạy Section; production [ĐX], 07 §H.5), thu hồi duyệt khi đổi phân trang (Q7; prototype không có phân trang theo Section). Các mục này chờ triển khai giai đoạn 07 §H.2; không ảnh hưởng kết quả kiểm thử hiện có.
