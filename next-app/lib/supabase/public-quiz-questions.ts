import "server-only";

import { QUIZ_QUESTIONS } from "@/lib/package-quiz";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import { createPublicServerClient } from "./server";

export async function getPublicQuizQuestions() {
  const client = createPublicServerClient();
  if (!client) return QUIZ_QUESTIONS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("value")
      .eq("key", QUIZ_SETTING_KEY)
      .eq("is_public", true)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (error || !data) return QUIZ_QUESTIONS;
    return parseQuizQuestions(data.value) || QUIZ_QUESTIONS;
  } catch {
    return QUIZ_QUESTIONS;
  } finally {
    clearTimeout(timeout);
  }
}
