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
  assert.match(page, /\.limit\(100\)/);
});

test("booking reports require operations access and preserve status filters", () => {
  assert.match(exportRoute, /can\(principal\.role, "read_operations"\)/);
  assert.match(exportRoute, /parseBookingStatus/);
  assert.match(exportRoute, /application\/vnd\.ms-excel/);
  assert.match(exportRoute, /Cache-Control": "private, no-store"/);
  assert.match(reportPage, /can\(principal\.role, "read_operations"\)/);
  assert.match(page, /Xuất Excel/);
  assert.match(page, /Xuất PDF/);
});
