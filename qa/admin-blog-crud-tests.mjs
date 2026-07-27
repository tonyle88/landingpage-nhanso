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
const form = await read("next-app/app/admin/blog/blog-post-form.tsx");
const coverField = await read("next-app/app/admin/blog/cover-image-field.tsx");
const actions = await read("next-app/app/admin/blog/actions.ts");
const editor = await read("next-app/app/admin/blog/rich-text-editor.tsx");
const mediaUpload = await read("next-app/lib/admin/media-upload.ts");

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

test("one cover upload derives compressed WebP cover and thumbnail", () => {
  assert.match(form, /CoverImageField/);
  assert.match(coverField, /name="cover_file"/);
  assert.doesNotMatch(coverField, /name="thumbnail_file"/);
  assert.match(coverField, /Thumbnail tự động/);
  assert.match(actions, /width: 1600, height: 1200, fit: "inside", quality: 70/);
  assert.match(actions, /width: 640, height: 360, fit: "cover", quality: 70/);
  assert.match(mediaUpload, /\.webp\(\{ quality: webp\.quality \?\? 70/);
  assert.match(mediaUpload, /uploadMime = "image\/webp"/);
  assert.match(mediaUpload, /mime_type: uploadMime/);
});

test("editor and HTML modes share a canonical value without render overwrite", () => {
  assert.match(editor, /const htmlRef = useRef\(initialValue\)/);
  assert.match(editor, /htmlRef\.current = editorRef\.current\.innerHTML/);
  assert.match(editor, /editorRef\.current\.innerHTML = htmlRef\.current/);
  assert.doesNotMatch(editor, /dangerouslySetInnerHTML/);
});
