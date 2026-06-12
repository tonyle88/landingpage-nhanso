# Admin Landing Page

Trang quản trị nằm tại:

```text
http://localhost:8080/admin/
```

Hoặc khi upload hosting, mở:

```text
/admin/
```

## Tài khoản mặc định

Sau khi deploy lại `google-apps-script-landing-content.gs`, hệ thống sẽ tự tạo tab `Admin users` trong Google Sheet nếu chưa có.

```text
User: admin
Password: admin123
```

Đăng nhập lần đầu xong hãy đổi mật khẩu ngay trong nút `Mật khẩu`.

## Cần deploy Apps Script

Để admin lưu được nội dung vào Google Sheet:

1. Mở Apps Script của Content Sheet.
2. Dán toàn bộ nội dung mới từ file `google-apps-script-landing-content.gs`.
3. Save.
4. Deploy lại Web App.
5. Giữ URL Web App hiện tại nếu Google cho cập nhật deployment cũ.
6. Chạy hàm `repairAdminUserDateFormats` một lần nếu muốn format lại ngày giờ các user đã có sẵn.

Admin đang dùng endpoint trong `admin/app.js`:

```javascript
const ADMIN_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec';
```

Nếu deploy ra URL mới, thay URL ở dòng này.

Lưu ý: không dán `google-apps-script-booking.gs` hoặc `google-apps-script.gs` vào Web App URL của admin. Nếu admin báo lỗi tìm sheet `Dang ky tu van`, nghĩa là URL admin đang trỏ nhầm sang script đặt lịch.

Ngày giờ trong tab `Admin users` được format theo giờ Việt Nam:

```text
dd/MM/yyyy HH:mm:ss
```

## Khi giao diện bị lệch

Upload lại đủ 3 file:

```text
admin/index.html
admin/style.css
admin/app.js
```

Sau đó mở lại:

```text
https://ten-mien-cua-ban/admin/
```

Nếu trình duyệt còn giữ bản cũ, hard refresh bằng `Cmd + Shift + R` trên Mac hoặc `Ctrl + F5` trên Windows.

## Vai trò user

- `admin`: chỉnh nội dung, đồng bộ template, tạo và khóa user.
- `editor`: chỉnh nội dung và đổi mật khẩu của chính mình.

Nội dung sau khi lưu sẽ ghi vào tab `Landing content`, cột `Bật` và `Nội dung`.
