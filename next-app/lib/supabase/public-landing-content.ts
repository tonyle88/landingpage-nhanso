import "server-only";

import { unstable_cache } from "next/cache";
import {
  toLandingContentItem,
  toLandingSection,
  type PublicLandingContent,
} from "@/lib/landing-content";
import { createPublicServerClient } from "./server";

export type PublicLandingContentResult = {
  content: PublicLandingContent;
  hasItems: boolean;
  hasSections: boolean;
  source: "supabase" | "fallback";
};

const LANDING_CONTENT_TIMEOUT_MS = 4_000;
const emptyContent = (): PublicLandingContentResult => ({
  content: { items: [], sectionsLayout: [] },
  hasItems: false,
  hasSections: false,
  source: "fallback",
});

async function queryPublicLandingContent(): Promise<PublicLandingContentResult> {
  const client = createPublicServerClient();
  if (!client) return emptyContent();

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    LANDING_CONTENT_TIMEOUT_MS,
  );

  try {
    const [settingsResult, sectionsResult] = await Promise.all([
      client
        .from("site_settings")
        .select("*")
        .eq("is_public", true)
        .order("key", { ascending: true })
        .abortSignal(controller.signal),
      client
        .from("landing_sections")
        .select("*")
        .eq("enabled", true)
        .order("sort_order", { ascending: true })
        .order("section_key", { ascending: true })
        .abortSignal(controller.signal),
    ]);

    const items = settingsResult.error
      ? []
      : (settingsResult.data || [])
          .map(toLandingContentItem)
          .filter((item): item is NonNullable<typeof item> => item !== null);
    const sectionsLayout = sectionsResult.error
      ? []
      : (sectionsResult.data || []).map(toLandingSection);
    const hasItems = items.length > 0;
    const hasSections = sectionsLayout.length > 0;

    return {
      content: { items, sectionsLayout },
      hasItems,
      hasSections,
      source: hasItems || hasSections ? "supabase" : "fallback",
    };
  } catch {
    return emptyContent();
  } finally {
    clearTimeout(timeout);
  }
}

const readCachedPublicLandingContent = unstable_cache(
  queryPublicLandingContent,
  ["public-landing-content-v1"],
  { revalidate: 300, tags: ["public-landing-content"] },
);

export async function getPublicLandingContent(): Promise<PublicLandingContentResult> {
  return readCachedPublicLandingContent();
}
