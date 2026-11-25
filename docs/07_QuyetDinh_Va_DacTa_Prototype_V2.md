# 07 — Quyết định nghiệp vụ Q1–Q21 và đặc tả thay đổi Prototype V2

Ngày ghi quyết định: **2026-11-23**. Nguồn sự thật: câu trả lời của người dùng (ghi đúng ý). Tài liệu này thay thế các "quyết định mặc định" cũ trong `06` §0 và nhãn [MỞ] trong 00–03 cho các Q đã chốt.

Ký hiệu: **[QS]** quan sát được trong prototype · **[ĐX]** đề xuất · **[ĐÃ CHỐT]** người dùng đã quyết · **[MỞ]** chưa quyết.
Ký hiệu phạm vi: **[PROTO]** triển khai trong HTML prototype (Dev) · **[PROD]** chỉ là yêu cầu/đề xuất cho sản phẩm thật, **không** triển khai trong prototype.

> Prototype vẫn là HTML tĩnh: không tạo DOCX thật, không phân trang thật (số trang 12/13 là hằng số, `?long=1`), phép tính doanh thu/chi phí/lợi nhuận là JS cố định, không lưu bền. Không mục nào dưới đây làm thay đổi điều đó.

## A. Bảng quyết định

| Q | Quyết định của người dùng | Trạng thái | Phạm vi | Xử lý trong tài liệu này |
|---|---|---|---|---|
| Q1 | Không có nguồn giao diện chuẩn (ảnh và HTML đều là mockup). **Vòng 2:** toàn bộ chức năng thấy trong ảnh mockup là chức năng cần có và được giữ | [ĐÃ CHỐT] | Tài liệu + PROD (giai đoạn PROTO ở §H.2) | §B.0, **§H.2** |
| Q2 | Đưa qty về 12.000 KHÔNG tự hết stale: phải chạy/duyệt lại. Stale theo **sự kiện thay đổi**, không so giá trị | [ĐÃ CHỐT] | PROTO | §B.1 |
| Q3 | Lưu Recipe version mới bắt buộc làm stale Phần 02–05 | [ĐÃ CHỐT] | PROTO (giữ nguyên) | §B.6 |
| Q4 | Phần 01 cần phê duyệt | [ĐÃ CHỐT] | PROTO | §B.2 |
| Q5 | Không có vai trò; duyệt từng Section và duyệt tất cả | [ĐÃ CHỐT] | PROTO | §B.3 |
| Q6 | Layout Diff luôn chỉ cảnh báo, không ngoại lệ; lỗi nặng cảnh báo mạnh hơn (vòng 2 + xác nhận vòng 4) | [ĐÃ CHỐT] | PROD (+ nhãn mô tả ở PROTO) | §C.1, **§H.1** |
| Q7 | Phê duyệt bị thu hồi khi chỉ phân trang đổi ⇒ phải duyệt lại; build bị chặn gián tiếp (xác nhận "đúng ý" vòng 2) | [ĐÃ CHỐT] | PROD | §C.2, **§H.1** |
| Q8 | Cho phép chạy riêng một Section (Single) | [ĐÃ CHỐT] | PROTO (giữ nguyên) | §B.6 |
| Q9 | Phương án A: khi tra đơn giá gặp dòng hòa (cùng ngày hiệu lực) hoặc thiếu dữ liệu thì DỪNG chạy Section, hiện lỗi rõ nguyên nhân, không ghi kết quả/Run cho tới khi người dùng sửa dữ liệu; nhiều dòng hợp lệ → ngày hiệu lực mới nhất | [ĐÃ CHỐT] (thi hành là yêu cầu production [ĐX]) | PROD (prototype không thi hành) | §C.3, **§H.5** |
| Q10 | Chọn khuyến nghị §D.4 (P1 + bộ định vị Section + LibreOffice headless; ghi engine/phiên bản vào manifest; spike trên «Kế hoạch kinh doanh 2027.docx») | [ĐÃ CHỐT, PROD] | PROD (prototype không tạo DOCX thật) | §D, **§H.7** |
| Q11 | Phương án A: đếm tăng theo từng dự án, mã bất biến, không tái dùng | [ĐÃ CHỐT] | PROD | §E, **§H.8** |
| Q12 | Lưu bền; ai cũng xem/xóa được, không phân quyền; **được tự xóa từng bản ghi + «Xóa sạch»** (SỬA vòng 4, thay «append-only/không xóa»); thời gian lưu chưa quy định | [ĐÃ CHỐT, sửa] + [MỞ nhỏ] (thời gian lưu; phạm vi «Xóa sạch») | PROD | §C.4, **§H.3, §H.14** |
| Q13 | Không giới hạn kích thước / số Section / số nguồn Excel | [ĐÃ CHỐT] | PROD (prototype cố định 5 Section, 2 Excel) | §C.5 |
| Q14 | Chỉ tiếng Việt | [ĐÃ CHỐT] | PROTO (giữ) + PROD | §C.6 |
| Q15 | Được phép đổi template của dự án đã có lịch sử; hệ quả cần phân tích | [ĐÃ CHỐT]; hệ quả [ĐX] | PROD | **§H.9** |
| Q16 | Nguồn đổi phiên bản ⇒ đánh dấu stale Section dùng nguồn + nêu lý do; không tự chạy; người dùng tự bấm chạy lại | [ĐÃ CHỐT vòng 4] | PROD | **§H.10** |
| Q17 | "v2.3" (phiên bản dự án/bản dựng) và "v3" (version Rule) là **hai bộ đếm khác nhau** | [ĐÃ CHỐT] | PROD | §C.7 (liên quan §E) |
| Q18 | Sửa tay version/trạng thái Rule được; version tay chỉ là nhãn, không trùng; đổi sang Nháp ⇒ stale + mất duyệt; đổi lại Đã duyệt không tự hết stale | [ĐÃ CHỐT, bổ sung vòng 4] | PROD | §C.8, §H.4, **§H.15** |
| Q19 | Chọn SONG SONG 01→02→{03,04}→05 | [ĐÃ CHỐT một phần]; [MỞ] công thức 04 (mâu thuẫn «Doanh thu − Chi phí») | PROD/PROTO (Dev chưa đổi) | §F, **§H.11** |
| Q20 | Thêm được nhiều nguồn (Excel/DOCX), không giới hạn số nguồn; cách dùng do người dùng định nghĩa trong Rule; «4/4» chỉ là mock — đếm liên kết hợp lệ / tổng liên kết thật | [ĐÃ CHỐT; «4/4» đóng vòng 4] | PROD | §C.9, §H.6, **§H.16** |
| Q21 | Trạng thái CR, phạm vi, ngày cập nhật là thuộc tính bắt buộc; CR gắn với build | [ĐÃ CHỐT] | PROD | §C.10 |

Vòng 3: Q10, Q11 đã chốt; Q15 chốt; Q16, Q19 chốt một phần (xem §H.7–H.11). **Vòng 4:** Q16, Q18, Q6, Q20 đóng; Q12 sửa (được xóa); Q19 và thứ tự G1–G6 vẫn [MỞ] (§H.13–H.17).

## B. Đặc tả thay đổi cho Prototype [PROTO]

Thuật ngữ dùng đúng sản phẩm: Section (Phần 01–05), Run, Recipe version (`ruleV`), Chờ duyệt, Hợp lệ, "Cần tính lại" (stale), cổng build (`canBuild()`).

### B.0 Hệ quả của Q1 (tài liệu)
- Bỏ câu "HTML là chuẩn giao diện" (06 §0, Q1) và câu "bộ tài liệu coi HTML là hành vi quan sát, ảnh là gợi ý" ở 00 §4: nay cả hai chỉ là mockup. Phần "Quan sát [QS]" vẫn mô tả đúng **HTML hiện có**; phần "ảnh" mô tả đúng **ảnh**; chênh lệch (00 §4, 01 §3.3) là danh sách mục cần quyết từng mục khi triển khai production, không mặc định theo bên nào.
- Khi Dev/QA gặp lệch ảnh–HTML: giữ hành vi HTML trừ khi đặc tả này nêu khác; không "sửa cho giống ảnh".

### B.1 Q2 — Stale theo sự kiện thay đổi [PROTO]

**Định nghĩa.**
- *Sự kiện thay đổi đầu vào* = một lần **cam kết** (commit: `change`/chip/Lưu) mà giá trị mới **khác** giá trị hiện hành ngay trước lần cam kết đó, áp dụng cho: qty (Phần 01), đơn giá (Phần 02), tỷ lệ chi phí (Phần 03), `ruleV` (Lưu phiên bản quy tắc — Q3).
- Mỗi sự kiện tăng bộ đếm sửa đổi (revision) của đầu vào tương ứng (ví dụ `rev.qty`, `rev.price`, `rev.rate`, `rev.rule`). Cam kết đúng giá trị đang có **không** là sự kiện (không tăng, không stale).
- Mỗi Section 02–05 khi chạy ghi lại các revision của đầu vào và của Section upstream mà nó dựa vào (`basedOn`). Section **stale** khi `basedOn` ≠ revision hiện hành của bất kỳ đầu vào/upstream nào của nó. Lan truyền xuôi: 02 stale ⇒ 03–05 stale (đồ thị như `02` §4, vẫn chờ Q19).
- Stale chỉ hết khi **Run** Section đó (hoặc phạm vi Affected/Full bao gồm nó). Đặt lại giá trị về như cũ, hoặc nhập lại đúng giá trị, **không** xóa stale.
- Sau khi Run, Section có kết quả `Chờ duyệt`; phải duyệt lại (B.3) trước khi build.
- Khi Section chuyển sang stale, trạng thái duyệt cũ của nó bị coi là không còn hiệu lực (hiển thị "Cần tính lại", không hiển thị "Hợp lệ"); sau Run mới ở `Chờ duyệt`.
- Phần 01 không stale (là đầu vào gốc); thay đổi qty chuyển Phần 01 sang `Chờ duyệt` (B.2).
- Mọi sự kiện vẫn xóa preview build (`invalidate()`, FR-12) như hiện có.

**Hiển thị.**
1. Pill "↻ Cần tính lại" như hiện có, kèm **lý do** ngắn trong tooltip/dòng phụ: ví dụ "Sản lượng đã thay đổi (12.000 → 15.000 → 12.000)". Lý do liệt kê sự kiện đầu vào làm stale, không so giá trị.
2. Badge "N phần cần tính lại" và số cạnh "Dependencies & Run" như cũ.
3. Khi giá trị hiện hành trùng giá trị lúc Section được tính lần cuối nhưng vẫn stale, hiển thị ghi chú: "Giá trị trùng lần tính trước nhưng đầu vào đã thay đổi sau đó; cần chạy lại và duyệt lại." (Làm rõ cho người dùng vì khác trực giác "về 12.000 là xong".)

**Tiêu chí chấp nhận (kiểm chứng được).** Trạng thái đầu: tải mới, qty 12.000, 02–05 Hợp lệ, 0 stale.
- **AC-Q2-1** Đặt qty 15.000 → 4 stale (02–05), badge "4 phần cần tính lại".
- **AC-Q2-2** Sau AC-Q2-1, đặt lại qty 12.000 → **vẫn 4 stale**, badge vẫn 4; không Section nào hiển thị "Hợp lệ"; nút Tạo preview build vô hiệu.
- **AC-Q2-3** Sau AC-Q2-2, chạy Affected → Run ghi 02→05; kết quả 3.000.000.000 / 1.950.000.000 / 1.050.000.000; cả 4 phần "Chờ duyệt"; badge 0.
- **AC-Q2-4** Chỉ sau khi duyệt lại (B.3) cổng build mới mở.
- **AC-Q2-5** Cam kết qty đúng giá trị đang có (12.000 → 12.000) không tạo stale, không xóa preview build, không đổi trạng thái duyệt.
- **AC-Q2-6** Đổi tỷ lệ 65 → 70 → 65: 03–05 stale, **02 không stale**; sau về 65 vẫn stale 03–05.
- **AC-Q2-7** Đổi đơn giá rồi đặt lại: 02–05 stale, vẫn stale sau khi đặt lại.
- **AC-Q2-8** Lưu phiên bản quy tắc (v3→v4): 02–05 stale (Q3); không có cách nào làm hết stale ngoài Run.
- **AC-Q2-9** Lý do stale hiển thị đúng sự kiện (AC-Q2-1: nêu "12.000 → 15.000 → 12.000" hoặc tương đương nêu rõ có thay đổi qty).
- **AC-Q2-10** Mẫu gốc (Template V0) vẫn 12.000 và bất biến sau mọi thao tác.
- **AC-Q2-11** `?seed=ran` / `?seed=approved` vẫn hoạt động: seed khởi tạo revision nhất quán (không stale ngay khi mở), `?seed=approved` ra build B-028 với cổng mở.
- **AC-Q2-12** Single Section: quy tắc chặn khi upstream stale (FR-09) vẫn đúng theo định nghĩa stale mới.

**Hệ quả cho tài liệu cũ.** 06 T-01 tiêu chí 3 ("đặt lại 12.000 → về 0 stale") **sai** theo Q2 → đã sửa (xem `06`). 04 TC-04 cũng đổi kỳ vọng (QA cập nhật ở bước sau).

### B.2 Q4 — Phần 01 có trạng thái phê duyệt và ảnh hưởng cổng build [PROTO]
- Phần 01 có trạng thái duyệt: `Hợp lệ` (đã duyệt) / `Chờ duyệt`. Trạng thái ban đầu (seed sạch, qty 12.000): `Hợp lệ`.
- Mọi sự kiện đổi qty (theo B.1) chuyển Phần 01 sang `Chờ duyệt`, kể cả khi đặt lại 12.000. Cam kết cùng giá trị không đổi trạng thái.
- Hiển thị: `sectionStatus(1)` thay nhãn hiện có ("✓ Gốc" / "● Đã sửa dữ liệu") bằng trạng thái duyệt; có thể giữ chú thích "đã sửa dữ liệu" như thông tin phụ. Phần 01 có nút duyệt (B.3).
- **Cổng build:** `canBuild()` = không Section 02–05 stale **và** không Section nào trong 01–05 còn `Chờ duyệt`. Panel nêu số lượng chờ duyệt gồm cả Phần 01; thông báo chặn gọi trực tiếp hàm vẫn giữ.
- Phần 01 không chặn việc Run 02–05 (chỉ chặn build). Duyệt Phần 02–05 khi 01 đang chờ duyệt vẫn được.
- **AC-Q4-1** Tải mới: Phần 01 "✓ Hợp lệ"; build bật.
- **AC-Q4-2** Đổi qty 15.000 → Phần 01 "Chờ duyệt" (không "Cần tính lại"); sau Run + duyệt 02–05 mà chưa duyệt 01 → build vẫn vô hiệu, panel ghi "1 kết quả cần duyệt" (hoặc số tương ứng, có Phần 01).
- **AC-Q4-3** Duyệt Phần 01 xong (và 02–05 đã duyệt, không stale) → build bật.
- **AC-Q4-4** Đổi qty 15.000 rồi về 12.000: Phần 01 vẫn `Chờ duyệt` (Q2).
- **AC-Q4-5** Gọi hàm build trực tiếp khi 01 chờ duyệt → bị từ chối kèm thông báo; không tạo bản ghi build.
- **AC-Q4-6** `?seed=approved` có Phần 01 đã duyệt; build B-028 được tạo.

### B.3 Q5 — Duyệt từng Section và duyệt tất cả, không có vai trò [PROTO]
- Mỗi Section 01–05 có nút "Duyệt" riêng, ở bảng kết quả (Runner) và ở danh sách Section (Workspace) hoặc ít nhất ở Runner. Nút bật khi Section **không stale** và đang `Chờ duyệt`; ngược lại vô hiệu (đã duyệt/stale).
- Nút "Duyệt tất cả" (thay "Duyệt kết quả hợp lệ"): duyệt mọi Section không stale đang chờ duyệt, gồm Phần 01; bỏ qua Section stale và nêu trong thông báo số Section bị bỏ qua. Vô hiệu khi không có Section nào chờ duyệt không stale.
- Không có vai trò/đăng nhập/tên người duyệt trong giao diện. Không ghi "người duyệt" (đó là [PROD] khi có định danh người dùng; Q5 hiện là "không có vai trò").
- Duyệt không tạo Run. Duyệt xóa không preview build. Duyệt một Section không tự duyệt Section khác.
- **AC-Q5-1** Sau Run Affected (4 phần chờ duyệt) + Phần 01 chờ duyệt: có 5 nút duyệt bật; bấm "Duyệt" ở Phần 03 chỉ đổi Phần 03 sang "Hợp lệ"; các phần khác giữ nguyên.
- **AC-Q5-2** "Duyệt tất cả" duyệt cả 5 (hoặc số Section chờ duyệt không stale); cổng build mở khi không stale.
- **AC-Q5-3** Khi 02 stale, nút Duyệt của 02–05 vô hiệu; "Duyệt tất cả" chỉ duyệt Phần 01 nếu chờ duyệt (và nêu số bị bỏ qua).
- **AC-Q5-4** Không có chữ nào về vai trò/quyền/tên người duyệt trong UI.
- **AC-Q5-5** Duyệt không thay đổi giá trị, không thêm Run, không thêm build.

### B.4 Giữ nguyên hành vi (Q3, Q8)
**Q3:** Lưu Recipe version mới làm 02–05 stale (kể cả khi chữ không đổi); theo B.1 còn không có cách xóa stale ngoài Run. **Q8:** Single cho phép như hiện có (FR-09: chặn khi upstream stale; nếu cho chạy thì downstream giữ giá trị cũ và stale nếu upstream đổi). Không thêm yêu cầu mới.

### B.5 Mục chỉ là đề xuất, KHÔNG triển khai trong prototype
Q6, Q7, Q9, Q12, Q17, Q18, Q20, Q21 (§C). Với Q6, nhãn mô tả "Layout Diff chỉ cảnh báo, không chặn build" có thể thêm vào tab Layout Diff (T-07) mà không đổi logic; không bắt buộc.

### B.6 Việc bàn giao cho Dev/QA (tóm tắt thứ tự)
1. **Dev-1** Mô hình revision + `stale()` theo sự kiện (B.1), seed nhất quán. Phụ thuộc: không.
2. **Dev-2** Trạng thái duyệt Phần 01 + `canBuild()` (B.2). Phụ thuộc Dev-1.
3. **Dev-3** Duyệt từng Section + Duyệt tất cả (B.3). Phụ thuộc Dev-2.
4. **QA** AC-Q2-*, AC-Q4-*, AC-Q5-* + hồi quy 04 (cập nhật TC-04 và các ca duyệt/build). Phụ thuộc Dev-1..3.
Chỉ sửa `docs/DocFlow_Interactive_Mockup.html` và `.md`; không thêm framework; giữ nhãn minh bạch FR-19.

## C. Quyết định chỉ là yêu cầu/đề xuất Production [PROD]

### C.1 Q6 — Layout Diff chỉ cảnh báo
Layout Diff hiện cảnh báo, **không** chặn build. Cổng build vẫn chặn theo stale/duyệt (02 §6). **Vòng 4 [ĐÃ CHỐT]:** không có ngoại lệ; mặc định cũ "chặn khi lỗi layout nghiêm trọng" bị loại; lỗi nặng (bảng tràn, trang trắng) chỉ cảnh báo mạnh hơn (§H.13). Prototype: không có Layout Diff thật.

### C.2 Q7 — Thu hồi duyệt khi phân trang đổi
- Quyết định: phê duyệt của Section bị thu hồi khi Section đổi nội dung chỉ vì phân trang thay đổi. **Làm rõ giả định [ĐX]:** áp dụng khi Layout Diff cho thấy Section bị đẩy/ngắt trang khác (vị trí/trang thay đổi) dù Content Diff của Section rỗng.
- **Tương tác Q6×Q7 [ĐÃ CHỐT vòng 2]:** người dùng xác nhận "đúng ý": Layout Diff chỉ cảnh báo, nhưng phân trang đổi thì thu hồi duyệt ⇒ phải duyệt lại ⇒ build bị chặn gián tiếp vì chưa duyệt (§H.1).
- Prototype: số trang chỉ là hằng số 12/13 (`?long=1`); **không** có thông tin theo Section để thu hồi duyệt đúng nghĩa ⇒ không triển khai.
- AC production: sau build/render, nếu vị trí/trang của Section khác bản trước mà nội dung giống → duyệt của Section đó thu hồi, ghi lý do "Thay đổi phân trang" vào lịch sử; Section không bị đẩy trang giữ nguyên duyệt.

### C.3 Q9 — Chính sách chọn đơn giá [ĐÃ CHỐT phương án A; PROD [ĐX]; xem §H.5]
Nhiều dòng hợp lệ → chọn ngày hiệu lực **mới nhất**; hòa hoặc thiếu dữ liệu → **dừng chạy Section**, hiện lỗi rõ nguyên nhân, không tự đoán, không ghi kết quả/Run. Production phải thi hành và có test (hòa, thiếu, nhiều dòng, sửa dữ liệu rồi chạy lại, downstream bị chặn). Prototype không thi hành (JS cố định).

### C.4 Q12 — Lưu bền lịch sử
Lịch sử (CR, Recipe, Run, duyệt, Build) lưu bền, bản ghi bất biến về nội dung, truy vết. **Vòng 4 SỬA:** không còn «append-only/không xóa» — người dùng được tự xóa từng bản ghi và «Xóa sạch» (§H.14). Vòng 2 đã chốt: ai cũng xem được, không phân quyền. Còn [MỞ nhỏ]: thời gian lưu giữ (§H.3). Prototype vẫn mất dữ liệu khi tải lại.

### C.5 Q13 — Không giới hạn quy mô
Không đặt giới hạn cứng số Section/nguồn Excel/kích thước. Lưu ý [ĐX]: "không giới hạn" cần mục tiêu hiệu năng/giới hạn kỹ thuật thực tế để kiểm thử (chưa có số liệu).

### C.6 Q14 — Chỉ tiếng Việt
Giao diện và tài liệu chỉ tiếng Việt; số định dạng `vi-VN`. Không i18n. Prototype giữ nguyên.

### C.7 Q17 — Hai bộ đếm tách biệt
- **Mã/phiên bản dự án–bản dựng** (ảnh 02: "v2.3", Lịch sử bản dựng v2.0–v2.3; HTML: `B-027`, `B-028`) và **version Rule/Recipe** (ảnh: "v3"; HTML: `ruleV`) là hai bộ đếm độc lập. Tăng version Rule không tự tăng số bản dựng và ngược lại; mỗi build ghi **cả hai** (build ghi Rule version đã dùng).
- Quy ước đánh số mã bản dựng: §E (Q11, [MỞ]).

### C.8 Q18 — Sửa tay version/trạng thái Rule
Cho phép sửa tay. **Điều kiện [ĐX]:** mỗi lần sửa tay ghi audit (ai/khi nào/giá trị cũ→mới); không cho trùng version trong cùng Rule; không sửa ngược version/trạng thái của bản đã được Run/Build tham chiếu (tạo version mới thay vì ghi đè); Rule Nháp không dùng để chạy/build (FR-20). Rủi ro cần người dùng biết: sửa tay có thể làm lịch sử không tái lập nếu bỏ điều kiện này.

### C.9 Q20 — Nguồn thứ ba "Hồ sơ nhân sự.docx"
Thuộc phạm vi. Cần: nguồn dạng .docx (không chỉ Excel) trong Data Binding (FR-22), khả năng đọc cấu trúc/đoạn/bảng từ DOCX nguồn. Mâu thuẫn ảnh «Liên kết dữ liệu 4/4» vs 3 nguồn: **đã đóng vòng 4** — «4/4» chỉ là số mock (§H.16).

### C.10 Q21 — CR là thực thể có thuộc tính bắt buộc
Thuộc tính bắt buộc: **trạng thái** (ví dụ Đã xử lý), **phạm vi ảnh hưởng** (P01…P05/Toàn bộ), **ngày cập nhật**; ngoài ra giữ đề xuất FR-03 (giá trị cũ/mới, người tạo, Section đích). CR **gắn với build**: CR đã xử lý liên kết tới bản dựng sinh ra (ảnh: CR-003 ↔ v2.3); build liệt kê CR đã bao gồm. Prototype không triển khai (CR chỉ có mã, mô tả, Section).

## D. Q10 — Giải pháp kỹ thuật tạo/patch DOCX [ĐÃ CHỐT vòng 3: chọn §D.4; xem §H.7]

Mục tiêu: tạo DOCX từ Template V0 bất biến, patch nội dung Section đã duyệt, **có số trang thật** và Layout Diff. Hai bài toán khác nhau: (1) **sửa file DOCX**, (2) **render để phân trang**. Thư viện OOXML không phân trang; chỉ engine render mới cho số trang.

### D.1 Phương án sửa nội dung
| Phương án | Ưu điểm | Nhược điểm / rủi ro |
|---|---|---|
| **P1. Patch OOXML trực tiếp** (python-docx / docx4j / OpenXML SDK / thao tác XML): sao chép V0, sửa đoạn/ô bảng theo vị trí | Giữ nguyên style/định dạng gốc, thay đổi tối thiểu, diff nội dung dễ (so XML/văn bản), đúng "V0 bất biến" (sửa bản sao) | Văn bản bị chia thành nhiều `run` ⇒ khó thay đúng chỗ; bảng gộp ô, content control, đánh số, trường (field) dễ vỡ; python-docx phủ không đủ mọi tính năng (cần XML thô); chọn công nghệ gắn với ngôn ngữ backend |
| **P2. Template + placeholder/content control** (docxtpl, docx-templates, docx4j variable, OpenXML content controls) | Rất ổn định cho vùng đã đánh dấu; người soạn mẫu kiểm soát vùng thay; dễ kiểm chứng | Phải chuẩn bị lại mẫu (đặt placeholder) — **trái nguyên tắc dùng DOCX mẫu hiện có bất biến** nếu V0 phải là file gốc không sửa; chỉ thay vùng đã đánh dấu, không thêm mục mới linh hoạt |
| **P3. Sinh lại toàn bộ từ mô hình** (dựng DOCX mới) | Kiểm soát hoàn toàn | Mất định dạng gốc của V0, trái "patch" và rủi ro lệch bố cục; không khuyến nghị |

### D.2 Phương án render/phân trang (cần cho Layout Diff)
| Engine | Ưu điểm | Nhược điểm / rủi ro |
|---|---|---|
| **LibreOffice headless** (DOCX→PDF) | Miễn phí, chạy trên máy chủ, tự động hóa được, đủ để đo số trang/vị trí | Phân trang **không trùng 100% Word** (font, ngắt dòng, bảng); cần cài font giống bản gốc; hiệu năng/độc lập tiến trình cần quản lý |
| **Microsoft Word (tự động hóa)** | Trung thực nhất với kết quả người dùng thấy | Cần giấy phép/Windows, khó chạy ổn định trên máy chủ, tốn tài nguyên, có điều khoản dùng trên server |
| **Dịch vụ render bên thứ ba** (Aspose, v.v.) | Có SLA, API | Chi phí, dữ liệu rời hệ thống (cần chính sách dữ liệu), vẫn có sai khác nhỏ so với Word |

### D.3 Rủi ro chung
Sai khác phân trang giữa engine và Word thật làm Layout Diff không khớp trải nghiệm người dùng; font thiếu; DOCX phức tạp (bảng gộp, trường, theo dõi thay đổi); khóa công nghệ; kiểm thử hồi quy cần bộ DOCX mẫu; Layout Diff phụ thuộc engine nên phải ghi engine+phiên bản vào manifest để tái lập.

### D.4 Khuyến nghị [ĐX]
P1 (patch OOXML bản sao của V0) + một bộ định vị Section ổn định (ví dụ bookmark/content control **được thêm vào bản sao**, không sửa V0) + render bằng **LibreOffice headless** làm engine mặc định cho Layout Diff, ghi rõ trong UI rằng số trang là "theo engine X phiên bản Y" (có thể lệch Word). Làm một **thử nghiệm kỹ thuật** (spike) trên DOCX thật "Kế hoạch kinh doanh 2027.docx": (a) patch 3 vùng, (b) so số trang LibreOffice với Word. Chọn thư viện theo ngôn ngữ backend (chưa chọn). **Vòng 3: người dùng chọn khuyến nghị này (§H.7).**

## E. Q11 — "Mã bản dựng B-028": giải thích đơn giản và phương án [ĐÃ CHỐT phương án A, vòng 3; xem §H.8]

**Là gì?** Mỗi lần bấm "Tạo bản dựng", sản phẩm tạo một "ấn bản" tài liệu và đặt cho nó một số hiệu để gọi tên, như số hóa đơn. "B-028" nghĩa là "bản dựng thứ 28". Hiện trong prototype số này chỉ đếm tiếp từ B-027 trong bộ nhớ; tải lại trang là mất.

**Vì sao phải quy ước khi lưu bền?** Khi lịch sử được lưu lâu dài (Q12), số hiệu là cách duy nhất để nói "bản nào" khi so sánh, báo lỗi, hoặc truy vết CR. Nếu không có quy ước: hai người cùng bấm có thể trùng số; xóa một bản có thể làm "tái dùng" số cũ; không rõ số đếm theo từng dự án hay chung cả hệ thống.

**Lưu ý Q17:** mã bản dựng **khác** số version của Rule ("v3"). Số hiệu bản dựng chỉ đánh dấu ấn bản; version Rule ghi bên trong build.

| Phương án | Ví dụ | Ưu | Nhược |
|---|---|---|---|
| **A. Đếm tăng theo từng dự án** (mặc định đề xuất) | `B-028` trong dự án "Kế hoạch kinh doanh 2027"; dự án khác có B-001 riêng | Dễ đọc, dễ nhớ; không trùng trong dự án; không tái dùng số đã xóa | Hai dự án có thể cùng "B-001" ⇒ khi nói chuyện phải kèm tên dự án |
| **B. Đếm tăng toàn hệ thống** | `B-000428` | Duy nhất toàn cục | Số lớn, ít ý nghĩa với người dùng |
| **C. Mã theo phiên bản dự án** (kiểu ảnh 02) | `v2.3` (2 = đợt lớn, 3 = lần dựng) | Khớp ngôn ngữ nghiệp vụ trong ảnh | Dễ lẫn với version Rule ("v3"); cần quy tắc khi nào tăng số đầu |

**Đề xuất mặc định:** Phương án A, mã bất biến, **không bao giờ tái dùng**, kèm trường mô tả tự do; hiển thị "B-028 · Rule v3 · Mẫu V0 (hash…)". **Câu hỏi cho người dùng:** "Bạn muốn mã bản dựng đếm riêng từng dự án (A), đếm chung (B) hay theo kiểu v2.3 (C)?" Nếu không chọn, dùng A.

## F. Q19 — 03 Chi phí và 04 Lợi nhuận: song song hay 04 phụ thuộc 03? [ĐÃ CHỐT một phần: song song; MỞ công thức 04; xem §H.11]

| | Phương án 1 — song song (theo ảnh 02) | Phương án 2 — 04 phụ thuộc 03 (theo HTML `stale()`) |
|---|---|---|
| Đồ thị | 01→02→{03, 04}→05 | 01→02→03→04→05 (04 cũng dùng 02) |
| 04 dùng gì? | Chỉ số liệu từ 02 (ví dụ lợi nhuận không dùng chi phí 03) | Doanh thu 02 − Chi phí 03 |
| Stale | Đổi **tỷ lệ chi phí** làm 03 stale, **04 không** stale; 05 stale do 03/04 | Đổi tỷ lệ chi phí làm 03, 04, 05 stale (HTML hiện tại) |
| Công thức Lợi nhuận | Không còn "doanh thu − chi phí" của Phần 03 (phải định nghĩa lại cách tính lợi nhuận) | Giữ "doanh thu − chi phí" |
| Số phần phải chạy lại khi đổi tỷ lệ | 2 (03, 05) hoặc 03+05 | 3 (03, 04, 05) |

**Câu hỏi đơn giản cho người dùng:** "Con số lợi nhuận (Phần 04) có cần dùng số chi phí của Phần 03 không?" Nếu **có** ⇒ Phương án 2 (giữ như HTML, `stale()` không đổi). Nếu **không** ⇒ Phương án 1 và phải nêu công thức lợi nhuận mới. **Đề xuất mặc định:** Phương án 2, vì công thức hiện có "Lợi nhuận = Doanh thu − Chi phí" cần chi phí. Cho tới khi người dùng trả lời, Dev **không** đổi đồ thị phụ thuộc (B.1 dùng phụ thuộc hiện có).

## G. Tóm tắt phân tách
- **Hành vi quan sát [QS]:** prototype hiện stale theo giá trị, duyệt hàng loạt, Phần 01 không duyệt, số trang hằng số, build giả.
- **Yêu cầu đề xuất/chốt triển khai prototype [PROTO]:** B.1 (Q2), B.2 (Q4), B.3 (Q5).
- **Yêu cầu production [PROD]:** §C, §D–F.
- **Quyết định còn mở (sau vòng 4):** Q19 công thức Phần 04 (chưa xác nhận); thứ tự giai đoạn G1–G6 (Q1, §H.2); hệ quả Q15 [ĐX] chờ duyệt; kết quả spike Q10; Q12: thời gian lưu và phạm vi «Xóa sạch». Đã đóng vòng 4: Q16, Q18, Q6, Q20 («4/4»). Đã đóng ở vòng 2: Q7×Q6.

## H. Quyết định vòng 2 (2026-11-23)
Nguồn: người dùng xác nhận Q1, Q6/Q7, Q9 (phương án A), Q12, Q18, Q20. Tất cả mục dưới đây là yêu cầu/đề xuất; **không triển khai ngay** và không khẳng định prototype đã có.

### H.1 Q6/Q7 — Layout Diff chỉ cảnh báo, nhưng phân trang đổi thì thu hồi duyệt [ĐÃ CHỐT, PROD]
- Layout Diff **chỉ cảnh báo**, tự nó không chặn build.
- Khi phân trang của Section đổi (Content Diff rỗng, Layout Diff đổi) ⇒ phê duyệt Section **bị thu hồi** ⇒ Section về `Chờ duyệt` ⇒ **phải duyệt lại**.
- **Hệ quả build:** cổng build (02 §6) chặn build vì "chưa duyệt", không phải vì Layout Diff. Chuỗi: phân trang đổi → thu hồi duyệt → Section chưa duyệt → build bị chặn gián tiếp → duyệt lại → mở cổng. Lịch sử ghi lý do "Thay đổi phân trang".
- Phân biệt Content Diff / Layout Diff: 02 §3. Prototype không có phân trang theo Section nên không thu hồi được [QS]; số trang 12/13 chỉ là hằng số, không phải năng lực production.
- [Đã đóng vòng 4] Không có ngoại lệ chặn; lỗi layout nặng chỉ cảnh báo mạnh hơn (§H.13).

### H.2 Q1 — Chức năng thấy trong ảnh mockup đều cần có [ĐÃ CHỐT; PROD]
Các mục [ĐX] suy ra từ ảnh nay là **yêu cầu cần có**: chat chỉnh sửa tài liệu; nút "Xuất DOCX"; badge "N thay đổi chờ duyệt"; điều hướng trên (Trang chủ/Dự án/Mẫu tài liệu/Nguồn dữ liệu/Lịch sử); thư viện Rule (tìm kiếm, lọc trạng thái, "+ Tạo quy tắc", version/trạng thái từng Rule); tab Rule: Định nghĩa / Thực thi & Kiểm thử / Lịch sử phiên bản / Sử dụng; Data Binding theo sheet/cột và "+ Liên kết"; đồ thị phụ thuộc trên màn Recipe; bảng CR (nội dung, phạm vi, trạng thái, ngày giờ); lịch sử bản dựng + "So sánh hai bản dựng"; xem trước DOCX phân trang/zoom; "Kiểm tra bố cục"; panel "Ảnh hưởng". Ánh xạ FR: FR-20..FR-23 (01), 00 §4.

**Prototype HTML hiện CHƯA có** (không khẳng định đã có): chat, Xuất DOCX, tab Rule 4 mục, tìm/lọc/tạo Rule, version/trạng thái từng Rule, Data Binding sheet/cột, "+ Liên kết", đồ thị phụ thuộc ở màn Recipe, bảng CR đủ thuộc tính, so sánh hai bản dựng, xem trước phân trang thật, nav ngang. Khi ảnh và HTML lệch chi tiết (tên Rule, "v3.2" vs "v3", radio vs ô số…) vẫn là điểm quyết riêng.

**Đề xuất kế hoạch theo giai đoạn cho prototype [ĐX — chờ người dùng chốt thứ tự, chưa triển khai]:**
| Giai đoạn | Nội dung (dạng giao diện giả lập, gắn nhãn minh bạch FR-19) | Lý do thứ tự |
|---|---|---|
| G1 | Thư viện Rule: version + trạng thái từng Rule, tìm/lọc, "+ Tạo quy tắc" (Nháp), Rule Nháp bị khóa chạy/build; sửa tay version/trạng thái (§H.4) | Nền cho Q18/Q20, ít phụ thuộc |
| G2 | Tab Rule: Định nghĩa / Thực thi & Kiểm thử / Lịch sử phiên bản / Sử dụng | Phụ thuộc G1 |
| G3 | Data Binding sheet/cột + "+ Liên kết" nhiều nguồn (Excel/DOCX) + ví dụ tra cứu (§H.6) | Phụ thuộc G1 |
| G4 | Bảng CR đủ thuộc tính (Q21) + đồ thị phụ thuộc trên màn Recipe | Độc lập, dùng dữ liệu stale hiện có |
| G5 | Lịch sử bản dựng, "So sánh hai bản dựng", badge "N thay đổi chờ duyệt", nav ngang | Phụ thuộc G4 |
| G6 | Chat, "Xuất DOCX", xem trước phân trang/zoom, "Kiểm tra bố cục" | Chỉ làm giả lập UI; năng lực thật (AI, DOCX, render) là PROD, phụ thuộc Q10 |
Task cụ thể cho Dev/QA chỉ lập sau khi người dùng chốt thứ tự.

### H.3 Q12 — Lưu bền, ai cũng xem [ĐÃ CHỐT, PROD]
Lịch sử lưu bền; **ai cũng xem được; ứng dụng không phân quyền** (nhất quán Q5). **[MỞ nhỏ]:** thời gian lưu giữ chưa quy định. **Vòng 4 SỬA:** thêm quyền xóa — xem §H.14. Prototype vẫn mất dữ liệu khi tải lại (TC-51).

### H.4 Q18 — Sửa tay version/trạng thái Rule [ĐÃ CHỐT, PROD]
- **Vòng 4 [ĐÃ CHỐT] bổ sung:** xem §H.15 (version tay chỉ là nhãn; Nháp ⇒ stale + mất duyệt; đổi lại Đã duyệt không tự hết stale). Mục (c) bên dưới được giải quyết: đổi sang Nháp có tính là sự kiện stale.
- Sửa tay được; **Rule Nháp không được dùng để chạy/build** (xác nhận có; FR-20).
- Hệ quả [ĐX] khi sửa tay trạng thái: (a) Nháp→Đã duyệt: Rule mở khóa cho chạy/build mà có thể chưa kiểm thử ⇒ nên ghi audit (ai/khi nào/cũ→mới); (b) Đã duyệt→Nháp: Section dùng Rule đó không chạy/build được; build tương lai bị chặn tới khi duyệt lại; (c) đổi version tay: nếu coi là thay đổi Recipe thì Section phụ thuộc stale (như Q3) — [MỞ nhỏ] có tính là sự kiện stale không; (d) không đặt trùng version; không sửa ngược bản đã được Run/Build tham chiếu (C.8).

### H.5 Q9 — Chính sách chọn đơn giá [ĐÃ CHỐT phương án A; yêu cầu production [ĐX]]
**Quyết định của người dùng:** khi tra đơn giá gặp dòng **hòa** (cùng ngày hiệu lực) hoặc **thiếu dữ liệu** thì **DỪNG chạy Section đó**, hiện lỗi rõ nguyên nhân, **không ghi kết quả/Run** cho Section đó cho tới khi người dùng sửa dữ liệu. Nhiều dòng hợp lệ → chọn ngày hiệu lực **mới nhất**. Phương án B (cảnh báo rồi vẫn chạy) bị loại vì có thể ghi số sai vào tài liệu.

**Phân tách:**
- [QS] Prototype không tra giá thật: phép tính là JS cố định, không có dòng hòa/thiếu. Không khẳng định prototype có năng lực này.
- [ĐX/PROD] Mọi hành vi dưới đây là yêu cầu production. Prototype chỉ có thể (nếu sau này được yêu cầu) mô phỏng nhãn lỗi giả lập; **chưa triển khai**, không có task Dev.

**Hành vi yêu cầu:**
| Tình huống | Kết quả |
|---|---|
| Nhiều dòng hợp lệ, ngày khác nhau | Chọn dòng ngày hiệu lực mới nhất; evidence ghi nguồn/sheet/cột/dòng + ngày |
| Hòa (≥2 dòng cùng ngày hiệu lực mới nhất) | Dừng Section; lỗi nêu "đơn giá trùng ngày hiệu lực", khóa tra và các dòng trùng |
| Thiếu (không có dòng cho khóa tra, hoặc thiếu ngày/giá) | Dừng Section; lỗi nêu "thiếu đơn giá", khóa tra và nguồn |

**Tiêu chí chấp nhận (production, kiểm chứng được):**
1. Nhiều dòng hợp lệ → kết quả Section dùng đúng giá của ngày mới nhất.
2. Hòa → Section **không chạy**; thông báo lỗi nêu đúng nguyên nhân và dòng liên quan; **không tạo Run**, không ghi kết quả mới.
3. Thiếu → tương tự (2) với nguyên nhân "thiếu đơn giá".
4. Khi dừng, kết quả/duyệt của lần chạy hợp lệ trước (nếu có) không bị ghi đè bằng số đoán; sự kiện lỗi chỉ là bản ghi lỗi, không phải Run thành công.
5. **Tác động stale/cổng build:** Section dừng không có kết quả hợp lệ cho đầu vào hiện tại ⇒ giữ stale/chưa chạy, không duyệt được. Section **downstream** (theo đồ thị phụ thuộc, vd. 04 dùng 03) **không chạy được** vì thiếu đầu vào upstream hợp lệ. Cổng build (02 §6) **chặn build** (có Section stale/chưa duyệt); lý do chặn nêu rõ Section lỗi dữ liệu giá.
6. Sau khi người dùng sửa dữ liệu nguồn và chạy lại: Section chạy được, lỗi biến mất, downstream chạy được; stale/duyệt tiếp tục theo Q2/Q3/Q7.
7. Có test: nhiều dòng; hòa; thiếu; sửa dữ liệu rồi chạy lại; downstream bị chặn; chạy Single (Q8) vào Section lỗi cũng dừng như chạy tất cả.
8. Chính sách áp dụng cho cả tra cứu theo khóa x của Q20 (§H.6): x thiếu/trùng cùng ngày → dừng Section.

[MỞ nhỏ] (không chặn Q9): nội dung chữ thông báo lỗi chính xác; có cho "Chạy tiếp các Section không phụ thuộc Section lỗi" khi chạy tất cả (đề xuất [ĐX]: có, vì chúng không dùng đầu vào lỗi).

### H.6 Q20 — Nhiều nguồn dữ liệu, cách dùng do Rule định nghĩa [ĐÃ CHỐT, PROD]
- Thêm được **nhiều nguồn** (Excel/DOCX), **không giới hạn số nguồn** (nhất quán Q13).
- Cách dùng nguồn do **người dùng tự định nghĩa trong Rule**. Ví dụ: Section A có thông tin x, y ⇒ Rule lấy **y tham chiếu theo x** trong tài liệu nguồn (tra cứu khóa x → giá trị y). Ví dụ này thêm vào FR-22 (01).
- [Đã đóng vòng 4] «4/4» là số mock (§H.16); hành vi khi x không có hoặc trùng đã xác định theo Q9/H.5 (dừng chạy Section).

## H.7+ Quyết định vòng 3 (2026-11-23)

### H.7 Q10 — Giải pháp kỹ thuật DOCX [ĐÃ CHỐT, PROD]
- Chọn khuyến nghị §D.4: **P1** patch OOXML trên bản sao V0; **bộ định vị Section** (bookmark/content control) chỉ thêm vào **bản sao**, không sửa V0 (nhất quán 02 §2); **LibreOffice headless** làm engine render cho Layout Diff.
- Manifest và UI ghi «theo engine X phiên bản Y» (ví dụ LibreOffice + phiên bản + bộ font) để tái lập; số trang có thể lệch Word.
- **Spike** (PROD, chưa thực hiện): trên «Kế hoạch kinh doanh 2027.docx»: (a) patch 3 vùng, (b) so số trang LibreOffice với Word. AC: V0 không đổi hash; bản sao patch đúng 3 vùng; báo cáo chênh lệch trang.
- **Prototype vẫn KHÔNG tạo DOCX thật**; số trang 12/13 và manifest giả giữ nguyên. [MỞ nhỏ]: chọn thư viện theo ngôn ngữ backend.

### H.8 Q11 — Mã bản dựng [ĐÃ CHỐT phương án A, PROD]
Đếm tăng **theo từng dự án**, mã bất biến, **không tái dùng** (kể cả khi xóa), có trường mô tả tự do; hiển thị «B-028 · Rule v3 · Mẫu V0 (hash…)». Khác version Rule (Q17). Khi nói liên dự án phải kèm tên dự án. Prototype giữ đếm trong bộ nhớ từ B-027.

### H.9 Q15 — Đổi template của dự án có lịch sử [ĐÃ CHỐT: được phép; hệ quả [ĐX]]
Người dùng hỏi «có vấn đề gì?». Trả lời:
| # | Hệ quả | Trạng thái |
|---|---|---|
| 1 | Build cũ vẫn ghim hash V0 cũ trong manifest, giữ nguyên, truy vết được | [ĐX] |
| 2 | Section Revision đã duyệt trên mẫu cũ có thể không khớp vị trí/tên Section ở mẫu mới ⇒ cần **ánh xạ lại Section** (Section nào ↔ vùng nào) | [ĐX] |
| 3 | Mọi Section stale và hủy phê duyệt (nhất quán Q2/Q7); cổng build chặn tới khi duyệt lại | [ĐX] |
| 4 | Baseline Layout Diff đổi sang mẫu mới; không so phân trang xuyên mẫu | [ĐX] |
| 5 | Dự án có nhiều template trong lịch sử phải hiển thị rõ (mỗi build ghi mẫu/hash) | [ĐX] |
| 6 | Đề xuất: đổi mẫu = tạo Template mới (V1…), không sửa V0; hành động riêng, có xác nhận | [ĐX] |
Chỉ phần «được phép đổi» là quyết định của người dùng; 1–6 chờ duyệt. Prototype không có chức năng đổi template. [MỞ nhỏ]: ánh xạ Section thủ công hay gợi ý tự động.

### H.10 Q16 — «Chạy lại» khi nguồn Excel đổi phiên bản [ĐÃ CHỐT vòng 4]
- Người dùng **đồng ý đề xuất**: khi nguồn Excel đổi phiên bản, hệ thống **ĐÁNH DẤU stale** các Section dùng nguồn đó và **nêu lý do** (ví dụ «Nguồn X đổi v1→v2»); **KHÔNG tự chạy**; người dùng **tự bấm chạy lại**.
- Nhất quán Q2 (stale theo sự kiện thay đổi, không tự hết) và Q7 (Section bị ảnh hưởng mất phê duyệt, phải chạy + duyệt lại).
- Prototype không có upload nguồn nên không triển khai [QS].

### H.11 Q19 — Song song [ĐÃ CHỐT một phần; MỞ: công thức Phần 04]
- Người dùng chọn **song song**: 01→02→{03,04}→05.
- **MÂU THUẪN cần người dùng chốt:** công thức hiện tại Lợi nhuận = Doanh thu − Chi phí, Phần 04 dùng kết quả Phần 03. Nếu song song, 04 phải tính độc lập khỏi kết quả 03. [ĐX] ví dụ: **Lợi nhuận = Doanh thu × (1 − tỷ lệ chi phí)** — về mặt toán học cho kết quả số giống hệt Doanh thu − Doanh thu × tỷ lệ (chưa xét sai số làm tròn dấu phẩy động, [MỞ] làm tròn tiền tệ). Khi đó đổi tỷ lệ vẫn làm 03, 04, 05 stale vì 04 dùng tỷ lệ trực tiếp; đổi qty/đơn giá làm 02–05 stale.
- Chỉ khác về đồ thị: 03 và 04 không còn chuỗi; chạy 03 và 04 độc lập, 05 chờ cả hai.
- **Dev CHƯA đổi đồ thị phụ thuộc/`stale()` trong prototype** cho tới khi người dùng xác nhận công thức. Câu hỏi cho người dùng: «Đồng ý Lợi nhuận = Doanh thu × (1 − tỷ lệ chi phí) (cùng kết quả số) để Phần 04 độc lập với Phần 03 không?»

### H.12 Câu hỏi còn mở sau vòng 3
1. Q19: xác nhận công thức 04 (H.11) — chặn việc Dev đổi đồ thị.
2. ~~Q16 đánh dấu stale~~ — đã đóng vòng 4 (H.10).
3. Q15: duyệt các hệ quả [ĐX] 1–6 (H.9).
4. Q10: chọn thư viện; kết quả spike (H.7).
Các điểm nhỏ còn lại: thông báo lỗi Q9; thời gian lưu Q12. Danh sách cập nhật sau vòng 4: §H.17.

---

## H.13–H.17 Quyết định vòng 4 (2026-11-23)
Nguồn: người dùng xác nhận Q16, Q12, Q18, Q6, Q20. Mục dưới là yêu cầu/đề xuất; **không triển khai ngay**, không khẳng định prototype đã có.

### H.13 Q6 — Layout Diff luôn chỉ cảnh báo, không ngoại lệ [ĐÃ CHỐT, PROD]
- Không có ngoại lệ chặn build. Lỗi nặng (bảng tràn, trang trắng) được cảnh báo **mạnh hơn** (mức độ/nổi bật cao hơn) nhưng **không** tự chặn.
- Cổng build vẫn có thể chặn **gián tiếp** do thu hồi duyệt theo Q7 (§H.1). Phân biệt với Content Diff: 02 §3.
- Prototype không có Layout Diff thật; số trang 12/13 chỉ là hằng số, không phải năng lực production [QS].

### H.14 Q12 — Lịch sử lưu bền NHƯNG xóa được [ĐÃ CHỐT, SỬA đề xuất cũ; PROD]
**Quyết định của người dùng (khác đề xuất cũ «chỉ thêm, bất biến, không xóa»):** lịch sử được lưu bền, người dùng **được tự xóa từng bản ghi** và có chức năng **«Xóa sạch»** (xóa hết).
- **Nguyên tắc mới:** bản ghi **bất biến về nội dung** (không sửa) nhưng **xóa được**. Mọi chỗ ghi «append-only/không xóa» ở 00–03/07 đã được thay (FR-17, 03 §B mục 10, §C.4).
- **Hệ quả [ĐX] cần chốt:**
  1. Xóa từng bản ghi và «Xóa sạch» phải có **hộp xác nhận nêu rõ phạm vi** (loại, số bản ghi) và **không hoàn tác**.
  2. **Mã bản dựng đã xóa không tái dùng** (nhất quán Q11/§H.8).
  3. **Xóa bản dựng làm mất khả năng tái lập** của bản đó (và so sánh hai bản dựng liên quan); cần cảnh báo trong hộp xác nhận.
  4. **Ai cũng xóa được** vì không phân quyền (Q5/Q12) — rủi ro người này xóa dữ liệu người khác, chấp nhận theo quyết định.
  5. **[MỞ nhỏ]** Template V0 và nguồn dữ liệu có nằm trong «Xóa sạch» không? **Đề xuất [ĐX]:** «Xóa sạch» chỉ xóa lịch sử Run/CR/bản dựng; **không** xóa Template V0 (bất biến, 02 §2) và nguồn dữ liệu.
  6. Hệ quả phụ cần xác định [MỞ nhỏ]: xóa Run/duyệt mà Section hiện tại đang dựa vào thì trạng thái Section/stale ra sao; thời gian lưu (§H.3) còn hiệu lực hay không.
- Prototype **mất dữ liệu khi tải lại** và **chưa triển khai xóa** (TC-51).

### H.15 Q18 — Sửa tay version/trạng thái Rule [ĐÃ CHỐT bổ sung, PROD]
- Sửa **số version tay chỉ là nhãn**, **không được trùng** version cũ của cùng Rule.
- Đổi trạng thái Rule sang **Nháp** ⇒ các Section dùng Rule đó **stale** và **mất phê duyệt**.
- Đổi lại **Đã duyệt** **không tự hết stale**: phải **chạy lại và duyệt lại** (nhất quán Q2).
- Giữ điều kiện [ĐX] ở §C.8/§H.4 (audit; không sửa ngược bản đã được Run/Build tham chiếu; Rule Nháp không chạy/build).

### H.16 Q20 — «4/4» chỉ là số mock [ĐÃ CHỐT, PROD]
- Hệ thống đếm **liên kết hợp lệ / tổng liên kết thật**; không giới hạn số nguồn (Q13). Không có «tổng cố định 4».
- Prototype hiển thị số cố định là mock, không phải năng lực production [QS].

### H.17 Câu hỏi còn mở sau vòng 4
1. **Q19 [MỞ]:** song song đã chọn; công thức độc lập Lợi nhuận = Doanh thu × (1 − tỷ lệ chi phí) [ĐX] **CHƯA được người dùng xác nhận** (§H.11); Dev chưa đổi đồ thị.
2. **Thứ tự giai đoạn G1–G6 [MỞ]** chưa được xác nhận (§H.2).
3. **Q12 [MỞ nhỏ]:** phạm vi «Xóa sạch» (V0/nguồn — đề xuất không xóa), hệ quả xóa với trạng thái Section, thời gian lưu.
4. **Q15:** duyệt hệ quả [ĐX] 1–6 (§H.9).
5. **Q10:** chọn thư viện + kết quả spike (§H.7).
6. Thông báo lỗi Q9 (điểm nhỏ).
Đã đóng vòng 4: Q16, Q18, Q6 (không ngoại lệ), Q20 («4/4»).
