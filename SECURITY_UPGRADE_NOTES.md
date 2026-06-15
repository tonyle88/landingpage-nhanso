# Ghi Chu Nang Cap Bao Mat

Tai lieu nay ghi lai cac muc trong `implementation_plan.md` da ap dung duoc vao repo hien tai va nhung muc can thao tac tren Google Apps Script.

## Da ap dung trong source

- Admin API write operations dang dung `POST` thay vi `GET`.
- Admin token dang luu bang `sessionStorage`.
- Trang admin da co `noindex, nofollow`.
- Form login admin da bo gia tri mac dinh `admin`.
- Neu session admin het han, frontend se xoa session va dua ve man hinh dang nhap.
- Nut nhac nen se tu dong dong bo icon khi trinh duyet tu pause/play audio.
- ImgBB API key da duoc lay qua Apps Script Script Properties, khong nen hardcode trong source.

## ImgBB API Key migration

Trong `google-apps-script-landing-content.gs`, bien `IMGBB_API_KEY` da de trong:

```js
const IMGBB_API_KEY = '';
```

Truoc khi deploy lai Apps Script, can dat key trong Script Properties:

1. Mo Apps Script cua landing content/admin.
2. Vao `Project Settings`.
3. Tim `Script properties`.
4. Them property:

```text
IMGBB_API_KEY = API_KEY_CUA_BAN
```

5. Luu lai.
6. Deploy Web App version moi.
7. Vao admin upload thu mot anh feedback.

Neu khong set property nay, upload ImgBB se bao:

```text
Chua cau hinh ImgBB API Key.
```

Khi ImgBB loi, code hien tai van co fallback upload Google Drive.

## Salt/password admin

Plan co nhac `PASSWORD_SALT` hardcode, nhung repo hien tai khong dung salt chung hardcode.

Code hien tai tao `salt` rieng cho moi user bang:

```js
Utilities.getUuid().replace(/-/g, '')
```

Vi vay khong can reset toan bo password admin. Chi can doi mat khau admin mac dinh sau khi deploy neu du an moi con dung `admin/admin123`.

## Cac muc khong ap dung trong repo nay

Cac file sau khong co trong du an hien tai:

```text
payment.html
thankyou.html
Code.gs
```

Nen cac muc trong plan lien quan den `thankUrl`, `confirmManualTransfer`, `SEPAY_SECRET`, `extractAmount()` va `getSpreadsheet()` cua `Code.gs` khong the sua truc tiep trong repo nay.

