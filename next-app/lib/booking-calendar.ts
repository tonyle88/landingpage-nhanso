import "server-only";

import { createHmac, randomUUID } from "node:crypto";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/lib/supabase/database.types";

// Apps Script cold starts plus CalendarApp writes regularly exceed eight
// seconds. Keep this below SePay's 30-second webhook deadline while allowing
// enough time for the bridge to finish and return its event ID.
const CALENDAR_TIMEOUT_MS = 20_000;

type CalendarBooking = Pick<
  Database["public"]["Tables"]["bookings"]["Row"],
  | "id"
  | "public_id"
  | "calendar_event_id"
  | "customer_name"
  | "phone"
  | "email"
  | "package_name"
  | "consultation_type"
  | "amount"
  | "currency"
  | "payment_order_id"
  | "concern"
  | "slot_start"
  | "slot_end"
  | "status"
>;

export type BookingCalendarResult = {
  configured: boolean;
  status: "synced" | "deleted" | "already_absent" | "failed" | "not_applicable";
  eventId?: string;
};

function configuration() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL?.trim() || "";
  const secret = process.env.BOOKING_CALENDAR_SECRET?.trim() || "";
  return {
    url,
    secret,
    configured:
      /^https:\/\/script\.google\.com\/macros\/s\/[^/]+\/exec$/.test(url) &&
      secret.length >= 32,
  };
}

export function isBookingCalendarConfigured() {
  return configuration().configured;
}

async function loadBooking(
  supabase: SupabaseClient<Database>,
  bookingId: string,
) {
  const { data, error } = await supabase
    .from("bookings")
    .select(
      "id,public_id,calendar_event_id,customer_name,phone,email,package_name,consultation_type,amount,currency,payment_order_id,concern,slot_start,slot_end,status",
    )
    .eq("id", bookingId)
    .maybeSingle();
  if (error || !data) throw new Error("Unable to load booking for Calendar.");
  return data as CalendarBooking;
}

async function recordCalendarAudit(
  supabase: SupabaseClient<Database>,
  bookingId: string,
  action: string,
  status: "success" | "failure",
  message: string,
  details: Json = {},
) {
  const { error } = await supabase.from("audit_logs").insert({
    action,
    target_type: "booking",
    target_id: bookingId,
    status,
    message: message.slice(0, 500),
    after_data: details,
  });
  if (error) console.error("Unable to record Calendar audit.");
}

async function callCalendarBridge(
  action: "upsertBookingEvent" | "deleteBookingEvent",
  booking: CalendarBooking,
) {
  const config = configuration();
  if (!config.configured) {
    return { configured: false, response: null };
  }
  const payload = JSON.stringify({
    bookingId: booking.public_id,
    eventId: booking.calendar_event_id || "",
    customerName: booking.customer_name,
    phone: booking.phone,
    email: booking.email,
    packageName: booking.package_name,
    consultationType: booking.consultation_type,
    amount: booking.amount,
    currency: booking.currency,
    paymentOrderId: booking.payment_order_id || booking.public_id,
    concern: booking.concern || "",
    slotStart: booking.slot_start,
    slotEnd: booking.slot_end,
  });
  const timestamp = String(Math.floor(Date.now() / 1000));
  const nonce = randomUUID();
  const signature = createHmac("sha256", config.secret)
    .update(`${timestamp}.${nonce}.${action}.${payload}`, "utf8")
    .digest("hex");
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), CALENDAR_TIMEOUT_MS);
  try {
    const response = await fetch(config.url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        timestamp,
        nonce,
        action,
        payload,
        signature,
      }),
      cache: "no-store",
      signal: controller.signal,
    });
    if (!response.ok) {
      throw new Error(`Apps Script returned HTTP ${response.status}.`);
    }
    const result = (await response.json()) as {
      ok?: unknown;
      eventId?: unknown;
      deleted?: unknown;
      message?: unknown;
    };
    if (result.ok !== true) {
      throw new Error(
        typeof result.message === "string"
          ? result.message
          : "Apps Script rejected the Calendar request.",
      );
    }
    return { configured: true, response: result };
  } finally {
    clearTimeout(timeout);
  }
}

export async function syncBookingCalendarEvent(
  supabase: SupabaseClient<Database>,
  bookingId: string,
): Promise<BookingCalendarResult> {
  const booking = await loadBooking(supabase, bookingId);
  if (booking.status !== "confirmed") {
    return { configured: true, status: "not_applicable" };
  }
  try {
    const result = await callCalendarBridge("upsertBookingEvent", booking);
    if (!result.configured) {
      await recordCalendarAudit(
        supabase,
        booking.id,
        "booking.calendar.sync",
        "failure",
        "Google Apps Script Calendar is not configured.",
      );
      return { configured: false, status: "failed" };
    }
    const eventId =
      typeof result.response?.eventId === "string"
        ? result.response.eventId.trim()
        : "";
    if (!eventId) throw new Error("Apps Script returned no Calendar event ID.");
    if (eventId !== booking.calendar_event_id) {
      const { error } = await supabase
        .from("bookings")
        .update({ calendar_event_id: eventId })
        .eq("id", booking.id);
      if (error) throw new Error("Unable to save Calendar event ID.");
    }
    await recordCalendarAudit(
      supabase,
      booking.id,
      "booking.calendar.sync",
      "success",
      "Booking Calendar event synchronized.",
      { event_id: eventId },
    );
    return { configured: true, status: "synced", eventId };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Calendar error.";
    console.error("Booking Calendar sync failed:", message);
    await recordCalendarAudit(
      supabase,
      booking.id,
      "booking.calendar.sync",
      "failure",
      message,
    );
    return { configured: true, status: "failed" };
  }
}

export async function deleteBookingCalendarEvent(
  supabase: SupabaseClient<Database>,
  bookingId: string,
): Promise<BookingCalendarResult> {
  const booking = await loadBooking(supabase, bookingId);
  try {
    const result = await callCalendarBridge("deleteBookingEvent", booking);
    if (!result.configured) {
      await recordCalendarAudit(
        supabase,
        booking.id,
        "booking.calendar.delete",
        "failure",
        "Google Apps Script Calendar is not configured.",
      );
      return { configured: false, status: "failed" };
    }
    const deleted = result.response?.deleted === true;
    const { error } = await supabase
      .from("bookings")
      .update({ calendar_event_id: null })
      .eq("id", booking.id);
    if (error) throw new Error("Unable to clear Calendar event ID.");
    await recordCalendarAudit(
      supabase,
      booking.id,
      "booking.calendar.delete",
      "success",
      deleted
        ? "Booking Calendar event deleted."
        : "Booking Calendar event was already absent.",
    );
    return {
      configured: true,
      status: deleted ? "deleted" : "already_absent",
    };
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown Calendar error.";
    console.error("Booking Calendar deletion failed:", message);
    await recordCalendarAudit(
      supabase,
      booking.id,
      "booking.calendar.delete",
      "failure",
      message,
    );
    return { configured: true, status: "failed" };
  }
}
