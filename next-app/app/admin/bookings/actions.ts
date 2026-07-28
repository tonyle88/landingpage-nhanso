"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  deleteBookingCalendarEvent,
  syncBookingCalendarEvent,
} from "@/lib/booking-calendar";
import {
  sendBookingChangeEmailsForBookingId,
  sendBookingEmailsForBookingId,
} from "@/lib/booking-email";
import type { Database } from "@/lib/supabase/database.types";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { createServiceServerClient } from "@/lib/supabase/server";

type BookingStatus = Database["public"]["Enums"]["booking_status"];
const BOOKING_STATUSES = new Set<BookingStatus>([
  "pending",
  "held",
  "paid",
  "confirmed",
  "cancelled",
  "expired",
]);
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function deliverySucceeded(
  delivery: Awaited<ReturnType<typeof sendBookingEmailsForBookingId>>,
) {
  return (
    ["sent", "already_sent"].includes(delivery.customer) &&
    ["sent", "already_sent"].includes(delivery.owner)
  );
}

export async function transitionBookingAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_operations")) {
    redirect("/admin/login?reason=unauthorized");
  }

  const id = String(form.get("id") || "").trim();
  const expectedStatus = String(
    form.get("expected_status") || "",
  ) as BookingStatus;
  const nextStatus = String(form.get("next_status") || "") as BookingStatus;
  if (
    !UUID_PATTERN.test(id) ||
    !BOOKING_STATUSES.has(expectedStatus) ||
    !BOOKING_STATUSES.has(nextStatus) ||
    expectedStatus === nextStatus ||
    (expectedStatus === "confirmed" && nextStatus === "cancelled")
  ) {
    redirect("/admin/bookings?status=invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_transition_booking", {
    p_id: id,
    p_expected_status: expectedStatus,
    p_next_status: nextStatus,
  });
  if (error?.code === "40001") {
    redirect("/admin/bookings?status=stale");
  }
  if (error) redirect("/admin/bookings?status=error");
  if (nextStatus === "confirmed") {
    const serviceClient = createServiceServerClient();
    if (!serviceClient) {
      redirect("/admin/bookings?status=email_warning");
    }
    let delivered = false;
    try {
      const delivery = await sendBookingEmailsForBookingId(serviceClient, id);
      delivered = deliverySucceeded(delivery);
    } catch {}
    if (!delivered) {
      redirect("/admin/bookings?status=email_warning");
    }
  }
  revalidatePath("/admin/bookings");
  revalidatePath("/");
  redirect("/admin/bookings?status=updated");
}

function isCompleteDelivery(
  delivery: Awaited<ReturnType<typeof sendBookingChangeEmailsForBookingId>>,
) {
  return (
    ["sent", "already_sent"].includes(delivery.customer) &&
    ["sent", "already_sent"].includes(delivery.owner)
  );
}

function parseVietnamSlot(date: string, time: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:00$/.test(time)) {
    return null;
  }
  const start = new Date(`${date}T${time}:00+07:00`);
  if (Number.isNaN(start.getTime())) return null;
  const vnWeekday = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "short",
  }).format(start);
  const allowedTimes =
    vnWeekday === "Sat" || vnWeekday === "Sun"
      ? new Set(["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"])
      : new Set(["19:00"]);
  if (!allowedTimes.has(time)) return null;
  return {
    start: start.toISOString(),
    end: new Date(start.getTime() + 2 * 60 * 60 * 1000).toISOString(),
  };
}

export async function rescheduleConfirmedBookingAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_operations")) {
    redirect("/admin/login?reason=unauthorized");
  }
  const id = String(form.get("id") || "").trim();
  const expectedSlotStart = String(
    form.get("expected_slot_start") || "",
  ).trim();
  const slot = parseVietnamSlot(
    String(form.get("new_date") || "").trim(),
    String(form.get("new_time") || "").trim(),
  );
  if (
    !UUID_PATTERN.test(id) ||
    Number.isNaN(Date.parse(expectedSlotStart)) ||
    !slot
  ) {
    redirect("/admin/bookings?status=calendar_invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc(
    "admin_reschedule_confirmed_booking",
    {
      p_id: id,
      p_expected_slot_start: expectedSlotStart,
      p_slot_start: slot.start,
      p_slot_end: slot.end,
    },
  );
  if (error?.code === "40001") {
    redirect("/admin/bookings?status=stale");
  }
  if (error?.code === "23P01" || error?.code === "23505") {
    redirect("/admin/bookings?status=slot_unavailable");
  }
  if (error?.code === "22023") {
    redirect("/admin/bookings?status=inside_72_hours");
  }
  if (error) redirect("/admin/bookings?status=error");

  const serviceClient = createServiceServerClient();
  if (!serviceClient) redirect("/admin/bookings?status=calendar_warning");
  const calendar = await syncBookingCalendarEvent(serviceClient, id);
  let emailsOk = false;
  try {
    emailsOk = isCompleteDelivery(
      await sendBookingChangeEmailsForBookingId(
        serviceClient,
        id,
        "rescheduled",
      ),
    );
  } catch {}
  revalidatePath("/admin/bookings");
  revalidatePath("/");
  if (calendar.status !== "synced") {
    redirect("/admin/bookings?status=calendar_warning");
  }
  if (!emailsOk) redirect("/admin/bookings?status=change_email_warning");
  redirect("/admin/bookings?status=rescheduled");
}

export async function cancelConfirmedBookingAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_operations")) {
    redirect("/admin/login?reason=unauthorized");
  }
  const id = String(form.get("id") || "").trim();
  const expectedSlotStart = String(
    form.get("expected_slot_start") || "",
  ).trim();
  if (!UUID_PATTERN.test(id) || Number.isNaN(Date.parse(expectedSlotStart))) {
    redirect("/admin/bookings?status=calendar_invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_cancel_confirmed_booking", {
    p_id: id,
    p_expected_slot_start: expectedSlotStart,
  });
  if (error?.code === "40001") {
    redirect("/admin/bookings?status=stale");
  }
  if (error?.code === "22023") {
    redirect("/admin/bookings?status=inside_72_hours");
  }
  if (error) redirect("/admin/bookings?status=error");

  const serviceClient = createServiceServerClient();
  if (!serviceClient) redirect("/admin/bookings?status=calendar_warning");
  const calendar = await deleteBookingCalendarEvent(serviceClient, id);
  let emailsOk = false;
  try {
    emailsOk = isCompleteDelivery(
      await sendBookingChangeEmailsForBookingId(
        serviceClient,
        id,
        "cancelled",
      ),
    );
  } catch {}
  revalidatePath("/admin/bookings");
  revalidatePath("/");
  if (!["deleted", "already_absent"].includes(calendar.status)) {
    redirect("/admin/bookings?status=calendar_warning");
  }
  if (!emailsOk) redirect("/admin/bookings?status=change_email_warning");
  redirect("/admin/bookings?status=cancelled");
}

export async function recoverBookingCalendarAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_operations")) {
    redirect("/admin/login?reason=unauthorized");
  }
  const id = String(form.get("id") || "").trim();
  if (!UUID_PATTERN.test(id)) {
    redirect("/admin/bookings?status=calendar_invalid");
  }
  const serviceClient = createServiceServerClient();
  if (!serviceClient) redirect("/admin/bookings?status=calendar_warning");
  const result = await syncBookingCalendarEvent(serviceClient, id);
  revalidatePath("/admin/bookings");
  redirect(
    result.status === "synced"
      ? "/admin/bookings?status=calendar_synced"
      : "/admin/bookings?status=calendar_warning",
  );
}

export async function recoverBookingEmailsAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_operations")) {
    redirect("/admin/login?reason=unauthorized");
  }

  const id = String(form.get("id") || "").trim();
  if (!UUID_PATTERN.test(id)) {
    redirect("/admin/bookings?status=invalid");
  }
  const serviceClient = createServiceServerClient();
  if (!serviceClient) {
    redirect("/admin/bookings?status=email_warning");
  }
  let delivered = false;
  try {
    const delivery = await sendBookingEmailsForBookingId(serviceClient, id);
    delivered = deliverySucceeded(delivery);
  } catch {}
  if (!delivered) {
    redirect("/admin/bookings?status=email_warning");
  }
  revalidatePath("/admin/bookings");
  redirect("/admin/bookings?status=email_resent");
}
