# Nhân Số ClowCat Patronus - Tài Liệu Dự Án Hiện Hành

Cập nhật: 09/07/2026

Tài liệu này là nguồn tham chiếu vận hành cho repo hiện tại. Các kế hoạch/audit cũ chỉ dùng để tham khảo, không dùng làm schema chính nếu khác nội dung dưới đây.

## 1. Tổng quan hệ thống

Dự án hiện là static frontend kết hợp Google Apps Script:

| Vùng | File chính | Backend | Dữ liệu |
| --- | --- | --- | --- |
| Landing page | `index.html`, `script.js`, `style.css` | `google-apps-script-landing-content.gs` | Landing content, Packages, Feedback images, Payment settings, Sections layout |
| Blog/Giải mã | `blog.html`, `blog.js` | `google-apps-script-landing-content.gs` | Blog Categories, Blog Articles |
| Admin | `admin/index.html`, `admin/app.js`, `admin/blog_admin.js`, `admin/style.css` | `google-apps-script-landing-content.gs` | Admin users, Audit log, các sheet nội dung |
| Booking/thanh toán | form trong `index.html`, logic trong `script.js` | `google-apps-script-booking.gs` | Dang ky tu van, Email log, Error log, SePay payments |

Nguyên tắc vận hành:

- Admin chỉ ghi dữ liệu qua Apps Script content.
- Landing/blog chỉ đọc dữ liệu public qua `getLandingContent`.
- Booking/payment dùng Apps Script booking riêng.
- Secret thật phải nằm trong Script Properties, không hardcode trong code.
- Google Sheet hiện là database vận hành; MySQL/shared hosting là hướng migration sau khi hệ hiện tại ổn.

## 2. File quan trọng

Frontend:

```text
index.html
style.css
script.js
blog.html
blog.js
```

Admin:

```text
admin/index.html
admin/style.css
admin/app.js
admin/blog_admin.js
```

Apps Script:

```text
google-apps-script-landing-content.gs
google-apps-script-booking.gs
```

PDF workflow riêng:

```text
Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md
```

## 3. Endpoint và Sheet ID

Content/admin Web App URL đang được dùng trong:

```text
script.js
blog.js
admin/app.js
```

Booking Web App URL đang được dùng trong:

```text
script.js
```

Sheet ID trong code hiện tại:

```text
Content/admin sheet:
1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k

Booking sheet:
1KO6b5v9WPbYg2cJv25EM-ZN-tyjXfYJF3ZK7iKB3Bkc
```

Khi deploy mới, phải cập nhật đồng bộ các URL/ID trên. Không trỏ admin vào booking script.

## 4. Google Sheet schema

### Content/admin spreadsheet

Các tab chính:

```text
Landing content
Packages
Feedback images
Payment settings
Sections layout
Blog Categories
Blog Articles
Admin users
Audit log
```

Header chuẩn:

```text
Landing content:
Bật | Khóa | Section | Mô tả | Selector | Kiểu | Thuộc tính | Nội dung

Packages:
Bật | Mã gói | Tên gói | Giá online | Giá offline | Đơn vị | Icon | Màu nhấn | Nổi bật | Badge | Quyền lợi | Nút | Thứ tự

Feedback images:
Ngày tạo | Tên file | URL | File ID | Người upload

Payment settings:
Khóa | Nội dung | Mô tả

Sections layout:
Bật | ID | Loại | Tên hiển thị | Thứ tự | Tiêu đề | Thẻ phụ | Nội dung HTML

Blog Categories:
Mã chủ đề | Tên chủ đề | Thứ tự

Blog Articles:
Bật | ID | Mã chủ đề | Tiêu đề | Nội dung HTML | Ngày đăng | Đính lên trên | Thumbnail | Tóm tắt

Admin users:
Bật | Tên đăng nhập | Tên hiển thị | Vai trò | Muối | Mật khẩu hash | Ngày tạo | Ngày cập nhật | Lần đăng nhập cuối

Audit log:
Timestamp | Action | Status | Username | Role | Target type | Target ID | Message
```

### Booking/payment spreadsheet

Các tab chính:

```text
Dang ky tu van
Email log
Error log
SePay payments
```

Header booking:

```text
Ngày giờ Việt Nam | Họ và tên | Ngày sinh | Số điện thoại / Zalo | Email | Hình thức | Gói tư vấn | Lịch hẹn | Số tiền | Lời nhắn | Mã gói | Email khách | Email chủ | Nội dung chuyển khoản
```

## 5. Script Properties

Content/admin Apps Script:

```text
IMGBB_API_KEY
SEPAY_SECRET_KEY
```

Booking/payment Apps Script:

```text
SEPAY_WEBHOOK_SECRET
```

Ghi chú:

- `IMGBB_API_KEY` dùng cho upload ảnh; nếu thiếu, code fallback Google Drive.
- `SEPAY_SECRET_KEY` dùng cho cấu hình SePay phía admin/content.
- `SEPAY_WEBHOOK_SECRET` bắt buộc khi dùng webhook SePay.
- Không lưu password, token, webhook secret hoặc API key thật trong code.

## 6. API chính

### `google-apps-script-landing-content.gs`

Public read:

```text
GET action=getLandingContent
GET action=version
```

Admin/write:

```text
loginAdmin
logoutAdmin
getAdminContent
saveLandingContentItem
saveLandingContentBatch
changeAdminPassword
listAdminUsers
createAdminUser
setAdminUserStatus
syncLandingContentTemplate
savePackage
savePackageOrder
deletePackage
savePaymentSettings
uploadFeedbackImage
uploadImage
saveFeedbackImage
deleteFeedbackImage
saveSectionsLayoutOrder
saveGenericSection
deleteSection
saveBlogCategory
deleteBlogCategory
saveBlogArticle
deleteBlogArticle
healthCheck
```

### `google-apps-script-booking.gs`

Booking/payment:

```text
GET action=getBookedSlots
GET action=version
GET action=completeBooking
GET action=checkSepayPayment
GET action=bookingHealthCheck
POST action=saveBooking
POST action=finalizeBooking
POST action=logClientError
POST action=sepayWebhook
```

## 7. Admin vận hành

Các nhóm chỉnh sửa chính:

- `Landing content`: sửa text/html/config của từng phần.
- `Tra Cứu Thử`: sửa luận giải và từ khóa theo loại chỉ số/số.
- `Packages`: thêm/sửa/xóa/sắp xếp gói tư vấn.
- `Thanh toán`: chỉnh QR thủ công, SePay và thời gian chờ.
- `Ảnh Feedback`: upload/xóa ảnh, phân trang khi nhiều ảnh.
- `Cấu trúc trang`: bật/tắt/sắp xếp section có sẵn, thêm generic section.
- `Blog`: quản lý chủ đề và bài viết.
- `User`: tạo/khóa user admin/editor.
- `Kiểm tra`: kiểm tra content/admin sheet và cấu hình bắt buộc.
- `Booking`: kiểm tra booking sheet, email/error log, SePay payments, calendar và `SEPAY_WEBHOOK_SECRET`.

Vai trò:

- `admin`: chỉnh toàn bộ nội dung, cấu hình thanh toán, user, section.
- `editor`: chỉnh nội dung được phép và đổi mật khẩu cá nhân.

## 8. Deploy checklist

1. Deploy `google-apps-script-landing-content.gs`.
2. Deploy `google-apps-script-booking.gs`.
3. Cập nhật URL Apps Script trong `script.js`, `blog.js`, `admin/app.js` nếu URL đổi.
4. Cấu hình Script Properties.
5. Upload đủ file static lên hosting.
6. Đăng nhập admin.
7. Chạy health check content/admin.
8. Chạy booking health check.
9. Sửa thử một nội dung landing, lưu và reload trang chủ.
10. Upload thử một ảnh feedback, kiểm tra ảnh mới lên đầu ở admin và landing.
11. Tạo thử một bài blog, kiểm tra danh sách và trang chi tiết.
12. Test booking khi SePay tắt.
13. Test booking khi SePay bật.
14. Kiểm tra `Audit log`, `Email log`, `Error log`, `SePay payments`.

## 9. QA checklist

Backend:

- [ ] `healthCheck` trả `ok: true`.
- [ ] `bookingHealthCheck` trả `ok: true`.
- [ ] Các sheet bắt buộc có đúng header.
- [ ] `Audit log` ghi thao tác admin quan trọng.
- [ ] `Email log` ghi kết quả gửi email.
- [ ] `Error log` không có lỗi mới bất thường.

Landing/admin:

- [ ] Nội dung landing sửa trong admin thì cập nhật ngoài trang chủ.
- [ ] Section hiển thị đúng theo `Sections layout`.
- [ ] Gói tư vấn sửa trong admin thì bảng giá và form booking cập nhật.
- [ ] Feedback mới nhất hiển thị trước.
- [ ] Blog list/detail hiển thị đúng ảnh, HTML nội dung và trạng thái ghim.
- [ ] Tra cứu thử tính đúng các case đã chốt.
- [ ] Mobile không tràn ngang hoặc đè chữ ở các section chính.

Booking:

- [ ] Form bắt lỗi khi thiếu tên/phone/email.
- [ ] Chọn online/offline thì dropdown gói lọc đúng.
- [ ] QR thủ công hoạt động khi SePay tắt.
- [ ] SePay bật thì trạng thái thanh toán được polling/webhook xác nhận.
- [ ] Sheet booking có đủ mã đơn, số tiền, trạng thái và nội dung chuyển khoản.
- [ ] Email khách và email chủ trang gửi đúng flow.

## 10. Cache và hiệu năng

- Landing có cache localStorage phía client và cache Apps Script phía server.
- Sau khi admin lưu nội dung quan trọng, Apps Script phải clear cache public.
- Khi đổi logic render dữ liệu, cần bump cache key/cache buster JS.
- Blog dùng `blog.js` riêng để không tải thừa logic booking.
- Ảnh feedback nên tối ưu kích thước trước khi upload nếu dung lượng quá lớn.

## 11. Hướng migration MySQL sau này

Không migration ngay khi còn đang chỉnh tính năng. Hướng an toàn:

1. Giữ frontend hiện tại.
2. Viết API PHP/MySQL trả JSON cùng shape với `getLandingContent`.
3. Tạo bảng MySQL tương ứng với các sheet hiện tại.
4. Export Google Sheet sang CSV và import vào MySQL.
5. Chạy song song Apps Script và PHP API để so sánh payload.
6. Khi khớp, đổi URL trong frontend/admin.
7. Sau cùng mới tắt dần Apps Script content, còn booking có thể migration riêng.

## 12. Tài liệu liên quan

```text
IMPLEMENTATION_ROADMAP.md
SECURITY_UPGRADE_NOTES.md
SEPAY_SETUP.md
admin/README.md
Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md
```
