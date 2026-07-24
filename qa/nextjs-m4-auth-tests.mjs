import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";
import test from "node:test";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");
const roles = await import(
  pathToFileURL(new URL("next-app/lib/auth/roles.ts", root).pathname)
);
const [
  serverClient,
  browserClient,
  principal,
  proxy,
  ownerMigration,
  authorizationMigration,
  authConfig,
  adminLogin,
  adminPage,
  adminLogout,
  setPasswordPage,
  setPasswordForm,
] = await Promise.all([
  read("next-app/lib/supabase/auth-server.ts"),
  read("next-app/lib/supabase/auth-browser.ts"),
  read("next-app/lib/auth/admin-principal.ts"),
  read("next-app/proxy.ts"),
  read("next-app/supabase/migrations/202607240002_add_owner_role.sql"),
  read("next-app/supabase/migrations/202607240003_admin_authorization.sql"),
  read("next-app/supabase/config.toml"),
  read("next-app/app/admin/login/login-form.tsx"),
  read("next-app/app/admin/page.tsx"),
  read("next-app/app/admin/logout/route.ts"),
  read("next-app/app/admin/set-password/page.tsx"),
  read("next-app/app/admin/set-password/set-password-form.tsx"),
]);

test("role matrix keeps owner recovery distinct from daily admin", () => {
  assert.equal(roles.can("owner", "manage_roles"), true);
  assert.equal(roles.can("admin", "manage_roles"), false);
  assert.equal(roles.can("editor", "manage_content"), true);
  assert.equal(roles.can("editor", "read_operations"), false);
  assert.equal(roles.can("auditor", "read_operations"), true);
  assert.equal(roles.can(null, "manage_content"), false);
});

test("SSR clients use cookie storage and never authorize with getSession", () => {
  assert.match(serverClient, /createServerClient/);
  assert.match(serverClient, /getAll/);
  assert.match(serverClient, /setAll/);
  assert.match(browserClient, /createBrowserClient/);
  assert.doesNotMatch(
    `${serverClient}\n${principal}\n${proxy}`,
    /auth\.getSession\(/,
  );
  assert.match(principal, /auth\.getClaims\(\)/);
  assert.match(principal, /current_admin_role/);
  assert.match(proxy, /auth\.getClaims\(\)/);
  assert.match(proxy, /cacheHeaders/);
});

test("owner migration and RLS encode the agreed server-side matrix", () => {
  assert.match(ownerMigration, /add value if not exists 'owner'/);
  assert.match(authorizationMigration, /current_admin_role/);
  assert.match(
    authorizationMigration,
    /array\['owner','admin','editor'\]::public\.admin_role\[\]/,
  );
  assert.match(
    authorizationMigration,
    /array\['owner','admin','auditor'\]::public\.admin_role\[\]/,
  );
  assert.match(
    authorizationMigration,
    /admin_roles_owner_all[\s\S]+array\['owner'\]/,
  );
});

test("local Auth policy is invite-only with bounded sessions", () => {
  assert.match(authConfig, /\[auth\][\s\S]+enable_signup = false/);
  assert.match(authConfig, /\[auth\.email\][\s\S]+enable_signup = false/);
  assert.match(authConfig, /minimum_password_length = 12/);
  assert.match(authConfig, /password_requirements = "lower_upper_letters_digits_symbols"/);
  assert.match(authConfig, /\[auth\.sessions\][\s\S]+timebox = "12h"/);
  assert.match(authConfig, /inactivity_timeout = "2h"/);
});

test("admin routes are invite-only and authorize on the server", () => {
  assert.match(adminLogin, /signInWithPassword/);
  assert.doesNotMatch(adminLogin, /signUp|localStorage|sessionStorage/);
  assert.doesNotMatch(adminLogin, /error\.message/);
  assert.match(adminPage, /getAdminPrincipal\(\)/);
  assert.match(adminPage, /redirect\("\/admin\/login\?reason=unauthorized"\)/);
  assert.match(adminLogout, /auth\.signOut/);
  assert.match(adminLogout, /Location:\s*"\/admin\/login"/);
  assert.match(adminLogout, /Cache-Control", "private, no-store"/);
});

test("invite completion sets a password without exposing tokens", () => {
  assert.match(setPasswordPage, /robots:\s*\{\s*index:\s*false/);
  assert.match(setPasswordForm, /window\.location\.hash/);
  assert.match(setPasswordForm, /supabase\.auth\.setSession/);
  assert.match(setPasswordForm, /supabase\.auth\.updateUser\(\{\s*password\s*\}\)/);
  assert.match(setPasswordForm, /window\.history\.replaceState/);
  assert.doesNotMatch(setPasswordForm, /localStorage|sessionStorage|console\./);
});
