// =============================================
//  CLOW CAT – LANDING CONTENT GOOGLE APPS SCRIPT
//  File này chỉ dùng cho Sheet chỉnh nội dung Landing Page.
// =============================================

const SPREADSHEET_ID = '1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const ADMIN_USERS_SHEET_NAME = 'Admin users';
const AUDIT_LOG_SHEET_NAME = 'Audit log';
const SCRIPT_VERSION = '2026-06-14-v16-cache-order';
const ADMIN_SESSION_SECONDS = 21600;
const LANDING_CONTENT_CACHE_KEY = 'landing_content_payload_v16';
const LANDING_CONTENT_CACHE_SECONDS = 3600; // 1 tiếng
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
  'Thẻ phụ',
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
const BLOG_CATEGORIES_SHEET_NAME = 'Blog Categories';
const BLOG_ARTICLES_SHEET_NAME = 'Blog Articles';
const BLOG_CATEGORIES_HEADERS = ['Mã chủ đề', 'Tên chủ đề', 'Thứ tự'];
const BLOG_ARTICLES_HEADERS = ['Bật', 'ID', 'Mã chủ đề', 'Tiêu đề', 'Nội dung HTML', 'Ngày đăng', 'Đính lên trên', 'Thumbnail', 'Tóm tắt'];
const DEFAULT_BLOG_CATEGORIES = [
  { id: 'so-chu-dao', name: 'Số chủ đạo', order: 1 },
  { id: 'kham-pha-su-menh', name: 'Hành trình khám phá sứ mệnh', order: 2 },
  { id: 'linh-hon-tien-kiep', name: 'Giải mã linh hồn tiền kiếp', order: 3 },
  { id: 'vuot-qua-no-nghiep', name: 'Hành trình vượt qua nợ nghiệp', order: 4 }
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
const AUDIT_LOG_HEADERS = [
  'Timestamp',
  'Action',
  'Status',
  'Username',
  'Role',
  'Target type',
  'Target ID',
  'Message',
];
const AUDITED_ADMIN_ACTIONS = [
  'loginAdmin',
  'logoutAdmin',
  'saveLandingContentItem',
  'saveLandingContentBatch',
  'changeAdminPassword',
  'createAdminUser',
  'setAdminUserStatus',
  'syncLandingContentTemplate',
  'savePackage',
  'savePackageOrder',
  'deletePackage',
  'savePaymentSettings',
  'uploadFeedbackImage',
  'uploadImage',
  'saveFeedbackImage',
  'deleteFeedbackImage',
  'saveSectionsLayoutOrder',
  'saveGenericSection',
  'deleteSection',
  'saveBlogCategory',
  'deleteBlogCategory',
  'saveBlogArticle',
  'deleteBlogArticle',
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
    let response;
    if (action === 'loginAdmin') response = handleAdminLogin(params);
    else if (action === 'logoutAdmin') response = handleAdminLogout(params);
    else if (action === 'getAdminContent') response = handleGetAdminContent(params);
    else if (action === 'healthCheck') response = handleHealthCheck(params);
    else if (action === 'saveLandingContentItem') response = handleSaveLandingContentItem(params);
    else if (action === 'saveLandingContentBatch') response = handleSaveLandingContentBatch(params);
    else if (action === 'changeAdminPassword') response = handleChangeAdminPassword(params);
    else if (action === 'listAdminUsers') response = handleListAdminUsers(params);
    else if (action === 'createAdminUser') response = handleCreateAdminUser(params);
    else if (action === 'setAdminUserStatus') response = handleSetAdminUserStatus(params);
    else if (action === 'syncLandingContentTemplate') response = handleSyncLandingContentTemplate(params);
    else if (action === 'savePackage') response = handleSavePackage(params);
    else if (action === 'savePackageOrder') response = handleSavePackageOrder(params);
    else if (action === 'deletePackage') response = handleDeletePackage(params);
    else if (action === 'savePaymentSettings') response = handleSavePaymentSettings(params);
    else if (action === 'uploadFeedbackImage') response = handleUploadFeedbackImage(params);
    else if (action === 'uploadImage') response = handleUploadImage(params);
    else if (action === 'saveFeedbackImage') response = handleSaveFeedbackImage(params);
    else if (action === 'deleteFeedbackImage') response = handleDeleteFeedbackImage(params);
    else if (action === 'saveSectionsLayoutOrder') response = handleSaveSectionsLayoutOrder(params);
    else if (action === 'saveGenericSection') response = handleSaveGenericSection(params);
    else if (action === 'deleteSection') response = handleDeleteSection(params);
    else if (action === 'saveBlogCategory') response = handleSaveBlogCategory(params);
    else if (action === 'deleteBlogCategory') response = handleDeleteBlogCategory(params);
    else if (action === 'saveBlogArticle') response = handleSaveBlogArticle(params);
    else if (action === 'deleteBlogArticle') response = handleDeleteBlogArticle(params);
    else response = jsonResponse({ ok: false, message: 'Action khong hop le', scriptVersion: SCRIPT_VERSION });

    auditAdminAction(params, action, response);
    return response;
  } catch (error) {
    auditAdminAction(params, action, null, error);
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
      blogCategories: getBlogCategories(false),
      blogArticles: getBlogArticles(false),
      message: 'Chua co tab Landing content. Hay chay initializeLandingContentSheet mot lan trong Apps Script.',
      scriptVersion: SCRIPT_VERSION,
    };
  }

  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return { ok: true, items: [], packages: getPackages(false), feedbackImages: getFeedbackImages(), paymentSettings: getPaymentSettings(false), sectionsLayout: getSectionsLayout(false), blogCategories: getBlogCategories(false), blogArticles: getBlogArticles(false), scriptVersion: SCRIPT_VERSION };
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
    blogCategories: getBlogCategories(false),
    blogArticles: getBlogArticles(false),
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
      blogCategories: getBlogCategories(true),
      blogArticles: getBlogArticles(true),
      message: 'Chua co tab Landing content. Hay chay initializeLandingContentSheet mot lan.',
      scriptVersion: SCRIPT_VERSION,
    });
  }

  ensureLandingContentHeaderRow(sheet);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return jsonResponse({ ok: true, items: [], sections: [], packages: getPackages(true), feedbackImages: getFeedbackImages(), paymentSettings: getPaymentSettings(true), sectionsLayout: getSectionsLayout(true), blogCategories: getBlogCategories(true), blogArticles: getBlogArticles(true), scriptVersion: SCRIPT_VERSION });
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
    blogCategories: getBlogCategories(true),
    blogArticles: getBlogArticles(true),
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
  const sectionsResult = syncSectionsLayoutDefaults();
  ensurePackagesSheet();
  ensurePaymentSettingsSheet();
  clearLandingContentCache();
  return jsonResponse({
    ok: true,
    result: result,
    sectionsResult: sectionsResult,
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

function buildMiniReportMeaningRows() {
  const lifePath = {
    1: { text: 'Bạn có xu hướng chủ động, độc lập và muốn tự mở đường cho mình.', keywords: 'Chủ động, Tiên phong, Tự lập' },
    2: { text: 'Bạn nhạy cảm với cảm xúc, giỏi kết nối và cần môi trường hài hòa.', keywords: 'Kết nối, Tinh tế, Hợp tác' },
    3: { text: 'Bạn có năng lượng sáng tạo, biểu đạt tốt và dễ truyền cảm hứng.', keywords: 'Sáng tạo, Giao tiếp, Lan tỏa' },
    4: { text: 'Bạn cần nền tảng vững, hệ thống rõ và cảm giác mọi thứ có thể kiểm soát.', keywords: 'Kỷ luật, Bền bỉ, Thực tế' },
    5: { text: 'Bạn học tốt qua trải nghiệm, thích tự do và cần không gian để thay đổi.', keywords: 'Tự do, Linh hoạt, Trải nghiệm' },
    6: { text: 'Bạn quan tâm đến trách nhiệm, gia đình, cộng đồng và sự chăm sóc.', keywords: 'Yêu thương, Trách nhiệm, Chữa lành' },
    7: { text: 'Bạn có chiều sâu nội tâm, thích quan sát và thường cần thời gian để hiểu chính mình.', keywords: 'Chiêm nghiệm, Trực giác, Phân tích' },
    8: { text: 'Bạn có bài học về năng lực, thành tựu, quản trị và cách dùng sức ảnh hưởng.', keywords: 'Thành tựu, Quản trị, Ảnh hưởng' },
    9: { text: 'Bạn giàu lòng trắc ẩn, có tầm nhìn rộng và thường học qua sự buông bỏ.', keywords: 'Nhân ái, Tầm nhìn, Phụng sự' },
    11: { text: 'Bạn nhạy năng lượng, giàu trực giác và dễ trở thành người truyền cảm hứng.', keywords: 'Trực giác, Khai sáng, Cảm hứng' },
    22: { text: 'Bạn mang năng lượng kiến tạo lớn, cần biến lý tưởng thành cấu trúc thực tế.', keywords: 'Kiến tạo, Tầm vóc, Xây dựng' },
    33: { text: 'Bạn mang năng lượng chữa lành và phụng sự lớn, cần học cách yêu thương mà không đánh mất chính mình.', keywords: 'Chữa lành, Phụng sự, Yêu thương' },
  };
  const personalYear = {
    1: 'Năm khởi đầu: phù hợp gieo hạt, mở dự án mới và chủ động chọn hướng đi.',
    2: 'Năm kết nối: phù hợp hợp tác, lắng nghe cảm xúc và nuôi dưỡng quan hệ.',
    3: 'Năm biểu đạt: phù hợp sáng tạo, học hỏi, truyền thông và mở rộng niềm vui.',
    4: 'Năm xây nền: phù hợp kỷ luật, hệ thống hóa và xử lý những việc cần bền bỉ.',
    5: 'Năm thay đổi: phù hợp thử nghiệm, dịch chuyển và làm mới góc nhìn.',
    6: 'Năm trách nhiệm: phù hợp chăm sóc gia đình, chữa lành và cân bằng nghĩa vụ.',
    7: 'Năm chiêm nghiệm: phù hợp học sâu, tĩnh lại và hiểu rõ câu hỏi bên trong.',
    8: 'Năm thành tựu: phù hợp quản trị tài chính, sự nghiệp và năng lực cá nhân.',
    9: 'Năm hoàn tất: phù hợp tổng kết, buông bỏ điều cũ và chuẩn bị chu kỳ mới.',
  };
  const soul = {
    1: { text: 'Bên trong bạn khao khát được tự quyết, được dẫn đường và được là chính mình.', keywords: 'Tự chủ, Dẫn dắt, Can đảm' },
    2: { text: 'Linh hồn bạn cần sự kết nối, thấu hiểu và cảm giác được đồng hành nhẹ nhàng.', keywords: 'Kết nối, Hòa hợp, Tinh tế' },
    3: { text: 'Bạn được nuôi dưỡng bởi biểu đạt, sáng tạo và niềm vui được chia sẻ cảm xúc.', keywords: 'Biểu đạt, Sáng tạo, Niềm vui' },
    4: { text: 'Bạn cần cảm giác vững vàng, rõ ràng và một nền tảng đủ an toàn để phát triển.', keywords: 'Ổn định, Kỷ luật, An toàn' },
    5: { text: 'Linh hồn bạn tìm kiếm tự do, trải nghiệm mới và không gian để thay đổi.', keywords: 'Tự do, Khám phá, Linh hoạt' },
    6: { text: 'Bạn có nhu cầu yêu thương, chăm sóc và tạo nên sự hài hòa cho người mình quý.', keywords: 'Yêu thương, Chăm sóc, Hài hòa' },
    7: { text: 'Bên trong bạn cần chiều sâu, sự tĩnh lặng và quyền được hiểu mọi thứ theo cách riêng.', keywords: 'Chiều sâu, Tĩnh lặng, Trực giác' },
    8: { text: 'Bạn mong muốn làm chủ năng lực, tạo thành tựu và dùng sức ảnh hưởng đúng cách.', keywords: 'Thành tựu, Bản lĩnh, Ảnh hưởng' },
    9: { text: 'Linh hồn bạn hướng đến lòng trắc ẩn, sự bao dung và những giá trị lớn hơn bản thân.', keywords: 'Bao dung, Nhân ái, Phụng sự' },
    11: { text: 'Bạn có trực giác mạnh, dễ rung cảm với năng lượng xung quanh và cần tin vào ánh sáng nội tâm.', keywords: 'Trực giác, Cảm hứng, Khai mở' },
    22: { text: 'Bạn mang khát vọng kiến tạo điều có ích, biến lý tưởng sâu bên trong thành cấu trúc thật.', keywords: 'Kiến tạo, Lý tưởng, Bền vững' },
    33: { text: 'Sâu bên trong bạn có nhu cầu yêu thương, chữa lành và nâng đỡ người khác bằng sự bao dung trưởng thành.', keywords: 'Yêu thương, Chữa lành, Bao dung' },
  };
  const mission = {
    1: { text: 'Sứ mệnh của bạn là học cách đứng vững, mở đường và tạo dấu ấn riêng.', keywords: 'Mở đường, Độc lập, Tiên phong' },
    2: { text: 'Bạn phát triển tốt khi trở thành người kết nối, hòa giải và nâng đỡ các mối quan hệ.', keywords: 'Hợp tác, Kết nối, Lắng nghe' },
    3: { text: 'Con đường của bạn gắn với sáng tạo, truyền đạt và lan tỏa cảm hứng qua lời nói hoặc tác phẩm.', keywords: 'Giao tiếp, Sáng tạo, Lan tỏa' },
    4: { text: 'Bạn đến để xây nền, tạo hệ thống và biến ý tưởng thành kết quả có thể dùng lâu dài.', keywords: 'Xây dựng, Hệ thống, Bền bỉ' },
    5: { text: 'Bạn học qua trải nghiệm, thích nghi nhanh và giúp người khác nhìn thấy nhiều lựa chọn hơn.', keywords: 'Thích nghi, Trải nghiệm, Đổi mới' },
    6: { text: 'Sứ mệnh của bạn liên quan đến trách nhiệm, chữa lành và tạo không gian an toàn cho người khác.', keywords: 'Chữa lành, Trách nhiệm, Gia đình' },
    7: { text: 'Bạn có thiên hướng nghiên cứu, chiêm nghiệm và chia sẻ hiểu biết sau khi đã tự mình đào sâu.', keywords: 'Nghiên cứu, Chiêm nghiệm, Minh triết' },
    8: { text: 'Bạn phát triển qua năng lực quản trị, tạo giá trị vật chất và dùng quyền lực một cách tỉnh táo.', keywords: 'Quản trị, Giá trị, Thành tựu' },
    9: { text: 'Sứ mệnh của bạn là mở rộng lòng trắc ẩn, hoàn thiện bài học cũ và đóng góp cho cộng đồng.', keywords: 'Cộng đồng, Bao dung, Hoàn thiện' },
    11: { text: 'Bạn có sứ mệnh truyền cảm hứng, đánh thức trực giác và giúp người khác tin vào ánh sáng của họ.', keywords: 'Truyền cảm hứng, Khai sáng, Trực giác' },
    22: { text: 'Bạn có khả năng xây dựng điều lớn nếu biết kết hợp tầm nhìn với kỷ luật thực tế.', keywords: 'Tầm nhìn, Kiến tạo, Thực tế' },
    33: { text: 'Bạn có sứ mệnh lan tỏa tình thương, chữa lành và dẫn dắt bằng sự nâng đỡ thay vì kiểm soát.', keywords: 'Lan tỏa, Chữa lành, Nâng đỡ' },
  };

  const rows = [];
  appendMiniReportMeaningRows(rows, 'life_path', 'Số chủ đạo', lifePath);
  appendMiniReportMeaningRows(rows, 'personal_year', 'Năm cá nhân', personalYear);
  appendMiniReportMeaningRows(rows, 'soul', 'Linh hồn', soul);
  appendMiniReportMeaningRows(rows, 'mission', 'Sứ mệnh', mission);
  return rows;
}

function appendMiniReportMeaningRows(rows, type, label, meanings) {
  Object.keys(meanings).forEach(function(number) {
    const meaning = meanings[number];
    const text = typeof meaning === 'string' ? meaning : meaning.text;
    rows.push(lc(true, 'mini_report.' + type + '.' + number + '.text', 'Tra Cứu Thử', label + ' ' + number + ' - Luận giải', '', 'text', '', text));
    if (meaning.keywords) {
      rows.push(lc(true, 'mini_report.' + type + '.' + number + '.keywords', 'Tra Cứu Thử', label + ' ' + number + ' - Từ khóa', '', 'text', '', meaning.keywords));
    }
  });
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
    lc(true, 'nav.blog', 'Menu', 'Menu giải mã', '#nav-links li:nth-child(6) .nav-link', 'text', '', 'Giải mã nhân số học'),
    lc(true, 'nav.contact', 'Menu', 'Menu CTA', '#nav-links li:nth-child(7) .nav-link', 'text', '', 'Đặt Lịch Ngay'),
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

    lc(true, 'mini_report.tag', 'Tra Cứu Thử', 'Tag section', '#mini-report .section-tag', 'text', '', 'Tra Cứu Thử Miễn Phí'),
    lc(true, 'mini_report.title', 'Tra Cứu Thử', 'Tiêu đề section', '#mini-report .mini-report-title', 'text', '', 'Nhận bản xem nhanh nhân số của bạn'),
    lc(true, 'mini_report.desc', 'Tra Cứu Thử', 'Mô tả section', '#mini-report .mini-report-desc', 'text', '', 'Nhập tên và ngày sinh để xem số chủ đạo, năm cá nhân và một vài gợi ý ban đầu trước khi đặt lịch tư vấn sâu.'),
    lc(true, 'mini_report.point_1', 'Tra Cứu Thử', 'Điểm nhấn 1', '#mini-report .mini-report-points span:nth-child(1)', 'html', '', '<i class="fa-solid fa-circle-check"></i> Kết quả hiển thị tức thì'),
    lc(true, 'mini_report.point_2', 'Tra Cứu Thử', 'Điểm nhấn 2', '#mini-report .mini-report-points span:nth-child(2)', 'html', '', '<i class="fa-solid fa-circle-check"></i> Không cần thanh toán'),
    lc(true, 'mini_report.point_3', 'Tra Cứu Thử', 'Điểm nhấn 3', '#mini-report .mini-report-points span:nth-child(3)', 'html', '', '<i class="fa-solid fa-circle-check"></i> Gợi ý bước tiếp theo rõ ràng'),
    lc(true, 'mini_report.name_label', 'Tra Cứu Thử', 'Nhãn họ tên', '#mini-report label[for="mini-name"]', 'text', '', 'Họ và tên'),
    lc(true, 'mini_report.name_placeholder', 'Tra Cứu Thử', 'Placeholder họ tên', '#mini-name', 'attr', 'placeholder', 'Nhập họ tên của bạn'),
    lc(true, 'mini_report.dob_label', 'Tra Cứu Thử', 'Nhãn ngày sinh', '#mini-report label[for="mini-dob"]', 'text', '', 'Ngày sinh'),
    lc(true, 'mini_report.button', 'Tra Cứu Thử', 'Nút xem kết quả', '#mini-report-submit span', 'text', '', 'Xem phân tích sơ bộ'),
    lc(true, 'mini_report.cta', 'Tra Cứu Thử', 'Nút đặt lịch sau kết quả', '#mini-report .mini-result-action .btn', 'text', '', 'Đặt lịch phân tích sâu'),
    ...buildMiniReportMeaningRows(),

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

    lc(true, 'compare.tag', 'So Sánh Gói', 'Tag section', '#package-compare .section-tag', 'text', '', 'Chọn Gói Dễ Hơn'),
    lc(true, 'compare.title', 'So Sánh Gói', 'Tiêu đề section', '#package-compare .section-title', 'text', '', 'So Sánh Nhanh Các Gói Tư Vấn'),
    lc(true, 'compare.header_1', 'So Sánh Gói', 'Header cột tiêu chí', '#package-compare thead th:nth-child(1)', 'text', '', 'Tiêu chí'),
    lc(true, 'compare.header_2', 'So Sánh Gói', 'Header cột năm cá nhân', '#package-compare thead th:nth-child(2)', 'text', '', 'Năm cá nhân'),
    lc(true, 'compare.header_3', 'So Sánh Gói', 'Header cột BIG 3', '#package-compare thead th:nth-child(3)', 'text', '', 'BIG 3'),
    lc(true, 'compare.header_4', 'So Sánh Gói', 'Header cột toàn diện', '#package-compare thead th:nth-child(4)', 'text', '', 'Toàn diện'),
    lc(true, 'compare.row_1_label', 'So Sánh Gói', 'Hàng 1 nhãn', '#package-compare tbody tr:nth-child(1) td:nth-child(1)', 'text', '', 'Phù hợp nếu bạn'),
    lc(true, 'compare.row_1_year', 'So Sánh Gói', 'Hàng 1 năm cá nhân', '#package-compare tbody tr:nth-child(1) td:nth-child(2)', 'text', '', 'Muốn định hướng 6-12 tháng tới'),
    lc(true, 'compare.row_1_big3', 'So Sánh Gói', 'Hàng 1 BIG 3', '#package-compare tbody tr:nth-child(1) td:nth-child(3)', 'text', '', 'Muốn hiểu tính cách lõi'),
    lc(true, 'compare.row_1_full', 'So Sánh Gói', 'Hàng 1 toàn diện', '#package-compare tbody tr:nth-child(1) td:nth-child(4)', 'text', '', 'Muốn bản đồ cá nhân sâu để dùng lâu dài'),
    lc(true, 'compare.row_2_label', 'So Sánh Gói', 'Hàng 2 nhãn', '#package-compare tbody tr:nth-child(2) td:nth-child(1)', 'text', '', 'Chỉ số phân tích'),
    lc(true, 'compare.row_2_year', 'So Sánh Gói', 'Hàng 2 năm cá nhân', '#package-compare tbody tr:nth-child(2) td:nth-child(2)', 'text', '', 'Năm cá nhân và chu kỳ hiện tại'),
    lc(true, 'compare.row_2_big3', 'So Sánh Gói', 'Hàng 2 BIG 3', '#package-compare tbody tr:nth-child(2) td:nth-child(3)', 'text', '', 'Chủ đạo, linh hồn, sứ mệnh'),
    lc(true, 'compare.row_2_full', 'So Sánh Gói', 'Hàng 2 toàn diện', '#package-compare tbody tr:nth-child(2) td:nth-child(4)', 'text', '', '7 chỉ số cốt lõi, chu kỳ, đỉnh cao'),
    lc(true, 'compare.row_3_label', 'So Sánh Gói', 'Hàng 3 nhãn', '#package-compare tbody tr:nth-child(3) td:nth-child(1)', 'text', '', 'Đầu ra chính'),
    lc(true, 'compare.row_3_year', 'So Sánh Gói', 'Hàng 3 năm cá nhân', '#package-compare tbody tr:nth-child(3) td:nth-child(2)', 'text', '', 'Gợi ý hành động theo năm'),
    lc(true, 'compare.row_3_big3', 'So Sánh Gói', 'Hàng 3 BIG 3', '#package-compare tbody tr:nth-child(3) td:nth-child(3)', 'text', '', 'Hiểu điểm mạnh, động lực và hướng phát triển'),
    lc(true, 'compare.row_3_full', 'So Sánh Gói', 'Hàng 3 toàn diện', '#package-compare tbody tr:nth-child(3) td:nth-child(4)', 'text', '', 'Lộ trình phân tích đầy đủ kèm PDF tóm tắt'),
    lc(true, 'compare.row_4_label', 'So Sánh Gói', 'Hàng 4 nhãn', '#package-compare tbody tr:nth-child(4) td:nth-child(1)', 'text', '', 'Mức độ chuyên sâu'),
    lc(true, 'compare.row_4_year', 'So Sánh Gói', 'Hàng 4 năm cá nhân', '#package-compare tbody tr:nth-child(4) td:nth-child(2)', 'text', '', 'Cơ bản'),
    lc(true, 'compare.row_4_big3', 'So Sánh Gói', 'Hàng 4 BIG 3', '#package-compare tbody tr:nth-child(4) td:nth-child(3)', 'text', '', 'Trung bình'),
    lc(true, 'compare.row_4_full', 'So Sánh Gói', 'Hàng 4 toàn diện', '#package-compare tbody tr:nth-child(4) td:nth-child(4)', 'text', '', 'Chuyên sâu nhất'),

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

    lc(true, 'faq.tag', 'FAQ', 'Tag section', '#faq .section-tag', 'text', '', 'Giải Đáp Trước Khi Đặt Lịch'),
    lc(true, 'faq.title', 'FAQ', 'Tiêu đề section', '#faq .section-title', 'text', '', 'Những Câu Hỏi Thường Gặp'),
    lc(true, 'faq.q1', 'FAQ', 'Câu hỏi 1', '#faq .faq-item:nth-child(1) summary', 'text', '', 'Tôi chưa biết chọn gói nào thì sao?'),
    lc(true, 'faq.a1', 'FAQ', 'Trả lời 1', '#faq .faq-item:nth-child(1) p', 'text', '', 'Bạn có thể gửi điều đang trăn trở trong form đặt lịch. Tụi mình sẽ hỗ trợ chọn gói phù hợp trước khi xác nhận lịch.'),
    lc(true, 'faq.q2', 'FAQ', 'Câu hỏi 2', '#faq .faq-item:nth-child(2) summary', 'text', '', 'Buổi tư vấn diễn ra như thế nào?'),
    lc(true, 'faq.a2', 'FAQ', 'Trả lời 2', '#faq .faq-item:nth-child(2) p', 'text', '', 'Buổi tư vấn là cuộc trò chuyện 1:1, đi từ ngày sinh, họ tên, các chỉ số cốt lõi đến câu chuyện thực tế của bạn.'),
    lc(true, 'faq.q3', 'FAQ', 'Câu hỏi 3', '#faq .faq-item:nth-child(3) summary', 'text', '', 'Sau buổi tư vấn có nhận file không?'),
    lc(true, 'faq.a3', 'FAQ', 'Trả lời 3', '#faq .faq-item:nth-child(3) p', 'text', '', 'Gói Toàn Diện có PDF tóm tắt đầy đủ. Các gói khác vẫn có phần ghi chú định hướng theo nội dung đã tư vấn.'),
    lc(true, 'faq.q4', 'FAQ', 'Câu hỏi 4', '#faq .faq-item:nth-child(4) summary', 'text', '', 'Thông tin cá nhân của tôi có được bảo mật không?'),
    lc(true, 'faq.a4', 'FAQ', 'Trả lời 4', '#faq .faq-item:nth-child(4) p', 'text', '', 'Có. Thông tin ngày sinh, số điện thoại và nội dung chia sẻ chỉ dùng để chuẩn bị và thực hiện buổi tư vấn.'),
    lc(true, 'faq.q5', 'FAQ', 'Câu hỏi 5', '#faq .faq-item:nth-child(5) summary', 'text', '', 'Online và offline khác nhau gì?'),
    lc(true, 'faq.a5', 'FAQ', 'Trả lời 5', '#faq .faq-item:nth-child(5) p', 'text', '', 'Online phù hợp nếu bạn muốn linh hoạt thời gian và địa điểm. Offline phù hợp khi bạn muốn gặp trực tiếp tại TP.HCM.'),
    lc(true, 'faq.q6', 'FAQ', 'Câu hỏi 6', '#faq .faq-item:nth-child(6) summary', 'text', '', 'Có thể đổi lịch không?'),
    lc(true, 'faq.a6', 'FAQ', 'Trả lời 6', '#faq .faq-item:nth-child(6) p', 'text', '', 'Có thể đổi lịch nếu bạn báo trước để tụi mình sắp xếp lại khung giờ phù hợp.'),

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

function handleHealthCheck(params) {
  requireAdminSession(params.token, ['admin']);
  ensureHealthCheckSheets();

  const sheetChecks = [
    checkSheetHeaders(LANDING_CONTENT_SHEET_NAME, LANDING_CONTENT_HEADERS),
    checkSheetHeaders(PACKAGES_SHEET_NAME, PACKAGES_HEADERS),
    checkSheetHeaders(FEEDBACK_IMAGES_SHEET_NAME, FEEDBACK_IMAGES_HEADERS),
    checkSheetHeaders(PAYMENT_SETTINGS_SHEET_NAME, PAYMENT_SETTINGS_HEADERS),
    checkSheetHeaders(SECTIONS_LAYOUT_SHEET_NAME, SECTIONS_LAYOUT_HEADERS),
    checkSheetHeaders(BLOG_CATEGORIES_SHEET_NAME, BLOG_CATEGORIES_HEADERS),
    checkSheetHeaders(BLOG_ARTICLES_SHEET_NAME, BLOG_ARTICLES_HEADERS),
    checkSheetHeaders(ADMIN_USERS_SHEET_NAME, ADMIN_USERS_HEADERS),
    checkSheetHeaders(AUDIT_LOG_SHEET_NAME, AUDIT_LOG_HEADERS),
  ];
  const scriptProperties = PropertiesService.getScriptProperties();
  const propertyChecks = [
    {
      key: 'IMGBB_API_KEY',
      ok: Boolean(cleanValue(scriptProperties.getProperty('IMGBB_API_KEY')) || cleanValue(IMGBB_API_KEY)),
      required: false,
      message: 'Thieu IMGBB_API_KEY thi upload anh se dung fallback Google Drive.',
    },
    {
      key: SEPAY_SECRET_KEY_PROPERTY,
      ok: Boolean(cleanValue(scriptProperties.getProperty(SEPAY_SECRET_KEY_PROPERTY))),
      required: false,
      message: 'Chi bat buoc khi dung cau hinh SePay co secret key.',
    },
  ];
  const requiredSheetsOk = sheetChecks.every((check) => check.ok);
  const requiredPropertiesOk = propertyChecks.every((check) => check.ok || !check.required);

  return jsonResponse({
    ok: requiredSheetsOk && requiredPropertiesOk,
    sheets: sheetChecks,
    properties: propertyChecks,
    scriptVersion: SCRIPT_VERSION,
  });
}

function ensureHealthCheckSheets() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  const landingSheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
  if (landingSheet) ensureLandingContentHeaderRow(landingSheet);
  ensurePackagesSheet();
  ensureFeedbackImagesSheet();
  ensurePaymentSettingsSheet();
  ensureSectionsLayoutSheet();
  ensureBlogCategoriesSheet();
  ensureBlogArticlesSheet();
  ensureAdminUsersSheet();
  ensureAuditLogSheet();
}

function checkSheetHeaders(sheetName, expectedHeaders) {
  const spreadsheet = getSpreadsheetByIdOrActive();
  const sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) {
    return { name: sheetName, ok: false, message: 'Thieu sheet' };
  }

  const actualHeaders = sheet.getRange(1, 1, 1, expectedHeaders.length).getDisplayValues()[0]
    .map((header) => cleanValue(header));
  const missing = expectedHeaders.filter((header, index) => actualHeaders[index] !== header);
  return {
    name: sheetName,
    ok: missing.length === 0,
    missing: missing,
    message: missing.length ? 'Header khong khop' : 'OK',
  };
}

function ensureAuditLogSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(AUDIT_LOG_SHEET_NAME);
  if (!sheet) sheet = spreadsheet.insertSheet(AUDIT_LOG_SHEET_NAME);
  sheet.getRange(1, 1, 1, AUDIT_LOG_HEADERS.length).setValues([AUDIT_LOG_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, AUDIT_LOG_HEADERS.length);
  return sheet;
}

function auditAdminAction(params, action, response, error) {
  if (AUDITED_ADMIN_ACTIONS.indexOf(action) === -1) return;

  try {
    const session = getAdminSession(params.token) || {};
    const responsePayload = readJsonResponsePayload(response);
    const status = error || responsePayload.ok === false ? 'FAIL' : 'OK';
    const sheet = ensureAuditLogSheet();
    sheet.appendRow([
      formatAdminDate(getVietnamNow()),
      cleanAuditValue(action, 80),
      status,
      cleanAuditValue(session.username || params.username || '', 80),
      cleanAuditValue(session.role || '', 40),
      getAuditTargetType(action),
      getAuditTargetId(params),
      cleanAuditValue(error ? error.message : (responsePayload.message || ''), 300),
    ]);
  } catch (auditError) {
    console.warn('Khong ghi duoc audit log:', auditError);
  }
}

function readJsonResponsePayload(response) {
  if (!response || typeof response.getContent !== 'function') return {};
  try {
    return JSON.parse(response.getContent() || '{}');
  } catch (error) {
    return {};
  }
}

function getAuditTargetType(action) {
  if (action.indexOf('Package') !== -1) return 'package';
  if (action.indexOf('Feedback') !== -1 || action === 'uploadImage') return 'feedback';
  if (action.indexOf('Section') !== -1) return 'section';
  if (action.indexOf('BlogCategory') !== -1) return 'blog_category';
  if (action.indexOf('BlogArticle') !== -1) return 'blog_article';
  if (action.indexOf('User') !== -1 || action === 'changeAdminPassword') return 'admin_user';
  if (action.indexOf('Payment') !== -1) return 'payment_settings';
  if (action.indexOf('LandingContent') !== -1 || action === 'syncLandingContentTemplate') return 'landing_content';
  return 'admin';
}

function getAuditTargetId(params) {
  return cleanAuditValue(
    params.key ||
    params.code ||
    params.id ||
    params.categoryId ||
    params.articleId ||
    params.fileId ||
    params.username ||
    '',
    160
  );
}

function cleanAuditValue(value, maxLength) {
  return cleanValue(value)
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength || 200);
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
  return values.map((row, index) => ({
    rowIndex: index,
    createdAtRaw: row[0] instanceof Date ? row[0].getTime() : 0,
    createdAt: formatAdminDate(row[0]),
    filename: cleanValue(row[1]),
    url: cleanValue(row[2]),
    fileId: cleanValue(row[3]),
    uploadedBy: cleanValue(row[4]),
  }))
    .filter(img => img.url)
    .sort((a, b) => (b.createdAtRaw - a.createdAtRaw) || (b.rowIndex - a.rowIndex))
    .map(({ rowIndex, createdAtRaw, ...img }) => ({
      ...img,
      sortOrder: createdAtRaw || rowIndex + 1,
    }));
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

function handleUploadImage(params) {
  requireAdminSession(params.token, ['admin', 'editor']);
  const imageBase64 = cleanValue(params.imageBase64);
  const filename = cleanValue(params.filename) || 'image_' + new Date().getTime() + '.jpg';

  if (!imageBase64) throw new Error('Thieu du lieu anh can upload.');

  // The specific Drive folder for blog images provided by the user
  const folderId = '1dXKyPdPFVOGrmAQcVXKk2dJc9U2btEQ6';
  
  const safeFilename = filename;
  const mimeType = getImageMimeTypeFromFilename(safeFilename);
  const bytes = Utilities.base64Decode(imageBase64);
  const blob = Utilities.newBlob(bytes, mimeType, safeFilename);
  
  const folder = DriveApp.getFolderById(folderId);
  const file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  const fileId = file.getId();
  const url = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(fileId) + '&sz=w1200';

  return jsonResponse({
    ok: true,
    message: 'Upload thanh cong len Google Drive',
    url: url
  });
}

// ==========================================
// MIGRATION SCRIPT: Cập nhật toàn bộ ảnh bài viết sang Drive
// ==========================================
function migrateBlogImagesToDrive() {
  const folderId = '1dXKyPdPFVOGrmAQcVXKk2dJc9U2btEQ6';
  const folder = DriveApp.getFolderById(folderId);
  const sheet = ensureBlogArticlesSheet();
  const data = sheet.getDataRange().getValues();
  
  if (data.length <= 1) return 'Không có bài viết nào để cập nhật.';
  
  let updatedCount = 0;
  
  for (let i = 1; i < data.length; i++) {
    const row = data[i];
    const title = row[1];
    let thumbnailUrl = row[4];
    
    // Nếu ảnh chưa phải là Drive link, ta sẽ tải về và up lên Drive
    if (thumbnailUrl && thumbnailUrl.indexOf('drive.google.com') === -1) {
      try {
        const response = UrlFetchApp.fetch(thumbnailUrl);
        const blob = response.getBlob();
        blob.setName('blog_' + title.replace(/[^a-zA-Z0-9]/g, '_') + '.jpg');
        
        const file = folder.createFile(blob);
        file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
        
        const newUrl = 'https://drive.google.com/thumbnail?id=' + encodeURIComponent(file.getId()) + '&sz=w1200';
        
        // Cập nhật lại cột Thumbnail (Cột E -> index 4 + 1 = 5)
        sheet.getRange(i + 1, 5).setValue(newUrl);
        updatedCount++;
      } catch (err) {
        Logger.log('Lỗi khi tải ảnh bài viết: ' + title + ' - ' + err.message);
      }
    }
  }
  
  clearLandingContentCache();
  return 'Đã cập nhật thành công ' + updatedCount + ' ảnh bài viết sang Drive!';
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
  { enabled: true, id: 'mini-report', type: 'builtin', name: 'Tra Cứu Thử', order: 2 },
  { enabled: true, id: 'about', type: 'builtin', name: 'Về Chúng Tôi', order: 3 },
  { enabled: true, id: 'benefits', type: 'builtin', name: 'Lợi Ích', order: 4 },
  { enabled: true, id: 'testimonials', type: 'builtin', name: 'Cảm Nhận', order: 5 },
  { enabled: true, id: 'packages', type: 'builtin', name: 'Bảng Giá', order: 6 },
  { enabled: true, id: 'package-compare', type: 'builtin', name: 'So Sánh Gói', order: 7 },
  { enabled: true, id: 'methods', type: 'builtin', name: 'Ba Lăng Kính', order: 8 },
  { enabled: true, id: 'process', type: 'builtin', name: 'Lộ Trình', order: 9 },
  { enabled: true, id: 'faq', type: 'builtin', name: 'FAQ', order: 10 },
  { enabled: true, id: 'contact', type: 'builtin', name: 'Liên Hệ', order: 11 }
];

function ensureSectionsLayoutSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(SECTIONS_LAYOUT_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(SECTIONS_LAYOUT_SHEET_NAME);
    
    // Insert defaults
    const defaultRows = DEFAULT_SECTIONS_LAYOUT.map(s => [
      s.enabled ? 'TRUE' : 'FALSE',
      s.id,
      s.type,
      s.name,
      s.order,
      '',
      '',
      ''
    ]);
    sheet.getRange(2, 1, defaultRows.length, SECTIONS_LAYOUT_HEADERS.length).setValues(defaultRows);
  }
  sheet.getRange(1, 1, 1, SECTIONS_LAYOUT_HEADERS.length).setValues([SECTIONS_LAYOUT_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SECTIONS_LAYOUT_HEADERS.length);
  return sheet;
}

function syncSectionsLayoutDefaults() {
  const sheet = ensureSectionsLayoutSheet();
  const lastRow = sheet.getLastRow();
  const existingIds = lastRow >= 2
    ? sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim())
    : [];
  const existingSet = {};
  existingIds.forEach(id => existingSet[id] = true);

  const nextOrder = lastRow;
  const rowsToAppend = DEFAULT_SECTIONS_LAYOUT
    .filter(s => !existingSet[s.id])
    .map((s, index) => [
      s.enabled ? 'TRUE' : 'FALSE',
      s.id,
      s.type,
      s.name,
      nextOrder + index + 1,
      '',
      '',
      ''
    ]);

  if (rowsToAppend.length) {
    sheet.getRange(sheet.getLastRow() + 1, 1, rowsToAppend.length, SECTIONS_LAYOUT_HEADERS.length).setValues(rowsToAppend);
  }

  return { ok: true, added: rowsToAppend.length };
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
      tag: cleanValue(row[6]),
      contentHtml: cleanValue(row[7])
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
  const tag = cleanValue(params.tag);
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
    sheet.getRange(rowNumber, 7).setValue(tag);
    sheet.getRange(rowNumber, 8).setValue(contentHtml);
  } else {
    const order = sheet.getLastRow();
    sheet.appendRow([enabled, id, 'generic', name, order, title, tag, contentHtml]);
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

// =============================================
//  Blog Categories
// =============================================
function ensureBlogCategoriesSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(BLOG_CATEGORIES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(BLOG_CATEGORIES_SHEET_NAME);
    sheet.getRange(1, 1, 1, BLOG_CATEGORIES_HEADERS.length).setValues([BLOG_CATEGORIES_HEADERS]);
    sheet.setFrozenRows(1);
    
    // Insert defaults
    const defaultRows = DEFAULT_BLOG_CATEGORIES.map(c => [
      c.id,
      c.name,
      c.order
    ]);
    sheet.getRange(2, 1, defaultRows.length, BLOG_CATEGORIES_HEADERS.length).setValues(defaultRows);
    sheet.autoResizeColumns(1, BLOG_CATEGORIES_HEADERS.length);
  }
  return sheet;
}

function getBlogCategories(forAdmin) {
  const sheet = ensureBlogCategoriesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, BLOG_CATEGORIES_HEADERS.length).getDisplayValues();
  return values.map(row => {
    return {
      id: cleanValue(row[0]),
      name: cleanValue(row[1]),
      order: Number(row[2]) || 999
    };
  }).filter(c => c.id).sort((a, b) => a.order - b.order);
}

function handleSaveBlogCategory(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureBlogCategoriesSheet();
  const id = cleanValue(params.id) || 'cat-' + new Date().getTime();
  const name = cleanValue(params.name) || 'Tên chủ đề';
  
  const lastRow = sheet.getLastRow();
  let rowNumber = -1;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) rowNumber = idx + 2;
  }
  
  if (rowNumber !== -1) {
    sheet.getRange(rowNumber, 2).setValue(name);
  } else {
    const order = sheet.getLastRow();
    sheet.appendRow([id, name, order]);
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Đã lưu chủ đề', blogCategories: getBlogCategories(true), scriptVersion: SCRIPT_VERSION });
}

function handleDeleteBlogCategory(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureBlogCategoriesSheet();
  const id = cleanValue(params.id);
  
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) {
      sheet.deleteRow(idx + 2);
    }
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Đã xóa chủ đề', blogCategories: getBlogCategories(true), scriptVersion: SCRIPT_VERSION });
}

// =============================================
//  Blog Articles
// =============================================
function ensureBlogArticlesSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(BLOG_ARTICLES_SHEET_NAME);
  if (!sheet) {
    sheet = spreadsheet.insertSheet(BLOG_ARTICLES_SHEET_NAME);
    sheet.getRange(1, 1, 1, BLOG_ARTICLES_HEADERS.length).setValues([BLOG_ARTICLES_HEADERS]);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function getBlogArticles(forAdmin) {
  const sheet = ensureBlogArticlesSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];
  
  const values = sheet.getRange(2, 1, lastRow - 1, BLOG_ARTICLES_HEADERS.length).getDisplayValues();
  return values.map(row => {
    return {
      enabled: isTruthy(row[0]),
      id: cleanValue(row[1]),
      categoryId: cleanValue(row[2]),
      title: cleanValue(row[3]),
      contentHtml: cleanValue(row[4]),
      date: cleanValue(row[5]),
      pinned: isTruthy(row[6]),
      thumbnail: cleanValue(row[7]),
      summary: cleanValue(row[8])
    };
  }).filter(a => a.id && (forAdmin || a.enabled));
}

function handleSaveBlogArticle(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureBlogArticlesSheet();
  const id = cleanValue(params.id) || 'post-' + new Date().getTime();
  const enabled = isTruthy(params.enabled) ? 'TRUE' : 'FALSE';
  const categoryId = cleanValue(params.categoryId);
  const title = cleanValue(params.title);
  const contentHtml = cleanValue(params.contentHtml);
  const date = cleanValue(params.date) || new Date().toISOString().slice(0,10);
  const pinned = isTruthy(params.pinned) ? 'TRUE' : 'FALSE';
  const thumbnail = cleanValue(params.thumbnail);
  const summary = cleanValue(params.summary);
  
  const lastRow = sheet.getLastRow();
  let rowNumber = -1;
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) rowNumber = idx + 2;
  }
  
  if (rowNumber !== -1) {
    sheet.getRange(rowNumber, 1).setValue(enabled);
    sheet.getRange(rowNumber, 3).setValue(categoryId);
    sheet.getRange(rowNumber, 4).setValue(title);
    sheet.getRange(rowNumber, 5).setValue(contentHtml);
    sheet.getRange(rowNumber, 6).setValue(date);
    sheet.getRange(rowNumber, 7).setValue(pinned);
    sheet.getRange(rowNumber, 8).setValue(thumbnail);
    sheet.getRange(rowNumber, 9).setValue(summary);
  } else {
    sheet.appendRow([enabled, id, categoryId, title, contentHtml, date, pinned, thumbnail, summary]);
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Đã lưu bài viết', blogArticles: getBlogArticles(true), scriptVersion: SCRIPT_VERSION });
}

function handleDeleteBlogArticle(params) {
  requireAdminSession(params.token, ['admin']);
  const sheet = ensureBlogArticlesSheet();
  const id = cleanValue(params.id);
  
  const lastRow = sheet.getLastRow();
  if (lastRow >= 2) {
    const ids = sheet.getRange(2, 2, lastRow - 1, 1).getValues().map(r => String(r[0]).trim());
    const idx = ids.indexOf(id);
    if (idx !== -1) {
      sheet.deleteRow(idx + 2);
    }
  }
  
  clearLandingContentCache();
  return jsonResponse({ ok: true, message: 'Đã xóa bài viết', blogArticles: getBlogArticles(true), scriptVersion: SCRIPT_VERSION });
}
