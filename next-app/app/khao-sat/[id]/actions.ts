"use server";

import { redirect } from "next/navigation";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { parseSurveyAnswers, parseSurveyQuestions } from "@/lib/survey";
import { createServiceServerClient } from "@/lib/supabase/server";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function submitSurveyAction(form: FormData) {
  const id = String(form.get("survey_id") || "");
  if (!UUID.test(id)) redirect("/");
  const surveyPath = `/khao-sat/${id}`;
  if (String(form.get("website") || "")) redirect(`${surveyPath}/cam-on`);

  const respondentName = String(form.get("respondent_name") || "").trim();
  const rating = Number(form.get("rating"));
  if (!respondentName || respondentName.length > 120 || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    redirect(`${surveyPath}?status=invalid`);
  }

  const supabase = createServiceServerClient();
  if (!supabase) redirect(`${surveyPath}?status=error`);
  const { data: survey, error: surveyError } = await supabase
    .from("service_surveys")
    .select("questions,active")
    .eq("id", id)
    .maybeSingle();
  if (surveyError || !survey?.active) redirect(`${surveyPath}?status=closed`);

  const questions = parseSurveyQuestions(survey.questions);
  const answers = questions && parseSurveyAnswers(form, questions);
  if (!answers) redirect(`${surveyPath}?status=invalid`);

  const requestHeaders = await headers();
  const clientIp = requestHeaders.get("x-vercel-forwarded-for")?.split(",")[0]?.trim()
    || requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim()
    || "unknown";
  const ipHash = createHash("sha256").update(clientIp).digest("hex");
  const { data: allowed, error: rateLimitError } = await supabase.rpc(
    "consume_service_survey_rate_limit",
    { p_survey_id: id, p_ip_hash: ipHash },
  );
  if (rateLimitError) {
    console.error("service survey rate limit failed", { code: rateLimitError.code });
    redirect(`${surveyPath}?status=error`);
  }
  if (!allowed) redirect(`${surveyPath}?status=limited`);

  const { error } = await supabase.from("service_survey_responses").insert({
    survey_id: id,
    respondent_name: respondentName,
    rating,
    answers,
  });
  if (error) {
    console.error("service survey submission failed", { code: error.code, message: error.message });
    redirect(`${surveyPath}?status=error`);
  }
  redirect(`${surveyPath}/cam-on`);
}
