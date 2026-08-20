import "server-only";

import {
  LIFE_WHEEL_SETTING_KEY,
  LOVE_LANGUAGE_QUESTIONS,
  LOVE_LANGUAGE_SETTING_KEY,
  parseLoveLanguageQuestions,
  parseVakadQuestions,
  parseWheelCategories,
  VAKAD_QUESTIONS,
  VAKAD_SETTING_KEY,
  WHEEL_CATEGORIES,
  type LoveLanguageQuestion,
  type SelfDiscoveryToolSlug,
  type VakadQuestion,
  type WheelCategory,
} from "@/lib/self-discovery-tools";
import { createPublicServerClient } from "./server";

const toolSettings = {
  vakad: {
    key: VAKAD_SETTING_KEY,
    fallback: VAKAD_QUESTIONS,
    parse: parseVakadQuestions,
  },
  "ngon-ngu-yeu-thuong": {
    key: LOVE_LANGUAGE_SETTING_KEY,
    fallback: LOVE_LANGUAGE_QUESTIONS,
    parse: parseLoveLanguageQuestions,
  },
  "banh-xe-cuoc-doi": {
    key: LIFE_WHEEL_SETTING_KEY,
    fallback: WHEEL_CATEGORIES,
    parse: parseWheelCategories,
  },
} as const;

type ToolContentMap = {
  vakad: ReadonlyArray<VakadQuestion>;
  "ngon-ngu-yeu-thuong": ReadonlyArray<LoveLanguageQuestion>;
  "banh-xe-cuoc-doi": ReadonlyArray<WheelCategory>;
};

export async function getPublicSelfDiscoveryContent<T extends SelfDiscoveryToolSlug>(slug: T): Promise<ToolContentMap[T]> {
  const setting = toolSettings[slug];
  const fallback = setting.fallback as ToolContentMap[T];
  const client = createPublicServerClient();
  if (!client) return fallback;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("value")
      .eq("key", setting.key)
      .eq("is_public", true)
      .abortSignal(controller.signal)
      .maybeSingle();
    if (error || !data) return fallback;
    if (slug === "vakad") return (parseVakadQuestions(data.value) || VAKAD_QUESTIONS) as unknown as ToolContentMap[T];
    if (slug === "ngon-ngu-yeu-thuong") return (parseLoveLanguageQuestions(data.value) || LOVE_LANGUAGE_QUESTIONS) as unknown as ToolContentMap[T];
    return (parseWheelCategories(data.value) || WHEEL_CATEGORIES) as unknown as ToolContentMap[T];
  } catch {
    return fallback;
  } finally {
    clearTimeout(timeout);
  }
}
