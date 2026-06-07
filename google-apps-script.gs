const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
const SHEET_NAME = 'Dang ky tu van';

const HEADERS = [
  'Ngày giờ Việt Nam',
  'Họ và tên',
  'Số điện thoại / Zalo',
  'Hình thức',
  'Khoá học',
  'Lời nhắn',
];

function doPost(e) {
  try {
    const params = e.parameter || {};
    const sheet = getTargetSheet();
    ensureHeaderRow(sheet);

    const lock = LockService.getScriptLock();
    lock.waitLock(10000);

    try {
      sheet.appendRow([
        getVietnamDateTime(params.submittedAt),
        cleanValue(params.name),
        cleanValue(params.phone),
        cleanValue(params.consultationTypeLabel),
        cleanValue(params.packageLabel),
        cleanValue(params.concern),
      ]);
    } finally {
      lock.releaseLock();
    }

    return jsonResponse({
      ok: true,
      message: 'Saved',
    });
  } catch (error) {
    return jsonResponse({
      ok: false,
      message: error.message,
    });
  }
}

function doGet() {
  return jsonResponse({
    ok: true,
    message: 'Google Apps Script endpoint is running',
  });
}

function getTargetSheet() {
  const spreadsheet = SPREADSHEET_ID && !SPREADSHEET_ID.includes('PASTE_GOOGLE_SHEET_ID')
    ? SpreadsheetApp.openById(SPREADSHEET_ID)
    : SpreadsheetApp.getActiveSpreadsheet();

  if (!spreadsheet) {
    throw new Error('Khong tim thay Google Sheet. Hay dien SPREADSHEET_ID.');
  }

  return spreadsheet.getSheetByName(SHEET_NAME) || spreadsheet.insertSheet(SHEET_NAME);
}

function ensureHeaderRow(sheet) {
  trimExtraColumns(sheet);

  if (sheet.getLastRow() > 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).setNumberFormat('@');
    sheet.autoResizeColumns(1, HEADERS.length);
    return;
  }

  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, sheet.getMaxRows(), HEADERS.length).setNumberFormat('@');
  sheet.autoResizeColumns(1, HEADERS.length);
}

function trimExtraColumns(sheet) {
  const extraColumnCount = sheet.getMaxColumns() - HEADERS.length;
  if (extraColumnCount > 0) {
    sheet.deleteColumns(HEADERS.length + 1, extraColumnCount);
  }
}

function getVietnamDateTime(value) {
  const date = value ? new Date(value) : new Date();
  return Utilities.formatDate(date, 'Asia/Ho_Chi_Minh', 'dd/MM/yyyy HH:mm:ss');
}

function cleanValue(value) {
  return String(value || '').trim();
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
