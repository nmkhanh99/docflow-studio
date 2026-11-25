---
name: task-breakdown
description: "Phân tích yêu cầu và tách thành danh sách task rõ ràng cho các agent; dùng khi lập kế hoạch hoặc nhận task được giao."
---

## Mục đích
Biến một yêu cầu thành các task nhỏ, độc lập, kiểm chứng được để Main giao cho từng agent.

## Các bước phân tích
1. Đọc yêu cầu và phần mã/tài liệu liên quan trong docs/DocFlow_Interactive_Mockup.html; tách hành vi hiện có khỏi yêu cầu mới.
2. Liệt kê giả định và quyết định còn mở; hỏi lại Main nếu thiếu thông tin quan trọng.
3. Chia việc thành các task nhỏ, mỗi task một mục tiêu; tránh task chồng lấn cùng vùng mã.
4. Xác định phụ thuộc và thứ tự giữa các task; đánh dấu task có thể chạy song song.
5. Với mỗi task Dev luôn có ít nhất một task QA tương ứng.

## Mẫu một task
- **ID**: T1, T2, ...
- **Agent**: ba | dev | qa
- **Mục tiêu**: một câu rõ ràng
- **Phạm vi**: file/khu vực/hàm liên quan; điều không được đụng tới
- **Tiêu chí chấp nhận**: danh sách kiểm tra được (kèm URL/seed nếu cần)
- **Phụ thuộc**: task phải xong trước
- **Ghi chú/rủi ro**

## Đầu ra
Ghi danh sách task vào docs/ bằng tiếng Việt, kèm thứ tự thực hiện và tóm tắt ngắn cho Main. Không sửa mã nguồn khi đang phân tích. Khi nhận task, xác nhận hiểu phạm vi và báo kết quả theo từng tiêu chí chấp nhận.
