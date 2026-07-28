import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607250014_admin_booking_workflow.sql",
    root,
  ),
  "utf8",
);
const page = await readFile(
  new URL("next-app/app/admin/bookings/page.tsx", root),
  "utf8",
);
const actions = await readFile(
  new URL("next-app/app/admin/bookings/actions.ts", root),
  "utf8",
);
const exportRoute = await readFile(
  new URL("next-app/app/admin/bookings/export/route.ts", root),
  "utf8",
);
const reportPage = await readFile(
  new URL("next-app/app/admin/bookings/report/page.tsx", root),
  "utf8",
);
const xlsxWorkbook = await readFile(
  new URL("next-app/lib/admin/xlsx-workbook.ts", root),
  "utf8",
);
const adminLayout = await readFile(
  new URL("next-app/app/admin/layout.tsx", root),
  "utf8",
);
const pendingOverlay = await readFile(
  new URL("next-app/app/admin/admin-pending-overlay.tsx", root),
  "utf8",
);

test("booking transition is owner/admin only and rejects stale writes", () => {
  assert.match(migration, /v_role not in \('owner', 'admin'\)/);
  assert.match(migration, /v_before\.status <> p_expected_status/);
  assert.match(migration, /using errcode = '40001'/);
  assert.match(migration, /status = p_next_status/);
  assert.match(actions, /can\(principal\.role, "manage_operations"\)/);
});

test("booking status audit contains operational metadata but no PII", () => {
  assert.match(migration, /booking\.status_transition/);
  assert.match(migration, /manual_payment_claimed/);
  const auditInsert =
    migration.match(/insert into public\.audit_logs[\s\S]+?return v_after/)?.[0] ??
    "";
  assert.doesNotMatch(
    auditInsert,
    /customer_name|phone|email|date_of_birth|concern/,
  );
  assert.doesNotMatch(auditInsert, /to_jsonb\(v_before\)|to_jsonb\(v_after\)/);
});

test("auditor can read the page but cannot see transition controls", () => {
  assert.match(page, /can\(principal\.role, "read_operations"\)/);
  assert.match(page, /const canManage = can\(principal\.role, "manage_operations"\)/);
  assert.match(page, /canManage && transitions\.length/);
  assert.match(page, /const PAGE_SIZE = 6/);
  assert.match(page, /\.range\(pageStart, pageStart \+ PAGE_SIZE - 1\)/);
  assert.match(page, /\{ count: "exact" \}/);
  assert.match(page, /Trang trước/);
  assert.match(page, /Trang sau/);
});

test("booking cards stay compact and expose per-recipient email evidence", () => {
  assert.match(page, /bookingOverview/);
  assert.match(page, /Xem thông tin đầy đủ/);
  assert.match(page, /EMAIL_ACTIONS\.customer/);
  assert.match(page, /EMAIL_ACTIONS\.owner/);
  assert.match(page, /Email khách/);
  assert.match(page, /Email chủ/);
});

test("booking reports require operations access and preserve status filters", () => {
  assert.match(exportRoute, /can\(principal\.role, "read_operations"\)/);
  assert.match(exportRoute, /parseBookingStatus/);
  assert.match(
    exportRoute,
    /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
  );
  assert.match(exportRoute, /\.xlsx/);
  assert.match(exportRoute, /createXlsxWorkbook/);
  assert.match(xlsxWorkbook, /\[Content_Types\]\.xml/);
  assert.match(xlsxWorkbook, /0x04034b50/);
  assert.match(xlsxWorkbook, /sheetViews/);
  assert.match(exportRoute, /Cache-Control": "private, no-store"/);
  assert.match(reportPage, /can\(principal\.role, "read_operations"\)/);
  assert.match(page, /Xuất Excel/);
  assert.match(page, /Xuất PDF/);
});

test("admin forms show one shared pending state and prevent repeat submits", () => {
  assert.match(adminLayout, /AdminPendingOverlay/);
  assert.match(pendingOverlay, /document\.addEventListener\("submit"/);
  assert.match(pendingOverlay, /event\.defaultPrevented/);
  assert.match(pendingOverlay, /control\.disabled = true/);
  assert.match(pendingOverlay, /Đang xử lý/);
  assert.match(pendingOverlay, /Không đóng trang hoặc bấm lại/);
  assert.match(pendingOverlay, /SAFETY_TIMEOUT_MS = 45_000/);
});
