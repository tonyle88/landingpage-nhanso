import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { Client } = requireFromApp("pg");
const expectedProjectRef = "nuexmwyyibhkfcisaavw";
const version = "202609010002";
const migrationName = "admin_system_usage_snapshot";
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const approval = process.env.SYSTEM_USAGE_MIGRATION_APPROVED?.trim();
const apply = process.argv.includes("--apply");

if (
  projectRef !== expectedProjectRef ||
  !password ||
  (apply && approval !== expectedProjectRef)
) {
  throw new Error("Refusing to modify an unapproved production project");
}

const migrationPath = resolve(
  root,
  "next-app/supabase/migrations/202609010002_admin_system_usage_snapshot.sql",
);
const migration = (await readFile(migrationPath, "utf8"))
  .replace(/^begin;\s*/i, "")
  .replace(/\s*commit;\s*$/i, "");

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
const client = new Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-system-usage-migration",
});

try {
  await client.connect();
  await sample();

  const before = await client.query(
    `select exists (
       select 1 from supabase_migrations.schema_migrations where version = $1
     ) as applied`,
    [version],
  );
  const wasApplied = before.rows[0]?.applied === true;

  if (!wasApplied) {
    await client.query("begin");
    try {
      await client.query(migration);
      const inTransaction = await client.query(`
        select
          to_regprocedure('public.admin_get_system_usage()') is not null as function_exists,
          has_function_privilege(
            'authenticated',
            'public.admin_get_system_usage()',
            'execute'
          ) as authenticated_can_execute,
          exists (
            select 1 from public.site_settings
            where key = 'system.capacity_limits' and is_public = false
          ) as private_limit_setting,
          to_regprocedure('public.refresh_admin_system_usage_snapshot()') is not null
            as refresh_function_exists,
          exists (
            select 1 from public.site_settings
            where key = 'system.capacity_snapshot' and is_public = false
          ) as private_snapshot_setting,
          exists (
            select 1 from cron.job
            where jobname = 'refresh-admin-system-usage-snapshot'
          ) as refresh_job_exists
      `);
      if (Object.values(inTransaction.rows[0] || {}).some((value) => value !== true)) {
        throw new Error("System usage migration verification failed in transaction");
      }

      if (apply) {
        await client.query(
          `insert into supabase_migrations.schema_migrations(version, statements, name)
           values ($1, $2::text[], $3)
           on conflict (version) do nothing`,
          [version, [migration], migrationName],
        );
        await client.query("commit");
      } else {
        await client.query("rollback");
      }
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  }

  const after = await client.query(
    `select
       exists (
         select 1 from supabase_migrations.schema_migrations where version = $1
       ) as migration_recorded,
       to_regprocedure('public.admin_get_system_usage()') is not null as function_exists,
       case
         when to_regprocedure('public.admin_get_system_usage()') is not null
           then has_function_privilege(
             'authenticated',
             'public.admin_get_system_usage()',
             'execute'
           )
         else false
       end as authenticated_can_execute,
       exists (
         select 1 from public.site_settings
         where key = 'system.capacity_limits' and is_public = false
       ) as private_limit_setting,
       to_regprocedure('public.refresh_admin_system_usage_snapshot()') is not null
         as refresh_function_exists,
       exists (
         select 1 from public.site_settings
         where key = 'system.capacity_snapshot' and is_public = false
       ) as private_snapshot_setting,
       exists (
         select 1 from cron.job
         where jobname = 'refresh-admin-system-usage-snapshot'
       ) as refresh_job_exists`,
    [version],
  );
  await sample();

  const checks = after.rows[0] || {};
  if (apply && Object.values(checks).some((value) => value !== true)) {
    throw new Error(`Production verification failed: ${JSON.stringify(checks)}`);
  }

  let ownerUsage = null;
  if (checks.function_exists) {
    await client.query("begin");
    try {
      const owner = await client.query(`
        select user_id::text as user_id
        from public.admin_roles
        where role = 'owner'::public.admin_role
        order by created_at
        limit 1
      `);
      if (!owner.rows[0]?.user_id) throw new Error("Production owner role is missing");
      await client.query(
        "select set_config('request.jwt.claim.sub', $1, true)",
        [owner.rows[0].user_id],
      );
      await client.query("set local role authenticated");
      const runtime = await client.query(
        "select public.admin_get_system_usage() as usage",
      );
      const usage = runtime.rows[0]?.usage || {};
      ownerUsage = {
        databaseBytes: Number(usage.database_bytes),
        storageBytes: Number(usage.storage_bytes),
        storageObjects: Number(usage.storage_objects),
      };
      await client.query("rollback");
    } catch (error) {
      await client.query("rollback").catch(() => {});
      throw error;
    }
  }

  let notificationQueueUsage = null;
  if (apply) {
    const notificationQueue = await client.query(
      "select pg_notification_queue_usage() as usage",
    );
    notificationQueueUsage = Number(notificationQueue.rows[0]?.usage ?? 0);
    await client.query(`
      comment on function public.admin_get_system_usage()
      is 'Owner-only capacity snapshot for the admin system status page.'
    `);
    await client.query("notify pgrst, 'reload schema'");
    await client.query("notify pgrst, 'reload config'");
    await client.query("select pg_notification_queue_usage()");
  }
  const postgrestConnections = await client.query(`
    select count(*)::int as count
    from pg_stat_activity
    where application_name ilike '%postgrest%'
  `);
  const scheduler = await client.query(`
    select
      exists (select 1 from pg_catalog.pg_extension where extname = 'pg_cron') as enabled,
      exists (select 1 from pg_catalog.pg_available_extensions where name = 'pg_cron') as available
  `);

  console.log(JSON.stringify({
    status: "PASS",
    projectRef,
    mode: wasApplied ? "already_applied" : apply ? "applied" : "rolled_back",
    checks,
    ownerUsage,
    notificationQueueUsage,
    postgrestSchemaReloadRequested: apply,
    postgrestConnections: postgrestConnections.rows[0]?.count || 0,
    scheduler: scheduler.rows[0] || null,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }, null, 2));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
