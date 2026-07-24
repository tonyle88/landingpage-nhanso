import type { Database } from "@/lib/supabase/database.types";

type BlogCategoryRow =
  Database["public"]["Tables"]["blog_categories"]["Row"];

export type PublicBlogCategory = {
  id: string;
  slug: string;
  name: string;
  description: string;
  enabled: true;
  sortOrder: number;
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

export function serializeJsonForHtml(value: unknown): string {
  return JSON.stringify(value)
    .replace(/</g, "\\u003c")
    .replace(/\u2028/g, "\\u2028")
    .replace(/\u2029/g, "\\u2029");
}
