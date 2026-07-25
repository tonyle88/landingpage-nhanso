import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607240009_admin_site_setting_crud.sql",
    root,
  ),
  "utf8",
);
const digestFix = await readFile(
  new URL(
    "next-app/supabase/migrations/202607240010_fix_setting_digest_schema.sql",
    root,
  ),
  "utf8",
);

test("setting RPCs enforce roles, grants and hashed-value audit", () => {
  assert.match(migration, /admin_save_site_setting/);
  assert.match(migration, /admin_delete_site_setting/);
  assert.match(migration, /'owner', 'admin', 'editor'/);
  assert.match(migration, /site_setting\.create/);
  assert.match(migration, /site_setting\.update/);
  assert.match(migration, /site_setting\.delete/);
  assert.match(migration, /value_sha256/);
  assert.match(migration, /public\.digest\(v_(before|after)\.value::text, 'sha256'\)/);
  assert.doesNotMatch(migration, /to_jsonb\(v_(before|after)\)/);
  assert.match(migration, /grant execute.+authenticated/);
});

test("setting audit digest is patched to the staging extension schema", () => {
  assert.match(digestFix, /extensions\.digest/);
  assert.match(digestFix, /unexpected setting function definition/);
  assert.match(digestFix, /admin_save_site_setting/);
  assert.match(digestFix, /admin_delete_site_setting/);
});
