"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { settingPayloadFromForm } from "@/lib/admin/site-setting-input";
import { requireAdminPermission, requireContentManager } from "@/lib/auth/admin-access";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export async function setSepayAutoConfirmationAction(form: FormData) {
  await requireAdminPermission("manage_operations");
  const enabled = String(form.get("enabled") || "") === "true";
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_set_sepay_auto_confirmation", {
    p_enabled: enabled,
  });
  if (error) {
    console.error("admin_set_sepay_auto_confirmation failed", {
      code: error.code,
      message: error.message,
    });
    const migrationMissing =
      error.code === "42883" ||
      error.code === "PGRST202" ||
      error.message.includes("admin_set_sepay_auto_confirmation");
    redirect(
      `/admin/settings?status=${migrationMissing ? "sepay_migration_required" : "sepay_error"}`,
    );
  }
  revalidatePath("/admin/settings");
  revalidatePath("/admin/bookings");
  revalidatePath("/admin/payments");
  redirect(`/admin/settings?status=${enabled ? "sepay_enabled" : "sepay_disabled"}`);
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
  updateTag("public-site-settings");
  updateTag("public-landing-content");
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
  updateTag("public-site-settings");
  updateTag("public-landing-content");
  redirect("/admin/settings?status=deleted");
}
