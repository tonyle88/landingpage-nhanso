import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";
import { verifyM4DatabaseState } from "./lib/m4-verification.mjs";

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
  throw new Error("Refusing to verify a non-staging Supabase target");
}

const evidence = new Set();
const sample = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a",
      "-p",
      String(process.pid),
      "-iTCP",
      "-n",
      "-P",
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
  application_name: "nhanso-staging-m4-verification",
});

try {
  await client.connect();
  await sample();
  const rolesResult = await client.query(`
    select enumlabel
    from pg_enum
    join pg_type on pg_type.oid = pg_enum.enumtypid
    join pg_namespace on pg_namespace.oid = pg_type.typnamespace
    where pg_namespace.nspname = 'public'
      and pg_type.typname = 'admin_role'
  `);
  const functionsResult = await client.query(`
    select proname
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and proname = 'current_admin_role'
  `);
  const policiesResult = await client.query(`
    select policyname
    from pg_policies
    where schemaname = 'public'
  `);
  const usersResult = await client.query(
    "select count(*)::int as count from auth.users",
  );
  const principalsResult = await client.query(`
    select
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles where role = 'owner') as owners
  `);
  const result = verifyM4DatabaseState({
    roles: rolesResult.rows.map((row) => row.enumlabel),
    functions: functionsResult.rows.map((row) => row.proname),
    policies: policiesResult.rows.map((row) => row.policyname),
  });
  if (!result.pass) throw new Error("M4 database verification failed");
  await sample();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      ownerRolePresent: result.ownerRolePresent,
      currentRoleFunctionPresent: result.currentRoleFunctionPresent,
      expectedPolicies: result.expectedPolicyCount,
      missingPolicies: result.missingPolicies.length,
      authUsers: usersResult.rows[0].count,
      profiles: principalsResult.rows[0].profiles,
      owners: principalsResult.rows[0].owners,
      networkEvidence: [...evidence].sort(),
      networkEvidenceCaptured: evidence.size > 0,
    }),
  );
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
