import "server-only";

import { QUIZ_QUESTIONS } from "@/lib/package-quiz";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import { getPublicSiteSetting } from "./public-site-setting";

export async function getPublicQuizQuestions() {
  const value = await getPublicSiteSetting(QUIZ_SETTING_KEY);
  return parseQuizQuestions(value) || QUIZ_QUESTIONS;
}
