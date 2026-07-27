import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const client = await readFile(
  new URL("next-app/app/use-booking-api-client.ts", root),
  "utf8",
);
const state = await readFile(
  new URL("next-app/app/use-booking-form-state.ts", root),
  "utf8",
);
const calendar = await readFile(
  new URL("next-app/app/use-booking-calendar.ts", root),
  "utf8",
);
const payment = await readFile(
  new URL("next-app/app/use-payment-runtime.ts", root),
  "utf8",
);

test("native booking cutover is reversible by an explicit public flag", () => {
  assert.match(client, /NEXT_PUBLIC_BOOKING_API_V2_ENABLED/);
  assert.match(client, /NATIVE_BOOKING_API_ENABLED/);
  assert.match(client, /nativeEnabled: NATIVE_BOOKING_API_ENABLED/);
  assert.match(client, /BOOKING_URL/);
});

test("native reservation sends canonical fields, selected provider and no client price", () => {
  assert.match(client, /customer_name: data\.name/);
  assert.match(client, /date_of_birth: data\.dob/);
  assert.match(client, /consultation_type: data\.consultationType/);
  assert.match(client, /package_code: data\.package/);
  assert.match(
    client,
    /data\.paymentProvider === "sepay" \? "sepay" : "manual_qr"/,
  );
  const nativeCreate =
    client.match(/if \(action === "createBooking"\)[\s\S]+?\n  \}/)?.[0] ??
    "";
  assert.doesNotMatch(nativeCreate, /price|amount/);
});

test("one idempotency UUID follows reserve, status, manual review and cancel", () => {
  assert.match(state, /idempotencyKey: window\.crypto\.randomUUID\(\)/);
  assert.match(client, /"Idempotency-Key": idempotencyKey/);
  assert.match(client, /\/api\/bookings\/reserve/);
  assert.match(client, /\/api\/bookings\/cancel/);
  assert.match(client, /\/api\/bookings\/status/);
  assert.match(client, /\/api\/bookings\/manual-payment/);
});

test("calendar uses minimal slots API and native mode keeps SePay polling", () => {
  assert.match(calendar, /\/api\/bookings\/slots/);
  assert.match(calendar, /slot\.slot_start/);
  assert.match(calendar, /slot\.slot_end/);
  assert.doesNotMatch(payment, /!NATIVE_BOOKING_API_ENABLED/);
  assert.match(payment, /"checkBookingStatus"/);
  assert.match(payment, /fetch\("\/api\/payment-settings"/);
  assert.match(
    payment,
    /if \(NATIVE_BOOKING_API_ENABLED\) \{\s+announceConfirmed\(\)/,
  );
});

test("calendar clears stale time slots until the customer selects a date", () => {
  assert.match(calendar, /const renderTimePrompt = \(\) =>/);
  assert.match(
    calendar,
    /Vui lòng chọn ngày trước để xem khung giờ còn trống\./,
  );
  assert.match(
    calendar,
    /selectedInfo\.style\.display = "none";\s+renderTimePrompt\(\);\s+try \{/,
  );
  assert.match(
    calendar,
    /button\.addEventListener\("click", \(\) => \{[\s\S]*renderTimeSlots\(date\)/,
  );
});

test("payment polling stops with guidance instead of hanging on an inactive booking", () => {
  assert.match(
    payment,
    /result\.status === "cancelled" \|\| result\.status === "expired"/,
  );
  assert.match(payment, /Lịch giữ chỗ này đã bị hủy/);
  assert.match(payment, /Mã thanh toán đã hết hạn/);
  assert.match(payment, /countdown\.textContent = "Đã dừng"/);
});
