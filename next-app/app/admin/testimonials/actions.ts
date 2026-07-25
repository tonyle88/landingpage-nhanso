"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { optionalUuid } from "@/lib/admin/package-input";
import { testimonialPayloadFromForm } from "@/lib/admin/testimonial-input";
import {
  removeUploadedMedia,
  removeStoredMediaById,
  uploadContentImage,
  type UploadedMedia,
} from "@/lib/admin/media-upload";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

async function requireContentManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) {
    redirect("/admin/login?reason=unauthorized");
  }
  return principal;
}

export async function saveTestimonialAction(form: FormData) {
  const principal = await requireContentManager();
  let id;
  let payload;
  let upload: UploadedMedia | null = null;
  let previousMediaAssetId: string | null = null;
  try {
    id = optionalUuid(form.get("id"));
    if (id) {
      const authClient = await createAuthServerClient();
      const { data: previous } = await authClient
        .from("testimonials")
        .select("media_asset_id")
        .eq("id", id)
        .maybeSingle();
      previousMediaAssetId = previous?.media_asset_id || null;
    }
    const file = form.get("image_file");
    if (file instanceof File && file.size > 0) {
      upload = await uploadContentImage({
        file,
        folder: "testimonials",
        altText: String(form.get("alt_text") || ""),
        uploadedBy: principal.userId,
      });
      if (upload) {
        form.set("image_url", upload.publicUrl);
        form.set("media_asset_id", upload.id);
      }
    }
    payload = testimonialPayloadFromForm(form);
  } catch {
    await removeUploadedMedia(upload);
    redirect("/admin/testimonials?status=invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_testimonial", {
    p_id: id,
    p_payload: payload,
  });
  if (error) {
    await removeUploadedMedia(upload);
    console.error("admin_save_testimonial failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/testimonials?status=error");
  }
  if (upload && previousMediaAssetId && previousMediaAssetId !== upload.id) {
    await removeStoredMediaById(previousMediaAssetId);
  }
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
  const { data: item } = await supabase
    .from("testimonials")
    .select("media_asset_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.rpc("admin_delete_testimonial", { p_id: id });
  if (error) {
    console.error("admin_delete_testimonial failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/testimonials?status=error");
  }
  await removeStoredMediaById(item?.media_asset_id);
  revalidatePath("/admin/testimonials");
  revalidatePath("/");
  redirect("/admin/testimonials?status=deleted");
}
