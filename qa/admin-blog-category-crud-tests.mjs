import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607240008_admin_blog_category_crud.sql",
    root,
  ),
  "utf8",
);

test("category RPCs enforce roles, audit and safe deletion", () => {
  assert.match(migration, /admin_save_blog_category/);
  assert.match(migration, /admin_delete_blog_category/);
  assert.match(migration, /'owner', 'admin', 'editor'/);
  assert.match(migration, /blog_category\.create/);
  assert.match(migration, /blog_category\.update/);
  assert.match(migration, /blog_category\.delete/);
  assert.match(migration, /blog category is in use/);
  assert.match(migration, /grant execute.+authenticated/);
});
