# Implementation Roadmap - ClowCat Patronus

Cập nhật: 11/07/2026

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
- [x] Bài viết liên quan ưu tiên bài chưa xem và không reload toàn trang khi bấm.
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
- [x] Chuyển CSS riêng của blog khỏi HTML vào stylesheet dùng chung.
- [x] Kiểm tra lazy loading ảnh feedback/blog.
- [x] Preload hero WebP và giữ kích thước logo để giảm layout shift.
- [x] Thêm sanitizer cục bộ dự phòng, không render HTML thô khi CDN DOMPurify lỗi.
- [x] Tách dữ liệu blog khỏi payload landing để landing không tải nội dung bài viết không dùng.
- [x] Tách nội dung chi tiết bài blog, chỉ tải `contentHtml` khi khách mở bài.
- [x] Cache riêng danh sách blog và từng bài, có giới hạn kích thước và xóa cache khi admin cập nhật.
- [x] Hiển thị kích thước landing/blog trong health check để phát hiện payload vượt ngưỡng cache.
- [x] Thêm timeout/retry cho blog và giữ nội dung cache khi refresh nền thất bại.
- [x] Đồng bộ version cache landing/blog để deploy mới không phục vụ payload cũ.

Xác minh:

- [ ] Không tràn ngang mobile.
- [ ] Ảnh chính render đúng.
- [x] Không tải script landing/admin không dùng trên blog.

## Sprint 3.5 - Sao lưu Google Sheet và Apps Script

Mục tiêu:

- Quản trị viên có thể tạo bản sao lưu ngay trong admin và biết lần backup gần nhất có thành công hay không.
- Google Sheet và source của hai Apps Script được sao lưu định kỳ vào một thư mục Google Drive riêng.
- Có quy trình khôi phục đã được kiểm tra, không chỉ tạo file backup để đó.

Giả định và giới hạn:

- Web App tiếp tục chạy dưới tài khoản chủ sở hữu có quyền đọc Sheet, hai Apps Script và thư mục backup.
- Bản sao Google Sheet không thay thế backup source Apps Script; hai loại được lưu riêng trong cùng một phiên backup.
- Không ghi giá trị Script Properties như `SEPAY_WEBHOOK_SECRET` vào Drive. Chỉ lưu danh sách tên property và trạng thái có/thiếu.
- Sao lưu source Apps Script cần bật Apps Script API và cấp quyền phù hợp; triển khai sau khi backup Sheet hoạt động ổn định.

Việc làm:

- [x] Tạo thư mục Drive chuyên dụng và lưu ID bằng Script Property `BACKUP_FOLDER_ID`.
- [x] Thêm sheet `Backup log` với thời gian, loại backup, file ID/URL, dung lượng, trạng thái và thông báo lỗi.
- [x] Thêm endpoint admin-only `createBackup`, không cho tài khoản editor thường gọi.
- [x] Thêm nút `Sao lưu` trong admin, có trạng thái đang chạy, kết quả gần nhất và liên kết mở bản backup.
- [x] Sao lưu Google Sheet bằng bản copy có tên chứa ngày giờ và timezone Việt Nam.
- [x] Thêm khóa chống chạy trùng và giới hạn tần suất thao tác thủ công.
- [x] Thêm luồng phục hồi bản gần nhất, xác nhận bắt buộc và tự tạo bản an toàn trước khi ghi đè.
- [x] Tạo time-driven trigger chạy tự động hằng tuần và hiển thị trạng thái lịch trong admin.
- [ ] Bật Apps Script API và xuất source project content/admin cùng booking thành file JSON trong mỗi phiên backup.
- [x] Áp dụng retention đơn giản: giữ 12 bản tự động gần nhất, không tự xóa bản được đánh dấu giữ lại.
- [x] Thêm health check cho thư mục backup, trigger, lần chạy gần nhất và lỗi backup gần nhất.
- [ ] Viết tài liệu khôi phục Sheet, source Apps Script, deployment URL và Script Properties.

Xác minh:

- [x] Bấm `Sao lưu` trong admin tạo đúng một phiên backup và ghi log vận hành.
- [ ] Editor không thể gọi endpoint backup hoặc xem URL file backup.
- [x] Phục hồi thử một bản backup; phục hồi đủ 7 sheet và có bản `pre_restore` để hoàn tác.
- [ ] Trigger tự động tạo backup khi không mở admin.
- [ ] Source backup chứa đủ file của cả hai Apps Script nhưng không chứa secret.
- [ ] Giả lập lỗi quyền Drive trả thông báo rõ trong admin và ghi log.
- [ ] Khôi phục thử sang một Sheet/project test, chạy health check đạt trước khi đánh dấu hoàn thành.

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
3. Triển khai Sprint 3.5 theo hai bước: backup Sheet trước, backup source Apps Script sau.
4. Chỉ bắt đầu Sprint 4 khi landing/admin/booking và quy trình backup đã ổn định.
