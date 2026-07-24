import "server-only";

import { unstable_cache } from "next/cache";
import {
  toPublicTestimonial,
  type PublicTestimonial,
} from "@/lib/testimonials";
import { createPublicServerClient } from "./server";

export type PublicTestimonialsResult = {
  testimonials: PublicTestimonial[];
  source: "supabase" | "fallback";
};

const TESTIMONIALS_TIMEOUT_MS = 4_000;

async function queryPublicTestimonials(): Promise<PublicTestimonialsResult> {
  const client = createPublicServerClient();
  if (!client) return { testimonials: [], source: "fallback" };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    TESTIMONIALS_TIMEOUT_MS,
  );

  try {
    const { data, error } = await client
      .from("testimonials")
      .select(
        "id,image_url,alt_text,enabled,sort_order,created_at,updated_at,media_asset_id,media_assets(public_url)",
      )
      .eq("enabled", true)
      .order("sort_order", { ascending: false })
      .order("created_at", { ascending: false })
      .abortSignal(controller.signal);

    if (error || !data?.length) {
      return { testimonials: [], source: "fallback" };
    }

    const testimonials = data
      .map(toPublicTestimonial)
      .filter((item): item is PublicTestimonial => item !== null);

    return testimonials.length
      ? { testimonials, source: "supabase" }
      : { testimonials: [], source: "fallback" };
  } catch {
    return { testimonials: [], source: "fallback" };
  } finally {
    clearTimeout(timeout);
  }
}

const readCachedPublicTestimonials = unstable_cache(
  queryPublicTestimonials,
  ["public-testimonials-v1"],
  { revalidate: 300, tags: ["public-testimonials"] },
);

export async function getPublicTestimonials(): Promise<PublicTestimonialsResult> {
  return readCachedPublicTestimonials();
}
