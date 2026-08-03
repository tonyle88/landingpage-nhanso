import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { Client } = requireFromApp("pg");
const expectedProjectRef = "nuexmwyyibhkfcisaavw";
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;

if (projectRef !== expectedProjectRef || !password) {
  throw new Error("Refusing to inspect an unapproved production project");
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
const client = new Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-numerology-vault-verification",
});

try {
  await client.connect();
  await sample();
  const migration = await client.query(`
      select count(*)::int as count
      from supabase_migrations.schema_migrations
      where version = '202608030002'
    `);
  const policies = await client.query(`
      select policyname, cmd, coalesce(qual, '') as qual,
        coalesce(with_check, '') as with_check
      from pg_policies
      where schemaname = 'public' and tablename = 'numerology_records'
      order by policyname
    `);
  const indexes = await client.query(`
      select indexname, indexdef
      from pg_indexes
      where schemaname = 'public' and tablename = 'numerology_records'
      order by indexname
    `);
  const setting = await client.query(`
      select (value->>'limit')::int as limit, description
      from public.site_settings
      where key = 'admin.numerology_history_limit'
    `);
  const records = await client.query(`
      select count(*)::int as total,
        count(created_by)::int as owned,
        count(*) filter (where created_by is null)::int as unowned
      from public.numerology_records
    `);
  const constraints = await client.query(`
      select conname
      from pg_constraint
      where conrelid = 'public.numerology_records'::regclass
        and conname in (
          'numerology_records_full_pdf_path_check',
          'numerology_records_a4_image_path_check'
      )
      order by conname
    `);

  const readPolicy = policies.rows.find((row) => row.policyname === "numerology_records_owner_read");
  const writePolicy = policies.rows.find((row) => row.policyname === "numerology_records_owner_write");
  const ownerCustomer = indexes.rows.find((row) => row.indexname === "numerology_records_owner_customer_key");
  const ownerReport = indexes.rows.find((row) => row.indexname === "numerology_records_owner_report_number_key");
  const ownerRecent = indexes.rows.find((row) => row.indexname === "numerology_records_owner_recent_idx");
  const configuredLimit = setting.rows[0]?.limit;
  const checks = {
    migrationRecorded: migration.rows[0]?.count === 1,
    ownerReadPolicy: Boolean(readPolicy?.qual.includes("created_by") && readPolicy.qual.includes("uid()")),
    ownerWritePolicy: Boolean(
      writePolicy?.qual.includes("created_by") &&
      writePolicy.with_check.includes("created_by") &&
      writePolicy.with_check.includes("uid()")
    ),
    legacyAdminReadPolicyRemoved: !policies.rows.some((row) => row.policyname === "numerology_records_admin_read"),
    ownerCustomerUnique: Boolean(ownerCustomer?.indexdef.includes("created_by, normalized_name, birth_date")),
    ownerReportUnique: Boolean(ownerReport?.indexdef.includes("created_by, report_number")),
    ownerRecentIndex: Boolean(ownerRecent?.indexdef.includes("created_by, updated_at DESC, id DESC")),
    configurableLimit: Number.isInteger(configuredLimit) && configuredLimit >= 20 && configuredLimit <= 1000,
    pathChecks: constraints.rowCount === 2,
  };
  if (Object.values(checks).some((value) => !value)) {
    throw new Error(`Production verification failed: ${JSON.stringify(checks)}`);
  }
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    checks,
    configuredLimit,
    recordOwnership: records.rows[0],
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }, null, 2));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
