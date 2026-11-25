---
name: prototype-browser-verification
description: "Dùng trạng thái demo lặp lại được để kiểm tra trình duyệt"
---

Chạy python3 -m http.server 8000 --directory docs, mở DocFlow_Interactive_Mockup.html với view=workspace|recipe|runner|build|history. seed=ran tính phần bị ảnh hưởng; seed=approved tính, duyệt và build; long=1 mô phỏng nội dung dài. Tải lại trang giữa các kịch bản vì state nằm trong bộ nhớ. Kiểm tra mốc 900px và 1350px. Xuất manifest ra JSON, không phải DOCX. Ghi lại URL, thao tác, kỳ vọng, thực tế và công cụ không có. Công cụ chạy và artifact sinh ra thuộc tác vụ write.
