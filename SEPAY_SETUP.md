# Huong Dan Cau Hinh SePay

Tinh nang SePay hien duoc thiet ke theo kien truc hien tai cua du an:

- Frontend/admin la HTML/JS tinh.
- Google Apps Script lam backend.
- Merchant secret khong dua ra frontend.

## 1. Admin payment settings

Vao admin va chon tab `Thanh toán`.

Co the cau hinh:

- Bat/tat SePay.
- Ten ngan hang.
- Ma BIN VietQR.
- So tai khoan.
- Chu tai khoan.
- Moi truong SePay.
- Merchant ID.
- Secret Key SePay. Key nay chi duoc gui len Apps Script va luu trong Script Properties, khong luu vao Google Sheet va khong tra ve landing page.
- Checkout URL tuy chon.
- Tien to ma don.
- Thoi gian cho thanh toan.
- Trang cam on.

Khi tat SePay, trang giu cho khung gio trong 15 phut. Sau khi khach bam `Tôi Đã Chuyển Khoản Thành Công`, don chuyen sang `manual_review`; Calendar va email xac nhan chi duoc tao sau khi nguoi quan tri kiem tra giao dich va chon menu `Clow Cat Booking` -> `Xác nhận đơn chuyển khoản đã chọn` trong tab `Dang ky tu van`.

Khi bat SePay, trang hien QR co countdown va tu kiem tra trang thai thanh toan.

## 2. Script Properties bat buoc

Trong Apps Script booking, vao `Project Settings` -> `Script properties`, them:

```text
SEPAY_WEBHOOK_SECRET = mot_chuoi_bi_mat_dai
```

Secret nay dung de chan nguoi la gia lap webhook.

Trong Apps Script admin/landing content, tab `Thanh toán` co the luu `Secret Key` SePay giup ban. Apps Script se luu vao Script Properties voi khoa:

```text
SEPAY_SECRET_KEY
```

Khong hard-code `Secret Key` vao file `.js`, `.html`, `.gs`, va khong luu key nay trong Google Sheet noi dung.

Neu Secret Key tung bi chup man hinh/gui qua chat, nen tao lai key moi tren SePay truoc khi chay production.

## 3. Webhook URL

Deploy lai Apps Script booking thanh Web App, sau do cau hinh webhook ben SePay tro ve:

```text
BOOKING_SCRIPT_URL?action=sepayWebhook&secret=SEPAY_WEBHOOK_SECRET
```

Trong do:

- `BOOKING_SCRIPT_URL` la URL Web App cua `google-apps-script-booking.gs`.
- `SEPAY_WEBHOOK_SECRET` phai trung voi Script Properties.

Webhook can gui du lieu co it nhat mot trong cac truong:

```text
paymentOrderId
order_invoice_number
orderCode
order_id
content
description
transferContent
transfer_content
transactionContent
transaction_content
```

Va nen gui:

```text
status
amount
```

Trang se coi cac status sau la thanh cong:

```text
paid
success
succeeded
completed
complete
thanh cong
thành công
```

Luu y quan trong: webhook URL co `action` va `secret` tren query string, con du lieu giao dich thuong nam trong POST body. Hay deploy ban booking script `2026-07-11-v14-booking-reservation` tro len de Apps Script doc duoc ca query string lan body, doi chieu ma don va so tien.

Sau khi khach thanh toan, kiem tra tab:

```text
SePay payments
```

- Neu khong co dong moi: SePay chua goi webhook dung URL, hoac URL/secret sai.
- Neu co dong moi nhung landing van cho: cot `Ma thanh toan` khong khop noi dung chuyen khoan `CCP-...`, cot `Trang thai` khong phai `paid`, hoac so tien thap hon gia cua don booking.
- Neu cot `Du lieu goc` co du lieu nhung ma thanh toan trong: can xem field noi dung SePay gui ve ten gi de bo sung parser.

## 4. Sheet log

Apps Script se tu tao tab:

```text
SePay payments
```

Tab nay luu:

```text
Ngay gio | Ma thanh toan | Trang thai | So tien | Noi dung | Du lieu goc
```

Frontend se poll action:

```text
checkSepayPayment
```

Neu thay status `paid`, trang se:

1. Luu booking vao Sheet.
2. Tao Calendar/email qua booking Apps Script.
3. Chuyen sang `thankyou.html`.

## 5. Luu y quan trong

SDK `sepay-pg-node` trong vi du cua SePay la SDK Node/React. Du an hien tai khong co Node server, nen khong nen dua `secret_key` vao frontend.

Neu sau nay muon dung checkout form chuan cua SDK, nen tao mot backend Node rieng hoac mot endpoint Apps Script ky request phia server.
