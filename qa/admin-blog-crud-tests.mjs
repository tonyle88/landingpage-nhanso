import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const migration = await read(
  "next-app/supabase/migrations/202607240007_admin_blog_post_crud.sql",
);
const input = await read("next-app/lib/admin/blog-post-input.ts");
const thumbnailMigration = await read(
  "next-app/supabase/migrations/202607270001_blog_post_thumbnail.sql",
);

test("blog RPCs enforce roles, transactional audit and grants", () => {
  assert.match(migration, /admin_save_blog_post/);
  assert.match(migration, /admin_delete_blog_post/);
  assert.match(migration, /'owner', 'admin', 'editor'/);
  assert.match(migration, /blog_post\.create/);
  assert.match(migration, /blog_post\.update/);
  assert.match(migration, /blog_post\.delete/);
  assert.match(migration, /grant execute.+authenticated/);
});

test("blog content rejects active HTML and unsafe URL schemes", () => {
  assert.match(migration, /script\|iframe\|object\|embed\|style/);
  assert.match(migration, /javascript/);
  assert.match(input, /unsafeHtml/);
  assert.match(input, /parsed\.protocol !== "https:"/);
});

test("blog thumbnails use separate media metadata with HTTPS validation", () => {
  assert.match(thumbnailMigration, /thumbnail_asset_id/);
  assert.match(thumbnailMigration, /thumbnail_url/);
  assert.match(thumbnailMigration, /invalid blog thumbnail media asset/);
  assert.match(thumbnailMigration, /invalid blog thumbnail URL/);
  assert.match(thumbnailMigration, /unsafe blog summary/);
  assert.match(input, /thumbnail_asset_id/);
  assert.match(input, /thumbnail_url/);
});
