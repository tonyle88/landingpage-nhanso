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
# Security deployment 2026-07-16

- Da them Vercel security headers: `X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`.
- Da them `Content-Security-Policy-Report-Only` theo allowlist tai nguyen hien tai. Can theo doi violation truoc khi doi sang enforcement.
- CSP violation duoc gui den `/api/csp-report`; endpoint chi log URL da loai query/hash de tranh ghi token hoac du lieu nhay cam.
- DOMPurify 3.0.6, Font Awesome 6.4.0, Quill 1.3.6 va Google Fonts da duoc self-host de loai runtime CDN/SRI risk; CSP da bo allowlist cac CDN nay.
- Da them `Cross-Origin-Resource-Policy: same-site` va `X-Permitted-Cross-Domain-Policies: none`.
- Da them `/api/sepay-webhook` de xac minh HMAC-SHA256 tren raw body va timestamp truoc khi forward vao Apps Script.
- Apps Script booking dung `SEPAY_PROXY_SECRET` thay cho secret tren query string, va ghi/chan trung `SePay transaction ID`.
- Endpoint `checkSepayPayment` yeu cau dong thoi `paymentOrderId` va `bookingId` UUID, chi tra trang thai toi thieu de giam nguy co IDOR/ro ri so tien.
- Sau deploy phai rotate secret cu, cau hinh ba environment variables tren Vercel va chuyen SePay production sang HMAC-SHA256.
