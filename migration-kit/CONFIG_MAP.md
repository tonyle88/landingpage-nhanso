# Config Map

Day la cac bien can doi khi dua sang du an moi.

## 1. Frontend - `script.js`

```js
const BOOKING_SCRIPT_URL = '...';
const LANDING_CONTENT_SCRIPT_URL = '...';
const LANDING_CONTENT_ENABLED = true;
```

Y nghia:

- `BOOKING_SCRIPT_URL`: URL Web App cua file booking Apps Script.
- `LANDING_CONTENT_SCRIPT_URL`: URL Web App cua file landing content/admin Apps Script.
- `LANDING_CONTENT_ENABLED`: de `true` neu muon load noi dung tu Google Sheet.

Thong tin ngan hang:

```js
const BANK_BIN = '...';
const BANK_ACCOUNT = '...';
const BANK_NAME_DISPLAY = '...';
```

Y nghia:

- `BANK_BIN`: ma ngan hang VietQR.
- `BANK_ACCOUNT`: so tai khoan nhan tien.
- `BANK_NAME_DISPLAY`: ten chu tai khoan hien tren QR.

Gio lam viec:

```js
const WORKING_HOURS = {
  weekday: { start: 19, end: 21 },
  weekend: { start: 9, end: 21 },
  slotDurationHrs: 2,
};
```

Neu du an moi co khung gio khac, doi tai day.

## 2. Admin - `admin/app.js`

Can tim va doi:

```js
const SCRIPT_URL = '...';
```

Hoac bien tuong duong dang tro den Web App cua `google-apps-script-landing-content.gs`.

Neu co ImgBB:

```js
IMGBB_API_KEY
```

Nen doi sang API key rieng cua du an moi. Khong nen dung chung key cong khai.

## 3. Landing Content Apps Script

File:

```text
google-apps-script-landing-content.gs
```

Can doi:

```js
const SPREADSHEET_ID = '...';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const IMGBB_API_KEY = '...';
const FEEDBACK_IMAGES_SHEET_NAME = 'Feedback images';
const PACKAGES_SHEET_NAME = 'Packages';
```

Dang nhap mac dinh:

```js
const ADMIN_DEFAULT_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'admin123';
```

Khuyen nghi:

- Doi password ngay sau khi deploy.
- Khong chia se Apps Script URL admin len noi cong khai.

## 4. Booking Apps Script

File:

```text
google-apps-script-booking.gs
```

Can doi:

```js
const SPREADSHEET_ID = '...';
const SHEET_NAME = 'Dang ky tu van';
const LANDING_CONTENT_SPREADSHEET_ID = '...';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const PACKAGES_SHEET_NAME = 'Packages';
const CALENDAR_ID = '...';
const OWNER_EMAIL = '...';
const EMAIL_SENDER_NAME = '...';
```

Y nghia:

- `SPREADSHEET_ID`: Sheet luu booking.
- `LANDING_CONTENT_SPREADSHEET_ID`: Sheet chua tab `Packages`.
- `CALENDAR_ID`: Google Calendar dung de tao lich.
- `OWNER_EMAIL`: email nhan thong bao booking.
- `EMAIL_SENDER_NAME`: ten hien trong email gui khach.

Rate limit:

```js
const BOOKING_RATE_LIMIT_SECONDS = 15 * 60;
const BOOKING_RATE_LIMIT_MAX = 3;
```

Mac dinh: moi phone/email chi gui toi da 3 lan trong 15 phut cho tung buoc `save`, `complete`, `legacy`.

## 5. Cache version sau khi sua file

Trong `index.html`, moi lan sua `script.js` nen doi:

```html
<script src="script.js?v=YYYYMMDD-ten-thay-doi"></script>
```

Trong file CSS neu co cache param, cung nen doi tuong tu.

