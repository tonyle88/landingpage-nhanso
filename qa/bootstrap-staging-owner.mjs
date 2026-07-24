import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";
import {
  classifyOwnerBootstrapState,
  ownerDisplayName,
} from "./lib/owner-bootstrap.mjs";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};
if (!projectRef || !password || !stagingHosts[projectRef]) {
  throw new Error("Refusing to bootstrap a non-staging Supabase target");
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
const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-staging-owner-bootstrap",
});

let transactionOpen = false;
try {
  await client.connect();
  await sample();
  await client.query("begin");
  transactionOpen = true;
  await client.query("lock table public.admin_roles in exclusive mode");

  const users = await client.query(`
    select id, email, raw_user_meta_data
    from auth.users
    order by created_at
    for update
  `);
  const profiles = await client.query(
    "select count(*)::int as count from public.profiles",
  );
  const roles = await client.query(`
    select role::text, user_id = $1::uuid as belongs_to_auth_user
    from public.admin_roles
  `, [users.rows[0]?.id ?? null]);
  const state = classifyOwnerBootstrapState({
    authUserCount: users.rowCount,
    profileCount: profiles.rows[0].count,
    roleRows: roles.rows.map((row) => ({
      belongsToAuthUser: row.belongs_to_auth_user,
      role: row.role,
    })),
  });

  let changed = false;
  if (state.action === "bootstrap") {
    const user = users.rows[0];
    await client.query(`
      insert into public.profiles (id, display_name)
      values ($1, $2)
      on conflict (id) do update
        set display_name = excluded.display_name,
            updated_at = now()
    `, [user.id, ownerDisplayName(user)]);
    await client.query(`
      insert into public.admin_roles (user_id, role, created_by)
      values ($1, 'owner', $1)
    `, [user.id]);
    changed = true;
  }

  const verification = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles where role = 'owner') as owners
  `);
  const counts = verification.rows[0];
  if (counts.auth_users !== 1 || counts.profiles !== 1 || counts.owners !== 1) {
    throw new Error("Owner bootstrap postcondition failed");
  }
  await client.query("commit");
  transactionOpen = false;
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    changed,
    authUsers: counts.auth_users,
    profiles: counts.profiles,
    owners: counts.owners,
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
