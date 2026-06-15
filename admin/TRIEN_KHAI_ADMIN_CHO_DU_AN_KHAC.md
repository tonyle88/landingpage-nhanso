# Trien Khai Admin Cho Du An Khac

Tai lieu nay dung de copy bo admin hien tai sang mot landing page khac nhanh va it loi hon.

## 1. Bo File Can Copy

Copy nguyen thu muc `admin` sang du an moi:

```text
admin/index.html
admin/style.css
admin/app.js
admin/README.md
```

Copy file Apps Script content:

```text
google-apps-script-landing-content.gs
```

Neu du an moi co form dat lich rieng, van giu script booking rieng. Admin chi nen tro ve Web App cua content sheet, khong tro vao booking script.

## 2. Cau Truc Google Sheet Can Co

Admin dang quan ly cac tab chinh:

```text
Landing content
Admin users
```

Neu dung them module mo rong trong admin hien tai, co the co them:

```text
Packages
Feedback images
```

Tab `Landing content` can co cac cot:

```text
Bat | Khoa | Section | Mo ta | Selector | Kieu | Thuoc tinh | Noi dung
```

Y nghia nhanh:

- `Bat`: TRUE/FALSE de hien hoac tam tat noi dung.
- `Khoa`: ma noi dung duy nhat, vi du `hero.title_1`.
- `Section`: nhom hien thi trong admin, vi du `Hero`, `Packages`, `Footer`.
- `Selector`: CSS selector tren landing page.
- `Kieu`: `text`, `html`, `attr`, `placeholder`.
- `Thuoc tinh`: dung khi `Kieu` la `attr`, vi du `content`, `href`, `src`.
- `Noi dung`: noi dung that su se hien tren website.

## 3. Nhung Bien Can Sua

Trong `admin/app.js`, sua endpoint:

```javascript
const ADMIN_SCRIPT_URL = 'URL_WEB_APP_CONTENT_CUA_DU_AN_MOI';
```

Neu muon moi du an co session rieng, sua:

```javascript
const SESSION_KEY = 'ten_du_an_admin_session';
```

Trong `google-apps-script-landing-content.gs`, sua:

```javascript
const SPREADSHEET_ID = 'ID_CONTENT_SHEET_CUA_DU_AN_MOI';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const ADMIN_DEFAULT_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'admin123';
```

Neu khong dung upload anh feedback, co the bo qua cac bien:

```javascript
const IMGBB_API_KEY = '...';
const FEEDBACK_IMAGES_SHEET_NAME = 'Feedback images';
const FEEDBACK_DRIVE_FOLDER_NAME = '...';
```

## 4. Viec Quan Trong Nhat Khi Chuyen Sang Landing Page Moi

Can sua ham nay trong `google-apps-script-landing-content.gs`:

```javascript
function buildDefaultLandingContentRows() {
  return [
    lc(true, 'hero.title_1', 'Hero', 'Dong tieu de 1', '.hero-title .title-line:nth-child(1)', 'text', '', 'NOI DUNG MAC DINH'),
  ];
}
```

Moi dong phai khop voi HTML/CSS cua landing page moi. Neu selector sai, admin van luu vao Sheet duoc nhung website se khong doi noi dung.

Quy trinh nhanh:

1. Mo `index.html` cua landing page moi.
2. Xac dinh tung noi dung muon sua qua admin.
3. Dat selector on dinh cho tung noi dung.
4. Tao cac dong `lc(...)` trong `buildDefaultLandingContentRows()`.
5. Chay `initializeLandingContentSheet` lan dau.
6. Sau nay khi them dong moi, chay `syncLandingContentSheet`.

## 5. Deploy Apps Script

Trong Apps Script cua Content Sheet:

1. Dan noi dung `google-apps-script-landing-content.gs`.
2. Sua `SPREADSHEET_ID`.
3. Save.
4. Chay `initializeLandingContentSheet` lan dau de cap quyen va tao tab.
5. Chay `repairAdminUserDateFormats` neu da co user cu.
6. Deploy Web App.
7. Execute as: `Me`.
8. Who has access: `Anyone`.
9. Copy Web App URL dan vao `ADMIN_SCRIPT_URL` trong `admin/app.js`.

Kiem tra version:

```text
URL_WEB_APP_CONTENT?action=version
```

Neu tra ve JSON co `scriptVersion`, script content dang chay dung.

## 6. Upload Admin Len Hosting

Upload thu muc:

```text
/admin/
```

Mo duong dan:

```text
https://ten-mien-cua-du-an/admin/
```

Neu giao dien bi vo layout, thu 3 viec nay:

- Kiem tra da upload `admin/style.css` va `admin/app.js`.
- Kiem tra trong `admin/index.html` dang tro `/admin/style.css?...` va `/admin/app.js?...`.
- Hard refresh bang `Cmd + Shift + R` tren Mac hoac `Ctrl + F5` tren Windows.

## 7. Tai Khoan Va Phan Quyen

Lan dau, script tu tao user:

```text
User: admin
Password: admin123
```

Sau khi dang nhap, doi mat khau ngay trong admin.

Vai tro:

- `admin`: sua noi dung, tao/khoa user, dong bo template.
- `editor`: sua noi dung va doi mat khau cua chinh minh.

## 8. Checklist Test Sau Khi Xong

- Mo `/admin/` khong bi vo giao dien desktop/mobile.
- Dang nhap duoc bang `admin`.
- Doi mat khau duoc.
- Tao user editor duoc.
- Sua mot dong noi dung va bam `Luu muc nay`.
- Kiem tra tab `Landing content` thay doi dung cot `Noi dung`.
- Refresh landing page va thay noi dung moi hien len.
- Ngay gio trong `Admin users` hien dang `dd/MM/yyyy HH:mm:ss`.

## 9. Loi Hay Gap

| Loi | Nguyen nhan thuong gap | Cach xu ly |
| --- | --- | --- |
| Admin bao loi sheet `Dang ky tu van` | Dang tro nham booking Web App | Doi `ADMIN_SCRIPT_URL` sang content Web App |
| Luu trong admin thanh cong nhung website khong doi | Selector sai hoac landing page chua load content sheet | Kiem tra `buildDefaultLandingContentRows()` va URL content trong landing JS |
| Giao dien admin bi vo tren mobile | Trinh duyet giu CSS cu | Upload lai `admin/style.css`, tang query version, hard refresh |
| Ngay gio hien kieu `6/12/2026` | Sheet chua format ngay Viet Nam | Chay `repairAdminUserDateFormats` |
| Tao user khong thay trong Sheet | Chua deploy ban Apps Script moi | Deploy lai Web App va kiem tra `action=version` |

## 10. Goi Y Cach Tach Cho Du An Moi

Neu du an moi don gian, giu cac phan loi:

```text
Dang nhap
Quan ly user
Doi mat khau
Sua Landing content
```

Neu du an moi chua can, co the tam an hoac bo cac module:

```text
Packages
Feedback images
Upload anh
```

Lam du an moi theo cach nay se de bao tri hon: admin chi quan ly content, booking chi quan ly lich hen, landing page chi hien thi noi dung.
