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

type SectionQuickAction = "move_up" | "move_down" | "toggle";

function sectionPayload(
  row: {
    display_name: string;
    title: string | null;
    eyebrow: string | null;
    content_html: string | null;
    enabled: boolean;
    sort_order: number;
  },
  patch: Partial<{ enabled: boolean; sort_order: number }> = {},
) {
  return {
    display_name: row.display_name,
    title: row.title || "",
    eyebrow: row.eyebrow || "",
    content_html: row.content_html || "",
    enabled: patch.enabled ?? row.enabled,
    sort_order: patch.sort_order ?? row.sort_order,
  };
}

export async function quickUpdateLandingSectionAction(form: FormData) {
  await requireContentManager();
  const id = optionalUuid(form.get("id"));
  const intent = String(form.get("intent") || "") as SectionQuickAction;
  const allowed: SectionQuickAction[] = ["move_up", "move_down", "toggle"];
  if (!id || !allowed.includes(intent)) redirect("/admin/sections?status=invalid");

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("landing_sections")
    .select("id,display_name,title,eyebrow,content_html,enabled,sort_order,section_key")
    .order("sort_order")
    .order("section_key");
  if (error || !data) redirect("/admin/sections?status=error");

  const index = data.findIndex((row) => row.id === id);
  if (index < 0) redirect("/admin/sections?status=invalid");
  const current = data[index];

  if (intent === "toggle") {
    const { error: saveError } = await supabase.rpc("admin_save_landing_section", {
      p_id: current.id,
      p_payload: sectionPayload(current, { enabled: !current.enabled }),
    });
    if (saveError) redirect("/admin/sections?status=error");
  } else {
    const targetIndex = intent === "move_up" ? index - 1 : index + 1;
    const target = data[targetIndex];
    if (!target) redirect(`/admin/sections?status=unchanged#section-${id}`);

    if (current.sort_order === target.sort_order) {
      const reordered = [...data];
      [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
      for (let orderIndex = 0; orderIndex < reordered.length; orderIndex += 1) {
        const row = reordered[orderIndex];
        const normalizedOrder = (orderIndex + 1) * 10;
        const { error: saveError } = await supabase.rpc("admin_save_landing_section", {
          p_id: row.id,
          p_payload: sectionPayload(row, { sort_order: normalizedOrder }),
        });
        if (saveError) redirect("/admin/sections?status=error");
      }
    } else {
      const currentOrder = current.sort_order;
      const { error: currentError } = await supabase.rpc("admin_save_landing_section", {
        p_id: current.id,
        p_payload: sectionPayload(current, { sort_order: target.sort_order }),
      });
      if (currentError) redirect("/admin/sections?status=error");
      const { error: targetError } = await supabase.rpc("admin_save_landing_section", {
        p_id: target.id,
        p_payload: sectionPayload(target, { sort_order: currentOrder }),
      });
      if (targetError) redirect("/admin/sections?status=error");
    }
  }

  revalidatePath("/admin/sections");
  revalidatePath("/");
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
