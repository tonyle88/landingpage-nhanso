import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const approval = process.env.PRODUCTION_SEPAY_ATOMIC_FIX_APPROVED?.trim();
const repairOrderId = process.env.REPAIR_PAYMENT_ORDER_ID?.trim() || "";
const apply = process.argv.includes("--apply");

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  (apply && approval !== projectRef) ||
  (repairOrderId && !/^CCP[A-Z0-9]{16,32}$/.test(repairOrderId))
) {
  throw new Error("Refusing to modify an unapproved production project");
}

const migrationPath = resolve(
  root,
  "next-app/supabase/migrations/202607280001_confirm_sepay_booking_atomically.sql",
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
const client = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-sepay-atomic-fix",
});

try {
  await client.connect();
  await sample();
  await client.query("begin");
  await client.query(migration);
  const inTransactionVerification = await client.query(`
    select
      position(
        'booking.sepay_auto_confirmed'
        in pg_get_functiondef(
          'public.process_sepay_webhook(jsonb,text,bigint,text)'::regprocedure
        )
      ) > 0 as confirms_atomically
  `);

  let repairedBooking = null;
  if (repairOrderId) {
    const target = await client.query(
      `
        select b.id, b.public_id
        from public.bookings b
        where b.payment_order_id = $1
          and b.payment_provider = 'sepay'
          and b.status = 'paid'
          and exists (
            select 1
            from public.payment_transactions p
            where p.booking_id = b.id
              and p.provider = 'sepay'
              and p.status = 'paid'
              and p.amount = b.amount
          )
        for update
      `,
      [repairOrderId],
    );
    if (target.rowCount !== 1) {
      throw new Error("The requested paid SePay booking is not repairable");
    }
    const finalized = await client.query(
      `
        select
          (public.finalize_paid_sepay_booking($1::uuid)).status::text
            as status
      `,
      [target.rows[0].id],
    );
    repairedBooking = {
      publicId: target.rows[0].public_id,
      status: finalized.rows[0].status,
    };
  }

  await client.query(apply ? "commit" : "rollback");
  const verification = await client.query(`
    select
      position(
        'booking.sepay_auto_confirmed'
        in pg_get_functiondef(
          'public.process_sepay_webhook(jsonb,text,bigint,text)'::regprocedure
        )
      ) > 0 as confirms_atomically
  `);
  await sample();

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        mode: apply ? "applied" : "rolled_back",
        migrationValidatedInTransaction:
          inTransactionVerification.rows[0].confirms_atomically,
        confirmsAtomically: verification.rows[0].confirms_atomically,
        repairedBooking: apply ? repairedBooking : null,
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
