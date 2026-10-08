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
import { getPublicSiteSetting } from "./public-site-setting";

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
  const value = await getPublicSiteSetting(setting.key);
  return (setting.parse(value) || fallback) as ToolContentMap[T];
}
