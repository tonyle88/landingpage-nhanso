"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { settingPayloadFromForm } from "@/lib/admin/site-setting-input";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

async function requireContentManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }
}

export async function saveSettingAction(form: FormData) {
  await requireContentManager();
  let parsed;
  try {
    parsed = settingPayloadFromForm(form);
  } catch {
    redirect("/admin/settings?status=invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: parsed.key,
    p_payload: parsed.payload,
  });
  if (error) {
    console.error("admin_save_site_setting failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/settings?status=error");
  }
  revalidatePath("/admin/settings");
  revalidatePath("/");
  redirect("/admin/settings?status=saved");
}

export async function deleteSettingAction(form: FormData) {
  await requireContentManager();
  const key = String(form.get("key") || "").trim().toLowerCase();
  if (
    !/^[a-z0-9][a-z0-9._-]{1,119}$/.test(key) ||
    String(form.get("confirmation") || "").trim() !== "XOA"
  ) {
    redirect("/admin/settings?status=confirm");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_delete_site_setting", {
    p_key: key,
  });
  if (error) {
    console.error("admin_delete_site_setting failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/settings?status=error");
  }
  revalidatePath("/admin/settings");
  revalidatePath("/");
  redirect("/admin/settings?status=deleted");
}
