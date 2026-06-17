// =============================================
//  CLOW CAT – LANDING CONTENT GOOGLE APPS SCRIPT
//  File này chỉ dùng cho Sheet chỉnh nội dung Landing Page.
// =============================================

const SPREADSHEET_ID = '1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const SCRIPT_VERSION = '2026-06-14-v16-cache-order';
const ADMIN_DEFAULT_USERNAME = 'admin';
const ADMIN_DEFAULT_PASSWORD = 'admin123';
const ADMIN_SESSION_SECONDS = 21600;
const LANDING_CONTENT_CACHE_KEY = 'landing_content_payload_v16';
const LANDING_CONTENT_CACHE_SECONDS = 300;
const VIETNAM_TIMEZONE = 'Asia/Ho_Chi_Minh';
const ADMIN_SHEET_DATE_FORMAT = 'dd/MM/yyyy HH:mm:ss';
const IMGBB_API_KEY = '';
const FEEDBACK_IMAGES_SHEET_NAME = 'Feedback images';
const FEEDBACK_IMAGES_HEADERS = ['Ngày tạo', 'Tên file', 'URL', 'File ID', 'Người upload'];
const FEEDBACK_DRIVE_FOLDER_NAME = 'ClowCat Landing Feedback Images';
const PACKAGES_SHEET_NAME = 'Packages';
const PAYMENT_SETTINGS_SHEET_NAME = 'Payment settings';
const SEPAY_SECRET_KEY_PROPERTY = 'SEPAY_SECRET_KEY';
const SECTIONS_LAYOUT_SHEET_NAME = 'Sections layout';
const SECTIONS_LAYOUT_HEADERS = [
  'Bật',
  'ID',
  'Loại',
  'Tên hiển thị',
  'Thứ tự',
  'Tiêu đề',
  'Nội dung HTML'
];
const PACKAGES_HEADERS = [
  'Bật',
  'Mã gói',
  'Tên gói',
  'Giá online',
  'Giá offline',
  'Đơn vị',
  'Icon',
  'Màu nhấn',
  'Nổi bật',
  'Badge',
  'Quyền lợi',
  'Nút',
  'Thứ tự',
];
const PAYMENT_SETTINGS_HEADERS = ['Khóa', 'Nội dung', 'Mô tả'];
const DEFAULT_PAYMENT_SETTINGS = {
  sepayEnabled: 'false',
  bankName: 'Vietcombank',
  bankBin: '970436',
  bankAccount: '0421003904479',
  bankAccountName: 'LÊ CHÍ CƯỜNG',
  sepayBankName: 'BIDV',
  sepayBankAccount: '96247031088CUONG',
  sepayEnv: 'sandbox',
  sepayMerchantId: '',
  sepayCheckoutUrl: '',
  sepayOrderPrefix: 'CCP',
  paymentTimeoutMinutes: '15',
  thankYouUrl: 'thankyou.html',
};
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
const ADMIN_USERS_HEADERS = [
  'Bật',
  'Tên đăng nhập',
  'Tên hiển thị',
  'Vai trò',
  'Muối',
  'Mật khẩu hash',
  'Ngày tạo',
  'Ngày cập nhật',
  'Lần đăng nhập cuối',
];

function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('Clow Cat')
    .addItem('Tạo bảng nội dung landing page', 'initializeLandingContentSheet')
    .addItem('Đồng bộ dòng nội dung mới', 'syncLandingContentSheet')
    .addSeparator()
    .addItem('Sửa định dạng ngày giờ Admin users', 'repairAdminUserDateFormats')
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

function doPost(e) {
  const params = parseRequestParams(e);
  const action = cleanValue(params.action);

  try {
    if (action === 'loginAdmin') return handleAdminLogin(params);
    if (action === 'logoutAdmin') return handleAdminLogout(params);
    if (action === 'getAdminContent') return handleGetAdminContent(params);
    if (action === 'saveLandingContentItem') return handleSaveLandingContentItem(params);
    if (action === 'saveLandingContentBatch') return handleSaveLandingContentBatch(params);
    if (action === 'changeAdminPassword') return handleChangeAdminPassword(params);
    if (action === 'listAdminUsers') return handleListAdminUsers(params);
    if (action === 'createAdminUser') return handleCreateAdminUser(params);
    if (action === 'setAdminUserStatus') return handleSetAdminUserStatus(params);
    if (action === 'syncLandingContentTemplate') return handleSyncLandingContentTemplate(params);
    if (action === 'savePackage') return handleSavePackage(params);
    if (action === 'savePackageOrder') return handleSavePackageOrder(params);
    if (action === 'deletePackage') return handleDeletePackage(params);
    if (action === 'savePaymentSettings') return handleSavePaymentSettings(params);
    if (action === 'uploadFeedbackImage') return handleUploadFeedbackImage(params);
    if (action === 'saveFeedbackImage') return handleSaveFeedbackImage(params);
    if (action === 'deleteFeedbackImage') return handleDeleteFeedbackImage(params);
    if (action === 'saveSectionsLayoutOrder') return handleSaveSectionsLayoutOrder(params);
    if (action === 'saveGenericSection') return handleSaveGenericSection(params);
    if (action === 'deleteSection') return handleDeleteSection(params);

    return jsonResponse({ ok: false, message: 'Action khong hop le', scriptVersion: SCRIPT_VERSION });
  } catch (error) {
    return jsonResponse({ ok: false, message: error.message, scriptVersion: SCRIPT_VERSION });
  }
}

// =============================================
//  Landing content config – đọc nội dung website từ Google Sheet
// =============================================
function handleGetLandingContent() {
  const cachedPayload = getLandingContentPayloadFromCache();
  if (cachedPayload) return jsonResponse(cachedPayload);

  const payload = buildLandingContentPayload();
  putLandingContentPayloadToCache(payload);
  return jsonResponse(payload);
}

function buildLandingContentPayload() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) {
    return {
      ok: true,
      items: [],
      packages: getPackages(false),
      feedbackImages: getFeedbackImages(),
      paymentSettings: getPaymentSettings(false),
      sectionsLayout: getSectionsLayout(false),
      message: 'Chua co tab Landing content. Hay chay initializeLandingContentSheet mot lan trong Apps Script.',
      scriptVersion: SCRIPT_VERSION,
    };
  }

  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, items: [], packages: getPackages(false), feedbackImages: getFeedbackImages(), paymentSettings: getPaymentSettings(false), sectionsLayout: getSectionsLayout(false), scriptVersion: SCRIPT_VERSION };
  }

  const range = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const indexes = getLandingContentHeaderIndexes();
  const templateRowsByKey = getLandingContentTemplateRowsByKey();
  const items = values
    .map((row, rowIndex) => landingContentRowToItem(row, displayValues[rowIndex], indexes, templateRowsByKey))
    .filter((item) => item.enabled && item.selector && item.value !== '');

  return {
    ok: true,
    items: items,
    count: items.length,
    feedbackImages: getFeedbackImages(),
    packages: getPackages(false),
    paymentSettings: getPaymentSettings(false),
    sectionsLayout: getSectionsLayout(false),
    scriptVersion: SCRIPT_VERSION,
  };
}

function getLandingContentPayloadFromCache() {
  try {
    const raw = CacheService.getScriptCache().get(LANDING_CONTENT_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    return null;
  }
}

function putLandingContentPayloadToCache(payload) {
  try {
    CacheService.getScriptCache().put(LANDING_CONTENT_CACHE_KEY, JSON.stringify(payload), LANDING_CONTENT_CACHE_SECONDS);
  } catch (error) {
    console.warn('Khong luu duoc landing content cache:', error);
  }
}

function clearLandingContentCache() {
  try {
    CacheService.getScriptCache().remove(LANDING_CONTENT_CACHE_KEY);
  } catch (error) {
    console.warn('Khong xoa duoc landing content cache:', error);
  }
}

function handleGetAdminContent(params) {
  requireAdminSession(params.token);
  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) {
    return jsonResponse({
      ok: true,
      items: [],
      sections: [],
      packages: getPackages(true),
      feedbackImages: getFeedbackImages(),
      paymentSettings: getPaymentSettings(true),
      sectionsLayout: getSectionsLayout(true),
      message: 'Chua co tab Landing content. Hay chay initializeLandingContentSheet mot lan.',
      scriptVersion: SCRIPT_VERSION,
    });
  }

  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ ok: true, items: [], sections: [], packages: getPackages(true), feedbackImages: getFeedbackImages(), paymentSettings: getPaymentSettings(true), sectionsLayout: getSectionsLayout(true), scriptVersion: SCRIPT_VERSION });
  }

  const range = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length);
  const values = range.getValues();
  const displayValues = range.getDisplayValues();
  const indexes = getLandingContentHeaderIndexes();
  const templateRowsByKey = getLandingContentTemplateRowsByKey();
  const sectionsMap = {};
  const items = values
    .map((row, rowIndex) => {
      const item = landingContentRowToItem(row, displayValues[rowIndex], indexes, templateRowsByKey);
      item.rowNumber = rowIndex + 2;
      return item;
    })
    .filter((item) => item.key);

  items.forEach((item) => {
    if (!sectionsMap[item.section]) {
      sectionsMap[item.section] = {
        name: item.section || 'Khac',
        count: 0,
        enabledCount: 0,
      };
    }
    sectionsMap[item.section].count += 1;
    if (item.enabled) sectionsMap[item.section].enabledCount += 1;
  });

  return jsonResponse({
    ok: true,
    items: items,
    sections: Object.keys(sectionsMap).map((key) => sectionsMap[key]),
    count: items.length,
    feedbackImages: getFeedbackImages(),
    packages: getPackages(true),
    paymentSettings: getPaymentSettings(true),
    sectionsLayout: getSectionsLayout(true),
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSaveLandingContentItem(params) {
  requireAdminSession(params.token);
  const key = cleanValue(params.key);
  if (!key) throw new Error('Thieu khoa noi dung can luu.');

  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) throw new Error('Chua co tab Landing content.');

  const rowNumber = findLandingContentRowNumberByKey(sheet, key);
  if (!rowNumber) throw new Error('Khong tim thay khoa: ' + key);

  const indexes = getLandingContentHeaderIndexes();
  if (params.enabled !== undefined && params.enabled !== null && String(params.enabled) !== '') {
    sheet.getRange(rowNumber, indexes['Bật'] + 1).setValue(isTruthy(params.enabled));
  }
  sheet.getRange(rowNumber, indexes['Nội dung'] + 1).setValue(params.value == null ? '' : String(params.value));
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    key: key,
    message: 'Da luu noi dung',
    savedAt: new Date().toISOString(),
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSaveLandingContentBatch(params) {
  requireAdminSession(params.token);
  const rawItems = cleanValue(params.items);
  if (!rawItems) throw new Error('Thieu danh sach noi dung can luu.');

  let items;
  try {
    items = JSON.parse(rawItems);
  } catch (error) {
    throw new Error('Danh sach noi dung khong dung dinh dang JSON.');
  }
  if (!Array.isArray(items)) throw new Error('Danh sach noi dung phai la mang.');

  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (!sheet) throw new Error('Chua co tab Landing content.');

  const indexes = getLandingContentHeaderIndexes();
  const rowByKey = getLandingContentRowsByKey(sheet);
  let saved = 0;
  items.forEach((item) => {
    const key = cleanValue(item.key);
    const rowNumber = rowByKey[key];
    if (!key || !rowNumber) return;

    if (item.enabled !== undefined && item.enabled !== null) {
      sheet.getRange(rowNumber, indexes['Bật'] + 1).setValue(isTruthy(item.enabled));
    }
    sheet.getRange(rowNumber, indexes['Nội dung'] + 1).setValue(item.value == null ? '' : String(item.value));
    saved += 1;
  });
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    saved: saved,
    message: 'Da luu ' + saved + ' muc noi dung',
    savedAt: new Date().toISOString(),
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSyncLandingContentTemplate(params) {
  requireAdminSession(params.token);
  const result = syncLandingContentSheet();
  ensurePackagesSheet();
  ensurePaymentSettingsSheet();
  clearLandingContentCache();
  return jsonResponse({
    ok: true,
    result: result,
    message: 'Da dong bo template noi dung',
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
    ensurePackagesSheet();
    ensurePaymentSettingsSheet();
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
  ensurePackagesSheet();
  ensurePaymentSettingsSheet();
  return { ok: true, mode: 'synced', added: rowsToAppend.length, totalTemplateRows: rows.length };
}

function lc(enabled, key, section, description, selector, type, attribute, value) {
  return [enabled, key, section, description, selector, type || 'text', attribute || '', value || ''];
}

function buildDefaultLandingContentRows() {
  return [
    lc(true, 'meta.title', 'Cấu Hình SEO', 'Tiêu đề tab trình duyệt', 'title', 'text', '', 'Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus'),
    lc(true, 'meta.description', 'Cấu Hình SEO', 'Mô tả SEO', 'meta[name="description"]', 'attr', 'content', 'Khám phá bản thân qua Nhân Số Học. Hơn 3 năm kinh nghiệm, 800+ ca tư vấn. Hiểu mình hơn – Sống đúng hướng hơn. Đặt lịch tư vấn ngay!'),
    lc(true, 'meta.og_title', 'Cấu Hình SEO', 'Tiêu đề khi chia sẻ link', 'meta[property="og:title"]', 'attr', 'content', 'Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus'),
    lc(true, 'meta.og_description', 'Cấu Hình SEO', 'Mô tả khi chia sẻ link', 'meta[property="og:description"]', 'attr', 'content', 'Tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh và hành trình phát triển của chính mình.'),

    lc(true, 'nav.about', 'Menu', 'Menu Về chúng tôi', '#nav-links li:nth-child(1) .nav-link', 'text', '', 'Về Chúng Tôi'),
    lc(true, 'nav.benefits', 'Menu', 'Menu lợi ích', '#nav-links li:nth-child(2) .nav-link', 'text', '', 'Những Gì Bạn Nhận Được'),
    lc(true, 'nav.testimonials', 'Menu', 'Menu feedback', '#nav-links li:nth-child(3) .nav-link', 'text', '', 'Khách Hàng Nghĩ Gì?'),
    lc(true, 'nav.packages', 'Menu', 'Menu gói tư vấn', '#nav-links li:nth-child(4) .nav-link', 'text', '', 'Gói Tư Vấn'),
    lc(true, 'nav.process', 'Menu', 'Menu hành trình', '#nav-links li:nth-child(5) .nav-link', 'text', '', 'Hành Trình'),
    lc(true, 'nav.contact', 'Menu', 'Menu CTA', '#nav-links li:nth-child(6) .nav-link', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'nav.logo_text', 'Menu', 'Tên cạnh logo', '.nav-logo .logo-text', 'text', '', 'Clow Cat Patronus'),

    lc(true, 'hero.badge', 'Trang Chủ', 'Badge đầu trang', '.hero-badge', 'text', '', '✦ Hơn 800 ca tư vấn thực tế ✦'),
    lc(true, 'hero.title_1', 'Trang Chủ', 'Dòng tiêu đề 1', '.hero-title .title-line:nth-child(1)', 'text', '', 'NHÂN SỐ HỌC'),
    lc(true, 'hero.title_2', 'Trang Chủ', 'Dòng tiêu đề 2', '.hero-title .title-line:nth-child(2)', 'text', '', 'KHAI PHÁ'),
    lc(true, 'hero.title_3', 'Trang Chủ', 'Dòng tiêu đề 3', '.hero-title .title-line:nth-child(3)', 'text', '', 'TIỀM NĂNG'),
    lc(true, 'hero.subtitle', 'Trang Chủ', 'Mô tả hero', '.hero-subtitle', 'text', '', 'Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh và hành trình phát triển của chính mình'),
    lc(true, 'hero.stat_1_number', 'Trang Chủ', 'Số thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-number', 'text', '', '3+'),
    lc(true, 'hero.stat_1_label', 'Trang Chủ', 'Nhãn thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-label', 'text', '', 'Năm kinh nghiệm'),
    lc(true, 'hero.stat_2_number', 'Trang Chủ', 'Số thống kê 2', '.hero-stats .stat-item:nth-child(3) .stat-number', 'text', '', '800+'),
    lc(true, 'hero.stat_2_label', 'Trang Chủ', 'Nhãn thống kê 2', '.hero-stats .stat-item:nth-child(3) .stat-label', 'text', '', 'Ca tư vấn'),
    lc(true, 'hero.stat_3_number', 'Trang Chủ', 'Số thống kê 3', '.hero-stats .stat-item:nth-child(5) .stat-number', 'text', '', '100%'),
    lc(true, 'hero.stat_3_label', 'Trang Chủ', 'Nhãn thống kê 3', '.hero-stats .stat-item:nth-child(5) .stat-label', 'text', '', 'Cá nhân hoá'),
    lc(true, 'hero.cta_primary', 'Trang Chủ', 'Nút chính', '#hero-cta-primary span', 'text', '', 'Đặt Lịch Tư Vấn'),
    lc(true, 'hero.cta_secondary', 'Trang Chủ', 'Nút phụ', '#hero-cta-secondary', 'text', '', 'Tìm Hiểu Thêm'),
    lc(true, 'hero.scroll_label', 'Trang Chủ', 'Chữ cuộn xuống', '.scroll-indicator span', 'text', '', 'Cuộn xuống'),

    lc(true, 'pain.tag', 'Vấn Đề', 'Tag section', '#pain-points .section-tag', 'text', '', 'Bạn Đang Gặp Phải?'),
    lc(true, 'pain.title', 'Vấn Đề', 'Tiêu đề section', '#pain-points .section-title', 'text', '', 'Những Câu Hỏi Chưa Có Lời Giải'),
    lc(true, 'pain.card_1', 'Vấn Đề', 'Nội dung card 1', '#pain-points .pain-card:nth-child(1) p', 'html', '', 'Mơ hồ về <strong>định hướng học tập, công việc</strong> hay tương lai?'),
    lc(true, 'pain.card_2', 'Vấn Đề', 'Nội dung card 2', '#pain-points .pain-card:nth-child(2) p', 'html', '', 'Bế tắc trong các <strong>mối quan hệ</strong> và cảm xúc?'),
    lc(true, 'pain.card_3', 'Vấn Đề', 'Nội dung card 3', '#pain-points .pain-card:nth-child(3) p', 'html', '', 'Cảm thấy bản thân có nhiều <strong>tiềm năng</strong> nhưng chưa biết cách phát huy?'),
    lc(true, 'pain.card_4', 'Vấn Đề', 'Nội dung card 4', '#pain-points .pain-card:nth-child(4) p', 'html', '', 'Đứng giữa những <strong>lựa chọn quan trọng</strong> nhưng không biết đâu là hướng đi phù hợp?'),
    lc(true, 'pain.conclusion', 'Vấn Đề', 'Kết luận dưới card', '#pain-points .pain-conclusion p', 'html', '', '<i class="fa-solid fa-sparkles" style="color: var(--color-gold-light); margin-right: 8px;"></i> <strong>Nhân Số Học</strong> là tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh, điểm yếu và hành trình phát triển của chính mình.'),

    lc(true, 'about.tag', 'Về Chúng Tôi', 'Tag section', '#about .section-tag', 'text', '', 'Về Chúng Tôi'),
    lc(true, 'about.title', 'Về Chúng Tôi', 'Tiêu đề section', '#about .section-title', 'text', '', 'Những Người Đồng Hành'),
    lc(true, 'about.video_id', 'Về Chúng Tôi', 'Link Youtube', '#about iframe', 'attr', 'data-youtube-embed', 'https://www.youtube.com/watch?v=7KYlOuSyGPQ'),
    lc(true, 'about.mentor_1_img', 'Về Chúng Tôi', 'Link ảnh mentor 1', '#mentor1-img', 'src', '', 'assets/images/mentor_bao.png'),
    lc(true, 'about.mentor_1_name', 'Về Chúng Tôi', 'Tên mentor 1', '#about .mentor-block:nth-child(1) .mentor-name', 'text', '', 'Phan Thái Bảo'),
    lc(true, 'about.mentor_1_desc', 'Về Chúng Tôi', 'Mô tả mentor 1', '#about .mentor-block:nth-child(1) .mentor-desc', 'text', '', 'Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của những lá bài Clow huyền bí.'),
    lc(true, 'about.mentor_1_feature_1', 'Về Chúng Tôi', 'Mentor 1 ý 1', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(1) span', 'html', '', 'Hơn <strong>10 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ bài Clow'),
    lc(true, 'about.mentor_1_feature_2', 'Về Chúng Tôi', 'Mentor 1 ý 2', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(2) span', 'html', '', 'Đã tư vấn cho hơn <strong>1.000 khách hàng</strong>'),
    lc(true, 'about.mentor_1_feature_3', 'Về Chúng Tôi', 'Mentor 1 ý 3', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(3) span', 'html', '', 'Khai giảng từ <strong>2019</strong>, hơn <strong>20 khoá học</strong> với <strong>120+ học viên</strong>'),
    lc(true, 'about.mentor_1_feature_4', 'Về Chúng Tôi', 'Mentor 1 ý 4', '#about .mentor-block:nth-child(1) .mentor-feature-card:nth-child(4) span', 'html', '', 'Tổ chức hơn <strong>10 buổi workshop</strong> từ 2024 với chủ đề Ứng dụng Huyền Học và Bài Clow để HIỂU & THƯƠNG'),
    lc(true, 'about.mentor_2_img', 'Về Chúng Tôi', 'Link ảnh mentor 2', '#mentor2-img', 'src', '', 'assets/images/mentor_cuong.png'),
    lc(true, 'about.mentor_2_name', 'Về Chúng Tôi', 'Tên mentor 2', '#about .mentor-block:nth-child(2) .mentor-name', 'text', '', 'Lê Chí Cường'),
    lc(true, 'about.mentor_2_desc', 'Về Chúng Tôi', 'Mô tả mentor 2', '#about .mentor-block:nth-child(2) .mentor-desc', 'text', '', 'Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của nhân số học.'),
    lc(true, 'about.mentor_2_feature_1', 'Về Chúng Tôi', 'Mentor 2 ý 1', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(1) span', 'html', '', 'Hơn <strong>3 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ môn nhân số học'),
    lc(true, 'about.mentor_2_feature_2', 'Về Chúng Tôi', 'Mentor 2 ý 2', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(2) span', 'html', '', 'Đã tư vấn nhân số cho hơn <strong>900 khách hàng</strong>'),
    lc(true, 'about.mentor_2_feature_3', 'Về Chúng Tôi', 'Mentor 2 ý 3', '#about .mentor-block:nth-child(2) .mentor-feature-card:nth-child(3) span', 'html', '', 'Luôn hỗ trợ và đồng hành cùng các buổi Workshop của Clow Cat Patronus'),
    lc(true, 'methods.tag', 'Ba Lăng Kính', 'Tag section', '#methods .section-tag', 'text', '', 'GÓI TƯ VẤN LINH HOẠT 3 TRONG 1'),
    lc(true, 'methods.title', 'Ba Lăng Kính', 'Tiêu đề section', '#methods .section-title', 'html', '', 'Một Buổi Tư Vấn, <em>Ba Lăng Kính Soi Chiếu</em>'),
    lc(true, 'methods.desc', 'Ba Lăng Kính', 'Mô tả section', '#methods .section-desc', 'html', '', 'Chọn góc nhìn bạn muốn đào sâu hoặc kết hợp cả ba hệ quy chiếu để nhận được<br/>bức tranh rõ hơn về câu chuyện hiện tại của mình.'),
    
    lc(true, 'methods.clow_letter', 'Ba Lăng Kính', 'Clow - Chữ cái', '.method-clow .method-letter', 'text', '', 'C'),
    lc(true, 'methods.clow_subtitle', 'Ba Lăng Kính', 'Clow - Subtitle', '.method-clow .method-subtitle', 'text', '', 'CLOW GUIDANCE'),
    lc(true, 'methods.clow_title', 'Ba Lăng Kính', 'Clow - Tiêu đề', '.method-clow .method-title', 'text', '', 'Bài Clow'),
    lc(true, 'methods.clow_desc', 'Ba Lăng Kính', 'Clow - Mô tả', '.method-clow .method-desc', 'text', '', 'Lắng nghe thông điệp từ từng lá bài để nhìn rõ điều đang mắc kẹt.'),
    lc(true, 'methods.clow_tag1', 'Ba Lăng Kính', 'Clow - Tag 1', '.method-clow .method-tags span:nth-child(1)', 'text', '', 'Chữa lành'),
    lc(true, 'methods.clow_tag2', 'Ba Lăng Kính', 'Clow - Tag 2', '.method-clow .method-tags span:nth-child(2)', 'text', '', 'Định hướng'),
    lc(true, 'methods.clow_back_title', 'Ba Lăng Kính', 'Clow - Tiêu đề sau', '.method-clow .method-back-title', 'text', '', 'Thông điệp và lộ trình hành động'),
    lc(true, 'methods.clow_back_desc', 'Ba Lăng Kính', 'Clow - Mô tả sau', '.method-clow .method-back-desc', 'text', '', 'Bài Clow giúp bạn gọi tên năng lượng hiện tại, nhận diện rào cản cảm xúc và chọn bước đi gần nhất phù hợp với hoàn cảnh thật.'),
    lc(true, 'methods.clow_back_item1', 'Ba Lăng Kính', 'Clow - Bullet 1', '.method-clow .method-back-list li:nth-child(1) span', 'text', '', 'Phân tích chủ đề trọng tâm'),
    lc(true, 'methods.clow_back_item2', 'Ba Lăng Kính', 'Clow - Bullet 2', '.method-clow .method-back-list li:nth-child(2) span', 'text', '', 'Gợi ý hành động dễ áp dụng'),
    lc(true, 'methods.clow_back_item3', 'Ba Lăng Kính', 'Clow - Bullet 3', '.method-clow .method-back-list li:nth-child(3) span', 'text', '', 'Thông điệp chữa lành cá nhân'),

    lc(true, 'methods.astro_letter', 'Ba Lăng Kính', 'Astro - Chữ cái', '.method-astro .method-letter', 'text', '', 'A'),
    lc(true, 'methods.astro_subtitle', 'Ba Lăng Kính', 'Astro - Subtitle', '.method-astro .method-subtitle', 'text', '', 'ASTROLOGY MAP'),
    lc(true, 'methods.astro_title', 'Ba Lăng Kính', 'Astro - Tiêu đề', '.method-astro .method-title', 'text', '', 'Chiêm tinh'),
    lc(true, 'methods.astro_desc', 'Ba Lăng Kính', 'Astro - Mô tả', '.method-astro .method-desc', 'text', '', 'Quan sát nhịp vận hành, xu hướng tính cách và thời điểm chuyển mình.'),
    lc(true, 'methods.astro_tag1', 'Ba Lăng Kính', 'Astro - Tag 1', '.method-astro .method-tags span:nth-child(1)', 'text', '', 'Bản đồ sao'),
    lc(true, 'methods.astro_tag2', 'Ba Lăng Kính', 'Astro - Tag 2', '.method-astro .method-tags span:nth-child(2)', 'text', '', 'Chu kỳ'),
    lc(true, 'methods.astro_back_title', 'Ba Lăng Kính', 'Astro - Tiêu đề sau', '.method-astro .method-back-title', 'text', '', 'Hiểu nhịp vận hành cá nhân'),
    lc(true, 'methods.astro_back_desc', 'Ba Lăng Kính', 'Astro - Mô tả sau', '.method-astro .method-back-desc', 'text', '', 'Chiêm tinh bổ sung góc nhìn về khí chất, cách phản ứng, nhu cầu cảm xúc và những giai đoạn nên tiến, nên lùi hoặc nên chuẩn bị kỹ hơn.'),
    lc(true, 'methods.astro_back_item1', 'Ba Lăng Kính', 'Astro - Bullet 1', '.method-astro .method-back-list li:nth-child(1) span', 'text', '', 'Nhận diện thế mạnh tự nhiên'),
    lc(true, 'methods.astro_back_item2', 'Ba Lăng Kính', 'Astro - Bullet 2', '.method-astro .method-back-list li:nth-child(2) span', 'text', '', 'Đọc xu hướng giai đoạn hiện tại'),
    lc(true, 'methods.astro_back_item3', 'Ba Lăng Kính', 'Astro - Bullet 3', '.method-astro .method-back-list li:nth-child(3) span', 'text', '', 'Gợi ý cách ra quyết định hài hòa'),

    lc(true, 'methods.numero_letter', 'Ba Lăng Kính', 'Numero - Chữ cái', '.method-numero .method-letter', 'text', '', 'N'),
    lc(true, 'methods.numero_subtitle', 'Ba Lăng Kính', 'Numero - Subtitle', '.method-numero .method-subtitle', 'text', '', 'NUMEROLOGY CODE'),
    lc(true, 'methods.numero_title', 'Ba Lăng Kính', 'Numero - Tiêu đề', '.method-numero .method-title', 'text', '', 'Nhân số'),
    lc(true, 'methods.numero_desc', 'Ba Lăng Kính', 'Numero - Mô tả', '.method-numero .method-desc', 'text', '', 'Giải mã con số chủ đạo, bài học linh hồn và kiểu phát triển phù hợp.'),
    lc(true, 'methods.numero_tag1', 'Ba Lăng Kính', 'Numero - Tag 1', '.method-numero .method-tags span:nth-child(1)', 'text', '', 'Năng lực'),
    lc(true, 'methods.numero_tag2', 'Ba Lăng Kính', 'Numero - Tag 2', '.method-numero .method-tags span:nth-child(2)', 'text', '', 'Bài học'),
    lc(true, 'methods.numero_back_title', 'Ba Lăng Kính', 'Numero - Tiêu đề sau', '.method-numero .method-back-title', 'text', '', 'Giải mã bản thiết kế nội tại'),
    lc(true, 'methods.numero_back_desc', 'Ba Lăng Kính', 'Numero - Mô tả sau', '.method-numero .method-back-desc', 'text', '', 'Nhân số giúp bạn hiểu nhịp phát triển, động lực sâu bên trong và những bài học lặp lại trong học tập, công việc, tình cảm hoặc tài chính.'),
    lc(true, 'methods.numero_back_item1', 'Ba Lăng Kính', 'Numero - Bullet 1', '.method-numero .method-back-list li:nth-child(1) span', 'text', '', 'Đọc con số chủ đạo và năm cá nhân'),
    lc(true, 'methods.numero_back_item2', 'Ba Lăng Kính', 'Numero - Bullet 2', '.method-numero .method-back-list li:nth-child(2) span', 'text', '', 'Nhận diện mẫu hành vi lặp lại'),
    lc(true, 'methods.numero_back_item3', 'Ba Lăng Kính', 'Numero - Bullet 3', '.method-numero .method-back-list li:nth-child(3) span', 'text', '', 'Chọn hướng phát triển bền vững'),

    lc(true, 'methods.cta', 'Ba Lăng Kính', 'Nút đặt lịch ngay', '#btn-methods-booking', 'html', '', '<i class="fa-solid fa-sparkles"></i> Đặt lịch ngay'),

    lc(true, 'benefits.tag', 'Lợi Ích', 'Tag section', '#benefits .section-tag', 'text', '', 'Những Gì Bạn Nhận Được'),
    lc(true, 'benefits.title', 'Lợi Ích', 'Tiêu đề section', '#benefits .section-title', 'text', '', 'Sau Buổi Tư Vấn, Bạn Sẽ'),
    lc(true, 'benefits.card_1_title', 'Lợi Ích', 'Card 1 tiêu đề', '#benefits .benefit-card:nth-child(1) h3', 'text', '', 'Hiểu Mình Hơn'),
    lc(true, 'benefits.card_1_body', 'Lợi Ích', 'Card 1 nội dung', '#benefits .benefit-card:nth-child(1) p', 'text', '', 'Khám phá tính cách, điểm mạnh và điểm yếu thực sự của bản thân qua lăng kính Nhân Số Học.'),
    lc(true, 'benefits.card_2_title', 'Lợi Ích', 'Card 2 tiêu đề', '#benefits .benefit-card:nth-child(2) h3', 'text', '', 'Gỡ Bỏ Rào Cản'),
    lc(true, 'benefits.card_2_body', 'Lợi Ích', 'Card 2 nội dung', '#benefits .benefit-card:nth-child(2) p', 'text', '', 'Nhận diện và giải phóng những rào cản nội tâm đang ngăn bạn phát triển và tiến về phía trước.'),
    lc(true, 'benefits.card_3_title', 'Lợi Ích', 'Card 3 tiêu đề', '#benefits .benefit-card:nth-child(3) h3', 'text', '', 'Định Hướng Rõ Ràng'),
    lc(true, 'benefits.card_3_body', 'Lợi Ích', 'Card 3 nội dung', '#benefits .benefit-card:nth-child(3) p', 'text', '', 'Có được lộ trình rõ ràng về học tập, công việc và các mối quan hệ quan trọng trong cuộc sống.'),
    lc(true, 'benefits.card_4_title', 'Lợi Ích', 'Card 4 tiêu đề', '#benefits .benefit-card:nth-child(4) h3', 'text', '', 'Tự Tin Quyết Định'),
    lc(true, 'benefits.card_4_body', 'Lợi Ích', 'Card 4 nội dung', '#benefits .benefit-card:nth-child(4) p', 'text', '', 'Tự tin đưa ra những quyết định quan trọng với sự hiểu biết sâu sắc về bản thân và con đường phía trước.'),

    lc(true, 'testimonials.tag', 'Cảm Nhận', 'Tag section', '#testimonials .section-tag', 'text', '', 'Khách Hàng Nghĩ Gì?'),
    lc(true, 'testimonials.title_main', 'Cảm Nhận', 'Tiêu đề chính', '#testimonials .testimonial-title-main', 'text', '', 'Những Hành Trình'),
    lc(true, 'testimonials.title_accent', 'Cảm Nhận', 'Tiêu đề nhấn', '#testimonials .testimonial-title-accent', 'text', '', 'Chữa Lành'),

    lc(true, 'packages.tag', 'Bảng Giá', 'Tag section', '#packages .section-tag', 'text', '', 'Gói Tư Vấn'),
    lc(true, 'packages.title_1', 'Bảng Giá', 'Tiêu đề dòng 1', '#packages .section-title-packages span:nth-child(1)', 'text', '', 'Chọn Hình Thức'),
    lc(true, 'packages.title_2', 'Bảng Giá', 'Tiêu đề dòng 2', '#packages .section-title-packages span:nth-child(2)', 'text', '', 'Phù Hợp'),
    lc(true, 'packages.year_name', 'Bảng Giá', 'Tên gói năm cá nhân', '#packages .package-card:nth-child(1) .package-name', 'text', '', 'Dự Đoán Năm Cá Nhân'),
    lc(true, 'packages.year_price', 'Bảng Giá', 'Giá gói năm cá nhân', '#packages .package-card:nth-child(1) .price-current', 'html', '', '500.000<sup>đ</sup>'),
    lc(true, 'packages.year_unit', 'Bảng Giá', 'Đơn vị giá gói năm cá nhân', '#packages .package-card:nth-child(1) .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.year_feature_1', 'Bảng Giá', 'Gói năm cá nhân ý 1', '#packages .package-card:nth-child(1) .package-features li:nth-child(1) span:last-child', 'html', '', 'Dự đoán xu hướng năm cá nhân'),
    lc(true, 'packages.year_feature_2', 'Bảng Giá', 'Gói năm cá nhân ý 2', '#packages .package-card:nth-child(1) .package-features li:nth-child(2) span:last-child', 'html', '', 'Nhận diện cơ hội &amp; thách thức'),
    lc(true, 'packages.year_feature_3', 'Bảng Giá', 'Gói năm cá nhân ý 3', '#packages .package-card:nth-child(1) .package-features li:nth-child(3) span:last-child', 'html', '', 'Định hướng theo chu kỳ số'),
    lc(true, 'packages.year_feature_4', 'Bảng Giá', 'Gói năm cá nhân ý 4', '#packages .package-card:nth-child(1) .package-features li:nth-child(4) span:last-child', 'html', '', 'Gợi ý hành động phù hợp năm'),
    lc(true, 'packages.year_button', 'Bảng Giá', 'Nút gói năm cá nhân', '#pkg-year', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.big7_badge', 'Bảng Giá', 'Badge gói toàn diện', '#packages .package-featured .featured-badge', 'text', '', '✨ Toàn Diện Nhất ✨'),
    lc(true, 'packages.big7_name', 'Bảng Giá', 'Tên gói toàn diện', '#packages .package-featured .package-name', 'text', '', 'Phân Tích Toàn Diện'),
    lc(true, 'packages.big7_price', 'Bảng Giá', 'Giá gói toàn diện', '#packages .package-featured .price-current', 'html', '', '2.000.000<sup>đ</sup>'),
    lc(true, 'packages.big7_unit', 'Bảng Giá', 'Đơn vị giá gói toàn diện', '#packages .package-featured .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.big7_feature_1', 'Bảng Giá', 'Gói toàn diện ý 1', '#packages .package-featured .package-features li:nth-child(1) span:last-child', 'html', '', '<strong>7 chỉ số cốt lõi</strong>: chủ đạo · linh hồn · sứ mệnh · nhân cách · thái độ · trưởng thành · nợ nghiệp'),
    lc(true, 'packages.big7_feature_2', 'Bảng Giá', 'Gói toàn diện ý 2', '#packages .package-featured .package-features li:nth-child(2) span:last-child', 'html', '', '<strong>4 đỉnh cao</strong> trong cuộc đời'),
    lc(true, 'packages.big7_feature_3', 'Bảng Giá', 'Gói toàn diện ý 3', '#packages .package-featured .package-features li:nth-child(3) span:last-child', 'html', '', '<strong>3 chu kỳ</strong> cuộc đời lớn'),
    lc(true, 'packages.big7_feature_4', 'Bảng Giá', 'Gói toàn diện ý 4', '#packages .package-featured .package-features li:nth-child(4) span:last-child', 'html', '', 'Sơ đồ mũi tên phẩm chất'),
    lc(true, 'packages.big7_feature_5', 'Bảng Giá', 'Gói toàn diện ý 5', '#packages .package-featured .package-features li:nth-child(5) span:last-child', 'html', '', 'Thông điệp chữa lành chuyên sâu'),
    lc(true, 'packages.big7_feature_6', 'Bảng Giá', 'Gói toàn diện ý 6', '#packages .package-featured .package-features li:nth-child(6) span:last-child', 'html', '', 'Tặng file PDF tóm tắt đầy đủ'),
    lc(true, 'packages.big7_button', 'Bảng Giá', 'Nút gói toàn diện', '#pkg-big7', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.big3_name', 'Bảng Giá', 'Tên gói big 3', '#packages .package-card:nth-child(3) .package-name', 'html', '', 'Phân Tích 3 Chỉ Số<br/>Tính Cách Nổi Bật'),
    lc(true, 'packages.big3_price', 'Bảng Giá', 'Giá gói big 3', '#packages .package-card:nth-child(3) .price-current', 'html', '', '1.000.000<sup>đ</sup>'),
    lc(true, 'packages.big3_unit', 'Bảng Giá', 'Đơn vị giá gói big 3', '#packages .package-card:nth-child(3) .price-unit', 'text', '', '/buổi'),
    lc(true, 'packages.big3_feature_1', 'Bảng Giá', 'Gói big 3 ý 1', '#packages .package-card:nth-child(3) .package-features li:nth-child(1) span:last-child', 'html', '', 'Phân tích <strong>BIG 3</strong>: chủ đạo · linh hồn · sứ mệnh'),
    lc(true, 'packages.big3_feature_2', 'Bảng Giá', 'Gói big 3 ý 2', '#packages .package-card:nth-child(3) .package-features li:nth-child(2) span:last-child', 'html', '', '<strong>4 đỉnh cao</strong> trong cuộc đời'),
    lc(true, 'packages.big3_feature_3', 'Bảng Giá', 'Gói big 3 ý 3', '#packages .package-card:nth-child(3) .package-features li:nth-child(3) span:last-child', 'html', '', '<strong>3 chu kỳ</strong> cuộc đời lớn'),
    lc(true, 'packages.big3_feature_4', 'Bảng Giá', 'Gói big 3 ý 4', '#packages .package-card:nth-child(3) .package-features li:nth-child(4) span:last-child', 'html', '', 'Định hướng học tập, công việc & quan hệ'),
    lc(true, 'packages.big3_feature_5', 'Bảng Giá', 'Gói big 3 ý 5', '#packages .package-card:nth-child(3) .package-features li:nth-child(5) span:last-child', 'html', '', 'Thông điệp chữa lành & lộ trình cá nhân'),
    lc(true, 'packages.big3_button', 'Bảng Giá', 'Nút gói big 3', '#pkg-big3', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'packages.session_1', 'Bảng Giá', 'Thông tin buổi tư vấn 1', '#packages .session-info-item:nth-child(1) span:last-child', 'html', '', 'Thời gian mỗi buổi tư vấn: <strong>tối đa 2 tiếng</strong>'),
    lc(true, 'packages.session_2', 'Bảng Giá', 'Thông tin buổi tư vấn 2', '#packages .session-info-item:nth-child(3) span:last-child', 'html', '', 'Yêu cầu sắp xếp lịch trước <strong>ít nhất 1 ngày</strong>'),
    lc(true, 'packages.session_3', 'Bảng Giá', 'Thông tin buổi tư vấn 3', '#packages .session-info-item:nth-child(5) span:last-child', 'html', '', 'Nếu lựa chọn xem hình thức offline, tụi mình phụ thu thêm chi phí xăng xe là <strong>50.000đ</strong> cho các gói dưới 2.000.000đ nhé.'),

    lc(true, 'process.tag', 'Lộ Trình', 'Tag section', '#process .section-tag', 'text', '', 'Hành Trình'),
    lc(true, 'process.title', 'Lộ Trình', 'Tiêu đề section', '#process .section-title', 'text', '', 'Chỉ 3 Bước Đơn Giản'),
    lc(true, 'process.step_1_title', 'Lộ Trình', 'Bước 1 tiêu đề', '#process .process-step:nth-child(1) h3', 'text', '', 'Đặt Lịch'),
    lc(true, 'process.step_1_body', 'Lộ Trình', 'Bước 1 nội dung', '#process .process-step:nth-child(1) p', 'text', '', 'Chọn thời gian phù hợp với lịch trình của bạn. Linh hoạt theo nguyện vọng cá nhân.'),
    lc(true, 'process.step_2_title', 'Lộ Trình', 'Bước 2 tiêu đề', '#process .process-step:nth-child(2) h3', 'text', '', 'Chia Sẻ'),
    lc(true, 'process.step_2_body', 'Lộ Trình', 'Bước 2 nội dung', '#process .process-step:nth-child(2) p', 'text', '', 'Chia sẻ những điều đang khiến bạn trăn trở, những câu hỏi chưa có lời giải.'),
    lc(true, 'process.step_3_title', 'Lộ Trình', 'Bước 3 tiêu đề', '#process .process-step:nth-child(3) h3', 'text', '', 'Nhận Định Hướng'),
    lc(true, 'process.step_3_body', 'Lộ Trình', 'Bước 3 nội dung', '#process .process-step:nth-child(3) p', 'text', '', 'Nhận thông điệp chữa lành và lộ trình cá nhân hoá để tự tin bước tiếp.'),
    lc(true, 'process.quote_1', 'Lộ Trình', 'Quote dòng thường', '#process .process-quote span', 'text', '', 'Đôi khi chỉ cần hiểu đúng bản thân,'),
    lc(true, 'process.quote_2', 'Lộ Trình', 'Quote dòng nhấn', '#process .process-quote em', 'text', '', 'Mọi thứ sẽ dần rõ ràng hơn'),

    lc(true, 'contact.tag', 'Liên Hệ', 'Tag section', '#contact .section-tag', 'text', '', 'Liên Hệ'),
    lc(true, 'contact.title', 'Liên Hệ', 'Tiêu đề section', '#contact .section-title', 'html', '', 'Bắt Đầu Hành Trình<br />Khám Phá Bản Thân'),
    lc(true, 'contact.info_title', 'Liên Hệ', 'Tiêu đề khối liên hệ', '#contact .contact-card h3', 'html', '', '<i class="fa-solid fa-sparkles" style="color: var(--color-gold-light); margin-right: 8px;"></i>Thông Tin Liên Hệ'),
    lc(true, 'contact.item_1_title', 'Liên Hệ', 'Liên hệ dòng 1 tiêu đề', '#contact .contact-card .contact-item:nth-of-type(1) strong', 'text', '', 'Zalo / Facebook'),
    lc(true, 'contact.item_1_body', 'Liên Hệ', 'Liên hệ dòng 1 nội dung', '#contact .contact-card .contact-item:nth-of-type(1) p', 'text', '', 'Nhắn tin để đặt lịch nhanh nhất'),
    lc(true, 'contact.item_2_title', 'Liên Hệ', 'Liên hệ dòng 2 tiêu đề', '#contact .contact-card .contact-item:nth-of-type(2) strong', 'text', '', 'Giờ làm việc'),
    lc(true, 'contact.item_2_body', 'Liên Hệ', 'Liên hệ dòng 2 nội dung', '#contact .contact-card .contact-item:nth-of-type(2) p', 'text', '', 'Thứ 2 – Chủ Nhật: 8:00 – 21:00'),
    lc(true, 'contact.form_title', 'Liên Hệ', 'Tiêu đề form', '#booking-form h3', 'html', '', '<i class="fa-regular fa-calendar-check" style="color: var(--color-gold-light); margin-right: 8px;"></i>Đặt Lịch Tư Vấn'),
    lc(true, 'contact.name_label', 'Liên Hệ', 'Form nhãn họ tên', '#booking-form label[for="name"]', 'text', '', 'Họ và Tên *'),
    lc(true, 'contact.name_placeholder', 'Liên Hệ', 'Form placeholder họ tên', '#name', 'placeholder', '', 'Nhập họ và tên của bạn'),
    lc(true, 'contact.dob_label', 'Liên Hệ', 'Form nhãn ngày sinh', '#booking-form label[for="dob"]', 'text', '', 'Ngày tháng năm sinh (trên giấy tờ - hoặc có nhiều ngày sinh hãy nhập ngày mà bạn thực sự mong muốn xem) *'),
    lc(true, 'contact.phone_label', 'Liên Hệ', 'Form nhãn điện thoại', '#booking-form label[for="phone"]', 'text', '', 'Số Điện Thoại / Zalo *'),
    lc(true, 'contact.phone_placeholder', 'Liên Hệ', 'Form placeholder điện thoại', '#phone', 'placeholder', '', 'Số điện thoại liên lạc'),
    lc(true, 'contact.type_label', 'Liên Hệ', 'Form nhãn hình thức', '#booking-form label[for="consultation-type"]', 'text', '', 'Hình Thức *'),
    lc(true, 'contact.email_label', 'Liên Hệ', 'Form nhãn email', '#booking-form label[for="email"]', 'text', '', 'Email *'),
    lc(true, 'contact.email_placeholder', 'Liên Hệ', 'Form placeholder email', '#email', 'placeholder', '', 'Email để nhận xác nhận đặt lịch'),
    lc(true, 'contact.concern_label', 'Liên Hệ', 'Form nhãn trăn trở', '#booking-form label[for="concern"]', 'text', '', 'Điều Bạn Đang Trăn Trở'),
    lc(true, 'contact.concern_placeholder', 'Liên Hệ', 'Form placeholder trăn trở', '#concern', 'placeholder', '', 'Chia sẻ những điều bạn muốn tìm hiểu hoặc vấn đề bạn đang gặp phải...'),
    lc(true, 'contact.submit', 'Liên Hệ', 'Nút gửi form', '#submit-booking span', 'text', '', 'Chọn Lịch & Thanh Toán'),
    lc(true, 'contact.note', 'Liên Hệ', 'Ghi chú form', '#booking-form .form-note', 'text', '', 'Bước tiếp theo: chọn ngày giờ phù hợp và hoàn tất thanh toán ✨'),

    lc(true, 'footer.title_contact', 'Chân Trang', 'Footer cột liên hệ', '.footer-contact-col .footer-title', 'text', '', 'LIÊN HỆ'),
    lc(true, 'footer.desc', 'Chân Trang', 'Footer mô tả', '.footer-contact-col .footer-desc', 'text', '', 'Tìm hiểu thêm qua các nền tảng mạng xã hội của Clow Cat Patronus:'),
    lc(true, 'footer.tagline', 'Chân Trang', 'Footer tagline', '.footer-tagline', 'text', '', 'KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG'),
    lc(true, 'footer.title_services', 'Chân Trang', 'Footer cột dịch vụ', '.footer-links-col .footer-title', 'text', '', 'DỊCH VỤ'),
    lc(true, 'footer.link_1', 'Chân Trang', 'Footer link 1', '.footer-links-list li:nth-child(1) a', 'text', '', 'Gói Khám Phá'),
    lc(true, 'footer.link_2', 'Chân Trang', 'Footer link 2', '.footer-links-list li:nth-child(2) a', 'text', '', 'Gói Kết Nối'),
    lc(true, 'footer.link_3', 'Chân Trang', 'Footer link 3', '.footer-links-list li:nth-child(3) a', 'text', '', 'Gói Toàn Diện'),
    lc(true, 'footer.copyright', 'Chân Trang', 'Dòng bản quyền', '.footer-bottom p:nth-child(1)', 'text', '', '© 2026 ClowCat Patronus. Tất cả quyền được bảo lưu.'),
    lc(true, 'footer.made_with', 'Chân Trang', 'Dòng năng lượng', '.footer-made-with', 'text', '', '✦ Được tạo ra với tình yêu và năng lượng tích cực ✦'),

    lc(true, 'social.messenger', 'Mạng Xã Hội', 'Link nhắn tin (Messenger)', '#btn-message-fanpage', 'href', '', 'https://m.me/clowcatpatronus'),
    lc(true, 'social.facebook', 'Mạng Xã Hội', 'Link Facebook', '.fb', 'href', '', 'https://www.facebook.com/clowcatpatronus'),
    lc(true, 'social.instagram', 'Mạng Xã Hội', 'Link Instagram', '.ig', 'href', '', 'https://www.instagram.com/clow_cat_patronus/'),
    lc(true, 'social.tiktok', 'Mạng Xã Hội', 'Link TikTok', '.tk', 'href', '', 'https://www.tiktok.com/@clow_cat_patronus'),
    lc(true, 'social.youtube', 'Mạng Xã Hội', 'Link YouTube', '.yt', 'href', '', 'https://www.youtube.com/@ClowCatPatronusOfficial-1340'),
  ];
}

// =============================================
//  Admin dashboard API
// =============================================
function parseRequestParams(e) {
  const params = {};
  if (e && e.parameter) {
    Object.keys(e.parameter).forEach((key) => {
      params[key] = e.parameter[key];
    });
  }

  const postData = e && e.postData;
  if (!postData || !postData.contents) return params;

  const contentType = String(postData.type || '').toLowerCase();
  if (contentType.indexOf('application/json') !== -1) {
    try {
      const body = JSON.parse(postData.contents);
      Object.keys(body || {}).forEach((key) => {
        params[key] = body[key];
      });
    } catch (error) {
      throw new Error('Body JSON khong hop le.');
    }
  }

  return params;
}

function handleAdminLogin(params) {
  const username = cleanValue(params.username).toLowerCase();
  const password = String(params.password || '');
  if (!username || !password) throw new Error('Vui long nhap tai khoan va mat khau.');

  const found = findAdminUser(username);
  if (!found || !found.enabled) throw new Error('Tai khoan khong ton tai hoac da bi khoa.');

  const passwordHash = hashAdminPassword(password, found.salt);
  if (passwordHash !== found.passwordHash) throw new Error('Mat khau khong dung.');

  const token = createAdminSession(found);
  setAdminDateCell(found.sheet, found.rowNumber, found.indexes['Lần đăng nhập cuối'] + 1, getVietnamNow());

  return jsonResponse({
    ok: true,
    token: token,
    user: adminUserPublicProfile(found),
    expiresIn: ADMIN_SESSION_SECONDS,
    forcePasswordChange: username === ADMIN_DEFAULT_USERNAME && password === ADMIN_DEFAULT_PASSWORD,
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleAdminLogout(params) {
  const token = cleanValue(params.token);
  if (token) CacheService.getScriptCache().remove(getAdminSessionCacheKey(token));
  return jsonResponse({ ok: true, scriptVersion: SCRIPT_VERSION });
}

function handleChangeAdminPassword(params) {
  const session = requireAdminSession(params.token);
  const username = cleanValue(params.username || session.username).toLowerCase();
  const currentPassword = String(params.currentPassword || '');
  const newPassword = String(params.newPassword || '');
  if (newPassword.length < 6) throw new Error('Mat khau moi can it nhat 6 ky tu.');
  if (username !== session.username && session.role !== 'admin') {
    throw new Error('Ban khong co quyen doi mat khau tai khoan nay.');
  }

  const found = findAdminUser(username);
  if (!found) throw new Error('Khong tim thay tai khoan.');
  if (username === session.username) {
    const currentHash = hashAdminPassword(currentPassword, found.salt);
    if (currentHash !== found.passwordHash) throw new Error('Mat khau hien tai khong dung.');
  }

  const newSalt = makeAdminSalt();
  const indexes = found.indexes;
  found.sheet.getRange(found.rowNumber, indexes['Muối'] + 1).setValue(newSalt);
  found.sheet.getRange(found.rowNumber, indexes['Mật khẩu hash'] + 1).setValue(hashAdminPassword(newPassword, newSalt));
  setAdminDateCell(found.sheet, found.rowNumber, indexes['Ngày cập nhật'] + 1, getVietnamNow());

  return jsonResponse({
    ok: true,
    message: 'Da doi mat khau',
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleListAdminUsers(params) {
  requireAdminSession(params.token, ['admin']);
  const users = listAdminUsers();
  return jsonResponse({
    ok: true,
    users: users,
    count: users.length,
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleCreateAdminUser(params) {
  requireAdminSession(params.token, ['admin']);
  const username = cleanValue(params.username).toLowerCase();
  const displayName = cleanValue(params.displayName) || username;
  const role = cleanValue(params.role || 'editor').toLowerCase();
  const password = String(params.password || '');

  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    throw new Error('Ten dang nhap chi gom chu thuong, so, dau cham, gach ngang, gach duoi va dai 3-32 ky tu.');
  }
  if (role !== 'admin' && role !== 'editor') throw new Error('Vai tro khong hop le.');
  if (password.length < 6) throw new Error('Mat khau can it nhat 6 ky tu.');
  if (findAdminUser(username)) throw new Error('Tai khoan da ton tai.');

  const sheet = ensureAdminUsersSheet();
  const salt = makeAdminSalt();
  sheet.appendRow([
    true,
    username,
    displayName,
    role,
    salt,
    hashAdminPassword(password, salt),
    getVietnamNow(),
    getVietnamNow(),
    '',
  ]);
  formatAdminUserDateColumns(sheet);
  sheet.autoResizeColumns(7, 3);

  return jsonResponse({
    ok: true,
    user: {
      username: username,
      displayName: displayName,
      role: role,
      enabled: true,
    },
    message: 'Da tao tai khoan',
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSetAdminUserStatus(params) {
  const session = requireAdminSession(params.token, ['admin']);
  const username = cleanValue(params.username).toLowerCase();
  const enabled = isTruthy(params.enabled);
  if (!username) throw new Error('Thieu tai khoan can cap nhat.');
  if (username === session.username && !enabled) throw new Error('Khong the tu khoa tai khoan dang dang nhap.');

  const found = findAdminUser(username);
  if (!found) throw new Error('Khong tim thay tai khoan.');
  found.sheet.getRange(found.rowNumber, found.indexes['Bật'] + 1).setValue(enabled);
  setAdminDateCell(found.sheet, found.rowNumber, found.indexes['Ngày cập nhật'] + 1, getVietnamNow());

  return jsonResponse({
    ok: true,
    username: username,
    enabled: enabled,
    message: enabled ? 'Da mo tai khoan' : 'Da khoa tai khoan',
    scriptVersion: SCRIPT_VERSION,
  });
}

function requireAdminSession(token, allowedRoles) {
  const session = getAdminSession(token);
  if (!session) throw new Error('Phien dang nhap het han. Vui long dang nhap lai.');
  if (allowedRoles && allowedRoles.length && allowedRoles.indexOf(session.role) === -1) {
    throw new Error('Tai khoan khong co quyen thuc hien thao tac nay.');
  }

  const found = findAdminUser(session.username);
  if (!found || !found.enabled) throw new Error('Tai khoan khong ton tai hoac da bi khoa.');
  return session;
}

function createAdminSession(user) {
  const token = Utilities.getUuid() + Utilities.getUuid().replace(/-/g, '');
  const session = {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    createdAt: formatAdminDate(getVietnamNow()),
  };
  CacheService.getScriptCache().put(getAdminSessionCacheKey(token), JSON.stringify(session), ADMIN_SESSION_SECONDS);
  return token;
}

function getAdminSession(token) {
  token = cleanValue(token);
  if (!token) return null;
  const cached = CacheService.getScriptCache().get(getAdminSessionCacheKey(token));
  if (!cached) return null;
  try {
    return JSON.parse(cached);
  } catch (error) {
    return null;
  }
}

function getAdminSessionCacheKey(token) {
  return 'admin-session-' + token;
}

function ensureAdminUsersSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  spreadsheet.setSpreadsheetTimeZone(VIETNAM_TIMEZONE);
  let sheet = spreadsheet.getSheetByName(ADMIN_USERS_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(ADMIN_USERS_SHEET_NAME);

  sheet.getRange(1, 1, 1, ADMIN_USERS_HEADERS.length).setValues([ADMIN_USERS_HEADERS]);
  sheet.setFrozenRows(1);
  if (sheet.getLastRow() < 2) {
    const salt = makeAdminSalt();
    sheet.getRange(2, 1, 1, ADMIN_USERS_HEADERS.length).setValues([[
      true,
      ADMIN_DEFAULT_USERNAME,
      'Quản trị viên',
      'admin',
      salt,
      hashAdminPassword(ADMIN_DEFAULT_PASSWORD, salt),
      getVietnamNow(),
      getVietnamNow(),
      '',
    ]]);
  }
  formatAdminUserDateColumns(sheet);
  sheet.autoResizeColumns(1, ADMIN_USERS_HEADERS.length);
  return sheet;
}

function getAdminUserHeaderIndexes() {
  const indexes = {};
  ADMIN_USERS_HEADERS.forEach((header, index) => {
    indexes[header] = index;
  });
  return indexes;
}

function findAdminUser(username) {
  username = cleanValue(username).toLowerCase();
  if (!username) return null;
  const sheet = ensureAdminUsersSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const indexes = getAdminUserHeaderIndexes();
  const values = sheet.getRange(2, 1, lastRow - 1, ADMIN_USERS_HEADERS.length).getValues();
  for (let index = 0; index < values.length; index += 1) {
    const row = values[index];
    const rowUsername = cleanValue(row[indexes['Tên đăng nhập']]).toLowerCase();
    if (rowUsername === username) {
      return {
        sheet: sheet,
        rowNumber: index + 2,
        indexes: indexes,
        enabled: isTruthy(row[indexes['Bật']]),
        username: rowUsername,
        displayName: cleanValue(row[indexes['Tên hiển thị']]) || rowUsername,
        role: cleanValue(row[indexes['Vai trò']]) || 'editor',
        salt: cleanValue(row[indexes['Muối']]),
        passwordHash: cleanValue(row[indexes['Mật khẩu hash']]),
        createdAt: row[indexes['Ngày tạo']],
        updatedAt: row[indexes['Ngày cập nhật']],
        lastLoginAt: row[indexes['Lần đăng nhập cuối']],
      };
    }
  }
  return null;
}

function listAdminUsers() {
  const sheet = ensureAdminUsersSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const indexes = getAdminUserHeaderIndexes();
  const values = sheet.getRange(2, 1, lastRow - 1, ADMIN_USERS_HEADERS.length).getValues();
  return values.map((row) => ({
    enabled: isTruthy(row[indexes['Bật']]),
    username: cleanValue(row[indexes['Tên đăng nhập']]).toLowerCase(),
    displayName: cleanValue(row[indexes['Tên hiển thị']]),
    role: cleanValue(row[indexes['Vai trò']]) || 'editor',
    createdAt: formatAdminDate(row[indexes['Ngày tạo']]),
    updatedAt: formatAdminDate(row[indexes['Ngày cập nhật']]),
    lastLoginAt: formatAdminDate(row[indexes['Lần đăng nhập cuối']]),
  })).filter((user) => user.username);
}

function adminUserPublicProfile(user) {
  return {
    username: user.username,
    displayName: user.displayName,
    role: user.role,
    enabled: user.enabled,
  };
}

function makeAdminSalt() {
  return Utilities.getUuid().replace(/-/g, '');
}

function hashAdminPassword(password, salt) {
  const raw = String(salt || '') + ':' + String(password || '') + ':' + SPREADSHEET_ID;
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, raw, Utilities.Charset.UTF_8);
  return digest.map((byteValue) => {
    const value = byteValue < 0 ? byteValue + 256 : byteValue;
    return ('0' + value.toString(16)).slice(-2);
  }).join('');
}

function findLandingContentRowNumberByKey(sheet, key) {
  return getLandingContentRowsByKey(sheet)[key] || 0;
}

function getLandingContentRowsByKey(sheet) {
  const rowsByKey = {};
  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return rowsByKey;

  const indexes = getLandingContentHeaderIndexes();
  const values = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length).getValues();
  values.forEach((row, index) => {
    const key = cleanValue(row[indexes['Khóa']]);
    if (key && !rowsByKey[key]) rowsByKey[key] = index + 2;
  });
  return rowsByKey;
}

function isTruthy(value) {
  return value === true || String(value).toUpperCase() === 'TRUE' || String(value).trim() === '1';
}

function getVietnamNow() {
  return new Date();
}

function setAdminDateCell(sheet, rowNumber, columnNumber, value) {
  sheet.getRange(rowNumber, columnNumber)
    .setValue(value)
    .setNumberFormat(ADMIN_SHEET_DATE_FORMAT);
}

function formatAdminUserDateColumns(sheet) {
  const indexes = getAdminUserHeaderIndexes();
  const dateColumns = [
    indexes['Ngày tạo'] + 1,
    indexes['Ngày cập nhật'] + 1,
    indexes['Lần đăng nhập cuối'] + 1,
  ];
  const lastRow = Math.max(sheet.getLastRow(), 2);
  dateColumns.forEach((columnNumber) => {
    sheet.getRange(2, columnNumber, lastRow - 1, 1).setNumberFormat(ADMIN_SHEET_DATE_FORMAT);
  });
}

function repairAdminUserDateFormats() {
  const sheet = ensureAdminUsersSheet();
  formatAdminUserDateColumns(sheet);
  sheet.autoResizeColumns(7, 3);
  return 'Da cap nhat dinh dang ngay gio Viet Nam cho tab Admin users: ' + ADMIN_SHEET_DATE_FORMAT;
}

function formatAdminDate(value) {
  if (!value) return '';
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, VIETNAM_TIMEZONE, ADMIN_SHEET_DATE_FORMAT);
  }
  return String(value);
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

function parsePriceNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

// =============================================
//  Packages – quản lý gói tư vấn động
// =============================================
function defaultPackageRows() {
  return [
    [
      true,
      'year',
      'Dự Đoán Năm Cá Nhân',
      500000,
      550000,
      '/buổi',
      'hourglass-half',
      'orange',
      false,
      '',
      [
        'Dự đoán xu hướng năm cá nhân',
        'Nhận diện cơ hội & thách thức',
        'Định hướng theo chu kỳ số',
        'Gợi ý hành động phù hợp năm',
      ].join('\n'),
      'Đặt Lịch Ngay',
      10,
    ],
    [
      true,
      'big7',
      'Phân Tích Toàn Diện',
      2000000,
      2000000,
      '/buổi',
      'infinity',
      'gold',
      true,
      '✨ Toàn Diện Nhất ✨',
      [
        '<strong>7 chỉ số cốt lõi</strong>: chủ đạo · linh hồn · sứ mệnh · nhân cách · thái độ · trưởng thành · nợ nghiệp',
        '<strong>4 đỉnh cao</strong> trong cuộc đời',
        '<strong>3 chu kỳ</strong> cuộc đời lớn',
        'Sơ đồ mũi tên phẩm chất',
        'Thông điệp chữa lành chuyên sâu',
        'Tặng file PDF tóm tắt đầy đủ',
      ].join('\n'),
      'Đặt Lịch Ngay',
      20,
    ],
    [
      true,
      'big3',
      'Phân Tích 3 Chỉ Số<br/>Tính Cách Nổi Bật',
      1000000,
      1050000,
      '/buổi',
      'fingerprint',
      'teal',
      false,
      '',
      [
        'Phân tích <strong>BIG 3</strong>: chủ đạo · linh hồn · sứ mệnh',
        '<strong>4 đỉnh cao</strong> trong cuộc đời',
        '<strong>3 chu kỳ</strong> cuộc đời lớn',
        'Định hướng học tập, công việc & quan hệ',
        'Thông điệp chữa lành & lộ trình cá nhân',
      ].join('\n'),
      'Đặt Lịch Ngay',
      30,
    ],
  ];
}

function ensurePackagesSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(PACKAGES_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(PACKAGES_SHEET_NAME);

  sheet.getRange(1, 1, 1, PACKAGES_HEADERS.length).setValues([PACKAGES_HEADERS]);
  sheet.setFrozenRows(1);

  if (sheet.getLastRow() < 2) {
    const rows = defaultPackageRows();
    sheet.getRange(2, 1, rows.length, PACKAGES_HEADERS.length).setValues(rows);
  }
  sheet.autoResizeColumns(1, PACKAGES_HEADERS.length);
  return sheet;
}

function getPackageHeaderIndexes() {
  const indexes = {};
  PACKAGES_HEADERS.forEach((header, index) => {
    indexes[header] = index;
  });
  return indexes;
}

function getPackages(includeDisabled) {
  const sheet = ensurePackagesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const indexes = getPackageHeaderIndexes();
  const values = sheet.getRange(2, 1, lastRow - 1, PACKAGES_HEADERS.length).getValues();
  return values
    .map((row, index) => packageRowToObject(row, indexes, index + 2))
    .filter((pkg) => pkg.code && (includeDisabled || pkg.enabled))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.rowNumber - b.rowNumber);
}

function packageRowToObject(row, indexes, rowNumber) {
  const onlinePrice = parsePriceNumber(row[indexes['Giá online']]);
  const offlinePrice = parsePriceNumber(row[indexes['Giá offline']]) || onlinePrice;
  return {
    enabled: isTruthy(row[indexes['Bật']]),
    code: cleanPackageCode(row[indexes['Mã gói']]),
    name: cleanValue(row[indexes['Tên gói']]),
    onlinePrice: onlinePrice,
    offlinePrice: offlinePrice,
    unit: cleanValue(row[indexes['Đơn vị']]) || '/buổi',
    icon: cleanValue(row[indexes['Icon']]) || 'sparkles',
    accent: cleanValue(row[indexes['Màu nhấn']]) || 'teal',
    featured: isTruthy(row[indexes['Nổi bật']]),
    badge: cleanValue(row[indexes['Badge']]),
    features: splitPackageFeatures(row[indexes['Quyền lợi']]),
    buttonText: cleanValue(row[indexes['Nút']]) || 'Đặt Lịch Ngay',
    sortOrder: Number(row[indexes['Thứ tự']]) || rowNumber,
    rowNumber: rowNumber,
  };
}

function splitPackageFeatures(value) {
  return String(value || '')
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function cleanPackageCode(value) {
  return cleanValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function findPackageRowNumberByCode(sheet, code) {
  const targetCode = cleanPackageCode(code);
  if (!targetCode || sheet.getLastRow() < 2) return 0;

  const codeColumn = getPackageHeaderIndexes()['Mã gói'] + 1;
  const values = sheet.getRange(2, codeColumn, sheet.getLastRow() - 1, 1).getValues();
  for (let i = 0; i < values.length; i++) {
    if (cleanPackageCode(values[i][0]) === targetCode) return i + 2;
  }
  return 0;
}

function handleSavePackage(params) {
  requireAdminSession(params.token);
  const code = cleanPackageCode(params.code);
  const name = cleanValue(params.name);
  const onlinePrice = parsePriceNumber(params.onlinePrice);
  const offlinePrice = parsePriceNumber(params.offlinePrice) || onlinePrice;
  if (!code) throw new Error('Thieu ma goi.');
  if (!name) throw new Error('Thieu ten goi.');
  if (!onlinePrice) throw new Error('Gia online phai lon hon 0.');

  const sheet = ensurePackagesSheet();
  const rowNumber = findPackageRowNumberByCode(sheet, code) || sheet.getLastRow() + 1;
  const row = [
    isTruthy(params.enabled),
    code,
    name,
    onlinePrice,
    offlinePrice,
    cleanValue(params.unit) || '/buổi',
    cleanValue(params.icon) || 'sparkles',
    cleanValue(params.accent) || 'teal',
    isTruthy(params.featured),
    cleanValue(params.badge),
    String(params.features || '').trim(),
    cleanValue(params.buttonText) || 'Đặt Lịch Ngay',
    Number(params.sortOrder) || rowNumber,
  ];

  sheet.getRange(rowNumber, 1, 1, PACKAGES_HEADERS.length).setValues([row]);
  sheet.autoResizeColumns(1, PACKAGES_HEADERS.length);
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    message: 'Da luu goi tu van',
    packages: getPackages(true),
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSavePackageOrder(params) {
  requireAdminSession(params.token);
  const rawOrder = cleanValue(params.order);
  if (!rawOrder) throw new Error('Thieu danh sach thu tu goi.');

  let orderItems;
  try {
    orderItems = JSON.parse(rawOrder);
  } catch (error) {
    throw new Error('Danh sach thu tu goi khong dung JSON.');
  }
  if (!Array.isArray(orderItems)) throw new Error('Danh sach thu tu goi phai la mang.');

  const sheet = ensurePackagesSheet();
  const indexes = getPackageHeaderIndexes();
  const sortOrderColumn = indexes['Thứ tự'] + 1;
  let saved = 0;

  orderItems.forEach((item, index) => {
    const code = cleanPackageCode(item && item.code);
    if (!code) return;
    const rowNumber = findPackageRowNumberByCode(sheet, code);
    if (!rowNumber) return;
    const sortOrder = Number(item.sortOrder) || (index + 1) * 10;
    sheet.getRange(rowNumber, sortOrderColumn).setValue(sortOrder);
    saved += 1;
  });

  clearLandingContentCache();
  return jsonResponse({
    ok: true,
    saved: saved,
    message: 'Da luu thu tu goi tu van',
    packages: getPackages(true),
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleDeletePackage(params) {
  requireAdminSession(params.token);
  const code = cleanPackageCode(params.code);
  if (!code) throw new Error('Thieu ma goi can xoa.');

  const sheet = ensurePackagesSheet();
  const rowNumber = findPackageRowNumberByCode(sheet, code);
  if (!rowNumber) throw new Error('Khong tim thay goi: ' + code);
  sheet.deleteRow(rowNumber);
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    message: 'Da xoa goi tu van',
    packages: getPackages(true),
    scriptVersion: SCRIPT_VERSION,
  });
}

// =============================================
//  Payment Settings
// =============================================
function ensurePaymentSettingsSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(PAYMENT_SETTINGS_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(PAYMENT_SETTINGS_SHEET_NAME);

  sheet.getRange(1, 1, 1, PAYMENT_SETTINGS_HEADERS.length).setValues([PAYMENT_SETTINGS_HEADERS]);
  sheet.setFrozenRows(1);

  const existing = {};
  if (sheet.getLastRow() >= 2) {
    const values = sheet.getRange(2, 1, sheet.getLastRow() - 1, PAYMENT_SETTINGS_HEADERS.length).getValues();
    values.forEach((row) => {
      const key = cleanValue(row[0]);
      if (key) existing[key] = true;
    });
  }

  const descriptions = getPaymentSettingDescriptions();
  const rowsToAppend = [];
  Object.keys(DEFAULT_PAYMENT_SETTINGS).forEach((key) => {
    if (!existing[key]) {
      rowsToAppend.push([key, DEFAULT_PAYMENT_SETTINGS[key], descriptions[key] || '']);
    }
  });

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, PAYMENT_SETTINGS_HEADERS.length).setValues(rowsToAppend);
  }

  sheet.autoResizeColumns(1, PAYMENT_SETTINGS_HEADERS.length);
  return sheet;
}

function getPaymentSettingDescriptions() {
  return {
    sepayEnabled: 'TRUE de bat che do SePay, FALSE de dung QR chuyen khoan thu cong hien tai.',
    bankName: 'Ten ngan hang hien trong modal thanh toan.',
    bankBin: 'Ma BIN ngan hang dung de tao QR VietQR.',
    bankAccount: 'So tai khoan nhan tien (VietQR).',
    bankAccountName: 'Ten chu tai khoan nhan tien.',
    sepayBankName: 'Ten ngan hang ngan gon cho SePay (VD: BIDV).',
    sepayBankAccount: 'So tai khoan nhan tien cho SePay (co the chua chu cai).',
    sepayEnv: 'sandbox hoac production.',
    sepayMerchantId: 'Merchant ID SePay, chi hien trong admin.',
    sepayCheckoutUrl: 'Checkout URL tuy chon neu dung cong thanh toan SePay redirect.',
    sepayOrderPrefix: 'Tien to ma don hang/chuyen khoan.',
    paymentTimeoutMinutes: 'So phut cho khach thanh toan khi bat SePay.',
    thankYouUrl: 'Trang chuyen den sau khi SePay xac nhan thanh cong.',
  };
}

function getPaymentSettings(includePrivateStatus) {
  const sheet = ensurePaymentSettingsSheet();
  const settings = Object.assign({}, DEFAULT_PAYMENT_SETTINGS);
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 1, lastRow - 1, PAYMENT_SETTINGS_HEADERS.length).getDisplayValues();
    values.forEach((row) => {
      const key = cleanValue(row[0]);
      if (key && Object.prototype.hasOwnProperty.call(settings, key)) {
        settings[key] = cleanValue(row[1]);
      }
    });
  }

  const output = {
    sepayEnabled: isTruthy(settings.sepayEnabled),
    bankName: settings.bankName,
    bankBin: settings.bankBin,
    bankAccount: settings.bankAccount,
    bankAccountName: settings.bankAccountName,
    sepayBankName: settings.sepayBankName,
    sepayBankAccount: settings.sepayBankAccount,
    sepayEnv: settings.sepayEnv,
    sepayMerchantId: settings.sepayMerchantId,
    sepayCheckoutUrl: settings.sepayCheckoutUrl,
    sepayOrderPrefix: settings.sepayOrderPrefix,
    paymentTimeoutMinutes: Math.max(1, Number(settings.paymentTimeoutMinutes) || 15),
    thankYouUrl: settings.thankYouUrl || 'thankyou.html',
  };

  if (includePrivateStatus) {
    output.hasSepaySecretKey = Boolean(cleanValue(PropertiesService.getScriptProperties().getProperty(SEPAY_SECRET_KEY_PROPERTY)));
  }

  return output;
}

function handleSavePaymentSettings(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensurePaymentSettingsSheet();
  const descriptions = getPaymentSettingDescriptions();
  const nextSettings = {
    sepayEnabled: isTruthy(params.sepayEnabled) ? 'true' : 'false',
    bankName: cleanValue(params.bankName) || DEFAULT_PAYMENT_SETTINGS.bankName,
    bankBin: cleanValue(params.bankBin) || DEFAULT_PAYMENT_SETTINGS.bankBin,
    bankAccount: cleanValue(params.bankAccount) || DEFAULT_PAYMENT_SETTINGS.bankAccount,
    bankAccountName: cleanValue(params.bankAccountName) || DEFAULT_PAYMENT_SETTINGS.bankAccountName,
    sepayBankName: cleanValue(params.sepayBankName) || DEFAULT_PAYMENT_SETTINGS.sepayBankName,
    sepayBankAccount: cleanValue(params.sepayBankAccount) || DEFAULT_PAYMENT_SETTINGS.sepayBankAccount,
    sepayEnv: cleanValue(params.sepayEnv) || DEFAULT_PAYMENT_SETTINGS.sepayEnv,
    sepayMerchantId: cleanValue(params.sepayMerchantId),
    sepayCheckoutUrl: cleanValue(params.sepayCheckoutUrl),
    sepayOrderPrefix: cleanValue(params.sepayOrderPrefix) || DEFAULT_PAYMENT_SETTINGS.sepayOrderPrefix,
    paymentTimeoutMinutes: String(Math.max(1, Number(params.paymentTimeoutMinutes) || 15)),
    thankYouUrl: cleanValue(params.thankYouUrl) || DEFAULT_PAYMENT_SETTINGS.thankYouUrl,
  };

  if (!/^\d{5,8}$/.test(nextSettings.bankBin)) throw new Error('Ma BIN ngan hang chua hop le.');
  if (!/^[0-9]{4,32}$/.test(nextSettings.bankAccount)) throw new Error('So tai khoan VietQR phai la so.');
  if (nextSettings.sepayBankAccount && !/^[A-Za-z0-9]{4,32}$/.test(nextSettings.sepayBankAccount)) throw new Error('So tai khoan SePay chua hop le.');
  if (nextSettings.sepayEnabled === 'true' && !nextSettings.sepayOrderPrefix) {
    throw new Error('Can co tien to ma don hang khi bat SePay.');
  }

  const scriptProperties = PropertiesService.getScriptProperties();
  const nextSepaySecretKey = cleanValue(params.sepaySecretKey);
  if (isTruthy(params.clearSepaySecretKey)) {
    scriptProperties.deleteProperty(SEPAY_SECRET_KEY_PROPERTY);
  } else if (nextSepaySecretKey) {
    if (!/^spsk_/.test(nextSepaySecretKey)) throw new Error('Secret Key SePay phai bat dau bang spsk_.');
    scriptProperties.setProperty(SEPAY_SECRET_KEY_PROPERTY, nextSepaySecretKey);
  }

  const rowByKey = {};
  if (sheet.getLastRow() >= 2) {
    const keys = sheet.getRange(2, 1, sheet.getLastRow() - 1, 1).getValues();
    keys.forEach((row, index) => {
      const key = cleanValue(row[0]);
      if (key) rowByKey[key] = index + 2;
    });
  }

  Object.keys(nextSettings).forEach((key) => {
    const rowNumber = rowByKey[key] || sheet.getLastRow() + 1;
    sheet.getRange(rowNumber, 1, 1, PAYMENT_SETTINGS_HEADERS.length)
      .setValues([[key, nextSettings[key], descriptions[key] || '']]);
  });

  sheet.autoResizeColumns(1, PAYMENT_SETTINGS_HEADERS.length);
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    message: 'Da luu cau hinh thanh toan',
    paymentSettings: getPaymentSettings(true),
    scriptVersion: SCRIPT_VERSION,
  });
}

// =============================================
//  Feedback Images Upload
// =============================================
function ensureFeedbackImagesSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(FEEDBACK_IMAGES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(FEEDBACK_IMAGES_SHEET_NAME);
    sheet.getRange(1, 1, 1, FEEDBACK_IMAGES_HEADERS.length).setValues([FEEDBACK_IMAGES_HEADERS]);
    sheet.setFrozenRows(1);
    sheet.autoResizeColumns(1, FEEDBACK_IMAGES_HEADERS.length);
  }
  return sheet;
}

function getFeedbackImages() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(FEEDBACK_IMAGES_SHEET_NAME);
  if (!sheet) return [];

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, FEEDBACK_IMAGES_HEADERS.length).getValues();
  return values.map(row => ({
    createdAt: formatAdminDate(row[0]),
    filename: cleanValue(row[1]),
    url: cleanValue(row[2]),
    fileId: cleanValue(row[3]),
    uploadedBy: cleanValue(row[4]),
  })).filter(img => img.url);
}

function getImgBbApiKey() {
  const fromProperties = PropertiesService.getScriptProperties().getProperty('IMGBB_API_KEY');
  return cleanValue(fromProperties || IMGBB_API_KEY);
}

function uploadFeedbackImageToImgBb(imageBase64, filename) {
  const apiKey = getImgBbApiKey();
  if (!apiKey) throw new Error('Chua cau hinh ImgBB API Key.');
  const response = UrlFetchApp.fetch('https://api.imgbb.com/1/upload', {
    method: 'post',
    payload: {
      key: apiKey,
      image: imageBase64,
      name: filename,
    },
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  const body = response.getContentText();
  let data;
  try {
    data = JSON.parse(body);
  } catch (error) {
    throw new Error('ImgBB tra ve du lieu khong hop le.');
  }

  if (status < 200 || status >= 300 || !data.success) {
    const message = data && data.error && data.error.message ? data.error.message : 'Unknown';
    throw new Error('Loi tu ImgBB: ' + message);
  }

  const url = cleanValue(data.data && (data.data.display_url || data.data.url));
  const fileId = cleanValue(data.data && data.data.id);
  if (!url || !fileId) throw new Error('Thieu URL hoac File ID tu ImgBB.');

  return {
    provider: 'ImgBB',
    url: url,
    fileId: fileId,
  };
}

function getFeedbackDriveFolder() {
  const folders = DriveApp.getFoldersByName(FEEDBACK_DRIVE_FOLDER_NAME);
  if (folders.hasNext()) return folders.next();
  return DriveApp.createFolder(FEEDBACK_DRIVE_FOLDER_NAME);
}

function uploadFeedbackImageToDrive(imageBase64, filename) {
  const safeFilename = filename || ('feedback_' + new Date().getTime() + '.jpg');
  const mimeType = getImageMimeTypeFromFilename(safeFilename);
  const bytes = Utilities.base64Decode(imageBase64);
  const blob = Utilities.newBlob(bytes, mimeType, safeFilename);
  const file = getFeedbackDriveFolder().createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  return {
    provider: 'Google Drive',
    url: 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1200',
    fileId: 'drive:' + fileId,
  };
}

function getImageMimeTypeFromFilename(filename) {
  const lower = String(filename || '').toLowerCase();
  if (lower.endsWith('.png')) return 'image/png';
  if (lower.endsWith('.webp')) return 'image/webp';
  return 'image/jpeg';
}

function saveFeedbackImageRecord(session, filename, uploadResult) {
  const sheet = ensureFeedbackImagesSheet();
  sheet.appendRow([
    getVietnamNow(),
    filename,
    uploadResult.url,
    uploadResult.fileId,
    session.username
  ]);
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat(ADMIN_SHEET_DATE_FORMAT);
}

function handleUploadFeedbackImage(params) {
  const session = requireAdminSession(params.token, ['admin', 'editor']);
  const imageBase64 = cleanValue(params.imageBase64);
  const filename = cleanValue(params.filename) || 'feedback_' + new Date().getTime() + '.jpg';

  if (!imageBase64) throw new Error('Thieu du lieu anh can upload.');

  let uploadResult;
  let imgBbError = null;
  try {
    uploadResult = uploadFeedbackImageToImgBb(imageBase64, filename);
  } catch (error) {
    imgBbError = error;
    uploadResult = uploadFeedbackImageToDrive(imageBase64, filename);
  }

  saveFeedbackImageRecord(session, filename, uploadResult);
  clearLandingContentCache();

  return jsonResponse({
    ok: true,
    message: imgBbError
      ? 'ImgBB dang chan request, da luu anh tam qua Google Drive.'
      : 'Upload len ImgBB thanh cong',
    provider: uploadResult.provider,
    url: uploadResult.url,
    fileId: uploadResult.fileId,
    fallbackReason: imgBbError ? imgBbError.message : '',
    feedbackImages: getFeedbackImages(),
    scriptVersion: SCRIPT_VERSION
  });
}

function handleSaveFeedbackImage(params) {
  const session = requireAdminSession(params.token);
  const url = cleanValue(params.url);
  const fileId = cleanValue(params.fileId);
  const filename = cleanValue(params.filename) || 'feedback_' + new Date().getTime() + '.jpg';
  
  if (!url || !fileId) throw new Error('Thiếu dữ liệu URL hoặc File ID từ ImgBB.');
  
  const sheet = ensureFeedbackImagesSheet();
  sheet.appendRow([
    getVietnamNow(),
    filename,
    url,
    fileId,
    session.username
  ]);
  
  sheet.getRange(sheet.getLastRow(), 1).setNumberFormat(ADMIN_SHEET_DATE_FORMAT);
  clearLandingContentCache();
  
  return jsonResponse({
    ok: true,
    message: 'Upload lên ImgBB thành công',
    url: url,
    fileId: fileId,
    feedbackImages: getFeedbackImages(),
    scriptVersion: SCRIPT_VERSION
  });
}

function handleDeleteFeedbackImage(params) {
  requireAdminSession(params.token, ['admin', 'editor']);
  const fileId = cleanValue(params.fileId);
  if (!fileId) throw new Error('Thiếu File ID.');

  if (fileId.indexOf('drive:') === 0) {
    try {
      DriveApp.getFileById(fileId.replace('drive:', '')).setTrashed(true);
    } catch (error) {
      // The Sheet row should still be removed even if the Drive file is already gone.
    }
  }
  
  const sheet = ensureFeedbackImagesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const values = sheet.getRange(2, 4, lastRow - 1, 1).getValues();
    for (let i = 0; i < values.length; i++) {
      if (cleanValue(values[i][0]) === fileId) {
        sheet.deleteRow(i + 2);
        clearLandingContentCache();
        break;
      }
    }
  }
  
  return jsonResponse({
    ok: true,
    message: 'Xóa thành công khỏi hệ thống',
    fileId: fileId,
    feedbackImages: getFeedbackImages(),
    scriptVersion: SCRIPT_VERSION
  });
}

// =============================================
//  Sections Layout
// =============================================
const DEFAULT_SECTIONS_LAYOUT = [
  { enabled: true, id: 'pain-points', type: 'builtin', name: 'Vấn Đề', order: 1 },
  { enabled: true, id: 'about', type: 'builtin', name: 'Về Chúng Tôi', order: 2 },
  { enabled: true, id: 'benefits', type: 'builtin', name: 'Lợi Ích', order: 3 },
  { enabled: true, id: 'testimonials', type: 'builtin', name: 'Cảm Nhận', order: 4 },
  { enabled: true, id: 'packages', type: 'builtin', name: 'Bảng Giá', order: 5 },
  { enabled: true, id: 'methods', type: 'builtin', name: 'Ba Lăng Kính', order: 6 },
  { enabled: true, id: 'process', type: 'builtin', name: 'Lộ Trình', order: 7 },
  { enabled: true, id: 'contact', type: 'builtin', name: 'Liên Hệ', order: 8 }
];

function ensureSectionsLayoutSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(SECTIONS_LAYOUT_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SECTIONS_LAYOUT_SHEET_NAME);
    sheet.getRange(1, 1, 1, SECTIONS_LAYOUT_HEADERS.length).setValues([SECTIONS_LAYOUT_HEADERS]);
    sheet.setFrozenRows(1);
    
    // Insert defaults
    const defaultRows = DEFAULT_SECTIONS_LAYOUT.map(s => [
      s.enabled ? 'TRUE' : 'FALSE',
      s.id,
      s.type,
      s.name,
      s.order,
      '',
      ''
    ]);
    sheet.getRange(2, 1, defaultRows.length, SECTIONS_LAYOUT_HEADERS.length).setValues(defaultRows);
    sheet.autoResizeColumns(1, SECTIONS_LAYOUT_HEADERS.length);
  }
  return sheet;
}

function getSectionsLayout(forAdmin) {
  const sheet = ensureSectionsLayoutSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, SECTIONS_LAYOUT_HEADERS.length).getDisplayValues();
  return values.map(row => {
    return {
      enabled: isTruthy(row[0]),
      id: cleanValue(row[1]),
      type: cleanValue(row[2]) || 'builtin',
      name: cleanValue(row[3]),
      order: Number(row[4]) || 999,
      title: cleanValue(row[5]),
      contentHtml: cleanValue(row[6])
    };
  }).filter(s => s.id && (forAdmin || s.enabled)).sort((a, b) => a.order - b.order);
}

function handleSaveSectionsLayoutOrder(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureSectionsLayoutSheet();
  let updates;
  try {
    updates = JSON.parse(params.updates);
  } catch(e) {
    throw new Error('Du lieu updates khong hop le.');
  }
  
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    updates.forEach(u => {
      const idx = ids.indexOf(u.id);
      if (idx !== -1) {
        const rowNumber = idx + 2;
        if (typeof u.enabled !== 'undefined') sheet.getRange(rowNumber, 1).setValue(u.enabled ? 'TRUE' : 'FALSE');
        if (typeof u.order !== 'undefined') sheet.getRange(rowNumber, 5).setValue(u.order);
      }
    });
  }
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Da luu thu tu sections', sectionsLayout: getSectionsLayout(true), scriptVersion: SCRIPT_VERSION });
}

function handleSaveGenericSection(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureSectionsLayoutSheet();
  const id = cleanValue(params.id) || 'generic-' + new Date().getTime();
  const enabled = isTruthy(params.enabled) ? 'TRUE' : 'FALSE';
  const name = cleanValue(params.name) || 'Khối nội dung';
  const title = cleanValue(params.title);
  const contentHtml = cleanValue(params.contentHtml);
  
  const lastRow = sheet.getLastRow();
  let rowNumber = -1;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) rowNumber = idx + 2;
  }
  
  if (rowNumber !== -1) {
    sheet.getRange(rowNumber, 1).setValue(enabled);
    sheet.getRange(rowNumber, 4).setValue(name);
    sheet.getRange(rowNumber, 6).setValue(title);
    sheet.getRange(rowNumber, 7).setValue(contentHtml);
  } else {
    const order = sheet.getLastRow();
    sheet.appendRow([enabled, id, 'generic', name, order, title, contentHtml]);
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Da luu section', sectionsLayout: getSectionsLayout(true), scriptVersion: SCRIPT_VERSION });
}

function handleDeleteSection(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureSectionsLayoutSheet();
  const id = cleanValue(params.id);
  
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) {
      const type = cleanValue(sheet.getRange(idx + 2, 3).getValue());
      if (type === 'builtin') throw new Error('Khong the xoa section mac dinh.');
      sheet.deleteRow(idx + 2);
    }
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Da xoa section', sectionsLayout: getSectionsLayout(true), scriptVersion: SCRIPT_VERSION });
}
