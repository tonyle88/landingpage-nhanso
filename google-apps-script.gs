// =============================================
//  NHÂN SỐ HỌC – GOOGLE APPS SCRIPT
//  Tính năng:
//  1. doGet  → trả về danh sách slot đã đặt từ Google Calendar
//  2. doPost → lưu Sheet + tạo sự kiện Calendar + gửi Email xác nhận
// =============================================

const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME     = 'Dang ky tu van';
const CALENDAR_ID    = 'primary'; // Dùng Google Calendar chính của bạn (hoặc thay bằng ID lịch riêng)
const OWNER_EMAIL    = 'PASTE_YOUR_GMAIL_HERE'; // Gmail của bạn để nhận thông báo

const HEADERS = [
  'Ngày giờ Việt Nam',
  'Họ và tên',
  'Ngày sinh',
  'Số điện thoại / Zalo',
  'Email',
  'Hình thức',
  'Khoá học',
  'Lịch hẹn',
  'Số tiền',
  'Lời nhắn',
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

      const booked = events.map(ev => ({
        start: ev.getStartTime().toISOString(),
        end:   ev.getEndTime().toISOString(),
        title: ev.getTitle(),
      }));

      return jsonResponse({ ok: true, booked });
    } catch (err) {
      return jsonResponse({ ok: false, booked: [], error: err.message });
    }
  }

  return jsonResponse({ ok: true, message: 'Nhân Số Học – Apps Script đang chạy ✓' });
}

// =============================================
//  doPost – Xử lý đặt lịch hoàn tất
// =============================================
function doPost(e) {
  try {
    const params = e ? (e.parameter || {}) : {};

    if (params.action === 'finalizeBooking') {
      return handleFinalizeBooking(params);
    }

    // Legacy fallback (nếu còn dùng form cũ)
    return handleLegacyBooking(params);

  } catch (error) {
    return jsonResponse({ ok: false, message: error.message });
  }
}

// =============================================
//  handleFinalizeBooking
// =============================================
function handleFinalizeBooking(params) {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);

  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  let calendarEventId = '';
  try {
    // 1. Tạo sự kiện trên Google Calendar
    if (params.slotStart && params.slotEnd) {
      const startDt = new Date(params.slotStart);
      const endDt   = new Date(params.slotEnd);
      const cal     = CalendarApp.getCalendarById(CALENDAR_ID) || CalendarApp.getDefaultCalendar();

      const eventTitle = `[Nhân Số] ${cleanValue(params.name)} – ${cleanValue(params.packageLabel)}`;
      const eventDesc  = [
        `Khách hàng: ${cleanValue(params.name)}`,
        `SĐT/Zalo: ${cleanValue(params.phone)}`,
        `Email: ${cleanValue(params.email)}`,
        `Ngày sinh: ${cleanValue(params.dob)}`,
        `Gói: ${cleanValue(params.packageLabel)}`,
        `Hình thức: ${cleanValue(params.consultationTypeLabel)}`,
        `Lời nhắn: ${cleanValue(params.concern)}`,
      ].join('\n');

      const ev = cal.createEvent(eventTitle, startDt, endDt, { description: eventDesc });
      calendarEventId = ev.getId();
    }

    // 2. Lưu vào Google Sheet
    sheet.appendRow([
      getVietnamDateTime(params.submittedAt),
      cleanValue(params.name),
      cleanValue(params.dob),
      cleanValue(params.phone),
      cleanValue(params.email),
      cleanValue(params.consultationTypeLabel),
      cleanValue(params.packageLabel),
      cleanValue(params.slotLabel),
      formatPrice(params.packagePrice),
      cleanValue(params.concern),
    ]);

  } finally {
    lock.releaseLock();
  }

  // 3. Gửi Email xác nhận cho khách
  if (params.email) {
    sendConfirmationEmail(params);
  }

  // 4. Gửi thông báo cho chủ
  if (OWNER_EMAIL && !OWNER_EMAIL.includes('PASTE_YOUR_GMAIL')) {
    sendOwnerNotification(params);
  }

  return jsonResponse({ ok: true, message: 'Đặt lịch thành công!', calendarEventId });
}

// =============================================
//  Legacy booking (form cũ không có lịch)
// =============================================
function handleLegacyBooking(params) {
  const sheet = getTargetSheet();
  ensureHeaderRow(sheet);
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    sheet.appendRow([
      getVietnamDateTime(params.submittedAt),
      cleanValue(params.name),
      cleanValue(params.dob),
      cleanValue(params.phone),
      cleanValue(params.email),
      cleanValue(params.consultationTypeLabel),
      cleanValue(params.packageLabel),
      '',
      '',
      cleanValue(params.concern),
    ]);
  } finally {
    lock.releaseLock();
  }
  return jsonResponse({ ok: true, message: 'Saved (legacy)' });
}

// =============================================
//  Email gửi khách
// =============================================
function sendConfirmationEmail(p) {
  const name        = cleanValue(p.name);
  const slotLabel   = cleanValue(p.slotLabel);
  const pkgLabel    = cleanValue(p.packageLabel);
  const typeLabel   = cleanValue(p.consultationTypeLabel);
  const price       = formatPrice(p.packagePrice);
  const phone       = cleanValue(p.phone).replace(/^'/, '');
  const isOffline   = (p.consultationType || '').toLowerCase().includes('offline');
  
  // HTML entities cho Emoji để tránh lỗi dấu chấm hỏi đen
  // Location note for offline
  const locationNote = isOffline
    ? '<p style="color:#e8a878;">&#128205; <strong>Địa điểm:</strong> Địa điểm cụ thể sẽ được thông báo qua Zalo trước buổi tư vấn.</p>'
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
        </table>
      </td></tr>

      ${isOffline ? `<tr><td style="padding:0 36px 20px;">${locationNote}</td></tr>` : ''}

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
  const textBody = 'Chào ' + name + ',\nBạn đã đặt lịch thành công!\nLịch hẹn: ' + slotLabel + '\nGói: ' + pkgLabel + '\nHình thức: ' + typeLabel + '\nSố tiền: ' + price + '\n\nHẹn gặp bạn tại buổi tư vấn!\nTony Le – Numerology\nMột đối tác của Clow Cat Patronus';

  GmailApp.sendEmail(
    cleanValue(p.email),
    subjectStr,
    textBody,
    { htmlBody: html, name: 'Tony Le – Nhân Số Học' }
  );
}

// =============================================
//  Thông báo cho chủ trang
// =============================================
function sendOwnerNotification(p) {
  const name   = cleanValue(p.name);
  const phone  = cleanValue(p.phone).replace(/^'/, '');
  const pkg    = cleanValue(p.packageLabel);
  const slot   = cleanValue(p.slotLabel);
  const price  = formatPrice(p.packagePrice);

  GmailApp.sendEmail(
    OWNER_EMAIL,
    '[Đặt lịch mới] ' + name + ' – ' + pkg,
    'Có khách đặt lịch mới!\n\nTên: ' + name + '\nSĐT: ' + phone + '\nGói: ' + pkg + '\nLịch: ' + slot + '\nSố tiền: ' + price + '\nEmail: ' + cleanValue(p.email) + '\nNgày sinh: ' + cleanValue(p.dob) + '\nLời nhắn: ' + cleanValue(p.concern),
    { name: 'Hệ thống đặt lịch Nhân Số Học' }
  );
}

// =============================================
//  Utility functions
// =============================================
function getTargetSheet() {
  const spreadsheet = SPREADSHEET_ID && !SPREADSHEET_ID.includes('PASTE_GOOGLE_SHEET_ID')
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();
  if (!spreadsheet) throw new Error('Khong tim thay Google Sheet. Hay dien SPREADSHEET_ID.');
  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaderRow(sheet) {
  trimExtraColumns(sheet);
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  if (sheet.getLastRow() === 0) sheet.setFrozenRows(1);
  sheet.getRange(1, 1, Math.max(sheet.getMaxRows(), 1), HEADERS.length).setNumberFormat('@');
  sheet.autoResizeColumns(1, HEADERS.length);
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
