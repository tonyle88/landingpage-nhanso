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
const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';  // ← BẮT BUỘC điền để Web App gửi email + ghi log
const OWNER_EMAIL    = 'PASTE_YOUR_GMAIL_HERE';        // ← Gmail của bạn nhận thông báo
```

> **Quan trọng:** `testSendEmails` chạy trong editor vẫn OK khi chưa điền `SPREADSHEET_ID`, nhưng khi khách đặt lịch qua website thì **phải điền `SPREADSHEET_ID`** để script truy cập đúng Sheet và gửi email.

**Cách lấy SPREADSHEET_ID:**
Mở Google Sheet → xem URL trên thanh địa chỉ:
```
https://docs.google.com/spreadsheets/d/  **ĐÂY_LÀ_ID_CỦA_BẠN**  /edit
```

### Bước 4 – Cấp quyền cho Calendar và Gmail
1. Trong Apps Script, chọn hàm **`testSendEmails`** → nhấn **Chạy**
2. Google sẽ yêu cầu cấp quyền → **Xem xét quyền → Tiếp tục → Cho phép**
3. Kiểm tra hộp thư Gmail của bạn có email `[TEST] Email dat lich Nhan So Hoc` không

> ⚠️ Cần cấp quyền: **Google Calendar** và **Gmail** để tạo lịch và gửi email tự động.

### Bước 5 – Triển khai lại (Deploy) — QUAN TRỌNG CHO EMAIL
1. Nhấn **Triển khai → Quản lý bản triển khai**
2. Nhấn biểu tượng **bút chì (Chỉnh sửa)**
3. Đặt đúng 2 mục sau:
   - **Thực thi với tư cách:** `Tôi` (Me) ← bắt buộc để gửi email cho khách
   - **Ai có quyền truy cập:** `Bất kỳ ai` (Anyone)
4. Đổi **Phiên bản** sang **Phiên bản mới**
5. Nhấn **Triển khai**
6. Copy URL mới nếu URL thay đổi và cập nhật vào `script.js` dòng đầu:
   ```javascript
   const GOOGLE_SCRIPT_URL = 'URL_MỚI_CỦA_BẠN';
   ```

> Nếu chọn **Thực thi với tư cách: Người truy cập ứng dụng web** thì Sheet vẫn lưu được nhưng **email sẽ không gửi được**.

---

## Tính Năng Mới Sau Khi Cập Nhật

| Tính năng | Mô tả |
|-----------|-------|
| 📅 Google Calendar | Tự động tạo lịch hẹn khi khách đặt lịch thành công |
| 📊 Google Sheet | Lưu đầy đủ thông tin khách + lịch hẹn + số tiền |
| 📧 Email khách | Gửi email xác nhận đẹp mắt cho khách hàng |
| 🔔 Email chủ | Gửi thông báo nhanh cho bạn mỗi khi có đặt lịch mới |
| 🔒 Chống trùng lịch | Lịch đã đặt sẽ không hiển thị cho khách tiếp theo |
| 💰 Giá theo hình thức | Tự động lưu đúng giá Online/Offline vào Sheet, Calendar, Email |

---

## Cấu Trúc Cột Google Sheet

Sau khi cập nhật, dòng tiêu đề (hàng 1) sẽ là:

| Cột | Tên cột |
|-----|---------|
| A | Ngày giờ Việt Nam |
| B | Họ và tên |
| C | Ngày sinh |
| D | Số điện thoại / Zalo |
| E | Email |
| F | Hình thức |
| G | Gói tư vấn |
| H | Lịch hẹn |
| I | Số tiền (định dạng **số**, ví dụ `500000`) |
| J | Lời nhắn |
| K | Mã gói (`year` / `big3` / `big7`) |
| L | Email khách |
| M | Email chủ |
| N | Nội dung chuyển khoản (`YEAR 090...` / `BIG3 090...` / `BIG7 090...`) |

> Cột A–J giữ nguyên vị trí như Sheet cũ (cột **Khoá học** đổi tên thành **Gói tư vấn**). Cột **Nội dung chuyển khoản** dùng để đối soát QR theo mã gói + số điện thoại khách.

### Tính tổng doanh thu

Cột **Số tiền** (cột I) lưu giá trị số thuần để dùng `SUM`, `SUMIF`, `SUMIFS`:

```
=SUM(I:I)
```

Ví dụ tổng doanh thu **tháng hiện tại** (cột A lưu dạng `dd/MM/yyyy HH:mm:ss`):

```
=SUM(FILTER(I2:I, REGEXMATCH(A2:A, "/"&TEXT(TODAY(),"MM/YYYY")&" ")))
```

> Dòng cũ từng lưu dạng `500.000đ` sẽ được Apps Script tự chuyển sang số khi có đơn mới hoặc khi script chạy lại.

---

## Bảng Giá Theo Hình Thức

| Gói | Online | Offline |
|-----|--------|---------|
| Dự Đoán Năm Cá Nhân | 500.000 vnđ/buổi | 550.000 vnđ/buổi |
| Phân Tích 3 Chỉ Số Tính Cách | 1.000.000 vnđ/buổi | 1.050.000 vnđ/buổi |
| Phân Tích Toàn Diện | 2.000.000 vnđ/buổi | 2.000.000 vnđ/buổi |

Phí xăng xe 50.000đ chỉ áp dụng cho các gói offline dưới 2.000.000đ. Gói Phân Tích Toàn Diện offline không cộng phụ phí này.

Apps Script sẽ tự kiểm tra `consultationType` + `package` từ form và lưu đúng giá, kể cả khi dữ liệu gửi lên bị sai.

---

## Lưu Ý

- **CALENDAR_ID = 'primary'** → dùng Google Calendar chính của tài khoản Gmail bạn đang dùng cho Apps Script
- Nếu muốn dùng lịch riêng, vào Google Calendar → Cài đặt lịch đó → Copy **ID lịch** và dán vào `CALENDAR_ID`
- Mã VietQR được tạo tự động, không cần làm gì thêm
- **`SHEET_NAME`** phải trùng **đúng tên tab** trong Google Sheet (mặc định: `Dang ky tu van`)

---

## Không Nhận Được Email?

1. **Điền `SPREADSHEET_ID`** trong `google-apps-script.gs` (lấy từ URL Google Sheet)
2. Triển khai Web App: **Thực thi với tư cách = Tôi** → **Phiên bản mới**
3. Mở link kiểm tra phiên bản (thay URL script của bạn):
   ```
   https://script.google.com/macros/s/.../exec?action=version
   ```
   Phải thấy `scriptVersion: 2026-06-08-v5`
4. Chạy **`testSendEmails`** rồi **`testCustomerEmail`** trong Apps Script
5. Sau khi khách đặt lịch, xem cột **L (Email khách)** và **M (Email chủ)** — hiện `DA GUI` hoặc `LOI: ...`
6. Tab **`Email log`** cũng ghi chi tiết (tự tạo sau đơn mới)
7. Kiểm tra **Spam / Quảng cáo**

---

## Không Thấy Dòng Mới Trong Sheet?

1. **Triển khai lại Apps Script** (Phiên bản mới) sau khi dán mã mới
2. Kiểm tra tên tab Sheet có khớp `SHEET_NAME` trong `google-apps-script.gs` không
3. Vào Apps Script → **Thực thi** → chọn hàm `repairSheetFormats` → **Chạy** để sửa định dạng cột
4. Mở **Triển khai → Nhật ký thực thi** xem có lỗi Calendar/Email không (lỗi này không còn chặn lưu Sheet)
5. Website gửi **2 bước**: `POST` lưu Sheet → `GET completeBooking` gửi email + Calendar (bước GET chạy đủ, có phản hồi)

### Kiểm tra nhanh trong Apps Script

Chạy hàm `testSaveRow()` trong editor để thử ghi 1 dòng test vào Sheet.
