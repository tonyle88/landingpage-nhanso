import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const migration = await read(
  "next-app/supabase/migrations/202607240005_admin_testimonial_crud.sql",
);

test("testimonial RPCs validate HTTPS, roles and transactional audit", () => {
  assert.match(migration, /admin_save_testimonial/);
  assert.match(migration, /admin_delete_testimonial/);
  assert.match(migration, /\^https:\/\//);
  assert.match(migration, /'owner', 'admin', 'editor'/);
  assert.match(migration, /testimonial\.create/);
  assert.match(migration, /testimonial\.update/);
  assert.match(migration, /testimonial\.delete/);
  assert.match(migration, /grant execute.+authenticated/);
});
