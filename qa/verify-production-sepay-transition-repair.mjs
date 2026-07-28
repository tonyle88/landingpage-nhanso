import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const orderId = process.env.PAYMENT_ORDER_ID?.trim();
const approval = process.env.SEPAY_TRANSITION_REPAIR_PROBE_APPROVED?.trim();

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  !/^CCP[A-Z0-9]{16,32}$/.test(orderId || "") ||
  approval !== orderId
) {
  throw new Error("Refusing to probe an unapproved production booking");
}

const migrationPath = resolve(
  root,
  "next-app/supabase/migrations/202607280004_fix_sepay_duplicate_transitions.sql",
);
const migration = await readFile(migrationPath, "utf8");
const migrationBody = migration.match(/^begin;\n([\s\S]*)\ncommit;\s*$/)?.[1];
if (!migrationBody) {
  throw new Error("Unexpected migration transaction wrapper");
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
  application_name: "nhanso-production-sepay-transition-repair-probe",
});

try {
  await client.connect();
  await sample();
  await client.query("begin transaction isolation level serializable");
  await client.query(migrationBody);

  const booking = await client.query(
    `
      select id, amount, status::text
      from public.bookings
      where payment_order_id = $1
      for update
    `,
    [orderId],
  );
  if (booking.rowCount !== 1 || booking.rows[0].status !== "held") {
    throw new Error("Target booking is not in the expected held state");
  }

  const result = await client.query(
    `
      select public.process_sepay_webhook(
        $1::jsonb,
        repeat('b', 64),
        extract(epoch from now())::bigint,
        $2
      ) as result
    `,
    [
      JSON.stringify({
        id: "999999999999999998",
        gateway: "BIDV",
        transferType: "in",
        accountNumber: "962470907072634TONY",
        subAccount: "962470907072634TONY",
        transferAmount: String(booking.rows[0].amount),
        code: orderId,
        content: orderId,
        transactionDate: "2026-07-28 09:00:00",
        referenceCode: "transition-repair-probe",
      }),
      "962470907072634TONY",
    ],
  );
  const verification = await client.query(
    `
      select
        b.status::text,
        count(*) filter (
          where a.action = 'booking.sepay_auto_confirmed'
        )::integer as auto_confirmation_audits
      from public.bookings b
      left join public.audit_logs a
        on a.target_type = 'booking'
        and a.target_id = b.id::text
      where b.payment_order_id = $1
      group by b.status
    `,
    [orderId],
  );

  if (
    result.rows[0]?.result?.processed !== true ||
    verification.rows[0]?.status !== "confirmed" ||
    verification.rows[0]?.auto_confirmation_audits !== 1
  ) {
    throw new Error("Transition repair did not confirm the booking exactly once");
  }

  await client.query("rollback");
  await sample();
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        result: result.rows[0].result,
        resultingBookingStatus: verification.rows[0].status,
        autoConfirmationAudits: verification.rows[0].auto_confirmation_audits,
        rolledBack: true,
        networkEvidence: [...evidence].sort(),
        networkEvidenceCaptured: evidence.size > 0,
      },
      null,
      2,
    ),
  );
} catch (error) {
  await client.query("rollback").catch(() => {});
  throw error;
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
