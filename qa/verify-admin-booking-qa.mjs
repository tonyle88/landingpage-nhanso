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

const networkEvidence = new Set();
const sampleNetwork = async () => {
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
      if (match) networkEvidence.add(match[1]);
    }
  } catch {}
};

const timer = setInterval(sampleNetwork, 25);
const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-admin-booking-qa-verification",
});

try {
  await client.connect();
  await sampleNetwork();

  const result = await client.query(`
    with latest_booking as (
      select id, status, confirmed_at, manual_payment_claimed_at
      from public.bookings
      order by created_at desc
      limit 1
    ),
    transitions as (
      select
        count(*)::int as count,
        array_agg(
          (before_data->>'status') || '->' || (after_data->>'status')
          order by created_at
        ) as path,
        bool_and(
          before_data ? 'status'
          and before_data ? 'manual_payment_claimed'
          and after_data ? 'status'
          and after_data ? 'manual_payment_claimed'
          and before_data - array['status', 'manual_payment_claimed'] = '{}'::jsonb
          and after_data - array['status', 'manual_payment_claimed'] = '{}'::jsonb
        ) as metadata_only
      from public.audit_logs
      join latest_booking on target_id = latest_booking.id::text
      where action = 'booking.status_transition'
        and target_type = 'booking'
    )
    select
      (select count(*)::int from public.bookings) as booking_count,
      latest_booking.status::text as latest_status,
      latest_booking.confirmed_at is not null as has_confirmed_at,
      latest_booking.manual_payment_claimed_at is not null
        as has_manual_payment_claim,
      transitions.count as transition_count,
      transitions.path as transition_path,
      coalesce(transitions.metadata_only, false) as audit_metadata_only
    from latest_booking
    cross join transitions
  `);

  if (result.rowCount !== 1) {
    throw new Error("Expected one latest staging booking");
  }

  const summary = result.rows[0];
  const expectedPath = ["held->paid", "paid->confirmed"];
  const pass =
    summary.booking_count === 1 &&
    summary.latest_status === "confirmed" &&
    summary.has_confirmed_at === true &&
    summary.has_manual_payment_claim === true &&
    summary.transition_count === 2 &&
    JSON.stringify(summary.transition_path) === JSON.stringify(expectedPath) &&
    summary.audit_metadata_only === true;

  if (!pass) {
    throw new Error("Admin booking live QA verification failed");
  }

  await sampleNetwork();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      bookingCount: summary.booking_count,
      latestStatus: summary.latest_status,
      confirmedAtRecorded: summary.has_confirmed_at,
      manualPaymentClaimRecorded: summary.has_manual_payment_claim,
      transitionCount: summary.transition_count,
      transitionPath: summary.transition_path,
      auditMetadataOnly: summary.audit_metadata_only,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
