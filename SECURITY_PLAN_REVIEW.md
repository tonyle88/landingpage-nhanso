# Review Kha Thi - implementation_plan.md

Ngay review: 2026-06-15

## Ket luan nhanh

Ke hoach trong `implementation_plan.md` kha thi ve huong tong the, nhung co mot so muc da duoc repo hien tai xu ly truoc do, va mot so muc khong ap dung vi file khong ton tai trong du an nay.

Nen trien khai theo thu tu:

1. Sprint 1: bao mat + bug fixes nho.
2. Sprint 2: feedback upload/cau hinh anh.
3. Sprint 3A: bat/tat + sap xep sections co san.
4. Sprint 3B: them section moi bang template.

## Cac muc da co san hoac da xu ly

- Admin write API da dung `POST`.
- Admin token da dung `sessionStorage`.
- Admin page da co `noindex, nofollow`.
- Package save button da disable khi dang luu.
- Feedback upload da co luong ImgBB va fallback Google Drive.
- Packages dong da co them/sua/xoa/sap xep/keo tha.
- Booking da co timeout/retry/log loi/rate limit co ban.
- Password admin dang dung salt rieng theo user, khong phai salt hardcode chung.

## Cac muc vua trien khai them

- Xoa `value="admin"` khoi form login admin.
- Session admin het han se clear session va ve login ngay o tang API.
- Audio button dong bo lai khi browser tu pause/play.
- ImgBB API key khong con hardcode trong source, nen dat qua Apps Script Script Properties.
- Them `SECURITY_UPGRADE_NOTES.md` de huong dan migration ImgBB key va giai thich salt/password.

## Cac muc khong ap dung truc tiep

Repo hien tai khong co cac file:

```text
payment.html
thankyou.html
Code.gs
```

Nen cac muc sau can bo qua hoac chi ap dung neu du an khac co cac file do:

- `thankUrl` fallback.
- `confirmManualTransfer`.
- `SEPAY_SECRET`.
- `extractAmount()`.
- `getSpreadsheet()` trong `Code.gs`.
- Dead code booking widget trong `thankyou.html`.

## Sprint 3 can lam can than

CMS Sections la kha thi nhung co rui ro cao hon vi tac dong cau truc landing page.

Khuyen nghi chia lam 2 buoc:

1. Chi cho bat/tat va sap xep sections co san.
2. Sau khi on dinh moi them custom sections nhu FAQ, text-block, gallery.

Khong nen bat dau bang `custom-html` cho moi role. Neu can, chi cho role `admin` dung va phai co canh bao.

