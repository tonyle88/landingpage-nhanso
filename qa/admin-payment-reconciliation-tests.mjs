import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const page = await readFile(
  new URL("next-app/app/admin/payments/page.tsx", root),
  "utf8",
);
const dashboard = await readFile(
  new URL("next-app/app/admin/page.tsx", root),
  "utf8",
);
const runbook = await readFile(
  new URL("next-app/supabase/SEPAY_RECONCILIATION.md", root),
  "utf8",
);

test("payment reconciliation page is role-gated and read-only", () => {
  assert.match(page, /getAdminPrincipal/);
  assert.match(page, /read_operations/);
  assert.doesNotMatch(page, /\.insert\(|\.update\(|\.delete\(|action=/);
  assert.match(dashboard, /href="\/admin\/payments"/);
});

test("payment alerts expose safe metadata without raw webhook payload", () => {
  assert.match(page, /webhook_events/);
  assert.match(page, /payment_transactions/);
  assert.match(page, /ignored/);
  assert.match(page, /failed/);
  assert.doesNotMatch(page, /select\([^)]*payload/);
  assert.doesNotMatch(
    page,
    /select\(\s*"[^"]*(customer_name|phone|email|description|accountNumber)/,
  );
});

test("manual reconciliation requires bank proof and audited booking workflow", () => {
  assert.match(runbook, /incoming, settled transaction/);
  assert.match(runbook, /trusted amount stored on that booking/);
  assert.match(runbook, /Đã xác nhận tiền/);
  assert.match(runbook, /state machine and audit log/);
  assert.match(runbook, /Never edit `webhook_events`/);
  assert.match(runbook, /rotate the HMAC secret/);
});
