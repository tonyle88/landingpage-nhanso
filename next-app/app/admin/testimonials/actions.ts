"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { optionalUuid } from "@/lib/admin/package-input";
import { testimonialPayloadFromForm } from "@/lib/admin/testimonial-input";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

async function requireContentManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }
}

export async function saveTestimonialAction(form: FormData) {
  await requireContentManager();
  let id;
  let payload;
  try {
    id = optionalUuid(form.get("id"));
    payload = testimonialPayloadFromForm(form);
  } catch {
    redirect("/admin/testimonials?status=invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_testimonial", {
    p_id: id,
    p_payload: payload,
  });
  if (error) redirect("/admin/testimonials?status=error");
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials?status=saved");
}

export async function deleteTestimonialAction(form: FormData) {
  await requireContentManager();
  let id;
  try {
    id = optionalUuid(form.get("id"));
    if (!id) throw new Error("missing id");
  } catch {
    redirect("/admin/testimonials?status=invalid");
  }
  if (String(form.get("confirmation") || "").trim() !== "XOA") {
    redirect("/admin/testimonials?status=confirm");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_delete_testimonial", { p_id: id });
  if (error) redirect("/admin/testimonials?status=error");
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials?status=deleted");
}
