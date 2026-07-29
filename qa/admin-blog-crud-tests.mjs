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
const categoryForm = await read(
  "next-app/app/admin/blog/category-form.tsx",
);
const pendingOverlay = await read(
  "next-app/app/admin/admin-pending-overlay.tsx",
);
const coverField = await read("next-app/app/admin/blog/cover-image-field.tsx");
const actions = await read("next-app/app/admin/blog/actions.ts");
const editor = await read("next-app/app/admin/blog/rich-text-editor.tsx");
const adminStyles = await read("next-app/app/admin/admin.module.css");
const publicStyles = await read("next-app/public/style.css");
const blogRuntime = await read("next-app/public/blog.js");
const mediaUpload = await read("next-app/lib/admin/media-upload.ts");
const adminPage = await read("next-app/app/admin/blog/page.tsx");
const publicPosts = await read("next-app/lib/supabase/public-blog-posts.ts");

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

test("editor supports safe semantic font sizes and readable article defaults", () => {
  assert.match(editor, /aria-label=\{`Cỡ chữ \$\{label\.toLowerCase\(\)\}`\}/);
  assert.match(editor, /Nhỏ/);
  assert.match(editor, /Chuẩn/);
  assert.match(editor, /Lớn/);
  assert.match(editor, /Rất lớn/);
  assert.match(editor, /normalizeFontSizeMarkup/);
  assert.match(editor, /editor-font-xlarge/);
  assert.doesNotMatch(editor, /style\.fontSize\s*=/);
  assert.match(adminStyles, /editor-font-large/);
  assert.match(publicStyles, /\.article-content \.editor-font-large/);
  assert.match(publicStyles, /\.blog-card-summary \.editor-font-large/);
  assert.match(publicStyles, /\.article-content[\s\S]*font-size: 1\.2rem/);
  assert.match(blogRuntime, /font-size:1\.2rem/);
  assert.doesNotMatch(editor, /!compact \? \(\s*<label className=\{styles\.editorFontControl\}/);
});

test("new posts receive a unique generated slug and actionable failures", () => {
  assert.match(actions, /ensureUniqueGeneratedSlug/);
  assert.match(actions, /payload\.slug = await ensureUniqueGeneratedSlug/);
  assert.match(actions, /error\.code === "23505" \? "duplicate" : "error"/);
  assert.match(actions, /const status = phase === "upload"/);
});

test("new posts default to local current time while edits preserve stored date", () => {
  assert.match(form, /fallbackToNow \? new Date\(\) : null/);
  assert.match(form, /defaultValue=\{localDateTime\(item\?\.published_at, !item\)\}/);
  assert.doesNotMatch(form, /toISOString\(\)\.slice\(0, 16\)/);
});

test("newest blog posts appear first in admin and public lists", () => {
  for (const source of [adminPage, publicPosts]) {
    assert.match(source, /order\("published_at", \{ ascending: false, nullsFirst: false \}\)/);
    assert.match(source, /order\("created_at", \{ ascending: false \}\)/);
  }
  assert.doesNotMatch(adminPage, /order\("updated_at", \{ ascending: false \}\)/);
});

test("blog saves show a blocking pending state and prevent repeated submits", () => {
  assert.match(form, /data-pending-label=/);
  assert.match(form, /Đang lưu bài viết…/);
  assert.match(categoryForm, /data-pending-label=/);
  assert.match(categoryForm, /Đang lưu danh mục…/);
  assert.match(pendingOverlay, /pendingRef\.current/);
  assert.match(pendingOverlay, /control\.disabled = true/);
  assert.match(pendingOverlay, /setPending\(true\)/);
  assert.match(pendingOverlay, /usePathname/);
  assert.match(pendingOverlay, /useSearchParams/);
  assert.match(pendingOverlay, /\[pathname, search, reset\]/);
  assert.doesNotMatch(
    pendingOverlay,
    /event\.defaultPrevented \|\| pendingRef\.current/,
  );
});

test("blog validation reports the exact invalid field and paste removes unsafe markup", () => {
  assert.match(input, /class BlogPostInputError/);
  assert.match(input, /summary_too_long/);
  assert.match(input, /unsafe_content/);
  assert.match(actions, /error instanceof BlogPostInputError/);
  assert.match(editor, /sanitizePastedHtml/);
  assert.match(editor, /script,iframe,object,embed,style,link,meta/);
  assert.match(editor, /onPaste=\{pasteSafeHtml\}/);
});
