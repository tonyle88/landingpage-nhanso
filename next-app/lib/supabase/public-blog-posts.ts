import "server-only";

import { unstable_cache } from "next/cache";
import { toPublicBlogPost, type PublicBlogPost } from "@/lib/blog";
import { createPublicServerClient } from "./server";

export type PublicBlogPostsResult = {
  posts: PublicBlogPost[];
  source: "supabase" | "fallback";
};

const BLOG_POSTS_TIMEOUT_MS = 4_000;

async function queryPublicBlogPosts(): Promise<PublicBlogPostsResult> {
  const client = createPublicServerClient();
  if (!client) return { posts: [], source: "fallback" };

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), BLOG_POSTS_TIMEOUT_MS);

  try {
    const now = new Date();
    const { data, error } = await client
      .from("blog_posts")
      .select(
        "id,category_id,slug,title,summary,content_html,cover_url,pinned,status,published_at,created_at,updated_at,author_id,cover_asset_id,media_assets(public_url)",
      )
      .eq("status", "published")
      .lte("published_at", now.toISOString())
      .order("pinned", { ascending: false })
      .order("published_at", { ascending: false })
      .abortSignal(controller.signal);

    if (error || !data?.length) {
      return { posts: [], source: "fallback" };
    }

    const timestamp = now.getTime();
    const posts = data
      .map((row) => toPublicBlogPost(row, timestamp))
      .filter((item): item is PublicBlogPost => item !== null);

    return posts.length
      ? { posts, source: "supabase" }
      : { posts: [], source: "fallback" };
  } catch {
    return { posts: [], source: "fallback" };
  } finally {
    clearTimeout(timeout);
  }
}

const readCachedPublicBlogPosts = unstable_cache(
  queryPublicBlogPosts,
  ["public-blog-posts-v1"],
  { revalidate: 300, tags: ["public-blog-posts"] },
);

export async function getPublicBlogPosts(): Promise<PublicBlogPostsResult> {
  return readCachedPublicBlogPosts();
}
