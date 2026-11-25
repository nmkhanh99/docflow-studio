---
name: dag-incremental-runner
description: "Thiết kế và kiểm chứng đồ thị phụ thuộc DAG, 3 chế độ chạy (Selected, Affected, Full), fingerprint cache và máy trạng thái phê duyệt/cổng build; dùng khi xây dựng hoặc kiểm thử Dependency Engine và luồng Build Snapshot."
---

## Mục đích
Quản lý đồ thị phụ thuộc (DAG), tái tính toán tăng dần theo phạm vi, bộ nhớ đệm theo fingerprint và máy trạng thái tách biệt giữa kết quả tính toán, phê duyệt nội dung và bản dựng tài liệu.

## Quy tắc vận hành
1. **Đồ thị phụ thuộc và kiểm tra chu trình**:
   - Mô hình hóa các đỉnh (`SOURCE`, `VALUE`, `RULE`, `SECTION`, `BUILD`) và cạnh quan hệ (`USES`, `PRODUCES`, `REFERENCES`, `REWRITES`).
   - Phát hiện vòng lặp phụ thuộc (`A -> B -> A`) ngay khi lưu Rule; từ chối lưu hoặc yêu cầu điểm dừng tường minh.
2. **Tách biệt vòng đời trạng thái**:
   - Tách riêng trạng thái của: `Rule` (DRAFT/VALIDATED/APPROVED/DEPRECATED), `Calculation Result` (NOT_RUN/STALE/RUNNING/FAILED/RESULT_READY/APPROVED), `Section Revision` (DRAFT/REVIEW_REQUIRED/APPROVED/SUPERSEDED) và `Document Build` (BLOCKED/BUILDING/RENDERED/LAYOUT_REVIEW/APPROVED/EXPORTED).
   - Khi đầu vào hoặc Rule đổi, chỉ đánh dấu `STALE` theo bao đóng bắc cầu xuôi dòng (transitive downstream), không xóa Revision đã duyệt cũ nhưng vô hiệu hóa quyền dùng nó cho Build mới.
3. **Ba chế độ chạy & Fingerprint Cache**:
   - **Selected Section**: chỉ chạy Section đang chọn; chặn hoặc cảnh báo rõ nếu có upstream đang `STALE`; các downstream bị ảnh hưởng vẫn giữ trạng thái `STALE`.
   - **Affected**: tìm bao đóng bắc cầu bị ảnh hưởng, sắp xếp theo thứ tự topological và tái sử dụng cache nếu `resultFingerprint = HASH(ruleId, ruleVersion, executorVersion, normalizedInputValues, sourceSnapshotHashes, validationPolicy)` không đổi.
   - **Full**: chạy lại toàn bộ các Rule trên snapshot đã ghim, sinh `Run` mới và log bằng chứng mới ngay cả khi giá trị đầu ra trùng khớp (tránh tạo Content Diff giả nếu nội dung thực tế không đổi).
4. **Cổng chất lượng Build (Build Gate)**:
   - Chỉ cho phép xuất tài liệu chính thức khi mọi Section bắt buộc không còn `STALE`, mọi Revision được chọn trong `BuildManifest` đã `APPROVED`, và không có lỗi bố cục nghiêm trọng chưa được xác nhận override có lưu vết.
