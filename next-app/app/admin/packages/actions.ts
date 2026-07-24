"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  optionalUuid,
  packagePayloadFromForm,
} from "@/lib/admin/package-input";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

async function requireContentManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }
  return principal;
}

export async function savePackageAction(form: FormData) {
  await requireContentManager();
  let id: string | null;
  let payload;
  try {
    id = optionalUuid(form.get("id"));
    payload = packagePayloadFromForm(form);
  } catch {
    redirect("/admin/packages?status=invalid");
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_package", {
    p_id: id,
    p_payload: payload,
  });
  if (error) redirect("/admin/packages?status=error");
  revalidatePath("/admin/packages");
  revalidatePath("/");
  redirect("/admin/packages?status=saved");
}

export async function deletePackageAction(form: FormData) {
  await requireContentManager();
  let id: string;
  try {
    id = optionalUuid(form.get("id")) || "";
    if (!id) throw new Error("missing id");
  } catch {
    redirect("/admin/packages?status=invalid");
  }
  const confirmation = String(form.get("confirmation") || "").trim();
  const expectedCode = String(form.get("expected_code") || "").trim();
  if (!expectedCode || confirmation !== expectedCode) {
    redirect("/admin/packages?status=confirm");
  }

  const supabase = await createAuthServerClient();
  const { data: current, error: readError } = await supabase
    .from("packages")
    .select("code")
    .eq("id", id)
    .maybeSingle();
  if (readError || !current || current.code !== expectedCode) {
    redirect("/admin/packages?status=error");
  }
  const { error } = await supabase.rpc("admin_delete_package", { p_id: id });
  if (error) redirect("/admin/packages?status=error");
  revalidatePath("/admin/packages");
  revalidatePath("/");
  redirect("/admin/packages?status=deleted");
}
