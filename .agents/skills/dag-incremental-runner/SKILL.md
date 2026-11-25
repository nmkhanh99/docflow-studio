---
name: dag-incremental-runner
description: >-
  Thiết kế và kiểm chứng đồ thị phụ thuộc có hướng không chu trình (DAG), lan truyền trạng thái STALE,
  3 chế độ chạy (Selected, Affected, Full), bộ nhớ đệm theo resultFingerprint và cổng kiểm duyệt Build Gate.
  Đọc kỹ năng này khi phát triển hoặc kiểm thử Dependency Engine, Runner và luồng khóa BuildManifest.
---

# Đồ thị phụ thuộc DAG, Tái tính toán tăng dần & Cổng Build

## 1. Đồ thị phụ thuộc và chống chu trình
- Mô hình hóa các đỉnh (`SOURCE`, `VALUE`, `RULE`, `SECTION`, `BUILD`) và cạnh có hướng (`USES`, `PRODUCES`, `REFERENCES`, `REWRITES`).
- Kiểm tra chu trình ngay khi tạo/lưu `SavedRule` hoặc `DependencyEdge`; nếu xuất hiện vòng lặp (`A -> B -> A`), từ chối lưu với mã lỗi `DEPENDENCY_CYCLE_DETECTED`.

## 2. Sáu nhóm trạng thái vòng đời tách biệt
Không bao giờ gộp chung trạng thái tính toán, phê duyệt nội dung và bố cục trang:
1. **Rule**: `DRAFT` | `VALIDATED` | `APPROVED` | `DEPRECATED`
2. **Input / Binding**: `READY` | `MISSING` | `AMBIGUOUS` | `CHANGED`
3. **Calculation Result**: `NOT_RUN` | `STALE` | `RUNNING` | `FAILED` | `RESULT_READY` | `APPROVED`
4. **Section Revision**: `DRAFT` | `REVIEW_REQUIRED` | `APPROVED` | `SUPERSEDED`
5. **Document Build**: `BLOCKED` | `BUILDING` | `RENDERED` | `LAYOUT_REVIEW` | `APPROVED` | `EXPORTED`
6. **Layout Difference**: `SHIFTED` | `SPLIT_CHANGED` | `OVERFLOW` | `EMPTY_PAGE` | `NO_CHANGE`

Khi một nguồn dữ liệu, biến đầu vào hoặc Rule đổi phiên bản, duyệt bao đóng bắc cầu xuôi dòng (transitive downstream) để gán `STALE` cho các kết quả phụ thuộc; giữ nguyên các `SectionRevision` cũ trong lịch sử nhưng không cho phép dùng chúng cho bản dựng mới.

## 3. Ba chế độ thực thi & Bộ nhớ đệm `resultFingerprint`
- **`SELECTED` (Phần đang chọn)**: Chỉ chạy đúng `sectionId` được chọn. Nếu phần đầu vào phía trước (upstream) đang `STALE`, chặn thực thi với `UPSTREAM_SECTION_STALE` (hoặc yêu cầu chạy kèm upstream). Các phần hạ nguồn vẫn giữ `STALE`.
- **`AFFECTED` (Phần bị ảnh hưởng)**: Tìm bao đóng bắc cầu bị ảnh hưởng, sắp xếp theo thứ tự topological và tận dụng cache khi `resultFingerprint = SHA256(ruleId, ruleVersion, executorVersion, normalizedInputValues, sourceSnapshotHashes, validationPolicy)` không đổi.
- **`FULL` (Toàn bộ tài liệu)**: Thực thi lại toàn bộ các Rule theo thứ tự topological trên các snapshot đã ghim, sinh bản ghi `Run` và `evidence` mới (không tạo `Content Diff` giả nếu giá trị và văn bản thực tế không đổi).

## 4. Cổng kiểm soát chất lượng Build (`Build Gate`)
- Khóa nút xuất và trả lỗi tương ứng nếu còn phần bắt buộc đang `STALE` (`BUILD_BLOCKED_STALE_RESULTS`), còn bản sửa chưa được người dùng duyệt (`BUILD_BLOCKED_UNAPPROVED_REVISIONS`), hoặc còn lỗi bố cục nghiêm trọng cần xác nhận theo chính sách (`BUILD_BLOCKED_LAYOUT_GATE`).
- `BuildManifest` phải ghim cứng `templateHash`, `sourceSnapshotIds`, `recipeVersion`, `ruleVersions`, `selectedRevisions`, `layoutPolicy` và `rendererInfo` để đảm bảo tái dựng chính xác 100%.
