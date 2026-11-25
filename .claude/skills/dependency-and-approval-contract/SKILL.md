---
name: dependency-and-approval-contract
description: "Theo dõi tính lại, phê duyệt và điều kiện build giữa các section"
---

Section 02 doanh thu = số lượng x đơn giá x phiên bản rule; Section 03 chi phí từ doanh thu và tỷ lệ; Section 04 lợi nhuận từ doanh thu và chi phí; Section 05 kết luận từ lợi nhuận. Xác minh stale lan truyền bắc cầu, chặn chạy đơn lẻ khi upstream stale, chạy phần bị ảnh hưởng, ép chạy toàn bộ. Kết quả tính lại cần phê duyệt. Build yêu cầu 0 stale và 0 chờ duyệt. Đổi input, lưu recipe, chạy, đổi mô phỏng layout đều vô hiệu build hiện tại. Phân biệt hành vi hiện tại với hợp đồng mới được yêu cầu.
