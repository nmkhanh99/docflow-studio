---
name: immutable-docx-patching
description: >-
  Xử lý mẫu DOCX bất biến (Template V0), ánh xạ Logical Section theo OOXML anchor, áp tập lệnh
  OOXML Patch bảo toàn định dạng và tách biệt Content Diff với Layout Diff. Đọc kỹ năng này khi
  thiết kế, lập trình hoặc kiểm thử bộ đọc/vá DOCX, preview trang và cổng xuất tài liệu.
---

# Xử lý Mẫu DOCX Bất biến & OOXML Patching

## 1. Nguyên tắc bất biến `Template V0`
- Khi nhập mẫu (`project.importTemplate`), tính mã băm `sha256` đầy đủ, lưu bản sao chỉ đọc tại `template/original.docx` kèm `template/template-sha256.txt` (`chmod 444` / read-only).
- Trước mọi phiên chạy hoặc dựng tài liệu, xác minh lại `sha256` của `template/original.docx` (báo lỗi `ARTIFACT_INTEGRITY_VIOLATION` nếu sai lệch).
- Khi preview hoặc xuất DOCX, **luôn clone `template/original.docx` sang bản làm việc mới** rồi mới áp tập Patch đã duyệt; cấm ghi đè trực tiếp lên `original.docx`.

## 2. Định vị theo đơn vị nghiệp vụ (`LogicalSection != Page`)
- **Cấm cắt nhỏ file DOCX theo trang** thành các file rời rồi ghép lại (tránh phá vỡ styles, numbering, header/footer, section breaks và TOC).
- Phân tích gói OOXML thành cây `DocumentBlock` (`paragraph`, `table`, `image`, `sdt`/bookmark) kèm `ooxmlLocator` và `anchorFingerprint`.
- Ánh xạ mỗi `LogicalSection` bằng `startAnchor` và `endAnchor`; phát hiện lệch cấu trúc qua `ANCHOR_DRIFT_OR_NOT_FOUND`.

## 3. Phép biến đổi OOXML nguyên tử & Bảo toàn định dạng
- Chỉ áp các lệnh Patch có kiểu trong đúng phạm vi `sectionId` được cấp quyền (`PATCH_OUT_OF_SECTION_SCOPE` nếu vượt ranh giới):
  `replaceText`, `replaceRuns`, `setCellValue`, `insertParagraphAfter`, `removeBlock`, `replaceTableRows`, `replaceImage`, `setStyle`.
- Bảo toàn thuộc tính định dạng gốc (`w:rPr`, `w:pPr`, `w:tblPr` và chuỗi kế thừa style) trên mọi block không sửa và cả khi thay văn bản trong run.
- Cập nhật lại trường động (fields, numbering, cross-references, TOC) trước khi chuyển qua Layout Engine kết xuất toàn tài liệu.

## 4. Tách biệt `Content Diff` và `Layout Diff`
- **Value / Content / Table Diff**: Phản ánh thay đổi số liệu, câu chữ hoặc hàng/ô bảng do `SectionRevision` tạo ra.
- **Layout Diff**: Phản ánh thay đổi phân trang vật lý sau khi render toàn tài liệu (`SHIFTED`, `SPLIT_CHANGED`, `OVERFLOW`, `EMPTY_PAGE`, `NO_CHANGE`) — ví dụ Section 03 dời trang do Section 01 dài thêm mà không hề đổi chữ.
- Kiểm tra `LayoutIssue` (tiêu đề mồ côi cuối trang, ngắt bảng xấu, tràn lề ngang, trang trắng dư, thiếu font) theo các chính sách `NATURAL_REFLOW`, `PRESERVE_TEMPLATE_BREAKS`, `STRICT_LAYOUT` (không tự ý thu nhỏ cỡ chữ ngầm).
