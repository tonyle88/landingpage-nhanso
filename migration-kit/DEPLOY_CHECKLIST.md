# Deploy Checklist

Lam theo thu tu nay khi dua sang du an moi.

## Giai doan 1 - Chuan bi source

- [ ] Copy `index.html`, `style.css`, `script.js`.
- [ ] Copy folder `assets/`.
- [ ] Copy `nhac.mp3` neu muon giu nhac nen.
- [ ] Copy folder `admin/`.
- [ ] Copy Apps Script:
  - [ ] `google-apps-script-landing-content.gs`
  - [ ] `google-apps-script-booking.gs`
  - [ ] `google-apps-script.gs` neu can ban tong hop.

## Giai doan 2 - Tao Google Sheet

- [ ] Tao Google Sheet moi cho landing/admin/packages.
- [ ] Tao tab `Landing content`.
- [ ] Tao tab `Packages`.
- [ ] Tao tab `Feedback images`.
- [ ] Tao tab `Admin users`.
- [ ] Tao Google Sheet booking hoac dung chung Sheet.
- [ ] Tao tab `Dang ky tu van`.
- [ ] Tao tab `Email log` neu muon co san.
- [ ] Tao tab `Error log` neu muon co san.
- [ ] Lay Spreadsheet ID trong URL Sheet.

## Giai doan 3 - Deploy Landing Content Apps Script

- [ ] Tao Apps Script moi gan voi Sheet content.
- [ ] Dan code tu `google-apps-script-landing-content.gs`.
- [ ] Doi `SPREADSHEET_ID`.
- [ ] Doi `IMGBB_API_KEY` neu dung ImgBB.
- [ ] Bam Run thu ham `initializeLandingContentSheet` neu can tao template.
- [ ] Cap quyen cho Apps Script.
- [ ] Deploy as Web App.
- [ ] Execute as: `Me`.
- [ ] Who has access: `Anyone`.
- [ ] Copy Web App URL.
- [ ] Dan URL nay vao `LANDING_CONTENT_SCRIPT_URL` trong `script.js`.
- [ ] Dan URL nay vao config trong `admin/app.js`.

## Giai doan 4 - Deploy Booking Apps Script

- [ ] Tao Apps Script moi cho booking.
- [ ] Dan code tu `google-apps-script-booking.gs`.
- [ ] Doi `SPREADSHEET_ID`.
- [ ] Doi `LANDING_CONTENT_SPREADSHEET_ID`.
- [ ] Doi `CALENDAR_ID`.
- [ ] Doi `OWNER_EMAIL`.
- [ ] Doi `EMAIL_SENDER_NAME` neu can.
- [ ] Bam Run thu ham `testAuth` neu co.
- [ ] Cap quyen Gmail/Calendar/Sheet.
- [ ] Deploy as Web App.
- [ ] Execute as: `Me`.
- [ ] Who has access: `Anyone`.
- [ ] Copy Web App URL.
- [ ] Dan URL nay vao `BOOKING_SCRIPT_URL` trong `script.js`.

## Giai doan 5 - Cau hinh thanh toan

- [ ] Doi `BANK_BIN`.
- [ ] Doi `BANK_ACCOUNT`.
- [ ] Doi `BANK_NAME_DISPLAY`.
- [ ] Test QR co hien dung so tien va noi dung CK.

## Giai doan 6 - Test admin

- [ ] Mo `/admin/`.
- [ ] Dang nhap user mac dinh.
- [ ] Doi mat khau admin.
- [ ] Sua thu mot noi dung landing.
- [ ] Luu va reload landing de kiem tra.
- [ ] Them mot goi moi.
- [ ] Keo tha thu tu goi.
- [ ] Upload mot anh feedback.

## Giai doan 7 - Test landing

- [ ] Mo landing page.
- [ ] Kiem tra hero/about/benefits/packages/process/contact.
- [ ] Kiem tra feedback images load dung.
- [ ] Kiem tra package moi hien dung tren section goi.
- [ ] Kiem tra package moi hien dung trong form dat lich.
- [ ] Kiem tra don vi `/gio` hoac `/buoi` dong bo.

## Giai doan 8 - Test booking that

- [ ] Dien form bang email that.
- [ ] Chon hinh thuc.
- [ ] Chon goi.
- [ ] Chon khung gio.
- [ ] Kiem tra modal thanh toan.
- [ ] Bam xac nhan thanh toan.
- [ ] Kiem tra tab `Dang ky tu van`.
- [ ] Kiem tra Google Calendar co event.
- [ ] Kiem tra email khach.
- [ ] Kiem tra email chu trang.
- [ ] Kiem tra `Email log`.
- [ ] Kiem tra `Error log` neu co loi.

## Giai doan 9 - Chot ban giao

- [ ] Doi cache param trong `index.html`.
- [ ] Xoa data booking test neu can.
- [ ] Xoa feedback test neu can.
- [ ] Kiem tra mobile.
- [ ] Kiem tra desktop.
- [ ] Luu lai Apps Script deployment URL.
- [ ] Luu lai Google Sheet URL.
- [ ] Ghi chu tai khoan admin moi cho chu du an.

