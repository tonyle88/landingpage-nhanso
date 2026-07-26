import type { Database } from "@/lib/supabase/database.types";

type BlogCategoryRow =
  Database["public"]["Tables"]["blog_categories"]["Row"];
type BlogPostRow = Database["public"]["Tables"]["blog_posts"]["Row"] & {
  media_assets: { public_url: string | null } | null;
};

export type PublicBlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  enabled: true;
  sortOrder: number;
};

export type PublicBlogPost = {
  id: string;
  slug: string;
  categoryId: string;
  title: string;
  summary: string;
  contentHtml: string;
  thumbnail: string;
  pinned: boolean;
  enabled: true;
  date: string;
};

export function toPublicBlogCategory(
  row: BlogCategoryRow,
): PublicBlogCategory | null {
  const id = row.id.trim();
  const slug = row.slug.trim();
  const name = row.name.trim();
  if (!row.enabled || !id || !slug || !name) return null;

  return {
    id,
    slug,
    name,
    description: row.description || "",
    enabled: true,
    sortOrder: row.sort_order,
  };
}

function safePublicUrl(value: string | null | undefined): string {
  const text = (value || "").trim();
  if (!text) return "";
  if (text.startsWith("/") && !text.startsWith("//")) return text;

  try {
    const url = new URL(text);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : "";
  } catch {
    return "";
  }
}

export function toPublicBlogPost(
  row: BlogPostRow,
  now = Date.now(),
): PublicBlogPost | null {
  const publishedAt = Date.parse(row.published_at || "");
  if (
    row.status !== "published" ||
    !Number.isFinite(publishedAt) ||
    publishedAt > now
  ) {
    return null;
  }

  const id = row.id.trim();
  const slug = row.slug.trim();
  const title = row.title.trim();
  if (!id || !slug || !title) return null;

  return {
    id,
    slug,
    categoryId: row.category_id || "",
    title,
    summary: row.summary || "",
    contentHtml: row.content_html,
    thumbnail: safePublicUrl(
      row.cover_url || row.media_assets?.public_url,
    ),
    pinned: row.pinned,
    enabled: true,
    date: new Date(publishedAt).toISOString(),
  };
}

export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
