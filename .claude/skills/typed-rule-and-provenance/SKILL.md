---
name: typed-rule-and-provenance
description: "Biên dịch quy tắc ngôn ngữ tự nhiên thành kế hoạch thực thi có kiểu (Typed IR), gắn kết nguồn Excel/tham chiếu với provenance, phát hiện mơ hồ và chạy sandbox an toàn; dùng khi đặc tả, xây dựng hoặc kiểm thử Rule Studio và bộ tính toán."
---

## Mục đích
Chuẩn hóa quy trình chuyển đổi yêu cầu tính toán/chỉnh sửa bằng ngôn ngữ tự nhiên thành kế hoạch thực thi có kiểu (Typed IR), gắn kết dữ liệu nguồn có truy vết (provenance) và thực thi an toàn trong sandbox.

## Quy trình chuyển đổi và kiểm soát
1. **Data Binding & Source Snapshot**:
   - Mọi nguồn dữ liệu (Excel, CSV, DOCX/PDF tham chiếu) phải được chốt phiên bản bằng `sha256` snapshot trước khi chạy.
   - Định nghĩa rõ `DataBinding`: file nguồn, sheet, vùng/cột khóa, kiểu dữ liệu, đơn vị tính (đồng/nghìn/triệu/tỷ), quy tắc làm tròn và thời điểm hiệu lực.
2. **Biên dịch Rule thành IR có kiểu (Không dùng `eval`)**:
   - Phân tách quy tắc thành 4 bước rõ ràng: (1) *Data extraction* (trích xuất có dẫn chứng ô/dòng), (2) *Relational transformations* (filter, join, chọn bản ghi theo ngày hiệu lực, group/aggregate), (3) *Calculations* (biểu thức kiểm tra kiểu và đơn vị), (4) *Narrative transformations* (AI soạn lại câu nhận xét dựa trên con số đã tính xong — LLM không tự nhẩm tính tiền).
   - Tuyệt đối không dùng `eval()` trực tiếp trên chuỗi biểu thức hoặc chạy macro trong file Office.
3. **Phát hiện mơ hồ và an toàn mặc định (Safe Defaults)**:
   - Khi gặp dữ liệu thiếu, trùng nhiều bản ghi cùng ngày hiệu lực, lệch đơn vị tính hoặc xung đột với giá trị người dùng đã override: phải dừng và nêu rõ vị trí (file, sheet, dòng, các phương án chọn) để xin xác nhận, không tự ý chọn bừa hay bịa số.
4. **Thực thi Sandbox & Provenance**:
   - Bộ thực thi chạy trong môi trường cô lập (giới hạn thời gian/tài nguyên, chỉ đọc các snapshot nguồn trong allowlist, không mở mạng mặc định).
   - Mỗi lần chạy phải xuất `RunStep` kèm bằng chứng (`evidence`: dòng Excel đã khớp, giá trị trung gian, công thức, mã kiểm tra hợp lệ) phục vụ kiểm toán.
