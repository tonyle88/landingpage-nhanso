import type { MetadataRoute } from "next";
import { getPublicBlogPosts } from "@/lib/supabase/public-blog-posts";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://nhanso.clowcat.com.vn";
  const { posts } = await getPublicBlogPosts();

  return [
    {
      url: new URL("/", siteUrl).href,
      changeFrequency: "weekly",
      priority: 1,
    },
    {
      url: new URL("/blog", siteUrl).href,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: new URL("/quiz", siteUrl).href,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: new URL("/quiz/chon-goi", siteUrl).href,
      changeFrequency: "monthly",
      priority: 0.76,
    },
    ...["vakad", "ngon-ngu-yeu-thuong", "banh-xe-cuoc-doi"].map((slug) => ({
      url: new URL(`/quiz/cong-cu/${slug}`, siteUrl).href,
      changeFrequency: "monthly" as const,
      priority: 0.72,
    })),
    ...posts.map((post) => ({
      url: new URL(`/blog?id=${encodeURIComponent(post.id)}`, siteUrl).href,
      lastModified: post.date,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];
}
