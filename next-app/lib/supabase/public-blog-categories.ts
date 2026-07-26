import "server-only";

import { unstable_cache } from "next/cache";
import {
  toPublicBlogCategory,
  type PublicBlogCategory,
} from "@/lib/blog";
import { createPublicServerClient } from "./server";

export type PublicBlogCategoriesResult = {
  categories: PublicBlogCategory[];
  source: "supabase" | "fallback";
};

const BLOG_CATEGORIES_TIMEOUT_MS = 4_000;

async function queryPublicBlogCategories(): Promise<PublicBlogCategoriesResult> {
  const client = createPublicServerClient();
  if (!client) return { categories: [], source: "fallback" };

  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(),
    BLOG_CATEGORIES_TIMEOUT_MS,
  );

  try {
    const { data, error } = await client
      .from("blog_categories")
      .select("*")
      .eq("enabled", true)
      .order("sort_order", { ascending: true })
      .order("slug", { ascending: true })
      .abortSignal(controller.signal);

    if (error || !data?.length) {
      return { categories: [], source: "fallback" };
    }

    const categories = data
      .map(toPublicBlogCategory)
      .filter((item): item is PublicBlogCategory => item !== null);

    return categories.length
      ? { categories, source: "supabase" }
      : { categories: [], source: "fallback" };
  } catch {
    return { categories: [], source: "fallback" };
  } finally {
    clearTimeout(timeout);
  }
}

const readCachedPublicBlogCategories = unstable_cache(
  queryPublicBlogCategories,
  ["public-blog-categories-v1"],
  { revalidate: 300, tags: ["public-blog-categories"] },
);

export async function getPublicBlogCategories(): Promise<PublicBlogCategoriesResult> {
  return readCachedPublicBlogCategories();
}
