import "server-only";

import { createHash } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import { syncBookingCalendarEvent } from "@/lib/booking-calendar";
import {
  buildCustomerBookingCancelledEmail,
  buildCustomerBookingEmail,
  buildCustomerBookingRescheduledEmail,
  buildOwnerBookingCancelledEmail,
  buildOwnerBookingEmail,
  buildOwnerBookingRescheduledEmail,
  type BookingEmail,
  type BookingEmailDetails,
} from "@/lib/booking-email-templates";
import type { Database, Json } from "@/lib/supabase/database.types";

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const EMAIL_TIMEOUT_MS = 8_000;
const LEGACY_OWNER_EMAIL = "cuongck3@gmail.com";

type DeliveryState =
  | "sent"
  | "already_sent"
  | "failed"
  | "not_configured"
  | "not_applicable";

export type BookingEmailDelivery = {
  configured: boolean;
  customer: DeliveryState;
  owner: DeliveryState;
};

function getEmailConfiguration() {
  const apiKey = process.env.RESEND_API_KEY?.trim() || "";
  const from = process.env.BOOKING_EMAIL_FROM?.trim() || "";
  const owner =
    process.env.BOOKING_OWNER_EMAIL?.trim() || LEGACY_OWNER_EMAIL;
  return {
    apiKey,
    from,
    owner,
    configured: Boolean(apiKey && from && owner),
  };
}

export function isBookingEmailConfigured() {
  return getEmailConfiguration().configured;
}

async function wasDelivered(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  action: string,
) {
  const { data, error } = await supabase
    .from("audit_logs")
    .select("id")
    .eq("action", action)
    .eq("target_type", "booking")
    .eq("target_id", bookingId)
    .eq("status", "success")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error("Unable to read email delivery audit.");
  return Boolean(data);
}

async function recordDelivery(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  action: string,
  providerMessageId: string,
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    target_type: "booking",
    target_id: bookingId,
    status: "success",
    message: "Booking email accepted by provider.",
    after_data: {
      provider: "resend",
      provider_message_id: providerMessageId,
    } satisfies Json,
  });
  if (error) {
    console.error("Unable to record booking email delivery audit.");
  }
}

async function recordDeliveryFailure(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  action: string,
  message: string,
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    target_type: "booking",
    target_id: bookingId,
    status: "failure",
    message: message.slice(0, 500),
    after_data: { provider: "resend" } satisfies Json,
  });
  if (error) {
    console.error("Unable to record booking email delivery failure.");
  }
}

async function sendWithResend({
  apiKey,
  from,
  to,
  email,
  idempotencyKey,
}: {
  apiKey: string;
  from: string;
  to: string;
  email: BookingEmail;
  idempotencyKey: string;
}) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), EMAIL_TIMEOUT_MS);
  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: JSON.stringify({
        from,
        to: [to],
        subject: email.subject,
        html: email.html,
        text: email.text,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      const providerResponse = (await response
        .json()
        .catch(() => null)) as { message?: unknown } | null;
      const providerMessage =
        typeof providerResponse?.message === "string"
          ? providerResponse.message.replaceAll(/\s+/g, " ").slice(0, 300)
          : "";
      throw new Error(
        `Email provider returned HTTP ${response.status}${
          providerMessage ? `: ${providerMessage}` : ""
        }.`,
      );
    }
    const result = (await response.json()) as { id?: unknown };
    if (typeof result.id !== "string" || !result.id) {
      throw new Error("Email provider returned an invalid response.");
    }
    return result.id;
  } finally {
    clearTimeout(timeout);
  }
}

async function deliverOne({
  supabase,
  booking,
  action,
  recipient,
  email,
  idempotencyKey,
  configuration,
}: {
  supabase: SupabaseClient<Database>;
  booking: BookingEmailDetails & { id: string };
  action: string;
  recipient: string;
  email: BookingEmail;
  idempotencyKey: string;
  configuration: ReturnType<typeof getEmailConfiguration>;
}): Promise<DeliveryState> {
  if (await wasDelivered(supabase, booking.id, action)) {
    return "already_sent";
  }
  try {
    const providerMessageId = await sendWithResend({
      apiKey: configuration.apiKey,
      from: configuration.from,
      to: recipient,
      email,
      idempotencyKey,
    });
    await recordDelivery(
      supabase,
      booking.id,
      action,
      providerMessageId,
    );
    return "sent";
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown email error.";
    console.error(
      `Booking email delivery failed (${action}):`,
      message,
    );
    await recordDeliveryFailure(supabase, booking.id, action, message);
    return "failed";
  }
}

export async function sendBookingEmailsForBookingId(
  supabase: SupabaseClient<Database>,
  bookingId: string,
): Promise<BookingEmailDelivery> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,public_id,customer_name,email,phone,date_of_birth,concern,consultation_type,package_code,package_name,payment_order_id,amount,currency,slot_start,slot_end,status",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error) throw new Error("Unable to load paid booking for email.");
  if (!data || data.status !== "confirmed") {
    return {
      configured: true,
      customer: "not_applicable",
      owner: "not_applicable",
    };
  }

  await syncBookingCalendarEvent(supabase, data.id);

  const configuration = getEmailConfiguration();
  if (!configuration.configured) {
    const message =
      "Booking email is not configured. RESEND_API_KEY, BOOKING_EMAIL_FROM and BOOKING_OWNER_EMAIL are required.";
    console.error(message);
    await Promise.all([
      recordDeliveryFailure(
        supabase,
        data.id,
        "booking.email.customer.sent",
        message,
      ),
      recordDeliveryFailure(
        supabase,
        data.id,
        "booking.email.owner.sent",
        message,
      ),
    ]);
    return {
      configured: false,
      customer: "not_configured",
      owner: "not_configured",
    };
  }

  const booking = data as BookingEmailDetails & { id: string };
  const [customer, owner] = await Promise.all([
    deliverOne({
      supabase,
      booking,
      action: "booking.email.customer.sent",
      recipient: booking.email,
      email: buildCustomerBookingEmail(booking),
      idempotencyKey: `booking-confirmed/customer/${booking.id}`,
      configuration,
    }),
    deliverOne({
      supabase,
      booking,
      action: "booking.email.owner.sent",
      recipient: configuration.owner,
      email: buildOwnerBookingEmail(booking),
      idempotencyKey: `booking-confirmed/owner/${booking.id}`,
      configuration,
    }),
  ]);
  return { configured: true, customer, owner };
}

export async function finalizeAndEmailSepayBooking(
  supabase: SupabaseClient<Database>,
  providerTransactionId: string,
) {
  const { data: transaction, error: transactionError } = await supabase
    .from("payment_transactions")
    .select("booking_id,status")
    .eq("provider", "sepay")
    .eq("provider_transaction_id", providerTransactionId)
    .maybeSingle();
  if (transactionError) {
    throw new Error("Unable to resolve the paid SePay booking.");
  }
  if (!transaction?.booking_id || transaction.status !== "paid") {
    return {
      configured: true,
      customer: "not_applicable",
      owner: "not_applicable",
    } satisfies BookingEmailDelivery;
  }

  const { error: finalizeError } = await supabase.rpc(
    "finalize_paid_sepay_booking",
    { p_id: transaction.booking_id },
  );
  if (finalizeError) {
    throw new Error("Unable to finalize the paid SePay booking.");
  }
  return sendBookingEmailsForBookingId(
    supabase,
    transaction.booking_id,
  );
}

export async function sendBookingChangeEmailsForBookingId(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  change: "rescheduled" | "cancelled",
): Promise<BookingEmailDelivery> {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,public_id,customer_name,email,phone,date_of_birth,concern,consultation_type,package_code,package_name,payment_order_id,amount,currency,slot_start,slot_end,status",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) throw new Error("Unable to load changed booking for email.");
  if (
    (change === "rescheduled" && data.status !== "confirmed") ||
    (change === "cancelled" && data.status !== "cancelled")
  ) {
    return {
      configured: true,
      customer: "not_applicable",
      owner: "not_applicable",
    };
  }
  const configuration = getEmailConfiguration();
  if (!configuration.configured) {
    return {
      configured: false,
      customer: "not_configured",
      owner: "not_configured",
    };
  }
  const booking = data as BookingEmailDetails & { id: string };
  const version = createHash("sha256")
    .update(`${change}|${booking.slot_start}|${booking.slot_end}`, "utf8")
    .digest("hex")
    .slice(0, 16);
  const customerAction = `booking.email.${change}.customer.${version}`;
  const ownerAction = `booking.email.${change}.owner.${version}`;
  const customerEmail =
    change === "rescheduled"
      ? buildCustomerBookingRescheduledEmail(booking)
      : buildCustomerBookingCancelledEmail(booking);
  const ownerEmail =
    change === "rescheduled"
      ? buildOwnerBookingRescheduledEmail(booking)
      : buildOwnerBookingCancelledEmail(booking);
  const [customer, owner] = await Promise.all([
    deliverOne({
      supabase,
      booking,
      action: customerAction,
      recipient: booking.email,
      email: customerEmail,
      idempotencyKey: `${change}/customer/${booking.id}/${version}`,
      configuration,
    }),
    deliverOne({
      supabase,
      booking,
      action: ownerAction,
      recipient: configuration.owner,
      email: ownerEmail,
      idempotencyKey: `${change}/owner/${booking.id}/${version}`,
      configuration,
    }),
  ]);
  return { configured: true, customer, owner };
}
