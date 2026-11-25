---
name: task-breakdown
description: >-
  Phân tích yêu cầu nghiệp vụ hoặc kỹ thuật và tách thành danh sách task độc lập, có tiêu chí
  chấp nhận kiểm chứng được cho các vai trò ba, dev và qa. Đọc kỹ năng này khi lập kế hoạch
  triển khai hoặc khi đối chiếu phạm vi của một task được giao.
---

# Phân rã Công việc (Task Breakdown)

## Các bước thực hiện
1. Đọc kỹ yêu cầu, đặc tả (`docs/DOCFLOW_STUDIO_SPEC.md`, `docs/09_...`, `docs/10_...`) và phân biệt rõ hành vi hiện có trên Prototype với năng lực cần xây dựng trong `app/`.
2. Liệt kê các giả định và quyết định còn mở (`L-xx`, `K-xx`); hỏi làm rõ nếu thiếu thông tin trọng yếu.
3. Chia thành các task nhỏ, mỗi task một mục tiêu rõ ràng, không chồng lấn vùng tệp chỉnh sửa cùng lúc.
4. Xác định thứ tự phụ thuộc giữa các task (task nào chặn task nào, task nào chạy song song được).
5. Đảm bảo mỗi bước triển khai kỹ thuật của `dev` đều có bước kiểm thử/nghiệm thu tương ứng của `qa`.

## Khuôn mẫu một Task chuẩn
- **Mã & Tiêu đề**: Ngắn gọn, nêu rõ kết quả đầu ra.
- **Vai trò thực hiện**: `ba` | `dev` | `qa`.
- **Phạm vi & Ràng buộc an toàn**: Các thư mục/tệp được phép tạo/sửa và danh sách tệp bất biến không được chạm tới.
- **Tiêu chí chấp nhận**: Danh sách điều kiện kiểm chứng cụ thể (lệnh kiểm tra, mã lỗi kỳ vọng, dữ liệu mẫu).
