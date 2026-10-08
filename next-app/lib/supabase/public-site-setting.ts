import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "./server";
import type { Json } from "./database.types";

async function queryPublicSiteSetting(key: string): Promise<Json | null> {
  const client = createPublicServerClient();
  if (!client) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .eq("is_public", true)
      .abortSignal(controller.signal)
      .maybeSingle();
    return error ? null : data?.value ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

// The key argument is included in the cache key. Never cache private settings.
export const getPublicSiteSetting = unstable_cache(
  queryPublicSiteSetting,
  ["public-site-setting-v1"],
  { revalidate: 300, tags: ["public-site-settings"] },
);
