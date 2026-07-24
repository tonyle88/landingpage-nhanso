import type { Database } from "@/lib/supabase/database.types";

type TestimonialRow =
  Database["public"]["Tables"]["testimonials"]["Row"] & {
    media_assets: { public_url: string | null } | null;
  };

export type PublicTestimonial = {
  url: string;
  altText: string;
  sortOrder: number;
  createdAt: string;
};

export function toPublicTestimonial(
  row: TestimonialRow,
): PublicTestimonial | null {
  const url = (row.image_url || row.media_assets?.public_url || "").trim();
  if (!row.enabled || !url) return null;

  return {
    url,
    altText: row.alt_text.trim() || "Cảm nhận của khách hàng",
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}
