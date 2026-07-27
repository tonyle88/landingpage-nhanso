"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { landingContentPayloadFromForm } from "@/lib/admin/landing-content-item-input";
import { landingSectionPayloadFromForm } from "@/lib/admin/landing-section-input";
import { optionalUuid } from "@/lib/admin/package-input";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

async function requireContentManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }
}

export async function saveLandingSectionAction(form: FormData) {
  await requireContentManager();
  let id;
  let payload;
  try {
    id = optionalUuid(form.get("id"));
    if (!id) throw new Error("missing id");
    payload = landingSectionPayloadFromForm(form);
  } catch {
    redirect("/admin/sections?status=invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_landing_section", {
    p_id: id,
    p_payload: payload,
  });
  if (error) {
    console.error("admin_save_landing_section failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/sections?status=error");
  }

  revalidatePath("/admin/sections");
  revalidatePath("/");
  redirect("/admin/sections?status=saved");
}

export async function saveLandingContentItemAction(form: FormData) {
  await requireContentManager();
  let parsed;
  try {
    parsed = landingContentPayloadFromForm(form);
  } catch {
    redirect("/admin/sections?content_status=invalid#homepage-content");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: parsed.key,
    p_payload: parsed.payload,
  });
  if (error) {
    console.error("admin_save_site_setting landing content failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/sections?content_status=error#homepage-content");
  }
  revalidatePath("/admin/sections");
  revalidatePath("/");
  redirect("/admin/sections?content_status=saved#homepage-content");
}
