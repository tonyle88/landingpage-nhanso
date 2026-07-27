import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

test("storage bucket limits public content images to 5 MB and safe MIME types", async () => {
  const sql = await read(
    "next-app/supabase/migrations/202607250017_content_image_storage.sql",
  );
  assert.match(sql, /'content-images'/);
  assert.match(sql, /5242880/);
  assert.match(sql, /image\/jpeg/);
  assert.match(sql, /image\/png/);
  assert.match(sql, /image\/webp/);
});

test("server upload validates size, MIME and file signatures", async () => {
  const source = await read("next-app/lib/admin/media-upload.ts");
  assert.match(source, /MAX_BYTES = 5 \* 1024 \* 1024/);
  assert.match(source, /hasValidMagic\(bytes, mime\)/);
  assert.match(source, /randomUUID\(\)/);
  assert.match(source, /upsert: false/);
  assert.match(source, /createServiceServerClient/);
  assert.doesNotMatch(source, /NEXT_PUBLIC_.*SECRET/);
});

test("admin actions authorize before upload and clean failed writes", async () => {
  for (const path of [
    "next-app/app/admin/testimonials/actions.ts",
    "next-app/app/admin/blog/actions.ts",
  ]) {
    const source = await read(path);
    const authIndex = source.indexOf("await requireContentManager()");
    const uploadIndex = source.indexOf("await uploadContentImage");
    assert.ok(authIndex >= 0 && uploadIndex > authIndex);
    assert.match(source, /await removeUploadedMedia\(upload\)/);
  }
});

test("admin forms only offer the approved image formats", async () => {
  for (const path of [
    "next-app/app/admin/testimonials/testimonial-form.tsx",
    "next-app/app/admin/blog/cover-image-field.tsx",
  ]) {
    const source = await read(path);
    assert.match(source, /accept="image\/jpeg,image\/png,image\/webp"/);
    assert.match(source, /tối đa 5 MB/);
  }
  const testimonialForm = await read(
    "next-app/app/admin/testimonials/testimonial-form.tsx",
  );
  assert.doesNotMatch(testimonialForm, /name="image_url"[^>]*required/);
});

test("content RPCs bind uploaded media metadata to content rows", async () => {
  const sql = await read(
    "next-app/supabase/migrations/202607250017_content_image_storage.sql",
  );
  assert.match(sql, /media_asset_id = v_media_id/);
  assert.match(sql, /cover_asset_id = v_cover_asset_id/);
  assert.match(sql, /bucket = 'content-images'/g);
  assert.match(sql, /and is_public/);
});

test("service upload metadata has narrowly scoped table grants", async () => {
  const sql = await read(
    "next-app/supabase/migrations/202607250018_media_asset_service_grants.sql",
  );
  assert.match(
    sql,
    /grant select, insert, delete on public\.media_assets to service_role/,
  );
  assert.doesNotMatch(sql, /grant all/i);
});

test("CSP only allows Supabase for migrated testimonial/blog images", async () => {
  const proxy = await read("next-app/proxy.ts");
  const imageDirective = proxy.slice(
    proxy.indexOf("\"img-src"),
    proxy.indexOf("\"connect-src"),
  );
  assert.match(imageDirective, /https:\/\/\*\.supabase\.co/);
  assert.doesNotMatch(imageDirective, /i\.ibb\.co|api\.imgbb\.com/);
  assert.doesNotMatch(
    imageDirective,
    /drive\.google\.com|\*\.googleusercontent\.com/,
  );
  assert.doesNotMatch(proxy, /https:\/\/api\.imgbb\.com/);
});

test("pages no longer preconnect to legacy image hosts", async () => {
  const landing = await read("next-app/app/page.tsx");
  const blog = await read("next-app/app/blog/layout.tsx");
  assert.doesNotMatch(landing, /preconnect" href="https:\/\/i\.ibb\.co/);
  assert.doesNotMatch(blog, /preconnect" href="https:\/\/drive\.google\.com/);
});
