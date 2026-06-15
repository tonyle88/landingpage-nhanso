# Google Sheet Schema

Nen tao mot Google Sheet moi va gom cac tab ben duoi.

## 1. `Landing content`

Header:

```text
Bật | Khóa | Section | Mô tả | Selector | Kiểu | Thuộc tính | Nội dung
```

Dung de admin sua noi dung landing page.

Ghi chu:

- `Bật`: TRUE/FALSE.
- `Khóa`: ma noi dung, vi du `hero.title_1`.
- `Section`: nhom hien trong admin.
- `Kiểu`: `text`, `html`, `image`, `link`, tuy code hien tai quy dinh.
- `Nội dung`: noi dung hien tren web.

## 2. `Packages`

Header:

```text
Bật | Mã gói | Tên gói | Giá online | Giá offline | Đơn vị | Icon | Màu nhấn | Nổi bật | Badge | Quyền lợi | Nút | Thứ tự
```

Dung de quan ly goi tu van dong.

Quy tac:

- `Bật`: TRUE/FALSE.
- `Mã gói`: viet khong dau, khong trung, vi du `combo3`, `big7`, `year`.
- `Tên gói`: ten hien tren landing va form.
- `Giá online`: chi ghi so, vi du `500000`.
- `Giá offline`: chi ghi so, vi du `550000`.
- `Đơn vị`: `buổi`, `/buổi`, `giờ`, `/giờ` deu duoc, code se tu chuan hoa.
- `Icon`: ten icon FontAwesome hoac key dang dung trong UI.
- `Màu nhấn`: vi du `gold`, `orange`, `teal`.
- `Nổi bật`: TRUE/FALSE.
- `Badge`: dong chu nho tren card, co the de trong.
- `Quyền lợi`: moi quyen loi cach nhau bang xuong dong.
- `Nút`: text nut CTA, vi du `Đặt Lịch Ngay`.
- `Thứ tự`: so thu tu hien thi.

Co the import mau tu `sample-packages.csv`.

## 3. `Feedback images`

Header:

```text
Ngày tạo | Tên file | URL | File ID | Người upload
```

Dung de landing page load anh feedback/review.

Ghi chu:

- `URL`: nen la link anh truc tiep tu ImgBB hoac Drive/public image.
- Anh fallback van nen giu trong `assets/images/testimonials/`.

## 4. `Admin users`

Header:

```text
Bật | Tên đăng nhập | Tên hiển thị | Vai trò | Muối | Mật khẩu hash | Ngày tạo | Ngày cập nhật | Lần đăng nhập cuối
```

Dung cho admin login.

Ghi chu:

- Lan dau co the dung user mac dinh trong Apps Script.
- Sau khi login nen doi mat khau.

## 5. `Dang ky tu van`

Header:

```text
Ngày giờ Việt Nam | Họ và tên | Ngày sinh | Số điện thoại / Zalo | Email | Hình thức | Gói tư vấn | Lịch hẹn | Số tiền | Lời nhắn | Mã gói | Email khách | Email chủ | Nội dung chuyển khoản
```

Dung de luu booking tu form dat lich.

Co the import mau header tu `sample-booking-headers.csv`.

## 6. `Email log`

Header co the de script tu tao. Neu tao san:

```text
Ngày giờ Việt Nam | Loại | Email | Thành công | Lỗi
```

Dung de theo doi email gui khach va chu trang.

## 7. `Error log`

Header co the de script tu tao. Neu tao san:

```text
Ngày giờ Việt Nam | Nguồn | Thông báo | Stack | Dữ liệu
```

Dung de debug khi API fail, form loi, Apps Script loi.

