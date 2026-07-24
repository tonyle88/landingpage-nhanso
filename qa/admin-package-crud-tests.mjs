import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const migration = await read(
  "next-app/supabase/migrations/202607240004_admin_package_crud.sql",
);
const actions = await read("next-app/app/admin/packages/actions.ts");
const page = await read("next-app/app/admin/packages/page.tsx");
const input = await read("next-app/lib/admin/package-input.ts");

test("package RPCs enforce content roles and write audit in the same function", () => {
  assert.match(migration, /admin_save_package/);
  assert.match(migration, /admin_delete_package/);
  assert.match(migration, /'owner', 'admin', 'editor'/);
  assert.match(migration, /insert into public\.audit_logs/);
  assert.match(migration, /package\.create/);
  assert.match(migration, /package\.update/);
  assert.match(migration, /package\.delete/);
});

test("admin package UI gates permissions and uses server-side RPC actions", () => {
  assert.match(actions, /can\(principal\.role, "manage_content"\)/);
  assert.match(actions, /rpc\("admin_save_package"/);
  assert.match(actions, /rpc\("admin_delete_package"/);
  assert.match(actions, /revalidatePath\("\/"\)/);
  assert.match(page, /getAdminPrincipal/);
  assert.match(page, /confirmation/);
  assert.doesNotMatch(`${actions}\n${page}`, /SUPABASE_SECRET|service_role|localStorage/);
});

test("package form parser bounds and validates untrusted fields", () => {
  assert.match(input, /Number\.isSafeInteger/);
  assert.match(input, /features[\s\S]+slice\(0, 30\)/);
  assert.match(input, /sortOrder < 0 \|\| sortOrder > 10000/);
  assert.match(input, /optionalUuid/);
});

test("package RPCs validate price, code, features and limit execution", () => {
  assert.match(migration, /\^\[a-z0-9\]\[a-z0-9-\]\{1,63\}\$/);
  assert.match(migration, /at least one price is required/);
  assert.match(migration, /features must be an array/);
  assert.match(migration, /grant execute.+authenticated/);
  assert.match(migration, /revoke all.+from public/);
});
