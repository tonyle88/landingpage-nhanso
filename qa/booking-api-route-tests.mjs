import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = await readFile(
  new URL("next-app/lib/booking-api.ts", root),
  "utf8",
);
const reserveRoute = await readFile(
  new URL("next-app/app/api/bookings/reserve/route.ts", root),
  "utf8",
);
const cancelRoute = await readFile(
  new URL("next-app/app/api/bookings/cancel/route.ts", root),
  "utf8",
);
const slotsRoute = await readFile(
  new URL("next-app/app/api/bookings/slots/route.ts", root),
  "utf8",
);
const statusRoute = await readFile(
  new URL("next-app/app/api/bookings/status/route.ts", root),
  "utf8",
);
const manualPaymentRoute = await readFile(
  new URL("next-app/app/api/bookings/manual-payment/route.ts", root),
  "utf8",
);

test("booking routes only expose server-side POST handlers", () => {
  assert.match(reserveRoute, /export async function POST/);
  assert.match(cancelRoute, /export async function POST/);
  assert.match(slotsRoute, /export async function GET/);
  assert.match(statusRoute, /export async function POST/);
  assert.match(manualPaymentRoute, /export async function POST/);
  assert.doesNotMatch(reserveRoute, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(cancelRoute, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
});

test("booking workflow routes use narrow service RPCs", () => {
  assert.match(source, /rpc\(\s*"list_booking_unavailable_slots"/);
  assert.match(source, /rpc\(\s*"get_booking_reservation_status"/);
  assert.match(source, /rpc\(\s*"acknowledge_manual_booking_payment"/);
  assert.match(source, /maximumRangeMs = 31/);
  assert.match(source, /public, max-age=15/);
  assert.match(source, /readBookingCredential/);
});

test("booking API requires bounded JSON and a UUID idempotency header", () => {
  assert.match(source, /MAX_RESERVATION_BODY_BYTES = 16_384/);
  assert.match(source, /MAX_CANCELLATION_BODY_BYTES = 2_048/);
  assert.match(source, /request\.body\.getReader\(\)/);
  assert.match(source, /idempotency-key/);
  assert.match(source, /UUID_PATTERN\.test\(key\)/);
  assert.match(source, /status: 413|BookingRequestError\(413/);
  assert.match(source, /BookingRequestError\(415/);
});

test("booking API calls only the narrow RPCs and returns safe errors", () => {
  assert.match(source, /createServiceServerClient/);
  assert.match(source, /rpc\("consume_booking_rate_limit"/);
  assert.match(source, /rpc\("create_booking_reservation"/);
  assert.match(source, /rpc\("cancel_booking_reservation"/);
  assert.match(source, /code === "23P01"/);
  assert.match(source, /code === "22023"/);
  assert.doesNotMatch(source, /error\.message/);
  assert.match(source, /Cache-Control": "no-store"/);
});

test("booking API applies distributed IP and identity rate limits", () => {
  assert.match(source, /BOOKING_RATE_LIMIT_SECRET/);
  assert.match(source, /createHmac\("sha256"/);
  assert.match(source, /cf-connecting-ip/);
  assert.match(source, /x-vercel-forwarded-for/);
  assert.match(source, /requestHostname === "127\.0\.0\.1"/);
  assert.match(source, /requestHostname === "localhost"/);
  assert.doesNotMatch(source, /NODE_ENV === "development"/);
  assert.match(source, /BookingRequestError\(\s*429/);
  assert.match(source, /"Retry-After": String\(retryAfter\)/);
  assert.doesNotMatch(source, /new Map|setInterval/);
});
