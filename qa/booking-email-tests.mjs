import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const delivery = await readFile(
  new URL("next-app/lib/booking-email.ts", root),
  "utf8",
);
const templates = await readFile(
  new URL("next-app/lib/booking-email-templates.ts", root),
  "utf8",
);
const webhook = await readFile(
  new URL("next-app/lib/sepay-webhook.ts", root),
  "utf8",
);
const finalizeMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607270005_finalize_paid_sepay_booking.sql",
    root,
  ),
  "utf8",
);
const bookingApi = await readFile(
  new URL("next-app/lib/booking-api.ts", root),
  "utf8",
);
const paymentRuntime = await readFile(
  new URL("next-app/app/use-payment-runtime.ts", root),
  "utf8",
);
const bookingTransitions = await readFile(
  new URL(
    "next-app/app/admin/bookings/booking-transition-button.tsx",
    root,
  ),
  "utf8",
);
const adminBookingsPage = await readFile(
  new URL("next-app/app/admin/bookings/page.tsx", root),
  "utf8",
);

test("customer and owner receive branded HTML and plain-text emails", () => {
  assert.match(templates, /buildCustomerBookingEmail/);
  assert.match(templates, /buildOwnerBookingEmail/);
  assert.match(templates, /#091c20/);
  assert.match(templates, /#f0c96a/);
  assert.match(templates, /Một đối tác của Clow Cat Patronus/);
  assert.match(templates, /Đặt Lịch Thành Công/);
  assert.match(templates, /Có Khách Đặt Lịch Mới/);
  assert.match(templates, /Lời nhắn của khách/);
  assert.match(templates, /escapeHtml/);
});

test("delivery uses server-only secrets and provider idempotency", () => {
  assert.match(delivery, /import "server-only"/);
  assert.match(delivery, /RESEND_API_KEY/);
  assert.match(delivery, /BOOKING_EMAIL_FROM/);
  assert.match(delivery, /BOOKING_OWNER_EMAIL/);
  assert.match(delivery, /Idempotency-Key/);
  assert.match(delivery, /booking-confirmed\/customer\//);
  assert.match(delivery, /booking-confirmed\/owner\//);
  assert.match(delivery, /audit_logs/);
  assert.match(delivery, /recordDeliveryFailure/);
  assert.match(delivery, /providerResponse/);
  assert.match(delivery, /status: "failure"/);
  assert.doesNotMatch(delivery, /NEXT_PUBLIC_RESEND/);
});

test("email is sent only after final confirmation", () => {
  assert.match(webhook, /finalizeAndEmailSepayBooking/);
  assert.match(delivery, /data\.status !== "confirmed"/);
  assert.match(bookingApi, /sendBookingEmailsForBookingId/);
  assert.match(bookingApi, /emailDelivery/);
});

test("paid SePay is finalized before exactly one customer and one owner email", () => {
  assert.match(finalizeMigration, /status = 'confirmed'/);
  assert.match(finalizeMigration, /payment_provider <> 'sepay'/);
  assert.match(finalizeMigration, /to service_role/);
  assert.match(bookingApi, /finalize_paid_sepay_booking/);
  assert.match(delivery, /finalize_paid_sepay_booking/);
  assert.match(delivery, /action: "booking\.email\.customer\.sent"/);
  assert.match(delivery, /action: "booking\.email\.owner\.sent"/);
  const cancelBody = bookingApi.match(
    /export async function cancelBooking[\s\S]*?export async function listUnavailableBookingSlots/,
  )?.[0];
  assert.ok(cancelBody);
  assert.doesNotMatch(cancelBody, /sendBookingEmails|finalize_paid_sepay_booking/);
});

test("success screen only claims email was sent after delivery evidence", () => {
  assert.match(paymentRuntime, /customerEmailSent/);
  assert.match(paymentRuntime, /already_sent/);
  assert.match(
    paymentRuntime,
    /Nếu chưa thấy email, vui lòng kiểm tra lại hộp thư/,
  );
});

test("admin confirmation uses a branded popup and explains email delivery", () => {
  assert.match(bookingTransitions, /role="alertdialog"/);
  assert.match(bookingTransitions, /aria-modal="true"/);
  assert.match(bookingTransitions, /Xác nhận lịch và gửi email/);
  assert.match(bookingTransitions, /cho khách và email báo có khách đặt/);
  assert.match(bookingTransitions, /Đã kiểm tra tiền/);
  assert.match(bookingTransitions, /formRef\.current\?\.requestSubmit\(\)/);
  assert.match(bookingTransitions, /Kiểm tra & gửi email còn thiếu/);
  assert.match(bookingTransitions, /không gửi trùng thư đã thành công/);
  assert.match(adminBookingsPage, /Email xác nhận chưa được cấu hình/);
  assert.match(adminBookingsPage, /gửi lại email còn thiếu/);
});
