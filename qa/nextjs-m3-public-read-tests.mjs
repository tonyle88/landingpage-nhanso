import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../next-app/", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("packages use a server-only typed Supabase read with bounded fallback", async () => {
  const [page, client, query] = await Promise.all([
    read("app/page.tsx"),
    read("lib/supabase/server.ts"),
    read("lib/supabase/public-packages.ts"),
  ]);

  assert.match(page, /getPublicPackages\(\)/);
  assert.match(page, /initialPackages=\{publicPackages\.packages\}/);
  assert.match(client, /^import "server-only";/);
  assert.match(client, /SupabaseClient<Database>/);
  assert.match(client, /NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY/);
  assert.doesNotMatch(client, /SERVICE_ROLE|service_role|sb_secret_/);
  assert.match(query, /unstable_cache/);
  assert.match(query, /revalidate: 300/);
  assert.match(query, /PACKAGES_TIMEOUT_MS = 4_000/);
  assert.match(query, /source: "fallback"/);
});

test("Google packages remain fallback-only after Supabase returns rows", async () => {
  const [runtime, content] = await Promise.all([
    read("app/landing-runtime.tsx"),
    read("app/use-landing-content.ts"),
  ]);

  assert.match(runtime, /usePackages\(initialPackages\)/);
  assert.match(runtime, /initialPackages\.length > 0/);
  assert.match(content, /!preferSupabasePackages/);
});

test("testimonials use the same bounded server read and Google fallback", async () => {
  const [page, query, runtime, content] = await Promise.all([
    read("app/page.tsx"),
    read("lib/supabase/public-testimonials.ts"),
    read("app/landing-runtime.tsx"),
    read("app/use-landing-content.ts"),
  ]);

  assert.match(page, /getPublicTestimonials\(\)/);
  assert.match(
    page,
    /initialTestimonials=\{publicTestimonials\.testimonials\}/,
  );
  assert.match(query, /^import "server-only";/);
  assert.match(query, /TESTIMONIALS_TIMEOUT_MS = 4_000/);
  assert.match(query, /revalidate: 300/);
  assert.match(query, /media_assets\(public_url\)/);
  assert.match(runtime, /useTestimonials\(initialTestimonials\)/);
  assert.match(content, /!preferSupabaseTestimonials/);
});

test("landing content and public settings use granular server ownership", async () => {
  const [page, query, mapper, runtime, content] = await Promise.all([
    read("app/page.tsx"),
    read("lib/supabase/public-landing-content.ts"),
    read("lib/landing-content.ts"),
    read("app/landing-runtime.tsx"),
    read("app/use-landing-content.ts"),
  ]);

  assert.match(page, /getPublicLandingContent\(\)/);
  assert.match(page, /preferSupabaseLandingItems=\{publicLandingContent\.hasItems\}/);
  assert.match(
    page,
    /preferSupabaseLandingSections=\{publicLandingContent\.hasSections\}/,
  );
  assert.match(query, /^import "server-only";/);
  assert.match(query, /LANDING_CONTENT_TIMEOUT_MS = 4_000/);
  assert.match(query, /revalidate: 300/);
  assert.match(query, /\.from\("site_settings"\)/);
  assert.match(query, /\.eq\("is_public", true\)/);
  assert.match(query, /\.from\("landing_sections"\)/);
  assert.match(mapper, /replace\(\/\^landing\\\.content\\\.\/, ""\)/);
  assert.match(runtime, /initialLandingContent/);
  assert.match(content, /!preferSupabaseItems/);
  assert.match(content, /!preferSupabaseSections/);
});

test("blog categories are server-rendered and override only the Google category slice", async () => {
  const [page, query, mapper, legacy] = await Promise.all([
    read("app/blog/page.tsx"),
    read("lib/supabase/public-blog-categories.ts"),
    read("lib/blog.ts"),
    read("public/blog.js"),
  ]);

  assert.match(page, /getPublicBlogCategories\(\)/);
  assert.match(page, /id="blog-initial-data"/);
  assert.match(page, /type="application\/json"/);
  assert.match(page, /serializeJsonForHtml/);
  assert.match(query, /^import "server-only";/);
  assert.match(query, /BLOG_CATEGORIES_TIMEOUT_MS = 4_000/);
  assert.match(query, /revalidate: 300/);
  assert.match(query, /\.from\("blog_categories"\)/);
  assert.match(mapper, /\.replace\(\/<\/g, "\\\\u003c"\)/);
  assert.match(legacy, /readInitialBlogCategories\(\)/);
  assert.match(legacy, /initialBlogCategories\.length/);
  assert.match(legacy, /chooseBlogCategories\(data\.blogCategories\)/);
});
