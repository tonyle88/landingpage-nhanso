import { createHash } from "node:crypto";
import { execFile } from "node:child_process";
import { chmod, mkdir, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const approval = process.env.PRODUCTION_HYPERCARE_SNAPSHOT_APPROVED?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  approval !== projectRef ||
  !password
) {
  throw new Error("Refusing to snapshot an unapproved production project");
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
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-hypercare-snapshot",
});

const canonicalHash = (value) =>
  createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex");

try {
  await client.connect();
  await sample();
  await client.query("begin transaction isolation level repeatable read read only");

  const catalog = await client.query(`
    select
      (select count(*)::int from information_schema.tables
       where table_schema = 'public' and table_type = 'BASE TABLE') as tables,
      (select count(*)::int from pg_policies where schemaname = 'public') as policies,
      (select count(*)::int from pg_class c join pg_namespace n on n.oid = c.relnamespace
       where n.nspname = 'public' and c.relkind = 'r' and c.relrowsecurity) as rls_tables
  `);
  const identity = await client.query(`
    select
      (select count(*)::int from auth.users) as auth_users,
      (select count(*)::int from public.profiles) as profiles,
      (select count(*)::int from public.admin_roles where role = 'owner') as owners
  `);
  const publicCounts = await client.query(`
    select
      (select count(*)::int from public.site_settings) as settings,
      (select count(*)::int from public.landing_sections) as sections,
      (select count(*)::int from public.packages) as packages,
      (select count(*)::int from public.testimonials) as testimonials,
      (select count(*)::int from public.blog_categories) as categories,
      (select count(*)::int from public.blog_posts) as posts,
      (select count(*)::int from public.media_assets) as media_assets,
      (select count(*)::int from storage.objects where bucket_id = 'content-images') as storage_objects
  `);
  const publicHashes = await client.query(`
    select
      (select coalesce(jsonb_agg(to_jsonb(t) order by key), '[]'::jsonb)
       from public.site_settings t) as settings,
      (select coalesce(jsonb_agg(to_jsonb(t) order by section_key), '[]'::jsonb)
       from public.landing_sections t) as sections,
      (select coalesce(jsonb_agg(to_jsonb(t) order by code), '[]'::jsonb)
       from public.packages t) as packages,
      (select coalesce(jsonb_agg(to_jsonb(t) order by sort_order, id), '[]'::jsonb)
       from public.testimonials t) as testimonials,
      (select coalesce(jsonb_agg(to_jsonb(t) order by slug), '[]'::jsonb)
       from public.blog_categories t) as categories,
      (select coalesce(jsonb_agg(to_jsonb(t) order by slug), '[]'::jsonb)
       from public.blog_posts t) as posts,
      (select coalesce(jsonb_agg(to_jsonb(t) order by bucket, object_path), '[]'::jsonb)
       from public.media_assets t) as media_assets
  `);
  const operational = await client.query(`
    select jsonb_build_object(
      'bookings', (select coalesce(jsonb_object_agg(status, count), '{}'::jsonb)
        from (select status::text, count(*)::int from public.bookings group by status) s),
      'payments', (select coalesce(jsonb_object_agg(status, count), '{}'::jsonb)
        from (select status::text, count(*)::int from public.payment_transactions group by status) s),
      'webhooks', (select coalesce(jsonb_object_agg(status, count), '{}'::jsonb)
        from (select status::text, count(*)::int from public.webhook_events group by status) s),
      'failed_webhooks_last_hour', (select count(*)::int from public.webhook_events
        where status = 'failed' and received_at >= now() - interval '1 hour'),
      'audit_events_last_hour', (select count(*)::int from public.audit_logs
        where created_at >= now() - interval '1 hour')
    ) as summary
  `);
  await client.query("commit");
  await sample();

  const hashes = Object.fromEntries(
    Object.entries(publicHashes.rows[0]).map(([key, value]) => [
      key,
      canonicalHash(value),
    ]),
  );
  const capturedAt = new Date().toISOString();
  const snapshot = {
    schemaVersion: 1,
    capturedAt,
    projectRef,
    catalog: catalog.rows[0],
    identity: identity.rows[0],
    publicCounts: publicCounts.rows[0],
    publicHashes: hashes,
    operational: operational.rows[0].summary,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  };
  snapshot.snapshotSha256 = canonicalHash(snapshot);

  const directory = resolve(root, ".staging-import");
  await mkdir(directory, { recursive: true, mode: 0o700 });
  const stamp = capturedAt.replace(/[:.]/g, "-");
  const output = resolve(directory, `m10-production-final-${stamp}.json`);
  await writeFile(output, `${JSON.stringify(snapshot, null, 2)}\n`, {
    mode: 0o600,
    flag: "wx",
  });
  await chmod(output, 0o600);
  console.log(JSON.stringify({
    status: "PASS",
    output,
    mode: "0600",
    snapshotSha256: snapshot.snapshotSha256,
    catalog: snapshot.catalog,
    identity: snapshot.identity,
    publicCounts: snapshot.publicCounts,
    operational: snapshot.operational,
    networkEvidence: snapshot.networkEvidence,
    networkEvidenceCaptured: snapshot.networkEvidenceCaptured,
  }));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
