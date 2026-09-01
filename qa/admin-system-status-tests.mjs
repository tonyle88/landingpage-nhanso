import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);

async function source(path) {
  return readFile(new URL(path, root), "utf8");
}

test("system usage RPC is owner-only and does not expose secrets", async () => {
  const migration = await source(
    "next-app/supabase/migrations/202609010001_admin_system_usage.sql",
  );
  assert.match(migration, /current_admin_role\(\)/);
  assert.match(migration, /distinct from 'owner'/);
  assert.match(migration, /revoke all on function public\.admin_get_system_usage\(\) from anon/);

  const snapshotMigration = await source(
    "next-app/supabase/migrations/202609010002_admin_system_usage_snapshot.sql",
  );
  assert.match(snapshotMigration, /system\.capacity_snapshot/);
  assert.match(snapshotMigration, /refresh-admin-system-usage-snapshot/);
  assert.match(snapshotMigration, /revoke all on function public\.refresh_admin_system_usage_snapshot\(\) from authenticated/);
  assert.match(migration, /pg_database_size/);
  assert.match(migration, /from storage\.objects/);
});

test("system status page stays owner-only and renders honest provider states", async () => {
  const page = await source("next-app/app/admin/system-status/page.tsx");
  assert.match(page, /principal\.role !== "owner"/);
  assert.match(page, /admin_get_system_usage/);
  assert.match(page, /system\.capacity_snapshot/);
  assert.match(page, /Số liệu dự phòng đang hoạt động/);
  assert.match(page, /\) : !usage \? \(/);
  assert.match(page, /Vercel chưa cung cấp một con số/);
  assert.doesNotMatch(page, /SUPABASE_SECRET_KEY|SUPABASE_SERVICE_ROLE_KEY|VERCEL_API_TOKEN/);
});

test("admin dashboard links to system status", async () => {
  const dashboard = await source("next-app/app/admin/page.tsx");
  assert.match(dashboard, /href: "\/admin\/system-status"/);
  assert.match(dashboard, /title: "Trạng thái hệ thống"/);
});
