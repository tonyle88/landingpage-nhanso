# Huong Dan Nhanh: Google Sheet Cho Landing Page

Dung cho cac du an co cung khung:

- Website co form dat lich, QR thanh toan, email xac nhan.
- Noi dung landing page va gia goi duoc sua bang Google Sheet.
- Gia goi phai dong bo giua website, QR, Sheet booking, Calendar va email.

## 1. So Do Chuan

Moi du an nen tach 2 Google Sheet:

| Sheet | Dung de lam gi | File script |
| --- | --- | --- |
| Booking Sheet | Luu khach, tao Calendar, gui email | `google-apps-script-booking.gs` |
| Content Sheet | Sua noi dung landing page va gia goi | `google-apps-script-landing-content.gs` |

Website dung 2 URL Web App trong `script.js`:

```javascript
const BOOKING_SCRIPT_URL = 'URL_WEB_APP_BOOKING';
const LANDING_CONTENT_SCRIPT_URL = 'URL_WEB_APP_CONTENT';
```

## 2. Lam Du An Moi Theo Thu Tu Nay

1. Tao `Booking Sheet`.
2. Tao `Content Sheet`.
3. Tao hoac chon Google Calendar rieng.
4. Dan `google-apps-script-booking.gs` vao Apps Script cua Booking Sheet.
5. Dan `google-apps-script-landing-content.gs` vao Apps Script cua Content Sheet.
6. Sua cac ID can thiet trong 2 file Apps Script.
7. Chay ham khoi tao/cap quyen.
8. Deploy ca 2 Apps Script thanh Web App.
9. Dan 2 URL Web App vao `script.js`.
10. Test website, QR, booking, email va Calendar.

## 3. Cau Hinh Booking Sheet

Sua dau file `google-apps-script-booking.gs`:

```javascript
const SPREADSHEET_ID = 'ID_BOOKING_SHEET';
const LANDING_CONTENT_SPREADSHEET_ID = 'ID_CONTENT_SHEET';
const CALENDAR_ID = 'ID_GOOGLE_CALENDAR';
const OWNER_EMAIL = 'EMAIL_NHAN_THONG_BAO';
```

Sau do:

1. Luu Apps Script.
2. Chay `testSendEmails` mot lan de cap quyen Gmail/Calendar.
3. Deploy Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
4. Mo link sau de kiem tra:

```text
URL_WEB_APP_BOOKING?action=version
```

Version dung hien tai:

```text
2026-06-11-v10-booking-pricing-from-content-sheet
```

## 4. Cau Hinh Content Sheet

Sua dau file `google-apps-script-landing-content.gs`:

```javascript
const SPREADSHEET_ID = 'ID_CONTENT_SHEET';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
```

Sau do:

1. Luu Apps Script.
2. Chay `initializeLandingContentSheet` mot lan.
3. Hoac reload Sheet va chon menu `Clow Cat -> Tao bang noi dung landing page`.
4. Deploy Web App:
   - Execute as: `Me`
   - Who has access: `Anyone`
5. Mo link sau de kiem tra:

```text
URL_WEB_APP_CONTENT?action=version
```

Version dung hien tai:

```text
2026-06-11-v10-landing-content-display-values
```

## 5. Cach Sua Noi Dung Moi Ngay

Trong tab `Landing content`, chi sua 2 cot nay:

| Cot | Cach dung |
| --- | --- |
| `Bat` | `TRUE` de hien, `FALSE` de an |
| `Noi dung` | Sua chu, gia, nut, mo ta, placeholder |

Han che sua cac cot ky thuat:

```text
Khoa, Section, Mo ta, Selector, Kieu, Thuoc tinh
```

Khi code co them noi dung moi, chay:

```javascript
syncLandingContentSheet
```

Ham nay chi them dong con thieu, khong xoa noi dung da sua.

## 6. Cach Doi Gia Goi

Sua gia trong Content Sheet, cot `Noi dung`:

| Khoa | Gia can dien |
| --- | --- |
| `packages.year_price` | Gia online goi Du Doan Nam Ca Nhan |
| `packages.big3_price` | Gia online goi Phan Tich 3 Chi So |
| `packages.big7_price` | Gia online/offline goi Phan Tich Toan Dien |

Quy tac offline:

```text
year offline = year online + OFFLINE_TRAVEL_FEE
big3 offline = big3 online + OFFLINE_TRAVEL_FEE
big7 offline = big7 online
```

Phi di chuyen mac dinh:

```javascript
const OFFLINE_TRAVEL_FEE = 50000;
```

Neu doi phi di chuyen, sua trong ca 2 file:

- `script.js`
- `google-apps-script-booking.gs`

Sau khi doi gia tren Sheet:

- Website hien gia moi va tao QR moi.
- Booking Sheet, Calendar va email cung lay gia moi.
- Neu dang mo website san, refresh lai trang.

## 7. Checklist Truoc Khi Bao Xong

1. Content Web App tra dung version.
2. Booking Web App tra dung version.
3. Website hien dung noi dung tu Content Sheet.
4. Dropdown goi tu van hien dung gia.
5. QR tao dung so tien.
6. Booking test co dong moi trong Sheet.
7. Email khach va email thong bao dung goi, dung gia.
8. Calendar co lich hen dung thong tin.

## 8. Loi Thuong Gap

| Loi | Cach xu ly nhanh |
| --- | --- |
| Content Sheet chua co cot | Chay `initializeLandingContentSheet` |
| Website chua doi noi dung | Refresh manh, upload lai `index.html` va `script.js` |
| QR van dung gia cu | Kiem tra `LANDING_CONTENT_SCRIPT_URL` va refresh trang |
| Email/Sheet booking van dung gia cu | Deploy lai `google-apps-script-booking.gs` |
| Apps Script khong gui email | Chay `testSendEmails` va cap quyen |
| Sua gia tren web nhung booking khong doi | Phai sua `packages.*_price` trong Content Sheet |

## 9. Cau Hinh Hien Tai Cua Du An Nay

| Muc | Gia tri |
| --- | --- |
| Booking Sheet | `1KO6b5v9WPbYg2cJv25EM-ZN-tyjXfYJF3ZK7iKB3Bkc` |
| Content Sheet | `1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k` |
| Calendar | `80668f888da8f3c3ffadd0d0e0e6b49bfba8734a6f0514c8c9143c1127200d04@group.calendar.google.com` |
| Email nhan thong bao | `cuongck3@gmail.com` |
| Booking Web App | Xem `BOOKING_SCRIPT_URL` trong `script.js` |
| Content Web App | Xem `LANDING_CONTENT_SCRIPT_URL` trong `script.js` |
