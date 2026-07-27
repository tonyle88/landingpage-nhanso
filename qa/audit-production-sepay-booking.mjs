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
const orderId = process.env.PAYMENT_ORDER_ID?.trim();
const finalizeProbeApproved =
  process.env.SEPAY_FINALIZE_PROBE_APPROVED?.trim() === orderId;

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  !/^CCP[A-Z0-9]{16,32}$/.test(orderId || "")
) {
  throw new Error("Refusing to inspect an unapproved production booking");
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
  application_name: "nhanso-production-sepay-booking-audit",
});

try {
  await client.connect();
  await sample();
  await client.query(
    finalizeProbeApproved
      ? "begin transaction isolation level repeatable read"
      : "begin transaction isolation level repeatable read read only",
  );

  const booking = await client.query(
    `
      select
        id,
        public_id,
        payment_provider,
        payment_order_id,
        amount,
        status::text,
        hold_expires_at,
        confirmed_at,
        created_at,
        updated_at
      from public.bookings
      where payment_order_id = $1
    `,
    [orderId],
  );
  const bookingId = booking.rows[0]?.id;
  const payments = bookingId
    ? await client.query(
        `
          select
            provider,
            provider_transaction_id,
            order_id,
            amount,
            status::text,
            occurred_at,
            created_at
          from public.payment_transactions
          where booking_id = $1
          order by created_at desc
        `,
        [bookingId],
      )
    : { rows: [] };
  const webhooks = payments.rows.length
    ? await client.query(
        `
          select
            event_id,
            event_type,
            signature_valid,
            status::text,
            attempts,
            error_message,
            received_at,
            processed_at
          from public.webhook_events
          where provider = 'sepay'
            and event_id = any($1::text[])
          order by received_at desc
        `,
        [payments.rows.map((payment) => payment.provider_transaction_id)],
      )
    : { rows: [] };
  const audits = bookingId
    ? await client.query(
        `
          select action, status, message, created_at
          from public.audit_logs
          where target_type = 'booking'
            and target_id = $1::text
          order by created_at
        `,
        [bookingId],
      )
    : { rows: [] };
  const functionState = await client.query(`
    select
      to_regprocedure('public.finalize_paid_sepay_booking(uuid)') is not null
        as finalize_function_exists,
      has_function_privilege(
        'service_role',
        'public.finalize_paid_sepay_booking(uuid)',
        'execute'
      ) as service_role_can_finalize
  `);
  const finalizeProbe =
    finalizeProbeApproved && bookingId
      ? await client.query(
          `
            select
              (public.finalize_paid_sepay_booking($1::uuid)).status::text
                as resulting_status
          `,
          [bookingId],
        )
      : { rows: [] };

  await client.query(finalizeProbeApproved ? "rollback" : "commit");
  await sample();
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        booking: booking.rows[0] || null,
        payments: payments.rows,
        webhooks: webhooks.rows,
        audits: audits.rows,
        functionState: functionState.rows[0],
        finalizeProbeRolledBack: finalizeProbe.rows[0] || null,
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
