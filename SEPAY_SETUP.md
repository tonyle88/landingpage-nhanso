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

## 2. Secrets bat buoc

Tao hai chuoi bi mat doc lap, toi thieu 32 byte ngau nhien. Khong tai su dung secret cu tung nam trong URL.

Trong Apps Script booking, vao `Project Settings` -> `Script properties`, them secret noi bo:

```text
SEPAY_PROXY_SECRET = mot_chuoi_ngau_nhien_chi_dung_giua_Vercel_va_Apps_Script
```

Trong Vercel Project -> Settings -> Environment Variables, them cho Production, Preview va Development khi can:

```text
SEPAY_WEBHOOK_SECRET = secret_HMAC_da_cau_hinh_tren_SePay
BOOKING_SCRIPT_WEBHOOK_URL = URL_Web_App_booking_khong_co_query_secret
BOOKING_WEBHOOK_FORWARD_SECRET = cung_gia_tri_voi_SEPAY_PROXY_SECRET_tren_Apps_Script
```

`SEPAY_WEBHOOK_SECRET` va `BOOKING_WEBHOOK_FORWARD_SECRET` phai la hai secret khac nhau.

Trong Apps Script admin/landing content, tab `Thanh toán` co the luu `Secret Key` SePay giup ban. Apps Script se luu vao Script Properties voi khoa:

```text
SEPAY_SECRET_KEY
```

Khong hard-code `Secret Key` vao file `.js`, `.html`, `.gs`, va khong luu key nay trong Google Sheet noi dung.

Neu Secret Key tung bi chup man hinh/gui qua chat, nen tao lai key moi tren SePay truoc khi chay production.

## 3. Webhook URL va HMAC

Deploy lai Apps Script booking, sau do deploy Vercel. Cau hinh webhook ben SePay tro ve endpoint Vercel:

```text
https://nhanso.clowcat.com.vn/api/sepay-webhook
```

Trong SePay Dashboard:

- Chon `HMAC-SHA256`.
- Nhap secret trung voi Vercel `SEPAY_WEBHOOK_SECRET`.
- Chon `application/json`.
- Chi nhan giao dich vao va dung tai khoan nhan tien.
- Bat retry va canh bao loi.

Endpoint Vercel xac minh `X-SePay-Signature` tren raw body va kiem tra `X-SePay-Timestamp` trong khoang 5 phut. Chi payload hop le moi duoc chuyen den Apps Script. Apps Script tiep tuc doi chieu ma don, so tien, trang thai don va chan xu ly lai cung SePay transaction ID.

Payload `SEPAY TEST WEBHOOK` da qua HMAC duoc ghi voi ma `SEPAY_TEST`, trang thai `test` va tra `200`; payload nay khong duoc phep cap nhat bat ky booking nao thanh `paid`.

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

Khong dua secret vao query string. Secret trong URL co the bi luu tai browser history, access log, proxy, analytics va dashboard.

### Kiem tra webhook truoc khi thanh toan that

Trong SePay Dashboard, webhook can duoc cau hinh voi cac dieu kien sau:

- Dung tai khoan BIDV dang hien tren ma QR.
- Chi nhan giao dich vao (`In_only`) va webhook dang `Active`.
- Neu dung loc prefix ma thanh toan, them `CCP` (phan biet hoa-thuong).
- URL dung chinh xac endpoint `/api/sepay-webhook` o tren.
- Bat `HMAC-SHA256`; tuyet doi khong dung `No_Authen` tren production.

Dung nut `Test send` trong SePay de kiem tra ket noi. Apps Script ContentService co the khien SePay hien `HTTP 302` du request da chay; kiem tra tab `SePay payments` co them dong moi moi la dau hieu request da vao script. Do ma test khong trung don `CCP...` dang cho, no se khong tu xac nhan lich.

De kiem tra end-to-end, can co mot giao dich vao dung `500.000d` voi noi dung chinh xac `CCP...` dang hien tren QR. Chi sau buoc nay dong booking moi chuyen tu `pending_payment` sang `paid`, roi landing page tao Calendar/email va hien trang cam on.

Neu mot giao dich that da vao `SePay payments` nhung dong booking van `pending_payment`, mo Sheet dat lich va chon menu `Clow Cat Booking` -> `Doi soat giao dich SePay dang cho`. Muc nay dung de sua cac giao dich cu co ma `CCP-...` hoac `CCP...` ma phien ban parser truoc chua nhan dien; no chi xac nhan giao dich SePay du tien, dung ma don va co thoi diem thanh toan nam trong thoi gian giu cho.

Sau khi khach thanh toan, kiem tra tab:

```text
SePay payments
```

- Neu khong co dong moi: xem Vercel Function Logs. HTTP 401 thuong la HMAC/timestamp sai; HTTP 502 thuong la URL Apps Script hoac proxy secret sai.
- Neu webhook dang loc prefix `CPP` trong khi ma don la `CCP...`: doi filter webhook thanh `CCP`; sai mot ky tu se khien SePay bo giao dich truoc khi gui va Sheet se khong co log.
- Neu co dong moi nhung landing van cho: cot `Ma thanh toan` khong khop noi dung chuyen khoan `CCP...`, cot `Trang thai` khong phai `paid`, hoac so tien thap hon gia cua don booking.
- Neu cot `Du lieu goc` co du lieu nhung ma thanh toan trong: can xem field noi dung SePay gui ve ten gi de bo sung parser.

Neu khach da thanh toan nhung webhook bi loc nen khong co log, quan tri vien kiem tra giao dich tren BIDV, chon dung dong `pending_payment` trong `Dang ky tu van`, roi chon `Clow Cat Booking` -> `Xac nhan thu cong don SePay da chon`. He thong se hoi lai truoc khi xac nhan, ghi log `manual_sheet_confirmation`, tao Calendar va gui email.

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
