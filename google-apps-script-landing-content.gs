// =============================================
//  CLOW CAT – LANDING CONTENT GOOGLE APPS SCRIPT
//  File này chỉ dùng cho Sheet chỉnh nội dung Landing Page.
// =============================================

const SPREADSHEET_ID = '1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const SCRIPT_VERSION = '2026-06-11-v10-landing-content-display-values';
const LANDING_CONTENT_HEADERS = [
  'Bật',
  'Khóa',
  'Section',
  'Mô tả',
  'Selector',
  'Kiểu',
  'Thuộc tính',
  'Nội dung',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Clow Cat')
    .addItem('Tạo bảng nội dung landing page', 'initializeLandingContentSheet')
    .addItem('Đồng bộ dòng nội dung mới', 'syncLandingContentSheet')
    .addToUi();
}

function onInstall() {
  onOpen();
}

function doGet(e) {
  const params = e ? (e.parameter || {}) : {};

  if (params.action === 'getLandingContent') {
    try {
      return handleGetLandingContent();
    } catch (error) {
      return jsonResponse({ ok: false, items: [], message: error.message, scriptVersion: SCRIPT_VERSION });
    }
  }

  if (params.action === 'version') {
    return jsonResponse({ ok: true, scriptVersion: SCRIPT_VERSION });
  }

  return jsonResponse({
    ok: true,
    message: 'Clow Cat Landing Content Script dang chay',
    scriptVersion: SCRIPT_VERSION,
  });
}

// =============================================
//  Landing content config – đọc nội dung website từ Google Sheet
// =============================================
function handleGetLandingContent() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({
      ok: true,
      items: [],
      message: 'Chua co tab Landing content. Hay chay initializeLandingContentSheet mot lan trong Apps Script.',
      scriptVersion: SCRIPT_VERSION,
    });
  }

  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ ok: true, items: [], scriptVersion: SCRIPT_VERSION });
  }

  const range = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const indexes = getLandingContentHeaderIndexes();
  const templateRowsByKey = getLandingContentTemplateRowsByKey();
  const items = values
    .map((row, rowIndex) => landingContentRowToItem(row, displayValues[rowIndex], indexes, templateRowsByKey))
    .filter((item) => item.enabled && item.selector && item.value !== '');

  return jsonResponse({
    ok: true,
    items: items,
    count: items.length,
    scriptVersion: SCRIPT_VERSION,
  });
}

function getLandingContentHeaderIndexes() {
  const indexes = {};
  LANDING_CONTENT_HEADERS.forEach((header, index) => {
    indexes[header] = index;
  });
  return indexes;
}

function getLandingContentTemplateRowsByKey() {
  const rowsByKey = {};
  buildDefaultLandingContentRows().forEach((row) => {
    const key = cleanValue(row[1]);
    if (key) rowsByKey[key] = row;
  });
  return rowsByKey;
}

function landingContentRowToItem(row, displayRow, indexes, templateRowsByKey) {
  const enabledValue = row[indexes['Bật']];
  const enabled = enabledValue === true || String(enabledValue).toUpperCase() === 'TRUE' || String(enabledValue).trim() === '1';
  const key = cleanValue(displayRow[indexes['Khóa']] || row[indexes['Khóa']]);
  const templateRow = templateRowsByKey[key];

  return {
    enabled: enabled,
    key: key,
    section: cleanValue(displayRow[indexes['Section']] || row[indexes['Section']]),
    description: cleanValue(displayRow[indexes['Mô tả']] || row[indexes['Mô tả']]),
    selector: templateRow ? cleanValue(templateRow[4]) : cleanValue(displayRow[indexes['Selector']] || row[indexes['Selector']]),
    type: templateRow ? cleanValue(templateRow[5]) : (cleanValue(displayRow[indexes['Kiểu']] || row[indexes['Kiểu']]) || 'text'),
    attribute: templateRow ? cleanValue(templateRow[6]) : cleanValue(displayRow[indexes['Thuộc tính']] || row[indexes['Thuộc tính']]),
    value: displayRow[indexes['Nội dung']] == null ? '' : String(displayRow[indexes['Nội dung']]),
  };
}

function ensureLandingContentHeaderRow(sheet) {
  sheet.getRange(1, 1, 1, LANDING_CONTENT_HEADERS.length).setValues([LANDING_CONTENT_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, LANDING_CONTENT_HEADERS.length);
}

function initializeLandingContentSheet() {
  return writeLandingContentTemplate(true);
}

// Chạy hàm này sau mỗi lần template được cập nhật.
// Hàm chỉ thêm dòng còn thiếu và cập nhật cấu hình kỹ thuật, không xoá nội dung bạn đã sửa.
function syncLandingContentSheet() {
  return writeLandingContentTemplate(false);
}

// Chạy initializeLandingContentSheet lần đầu để tạo tab cấu hình nội dung landing page.
// Sau đó bạn chỉ cần sửa cột "Nội dung", hạn chế sửa "Selector" và "Kiểu".
function writeLandingContentTemplate(resetSheet) {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(LANDING_CONTENT_SHEET_NAME);

  if (resetSheet) sheet.clear();
  ensureLandingContentHeaderRow(sheet);
  const rows = buildDefaultLandingContentRows();

  if (resetSheet || sheet.getLastRow() < 2) {
    sheet.getRange(2, 1, rows.length, LANDING_CONTENT_HEADERS.length).setValues(rows);
    sheet.autoResizeColumns(1, LANDING_CONTENT_HEADERS.length);
    return { ok: true, mode: resetSheet ? 'initialized' : 'filled-empty-sheet', rows: rows.length };
  }

  const lastRow = sheet.getLastRow();
  const existing = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length).getValues();
  const existingByKey = {};
  existing.forEach((row, index) => {
    const key = cleanValue(row[1]);
    if (key && !existingByKey[key]) existingByKey[key] = index + 2;
  });

  const rowsToAppend = [];
  rows.forEach((row) => {
    const key = cleanValue(row[1]);
    const rowNumber = existingByKey[key];
    if (!rowNumber) {
      rowsToAppend.push(row);
      return;
    }

    // Cập nhật phần kỹ thuật của template nhưng giữ nguyên cột "Nội dung" đã chỉnh trong Sheet.
    sheet.getRange(rowNumber, 1, 1, LANDING_CONTENT_HEADERS.length - 1)
      .setValues([row.slice(0, LANDING_CONTENT_HEADERS.length - 1)]);
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, LANDING_CONTENT_HEADERS.length).setValues(rowsToAppend);
  }

  sheet.autoResizeColumns(1, LANDING_CONTENT_HEADERS.length);
  return { ok: true, mode: 'synced', added: rowsToAppend.length, totalTemplateRows: rows.length };
}

function lc(enabled, key, section, description, selector, type, attribute, value) {
  return [enabled, key, section, description, selector, type || 'text', attribute || '', value || ''];
}

function buildDefaultLandingContentRows() {
  return [
    lc(true, 'meta.title', 'Meta', 'Tiêu đề tab trình duyệt', 'title', 'text', '', 'Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus'),
    lc(true, 'meta.description', 'Meta', 'Mô tả SEO', 'meta[name="description"]', 'attr', 'content', 'Khám phá bản thân qua Nhân Số Học. Hơn 3 năm kinh nghiệm, 800+ ca tư vấn. Hiểu mình hơn – Sống đúng hướng hơn. Đặt lịch tư vấn ngay!'),
    lc(true, 'meta.og_title', 'Meta', 'Tiêu đề khi chia sẻ link', 'meta[property="og:title"]', 'attr', 'content', 'Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus'),
    lc(true, 'meta.og_description', 'Meta', 'Mô tả khi chia sẻ link', 'meta[property="og:description"]', 'attr', 'content', 'Tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh và hành trình phát triển của chính mình.'),

    lc(true, 'nav.about', 'Menu', 'Menu Về chúng tôi', '#nav-links li:nth-child(1) .nav-link', 'text', '', 'Về Chúng Tôi'),
    lc(true, 'nav.benefits', 'Menu', 'Menu lợi ích', '#nav-links li:nth-child(2) .nav-link', 'text', '', 'Những Gì Bạn Nhận Được'),
    lc(true, 'nav.testimonials', 'Menu', 'Menu feedback', '#nav-links li:nth-child(3) .nav-link', 'text', '', 'Khách Hàng Nghĩ Gì?'),
    lc(true, 'nav.packages', 'Menu', 'Menu gói tư vấn', '#nav-links li:nth-child(4) .nav-link', 'text', '', 'Gói Tư Vấn'),
    lc(true, 'nav.process', 'Menu', 'Menu hành trình', '#nav-links li:nth-child(5) .nav-link', 'text', '', 'Hành Trình'),
    lc(true, 'nav.contact', 'Menu', 'Menu CTA', '#nav-links li:nth-child(6) .nav-link', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'nav.logo_text', 'Menu', 'Tên cạnh logo', '.nav-logo .logo-text', 'text', '', 'Clow Cat Patronus'),

    lc(true, 'hero.badge', 'Hero', 'Badge đầu trang', '.hero-badge', 'text', '', '✦ Hơn 800 ca tư vấn thực tế ✦'),
    lc(true, 'hero.title_1', 'Hero', 'Dòng tiêu đề 1', '.hero-title .title-line:nth-child(1)', 'text', '', 'NHÂN SỐ HỌC'),
    lc(true, 'hero.title_2', 'Hero', 'Dòng tiêu đề 2', '.hero-title .title-line:nth-child(2)', 'text', '', 'KHAI PHÁ'),
    lc(true, 'hero.title_3', 'Hero', 'Dòng tiêu đề 3', '.hero-title .title-line:nth-child(3)', 'text', '', 'TIỀM NĂNG'),
    lc(true, 'hero.subtitle', 'Hero', 'Mô tả hero', '.hero-subtitle', 'text', '', 'Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh và hành trình phát triển của chính mình'),
    lc(true, 'hero.stat_1_number', 'Hero', 'Số thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-number', 'text', '', '3+'),
    lc(true, 'hero.stat_1_label', 'Hero', 'Nhãn thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-label', 'text', '', 'Năm kinh nghiệm'),
    lc(true, 'hero.stat_2_number', 'Hero', 'Số thống kê 2', '.hero-stats .stat-item:nth-child(3) .stat-number', 'text', '', '800+'),
    lc(true, 'hero.stat_2_label', 'Hero', 'Nhãn thống kê 2', '.hero-stats .stat-item:nth-child(3) .stat-label', 'text', '', 'Ca tư vấn'),
    lc(true, 'hero.stat_3_number', 'Hero', 'Số thống kê 3', '.hero-stats .stat-item:nth-child(5) .stat-number', 'text', '', '100%'),
    lc(true, 'hero.stat_3_label', 'Hero', 'Nhãn thống kê 3', '.hero-stats .stat-item:nth-child(5) .stat-label', 'text', '', 'Cá nhân hoá'),
    lc(true, 'hero.cta_primary', 'Hero', 'Nút chính', '#hero-cta-primary span', 'text', '', 'Đặt Lịch Tư Vấn'),
    lc(true, 'hero.cta_secondary', 'Hero', 'Nút phụ', '#hero-cta-secondary', 'text', '', 'Tìm Hiểu Thêm'),
    lc(true, 'hero.scroll_label', 'Hero', 'Chữ cuộn xuống', '.scroll-indicator span', 'text', '', 'Cuộn xuống'),

    lc(true, 'pain.tag', 'Pain points', 'Tag section', '#pain-points .section-tag', 'text', '', 'Bạn Đang Gặp Phải?'),
    lc(true, 'pain.title', 'Pain points', 'Tiêu đề section', '#pain-points .section-title', 'text', '', 'Những Câu Hỏi Chưa Có Lời Giải'),
    lc(true, 'pain.card_1', 'Pain points', 'Nội dung card 1', '#pain-points .pain-card:nth-child(1) p', 'html', '', 'Mơ hồ về <strong>định hướng học tập, công việc</strong> hay tương lai?'),
    lc(true, 'pain.card_2', 'Pain points', 'Nội dung card 2', '#pain-points .pain-card:nth-child(2) p', 'html', '', 'Bế tắc trong các <strong>mối quan hệ</strong> và cảm xúc?'),
    lc(true, 'pain.card_3', 'Pain points', 'Nội dung card 3', '#pain-points .pain-card:nth-child(3) p', 'html', '', 'Cảm thấy bản thân có nhiều <strong>tiềm năng</strong> nhưng chưa biết cách phát huy?'),
    lc(true, 'pain.card_4', 'Pain points', 'Nội dung card 4', '#pain-points .pain-card:nth-child(4) p', 'html', '', 'Đứng giữa những <strong>lựa chọn quan trọng</strong> nhưng không biết đâu là hướng đi phù hợp?'),
    lc(true, 'pain.conclusion', 'Pain points', 'Kết luận dưới card', '#pain-points .pain-conclusion p', 'html', '', '<i class="fa-solid fa-sparkles" style="color: var(--color-gold-light); margin-right: 8px;"></i> <strong>Nhân Số Học</strong> là tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh, điểm yếu và hành trình phát triển của chính mình.'),

    lc(true, 'about.tag', 'About', 'Tag section', '#about .section-tag', 'text', '', 'Về Chúng Tôi'),
    lc(true, 'about.title', 'About', 'Tiêu đề section', '#about .section-title', 'text', '', 'Những Người Đồng Hành'),
    lc(true, 'about.mentor_1_name', 'About', 'Tên mentor 1', '#about .mentor-block:nth-child(1) .mentor-name', 'text', '', 'Phan Thái Bảo'),
    lc(true, 'about.mentor_1_desc', 'About', 'Mô tả mentor 1', '#about .mentor-block:nth-child(1) .mentor-desc', 'text', '', 'Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của những lá bài Clow huyền bí.'),
    lc(true, 'about.mentor_1_feature_1', 'About', 'Mentor 1 ý 1', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(1) span', 'html', '', 'Hơn <strong>10 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ bài Clow'),
    lc(true, 'about.mentor_1_feature_2', 'About', 'Mentor 1 ý 2', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(2) span', 'html', '', 'Đã tư vấn cho hơn <strong>1.000 khách hàng</strong>'),
    lc(true, 'about.mentor_1_feature_3', 'About', 'Mentor 1 ý 3', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(3) span', 'html', '', 'Khai giảng từ <strong>2019</strong>, hơn <strong>20 khoá học</strong> với <strong>120+ học viên</strong>'),
    lc(true, 'about.mentor_1_feature_4', 'About', 'Mentor 1 ý 4', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(4) span', 'html', '', 'Tổ chức hơn <strong>10 buổi workshop</strong> từ 2024 với chủ đề Ứng dụng Huyền Học và Bài Clow để HIỂU & THƯƠNG'),
    lc(true, 'about.mentor_2_name', 'About', 'Tên mentor 2', '#about .mentor-block:nth-child(2) .mentor-name', 'text', '', 'Lê Chí Cường'),
    lc(true, 'about.mentor_2_desc', 'About', 'Mô tả mentor 2', '#about .mentor-block:nth-child(2) .mentor-desc', 'text', '', 'Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của nhân số học.'),
    lc(true, 'about.mentor_2_feature_1', 'About', 'Mentor 2 ý 1', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(1) span', 'html', '', 'Hơn <strong>3 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ môn nhân số học'),
    lc(true, 'about.mentor_2_feature_2', 'About', 'Mentor 2 ý 2', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(2) span', 'html', '', 'Đã tư vấn nhân số cho hơn <strong>900 khách hàng</strong>'),
    lc(true, 'about.mentor_2_feature_3', 'About', 'Mentor 2 ý 3', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(3) span', 'html', '', 'Luôn hỗ trợ và đồng hành cùng các buổi Workshop của Clow Cat Patronus'),

    lc(true, 'benefits.tag', 'Benefits', 'Tag section', '#benefits .section-tag', 'text', '', 'Những Gì Bạn Nhận Được'),
    lc(true, 'benefits.title', 'Benefits', 'Tiêu đề section', '#benefits .section-title', 'text', '', 'Sau Buổi Tư Vấn, Bạn Sẽ'),
    lc(true, 'benefits.card_1_title', 'Benefits', 'Card 1 tiêu đề', '#benefits .benefit-card:nth-child(1) h3', 'text', '', 'Hiểu Mình Hơn'),
    lc(true, 'benefits.card_1_body', 'Benefits', 'Card 1 nội dung', '#benefits .benefit-card:nth-child(1) p', 'text', '', 'Khám phá tính cách, điểm mạnh và điểm yếu thực sự của bản thân qua lăng kính Nhân Số Học.'),
    lc(true, 'benefits.card_2_title', 'Benefits', 'Card 2 tiêu đề', '#benefits .benefit-card:nth-child(2) h3', 'text', '', 'Gỡ Bỏ Rào Cản'),
    lc(true, 'benefits.card_2_body', 'Benefits', 'Card 2 nội dung', '#benefits .benefit-card:nth-child(2) p', 'text', '', 'Nhận diện và giải phóng những rào cản nội tâm đang ngăn bạn phát triển và tiến về phía trước.'),
    lc(true, 'benefits.card_3_title', 'Benefits', 'Card 3 tiêu đề', '#benefits .benefit-card:nth-child(3) h3', 'text', '', 'Định Hướng Rõ Ràng'),
    lc(true, 'benefits.card_3_body', 'Benefits', 'Card 3 nội dung', '#benefits .benefit-card:nth-child(3) p', 'text', '', 'Có được lộ trình rõ ràng về học tập, công việc và các mối quan hệ quan trọng trong cuộc sống.'),
    lc(true, 'benefits.card_4_title', 'Benefits', 'Card 4 tiêu đề', '#benefits .benefit-card:nth-child(4) h3', 'text', '', 'Tự Tin Quyết Định'),
    lc(true, 'benefits.card_4_body', 'Benefits', 'Card 4 nội dung', '#benefits .benefit-card:nth-child(4) p', 'text', '', 'Tự tin đưa ra những quyết định quan trọng với sự hiểu biết sâu sắc về bản thân và con đường phía trước.'),

    lc(true, 'testimonials.tag', 'Testimonials', 'Tag section', '#testimonials .section-tag', 'text', '', 'Khách Hàng Nghĩ Gì?'),
    lc(true, 'testimonials.title_main', 'Testimonials', 'Tiêu đề chính', '#testimonials .testimonial-title-main', 'text', '', 'Những Hành Trình'),
    lc(true, 'testimonials.title_accent', 'Testimonials', 'Tiêu đề nhấn', '#testimonials .testimonial-title-accent', 'text', '', 'Chữa Lành'),

    lc(true, 'packages.tag', 'Packages', 'Tag section', '#packages .section-tag', 'text', '', 'Gói Tư Vấn'),
    lc(true, 'packages.title_1', 'Packages', 'Tiêu đề dòng 1', '#packages .section-title-packages span:nth-child(1)', 'text', '', 'Chọn Hình Thức'),
    lc(true, 'packages.title_2', 'Packages', 'Tiêu đề dòng 2', '#packages .section-title-packages span:nth-child(2)', 'text', '', 'Phù Hợp'),
    lc(true, 'packages.year_name', 'Packages', 'Tên gói năm cá nhân', '#packages .package-card:nth-child(1) .package-name', 'text', '', 'Dự Đoán Năm Cá Nhân'),
    lc(true, 'packages.year_price', 'Packages', 'Giá gói năm cá nhân', '#packages .package-card:nth-child(1) .price-current', 'html', '', '500.000<sup>đ</sup>'),
    lc(true, 'packages.year_unit', 'Packages', 'Đơn vị giá gói năm cá nhân', '#packages .package-card:nth-child(1) .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.year_feature_1', 'Packages', 'Gói năm cá nhân ý 1', '#packages .package-card:nth-child(1) .package-features li:nth-child(1) span:last-child', 'html', '', 'Dự đoán xu hướng năm cá nhân'),
    lc(true, 'packages.year_feature_2', 'Packages', 'Gói năm cá nhân ý 2', '#packages .package-card:nth-child(1) .package-features li:nth-child(2) span:last-child', 'html', '', 'Nhận diện cơ hội &amp; thách thức'),
    lc(true, 'packages.year_feature_3', 'Packages', 'Gói năm cá nhân ý 3', '#packages .package-card:nth-child(1) .package-features li:nth-child(3) span:last-child', 'html', '', 'Định hướng theo chu kỳ số'),
    lc(true, 'packages.year_feature_4', 'Packages', 'Gói năm cá nhân ý 4', '#packages .package-card:nth-child(1) .package-features li:nth-child(4) span:last-child', 'html', '', 'Gợi ý hành động phù hợp năm'),
    lc(true, 'packages.year_button', 'Packages', 'Nút gói năm cá nhân', '#pkg-year', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.big7_badge', 'Packages', 'Badge gói toàn diện', '#packages .package-featured .featured-badge', 'text', '', '✨ Toàn Diện Nhất ✨'),
    lc(true, 'packages.big7_name', 'Packages', 'Tên gói toàn diện', '#packages .package-featured .package-name', 'text', '', 'Phân Tích Toàn Diện'),
    lc(true, 'packages.big7_price', 'Packages', 'Giá gói toàn diện', '#packages .package-featured .price-current', 'html', '', '2.000.000<sup>đ</sup>'),
    lc(true, 'packages.big7_unit', 'Packages', 'Đơn vị giá gói toàn diện', '#packages .package-featured .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.big7_feature_1', 'Packages', 'Gói toàn diện ý 1', '#packages .package-featured .package-features li:nth-child(1) span:last-child', 'html', '', '<strong>7 chỉ số cốt lõi</strong>: chủ đạo · linh hồn · sứ mệnh · nhân cách · thái độ · trưởng thành · nợ nghiệp'),
    lc(true, 'packages.big7_feature_2', 'Packages', 'Gói toàn diện ý 2', '#packages .package-featured .package-features li:nth-child(2) span:last-child', 'html', '', '<strong>4 đỉnh cao</strong> trong cuộc đời'),
    lc(true, 'packages.big7_feature_3', 'Packages', 'Gói toàn diện ý 3', '#packages .package-featured .package-features li:nth-child(3) span:last-child', 'html', '', '<strong>3 chu kỳ</strong> cuộc đời lớn'),
    lc(true, 'packages.big7_feature_4', 'Packages', 'Gói toàn diện ý 4', '#packages .package-featured .package-features li:nth-child(4) span:last-child', 'html', '', 'Sơ đồ mũi tên phẩm chất'),
    lc(true, 'packages.big7_feature_5', 'Packages', 'Gói toàn diện ý 5', '#packages .package-featured .package-features li:nth-child(5) span:last-child', 'html', '', 'Thông điệp chữa lành chuyên sâu'),
    lc(true, 'packages.big7_feature_6', 'Packages', 'Gói toàn diện ý 6', '#packages .package-featured .package-features li:nth-child(6) span:last-child', 'html', '', 'Tặng file PDF tóm tắt đầy đủ'),
    lc(true, 'packages.big7_button', 'Packages', 'Nút gói toàn diện', '#pkg-big7', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.big3_name', 'Packages', 'Tên gói big 3', '#packages .package-card:nth-child(3) .package-name', 'html', '', 'Phân Tích 3 Chỉ Số<br/>Tính Cách Nổi Bật'),
    lc(true, 'packages.big3_price', 'Packages', 'Giá gói big 3', '#packages .package-card:nth-child(3) .price-current', 'html', '', '1.000.000<sup>đ</sup>'),
    lc(true, 'packages.big3_unit', 'Packages', 'Đơn vị giá gói big 3', '#packages .package-card:nth-child(3) .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.big3_feature_1', 'Packages', 'Gói big 3 ý 1', '#packages .package-card:nth-child(3) .package-features li:nth-child(1) span:last-child', 'html', '', 'Phân tích <strong>BIG 3</strong>: chủ đạo · linh hồn · sứ mệnh'),
    lc(true, 'packages.big3_feature_2', 'Packages', 'Gói big 3 ý 2', '#packages .package-card:nth-child(3) .package-features li:nth-child(2) span:last-child', 'html', '', '<strong>4 đỉnh cao</strong> trong cuộc đời'),
    lc(true, 'packages.big3_feature_3', 'Packages', 'Gói big 3 ý 3', '#packages .package-card:nth-child(3) .package-features li:nth-child(3) span:last-child', 'html', '', '<strong>3 chu kỳ</strong> cuộc đời lớn'),
    lc(true, 'packages.big3_feature_4', 'Packages', 'Gói big 3 ý 4', '#packages .package-card:nth-child(3) .package-features li:nth-child(4) span:last-child', 'html', '', 'Định hướng học tập, công việc & quan hệ'),
    lc(true, 'packages.big3_feature_5', 'Packages', 'Gói big 3 ý 5', '#packages .package-card:nth-child(3) .package-features li:nth-child(5) span:last-child', 'html', '', 'Thông điệp chữa lành & lộ trình cá nhân'),
    lc(true, 'packages.big3_button', 'Packages', 'Nút gói big 3', '#pkg-big3', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.session_1', 'Packages', 'Thông tin buổi tư vấn 1', '#packages .session-info-item:nth-child(1) span:last-child', 'html', '', 'Thời gian mỗi buổi tư vấn: <strong>tối đa 2 tiếng</strong>'),
    lc(true, 'packages.session_2', 'Packages', 'Thông tin buổi tư vấn 2', '#packages .session-info-item:nth-child(3) span:last-child', 'html', '', 'Yêu cầu sắp xếp lịch trước <strong>ít nhất 1 ngày</strong>'),
    lc(true, 'packages.session_3', 'Packages', 'Thông tin buổi tư vấn 3', '#packages .session-info-item:nth-child(5) span:last-child', 'html', '', 'Nếu lựa chọn xem hình thức offline, tụi mình phụ thu thêm chi phí xăng xe là <strong>50.000đ</strong> cho các gói dưới 2.000.000đ nhé.'),

    lc(true, 'process.tag', 'Process', 'Tag section', '#process .section-tag', 'text', '', 'Hành Trình'),
    lc(true, 'process.title', 'Process', 'Tiêu đề section', '#process .section-title', 'text', '', 'Chỉ 3 Bước Đơn Giản'),
    lc(true, 'process.step_1_title', 'Process', 'Bước 1 tiêu đề', '#process .process-step:nth-child(1) h3', 'text', '', 'Đặt Lịch'),
    lc(true, 'process.step_1_body', 'Process', 'Bước 1 nội dung', '#process .process-step:nth-child(1) p', 'text', '', 'Chọn thời gian phù hợp với lịch trình của bạn. Linh hoạt theo nguyện vọng cá nhân.'),
    lc(true, 'process.step_2_title', 'Process', 'Bước 2 tiêu đề', '#process .process-step:nth-child(2) h3', 'text', '', 'Chia Sẻ'),
    lc(true, 'process.step_2_body', 'Process', 'Bước 2 nội dung', '#process .process-step:nth-child(2) p', 'text', '', 'Chia sẻ những điều đang khiến bạn trăn trở, những câu hỏi chưa có lời giải.'),
    lc(true, 'process.step_3_title', 'Process', 'Bước 3 tiêu đề', '#process .process-step:nth-child(3) h3', 'text', '', 'Nhận Định Hướng'),
    lc(true, 'process.step_3_body', 'Process', 'Bước 3 nội dung', '#process .process-step:nth-child(3) p', 'text', '', 'Nhận thông điệp chữa lành và lộ trình cá nhân hoá để tự tin bước tiếp.'),
    lc(true, 'process.quote_1', 'Process', 'Quote dòng thường', '#process .process-quote span', 'text', '', 'Đôi khi chỉ cần hiểu đúng bản thân,'),
    lc(true, 'process.quote_2', 'Process', 'Quote dòng nhấn', '#process .process-quote em', 'text', '', 'Mọi thứ sẽ dần rõ ràng hơn'),

    lc(true, 'contact.tag', 'Contact', 'Tag section', '#contact .section-tag', 'text', '', 'Liên Hệ'),
    lc(true, 'contact.title', 'Contact', 'Tiêu đề section', '#contact .section-title', 'html', '', 'Bắt Đầu Hành Trình<br />Khám Phá Bản Thân'),
    lc(true, 'contact.info_title', 'Contact', 'Tiêu đề khối liên hệ', '#contact .contact-card h3', 'html', '', '<i class="fa-solid fa-sparkles" style="color: var(--color-gold-light); margin-right: 8px;"></i>Thông Tin Liên Hệ'),
    lc(true, 'contact.item_1_title', 'Contact', 'Liên hệ dòng 1 tiêu đề', '#contact .contact-card .contact-item:nth-of-type(1) strong', 'text', '', 'Zalo / Facebook'),
    lc(true, 'contact.item_1_body', 'Contact', 'Liên hệ dòng 1 nội dung', '#contact .contact-card .contact-item:nth-of-type(1) p', 'text', '', 'Nhắn tin để đặt lịch nhanh nhất'),
    lc(true, 'contact.item_2_title', 'Contact', 'Liên hệ dòng 2 tiêu đề', '#contact .contact-card .contact-item:nth-of-type(2) strong', 'text', '', 'Giờ làm việc'),
    lc(true, 'contact.item_2_body', 'Contact', 'Liên hệ dòng 2 nội dung', '#contact .contact-card .contact-item:nth-of-type(2) p', 'text', '', 'Thứ 2 – Chủ Nhật: 8:00 – 21:00'),
    lc(true, 'contact.form_title', 'Contact', 'Tiêu đề form', '#booking-form h3', 'html', '', '<i class="fa-regular fa-calendar-check" style="color: var(--color-gold-light); margin-right: 8px;"></i>Đặt Lịch Tư Vấn'),
    lc(true, 'contact.name_label', 'Contact', 'Form nhãn họ tên', '#booking-form label[for="name"]', 'text', '', 'Họ và Tên *'),
    lc(true, 'contact.name_placeholder', 'Contact', 'Form placeholder họ tên', '#name', 'placeholder', '', 'Nhập họ và tên của bạn'),
    lc(true, 'contact.dob_label', 'Contact', 'Form nhãn ngày sinh', '#booking-form label[for="dob"]', 'text', '', 'Ngày tháng năm sinh (trên giấy tờ - hoặc có nhiều ngày sinh hãy nhập ngày mà bạn thực sự mong muốn xem) *'),
    lc(true, 'contact.phone_label', 'Contact', 'Form nhãn điện thoại', '#booking-form label[for="phone"]', 'text', '', 'Số Điện Thoại / Zalo *'),
    lc(true, 'contact.phone_placeholder', 'Contact', 'Form placeholder điện thoại', '#phone', 'placeholder', '', 'Số điện thoại liên lạc'),
    lc(true, 'contact.type_label', 'Contact', 'Form nhãn hình thức', '#booking-form label[for="consultation-type"]', 'text', '', 'Hình Thức *'),
    lc(true, 'contact.email_label', 'Contact', 'Form nhãn email', '#booking-form label[for="email"]', 'text', '', 'Email *'),
    lc(true, 'contact.email_placeholder', 'Contact', 'Form placeholder email', '#email', 'placeholder', '', 'Email để nhận xác nhận đặt lịch'),
    lc(true, 'contact.concern_label', 'Contact', 'Form nhãn trăn trở', '#booking-form label[for="concern"]', 'text', '', 'Điều Bạn Đang Trăn Trở'),
    lc(true, 'contact.concern_placeholder', 'Contact', 'Form placeholder trăn trở', '#concern', 'placeholder', '', 'Chia sẻ những điều bạn muốn tìm hiểu hoặc vấn đề bạn đang gặp phải...'),
    lc(true, 'contact.submit', 'Contact', 'Nút gửi form', '#submit-booking span', 'text', '', 'Chọn Lịch & Thanh Toán'),
    lc(true, 'contact.note', 'Contact', 'Ghi chú form', '#booking-form .form-note', 'text', '', 'Bước tiếp theo: chọn ngày giờ phù hợp và hoàn tất thanh toán ✨'),

    lc(true, 'footer.title_contact', 'Footer', 'Footer cột liên hệ', '.footer-contact-col .footer-title', 'text', '', 'LIÊN HỆ'),
    lc(true, 'footer.desc', 'Footer', 'Footer mô tả', '.footer-contact-col .footer-desc', 'text', '', 'Tìm hiểu thêm qua các nền tảng mạng xã hội của Clow Cat Patronus:'),
    lc(true, 'footer.tagline', 'Footer', 'Footer tagline', '.footer-tagline', 'text', '', 'KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG'),
    lc(true, 'footer.title_services', 'Footer', 'Footer cột dịch vụ', '.footer-links-col .footer-title', 'text', '', 'DỊCH VỤ'),
    lc(true, 'footer.link_1', 'Footer', 'Footer link 1', '.footer-links-list li:nth-child(1) a', 'text', '', 'Gói Khám Phá'),
    lc(true, 'footer.link_2', 'Footer', 'Footer link 2', '.footer-links-list li:nth-child(2) a', 'text', '', 'Gói Kết Nối'),
    lc(true, 'footer.link_3', 'Footer', 'Footer link 3', '.footer-links-list li:nth-child(3) a', 'text', '', 'Gói Toàn Diện'),
    lc(true, 'footer.copyright', 'Footer', 'Dòng bản quyền', '.footer-bottom p:nth-child(1)', 'text', '', '© 2026 ClowCat Patronus. Tất cả quyền được bảo lưu.'),
    lc(true, 'footer.made_with', 'Footer', 'Dòng năng lượng', '.footer-made-with', 'text', '', '✦ Được tạo ra với tình yêu và năng lượng tích cực ✦'),
  ];
}

function getSpreadsheetByIdOrActive() {
  if (SPREADSHEET_ID && !SPREADSHEET_ID.includes('PASTE_')) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function cleanValue(value) {
  return String(value || '').trim();
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
