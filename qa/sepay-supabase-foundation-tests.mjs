import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607250015_sepay_webhook_inbox.sql",
    root,
  ),
  "utf8",
);
const handler = await readFile(
  new URL("next-app/lib/sepay-webhook.ts", root),
  "utf8",
);

test("SePay inbox is service-only and deduplicates provider transactions", () => {
  assert.match(migration, /process_sepay_webhook/);
  assert.match(migration, /security definer/i);
  assert.match(migration, /to service_role/i);
  assert.match(migration, /revoke all[\s\S]*from public/i);
  assert.match(migration, /on conflict \(provider, event_id\)/i);
  assert.match(migration, /provider_transaction_id/i);
});

test("SePay processing validates account, amount, direction and payment code", () => {
  assert.match(migration, /v_transfer_type <> 'in'/);
  assert.match(migration, /v_account_number <> v_expected_account/);
  assert.match(migration, /v_booking\.amount <> v_amount/);
  assert.match(migration, /payment_order_id = v_order_id/);
  assert.match(migration, /position\(upper\(payment_order_id\) in v_content\)/);
});

test("SePay booking and payment updates are atomic and audit contains no PII", () => {
  assert.match(migration, /insert into public\.payment_transactions/);
  assert.match(migration, /set status = 'paid'/);
  assert.match(migration, /booking\.payment_verified/);
  assert.doesNotMatch(
    migration,
    /jsonb_build_object\([^)]*(email|phone|customer_name)/i,
  );
  assert.match(migration, /status = 'ignored'/);
});

test("Supabase cutover is server-side, disabled by default and reversible", () => {
  assert.match(handler, /SEPAY_SUPABASE_WEBHOOK_ENABLED === "true"/);
  assert.match(handler, /processInSupabase/);
  assert.match(handler, /forwardToBookingScript/);
  assert.match(handler, /SEPAY_BANK_ACCOUNT_NUMBER/);
  assert.match(handler, /createHash\("sha256"\)/);
});
