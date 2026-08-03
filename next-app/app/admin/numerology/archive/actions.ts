"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { NUMEROLOGY_EXPORT_BUCKET } from "@/lib/admin/numerology-records";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createServiceServerClient } from "@/lib/supabase/server";

function returnHref(form: FormData, status: string) {
  const query = String(form.get("query") || "").trim().slice(0, 80);
  const page = Math.max(1, Number.parseInt(String(form.get("page") || "1"), 10) || 1);
  const params = new URLSearchParams({ status });
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  return `/admin/numerology/archive?${params.toString()}`;
}

export async function deleteNumerologyRecordAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect(returnHref(form, "forbidden"));
  }

  const id = String(form.get("id") || "").trim();
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    redirect(returnHref(form, "invalid"));
  }

  const service = createServiceServerClient();
  if (!service) redirect(returnHref(form, "error"));

  const { data: deleted, error } = await service
    .from("numerology_records")
    .delete()
    .eq("id", id)
    .eq("created_by", principal.userId)
    .select("full_pdf_path,a4_image_path")
    .maybeSingle();
  if (error || !deleted) {
    console.error("numerology archive delete failed", error?.code);
    redirect(returnHref(form, error ? "error" : "missing"));
  }

  const { error: storageError } = await service.storage
    .from(NUMEROLOGY_EXPORT_BUCKET)
    .remove([deleted.full_pdf_path, deleted.a4_image_path]);
  if (storageError) {
    console.error("numerology archive file cleanup failed", storageError.message);
  }

  revalidatePath("/admin/numerology");
  revalidatePath("/admin/numerology/archive");
  redirect(returnHref(form, storageError ? "deleted_cleanup_pending" : "deleted"));
}
