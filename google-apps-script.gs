// =============================================
//  BAN GOP CU - KHONG KHUYEN DUNG CHO LUONG 2 SHEET MOI
//  Dung 2 file rieng:
//  - google-apps-script-booking.gs
//  - google-apps-script-landing-content.gs
// =============================================

// =============================================
//  NHÂN SỐ HỌC – GOOGLE APPS SCRIPT
//  Tính năng:
//  1. doGet  → trả về danh sách slot đã đặt từ Google Calendar
//  2. doPost → lưu Sheet + tạo sự kiện Calendar + gửi Email xác nhận
// =============================================

const SPREADSHEET_ID = '1hxBpzJwNO470xqoHBuaZF26anCGir5pnpQk0iPTxz4k';
const SHEET_NAME     = 'Dang ky tu van';
const LANDING_CONTENT_SHEET_NAME = 'Landing content';
const CALENDAR_ID    = 'primary'; // Dùng Google Calendar chính của bạn (hoặc thay bằng ID lịch riêng)
const OWNER_EMAIL    = 'PASTE_YOUR_GMAIL_HERE'; // Gmail nhận thông báo (để trống sẽ dùng Gmail triển khai script)
const EMAIL_SENDER_NAME = 'Tony Le – Nhân Số Học';
const EMAIL_LOG_SHEET = 'Email log';

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

const OFFLINE_TRAVEL_FEE = 50000;
const PRICE_NUMBER_FORMAT = '#,##0';
const SCRIPT_VERSION = '2026-06-11-v8-content-config';
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
      return jsonResponse({ ok: false, booked: [], error: err.message });
    }
  }

  if (params.action === 'getLandingContent') {
    try {
      return handleGetLandingContent();
    } catch (error) {
      return jsonResponse({ ok: false, items: [], message: error.message, scriptVersion: SCRIPT_VERSION });
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
      return jsonResponse({ ok: false, message: error.message, scriptVersion: SCRIPT_VERSION });
    }
  }

  return jsonResponse({ ok: true, message: 'Nhân Số Học – Apps Script đang chạy ✓', scriptVersion: SCRIPT_VERSION });
}

// =============================================
//  doPost – Xử lý đặt lịch hoàn tất
// =============================================
function doPost(e) {
  try {
    const params = getPostParams(e);

    if (params.action === 'saveBooking' || params.action === 'finalizeBooking') {
      return handleSaveBooking(params);
    }

    // Legacy fallback (nếu còn dùng form cũ)
    return handleLegacyBooking(params);

  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
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

  if (Object.keys(params).length || !e.postData || !e.postData.contents) {
    return params;
  }

  const contentType = String(e.postData.type || '').toLowerCase();
  const body = e.postData.contents;

  if (contentType.indexOf('application/json') !== -1) {
    return Object.assign(params, JSON.parse(body));
  }

  if (contentType.indexOf('application/x-www-form-urlencoded') !== -1) {
    body.split('&').forEach((pair) => {
      const parts = pair.split('=');
      const key = decodeURIComponent(parts[0] || '');
      const value = decodeURIComponent((parts[1] || '').replace(/\+/g, ' '));
      if (key) params[key] = value;
    });
  }

  return params;
}

// =============================================
//  POST – chỉ lưu Sheet (nhanh, dùng với no-cors từ website)
// =============================================
function handleSaveBooking(params) {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);
  const booking = resolveBookingDetails(params);

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
    eventDescLines.push('Phụ phí xăng xe: Không áp dụng cho gói Phân Tích Toàn Diện.');
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
        : '<p style="margin:0 0 8px;color:#e8a878;">&#128663; <strong>Phụ phí xăng xe:</strong> Không áp dụng cho gói Phân Tích Toàn Diện.</p>',
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

  const values = sheet.getRange(2, 1, lastRow - 1, LANDING_CONTENT_HEADERS.length).getValues();
  const indexes = getLandingContentHeaderIndexes();
  const items = values
    .map((row) => landingContentRowToItem(row, indexes))
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

function landingContentRowToItem(row, indexes) {
  const enabledValue = row[indexes['Bật']];
  const enabled = enabledValue === true || String(enabledValue).toUpperCase() === 'TRUE' || String(enabledValue).trim() === '1';

  return {
    enabled: enabled,
    key: cleanValue(row[indexes['Khóa']]),
    section: cleanValue(row[indexes['Section']]),
    description: cleanValue(row[indexes['Mô tả']]),
    selector: cleanValue(row[indexes['Selector']]),
    type: cleanValue(row[indexes['Kiểu']]) || 'text',
    attribute: cleanValue(row[indexes['Thuộc tính']]),
    value: row[indexes['Nội dung']] == null ? '' : String(row[indexes['Nội dung']]),
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
    lc(true, 'meta.description', 'Meta', 'Mô tả SEO', 'meta[name="description"]', 'attr', 'content', 'Khám phá bản thân qua Nhân Số Học. Hơn 3 năm kinh nghiệm, 900+ ca tư vấn. Hiểu mình hơn – Sống đúng hướng hơn. Đặt lịch tư vấn ngay!'),
    lc(true, 'meta.og_title', 'Meta', 'Tiêu đề khi chia sẻ link', 'meta[property="og:title"]', 'attr', 'content', 'Nhân Số Học Khai Phá Tiềm Năng | Clow Cat Patronus'),
    lc(true, 'meta.og_description', 'Meta', 'Mô tả khi chia sẻ link', 'meta[property="og:description"]', 'attr', 'content', 'Tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh và hành trình phát triển của chính mình.'),

    lc(true, 'nav.about', 'Menu', 'Menu Về chúng tôi', '#nav-links li:nth-child(1) .nav-link', 'text', '', 'Về Chúng Tôi'),
    lc(true, 'nav.benefits', 'Menu', 'Menu lợi ích', '#nav-links li:nth-child(2) .nav-link', 'text', '', 'Những Gì Bạn Nhận Được'),
    lc(true, 'nav.testimonials', 'Menu', 'Menu feedback', '#nav-links li:nth-child(3) .nav-link', 'text', '', 'Khách Hàng Nghĩ Gì?'),
    lc(true, 'nav.packages', 'Menu', 'Menu gói tư vấn', '#nav-links li:nth-child(4) .nav-link', 'text', '', 'Gói Tư Vấn'),
    lc(true, 'nav.process', 'Menu', 'Menu hành trình', '#nav-links li:nth-child(5) .nav-link', 'text', '', 'Hành Trình'),
    lc(true, 'nav.contact', 'Menu', 'Menu CTA', '#nav-links li:nth-child(6) .nav-link', 'text', '', 'Đặt Lịch Ngay'),
    lc(true, 'nav.logo_text', 'Menu', 'Tên cạnh logo', '.nav-logo .logo-text', 'text', '', 'Clow Cat Patronus'),

    lc(true, 'hero.badge', 'Hero', 'Badge đầu trang', '.hero-badge', 'text', '', '✦ Hơn 900 ca tư vấn thực tế ✦'),
    lc(true, 'hero.title_1', 'Hero', 'Dòng tiêu đề 1', '.hero-title .title-line:nth-child(1)', 'text', '', 'NHÂN SỐ HỌC'),
    lc(true, 'hero.title_2', 'Hero', 'Dòng tiêu đề 2', '.hero-title .title-line:nth-child(2)', 'text', '', 'KHAI PHÁ'),
    lc(true, 'hero.title_3', 'Hero', 'Dòng tiêu đề 3', '.hero-title .title-line:nth-child(3)', 'text', '', 'TIỀM NĂNG'),
    lc(true, 'hero.subtitle', 'Hero', 'Mô tả hero', '.hero-subtitle', 'text', '', 'Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh và hành trình phát triển của chính mình'),
    lc(true, 'hero.stat_1_number', 'Hero', 'Số thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-number', 'text', '', '3+'),
    lc(true, 'hero.stat_1_label', 'Hero', 'Nhãn thống kê 1', '.hero-stats .stat-item:nth-child(1) .stat-label', 'text', '', 'Năm kinh nghiệm'),
    lc(true, 'hero.stat_2_number', 'Hero', 'Số thống kê 2', '.hero-stats .stat-item:nth-child(3) .stat-number', 'text', '', '900+'),
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
  if (SPREADSHEET_ID && !SPREADSHEET_ID.includes('PASTE_GOOGLE_SHEET_ID')) {
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

function resolveBookingDetails(params) {
  const consultationType = normalizeConsultationType(params.consultationType || params.consultationTypeLabel);
  const packageCode = cleanValue(params.package);
  const packageOption = PACKAGE_OPTIONS[consultationType] && PACKAGE_OPTIONS[consultationType][packageCode];

  const packageLabel = packageOption
    ? packageOption.label
    : cleanValue(params.packageLabel);
  const packagePrice = packageOption
    ? packageOption.price
    : parseInt(params.packagePrice || '0', 10);
  const transferContent = cleanValue(params.transferContent) || buildTransferContent(packageCode, params.phone);

  return {
    name: cleanValue(params.name),
    dob: cleanValue(params.dob),
    phone: cleanValue(params.phone),
    email: cleanValue(params.email),
    concern: cleanValue(params.concern),
    consultationType: consultationType,
    consultationTypeLabel: CONSULTATION_TYPE_LABELS[consultationType] || cleanValue(params.consultationTypeLabel),
    package: packageCode,
    packageLabel: packageLabel,
    packagePrice: packagePrice,
    transferContent: transferContent,
    isOffline: consultationType === 'offline',
    hasOfflineTravelFee: consultationType === 'offline' && packageCode !== 'big7',
  };
}

function getOfflineNoteText(booking) {
  return booking.hasOfflineTravelFee
    ? 'Phụ phí xăng xe: ' + formatPrice(OFFLINE_TRAVEL_FEE) + ' (đã tính trong giá gói offline)'
    : 'Phụ phí xăng xe: Không áp dụng cho gói Phân Tích Toàn Diện';
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
      sheet.getRange(rowNumber, packageCol).setValue(PACKAGE_OPTIONS.offline.big7.label);
      sheet.getRange(rowNumber, priceCol).setValue(PACKAGE_OPTIONS.offline.big7.price);
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
      .replace(/Phụ phí xăng xe: 50[.,]000đ \(đã tính trong giá gói offline\)/g, 'Phụ phí xăng xe: Không áp dụng cho gói Phân Tích Toàn Diện');

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
