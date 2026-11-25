# 02 — Khái niệm: Template V0, Content Diff, Layout Diff, phụ thuộc, stale, phê duyệt, cổng build

Ký hiệu: **[QS]** quan sát được trong prototype · **[ĐX]** đề xuất · **[MỞ]** còn mở.

## 1. Thuật ngữ sản phẩm
Workspace, Recipe/Rule (Quy tắc), Section (Phần 01–05), Change Request (CR), Run (lần chạy), Section Revision, Build, Build Manifest, Template V0, Source snapshot, Patch, Stale ("Cần tính lại"), Chờ duyệt, Hợp lệ, Content Diff, Layout Diff.

## 2. Template V0 bất biến
**[QS]** UI nhắc nhiều lần: "Mẫu DOCX V0", "Template bất biến", "Mẫu gốc luôn giữ nguyên", nguồn "Mẫu kế hoạch.docx — Template V0 · Bất biến", Manifest "DOCX mẫu V0 — Không ghi đè — PIN", lịch sử "Template V0 (bất biến): DOCX mẫu không thay đổi trong tất cả các bản build". Tab "Mẫu gốc" ở Workspace luôn hiển thị số liệu gốc (12.000 × 250.000) bất kể chỉnh sửa. Manifest JSON ghi `template: "Original template V0 (immutable)"`. Prototype không đọc file DOCX nào; "bất biến" chỉ là nhãn + số liệu gốc cố định.

**[ĐX] Định nghĩa:** Template V0 là bản DOCX gốc do người dùng tải lên, được lưu ở trạng thái chỉ-đọc và định danh bằng mã băm nội dung (ví dụ `sha256:…`, như màn Lịch sử gợi ý). Mọi build:
1. Sao chép V0 ra bản làm việc, áp các Section Revision đã duyệt lên bản sao.
2. Không bao giờ ghi đè, sửa tại chỗ hoặc xóa V0.
3. Ghi mã băm V0 vào Build Manifest (PIN) để tái lập được.
4. Muốn đổi mẫu → tạo Template mới (V1…), không sửa V0; việc nâng cấp Recipe sang V1 là hành động riêng, có phê duyệt. **[ĐÃ CHỐT Q15]** Người dùng được phép đổi template của dự án đã có lịch sử. Hệ quả (trả lời «có vấn đề gì?», chi tiết 07 §H.9, đều [ĐX] chưa được duyệt): (a) build cũ vẫn ghim hash V0 cũ, giữ nguyên, truy vết được; (b) Section Revision đã duyệt trên mẫu cũ có thể không khớp vị trí/tên Section ở mẫu mới → cần **ánh xạ lại Section**; (c) mọi Section stale và hủy phê duyệt (nhất quán Q2/Q7); (d) baseline Layout Diff chuyển sang mẫu mới; (e) dự án có nhiều template trong lịch sử phải hiển thị rõ; (f) đề xuất: đổi mẫu = tạo Template mới (V1…), không sửa V0, là hành động riêng có xác nhận.

## 3. Content Diff vs Layout Diff
| | Content Diff | Layout Diff |
|---|---|---|
| Câu hỏi | Chữ/số/bảng nào đã đổi? | Vị trí/phân trang/định dạng nào đã đổi? |
| Nguyên nhân | Change Request, kết quả Rule, Patch nội dung | Nội dung dài/ngắn đi làm dịch trang, bảng ngắt, header/footer, mục lục |
| Đơn vị so sánh | Section / đoạn / ô bảng giữa V0 (hoặc build trước) và bản build | Trang, vị trí khối, số trang, ngắt dòng/bảng |
| Cần phê duyệt nội dung? | Có (Section Revision) | Không tự động; là tín hiệu rà soát |
| Tự động nghĩa là sửa chữ? | — | **Không**: "Chuyển trang là biến động layout, không tự động là thay đổi văn bản" (HTML) |

**[QS]** Prototype: tab "Content Diff" và "Layout Diff" ở màn Build chỉ là thẻ `span` không có xử lý click → **chưa hoạt động**. Phần thể hiện duy nhất là hai ô mô tả (review-tile) và số "Biến động" = số trang demo − 12. Số trang demo là 12 hoặc 13 tùy hộp "Mô phỏng phần 1 dài thêm" → đây là **hằng số**, không phải phân trang thật.

**[ĐX]** Ví dụ: tăng sản lượng 12.000→15.000 đổi số trong Phần 01, bảng Phần 02 → *Content Diff* có các ô đó. Nếu thêm đoạn văn dài ở Phần 01 làm Phần 02 trượt sang trang sau mà chữ Phần 02 không đổi → *Layout Diff* có, *Content Diff* của Phần 02 rỗng. Layout Diff chỉ có giá trị khi sinh từ DOCX thật qua engine render (xem tài liệu 03).

**[ĐÃ CHỐT, xác nhận vòng 4]** Q6: Layout Diff **luôn chỉ cảnh báo, không chặn build, không có ngoại lệ**; lỗi nặng (bảng tràn, trang trắng) được cảnh báo **mạnh hơn** (nổi bật) nhưng vẫn không tự chặn. Q7: phê duyệt **bị thu hồi** khi Section bị ảnh hưởng chỉ vì phân trang thay đổi (Content Diff rỗng nhưng Layout Diff đổi). **Vòng 2 xác nhận "đúng ý":** thu hồi duyệt đưa Section về `Chờ duyệt` nên phải duyệt lại, và cổng build chặn **gián tiếp vì chưa duyệt** (không phải vì Layout Diff) — 07 §H.1. Đề xuất cũ "không thu hồi phê duyệt" **bị thay thế**; "chặn khi lỗi nghiêm trọng" bị **loại** (vòng 4). Hiện chỉ là yêu cầu production; prototype không có phân trang theo Section.

## 4. Đồ thị phụ thuộc (quan sát được)
```
Phần 01 (nguồn: người dùng, qty)
  └─► Phần 02 Doanh thu = qty × đơn giá      (nguồn Excel 1; phụ thuộc Recipe version)
        ├─► Phần 03 Chi phí = Doanh thu × tỷ lệ   (nguồn Excel 2)
        │     └─► Phần 04 Lợi nhuận = Doanh thu − Chi phí
        └────────►┘ (Phần 04 phụ thuộc trực tiếp Phần 02 và 03)
                        └─► Phần 05 Kết luận (viết lại từ Lợi nhuận)
```
Ghi chú [QS]: màn Runner vẽ chuỗi tuyến tính 01→02→03→04→05, kèm chú thích phụ thuộc bổ sung. Phần 05 chỉ phụ thuộc Lợi nhuận.
**Ảnh 02 [QS về ảnh]:** khung "Quan hệ phụ thuộc" trên màn Recipe vẽ 01→02, rồi 02→03 và 02→04 **song song**, cả hai đổ vào 05. Khác HTML, nơi 04 phụ thuộc cả 03 (chi phí) lẫn 02. [ĐÃ CHỐT một phần Q19: người dùng chọn song song 01→02→{03,04}→05; MỞ: công thức 04 độc lập khỏi 03, xem 07 §H.11; prototype chưa đổi] phụ thuộc phải khai báo trong `dependsOn` của Rule (ảnh: `section-01.quantity`) thay vì cố định trong mã [ĐX].

## 5. Stale (hết hiệu lực)
**[ĐÃ CHỐT Q2]** Quy tắc mục tiêu: stale theo **sự kiện thay đổi** — mỗi lần cam kết đầu vào (qty, đơn giá, tỷ lệ, Recipe version) khác giá trị hiện hành tăng bộ đếm sửa đổi; Section stale cho đến khi được **chạy lại**; đặt lại giá trị cũ không xóa stale; sau chạy lại phải duyệt lại (07 §B.1). Q3 [ĐÃ CHỐT]: lưu Recipe version mới bắt buộc làm stale 02–05.

**[QS] Hành vi prototype trước Prototype V2** — hàm `stale()` so sánh **giá trị**, không theo sự kiện:
- Phần 02 stale nếu qty, đơn giá hoặc `ruleV` hiện tại khác giá trị đã lưu khi tính.
- Phần 03 stale nếu 02 stale, hoặc doanh thu đã lưu của 03 ≠ của 02, hoặc tỷ lệ chi phí khác.
- Phần 04 stale nếu 03 stale, hoặc doanh thu/chi phí đã lưu khác upstream.
- Phần 05 stale nếu 04 stale, hoặc lợi nhuận đã lưu khác.
Hệ quả: stale lan truyền xuôi; đổi qty/đơn giá/tỷ lệ/Recipe version đều làm stale; đưa giá trị về như cũ thì hết stale (**trái Q2 — sẽ được sửa ở Prototype V2**). Lưu Recipe (v3→v4) làm Phần 02–05 stale kể cả khi chữ mô tả không đổi (Q3 [ĐÃ CHỐT]). Đổi tỷ lệ chi phí chỉ làm 03–05 stale, không làm 02.
Mọi thay đổi đầu vào đặt `built = null` (xóa preview).

## 6. Phê duyệt và cổng build
- Kết quả mới sau khi Run có `approved:false` → hiển thị "● Chờ duyệt". Seed ban đầu: 02–05 đã duyệt.
- Nút "Duyệt kết quả hợp lệ" (`approveAll`) chỉ duyệt các Phần **không stale**; nút bị vô hiệu khi còn stale. Hành vi trước V2: không có duyệt từng Section; Phần 01 không có phê duyệt. **[ĐÃ CHỐT Q4, Q5]**: Phần 01 cần phê duyệt (đổi qty đưa Phần 01 về `Chờ duyệt` và cổng build tính cả Phần 01); không có vai trò; duyệt từng Section và duyệt tất cả (07 §B.2–B.3).
- Cổng build `canBuild()` = không Phần nào stale **và** không Phần nào (không stale) còn chờ duyệt. Nếu không đạt, nút "Tạo preview build" bị vô hiệu và nếu gọi sẽ hiện "Chưa thể build…".
- Build thành công ghi `Preview demo` vào Build History, nội dung "Preview GIẢ LẬP".
- Run chế độ Single ở Phần k>2: bị chặn nếu có Phần upstream (02..k−1) stale; ngược lại cho chạy và để downstream stale (Q8 [ĐÃ CHỐT]: cho phép Single).

**[ĐX]** Cổng build production gồm (Layout Diff chỉ cảnh báo, không ngoại lệ — Q6; nhưng thu hồi duyệt theo Q7 có thể đưa Section về chờ duyệt): (1) không stale; (2) mọi Section Revision liên quan đã duyệt bởi người có quyền; (3) nguồn Excel đúng snapshot; (4) kiểm tra hợp lệ của Rule (đơn vị, trùng bản ghi, kết quả âm, evidence); (5) validation layout theo mục Layout Diff.

## 7. Phiên bản Recipe
**[QS]** `ruleV` khởi tạo 3; "Lưu phiên bản quy tắc" tăng 1, sao chép văn bản mô tả, hiện thông báo "AI phải biên dịch và duyệt kế hoạch thực thi; demo vẫn dùng executor cố định". Ô "Cách lưu" (Quy tắc dùng lại/Patch một lần) lưu vào `state.rulePersistence` nhưng không dùng. Schema JSON hiển thị gắn `status: "APPROVED (previous version)"` cố định. Ảnh 03 ghi "v3.2" → khác (§ Q1).
**Ảnh 02 [QS về ảnh]:** mỗi Rule có version và trạng thái riêng (revenue-rule v3, cost-rule v2, profit-rule v2, conclusion-rule v4, price-lookup-rule v1 Nháp); chọn "Phiên bản: v3 (hiện tại)"; trường Phiên bản là ô số, Trạng thái là menu "Đã duyệt"; tab "Lịch sử phiên bản" và "Sử dụng (3)". Header dự án hiện "v2.3" và Lịch sử bản dựng v2.0–v2.3 — bộ đếm khác với version Rule. HTML chỉ có **một** `ruleV` dùng chung cho cả thư viện (tăng mỗi lần lưu, làm 02–05 stale). Ảnh không cho thấy cách version Rule ảnh hưởng stale. [ĐÃ CHỐT Q17: hai bộ đếm khác nhau — bản dựng/dự án và version Rule; Q18: cho phép sửa tay version/trạng thái Rule — vòng 4: số version tay chỉ là nhãn, không trùng version cũ]
**Template ở ảnh 02:** Lịch sử bản dựng ghi "Mẫu: Kế hoạch kinh doanh 2027.docx (v1.0)", còn HTML gọi "Template V0". [MỞ] "v1.0" và "V0" cùng là bản gốc bất biến hay hai mã khác nhau; chưa đủ căn cứ để coi là mâu thuẫn với khái niệm V0 bất biến.
**[ĐX]** Version bất biến, mỗi lần lưu tạo bản mới; chạy/duyệt tham chiếu version cụ thể; bản mới chỉ có hiệu lực sau biên dịch + kiểm thử + phê duyệt.

## 8. Quyết định còn mở của tài liệu này
Đã chốt (xem `07`): Q2, Q3, Q6, Q7 (và hệ quả build gián tiếp), Q8, Q17, Q18. Vòng 3: Q15 đã chốt (được đổi template; hệ quả [ĐX] ở §2). **Q19** chốt song song, [MỞ] công thức Phần 04 (07 §H.11). **Q16 [ĐÃ CHỐT vòng 4]**: nguồn Excel đổi phiên bản ⇒ hệ thống **đánh dấu stale** các Section dùng nguồn đó và nêu lý do; **không tự chạy**; người dùng tự bấm chạy lại (07 §H.10). **Q18 [vòng 4]**: Rule đổi sang Nháp ⇒ Section dùng Rule stale + mất phê duyệt; đổi lại Đã duyệt không tự hết stale (07 §H.15). **Q12 [sửa vòng 4]**: lịch sử/bản dựng xóa được — bản ghi bất biến về nội dung nhưng không còn «không bao giờ mất»; xóa bản dựng làm mất tái lập bản đó; Template V0 vẫn bất biến và, theo đề xuất, không nằm trong «Xóa sạch» (07 §H.14). Prototype không có upload nguồn; chỉ gõ số đơn giá/tỷ lệ.
