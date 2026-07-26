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
  throw new Error("Refusing to verify a non-staging Supabase target");
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
  application_name: "nhanso-admin-blog-verification",
});

try {
  await client.connect();
  await sample();
  const functions = await client.query(`
    select proname
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and proname in (
        'admin_save_blog_post',
        'admin_delete_blog_post',
        'admin_save_blog_category',
        'admin_delete_blog_category'
      )
    order by proname
  `);
  const migration = await client.query(`
    select version
    from supabase_migrations.schema_migrations
    where version in ('202607240007', '202607240008')
    order by version
  `);
  await sample();
  if (functions.rowCount !== 4 || migration.rowCount !== 2) {
    throw new Error("Admin blog staging verification failed");
  }
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    migration007: true,
    migration008: true,
    blogFunctions: functions.rowCount,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
