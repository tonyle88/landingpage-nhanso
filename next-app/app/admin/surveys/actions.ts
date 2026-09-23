"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { DEFAULT_SURVEY_COPY, DEFAULT_SURVEY_INTRO, DEFAULT_SURVEY_QUESTIONS, DEFAULT_SURVEY_TITLE, SURVEY_COPY_FIELDS, parseSurveyCopy, parseSurveyQuestions } from "@/lib/survey";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function requireSurveyManager() {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "manage_content")) redirect("/admin/login?reason=unauthorized");
  return principal;
}

export async function createSurveyAction() {
  const principal = await requireSurveyManager();
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.from("service_surveys").insert({
    title: DEFAULT_SURVEY_TITLE,
    intro: DEFAULT_SURVEY_INTRO,
    questions: DEFAULT_SURVEY_QUESTIONS,
    display_copy: DEFAULT_SURVEY_COPY,
    created_by: principal.userId,
  }).select("id").single();
  if (error || !data) {
    console.error("create service survey failed", { code: error?.code, message: error?.message });
    redirect("/admin/surveys?status=error");
  }
  revalidatePath("/admin/surveys");
  redirect(`/admin/surveys?id=${data.id}&status=created`);
}

export async function saveSurveyContentAction(form: FormData) {
  await requireSurveyManager();
  const id = String(form.get("id") || "");
  const title = String(form.get("title") || "").trim();
  const intro = String(form.get("intro") || "").trim();
  const active = form.get("active") === "on";
  const displayCopy = parseSurveyCopy(Object.fromEntries(
    SURVEY_COPY_FIELDS.map(({ key }) => [key, form.get(`copy_${key}`)]),
  ));
  if (!UUID.test(id) || title.length < 5 || title.length > 160 || intro.length < 10 || intro.length > 1200 || !displayCopy) {
    redirect(`/admin/surveys?${UUID.test(id) ? `id=${id}&` : ""}status=invalid_content`);
  }

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.from("service_surveys")
    .update({ title, intro, display_copy: displayCopy, active })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("save service survey content failed", { code: error?.code, message: error?.message });
    redirect(`/admin/surveys?id=${id}&status=content_error`);
  }
  revalidatePath("/admin/surveys");
  revalidatePath(`/khao-sat/${id}`);
  revalidatePath(`/khao-sat/${id}/cam-on`);
  redirect(`/admin/surveys?id=${id}&status=content_saved`);
}

export async function saveSurveyQuestionsAction(form: FormData) {
  await requireSurveyManager();
  const id = String(form.get("id") || "");
  let questions = null;
  try {
    const raw = String(form.get("questions") || "");
    if (raw.length <= 10000) questions = parseSurveyQuestions(JSON.parse(raw));
  } catch { /* invalid questions are handled below */ }
  if (!UUID.test(id) || !questions) {
    redirect(`/admin/surveys?${UUID.test(id) ? `id=${id}&` : ""}status=invalid_questions`);
  }

  const supabase = await createAuthServerClient();
  const { data, error } = await supabase.from("service_surveys")
    .update({ questions })
    .eq("id", id)
    .select("id")
    .maybeSingle();
  if (error || !data) {
    console.error("save service survey questions failed", { code: error?.code, message: error?.message });
    redirect(`/admin/surveys?id=${id}&status=questions_error`);
  }
  revalidatePath("/admin/surveys");
  revalidatePath(`/khao-sat/${id}`);
  redirect(`/admin/surveys?id=${id}&status=questions_saved`);
}
