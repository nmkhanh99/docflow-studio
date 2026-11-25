---
name: typed-rule-and-provenance
description: >-
  Biên dịch quy tắc nghiệp vụ ngôn ngữ tự nhiên sang kế hoạch thực thi có kiểu (Typed Rule IR),
  liên kết Source Snapshot kèm truy vết nguồn gốc (provenance), chặn dữ liệu mơ hồ và thực thi
  tất định trong sandbox. Đọc kỹ năng này khi xây dựng hoặc kiểm thử Recipe Studio, Data Binding và Rule Executor.
---

# Biên dịch Typed Rule IR, Provenance & Thực thi Sandbox

## 1. Source Snapshot & Data Binding có truy vết
- Mọi file Excel, CSV, DOCX, PDF tham chiếu khi nhập vào dự án được cố định bằng `sha256` tại `sources/<sourceId>/<sha256>/source.<ext>` ở chế độ chỉ đọc.
- Khai báo rõ `DataDefinition` (kiểu dữ liệu, đơn vị tiền tệ/khối lượng, quy tắc làm tròn) và `DataBinding` (`sourceId`, `sha256`, sheet, `rangeSelector`, `lookupSpec`, thời điểm hiệu lực).

## 2. Cấu trúc 4 bước của Typed Rule IR (Cấm `eval()`)
Mỗi `SavedRule` biên dịch lời mô tả tự nhiên sang kế hoạch có kiểu gồm 4 bước tách biệt:
1. **Data Extraction**: Đọc giá trị từ `SourceArtifact` đã ghim kèm tọa độ dòng/cột/trang.
2. **Relational Transformations**: Lọc (`filter`), kết nối (`join`), chọn bản ghi theo ngày hiệu lực, gom nhóm (`group`/`aggregate`).
3. **Deterministic Calculations**: Biểu thức số học kiểm tra chặt kiểu và đơn vị tính, sử dụng kiểu số thập phân chính xác `Decimal` cho tiền tệ/tỷ lệ.
4. **Narrative Transformations**: AI (`Section Writer`) chỉ soạn lại câu nhận xét dựa trên `outputs` đã tính xong — **cấm LLM tự nhẩm tính con số**.
- **Cấm tuyệt đối** dùng `eval()`, `new Function()`, chạy script tùy ý ngoài hộp cát hoặc kích hoạt macro VBA/Office.

## 3. Dừng an toàn trước dữ liệu thiếu hoặc mơ hồ (`Safe Defaults`)
- Nếu thiếu sheet, cột khóa hoặc dòng thỏa điều kiện: dừng bước tính và trả mã lỗi `SOURCE_DATA_MISSING` kèm tọa độ cụ thể.
- Nếu có từ 2 dòng trở lên thỏa điều kiện và trùng ngày hiệu lực mới nhất (hoặc xung đột với giá trị override của người dùng): dừng bước tính với mã `SOURCE_LOOKUP_AMBIGUOUS`, liệt kê các dòng xung đột để người dùng chọn — **tuyệt đối không tự chọn bừa**.

## 4. Thực thi Sandbox & Bằng chứng kiểm toán (`Evidence`)
- Sandbox chạy tất định cục bộ, giới hạn thời gian (`SANDBOX_EXECUTION_TIMEOUT`) và bộ nhớ, không mở kết nối mạng, chỉ đọc các snapshot trong danh sách cho phép.
- Mỗi bước thực thi xuất `RunStep` chứa `inputHashes`, `outputHash`, `resultFingerprint` và `evidence` (dòng Excel khớp, giá trị trung gian, kiểm tra đơn vị) lưu vào `runs/<runId>/evidence.json`.
