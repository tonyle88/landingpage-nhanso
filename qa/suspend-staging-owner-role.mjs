import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

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
  throw new Error("Refusing to suspend a non-staging Supabase target");
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
  application_name: "nhanso-staging-owner-suspension",
});

let transactionOpen = false;
try {
  await client.connect();
  await sample();
  await client.query("begin");
  transactionOpen = true;
  await client.query("lock table public.admin_roles in exclusive mode");
  const before = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles) as roles,
      (select count(*)::int from public.admin_roles where role = 'owner') as owners
  `);
  const counts = before.rows[0];
  if (
    counts.auth_users !== 1 ||
    counts.profiles !== 1 ||
    counts.roles !== 1 ||
    counts.owners !== 1
  ) {
    throw new Error("Refusing suspension because staging owner state is unexpected");
  }
  const removed = await client.query(
    "delete from public.admin_roles where role = 'owner'",
  );
  if (removed.rowCount !== 1) throw new Error("Owner suspension did not remove exactly one role");
  const after = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles) as roles
  `);
  if (
    after.rows[0].auth_users !== 1 ||
    after.rows[0].profiles !== 1 ||
    after.rows[0].roles !== 0
  ) {
    throw new Error("Owner suspension postcondition failed");
  }
  await client.query("commit");
  transactionOpen = false;
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    authUsers: 1,
    profiles: 1,
    roles: 0,
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
