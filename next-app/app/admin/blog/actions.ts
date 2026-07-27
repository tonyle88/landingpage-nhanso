"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { blogPostPayloadFromForm } from "@/lib/admin/blog-post-input";
import { blogCategoryPayloadFromForm } from "@/lib/admin/blog-category-input";
import { optionalUuid } from "@/lib/admin/package-input";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
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

export async function saveBlogPostAction(form: FormData) {
  const principal = await requireContentManager();
  let id;
  let payload;
  let upload: UploadedMedia | null = null;
  let previousMediaAssetId: string | null = null;
  let previousSlug: string | null = null;
  try {
    id = optionalUuid(form.get("id"));
    if (id) {
      const authClient = await createAuthServerClient();
      const { data: previous } = await authClient
        .from("blog_posts")
        .select("cover_asset_id,slug")
        .eq("id", id)
        .maybeSingle();
      previousMediaAssetId = previous?.cover_asset_id || null;
      previousSlug = previous?.slug || null;
    }
    const file = form.get("cover_file");
    if (file instanceof File && file.size > 0) {
      upload = await uploadContentImage({
        file,
        folder: "blog",
        altText: String(form.get("title") || ""),
        uploadedBy: principal.userId,
      });
      if (upload) {
        form.set("cover_url", upload.publicUrl);
        form.set("cover_asset_id", upload.id);
      }
    }
    if (id && !String(form.get("slug") || "").trim() && previousSlug) {
      form.set("slug", previousSlug);
    }
    payload = blogPostPayloadFromForm(form);
  } catch {
    await removeUploadedMedia(upload);
    redirect("/admin/blog?status=invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_blog_post", {
    p_id: id,
    p_payload: payload,
  });
  if (error) {
    await removeUploadedMedia(upload);
    console.error("admin_save_blog_post failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/blog?status=error");
  }
  if (upload && previousMediaAssetId && previousMediaAssetId !== upload.id) {
    await removeStoredMediaById(previousMediaAssetId);
  }
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog?status=saved");
}

export async function deleteBlogPostAction(form: FormData) {
  await requireContentManager();
  let id;
  try {
    id = optionalUuid(form.get("id"));
    if (!id) throw new Error("missing id");
  } catch {
    redirect("/admin/blog?status=invalid");
  }
  if (String(form.get("confirmation") || "").trim() !== "XOA") {
    redirect("/admin/blog?status=confirm");
  }
  const supabase = await createAuthServerClient();
  const { data: item } = await supabase
    .from("blog_posts")
    .select("cover_asset_id")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.rpc("admin_delete_blog_post", { p_id: id });
  if (error) {
    console.error("admin_delete_blog_post failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/blog?status=error");
  }
  await removeStoredMediaById(item?.cover_asset_id);
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog?status=deleted");
}

export async function saveBlogCategoryAction(form: FormData) {
  await requireContentManager();
  let id;
  let payload;
  try {
    id = optionalUuid(form.get("id"));
    payload = blogCategoryPayloadFromForm(form);
  } catch {
    redirect("/admin/blog?view=categories&category_status=invalid");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_blog_category", {
    p_id: id,
    p_payload: payload,
  });
  if (error) {
    console.error("admin_save_blog_category failed", {
      code: error.code,
      message: error.message,
    });
    redirect("/admin/blog?view=categories&category_status=error");
  }
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog?view=categories&category_status=saved");
}

export async function deleteBlogCategoryAction(form: FormData) {
  await requireContentManager();
  let id;
  try {
    id = optionalUuid(form.get("id"));
    if (!id) throw new Error("missing id");
  } catch {
    redirect("/admin/blog?view=categories&category_status=invalid");
  }
  if (String(form.get("confirmation") || "").trim() !== "XOA") {
    redirect("/admin/blog?view=categories&category_status=confirm");
  }
  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_delete_blog_category", { p_id: id });
  if (error) {
    console.error("admin_delete_blog_category failed", {
      code: error.code,
      message: error.message,
    });
    redirect(
      error.code === "23503"
        ? "/admin/blog?view=categories&category_status=in_use"
        : "/admin/blog?view=categories&category_status=error",
    );
  }
  revalidatePath("/admin/blog");
  revalidatePath("/blog");
  redirect("/admin/blog?view=categories&category_status=deleted");
}
