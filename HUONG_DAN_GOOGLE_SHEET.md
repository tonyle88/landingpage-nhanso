# Hướng Dẫn Cập Nhật Google Apps Script (Phiên Bản Mới)

## Các Bước Thực Hiện

### Bước 1 – Mở Google Apps Script
1. Mở Google Sheet của bạn
2. Nhấn **Tiện ích mở rộng → Apps Script**

### Bước 2 – Dán mã mới
1. Xóa toàn bộ mã cũ trong editor
2. Copy toàn bộ nội dung file **`google-apps-script.gs`** (trong thư mục này)
3. Dán vào editor và **lưu lại (Ctrl+S)**

### Bước 3 – Điền thông tin của bạn vào 2 dòng đầu
Tìm 2 dòng này ở đầu file và điền vào:

```javascript
const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';  // ← ID của Google Sheet
const OWNER_EMAIL    = 'PASTE_YOUR_GMAIL_HERE';        // ← Gmail của bạn
```

**Cách lấy SPREADSHEET_ID:**
Mở Google Sheet → xem URL trên thanh địa chỉ:
```
https://docs.google.com/spreadsheets/d/  **ĐÂY_LÀ_ID_CỦA_BẠN**  /edit
```

### Bước 4 – Cấp quyền cho Calendar và Gmail
Lần đầu chạy, Google sẽ yêu cầu cấp quyền. Nhấn **Xem xét quyền → Tiếp tục → Cho phép**.

> ⚠️ Cần cấp quyền: **Google Calendar** và **Gmail** để tạo lịch và gửi email tự động.

### Bước 5 – Triển khai lại (Deploy)
1. Nhấn **Triển khai → Quản lý bản triển khai**
2. Nhấn biểu tượng **bút chì (Chỉnh sửa)**
3. Đổi **Phiên bản** sang **Phiên bản mới**
4. Nhấn **Triển khai**
5. Copy URL mới nếu URL thay đổi và cập nhật vào `script.js` dòng đầu:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'URL_MỚI_CỦA_BẠN';
   ```

---

## Tính Năng Mới Sau Khi Cập Nhật

| Tính năng | Mô tả |
|-----------|-------|
| 📅 Google Calendar | Tự động tạo lịch hẹn khi khách đặt lịch thành công |
| 📊 Google Sheet | Lưu đầy đủ thông tin khách + lịch hẹn + số tiền |
| 📧 Email khách | Gửi email xác nhận đẹp mắt cho khách hàng |
| 🔔 Email chủ | Gửi thông báo nhanh cho bạn mỗi khi có đặt lịch mới |
| 🔒 Chống trùng lịch | Lịch đã đặt sẽ không hiển thị cho khách tiếp theo |

---

## Lưu Ý

- **CALENDAR_ID = 'primary'** → dùng Google Calendar chính của tài khoản Gmail bạn đang dùng cho Apps Script
- Nếu muốn dùng lịch riêng, vào Google Calendar → Cài đặt lịch đó → Copy **ID lịch** và dán vào `CALENDAR_ID`
- Mã VietQR được tạo tự động, không cần làm gì thêm
