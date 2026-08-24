import "server-only";

import {
  parseQuizHubContent,
  QUIZ_HUB_CONTENT,
  QUIZ_HUB_SETTING_KEY,
} from "@/lib/quiz-hub-content";
import { createPublicServerClient } from "./server";

export async function getPublicQuizHubContent() {
  const client = createPublicServerClient();
  if (!client) return QUIZ_HUB_CONTENT;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("value")
      .eq("key", QUIZ_HUB_SETTING_KEY)
      .eq("is_public", true)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (error || !data) return QUIZ_HUB_CONTENT;
    return parseQuizHubContent(data.value) || QUIZ_HUB_CONTENT;
  } catch {
    return QUIZ_HUB_CONTENT;
  } finally {
    clearTimeout(timeout);
  }
}
