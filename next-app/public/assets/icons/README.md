# Site Icons

Thu muc nay luu rieng cac icon noi bo cua landing page.

- `site-favicon.png`: favicon hien tai cua trang, copy tu `assets/images/logo2.png`.
- `site-icons.svg`: SVG sprite gom cac icon giao dien dang dung tren trang.
- `icon-manifest.json`: bang doi chieu giua icon noi bo va class Font Awesome hien tai.
- `png/`: cac icon da xuat sang dinh dang `.png`, kich thuoc 256x256, nen trong suot.
- `png/png-manifest.json`: danh sach file PNG da xuat.

Trang hien van dang dung Font Awesome CDN trong HTML. Bo icon nay duoc luu rieng de quan ly asset va co the chuyen sang SVG local sau nay neu can.

Vi du dung SVG sprite:

```html
<svg class="icon" aria-hidden="true">
  <use href="assets/icons/site-icons.svg#icon-calendar-check"></use>
</svg>
```
