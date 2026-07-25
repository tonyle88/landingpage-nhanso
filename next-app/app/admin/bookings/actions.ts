"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import type { Database } from "@/lib/supabase/database.types";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

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
    expectedStatus === nextStatus
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
  revalidatePath("/admin/bookings");
  revalidatePath("/");
  redirect("/admin/bookings?status=updated");
}

