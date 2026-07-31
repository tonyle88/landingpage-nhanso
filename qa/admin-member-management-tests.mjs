import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

const actions = await read("next-app/app/admin/members/actions.ts");
const page = await read("next-app/app/admin/members/page.tsx");
const input = await read("next-app/lib/admin/member-input.ts");
const dashboard = await read("next-app/app/admin/page.tsx");
const serviceClient = await read("next-app/lib/supabase/server.ts");

test("member management is owner-gated on page and server action", () => {
  assert.match(actions, /can\(principal\.role, "manage_roles"\)/);
  assert.match(page, /can\(principal\.role, "manage_roles"\)/);
  assert.match(dashboard, /principal\.role === "owner"/);
  assert.match(dashboard, /href: "\/admin\/members"/);
});

test("new members use Supabase invite flow and server-side role assignment", () => {
  assert.match(actions, /inviteUserByEmail/);
  assert.match(actions, /redirectTo: getInviteRedirectUrl\(\)/);
  assert.match(actions, /\/admin\/set-password/);
  assert.match(actions, /\.from\("profiles"\)\.upsert/);
  assert.match(actions, /\.from\("admin_roles"\)\.insert/);
  assert.match(actions, /created_by: principal\.userId/);
  assert.match(actions, /auth\.admin\.deleteUser\(userId\)/);
  assert.match(actions, /action: "admin_member\.invite"/);
  assert.match(actions, /resetPasswordForEmail/);
  assert.match(actions, /action: "admin_member\.setup_link_resend"/);
  assert.doesNotMatch(page, /SUPABASE_SECRET_KEY|service_role|localStorage/);
});

test("member input validates fields and cannot invite another owner", () => {
  assert.match(input, /displayName\.length < 2/);
  assert.match(input, /email\.length > 254/);
  assert.match(input, /INVITABLE_ADMIN_ROLES/);
  assert.match(input, /"admin",\s*"editor",\s*"auditor"/);
  assert.doesNotMatch(
    input.match(/INVITABLE_ADMIN_ROLES = \[[\s\S]*?\] as const/)?.[0] || "",
    /"owner"/,
  );
});

test("member UI explains password ownership and exposes role choices", () => {
  assert.match(page, /Thành viên sẽ nhận email để tự đặt mật khẩu/);
  assert.match(page, /value="admin"/);
  assert.match(page, /value="editor"/);
  assert.match(page, /value="auditor"/);
  assert.doesNotMatch(page, /type="password"/);
});

test("member list falls back to owner RLS when Auth Admin is unavailable", () => {
  assert.match(page, /createAuthServerClient/);
  assert.match(page, /\.from\("admin_roles"\)/);
  assert.match(page, /authDirectoryAvailable/);
  assert.match(page, /Danh sách tên và vai trò vẫn được tải/);
  assert.match(serviceClient, /SUPABASE_SERVICE_ROLE_KEY/);
});
