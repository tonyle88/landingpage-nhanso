# 🏗️ Kế Hoạch Nâng Cấp — 3 Nhóm Tính Năng

---

## TÓM TẮT 3 NHÓM VIỆC

| # | Nhóm | Độ phức tạp | Ước tính thời gian |
|---|------|-------------|-------------------|
| 1 | **Bảo mật + Bug fixes + Dead code** | Thấp–Trung bình | ~3-4h |
| 2 | **Upload ảnh feedback → Google Drive** | Trung bình | ~3-4h |
| 3 | **CMS Sections: thêm/ẩn/sắp xếp section** | Cao | ~8-12h |

---

## 📦 SPRINT 1 — Bảo Mật & Bug Fixes (Làm trước)

### 1A. Bảo mật nghiêm trọng

| # | Vấn đề | File sửa | Công việc |
|---|--------|----------|-----------|
| S1 | Mọi API write dùng GET → lộ data qua URL | `admin/app.js` + GAS | Chuyển write operations sang `fetch POST` + thêm `doPost(e)` trong GAS |
| S2 | `PASSWORD_SALT` hardcode, dễ đoán | `landing-content.gs` | Đổi salt thành random 32 ký tự thực sự |
| S3 | `SEPAY_SECRET = 'CLOW_SECRET_2026'` quá đơn giản | `Code.gs` | Đổi secret dài, lưu trong GAS Script Properties |
| S4 | Token admin lưu `localStorage` | `admin/app.js` | Chuyển sang `sessionStorage` |
| S5 | `value="admin"` hardcode trong login form | `admin/index.html` | Xóa value mặc định |
| S6 | Admin page không có `noindex` meta | `admin/index.html` | Thêm `<meta name="robots" content="noindex, nofollow">` |

> [!WARNING]
> S2 (đổi PASSWORD_SALT) sẽ **invalidate toàn bộ password hiện tại**. Sau khi deploy, bạn cần vào Sheet xóa cột `passwordHash` của user admin rồi login để tạo hash mới. **Tôi sẽ viết hướng dẫn migration rõ ràng trước khi thực hiện.**

### 1B. Bug fixes chức năng

| # | Vấn đề | File | Công việc |
|---|--------|------|-----------|
| B1 | `thankUrl` fallback về GAS URL thay vì `thankyou.html` | `payment.html` | Đổi fallback |
| B2 | `confirmManualTransfer` không check response trước khi báo thành công | `payment.html` | Thêm `if (!data.success) throw` |
| B3 | Double-click nút lưu gói → duplicate row trong Sheet | `admin/app.js` | Disable button khi đang gọi API |
| B4 | Session hết hạn không tự redirect về login | `admin/app.js` | Detect 401/error → `clearSession() + showLogin()` |
| B5 | Audio state de-sync khi browser tự pause | `script.js` | Lắng nghe `audio.onpause` / `audio.onplay` |
| B6 | `extractAmount()` parse tên gói → sai tiền nếu đổi tên | `Code.gs` | Truyền `amount` numeric trực tiếp từ packages |
| B7 | `getSpreadsheet()` dùng `getActiveSpreadsheet()` không ổn định | `Code.gs` | Luôn dùng `openById(SPREADSHEET_ID)` |

### 1C. Dead code & CSS cleanup

| # | Vấn đề | File | Công việc |
|---|--------|------|-----------|
| C1 | `#success-modal` + YCB embed script (không dùng) | `index.html` | Xóa toàn bộ |
| C2 | `closeModal()` dead code | `script.js` | Xóa hàm |
| C3 | Double font import (HTML + CSS) | `index.html` + `style.css` | Xóa `@import` trong CSS |
| C4 | Dead CSS: `.magic-ring`, `.ring1-3`, `.card-fall-1/2/3`, `@keyframes fallCard1/2/3` | `style.css` | Xóa toàn bộ |
| C5 | `.pricing-toggle` sai tên class trong media query | `style.css` | Sửa thành `.pricing-mode-toggle` |
| C6 | `.step-line` div HTML không có CSS | `index.html` | Xóa div hoặc thêm CSS |
| C7 | Dead code booking-widget-container trong `thankyou.html` | `thankyou.html` | Xóa |
| C8 | `localStorage` parse 2 lần khi khởi tạo state | `admin/app.js` | Parse 1 lần |
| C9 | `formatMoney` và `formatPackagePrice` trùng logic | `admin/app.js` | Merge 1 hàm |

---

## 📸 SPRINT 2 — Upload Ảnh Feedback → Google Drive

### Kiến trúc đề xuất

```
Admin Panel
  └─ Tab "Feedback" mới
       ├─ 10 slot ảnh (có thể thêm/xóa sau nếu muốn linh động)
       ├─ Mỗi slot: [Preview ảnh hiện tại] [Nút Upload] [Ký hiệu hoàng đạo]
       └─ Upload → base64 → POST đến GAS

Google Apps Script (landing-content.gs)
  └─ doPost(e) action = 'uploadFeedbackImage'
       ├─ Nhận base64 + slot index (1-10) + filename
       ├─ Tạo/tìm folder "ClowCat/Testimonials" trên Google Drive
       ├─ Lưu file ảnh vào folder
       ├─ Set permission public (anyone with link can view)
       ├─ Lưu URL vào Sheet: key = "testimonials.N.image_url"
       └─ Xóa public cache → trả về {success, url}

Google Sheet (Landing Content tab)
  └─ Thêm rows:
       testimonials.1.image_url  → [Drive URL]
       testimonials.1.zodiac     → ♈
       testimonials.2.image_url  → [Drive URL]
       ...
       testimonials.10.image_url → [Drive URL]

script.js (Landing Page)
  └─ loadLandingContent() đọc các key testimonials.*
       └─ Nếu có URL → gán vào <img src> của #test-1 ... #test-10
       └─ Nếu không có → giữ nguyên ảnh local (fallback)
```

### Các thành phần cần tạo mới

**GAS (landing-content.gs):**
- `doPost(e)` xử lý JSON body (hiện chỉ có `doGet`)
- `handleUploadFeedbackImage(params, fileData)` — lưu vào Drive, cập nhật Sheet
- `handleDeleteFeedbackImage(params)` — xóa Drive file + xóa URL khỏi Sheet

**Admin (app.js + index.html + style.css):**
- Tab "Feedback" trong sidebar với 10 slot
- Preview ảnh + upload button + delete button mỗi slot
- Progress bar khi upload (file lớn tốn 2-5s)
- Validation: chỉ nhận JPG/PNG/WebP, max 5MB

**Landing page (script.js):**
- Đọc `testimonials.N.image_url` từ Sheet → update `<img>` src
- Fallback về ảnh local nếu chưa có URL

> [!NOTE]
> Google Drive URL trả về dạng `https://drive.google.com/uc?id=FILE_ID`. Ảnh phải được set **Anyone with link - Viewer** để hiển thị được từ landing page.

---

## 🏛️ SPRINT 3 — CMS Sections (Phức tạp nhất)

> [!IMPORTANT]
> Đây là tính năng **CMS đầy đủ** — cho phép thêm section mới với nội dung tự do. Đây là phần phức tạp nhất, cần thiết kế cẩn thận vì liên quan đến cấu trúc cốt lõi của landing page.

### Kiến trúc đề xuất

#### Sheet mới: "Sections Config"

| Cột | Ý nghĩa | Ví dụ |
|-----|---------|-------|
| `section_id` | ID unique | `hero`, `about`, `custom-faq-1` |
| `section_type` | Loại section | `fixed`, `text-block`, `image-text`, `faq`, `gallery`, `custom-html` |
| `order` | Thứ tự hiển thị (drag-drop thay đổi) | `1`, `2`, `3`... |
| `visible` | Bật/tắt hiển thị | `TRUE` / `FALSE` |
| `nav_label` | Tên hiển thị trong navbar (để trống = không hiện) | `Về chúng tôi` |
| `title` | Tiêu đề section | `Tại Sao Chọn Chúng Tôi` |
| `content` | Nội dung chính (text hoặc JSON cho FAQ) | `...` |
| `image_url` | URL ảnh (cho image-text type) | Drive URL |
| `extra` | JSON config thêm (màu nền, layout...) | `{"bg":"dark","layout":"image-right"}` |

#### 6 loại section template

| Type | Mô tả | Dùng cho |
|------|-------|---------|
| `fixed` | Section có sẵn trong HTML (Hero, About, Benefits, Pricing, Process, Contact) — chỉ kiểm soát order + visibility | 7 sections gốc |
| `text-block` | Tiêu đề + nội dung văn bản phong phú | Thêm section giới thiệu thêm |
| `image-text` | Ảnh bên trái/phải + text bên còn lại | Kể chuyện, giới thiệu |
| `faq` | Accordion Q&A | Câu hỏi thường gặp |
| `gallery` | Grid ảnh với lightbox | Portfolio, hình ảnh buổi tư vấn |
| `custom-html` | Raw HTML tự nhập | Embed, widget bất kỳ |

#### Luồng hoạt động

```
Admin Panel — "Sections" Panel
  ├─ Danh sách tất cả sections (drag-drop để sắp xếp)
  ├─ Toggle bật/tắt từng section (eye icon)
  ├─ Nút "Thêm section mới" → chọn type → form tương ứng
  ├─ Click edit → mở form chỉnh nội dung
  └─ Nút "Lưu thứ tự" → POST to GAS → update "order" column trong Sheet

GAS
  ├─ action=getSectionsConfig → trả JSON toàn bộ sections
  ├─ action=saveSectionsOrder → cập nhật cột "order"
  ├─ action=toggleSection → bật/tắt visible
  ├─ action=saveSection → lưu nội dung section
  ├─ action=addSection → thêm row mới vào Sheet
  └─ action=deleteSection → xóa row (chỉ custom sections, không xóa fixed)

Landing page (script.js)
  ├─ Fetch sections config từ GAS
  ├─ Filter visible=true, sort by order
  ├─ Fixed sections: reorder bằng JS DOM (insertBefore/appendChild)
  ├─ Custom sections: render từ template engine mini
  └─ Cập nhật navbar links theo sections visible
```

#### Template engine mini (client-side)

```javascript
// Ví dụ render text-block section
function renderTextBlockSection(section) {
  return `
    <section class="section cms-section" id="cms-${section.id}" data-order="${section.order}">
      <div class="container">
        <p class="section-label">${escHtml(section.nav_label)}</p>
        <h2 class="section-title">${section.title}</h2>
        <div class="cms-content">${section.content}</div>
      </div>
    </section>
  `;
}
```

> [!WARNING]
> **Rủi ro "custom-html" type:** Cho phép nhập raw HTML tự do tạo ra rủi ro XSS nếu tài khoản admin bị compromise. Đề xuất: chỉ cho phép loại này với role `admin` (không phải `editor`), và hiển thị cảnh báo rõ trong UI.

> [!IMPORTANT]
> **Navbar tự động:** Khi sections thay đổi thứ tự/visibility, navbar (#navbar) phải cập nhật theo. Các anchor links trong nav sẽ được render lại từ `nav_label` của từng section.

---

## ❓ Câu Hỏi Quan Trọng Trước Khi Bắt Đầu

> [!IMPORTANT]
> **Q1 — Salt migration:** Tôi sẽ đổi `PASSWORD_SALT` trong Sprint 1. Điều này yêu cầu bạn **reset password admin** sau khi deploy. Bạn có sẵn sàng làm bước này không? (Tôi sẽ viết hướng dẫn từng bước rõ ràng)

> [!IMPORTANT]
> **Q2 — GAS deploy:** Sprint 2 và Sprint 3 đều cần thêm `doPost(e)` vào Google Apps Script và **deploy lại** script với version mới. Bạn có quyền truy cập vào GAS project để deploy không? (Nếu bạn muốn, tôi cung cấp code GAS hoàn chỉnh để bạn tự paste + deploy)

> [!NOTE]
> **Q3 — Google Drive folder:** Upload ảnh sẽ tạo folder "ClowCat Patronus/Testimonials" tự động trong Google Drive của tài khoản đang chạy GAS. Điều này OK với bạn không?

> [!NOTE]
> **Q4 — Thứ tự Sprint:** Tôi đề xuất làm theo thứ tự Sprint 1 → 2 → 3. Riêng Sprint 3 (CMS Sections) có thể chia thành 2 giai đoạn nhỏ: trước tiên làm bật/tắt + sắp xếp sections có sẵn (dễ hơn), sau đó mới làm thêm sections mới với template. Bạn đồng ý không?

---

## 📋 Ước Tính Tổng Thời Gian

| Sprint | Công việc | Ước tính |
|--------|-----------|---------|
| Sprint 1 | 25 fixes bảo mật + bug + dead code | ~3-4h |
| Sprint 2 | Upload ảnh Drive + Admin UI | ~3-4h |
| Sprint 3A | Bật/tắt + sắp xếp sections có sẵn | ~3-4h |
| Sprint 3B | Thêm sections mới từ template | ~5-8h |
| **Tổng** | | **~14-20h** |
