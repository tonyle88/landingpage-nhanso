import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");
const pg = requireFromApp("pg");

const expectedRef = "nuexmwyyibhkfcisaavw";
const expectedEmail = "lechicuong2017@gmail.com";
const siteUrl = "https://nhanso.clowcat.com.vn";
const redirectUrl = `${siteUrl}/admin/set-password`;
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const approval = process.env.PRODUCTION_OWNER_BOOTSTRAP_APPROVED?.trim();
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;

if (
  projectRef !== expectedRef ||
  approval !== expectedRef ||
  !accessToken ||
  !password
) {
  throw new Error("Refusing to bootstrap an unapproved production project");
}

const evidence = new Set();
const sample = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a", "-p", String(process.pid), "-iTCP", "-n", "-P",
    ]);
    for (const line of stdout.split("\n")) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {}
};
const timer = setInterval(sample, 25);
const managementHeaders = {
  authorization: `Bearer ${accessToken}`,
  "content-type": "application/json",
};
const authConfigEndpoint =
  `https://api.supabase.com/v1/projects/${projectRef}/config/auth`;

const client = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-owner-bootstrap",
});

let transactionOpen = false;
try {
  const configBeforeResponse = await fetch(authConfigEndpoint, {
    headers: managementHeaders,
    signal: AbortSignal.timeout(15_000),
  });
  if (!configBeforeResponse.ok) throw new Error("Auth config read failed");
  const configBefore = await configBeforeResponse.json();
  const allowList = String(configBefore.uri_allow_list || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (!allowList.includes(redirectUrl)) allowList.push(redirectUrl);

  const desiredConfig = {
    site_url: siteUrl,
    uri_allow_list: allowList.join(","),
    disable_signup: true,
  };
  const configChanged =
    configBefore.site_url !== desiredConfig.site_url ||
    String(configBefore.uri_allow_list || "") !== desiredConfig.uri_allow_list ||
    configBefore.disable_signup !== true;
  if (configChanged) {
    const updateResponse = await fetch(authConfigEndpoint, {
      method: "PATCH",
      headers: managementHeaders,
      body: JSON.stringify(desiredConfig),
      signal: AbortSignal.timeout(15_000),
    });
    if (!updateResponse.ok) throw new Error("Auth config update failed");
  }

  const configAfterResponse = await fetch(authConfigEndpoint, {
    headers: managementHeaders,
    signal: AbortSignal.timeout(15_000),
  });
  if (!configAfterResponse.ok) throw new Error("Auth config verification failed");
  const configAfter = await configAfterResponse.json();
  if (
    configAfter.site_url !== siteUrl ||
    configAfter.disable_signup !== true ||
    !String(configAfter.uri_allow_list || "").split(",").includes(redirectUrl)
  ) {
    throw new Error("Production Auth config postcondition failed");
  }

  const keysResponse = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
    {
      headers: { authorization: `Bearer ${accessToken}` },
      signal: AbortSignal.timeout(15_000),
    },
  );
  if (!keysResponse.ok) throw new Error("Unable to retrieve production API key");
  const keys = await keysResponse.json();
  const serviceRole = keys.find((key) => key.name === "service_role")?.api_key;
  if (!serviceRole) throw new Error("Production service role is unavailable");
  const admin = createClient(`https://${projectRef}.supabase.co`, serviceRole, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
      detectSessionInUrl: false,
    },
  });

  await client.connect();
  await sample();
  const before = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles) as roles
  `);
  const pristine = before.rows[0];
  if (pristine.auth_users > 1 || pristine.profiles > 1 || pristine.roles > 1) {
    throw new Error("Production authorization state is not pristine");
  }

  const existing = await client.query(
    "select id from auth.users where lower(email) = lower($1)",
    [expectedEmail],
  );
  let userId = existing.rows[0]?.id;
  let invited = false;
  if (!userId) {
    if (pristine.auth_users !== 0 || pristine.profiles !== 0 || pristine.roles !== 0) {
      throw new Error("Unexpected production Auth user exists");
    }
    const invite = await admin.auth.admin.inviteUserByEmail(expectedEmail, {
      redirectTo: redirectUrl,
      data: { full_name: "Production owner" },
    });
    if (invite.error || !invite.data?.user?.id) {
      throw new Error("Production owner invitation failed");
    }
    userId = invite.data.user.id;
    invited = true;
  }

  await client.query("begin");
  transactionOpen = true;
  await client.query("lock table public.admin_roles in exclusive mode");
  const userCheck = await client.query(
    "select id from auth.users where id = $1 and lower(email) = lower($2)",
    [userId, expectedEmail],
  );
  if (userCheck.rowCount !== 1) throw new Error("Invited owner identity mismatch");
  const authorizationCheck = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles where id <> $1) as other_profiles,
      (select count(*)::int from public.admin_roles where user_id <> $1) as other_roles
  `, [userId]);
  if (
    authorizationCheck.rows[0].auth_users !== 1 ||
    authorizationCheck.rows[0].other_profiles !== 0 ||
    authorizationCheck.rows[0].other_roles !== 0
  ) {
    throw new Error("Production authorization changed during bootstrap");
  }
  await client.query(`
    insert into public.profiles (id, display_name)
    values ($1, 'Production owner')
    on conflict (id) do update
      set display_name = excluded.display_name,
          updated_at = now()
  `, [userId]);
  await client.query(`
    insert into public.admin_roles (user_id, role, created_by)
    values ($1, 'owner', $1)
    on conflict (user_id) do update
      set role = excluded.role,
          created_by = excluded.created_by
  `, [userId]);
  const after = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles where role = 'owner') as owners
  `);
  if (
    after.rows[0].auth_users !== 1 ||
    after.rows[0].profiles !== 1 ||
    after.rows[0].owners !== 1
  ) {
    throw new Error("Production owner postcondition failed");
  }
  await client.query("commit");
  transactionOpen = false;
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    authSiteUrl: siteUrl,
    publicSignupDisabled: true,
    redirectAllowListed: true,
    configChanged,
    invited,
    authUsers: 1,
    profiles: 1,
    owners: 1,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }));
} catch (error) {
  if (transactionOpen) await client.query("rollback").catch(() => {});
  throw error;
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
