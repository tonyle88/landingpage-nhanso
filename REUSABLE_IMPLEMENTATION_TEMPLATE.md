# Form mau trien khai nang cap landing page + admin

Cap nhat tu du an ClowCat Patronus ngay 09/07/2026.

File nay dung lam mau cho cac du an tuong tu: landing page tinh, admin quan tri noi dung, blog, booking/thanh toan, va backend Google Apps Script/Google Sheet hoac migration sang MySQL sau nay.

## 1. Nguyen tac lam viec

- Khong code khi chua ro gia dinh, tradeoff va tieu chi thanh cong.
- Moi thay doi phai co ly do truc tiep tu yeu cau.
- Uu tien sua nho, de kiem tra, khong refactor lan can neu chua can.
- Moi sprint phai co buoc xac minh: health check, syntax check, smoke test, hoac test tay.
- Du lieu/secret khong hardcode trong frontend hoac source public.

## 2. Kien truc tham chieu

```text
Landing page:
- index.html
- style.css
- script.js

Blog:
- blog.html
- blog.js

Admin:
- admin/index.html
- admin/style.css
- admin/app.js
- admin/blog_admin.js

Backend noi dung:
- google-apps-script-landing-content.gs

Backend booking/thanh toan:
- google-apps-script-booking.gs

QA:
- qa/smoke-tests.mjs
```

## 3. Cac sheet / bang du lieu nen co

Content/admin:

```text
Landing content
Packages
Feedback images
Payment settings
Sections layout
Blog Categories
Blog Articles
Admin users
Audit log
```

Booking/payment:

```text
Dang ky tu van
Email log
Error log
SePay payments
```

Neu chuyen MySQL, giu shape JSON tra ve tu API giong Google Apps Script cu truoc, sau do moi doi frontend.

## 4. Cac nang cap da lam duoc

### Sprint 0 - Dong bo tai lieu va nguon su that

- Tao tai lieu hien trang du an.
- Ghi ro file frontend/admin/backend dang dung.
- Ghi ro endpoint, sheet ID, schema va Script Properties.
- Tach roadmap trien khai khoi tai lieu van hanh.

Kiem tra:

```text
Nguoi moi vao du an doc tai lieu phai biet deploy dung file nao, script nao, sheet nao.
```

### Sprint 1 - Health check va an toan van hanh

- Them `healthCheck` cho content/admin Apps Script.
- Them `bookingHealthCheck` cho booking Apps Script.
- Them nut kiem tra trong admin.
- Them `Audit log` cho cac thao tac ghi quan trong.
- Dua webhook secret SePay vao Script Properties.

Kiem tra:

```text
Admin bam nut kiem tra noi dung => OK.
Admin bam nut kiem tra booking => OK.
Thieu sheet/header/secret thi bao loi ro.
Thao tac ghi tao dong trong Audit log.
```

### Sprint 2 - Dong QA cho tinh nang hien co

- Feedback moi nhat hien truoc admin va landing.
- Blog search chi loc theo tieu de.
- Blog theo chu de co carousel khi qua 3 bai.
- Bai viet lien quan uu tien bai chua xem va khong reload toan trang.
- Mini report nhan so co case kiem tra cong thuc.
- Section layout bat/tat/sap xep dung.
- Generic section co sanitizer va khong pha mobile.

Kiem tra:

```bash
node --check script.js
node --check blog.js
node --check qa/smoke-tests.mjs
node qa/smoke-tests.mjs
```

### Sprint 3 - Toi uu toc do va trai nghiem

- Lazy load anh feedback/blog.
- Preload hero WebP.
- Dat width/height cho logo de giam layout shift.
- Dung cache-buster co chu dich khi doi CSS/JS.
- Audio de `preload="none"`.
- Nut scroll-to-top tren landing/blog.

Kiem tra:

```text
Landing/blog khong tran ngang mobile.
Anh chinh render dung.
Khong tai tai nguyen nang khi chua can.
Hard refresh thay dung ban JS/CSS moi.
```

## 5. Mau ke hoach trien khai cho du an khac

### Buoc 1 - Audit hien trang

Can thu thap:

```text
- Danh sach file chinh
- Backend/API dang dung
- Noi luu du lieu
- Cac secret/API key
- Cac tinh nang admin dang co
- Cac luong nguoi dung quan trong
```

Ket qua can co:

```text
PROJECT_DOCUMENTATION.md
IMPLEMENTATION_ROADMAP.md
```

### Buoc 2 - Chuan hoa du lieu

Viec lam:

```text
- Chot schema sheet/bang
- Chot ten endpoint/action
- Chot response JSON public
- Them migration/backfill header neu sheet cu thieu cot
```

Kiem tra:

```text
Health check bao ro sheet nao thieu, header nao sai.
```

### Buoc 3 - Admin quan tri noi dung

Viec lam:

```text
- Dang nhap admin
- Quan ly landing content
- Quan ly section layout
- Quan ly goi dich vu
- Quan ly feedback
- Quan ly blog category/article
- Nut health check
- Audit log
```

Kiem tra:

```text
Them/sua/xoa/bat/tat du lieu tu admin va xem frontend cap nhat dung.
```

### Buoc 4 - Blog va noi dung dong

Viec lam:

```text
- Trang danh sach bai viet
- Loc theo chu de
- Search theo tieu de neu can
- Carousel bai theo chu de khi nhieu hon so luong hien thi
- Trang chi tiet bai viet
- Bai viet lien quan khong reload neu co the
```

Kiem tra:

```text
URL doi dung, back/forward hoat dong, bai lien quan khong lap lai cho den khi het chu de.
```

### Buoc 5 - Booking/thanh toan

Viec lam:

```text
- Form dat lich
- Luu sheet/database
- Gui email/log loi
- Tao noi dung chuyen khoan
- Webhook thanh toan
- Health check booking
```

Kiem tra:

```text
Booking luu thanh cong, email/log dung, webhook bi sai secret phai bi chan.
```

### Buoc 6 - QA va toi uu

Viec lam:

```text
- Syntax check
- Smoke test cac rule quan trong
- Kiem tra mobile/desktop
- Lazy load anh
- Preload anh hero
- Cache-buster khi deploy
```

Kiem tra:

```text
Khong loi console nghiem trong.
Khong tran ngang mobile.
Khong co file sinh tu dong trong source.
```

## 6. Checklist truoc khi deploy

```text
[ ] Cap nhat Apps Script content/admin.
[ ] Cap nhat Apps Script booking.
[ ] Deploy Web App moi va copy URL vao frontend/admin.
[ ] Set Script Properties.
[ ] Chay content health check.
[ ] Chay booking health check.
[ ] Chay smoke test local.
[ ] Upload HTML/CSS/JS/assets len hosting.
[ ] Hard refresh va test landing/blog/admin.
[ ] Test form booking that.
[ ] Test mot thao tac admin va xem Audit log.
```

## 7. Checklist don repo

Nen xoa/ignore:

```text
.DS_Store
__pycache__/
*.pyc
venv/
.venv/
Pdf create/previews/
```

Can giu:

```text
Source frontend/admin/backend
Tai lieu van hanh
Migration kit
Script PDF mau
PDF input/output neu la du lieu ban giao cho khach
Assets dang duoc HTML/CSS/JS tham chieu
```
