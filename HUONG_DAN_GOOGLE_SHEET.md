# Ket noi form voi Google Sheet

## 1. Tao Google Sheet

Tao mot Google Sheet moi, sau do copy `Spreadsheet ID` trong duong dan:

```text
https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit
```

## 2. Tao Google Apps Script

1. Vao Google Sheet.
2. Chon `Extensions` > `Apps Script`.
3. Xoa code mac dinh trong `Code.gs`.
4. Copy noi dung file `google-apps-script.gs` cua du an nay vao `Code.gs`.
5. Thay dong sau bang Spreadsheet ID cua ban:

```javascript
const SPREADSHEET_ID = 'PASTE_GOOGLE_SHEET_ID_HERE';
```

## 3. Trien khai Web App

1. Trong Apps Script, chon `Deploy` > `New deployment`.
2. Chon loai `Web app`.
3. `Execute as`: chon `Me`.
4. `Who has access`: chon `Anyone`.
5. Bam `Deploy` va cap quyen theo yeu cau.
6. Copy `Web app URL`.

## 4. Gan Web App URL vao landing page

Mo file `script.js`, thay dong:

```javascript
const GOOGLE_SCRIPT_URL = 'PASTE_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE';
```

bang Web App URL vua copy.

Sau khi xong, form `Dat Lich Tu Van` se ghi du lieu vao tab `Dang ky tu van` trong Google Sheet.
