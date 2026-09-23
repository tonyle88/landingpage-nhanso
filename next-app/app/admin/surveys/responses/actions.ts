"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createServiceServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function deleteSurveyResponseAction(form: FormData) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content") || !can(principal.role, "manage_operations")) redirect("/admin");

  const surveyId = String(form.get("survey_id") || "");
  const responseId = String(form.get("response_id") || "");
  const page = Math.max(1, Math.min(10000, Number.parseInt(String(form.get("page") || "1"), 10) || 1));
  if (!UUID.test(surveyId) || !UUID.test(responseId)) redirect("/admin/surveys/responses?status=invalid_delete");
  const returnPath = `/admin/surveys/responses?id=${surveyId}&p=${page}`;

  const supabase = createServiceServerClient();
  if (!supabase) redirect(`${returnPath}&status=delete_error`);
  const { data, error } = await supabase.from("service_survey_responses")
    .delete()
    .eq("id", responseId)
    .eq("survey_id", surveyId)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("delete service survey response failed", { code: error?.code, message: error?.message });
    redirect(`${returnPath}&status=delete_error`);
  }
  revalidatePath("/admin/surveys/responses");
  redirect(`${returnPath}&status=deleted`);
}
