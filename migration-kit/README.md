# Migration Kit - Clow Cat Landing/Admin

Bo kit nay dung de chuyen toan bo tinh nang cua landing page hien tai sang mot du an khac.

## Co nhung gi trong bo kit

- `FEATURE_MAP.md`: Danh sach tinh nang dang co va file lien quan.
- `CONFIG_MAP.md`: Nhung bien bat buoc phai doi khi sang du an moi.
- `SHEET_SCHEMA.md`: Cau truc Google Sheet can tao.
- `DEPLOY_CHECKLIST.md`: Checklist trien khai tung buoc.
- `QA_CHECKLIST.md`: Checklist test truoc khi ban giao.
- `sample-packages.csv`: Mau tab `Packages`.
- `sample-booking-headers.csv`: Mau header tab `Dang ky tu van`.

## Cach dung nhanh

1. Copy source landing/admin sang du an moi.
2. Tao Google Sheet moi theo `SHEET_SCHEMA.md`.
3. Copy Apps Script theo `DEPLOY_CHECKLIST.md`.
4. Doi cac bien trong `CONFIG_MAP.md`.
5. Deploy Web App tren Apps Script.
6. Dan URL Web App moi vao frontend/admin.
7. Test theo `QA_CHECKLIST.md`.

## Cac file chinh can copy

Frontend:

```text
index.html
style.css
script.js
assets/
nhac.mp3
```

Admin:

```text
admin/index.html
admin/style.css
admin/app.js
```

Google Apps Script:

```text
google-apps-script-landing-content.gs
google-apps-script-booking.gs
google-apps-script.gs
```

Neu du an moi tach rieng content va booking, uu tien dung:

- `google-apps-script-landing-content.gs` cho Admin/Content/Packages/Feedback.
- `google-apps-script-booking.gs` cho Booking/Payment/Calendar/Email.

`google-apps-script.gs` la ban tong hop/phong ho khi can gom logic vao mot file.

