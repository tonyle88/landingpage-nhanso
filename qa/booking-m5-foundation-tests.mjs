import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607240011_booking_state_and_idempotency.sql",
    root,
  ),
  "utf8",
);
const transitionFunction = migration.match(
  /create or replace function public\.enforce_booking_status_transition\(\)[\s\S]+?\n\$\$;/,
)?.[0];
const rateLimitMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607240012_booking_rate_limits_and_rpc_lockdown.sql",
    root,
  ),
  "utf8",
);
const workflowMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607250013_booking_slots_status_and_manual_review.sql",
    root,
  ),
  "utf8",
);

test("booking state machine is explicit and terminal states cannot regress", () => {
  assert.ok(transitionFunction, "booking transition trigger function must exist");
  assert.match(transitionFunction, /pending'.+held'.+cancelled'.+expired'/s);
  assert.match(transitionFunction, /held'.+paid'.+cancelled'.+expired'/s);
  assert.match(transitionFunction, /paid'.+confirmed'/s);
  assert.match(transitionFunction, /confirmed'.+cancelled'/s);
  assert.doesNotMatch(transitionFunction, /old\.status = 'cancelled'/);
  assert.doesNotMatch(transitionFunction, /old\.status = 'expired'/);
  assert.match(transitionFunction, /invalid booking status transition/);
});

test("reservation trusts package prices and enforces idempotency and slot lock", () => {
  assert.match(migration, /bookings_idempotency_key_unique/);
  assert.match(migration, /bookings_active_slot_unique/);
  assert.match(migration, /v_package\.online_price/);
  assert.match(migration, /v_package\.offline_price/);
  assert.match(migration, /idempotency key payload mismatch/);
  assert.match(migration, /request_fingerprint/);
  assert.match(migration, /'replayed', true/);
  assert.match(migration, /hold_expires_at <= now\(\)/);
});

test("anonymous API surface is narrow and cancellation needs the idempotency key", () => {
  assert.match(migration, /security definer/g);
  assert.match(migration, /cancel_booking_reservation\(\s*p_public_id text,\s*p_idempotency_key uuid/s);
  assert.match(migration, /grant execute.+create_booking_reservation.+anon/s);
  assert.match(migration, /grant execute.+cancel_booking_reservation.+anon/s);
});

test("database rate limit is persistent and booking RPCs are server-only", () => {
  assert.match(rateLimitMigration, /booking_rate_limit_buckets/);
  assert.match(rateLimitMigration, /interval '15 minutes'/);
  assert.match(rateLimitMigration, /v_ip_count <= 20/);
  assert.match(rateLimitMigration, /v_email_count <= 5/);
  assert.match(rateLimitMigration, /v_phone_count <= 5/);
  assert.match(
    rateLimitMigration,
    /revoke execute.+create_booking_reservation.+anon, authenticated/s,
  );
  assert.match(
    rateLimitMigration,
    /grant execute.+create_booking_reservation.+service_role/s,
  );
  assert.doesNotMatch(rateLimitMigration, /grant execute.+to anon/s);
});

test("slot, status and manual-review RPCs expose no customer PII", () => {
  assert.match(workflowMigration, /list_booking_unavailable_slots/);
  assert.match(workflowMigration, /get_booking_reservation_status/);
  assert.match(workflowMigration, /acknowledge_manual_booking_payment/);
  assert.match(workflowMigration, /now\(\) \+ interval '48 hours'/);
  assert.match(workflowMigration, /to service_role/g);
  assert.doesNotMatch(workflowMigration, /customer_name|phone|email/);
  assert.doesNotMatch(workflowMigration, /to anon|to authenticated/);
});
