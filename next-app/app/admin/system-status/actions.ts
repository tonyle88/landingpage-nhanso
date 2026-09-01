"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

const GIB = 1024 ** 3;
const MIB = 1024 ** 2;

function parseQuota(
  value: FormDataEntryValue | null,
  multiplier: number,
  maximum: number,
) {
  const parsed = Number(String(value || "").replace(",", "."));
  if (!Number.isFinite(parsed) || parsed <= 0 || parsed > maximum) {
    throw new Error("invalid quota");
  }
  return Math.round(parsed * multiplier);
}

export async function saveCapacityLimitsAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || principal.role !== "owner") {
    redirect("/admin/login?reason=unauthorized");
  }

  let databaseLimitBytes: number;
  let storageLimitBytes: number;
  let supabasePlan: string;
  try {
    databaseLimitBytes = parseQuota(form.get("database_limit_mib"), MIB, 100000000);
    storageLimitBytes = parseQuota(form.get("storage_limit_gib"), GIB, 100000);
    supabasePlan = String(form.get("supabase_plan") || "custom")
      .trim()
      .toLowerCase();
    if (!/^[a-z0-9_-]{2,40}$/.test(supabasePlan)) throw new Error("invalid plan");
  } catch {
    redirect("/admin/system-status?status=invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: "system.capacity_limits",
    p_payload: {
      value: {
        supabase_plan: supabasePlan,
        database_limit_bytes: databaseLimitBytes,
        storage_limit_bytes: storageLimitBytes,
      },
      description:
        "Mốc dung lượng dùng để cảnh báo trong trang Trạng thái hệ thống.",
      is_public: false,
    },
  });

  if (error) {
    console.error("save system capacity limits failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/system-status?status=error");
  }

  revalidatePath("/admin/system-status");
  redirect("/admin/system-status?status=saved");
}
