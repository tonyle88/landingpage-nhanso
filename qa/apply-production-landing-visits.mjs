import { execFileSync } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const require = createRequire(resolve(root, "next-app/package.json"));
const { Client } = require("pg");
const projectRef = "nuexmwyyibhkfcisaavw";
const version = "202610090001";
const apply = process.argv.includes("--apply");

if ((process.env.PRODUCTION_PROJECT_REF !== projectRef && process.env.SUPABASE_PROJECT_REF !== projectRef)
  || !process.env.SUPABASE_DB_PASSWORD || !process.env.SUPABASE_DB_SSL_CA_FILE
  || (apply && process.env.LANDING_VISITS_MIGRATION_APPROVED !== projectRef)) {
  throw new Error("Production visit-counter credentials, verified CA and explicit approval are required");
}

const migration = (await readFile(resolve(root,
  `next-app/supabase/migrations/${version}_landing_visit_counter.sql`), "utf8"))
  .replace(/^begin;\s*/i, "").replace(/\s*commit;\s*$/i, "");
const ca = await readFile(process.env.SUPABASE_DB_SSL_CA_FILE, "utf8");
const client = new Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password: process.env.SUPABASE_DB_PASSWORD,
  ssl: { rejectUnauthorized: true, ca },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-landing-visits-migration",
});

// Chỉ theo dõi socket của process này; không coi snapshot là bằng chứng toàn bộ egress.
const endpoints = new Set();
function sampleSockets() {
  try {
    const output = execFileSync("/usr/sbin/lsof", ["-a", "-p", String(process.pid),
      "-iTCP", "-nP", "-F", "n"], { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
    for (const line of output.split("\n")) {
      if (line.startsWith("n") && line.includes("->")) endpoints.add(line.slice(1));
    }
  } catch {
    // Snapshot unavailable or request completed between samples; report the limit below.
  }
}

async function inspect() {
  const { rows } = await client.query(`select
    (select count(*) = 3 from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relname in
        ('landing_visit_totals', 'landing_visit_sessions', 'landing_visit_rate_buckets')
      and c.relrowsecurity) as all_tables_have_rls,
    has_function_privilege('service_role', 'public.record_landing_visit(text,text,boolean)', 'execute')
      as service_can_execute,
    not has_function_privilege('anon', 'public.record_landing_visit(text,text,boolean)', 'execute')
      as anon_cannot_execute,
    not has_function_privilege('authenticated', 'public.record_landing_visit(text,text,boolean)', 'execute')
      as authenticated_cannot_execute,
    not exists (select 1 from (values ('landing_visit_totals'), ('landing_visit_sessions'),
      ('landing_visit_rate_buckets')) t(name) where
      has_table_privilege('anon', 'public.' || t.name, 'select,insert,update,delete')
      or has_table_privilege('authenticated', 'public.' || t.name, 'select,insert,update,delete'))
      as browser_has_no_table_access,
    exists(select 1 from public.landing_visit_totals where id = 1) as total_row_exists`);
  if (Object.values(rows[0]).some((value) => value !== true)) {
    throw new Error("Visit-counter schema/permission verification failed");
  }
  return rows[0];
}

try {
  await client.connect();
  sampleSockets();
  await client.query("begin");
  let mode, checks;
  try {
    await client.query("select pg_advisory_xact_lock($1::bigint)", [version]);
    const { rows } = await client.query(
      "select exists(select 1 from supabase_migrations.schema_migrations where version = $1) as applied",
      [version]);
    if (rows[0].applied) {
      checks = await inspect();
      mode = "already_applied";
      await client.query("rollback");
    } else {
      await client.query(migration);
      checks = await inspect();
      if (apply) {
        await client.query(`insert into supabase_migrations.schema_migrations(version, statements, name)
          values ($1, $2::text[], $3)`, [version, [migration], "landing_visit_counter"]);
        await client.query("notify pgrst, 'reload schema'");
        await client.query("commit");
        mode = "applied";
      } else {
        await client.query("rollback");
        mode = "rolled_back";
      }
    }
  } catch (error) {
    await client.query("rollback").catch(() => {});
    throw error;
  }
  sampleSockets();
  console.log(JSON.stringify({ status: "PASS", projectRef, version, mode, strictTlsVerified: true,
    checks, observedProcessSockets: [...endpoints],
    networkEvidenceLimit: "Process socket snapshot only; does not establish all provider or agent egress." }));
} catch (error) {
  // Không in query, body, credential hoặc lỗi có thể chứa giá trị secret.
  console.error(JSON.stringify({ status: "FAILED", errorCode: error.code || null,
    reason: error.code ? "Database operation failed; check code and connection/schema permissions."
      : "Visit-counter migration or permission verification failed." }));
  process.exitCode = 1;
} finally {
  await client.end().catch(() => {});
}
