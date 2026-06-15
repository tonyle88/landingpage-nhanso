// =============================================
//  NHÂN SỐ HỌC – GOOGLE APPS SCRIPT
//  Tính năng:
//  1. doGet  → trả về danh sách slot đã đặt từ Google Calendar
//  2. doPost → lưu Sheet + tạo sự kiện Calendar + gửi Email xác nhận
//  File này chỉ dùng cho Sheet đặt lịch/booking
// =============================================

const SPREADSHEET_ID = '1KO6b5v9WPbYg2cJv25EM-ZN-tyjXfYJF3ZK7iKB3Bkc';
const SHEET_NAME     = 'Dang ky tu van';
const LANDING_CONTENT_SPREADSHEET_ID = '1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const PACKAGES_SHEET_NAME = 'Packages';
const CALENDAR_ID    = '80668f888da8f3c3ffadd0d0e0e6b49bfba8734a6f0514c8c9143c1127200d04@group.calendar.google.com';
const OWNER_EMAIL    = 'cuongck3@gmail.com';
const EMAIL_SENDER_NAME = 'Tony Le – Nhân Số Học';
const EMAIL_LOG_SHEET = 'Email log';
const ERROR_LOG_SHEET = 'Error log';
const SEPAY_PAYMENTS_SHEET = 'SePay payments';
const SEPAY_PAYMENTS_HEADERS = [
  'Ngày giờ Việt Nam',
  'Mã thanh toán',
  'Trạng thái',
  'Số tiền',
  'Nội dung',
  'Dữ liệu gốc',
];

const HEADERS = [
  'Ngày giờ Việt Nam',
  'Họ và tên',
  'Ngày sinh',
  'Số điện thoại / Zalo',
  'Email',
  'Hình thức',
  'Gói tư vấn',
  'Lịch hẹn',
  'Số tiền',
  'Lời nhắn',
  'Mã gói',
  'Email khách',
  'Email chủ',
  'Nội dung chuyển khoản',
];

const CONSULTATION_TYPE_LABELS = {
  online: 'Online - Google Meet',
  offline: 'Offline - Trực tiếp tại TP.HCM',
};

const PACKAGE_OPTIONS = {
  online: {
    year: { label: 'Dự Đoán Năm Cá Nhân – 500.000 vnđ/buổi', price: 500000 },
    big3: { label: 'Phân Tích 3 Chỉ Số Tính Cách – 1.000.000 vnđ/buổi', price: 1000000 },
    big7: { label: 'Phân Tích Toàn Diện – 2.000.000 vnđ/buổi', price: 2000000 },
  },
  offline: {
    year: { label: 'Dự Đoán Năm Cá Nhân – 550.000 vnđ/buổi', price: 550000 },
    big3: { label: 'Phân Tích 3 Chỉ Số Tính Cách – 1.050.000 vnđ/buổi', price: 1050000 },
    big7: { label: 'Phân Tích Toàn Diện – 2.000.000 vnđ/buổi', price: 2000000 },
  },
};

const PACKAGE_CONTENT_KEYS = {
  year: { name: 'packages.year_name', price: 'packages.year_price' },
  big3: { name: 'packages.big3_name', price: 'packages.big3_price' },
  big7: { name: 'packages.big7_name', price: 'packages.big7_price' },
};

const OFFLINE_TRAVEL_FEE = 50000;
const PRICE_NUMBER_FORMAT = '#,##0';
const BOOKING_RATE_LIMIT_SECONDS = 15 * 60;
const BOOKING_RATE_LIMIT_MAX = 3;
const SCRIPT_VERSION = '2026-06-16-v13-sepay-webhook-body';
let LANDING_CONTENT_VALUE_CACHE = null;
// =============================================
//  doGet – Trả về danh sách slot đã đặt (30 ngày tới)
// =============================================
function doGet(e) {
  const params = e ? (e.parameter || {}) : {};

  if (params.action === 'getBookedSlots') {
    try {
      const now   = new Date();
      const end   = new Date(now.getTime() + 30 * 24 * 3600 * 1000);
      const cal   = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
      const events = cal.getEvents(now, end);

      const calendarBooked = events.map((ev) => ({
        start: ev.getStartTime().toISOString(),
        end: ev.getEndTime().toISOString(),
        title: ev.getTitle(),
        source: 'calendar',
      }));

      const sheetBooked = getBookedSlotsFromSheet();
      const booked = mergeBookedSlots(calendarBooked, sheetBooked);

      return jsonResponse({ ok: true, booked, scriptVersion: SCRIPT_VERSION });
    } catch (err) {
      logAppError('getBookedSlots', err, params);
      return jsonResponse({ ok: false, booked: [], error: err.message });
    }
  }

  if (params.action === 'version') {
    return jsonResponse({
      ok: true,
      scriptVersion: SCRIPT_VERSION,
      sender: getScriptSenderEmail(),
      owner: getOwnerEmail(),
    });
  }

  if (params.action === 'completeBooking') {
    try {
      return handleCompleteBooking(params);
    } catch (error) {
      logAppError('completeBooking', error, params);
      return jsonResponse({ ok: false, message: error.message, scriptVersion: SCRIPT_VERSION });
    }
  }

  if (params.action === 'checkSepayPayment') {
    try {
      return handleCheckSepayPayment(params);
    } catch (error) {
      logAppError('checkSepayPayment', error, params);
      return jsonResponse({ ok: false, message: error.message, scriptVersion: SCRIPT_VERSION });
    }
  }

  return jsonResponse({ ok: true, message: 'Nhân Số Học – Apps Script đang chạy ✓', scriptVersion: SCRIPT_VERSION });
}

// =============================================
//  doPost – Xử lý đặt lịch hoàn tất
// =============================================
function doPost(e) {
  let params = {};
  try {
    params = getPostParams(e);

    if (isAdminOnlyAction(params.action)) {
      return jsonResponse({
        ok: false,
        message: 'Admin dang goi nham Booking Apps Script. Hay deploy file google-apps-script-landing-content.gs vao Web App URL cua admin.',
        scriptVersion: SCRIPT_VERSION,
      });
    }

    if (params.action === 'logClientError') {
      return handleLogClientError(params);
    }

    if (params.action === 'sepayWebhook') {
      return handleSepayWebhook(params);
    }

    if (params.action === 'saveBooking' || params.action === 'finalizeBooking') {
      return handleSaveBooking(params);
    }

    // Legacy fallback (nếu còn dùng form cũ)
    return handleLegacyBooking(params);

  } catch (error) {
    logAppError('doPost', error, params);
    return jsonResponse({ ok: false, message: error.message });
  }
}

function isAdminOnlyAction(action) {
  return [
    'loginAdmin',
    'logoutAdmin',
    'getAdminContent',
    'saveLandingContentItem',
    'saveLandingContentBatch',
    'changeAdminPassword',
    'listAdminUsers',
    'createAdminUser',
    'setAdminUserStatus',
    'syncLandingContentTemplate',
    'savePackage',
    'deletePackage',
    'savePaymentSettings',
    'uploadFeedbackImage',
    'saveFeedbackImage',
    'deleteFeedbackImage',
  ].indexOf(cleanValue(action)) !== -1;
}

function getPostParams(e) {
  const params = {};
  if (!e) return params;

  if (e.parameter) {
    Object.keys(e.parameter).forEach((key) => {
      params[key] = e.parameter[key];
    });
  }

  if (e.parameters) {
    Object.keys(e.parameters).forEach((key) => {
      const value = e.parameters[key];
      params[key] = Array.isArray(value) ? value[0] : value;
    });
  }

  if (!e.postData || !e.postData.contents) {
    return params;
  }

  const contentType = String(e.postData.type || '').toLowerCase();
  const body = e.postData.contents;

  if (contentType.indexOf('application/json') !== -1) {
    return Object.assign(params, flattenObject(JSON.parse(body)));
  }

  if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
    body.split('&').forEach((pair) => {
      const separatorIndex = pair.indexOf('=');
      const parts = separatorIndex === -1
        ? [pair, '']
        : [pair.slice(0, separatorIndex), pair.slice(separatorIndex + 1)];
      const key = decodeURIComponent(parts[0] || '');
      const value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
      if (key) params[key] = value;
    });
    return params;
  }

  const trimmedBody = cleanValue(body);
  if (trimmedBody.charAt(0) === '{' || trimmedBody.charAt(0) === '[') {
    try {
      return Object.assign(params, flattenObject(JSON.parse(trimmedBody)));
    } catch (error) {
      params.rawBody = trimmedBody;
    }
  } else {
    params.rawBody = trimmedBody;
  }

  return params;
}

function flattenObject(value, prefix, output) {
  const result = output || {};
  if (!value || typeof value !== 'object') return result;

  Object.keys(value).forEach((key) => {
    const flatKey = prefix ? prefix + '.' + key : key;
    const item = value[key];
    if (item && typeof item === 'object' && !Array.isArray(item)) {
      flattenObject(item, flatKey, result);
      return;
    }
    result[flatKey] = Array.isArray(item) ? item.join(', ') : item;
    if (!Object.prototype.hasOwnProperty.call(result, key)) {
      result[key] = result[flatKey];
    }
  });

  return result;
}

// =============================================
//  POST – chỉ lưu Sheet (nhanh, dùng với no-cors từ website)
// =============================================
function handleSaveBooking(params) {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);
  const booking = resolveBookingDetails(params);
  validateBookingParams(params, booking);
  enforceBookingRateLimit(params, 'save');

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let rowNumber = 0;
  try {
    sheet.appendRow(buildSheetRow(params, booking));
    rowNumber = sheet.getLastRow();
    formatInsertedRow(sheet, rowNumber);
  } finally {
    lock.releaseLock();
  }

  return jsonResponse({
    ok: true,
    message: 'Da luu Sheet',
    scriptVersion: SCRIPT_VERSION,
    rowNumber: rowNumber,
  });
}

// =============================================
//  GET – gửi email + tạo Calendar (chạy đủ, website đọc được kết quả)
// =============================================
function handleCompleteBooking(params) {
  const sheet = getTargetSheet();
  const booking = resolveBookingDetails(params);
  validateBookingParams(params, booking);
  enforceBookingRateLimit(params, 'complete');
  const rowNumber = findLatestBookingRow(sheet, params);
  const payload = Object.assign({}, params, booking);

  const emailStatus = sendBookingEmails(payload, sheet, rowNumber);

  let calendarEventId = '';
  let calendarNote = '';
  try {
    calendarEventId = createCalendarEventIfNeeded(params, booking);
    calendarNote = calendarEventId ? 'created' : 'skipped';
  } catch (calendarErr) {
    calendarNote = calendarErr.message || String(calendarErr);
    console.error('Calendar error:', calendarErr);
  }

  return jsonResponse({
    ok: true,
    message: 'Hoan tat dat lich',
    scriptVersion: SCRIPT_VERSION,
    rowNumber: rowNumber,
    emailStatus: emailStatus,
    calendarEventId: calendarEventId,
    calendarNote: calendarNote,
  });
}

function findLatestBookingRow(sheet, params) {
  const phone = cleanValue(params.phone).replace(/^'/, '');
  const slotLabel = cleanValue(params.slotLabel);
  const email = cleanValue(params.email);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 0;

  const phoneCol = HEADERS.indexOf('Số điện thoại / Zalo');
  const slotCol = HEADERS.indexOf('Lịch hẹn');
  const emailCol = HEADERS.indexOf('Email');
  const data = sheet.getRange(2, 1, lastRow, HEADERS.length).getValues();

  for (let i = data.length - 1; i >= 0; i--) {
    const row = data[i];
    const rowPhone = String(row[phoneCol] || '').replace(/^'/, '');
    const rowSlot = String(row[slotCol] || '');
    const rowEmail = String(row[emailCol] || '');
    if (rowPhone === phone && rowSlot === slotLabel && rowEmail === email) {
      return i + 2;
    }
  }

  return lastRow;
}

function createCalendarEventIfNeeded(params, booking) {
  if (!params.slotStart || !params.slotEnd) return '';

  const startDt = new Date(params.slotStart);
  const endDt = new Date(params.slotEnd);
  const cal = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  const existing = cal.getEvents(startDt, endDt);
  const marker = `[Nhân Số] ${booking.name}`;

  const alreadyExists = existing.some((ev) => ev.getTitle().indexOf(booking.name) !== -1);
  if (alreadyExists) return 'exists';

  return createCalendarEvent(params, booking);
}

function handleFinalizeBooking(params) {
  return handleSaveBooking(params);
}

function handleLogClientError(params) {
  logAppError('client:' + sanitizePlainText(params.context || 'unknown', 80), new Error(sanitizePlainText(params.message || 'Client error', 300)), params);
  return jsonResponse({ ok: true, scriptVersion: SCRIPT_VERSION });
}

function handleCheckSepayPayment(params) {
  const orderId = sanitizePlainText(params.paymentOrderId || params.transferContent, 120);
  if (!orderId) throw new Error('Thieu ma thanh toan SePay.');

  const payment = findSepayPayment(orderId);
  return jsonResponse({
    ok: true,
    status: payment ? payment.status : 'pending',
    payment: payment || null,
    scriptVersion: SCRIPT_VERSION,
  });
}

function handleSepayWebhook(params) {
  const configuredSecret = cleanValue(PropertiesService.getScriptProperties().getProperty('SEPAY_WEBHOOK_SECRET'));
  if (!configuredSecret) throw new Error('Chua cau hinh SEPAY_WEBHOOK_SECRET trong Script Properties.');
  if (cleanValue(params.secret) !== configuredSecret) throw new Error('Secret webhook SePay khong hop le.');

  const orderId = extractSepayOrderId(params);
  if (!orderId) throw new Error('Webhook SePay thieu ma thanh toan.');

  const status = normalizeSepayStatus(
    getFirstParamValue(params, [
      'status',
      'payment_status',
      'paymentStatus',
      'transaction_status',
      'transactionStatus',
      'transfer_status',
      'transferStatus',
      'data.status',
      'data.payment_status',
      'data.transaction_status',
    ]) || 'paid'
  );
  const amount = parsePriceNumber(getFirstParamValue(params, [
    'amount',
    'order_amount',
    'orderAmount',
    'transferAmount',
    'transfer_amount',
    'transactionAmount',
    'transaction_amount',
    'data.amount',
    'data.transferAmount',
    'data.transfer_amount',
  ]));
  saveSepayPaymentStatus(orderId, status, amount, params);

  return jsonResponse({
    ok: true,
    status: status,
    paymentOrderId: orderId,
    scriptVersion: SCRIPT_VERSION,
  });
}

function sendBookingEmails(payload, sheet, rowNumber) {
  const status = {
    sender: getScriptSenderEmail(),
    customer: { attempted: false, sent: false, to: '', error: '' },
    owner: { attempted: false, sent: false, to: '', error: '' },
  };

  if (!status.sender) {
    const deployError = 'Chua gui duoc email: Apps Script can trien khai voi "Thuc thi tuoi la: Toi".';
    status.customer.error = deployError;
    status.owner.error = deployError;
    logEmailAttempt('he thong', '', false, deployError);
    writeEmailStatusToRow(sheet, rowNumber, status);
    return status;
  }

  const customerEmail = cleanValue(resolveBookingDetails(payload).email);
  if (isValidEmail(customerEmail)) {
    status.customer.attempted = true;
    status.customer.to = customerEmail;
    try {
      sendConfirmationEmail(payload);
      status.customer.sent = true;
      logEmailAttempt('khach', customerEmail, true, '');
    } catch (customerErr) {
      status.customer.error = customerErr.message || String(customerErr);
      logEmailAttempt('khach', customerEmail, false, status.customer.error);
    }
  } else {
    status.customer.error = 'Email khach khong hop le: ' + (customerEmail || '(trong)');
    logEmailAttempt('khach', customerEmail, false, status.customer.error);
  }

  const ownerEmail = getOwnerEmail();
  if (isValidEmail(ownerEmail)) {
    status.owner.attempted = true;
    status.owner.to = ownerEmail;
    try {
      sendOwnerNotification(payload, ownerEmail);
      status.owner.sent = true;
      logEmailAttempt('chu', ownerEmail, true, '');
    } catch (ownerErr) {
      status.owner.error = ownerErr.message || String(ownerErr);
      logEmailAttempt('chu', ownerEmail, false, status.owner.error);
    }
  } else {
    status.owner.error = 'Khong xac dinh duoc email chu trang';
    logEmailAttempt('chu', ownerEmail, false, status.owner.error);
  }

  writeEmailStatusToRow(sheet, rowNumber, status);
  return status;
}

function writeEmailStatusToRow(sheet, rowNumber, status) {
  if (!sheet || !rowNumber || rowNumber < 2) return;

  const customerCol = HEADERS.indexOf('Email khách') + 1;
  const ownerCol = HEADERS.indexOf('Email chủ') + 1;
  if (customerCol < 1 || ownerCol < 1) return;

  const customerCell = status.customer.sent
    ? 'DA GUI'
    : ('LOI: ' + (status.customer.error || 'CHUA GUI'));
  const ownerCell = status.owner.sent
    ? 'DA GUI'
    : ('LOI: ' + (status.owner.error || 'CHUA GUI'));

  sheet.getRange(rowNumber, customerCol).setValue(customerCell);
  sheet.getRange(rowNumber, ownerCol).setValue(ownerCell);
}

function buildSheetRow(params, booking) {
  return [
    getVietnamDateTime(params.submittedAt),
    booking.name,
    booking.dob,
    booking.phone,
    booking.email,
    booking.consultationTypeLabel,
    booking.packageLabel,
    cleanValue(params.slotLabel),
    booking.packagePrice || '',
    booking.concern,
    booking.package,
    '',
    '',
    booking.transferContent,
  ];
}

function getBookedSlotsFromSheet() {
  try {
    const sheet = getTargetSheet();
    const lastRow = sheet.getLastRow();
    if (lastRow < 2) return [];

    const slotCol = HEADERS.indexOf('Lịch hẹn') + 1;
    if (slotCol < 1) return [];

    const values = sheet.getRange(2, slotCol, lastRow, slotCol).getValues();
    const booked = [];

    values.forEach((row) => {
      const parsed = parseSlotLabelVN(String(row[0] || ''));
      if (parsed) booked.push(parsed);
    });

    return booked;
  } catch (error) {
    console.error('Sheet booked slots error:', error);
    return [];
  }
}

function parseSlotLabelVN(label) {
  const match = label.match(/(\d{2})\/(\d{2})\/(\d{4}).*?(\d{1,2}):(\d{2})\s*[–\-]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const dd = parseInt(match[1], 10);
  const mm = parseInt(match[2], 10);
  const yyyy = parseInt(match[3], 10);
  const sh = parseInt(match[4], 10);
  const sm = parseInt(match[5], 10);
  const eh = parseInt(match[6], 10);
  const em = parseInt(match[7], 10);

  const start = new Date(Date.UTC(yyyy, mm - 1, dd, sh - 7, sm, 0));
  const end = new Date(Date.UTC(yyyy, mm - 1, dd, eh - 7, em, 0));
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || end <= start) return null;

  return {
    start: start.toISOString(),
    end: end.toISOString(),
    title: 'Sheet: ' + label,
    source: 'sheet',
  };
}

function mergeBookedSlots() {
  const merged = [];
  const seen = {};

  Array.prototype.slice.call(arguments).forEach((list) => {
    (list || []).forEach((slot) => {
      const key = slot.start + '|' + slot.end;
      if (!seen[key]) {
        seen[key] = true;
        merged.push(slot);
      }
    });
  });

  return merged;
}

function createCalendarEvent(params, booking) {
  if (!params.slotStart || !params.slotEnd) return '';

  const startDt = new Date(params.slotStart);
  const endDt   = new Date(params.slotEnd);
  const cal     = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();

  const eventTitle = `[Nhân Số] ${booking.name} – ${booking.packageLabel}`;
  const eventDescLines = [
    `Khách hàng: ${booking.name}`,
    `SĐT/Zalo: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Ngày sinh: ${booking.dob}`,
    `Gói: ${booking.packageLabel}`,
    `Hình thức: ${booking.consultationTypeLabel}`,
    `Số tiền: ${formatPrice(booking.packagePrice)}`,
    `Nội dung chuyển khoản: ${booking.transferContent}`,
  ];
  if (booking.hasOfflineTravelFee) {
    eventDescLines.push(`Phụ phí xăng xe: ${formatPrice(OFFLINE_TRAVEL_FEE)} (đã tính trong giá gói offline)`);
    eventDescLines.push('Địa điểm offline sẽ được thông báo qua Zalo trước buổi tư vấn.');
  } else if (booking.isOffline) {
    eventDescLines.push('Phụ phí xăng xe: Không áp dụng cho gói này.');
    eventDescLines.push('Địa điểm offline sẽ được thông báo qua Zalo trước buổi tư vấn.');
  }
  eventDescLines.push(`Lời nhắn: ${booking.concern}`);

  const ev = cal.createEvent(eventTitle, startDt, endDt, { description: eventDescLines.join('\n') });
  return ev.getId();
}

// =============================================
//  Legacy booking (form cũ không có lịch)
// =============================================
function handleLegacyBooking(params) {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);
  const booking = resolveBookingDetails(params);
  validateBookingParams(params, booking);
  enforceBookingRateLimit(params, 'legacy');
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  let rowNumber = 0;
  try {
    sheet.appendRow(buildSheetRow(Object.assign({}, params, { slotLabel: '' }), booking));
    rowNumber = sheet.getLastRow();
    formatInsertedRow(sheet, rowNumber);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ ok: true, message: 'Saved (legacy)', rowNumber: rowNumber });
}

// =============================================
//  Email gửi khách
// =============================================
function sendConfirmationEmail(p) {
  const booking     = resolveBookingDetails(p);
  const name        = booking.name;
  const slotLabel   = cleanValue(p.slotLabel);
  const pkgLabel    = booking.packageLabel;
  const typeLabel   = booking.consultationTypeLabel;
  const price       = formatPrice(booking.packagePrice);
  const phone       = booking.phone.replace(/^'/, '');
  const isOffline   = booking.isOffline;
  const hasOfflineTravelFee = booking.hasOfflineTravelFee;

  const offlineNotes = isOffline
    ? [
      hasOfflineTravelFee
        ? '<p style="margin:0 0 8px;color:#e8a878;">&#128663; <strong>Phụ phí xăng xe:</strong> Giá gói offline đã bao gồm phụ phí di chuyển ' + formatPrice(OFFLINE_TRAVEL_FEE) + '.</p>'
        : '<p style="margin:0 0 8px;color:#e8a878;">&#128663; <strong>Phụ phí xăng xe:</strong> Không áp dụng cho gói này.</p>',
      '<p style="margin:0;color:#e8a878;">&#128205; <strong>Địa điểm:</strong> Địa điểm cụ thể sẽ được thông báo qua Zalo trước buổi tư vấn.</p>',
    ].join('')
    : '';

  const html = `
<!DOCTYPE html>
<html lang="vi">
<head><meta charset="UTF-8"/></head>
<body style="margin:0;padding:0;background:#091c20;font-family:'Helvetica Neue',Arial,sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background:#091c20;padding:32px 16px;">
  <tr><td align="center">
    <table width="560" cellpadding="0" cellspacing="0" style="background:linear-gradient(145deg,#0d2b30,#122e34);border-radius:20px;border:1px solid rgba(232,168,120,0.25);overflow:hidden;max-width:560px;width:100%;">

      <!-- Header -->
      <tr><td style="background:linear-gradient(135deg,#1b4149,#0d2b30);padding:32px 36px;text-align:center;border-bottom:1px solid rgba(232,168,120,0.2);">
        <p style="margin:0 0 8px;font-size:11px;letter-spacing:3px;color:#f0c96a;text-transform:uppercase;">Nhân Số Học</p>
        <h1 style="margin:0;font-size:26px;color:#ffffff;font-weight:700;">&#127881; Đặt Lịch Thành Công!</h1>
        <p style="margin:10px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">Một Đối Tác Của Clow Cat Patronus</p>
      </td></tr>

      <!-- Greeting -->
      <tr><td style="padding:32px 36px 16px;">
        <p style="margin:0;color:rgba(255,255,255,0.9);font-size:15px;line-height:1.7;">
          Chúc mừng <strong style="color:#f0c96a;">${name}</strong>! &#127775;<br/>
          Bạn đã đăng ký và thanh toán thành công một buổi tư vấn Nhân Số Học.
        </p>
      </td></tr>

      <!-- Booking summary box -->
      <tr><td style="padding:8px 36px 24px;">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.1);border-radius:14px;overflow:hidden;">
          <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">&#128197; Lịch hẹn</span><br/>
            <strong style="color:#ffffff;font-size:15px;">${slotLabel}</strong>
          </td></tr>
          <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">&#128230; Gói tư vấn</span><br/>
            <strong style="color:#ffffff;font-size:15px;">${pkgLabel}</strong>
          </td></tr>
          <tr><td style="padding:16px 20px;border-bottom:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">&#128187; Hình thức</span><br/>
            <strong style="color:#ffffff;font-size:15px;">${typeLabel}</strong>
          </td></tr>
          <tr><td style="padding:16px 20px;">
            <span style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">&#128176; Số tiền đã thanh toán</span><br/>
            <strong style="color:#f0c96a;font-size:18px;">${price}</strong>
          </td></tr>
          <tr><td style="padding:16px 20px;border-top:1px solid rgba(255,255,255,0.07);">
            <span style="font-size:11px;color:rgba(255,255,255,0.5);text-transform:uppercase;letter-spacing:1px;">&#127974; Nội dung chuyển khoản</span><br/>
            <strong style="color:#ffffff;font-size:15px;">${booking.transferContent}</strong>
          </td></tr>
        </table>
      </td></tr>

      ${isOffline ? `<tr><td style="padding:0 36px 20px;">${offlineNotes}</td></tr>` : ''}

      <!-- Contact info -->
      <tr><td style="padding:0 36px 24px;">
        <p style="margin:0;color:rgba(255,255,255,0.7);font-size:13px;line-height:1.7;">
          &#128222; <strong>SĐT/Zalo liên hệ của bạn:</strong> ${phone}
        </p>
      </td></tr>

      <!-- Divider -->
      <tr><td style="padding:0 36px;">
        <hr style="border:none;border-top:1px solid rgba(232,168,120,0.2);margin:0;"/>
      </td></tr>

      <!-- Sign off -->
      <tr><td style="padding:28px 36px;text-align:center;">
        <p style="margin:0 0 16px;color:rgba(255,255,255,0.9);font-size:15px;font-style:italic;">
          "Hẹn gặp lại bạn tại Buổi Tư Vấn &#127769;"
        </p>
        <p style="margin:0;color:#f0c96a;font-weight:700;font-size:15px;">Tony Le – Numerology</p>
        <p style="margin:4px 0 0;color:rgba(255,255,255,0.5);font-size:12px;">Một đối tác của Clow Cat Patronus</p>
        <div style="margin-top:20px;">
          <a href="https://www.facebook.com/clowcatpatronus" style="display:inline-block;margin:0 6px;background:#1877f2;color:white;padding:8px 16px;border-radius:8px;font-size:12px;text-decoration:none;">Facebook</a>
          <a href="https://www.instagram.com/clow_cat_patronus/" style="display:inline-block;margin:0 6px;background:linear-gradient(45deg,#f09433,#e6683c,#dc2743,#cc2366,#bc1888);color:white;padding:8px 16px;border-radius:8px;font-size:12px;text-decoration:none;">Instagram</a>
        </div>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background:rgba(0,0,0,0.3);padding:14px 36px;text-align:center;">
        <p style="margin:0;color:rgba(255,255,255,0.35);font-size:11px;">© 2026 Clow Cat Patronus · Nhân Số Học</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  // Sử dụng text thuần tuý hoặc icon cơ bản cho Subject để tránh lỗi font email
  const subjectStr = '[Thành Công] Xác nhận đặt lịch tư vấn Nhân Số Học – Clow Cat Patronus';
  const offlineText = isOffline
    ? '\n' + getOfflineNoteText(booking) + '\nĐịa điểm offline sẽ được thông báo qua Zalo trước buổi tư vấn.'
    : '';
  const textBody = 'Chào ' + name + ',\nBạn đã đặt lịch thành công!\nLịch hẹn: ' + slotLabel + '\nGói: ' + pkgLabel + '\nHình thức: ' + typeLabel + '\nSố tiền: ' + price + '\nNội dung chuyển khoản: ' + booking.transferContent + offlineText + '\n\nHẹn gặp bạn tại buổi tư vấn!\nTony Le – Numerology\nMột đối tác của Clow Cat Patronus';

  sendMailSafe(
    booking.email,
    subjectStr,
    textBody,
    { htmlBody: html, name: EMAIL_SENDER_NAME }
  );
}

// =============================================
//  Thông báo cho chủ trang
// =============================================
function sendOwnerNotification(p, ownerEmail) {
  const booking = resolveBookingDetails(p);
  const slot    = cleanValue(p.slotLabel);
  const offlineText = booking.isOffline ? '\n' + getOfflineNoteText(booking) : '';

  sendMailSafe(
    ownerEmail || getOwnerEmail(),
    '[Đặt lịch mới] ' + booking.name + ' – ' + booking.packageLabel,
    'Có khách đặt lịch mới!\n\nTên: ' + booking.name +
      '\nSĐT: ' + booking.phone.replace(/^'/, '') +
      '\nHình thức: ' + booking.consultationTypeLabel +
      '\nGói: ' + booking.packageLabel +
      '\nMã gói: ' + booking.package +
      '\nNội dung chuyển khoản: ' + booking.transferContent +
      '\nLịch: ' + slot +
      '\nSố tiền: ' + formatPrice(booking.packagePrice) +
      offlineText +
      '\nEmail: ' + booking.email +
      '\nNgày sinh: ' + booking.dob +
      '\nLời nhắn: ' + booking.concern,
    { name: 'Hệ thống đặt lịch Nhân Số Học' }
  );
}

function sendMailSafe(to, subject, body, options) {
  const mailOptions = Object.assign({ name: EMAIL_SENDER_NAME }, options || {});
  const htmlBody = mailOptions.htmlBody || '';
  delete mailOptions.htmlBody;

  try {
    if (htmlBody) {
      GmailApp.sendEmail(to, subject, body, Object.assign({}, mailOptions, { htmlBody: htmlBody }));
    } else {
      GmailApp.sendEmail(to, subject, body, mailOptions);
    }
    return;
  } catch (gmailHtmlErr) {
    try {
      GmailApp.sendEmail(to, subject, body, mailOptions);
      return;
    } catch (gmailTextErr) {
      try {
        MailApp.sendEmail({
          to: to,
          subject: subject,
          body: body,
          htmlBody: htmlBody,
          name: mailOptions.name || EMAIL_SENDER_NAME,
        });
        return;
      } catch (mailErr) {
        throw new Error(
          'Gmail HTML: ' + gmailHtmlErr.message +
          ' | Gmail text: ' + gmailTextErr.message +
          ' | MailApp: ' + mailErr.message
        );
      }
    }
  }
}

function getOwnerEmail() {
  if (OWNER_EMAIL && !OWNER_EMAIL.includes('PASTE_YOUR_GMAIL')) {
    return cleanValue(OWNER_EMAIL);
  }
  return getScriptSenderEmail();
}

function getScriptSenderEmail() {
  try {
    return cleanValue(Session.getEffectiveUser().getEmail());
  } catch (error) {
    return '';
  }
}

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanValue(value));
}

function getSpreadsheet() {
  return getTargetSheet().getParent();
}

function logEmailAttempt(type, recipient, success, errorMessage) {
  try {
    const spreadsheet = getSpreadsheet();
    if (!spreadsheet) return;

    let logSheet = spreadsheet.getSheetByName(EMAIL_LOG_SHEET);
    if (!logSheet) {
      logSheet = spreadsheet.insertSheet(EMAIL_LOG_SHEET);
      logSheet.appendRow(['Thoi gian', 'Loai', 'Nguoi nhan', 'Thanh cong', 'Loi']);
      logSheet.setFrozenRows(1);
    }

    logSheet.appendRow([
      getVietnamDateTime(),
      type,
      recipient,
      success ? 'YES' : 'NO',
      errorMessage || '',
    ]);
  } catch (error) {
    console.error('Email log error:', error);
  }
}

function ensureSepayPaymentsSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  let sheet = spreadsheet.getSheetByName(SEPAY_PAYMENTS_SHEET);
  if (!sheet) sheet = spreadsheet.insertSheet(SEPAY_PAYMENTS_SHEET);
  sheet.getRange(1, 1, 1, SEPAY_PAYMENTS_HEADERS.length).setValues([SEPAY_PAYMENTS_HEADERS]);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, SEPAY_PAYMENTS_HEADERS.length);
  return sheet;
}

function findSepayPayment(orderId) {
  const target = cleanValue(orderId);
  if (!target) return null;

  const sheet = ensureSepayPaymentsSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return null;

  const values = sheet.getRange(2, 1, lastRow - 1, SEPAY_PAYMENTS_HEADERS.length).getDisplayValues();
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const row = values[index];
    if (cleanValue(row[1]) !== target) continue;
    return {
      createdAt: row[0],
      paymentOrderId: row[1],
      status: normalizeSepayStatus(row[2]),
      amount: parsePriceNumber(row[3]),
      content: row[4],
    };
  }
  return null;
}

function saveSepayPaymentStatus(orderId, status, amount, rawParams) {
  const sheet = ensureSepayPaymentsSheet();
  const normalizedStatus = normalizeSepayStatus(status);
  const content = getSepayContent(rawParams || {});
  sheet.appendRow([
    getVietnamDateTime(),
    cleanValue(orderId),
    normalizedStatus,
    amount || '',
    sanitizePlainText(content, 500),
    JSON.stringify(maskSensitiveParams(rawParams || {})).slice(0, 4500),
  ]);
  sheet.getRange(sheet.getLastRow(), 4).setNumberFormat(PRICE_NUMBER_FORMAT);
  return normalizedStatus;
}

function normalizeSepayStatus(status) {
  const value = cleanValue(status).toLowerCase();
  if (['paid', 'success', 'succeeded', 'completed', 'complete', 'thanh cong', 'thành công'].indexOf(value) !== -1) return 'paid';
  if (['failed', 'error', 'cancelled', 'canceled', 'expired'].indexOf(value) !== -1) return value;
  return value || 'pending';
}

function extractSepayOrderId(params) {
  const direct = sanitizePlainText(getFirstParamValue(params, [
    'paymentOrderId',
    'payment_order_id',
    'order_invoice_number',
    'orderInvoiceNumber',
    'orderCode',
    'order_code',
    'orderId',
    'order_id',
    'invoiceNumber',
    'invoice_number',
    'data.paymentOrderId',
    'data.orderCode',
    'data.order_id',
  ]), 120);
  if (looksLikeSepayOrderId(direct)) return direct.toUpperCase();

  const content = sanitizePlainText(getSepayContent(params), 1000).toUpperCase();
  const match = content.match(/[A-Z]{2,12}-[A-Z0-9_]{2,40}-[A-Z0-9]{4,16}-[0-9]{4,16}/);
  if (match) return match[0];
  return looksLikeSepayOrderId(direct) ? direct.toUpperCase() : '';
}

function looksLikeSepayOrderId(value) {
  return /^[A-Z]{2,12}-[A-Z0-9_]{2,40}-[A-Z0-9]{4,16}-[0-9]{4,16}$/i.test(cleanValue(value));
}

function getSepayContent(params) {
  return getFirstParamValue(params, [
    'content',
    'description',
    'order_description',
    'orderDescription',
    'transferContent',
    'transfer_content',
    'transactionContent',
    'transaction_content',
    'bankContent',
    'bank_content',
    'paymentContent',
    'payment_content',
    'rawBody',
    'data.content',
    'data.description',
    'data.transferContent',
    'data.transfer_content',
    'data.transactionContent',
    'data.transaction_content',
  ]);
}

function getFirstParamValue(params, keys) {
  for (let index = 0; index < keys.length; index += 1) {
    const key = keys[index];
    const value = params[key];
    if (value !== undefined && value !== null && cleanValue(value) !== '') return value;
  }
  return '';
}

// =============================================
//  Utility functions
// =============================================
function getTargetSheet() {
  const spreadsheet = getSpreadsheetByIdOrActive();
  if (!spreadsheet) throw new Error('Khong tim thay Google Sheet. Hay dien SPREADSHEET_ID.');

  const namedSheet = spreadsheet.getSheetByName(SHEET_NAME);
  if (namedSheet) return namedSheet;

  const sheets = spreadsheet.getSheets();
  if (sheets.length === 1) return sheets[0];

  throw new Error('Khong tim thay sheet "' + SHEET_NAME + '". Hay doi SHEET_NAME cho dung ten tab.');
}

function getSpreadsheetByIdOrActive() {
  if (SPREADSHEET_ID && !SPREADSHEET_ID.includes('PASTE_')) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  return SpreadsheetApp.getActiveSpreadsheet();
}

function ensureHeaderRow(sheet) {
  trimExtraColumns(sheet);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (sheet.getLastRow() <= 1) sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, HEADERS.length);
}

function getPriceColumnIndex() {
  return HEADERS.indexOf('Số tiền') + 1;
}

function formatInsertedRow(sheet, rowNumber) {
  if (!rowNumber || rowNumber < 2) return;

  const priceCol = getPriceColumnIndex();
  sheet.getRange(rowNumber, 1, rowNumber, HEADERS.length).setNumberFormat('@');
  sheet.getRange(rowNumber, priceCol).setNumberFormat(PRICE_NUMBER_FORMAT);
  normalizeLegacyPriceCells(sheet);
}

// Chạy thủ công 1 lần trong Apps Script nếu cần format lại toàn bộ cột
function repairSheetFormats() {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);
  const lastRow = Math.max(sheet.getLastRow(), 1);
  for (let col = 1; col <= HEADERS.length; col++) {
    const range = sheet.getRange(1, col, lastRow, col);
    range.setNumberFormat(col === getPriceColumnIndex() ? PRICE_NUMBER_FORMAT : '@');
  }
  normalizeLegacyPriceCells(sheet);
}

function normalizeLegacyPriceCells(sheet) {
  const col = getPriceColumnIndex();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return;

  const range = sheet.getRange(2, col, lastRow, col);
  const values = range.getValues();
  let changed = false;

  const normalized = values.map((row) => {
    const val = row[0];
    if (typeof val === 'number' && !isNaN(val)) return [val];
    const parsed = parsePriceNumber(val);
    if (parsed > 0) {
      changed = true;
      return [parsed];
    }
    return [val];
  });

  if (changed) range.setValues(normalized);
}

function parsePriceNumber(value) {
  const digits = String(value || '').replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function trimExtraColumns(sheet) {
  const extra = sheet.getMaxColumns() - HEADERS.length;
  if (extra > 0) sheet.deleteColumns(HEADERS.length + 1, extra);
}

function getVietnamDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
}

function cleanValue(value) {
  return String(value || '').trim();
}

function sanitizePlainText(value, maxLength) {
  return cleanValue(value)
    .replace(/[<>]/g, '')
    .replace(/[\r\n\t]+/g, ' ')
    .replace(/\s+/g, ' ')
    .slice(0, maxLength || 500);
}

function isValidPhone(value) {
  return /^[0-9+().\s-]{8,20}$/.test(cleanValue(value).replace(/^'/, ''));
}

function validateBookingParams(params, booking) {
  if (!booking.name || booking.name.length < 2) throw new Error('Họ tên chưa hợp lệ.');
  if (!booking.phone || !isValidPhone(booking.phone)) throw new Error('Số điện thoại/Zalo chưa hợp lệ.');
  if (!isValidEmail(booking.email)) throw new Error('Email chưa hợp lệ.');
  if (!booking.consultationType) throw new Error('Hình thức tư vấn chưa hợp lệ.');
  if (!booking.package || !booking.packageLabel || !booking.packagePrice) throw new Error('Gói tư vấn chưa hợp lệ.');

  if (params.slotStart || params.slotEnd) {
    const startDt = new Date(params.slotStart);
    const endDt = new Date(params.slotEnd);
    const durationMs = endDt.getTime() - startDt.getTime();
    if (isNaN(startDt.getTime()) || isNaN(endDt.getTime())) throw new Error('Khung giờ đặt lịch chưa hợp lệ.');
    if (durationMs <= 0 || durationMs > 4 * 3600 * 1000) throw new Error('Thời lượng đặt lịch chưa hợp lệ.');
    if (startDt.getTime() < Date.now() - 15 * 60 * 1000) throw new Error('Khung giờ đã qua, vui lòng chọn lại lịch.');
  }
}

function enforceBookingRateLimit(params, action) {
  const phone = cleanValue(params.phone).replace(/^'/, '');
  const email = cleanValue(params.email).toLowerCase();
  const identity = phone || email;
  if (!identity) return;

  const key = 'booking_rl_' + sanitizePlainText(action || 'booking', 20) + '_' + Utilities.base64EncodeWebSafe(identity).slice(0, 80);
  const cache = CacheService.getScriptCache();
  const current = parseInt(cache.get(key) || '0', 10);
  if (current >= BOOKING_RATE_LIMIT_MAX) {
    throw new Error('Bạn thao tác hơi nhanh. Vui lòng thử lại sau ít phút hoặc nhắn Zalo để được hỗ trợ.');
  }
  cache.put(key, String(current + 1), BOOKING_RATE_LIMIT_SECONDS);
}

function logAppError(source, error, params) {
  try {
    const spreadsheet = SpreadsheetApp.openById(SPREADSHEET_ID);
    const sheet = getOrCreateLogSheet(spreadsheet, ERROR_LOG_SHEET, [
      'Ngày giờ Việt Nam',
      'Nguồn',
      'Thông báo',
      'Stack',
      'Dữ liệu',
    ]);
    const payload = maskSensitiveParams(params || {});
    sheet.appendRow([
      getVietnamDateTime(),
      sanitizePlainText(source, 120),
      sanitizePlainText(error && error.message ? error.message : String(error), 500),
      sanitizePlainText(error && error.stack ? error.stack : '', 1500),
      JSON.stringify(payload).slice(0, 4500),
    ]);
  } catch (logError) {
    console.error('Error log failed:', logError);
  }
}

function getOrCreateLogSheet(spreadsheet, sheetName, headers) {
  let sheet = spreadsheet.getSheetByName(sheetName);
  if (!sheet) sheet = spreadsheet.insertSheet(sheetName);
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(headers);
    sheet.setFrozenRows(1);
  }
  return sheet;
}

function maskSensitiveParams(params) {
  const safe = {};
  Object.keys(params || {}).forEach((key) => {
    const lowerKey = key.toLowerCase();
    let value = cleanValue(params[key]);
    if (lowerKey.indexOf('phone') !== -1 || lowerKey.indexOf('zalo') !== -1) {
      value = value.replace(/^'?(.{0,3}).*(.{2})$/, '$1***$2');
    }
    if (lowerKey.indexOf('email') !== -1) {
      value = value.replace(/^(.{1,2}).*(@.*)$/, '$1***$2');
    }
    safe[key] = sanitizePlainText(value, 500);
  });
  return safe;
}

function buildTransferContent(packageCode, phone) {
  const code = cleanValue(packageCode).toUpperCase();
  const cleanPhone = cleanValue(phone).replace(/^'/, '').replace(/\s+/g, '');
  return (code + ' ' + cleanPhone).trim();
}

function normalizeConsultationType(value) {
  const raw = cleanValue(value).toLowerCase();
  if (raw === 'online' || raw.includes('online') || raw.includes('google meet')) return 'online';
  if (raw === 'offline' || raw.includes('offline') || raw.includes('tp.hcm') || raw.includes('truc tiep')) return 'offline';
  return '';
}

function getPackageOption(consultationType, packageCode) {
  const packageFromSheet = getPackageBaseFromPackagesSheet(packageCode);
  if (packageFromSheet) {
    const price = consultationType === 'offline'
      ? packageFromSheet.offlinePrice || packageFromSheet.onlinePrice
      : packageFromSheet.onlinePrice;
    return {
      name: packageFromSheet.name,
      label: packageFromSheet.name + ' – ' + formatPackagePriceLabel(price) + normalizePackageUnit(packageFromSheet.unit),
      price: price,
      unit: normalizePackageUnit(packageFromSheet.unit),
      onlinePrice: packageFromSheet.onlinePrice,
      offlinePrice: packageFromSheet.offlinePrice,
    };
  }

  const packageBase = getPackageBaseFromLandingContent(packageCode);
  if (packageBase) {
    const price = consultationType === 'offline' && packageCode !== 'big7'
      ? packageBase.price + OFFLINE_TRAVEL_FEE
      : packageBase.price;

    return {
      name: packageBase.name,
      label: packageBase.name + ' – ' + formatPackagePriceLabel(price) + normalizePackageUnit('/buổi'),
      price: price,
      unit: normalizePackageUnit('/buổi'),
      onlinePrice: packageBase.price,
      offlinePrice: packageCode !== 'big7' ? packageBase.price + OFFLINE_TRAVEL_FEE : packageBase.price,
    };
  }

  const fallback = PACKAGE_OPTIONS[consultationType] && PACKAGE_OPTIONS[consultationType][packageCode];
  if (!fallback) return null;
  return {
    name: stripHtmlToText(fallback.label).replace(/\s+–\s+.*$/, ''),
    label: fallback.label,
    price: fallback.price,
    unit: normalizePackageUnit('/buổi'),
    onlinePrice: PACKAGE_OPTIONS.online[packageCode] ? PACKAGE_OPTIONS.online[packageCode].price : fallback.price,
    offlinePrice: PACKAGE_OPTIONS.offline[packageCode] ? PACKAGE_OPTIONS.offline[packageCode].price : fallback.price,
  };
}

function getPackageBaseFromPackagesSheet(packageCode) {
  const targetCode = cleanPackageCode(packageCode);
  if (!targetCode) return null;

  try {
    const spreadsheet = SpreadsheetApp.openById(LANDING_CONTENT_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(PACKAGES_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) return null;

    const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
    const headers = values[0];
    const enabledCol = headers.indexOf('Bật');
    const codeCol = headers.indexOf('Mã gói');
    const nameCol = headers.indexOf('Tên gói');
    const onlinePriceCol = headers.indexOf('Giá online');
    const offlinePriceCol = headers.indexOf('Giá offline');
    const unitCol = headers.indexOf('Đơn vị');
    if (enabledCol < 0 || codeCol < 0 || nameCol < 0 || onlinePriceCol < 0) return null;

    for (let i = 1; i < values.length; i++) {
      const row = values[i];
      const enabled = row[enabledCol] === true || String(row[enabledCol]).toUpperCase() === 'TRUE' || String(row[enabledCol]).trim() === '1';
      if (!enabled || cleanPackageCode(row[codeCol]) !== targetCode) continue;
      const name = stripHtmlToText(row[nameCol]);
      const onlinePrice = parsePriceNumber(row[onlinePriceCol]);
      const offlinePrice = parsePriceNumber(row[offlinePriceCol]) || onlinePrice;
      if (!name || !onlinePrice) return null;
      return {
        name: name,
        onlinePrice: onlinePrice,
        offlinePrice: offlinePrice,
        unit: normalizePackageUnit(row[unitCol]),
      };
    }
  } catch (error) {
    console.warn('Khong doc duoc Sheet Packages, dung cau hinh goi cu:', error);
  }

  return null;
}

function cleanPackageCode(value) {
  return cleanValue(value)
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function getPackageBaseFromLandingContent(packageCode) {
  const keys = PACKAGE_CONTENT_KEYS[packageCode];
  if (!keys) return null;

  const values = getLandingContentValues();
  const name = stripHtmlToText(values[keys.name]);
  const price = parsePriceFromContent(values[keys.price]);
  if (!name || !price) return null;

  return { name: name, price: price };
}

function getLandingContentValues() {
  if (LANDING_CONTENT_VALUE_CACHE) return LANDING_CONTENT_VALUE_CACHE;

  const valuesByKey = {};
  try {
    const spreadsheet = SpreadsheetApp.openById(LANDING_CONTENT_SPREADSHEET_ID);
    const sheet = spreadsheet.getSheetByName(LANDING_CONTENT_SHEET_NAME);
    if (!sheet || sheet.getLastRow() < 2) {
      LANDING_CONTENT_VALUE_CACHE = valuesByKey;
      return valuesByKey;
    }

    const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getDisplayValues();
    const headers = values[0];
    const enabledCol = headers.indexOf('Bật');
    const keyCol = headers.indexOf('Khóa');
    const valueCol = headers.indexOf('Nội dung');
    if (enabledCol < 0 || keyCol < 0 || valueCol < 0) {
      LANDING_CONTENT_VALUE_CACHE = valuesByKey;
      return valuesByKey;
    }

    values.slice(1).forEach((row) => {
      const enabled = row[enabledCol] === true || String(row[enabledCol]).toUpperCase() === 'TRUE' || String(row[enabledCol]).trim() === '1';
      const key = cleanValue(row[keyCol]);
      if (enabled && key) valuesByKey[key] = row[valueCol];
    });
  } catch (error) {
    console.warn('Khong doc duoc Sheet noi dung de lay gia, dung gia mac dinh:', error);
  }

  LANDING_CONTENT_VALUE_CACHE = valuesByKey;
  return valuesByKey;
}

function parsePriceFromContent(value) {
  const digits = stripHtmlToText(value).replace(/[^\d]/g, '');
  return digits ? parseInt(digits, 10) : 0;
}

function stripHtmlToText(value) {
  return String(value || '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatPackagePriceLabel(price) {
  return Number(price || 0).toLocaleString('vi-VN') + ' vnđ';
}

function normalizePackageUnit(unit) {
  const value = cleanValue(unit || '/buổi');
  if (!value) return '/buổi';
  if (value.indexOf('/') === 0) return value;
  return '/' + value;
}

function resolveBookingDetails(params) {
  const consultationType = normalizeConsultationType(params.consultationType || params.consultationTypeLabel);
  const packageCode = cleanPackageCode(params.package);
  const packageOption = getPackageOption(consultationType, packageCode);
  const paramsUnit = normalizePackageUnit(params.packageUnit || '/buổi');
  const paramsPrice = parsePriceNumber(params.packagePrice);
  const paramsOnlinePrice = parsePriceNumber(params.packageOnlinePrice);
  const paramsOfflinePrice = parsePriceNumber(params.packageOfflinePrice);

  const packageLabel = packageOption
    ? packageOption.label
    : sanitizePlainText(params.packageLabel, 180);
  const packagePrice = packageOption
    ? packageOption.price
    : paramsPrice;
  const packageUnit = packageOption ? packageOption.unit : paramsUnit;
  const onlinePrice = packageOption ? packageOption.onlinePrice : paramsOnlinePrice;
  const offlinePrice = packageOption ? packageOption.offlinePrice : paramsOfflinePrice;
  const transferContent = sanitizePlainText(params.transferContent, 80) || buildTransferContent(packageCode, params.phone);
  const hasOfflineTravelFee = cleanValue(params.hasOfflineTravelFee).toLowerCase() === 'true'
    || (consultationType === 'offline' && offlinePrice && onlinePrice && offlinePrice > onlinePrice);

  return {
    name: sanitizePlainText(params.name, 120),
    dob: sanitizePlainText(params.dob, 30),
    phone: sanitizePlainText(params.phone, 30),
    email: sanitizePlainText(params.email, 160).toLowerCase(),
    concern: sanitizePlainText(params.concern, 1200),
    consultationType: consultationType,
    consultationTypeLabel: CONSULTATION_TYPE_LABELS[consultationType] || sanitizePlainText(params.consultationTypeLabel, 120),
    package: packageCode,
    packageLabel: packageLabel,
    packagePrice: packagePrice,
    packageUnit: packageUnit,
    transferContent: transferContent,
    isOffline: consultationType === 'offline',
    hasOfflineTravelFee: hasOfflineTravelFee,
  };
}

function getOfflineNoteText(booking) {
  return booking.hasOfflineTravelFee
    ? 'Phụ phí xăng xe: ' + formatPrice(OFFLINE_TRAVEL_FEE) + ' (đã tính trong giá gói offline)'
    : 'Phụ phí xăng xe: Không áp dụng cho gói này';
}

function fixOfflineBig7PricingRows() {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);

  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return 'Khong co du lieu can sua';

  const typeCol = HEADERS.indexOf('Hình thức') + 1;
  const packageCol = HEADERS.indexOf('Gói tư vấn') + 1;
  const priceCol = HEADERS.indexOf('Số tiền') + 1;
  const codeCol = HEADERS.indexOf('Mã gói') + 1;
  if (typeCol < 1 || packageCol < 1 || priceCol < 1 || codeCol < 1) {
    throw new Error('Khong tim thay cot can thiet de sua gia.');
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  let updated = 0;

  values.forEach((row, index) => {
    const rowNumber = index + 2;
    const type = normalizeConsultationType(row[typeCol - 1]);
    const code = cleanValue(row[codeCol - 1]);
    const packageName = cleanValue(row[packageCol - 1]).toLowerCase();
    const isBig7 = code === 'big7' || packageName.indexOf('toàn diện') !== -1 || packageName.indexOf('toan dien') !== -1;

    if (type === 'offline' && isBig7) {
      const big7Option = getPackageOption('offline', 'big7') || PACKAGE_OPTIONS.offline.big7;
      sheet.getRange(rowNumber, packageCol).setValue(big7Option.label);
      sheet.getRange(rowNumber, priceCol).setValue(big7Option.price);
      sheet.getRange(rowNumber, priceCol).setNumberFormat(PRICE_NUMBER_FORMAT);
      updated += 1;
    }
  });

  const calendarUpdated = fixOfflineBig7CalendarEvents();
  return 'Da sua ' + updated + ' dong Sheet va ' + calendarUpdated + ' su kien Calendar offline big7 ve 2.000.000';
}

function fixOfflineBig7CalendarEvents() {
  const cal = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();
  const now = new Date();
  const end = new Date(now.getTime() + 90 * 24 * 3600 * 1000);
  const events = cal.getEvents(now, end);
  let updated = 0;

  events.forEach((ev) => {
    const title = ev.getTitle();
    const desc = ev.getDescription() || '';
    const content = title + '\n' + desc;
    const isNhanSo = title.indexOf('[Nhân Số]') !== -1;
    const isBig7 = content.indexOf('Phân Tích Toàn Diện') !== -1 || content.indexOf('Phan Tich Toan Dien') !== -1;
    const hasWrongPrice = content.indexOf('2.050.000') !== -1 || content.indexOf('2,050,000') !== -1 || content.indexOf('2050000') !== -1;

    if (!isNhanSo || !isBig7 || !hasWrongPrice) return;

    const newTitle = title
      .replace(/2[.,]050[.,]000\s*vnđ\/buổi/g, '2.000.000 vnđ/buổi')
      .replace(/2[.,]050[.,]000đ/g, '2.000.000đ');

    const newDesc = desc
      .replace(/2[.,]050[.,]000\s*vnđ\/buổi/g, '2.000.000 vnđ/buổi')
      .replace(/2[.,]050[.,]000đ/g, '2.000.000đ')
      .replace(/Số tiền:\s*2[.,]050[.,]000đ/g, 'Số tiền: 2.000.000đ')
      .replace(/Phụ phí xăng xe: 50[.,]000đ \(đã tính trong giá gói offline\)/g, 'Phụ phí xăng xe: Không áp dụng cho gói này');

    ev.setTitle(newTitle);
    ev.setDescription(newDesc);
    updated += 1;
  });

  return updated;
}

function formatDateVN(value) {
  if (!value) return '';
  const parts = value.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return value;
}

function formatPrice(value) {
  const num = parseInt(value || '0', 10);
  if (!num) return '';
  return num.toLocaleString('vi-VN') + 'đ';
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function testAuth() {
  CalendarApp.getDefaultCalendar();
  GmailApp.getInboxUnreadCount();
}

function testSaveRow() {
  const params = {
    submittedAt: new Date().toISOString(),
    name: 'TEST KHACH',
    dob: '01/01/1990',
    phone: "'0900000000",
    email: getOwnerEmail() || 'test@example.com',
    consultationType: 'online',
    package: 'year',
    concern: 'Dong test tu Apps Script',
    slotLabel: 'TEST - khong tao lich',
    slotStart: '',
    slotEnd: '',
  };
  Logger.log(handleSaveBooking(params).getContent());
  Logger.log(handleCompleteBooking(params).getContent());
}

function testSendEmails() {
  const ownerEmail = getOwnerEmail();
  const senderEmail = getScriptSenderEmail();
  Logger.log('Sender: ' + senderEmail);
  Logger.log('Owner: ' + ownerEmail);
  Logger.log('Script version: ' + SCRIPT_VERSION);

  if (!senderEmail) {
    throw new Error('Khong lay duoc email nguoi gui. Hay trien khai Web App voi "Thuc thi tuoi la: Toi".');
  }

  const testTo = ownerEmail || senderEmail;
  sendMailSafe(
    testTo,
    '[TEST] Email dat lich Nhan So Hoc',
    'Day la email test tu Apps Script.\nNeu ban nhan duoc email nay thi he thong gui mail dang hoat dong.',
    { name: EMAIL_SENDER_NAME }
  );
  Logger.log('Da gui email test den: ' + testTo);
}

function testCustomerEmail() {
  const ownerEmail = getOwnerEmail();
  const params = {
    name: 'TEST KHACH EMAIL',
    dob: '01/01/1990',
    phone: "'0900000000",
    email: ownerEmail,
    consultationType: 'offline',
    package: 'big7',
    concern: 'Test email khach day du',
    slotLabel: 'Thu Bay, 13/06/2026 | 13:00 - 15:00',
  };
  sendConfirmationEmail(params);
  Logger.log('Da gui email khach test den: ' + ownerEmail);
}
