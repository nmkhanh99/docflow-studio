---
name: immutable-docx-patching
description: "Xử lý mẫu DOCX bất biến, ánh xạ Logical Section, áp OOXML patch bảo toàn định dạng và phân biệt Content Diff với Layout Diff; dùng khi phân tích, thiết kế, lập trình hoặc kiểm thử luồng tài liệu và kết xuất preview/build."
---

## Mục đích
Đảm bảo xử lý tài liệu DOCX tuân thủ nguyên tắc mẫu gốc bất biến (Immutable Template), định vị theo đơn vị nghiệp vụ (Logical Section) thay vì cắt ghép theo trang, và tách biệt rõ thay đổi nội dung với thay đổi bố cục trang.

## Nguyên tắc cốt lõi
1. **Mẫu gốc bất biến (Immutable Template V0)**:
   - Tính và cố định mã băm `sha256` ngay khi import file mẫu; file gốc chỉ đọc, tuyệt đối không ghi đè.
   - Mọi thao tác dựng tài liệu phải clone từ bản gốc rồi mới áp tập Patch đã duyệt.
2. **Logical Section độc lập với trang (`Section != Page`)**:
   - Không cắt file DOCX thành từng file rời theo trang để nối lại vì sẽ làm hỏng styles, numbering, section break, header/footer và mục lục (TOC).
   - Parse cấu trúc OOXML thành cây block (`DocumentBlock`: đoạn, bảng, hình, SDT/bookmark) và ánh xạ `LogicalSection` qua `startAnchor` / `endAnchor` kèm fingerprint phát hiện lệch cấu trúc (drift).
3. **Áp Patch có kiểm soát**:
   - Chỉ sử dụng các phép biến đổi nguyên tử trong phạm vi Section được cấp quyền: `replaceText`, `replaceRuns`, `setCellValue`, `insertParagraphAfter`, `removeBlock`, `replaceTableRows`, `replaceImage`, `setStyle`.
   - Bảo toàn thuộc tính định dạng gốc (`rPr`, `pPr`, `tblPr` và style kế thừa) trừ khi quy tắc yêu cầu đổi định dạng tường minh.
   - Cập nhật lại fields, numbering, cross-references và TOC trước khi render toàn bộ tài liệu.
4. **Phân biệt các loại Diff và kiểm tra Layout**:
   - **Value / Content / Table Diff**: thay đổi số liệu, câu chữ hoặc ô/hàng bảng do Section Revision tạo ra.
   - **Layout Diff**: thay đổi vị trí trang (ví dụ Section bị đẩy sang trang kế tiếp do phần trước dài ra) mà không sửa chữ — gắn nhãn dịch trang, không báo nhầm là sửa nội dung.
   - **Layout Issues**: phát hiện tiêu đề mồ côi cuối trang (`keep-with-next`), tách hàng bảng bất hợp lý, tràn lề ngang, trang trắng dư hoặc lỗi mất font; hỗ trợ các chính sách `NATURAL_REFLOW`, `PRESERVE_TEMPLATE_BREAKS`, `STRICT_LAYOUT` (không tự ý thu nhỏ font ngầm).
