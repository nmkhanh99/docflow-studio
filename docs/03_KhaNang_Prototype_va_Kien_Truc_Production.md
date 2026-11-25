# 03 — Khả năng prototype và kiến trúc production đề xuất

## A. Khả năng THỰC SỰ của prototype (quan sát được)

Prototype là **một file HTML tĩnh** (CSS + JS nội tuyến, ~51 KB), chạy hoàn toàn trên trình duyệt, không máy chủ, không thư viện ngoài.

| Chủ đề | Thực tế |
|---|---|
| Dữ liệu | Hằng số trong JS (qty 12.000, đơn giá 250.000, tỷ lệ 65%); mất khi tải lại trang. Không đọc DOCX/Excel. |
| Trạng thái | Đối tượng `state` trong bộ nhớ; `render()` dựng lại toàn bộ HTML; URL chỉ lưu `view` qua `history.replaceState`. |
| Tính toán | Nhân/trừ cố định (`eval2..eval5`). Văn bản Recipe và JSON schema chỉ để hiển thị; **không** được diễn giải hay thi hành. |
| Stale / duyệt / cổng build | Logic thật nhưng đơn giản, so sánh giá trị trong bộ nhớ (xem 02 §5–6). Q2 đã chốt stale theo sự kiện — Prototype V2 sẽ đổi (07 §B.1); vẫn là mô phỏng trong bộ nhớ, không phải kiểm soát production. Đây là hành vi mô phỏng nghiệp vụ, không phải kiểm soát an toàn. |
| Preview | Bố cục HTML minh họa; chữ "Trang 2 / 12" là hằng số (12 hoặc 13 theo hộp "dài"). **Không phân trang thật, không render từ DOCX.** |
| Content/Layout Diff | Chỉ nhãn + ô mô tả; hai tab không có xử lý. Không có diff thật. |
| Build | Tạo bản ghi trong bộ nhớ, trạng thái "Preview demo". **Không tạo file DOCX.** |
| Manifest | Tải được JSON giả (`Blob`) có nhãn "Mockup-only — not a DOCX file". |
| Change Request/History | Mảng trong bộ nhớ; không bền vững, không người dùng, không phân quyền. |
| AI | Không có. Thông báo tự thừa nhận "demo vẫn dùng executor cố định". |
| Bảo mật | Dùng `esc()` khi chèn văn bản người dùng vào HTML ở các điểm quan sát; chưa đánh giá toàn diện. Không có xác thực. |
| Chat/Xuất DOCX | Xuất hiện trong ảnh 01/04 nhưng **không** có trong HTML. |
| Màn Recipe so với ảnh 02 | HTML chỉ có: thư viện 5 Rule (tên), textarea mô tả, JSON schema tĩnh, 5 bước hiển thị, nút lưu tăng `ruleV`. **Không có** trong HTML (chỉ có trong ảnh 02): version/trạng thái từng Rule, tìm kiếm/lọc/tạo Rule, tab Thực thi & Kiểm thử/Lịch sử phiên bản/Sử dụng, khối `execution`, đồ thị phụ thuộc trên màn Recipe, Data Binding theo sheet/cột, nguồn .docx thứ ba, xem trước DOCX, lịch sử bản dựng v2.x, bảng CR có trạng thái. |
| Đồ thị phụ thuộc | Hình chuỗi tuyến tính ở Runner; `stale()` là hàm cố định theo Section, không đọc `dependsOn` từ Rule. JSON `dependsOn` hiển thị không được thi hành. |
| Phụ thuộc trong ảnh 02 | Ảnh vẽ 03/04 song song; HTML không như vậy — ảnh không chứng minh có phân tích phụ thuộc thật. |

**Kết luận:** Không được trích prototype làm bằng chứng cho khả năng sinh DOCX, phân trang, AI biên dịch quy tắc, lưu bền hay hiệu năng.

## B. Kiến trúc production đề xuất [ĐX — chưa quyết định]

Mọi mục dưới đây là đề xuất để thảo luận, không phải hiện trạng. Công nghệ: **[ĐÃ CHỐT Q10, PROD]** P1 patch OOXML bản sao V0 + bộ định vị Section thêm vào bản sao + LibreOffice headless làm engine render (`07` §D.4, §H.7). Prototype vẫn không tạo DOCX thật.

### B1. Thành phần
1. **Kho tài sản bất biến:** lưu Template V0 và snapshot nguồn Excel theo mã băm nội dung.
2. **Dịch vụ phân tích nguồn:** đọc DOCX (cấu trúc Section/đoạn/bảng/ký hiệu vị trí) và Excel (sheet/range/dòng), lưu evidence nguồn đã chọn.
3. **Dịch vụ Recipe:** lưu Rule có version bất biến; AI chỉ *đề xuất* kế hoạch thực thi; kế hoạch phải được kiểm thử và duyệt trước khi dùng.
4. **Bộ thực thi (executor) an toàn:** chạy kế hoạch đã duyệt trong sandbox, đầu ra xác định, ghi dấu vân tay đầu vào/đầu ra, lỗi.
5. **Bộ theo dõi phụ thuộc:** đồ thị Section→Section/nguồn, đánh stale theo dấu vân tay, hỗ trợ chạy Single/Affected/Full.
6. **Luồng phê duyệt:** theo Section Revision, vai trò, nhật ký.
7. **Bộ dựng tài liệu:** sao chép V0, áp Patch đã duyệt lên bản sao, xuất DOCX, ghi Build Manifest.
8. **Render & kiểm tra layout:** dựng PDF/ảnh từ **chính DOCX đầu ra** để có số trang thật; kiểm tra bảng tràn, hàng bị tách, trang trắng, heading, mục lục, header/footer, số trang, font (danh sách từ ô "Validation thật cần có").
9. **Dịch vụ diff:** Content Diff từ cây nội dung; Layout Diff từ kết quả render.
10. **Lịch sử/audit:** bản ghi bất biến về nội dung (không sửa) cho CR, Recipe, Run, duyệt, Build; [ĐÃ CHỐT Q12 sửa vòng 4] người dùng được xóa từng bản ghi và «Xóa sạch» (xác nhận rõ phạm vi, không hoàn tác; mã bản dựng đã xóa không tái dùng; Template V0/nguồn không bị «Xóa sạch» — [MỞ nhỏ], đề xuất). Không còn nguyên tắc append-only/không xóa.

### B2. Mô hình dữ liệu tối thiểu
Project · Template(hash) · SourceSnapshot · Section · RecipeVersion · Rule · ChangeRequest · Run(fingerprints, outputs, evidence, errors) · SectionRevision(status, approvedBy) · Build(manifest, outputHash) · AuditEvent.

### B3. Nguyên tắc
- Tái lập: build = f(V0 hash, recipe version, source snapshots, revisions đã duyệt).
- Không ghi đè V0; không sửa bản ghi lịch sử.
- Không build khi stale hoặc chưa duyệt; Layout validation lỗi nghiêm trọng chặn xuất [MỞ nhỏ]; Q6 [ĐÃ CHỐT, vòng 4: không ngoại lệ; lỗi nặng cảnh báo mạnh hơn]: Layout Diff chỉ cảnh báo, không chặn build; Q7 [ĐÃ CHỐT]: thu hồi duyệt khi chỉ phân trang đổi ⇒ phải duyệt lại ⇒ build bị chặn gián tiếp vì chưa duyệt (07 §H.1).
- AI không tự thi hành thay đổi chưa duyệt.
- Ghi rõ tỷ lệ/độ chính xác số học (làm tròn tiền tệ) [MỞ].

### B4. Quyết định còn mở của kiến trúc
Q10 công cụ tạo/patch DOCX và engine render [ĐÃ CHỐT]; còn mở: chọn thư viện theo ngôn ngữ backend, kết quả spike; Q12 lưu bền [ĐÃ CHỐT, sửa vòng 4: được xóa từng bản ghi + «Xóa sạch»], ai cũng xem/xóa, không phân quyền (thời gian lưu và phạm vi «Xóa sạch» [MỞ nhỏ]); Q16 [ĐÃ CHỐT]: nguồn đổi phiên bản ⇒ stale + nêu lý do, không tự chạy; Q13 không giới hạn quy mô [ĐÃ CHỐT]; mô hình quyền: Q5 [ĐÃ CHỐT] không có vai trò; xử lý đa người dùng đồng thời (chưa nêu trong prototype); mô hình AI và chính sách dữ liệu; hiệu năng mục tiêu (chưa có số liệu); lộ trình chuyển từ prototype.

### B5. Khoảng cách prototype → production
| Năng lực | Prototype | Production |
|---|---|---|
| Đọc DOCX/Excel | Không | Bắt buộc |
| Sinh DOCX | Không | Bắt buộc |
| Số trang | Hằng 12/13 | Từ render thật |
| Diff | Nhãn | Thật |
| Thực thi Rule | JS cố định | Executor đã duyệt |
| Lưu bền | Không | Bắt buộc |
| Phê duyệt | Nút hàng loạt (V2: duyệt từng Section + duyệt tất cả, gồm Phần 01) | Theo Section, không vai trò (Q5); thu hồi khi phân trang đổi (Q7) |
| Version/trạng thái Rule | Một `ruleV` chung | Mỗi Rule có version bất biến và vòng đời Nháp→Đã duyệt (gợi ý từ ảnh 02) [ĐÃ CHỐT Q18: cho phép sửa tay, version tay chỉ là nhãn không trùng version cũ; Rule Nháp không chạy/build; đổi sang Nháp ⇒ Section dùng stale + mất duyệt; đổi lại Đã duyệt không tự hết stale] |
| Thực thi & Kiểm thử Rule | Không | Kế hoạch `execution` đã biên dịch, test, duyệt trước khi dùng |
| Data Binding | Nhãn | Lưu nguồn/sheet/cột/snapshot, kiểm tra tồn tại; nhiều nguồn Excel/DOCX không giới hạn; cách dùng định nghĩa trong Rule (vd tra y theo x); đếm liên kết hợp lệ / tổng liên kết thật («4/4» chỉ là mock) — Q20 |

### B6. Chức năng từ ảnh mockup (Q1 vòng 2)
Mọi chức năng thấy trong ảnh (chat, Xuất DOCX, tab Rule 4 mục, Data Binding sheet/cột, đồ thị phụ thuộc, bảng CR…) là yêu cầu cần có. Prototype hiện chưa có chúng; kế hoạch G1–G6 (đề xuất, chưa triển khai) ở `07` §H.2.
