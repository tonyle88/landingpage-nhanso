"use server";

import { revalidatePath, updateTag } from "next/cache";
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

type SectionQuickAction = "move_up" | "move_down" | "toggle";

export async function quickUpdateLandingSectionAction(form: FormData) {
  await requireContentManager();
  const id = optionalUuid(form.get("id"));
  const intent = String(form.get("intent") || "") as SectionQuickAction;
  const allowed: SectionQuickAction[] = ["move_up", "move_down", "toggle"];
  if (!id || !allowed.includes(intent)) redirect("/admin/sections?status=invalid");

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("landing_sections")
    .select("id,enabled,sort_order,section_key")
    .order("sort_order")
    .order("section_key");
  if (error || !data) redirect("/admin/sections?status=error");

  const index = data.findIndex((row) => row.id === id);
  if (index < 0) redirect("/admin/sections?status=invalid");
  const current = data[index];

  const saveLayoutOnly = async (
    rowId: string,
    patch: Partial<{ enabled: boolean; sort_order: number }>,
  ) => {
    const { data: updatedRows, error: layoutError } = await supabase
      .from("landing_sections")
      .update(patch)
      .eq("id", rowId)
      .select("id");
    if (layoutError || updatedRows?.length !== 1) {
      console.error("landing section layout update failed", {
        id: rowId,
        updateCode: layoutError?.code,
        updateMessage: layoutError?.message,
        updatedRows: updatedRows?.length || 0,
      });
    }
    return layoutError || (updatedRows?.length === 1 ? null : new Error("section not updated"));
  };

  if (intent === "toggle") {
    const saveError = await saveLayoutOnly(current.id, { enabled: !current.enabled });
    if (saveError) redirect("/admin/sections?status=error");
  } else {
    const targetIndex = intent === "move_up" ? index - 1 : index + 1;
    const target = data[targetIndex];
    if (!target) redirect(`/admin/sections?status=unchanged#section-${id}`);

    if (current.sort_order !== target.sort_order) {
      const [currentError, targetError] = await Promise.all([
        saveLayoutOnly(current.id, { sort_order: target.sort_order }),
        saveLayoutOnly(target.id, { sort_order: current.sort_order }),
      ]);
      if (currentError || targetError) redirect("/admin/sections?status=error");
    } else {
      const reordered = [...data];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      const results = await Promise.all(
        reordered.map((row, orderIndex) => {
          const normalizedOrder = (orderIndex + 1) * 10;
          return row.sort_order === normalizedOrder
            ? Promise.resolve(null)
            : saveLayoutOnly(row.id, { sort_order: normalizedOrder });
        }),
      );
      if (results.some(Boolean)) redirect("/admin/sections?status=error");
    }
  }

  revalidatePath("/admin/sections");
  revalidatePath("/");
  updateTag("public-landing-content");
  redirect(`/admin/sections?status=${intent}#section-${id}`);
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
  updateTag("public-landing-content");
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
  updateTag("public-landing-content");
  redirect("/admin/sections?content_status=saved#homepage-content");
}
