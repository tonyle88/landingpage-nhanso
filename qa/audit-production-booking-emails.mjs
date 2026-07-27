import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;

if (projectRef !== "nuexmwyyibhkfcisaavw" || !password) {
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
const client = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-booking-email-audit",
});

try {
  await client.connect();
  await sample();
  await client.query("begin transaction isolation level repeatable read read only");
  const result = await client.query(`
    select
      b.public_id,
      b.status::text,
      b.confirmed_at,
      exists (
        select 1 from public.audit_logs a
        where a.target_type = 'booking'
          and a.target_id = b.id::text
          and a.action = 'booking.email.customer.sent'
          and a.status = 'success'
      ) as customer_email_recorded,
      exists (
        select 1 from public.audit_logs a
        where a.target_type = 'booking'
          and a.target_id = b.id::text
          and a.action = 'booking.email.owner.sent'
          and a.status = 'success'
      ) as owner_email_recorded
    from public.bookings b
    where b.status = 'confirmed'
    order by b.confirmed_at desc nulls last, b.created_at desc
    limit 20
  `);
  await client.query("commit");
  await sample();

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        confirmedBookings: result.rows,
        networkEvidence: [...evidence].sort(),
        networkEvidenceCaptured: evidence.size > 0,
      },
      null,
      2,
    ),
  );
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
