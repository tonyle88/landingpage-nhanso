# Implementation Roadmap - ClowCat Patronus

Cập nhật: 09/07/2026

Roadmap này bám theo repo hiện tại sau khi rà soát. Mục tiêu là triển khai từng bước nhỏ, dễ kiểm chứng, không refactor lớn khi chưa cần.

## Nguyên tắc triển khai

- Mỗi sprint phải có tiêu chí xác minh rõ.
- Chỉ sửa đúng phần phục vụ mục tiêu sprint.
- Ưu tiên ổn định hệ Apps Script + Google Sheet trước khi migration MySQL.
- Không thêm tính năng lớn nếu chưa đóng QA các tính năng đã có.

## Sprint 0 - Đồng bộ tài liệu và nguồn sự thật

Mục tiêu:

- `PROJECT_DOCUMENTATION.md` phản ánh đúng repo thật.
- File/sheet/API không còn dùng tên legacy gây nhầm.

Việc làm:

- [x] Chuẩn hóa file thật: `blog.html`, `google-apps-script-booking.gs`.
- [x] Chuẩn hóa sheet thật: `Sections layout`, `Blog Categories`, `Blog Articles`.
- [x] Ghi rõ Sheet ID và endpoint đang dùng.
- [x] Tách roadmap khỏi tài liệu vận hành.

Xác minh:

- [ ] Người triển khai đọc tài liệu là biết deploy đúng 2 Apps Script.
- [ ] Không trỏ nhầm admin vào booking script.

## Sprint 1 - Hardening vận hành

Mục tiêu:

- Có health check để phát hiện thiếu sheet/property trước khi lỗi ra landing.
- Có audit log cho thao tác admin quan trọng.
- SePay webhook không còn fallback secret trong code.

Việc làm:

- [x] Thêm `healthCheck` cho content/admin Apps Script.
- [x] Thêm `bookingHealthCheck` cho booking Apps Script.
- [x] Thêm `Audit log` cho các thao tác write admin.
- [x] Bắt buộc `SEPAY_WEBHOOK_SECRET` qua Script Properties.
- [x] Cập nhật admin UI để gọi content/admin health check.
- [x] Cập nhật admin UI để gọi booking health check.

Xác minh:

- [ ] Content health trả `ok: true` khi đủ sheet.
- [ ] Booking health trả `ok: true` khi đủ sheet/calendar/secret.
- [ ] Admin thao tác lưu tạo dòng trong `Audit log`.
- [ ] Thiếu `SEPAY_WEBHOOK_SECRET` thì health báo lỗi rõ.

## Sprint 2 - QA đóng tính năng đã có

Mục tiêu:

- Các tính năng admin/landing/blog/feedback/mini report đang có được khóa bằng checklist test.

Việc làm:

- [x] Feedback mới nhất đứng đầu ở admin và landing.
- [x] Blog search chỉ lọc tiêu đề.
- [x] Blog theo chủ đề có carousel khi > 3 bài.
- [x] Mini report có bộ case kiểm tra công thức.
- [x] Section layout bật/tắt/sắp xếp đúng.
- [x] Generic section không phá layout mobile.

Xác minh:

- [ ] Test desktop/mobile các section chính.
- [x] `node --check` pass cho JS/GAS.
- [ ] Không có lỗi console nghiêm trọng khi load landing/blog/admin.

## Sprint 3 - Tối ưu nội dung và hiệu năng

Mục tiêu:

- Landing tải nhanh và ổn định hơn trên shared hosting.

Việc làm:

- [x] Rà kích thước ảnh lớn trong `assets/images`.
- [x] Bump cache-buster có chủ đích khi đổi CSS/JS.
- [ ] Giảm inline CSS trùng lặp ở blog nếu cần.
- [x] Kiểm tra lazy loading ảnh feedback/blog.

Xác minh:

- [ ] Không tràn ngang mobile.
- [ ] Ảnh chính render đúng.
- [ ] Không tải script không dùng trên blog.

## Sprint 4 - Chuẩn bị migration MySQL/shared hosting

Mục tiêu:

- Có đường chuyển đổi nhưng không làm gãy hệ Apps Script đang chạy.

Việc làm:

- [ ] Thiết kế schema MySQL tương ứng các sheet hiện tại.
- [ ] Viết API PHP trả JSON cùng shape với `getLandingContent`.
- [ ] Export/import CSV từ Google Sheet.
- [ ] Chạy song song Apps Script và PHP API để diff payload.
- [ ] Chuyển từng endpoint theo cờ cấu hình.

Xác minh:

- [ ] Payload PHP tương thích frontend hiện tại.
- [ ] Admin auth/upload/payment có phương án riêng trước khi cắt Apps Script.

## Ưu tiên hiện tại

1. Hoàn tất Sprint 1.
2. QA Sprint 2.
3. Chỉ bắt đầu Sprint 4 khi landing/admin/booking đã ổn định.
