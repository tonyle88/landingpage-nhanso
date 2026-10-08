import "server-only";

import {
  parseQuizHubContent,
  QUIZ_HUB_CONTENT,
  QUIZ_HUB_SETTING_KEY,
} from "@/lib/quiz-hub-content";
import { getPublicSiteSetting } from "./public-site-setting";

export async function getPublicQuizHubContent() {
  const value = await getPublicSiteSetting(QUIZ_HUB_SETTING_KEY);
  return parseQuizHubContent(value) || QUIZ_HUB_CONTENT;
}
