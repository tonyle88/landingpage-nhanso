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
const autoConfirmationMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607270002_sepay_auto_confirmation_setting.sql",
    root,
  ),
  "utf8",
);
const virtualAccountMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607270003_accept_sepay_virtual_account.sql",
    root,
  ),
  "utf8",
);
const accountAllowlistMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607270004_sepay_private_account_allowlist.sql",
    root,
  ),
  "utf8",
);
const settingsPage = await readFile(
  new URL("next-app/app/admin/settings/page.tsx", root),
  "utf8",
);
const settingsActions = await readFile(
  new URL("next-app/app/admin/settings/actions.ts", root),
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

test("SePay accepts the configured account as either the bank account or VA", () => {
  assert.match(virtualAccountMigration, /p_payload->>''subAccount''/);
  assert.match(
    virtualAccountMigration,
    /v_account_number <> v_expected_account[\s\S]*and v_sub_account <> v_expected_account/,
  );
  assert.match(
    virtualAccountMigration,
    /expected SePay account validation was not updated/,
  );
});

test("SePay can use a private account allowlist without exposing it publicly", () => {
  assert.match(accountAllowlistMigration, /payments\.sepay_expected_accounts/);
  assert.match(accountAllowlistMigration, /false\s*\)/);
  assert.match(accountAllowlistMigration, /jsonb_typeof\(value\) = ''array''/);
  assert.match(
    accountAllowlistMigration,
    /not \(v_expected_accounts \? v_account_number\)/,
  );
  assert.match(
    accountAllowlistMigration,
    /not \(v_expected_accounts \? v_sub_account\)/,
  );
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

test("SePay automatic confirmation is private, off by default and keeps manual events", () => {
  assert.match(autoConfirmationMigration, /payments\.sepay_auto_confirmation/);
  assert.match(autoConfirmationMigration, /\{"enabled":false\}/);
  assert.match(autoConfirmationMigration, /manual_confirmation_required/);
  assert.match(autoConfirmationMigration, /insert into public\.payment_transactions/);
  assert.match(autoConfirmationMigration, /v_role not in \('owner', 'admin'\)/);
  assert.match(autoConfirmationMigration, /protected operational setting/);
});

test("admin exposes an operations-protected SePay mode control", () => {
  assert.match(settingsPage, /Tự động xác nhận chuyển khoản/);
  assert.match(settingsPage, /Kiểm tra thủ công/);
  assert.match(settingsPage, /manage_operations/);
  assert.match(settingsActions, /admin_set_sepay_auto_confirmation/);
  assert.match(settingsActions, /requireOperationsManager/);
  assert.match(settingsActions, /sepay_migration_required/);
  assert.match(settingsPage, /sepaySchemaReady/);
  assert.match(settingsPage, /202607270002_sepay_auto_confirmation_setting\.sql/);
});
