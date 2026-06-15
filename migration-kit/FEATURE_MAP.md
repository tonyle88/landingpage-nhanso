# Feature Map

Tai lieu nay giup biet tinh nang nao nam o dau khi chuyen sang du an moi.

## 1. Landing page

Chuc nang:

- Hero section.
- About/mentor section.
- Benefits section.
- Feedback/testimonial images.
- Packages section.
- Process section.
- Contact/booking section.
- Music toggle, scroll top, sticky CTA mobile.

File lien quan:

```text
index.html
style.css
script.js
assets/images/
nhac.mp3
```

## 2. Admin content

Chuc nang:

- Dang nhap admin.
- Sua noi dung tung section.
- Luu ve Google Sheet.
- Dong bo template noi dung moi.
- Doi mat khau admin.
- Quan ly user admin.

File lien quan:

```text
admin/index.html
admin/style.css
admin/app.js
google-apps-script-landing-content.gs
```

Google Sheet:

```text
Landing content
Admin users
```

## 3. Quan ly feedback/review images

Chuc nang:

- Upload anh feedback tu admin.
- Luu URL anh len Sheet.
- Landing page load anh tu Sheet.
- Co anh fallback trong `assets/images/testimonials/`.

File lien quan:

```text
admin/app.js
script.js
google-apps-script-landing-content.gs
assets/images/testimonials/
```

Google Sheet:

```text
Feedback images
```

Ben thu ba:

```text
ImgBB API Key
Google Drive fallback
```

## 4. Quan ly goi tu van dong

Chuc nang:

- Them/sua/xoa goi moi.
- Bat/tat goi.
- Sap xep thu tu bang nut va keo tha trong admin.
- Hien thi tren landing packages section.
- Dong bo vao form dat lich.
- Ho tro gia online/offline va don vi `/buoi`, `/gio`.

File lien quan:

```text
admin/app.js
admin/style.css
script.js
style.css
google-apps-script-landing-content.gs
google-apps-script-booking.gs
```

Google Sheet:

```text
Packages
```

## 5. Dat lich va thanh toan

Chuc nang:

- Form khach hang.
- Chon hinh thuc online/offline.
- Chon goi tu van dong.
- Tom tat gia ngay duoi dropdown.
- Chon lich trong.
- QR thanh toan VietQR.
- Noi dung chuyen khoan tu dong theo ma goi + so dien thoai.

File lien quan:

```text
index.html
script.js
style.css
google-apps-script-booking.gs
```

Google Sheet:

```text
Dang ky tu van
Packages
```

Ben thu ba:

```text
Google Calendar
VietQR image API
```

## 6. Email va Calendar

Chuc nang:

- Gui email xac nhan cho khach.
- Gui email thong bao cho chu trang.
- Tao Google Calendar event.
- Doc lich da dat tu Calendar va Sheet de chan trung slot.

File lien quan:

```text
google-apps-script-booking.gs
```

Google Sheet:

```text
Email log
Dang ky tu van
```

Ben thu ba:

```text
GmailApp
CalendarApp
```

## 7. Error handling va chong spam

Chuc nang:

- Timeout khi goi API.
- Retry khi hoan tat booking bi cham.
- Ghi log loi client/server vao Sheet.
- Rate limit theo phone/email.
- Validate/sanitize du lieu truoc khi luu Sheet.

File lien quan:

```text
script.js
google-apps-script-booking.gs
google-apps-script.gs
```

Google Sheet:

```text
Error log
```

