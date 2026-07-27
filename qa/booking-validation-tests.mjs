import assert from "node:assert/strict";
import test from "node:test";
import {
  normalizeVietnamesePhone,
  validateBookingEmail,
  validateBookingName,
  validateBookingPhone,
  validateBookingReservationPayload,
} from "../next-app/lib/booking-validation.ts";

test("accepts and normalizes valid Vietnamese contact details", () => {
  assert.equal(normalizeVietnamesePhone("+84 90 707 2639"), "0907072639");
  assert.equal(validateBookingPhone("090 707 2639"), "");
  assert.equal(validateBookingName("Lê Chí Cường"), "");
  assert.equal(validateBookingEmail("cuong@example.com"), "");
});

test("rejects overlong and invalid Vietnamese phone numbers", () => {
  assert.match(validateBookingPhone("0907072633344"), /10 số/);
  assert.match(validateBookingPhone("0101234567"), /đúng đầu số/);
});

test("rejects an invalid reservation before database access", () => {
  const result = validateBookingReservationPayload({
    customer_name: "Lê Chí Cường",
    date_of_birth: "1999-10-03",
    phone: "0907072633344",
    email: "cuong@example.com",
    consultation_type: "offline",
    package_code: "personal",
    concern: "",
    slot_start: "2026-07-28T02:00:00.000Z",
    slot_end: "2026-07-28T04:00:00.000Z",
    payment_provider: "manual_qr",
  });
  assert.equal(result.ok, false);
  assert.match(result.message, /10 số/);
});
