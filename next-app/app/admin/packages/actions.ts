"use server";

import { revalidatePath, updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { requireContentManager } from "@/lib/auth/admin-access";
import { optionalUuid } from "@/lib/admin/form-input";
import { packagePayloadFromForm } from "@/lib/admin/package-input";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

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
  updateTag("public-packages");
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/quiz");
  revalidatePath("/quiz/chon-goi");
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
  updateTag("public-packages");
  revalidatePath("/admin/packages");
  revalidatePath("/");
  revalidatePath("/quiz");
  revalidatePath("/quiz/chon-goi");
  redirect("/admin/packages?status=deleted");
}
