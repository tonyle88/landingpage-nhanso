import { createHash, randomUUID } from "node:crypto";
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

const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-sepay-m6-verification",
});

const hashPayload = (payload) =>
  createHash("sha256").update(JSON.stringify(payload), "utf8").digest("hex");
const transactionId = () =>
  `${Math.floor(Date.now() / 1000)}${Math.floor(Math.random() * 100_000)
    .toString()
    .padStart(5, "0")}`;

let transactionOpen = false;
try {
  await client.connect();
  await sampleNetwork();

  const migration = await client.query(`
    select count(*)::int as count
    from supabase_migrations.schema_migrations
    where version = '202607250015'
  `);
  const columns = await client.query(`
    select column_name
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'webhook_events'
      and column_name in ('payload_sha256', 'signature_timestamp')
  `);
  const definition = await client.query(`
    select pg_get_functiondef(pg_proc.oid) as definition
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and pg_proc.proname = 'process_sepay_webhook'
  `);
  const privileges = await client.query(`
    select
      has_function_privilege(
        'service_role',
        'public.process_sepay_webhook(jsonb,text,bigint,text)',
        'EXECUTE'
      ) as service_execute,
      has_function_privilege(
        'anon',
        'public.process_sepay_webhook(jsonb,text,bigint,text)',
        'EXECUTE'
      ) as anon_execute,
      has_function_privilege(
        'authenticated',
        'public.process_sepay_webhook(jsonb,text,bigint,text)',
        'EXECUTE'
      ) as authenticated_execute
  `);
  const sql = definition.rows[0]?.definition || "";
  if (
    migration.rows[0].count !== 1 ||
    columns.rowCount !== 2 ||
    definition.rowCount !== 1 ||
    privileges.rows[0].service_execute !== true ||
    privileges.rows[0].anon_execute !== false ||
    privileges.rows[0].authenticated_execute !== false ||
    !/SECURITY DEFINER/i.test(sql) ||
    !sql.includes("account_mismatch") ||
    !sql.includes("amount_mismatch") ||
    !sql.includes("booking.payment_verified")
  ) {
    throw new Error("SePay M6 catalog verification failed");
  }

  const baseline = await client.query(`
    select
      (select count(*)::int from public.bookings) as bookings,
      (select count(*)::int from public.webhook_events) as events,
      (select count(*)::int from public.payment_transactions) as payments
  `);
  const packageResult = await client.query(`
    select code::text as code, online_price
    from public.packages
    where enabled and online_price is not null
    order by sort_order, code
    limit 1
  `);
  if (packageResult.rowCount !== 1) {
    throw new Error("No enabled package for SePay verification");
  }

  await client.query("begin");
  transactionOpen = true;
  const idempotencyKey = randomUUID();
  const slotStart = new Date(
    Date.now() + (150 * 24 * 60 + Math.floor(Math.random() * 10_000)) * 60_000,
  );
  const reservation = await client.query(
    `select public.create_booking_reservation($1::uuid, $2::jsonb) as result`,
    [
      idempotencyKey,
      {
        customer_name: "M6 Synthetic Cleanup",
        date_of_birth: "1990-01-01",
        phone: "+84944444444",
        email: `m6-${idempotencyKey}@example.invalid`,
        consultation_type: "online",
        package_code: packageResult.rows[0].code,
        concern: "Synthetic SePay verifier; transaction rolled back.",
        slot_start: slotStart.toISOString(),
        slot_end: new Date(slotStart.getTime() + 2 * 60 * 60_000).toISOString(),
        payment_provider: "sepay",
      },
    ],
  );
  const booking = reservation.rows[0].result;
  const eventId = transactionId();
  const expectedAccount = "M6-SYNTHETIC-ACCOUNT";
  const payload = {
    id: Number(eventId),
    gateway: "SyntheticBank",
    transactionDate: "2026-07-25 12:00:00",
    accountNumber: expectedAccount,
    subAccount: "",
    code: booking.paymentOrderId,
    content: `${booking.paymentOrderId} synthetic`,
    transferType: "in",
    description: "",
    transferAmount: Number(booking.amount),
    accumulated: 0,
    referenceCode: `SYN-${eventId}`,
  };
  const processed = await client.query(
    `select public.process_sepay_webhook(
      $1::jsonb, $2::text, $3::bigint, $4::text
    ) as result`,
    [
      payload,
      hashPayload(payload),
      Math.floor(Date.now() / 1000),
      expectedAccount,
    ],
  );
  if (
    processed.rows[0].result.processed !== true ||
    processed.rows[0].result.duplicate !== false
  ) {
    throw new Error("Valid SePay transaction was not processed");
  }

  const state = await client.query(
    `select
      (select status::text from public.bookings
       where idempotency_key = $1) as booking_status,
      (select count(*)::int from public.payment_transactions
       where provider = 'sepay' and provider_transaction_id = $2) as payments,
      (select status::text from public.webhook_events
       where provider = 'sepay' and event_id = $2) as event_status,
      (select count(*)::int from public.audit_logs
       where action = 'booking.payment_verified'
         and target_id = (
           select id::text from public.bookings where idempotency_key = $1
         )) as audits`,
    [idempotencyKey, eventId],
  );
  if (
    state.rows[0].booking_status !== "paid" ||
    state.rows[0].payments !== 1 ||
    state.rows[0].event_status !== "processed" ||
    state.rows[0].audits !== 1
  ) {
    throw new Error("Atomic SePay booking/payment/audit state failed");
  }

  const replay = await client.query(
    `select public.process_sepay_webhook(
      $1::jsonb, $2::text, $3::bigint, $4::text
    ) as result`,
    [
      payload,
      hashPayload(payload),
      Math.floor(Date.now() / 1000),
      expectedAccount,
    ],
  );
  if (
    replay.rows[0].result.processed !== true ||
    replay.rows[0].result.duplicate !== true
  ) {
    throw new Error("Duplicate SePay transaction did not replay safely");
  }

  const afterReplay = await client.query(
    `select count(*)::int as count
     from public.payment_transactions
     where provider = 'sepay' and provider_transaction_id = $1`,
    [eventId],
  );
  if (afterReplay.rows[0].count !== 1) {
    throw new Error("Duplicate SePay transaction created a second payment");
  }

  await client.query("rollback");
  transactionOpen = false;
  const afterRollback = await client.query(`
    select
      (select count(*)::int from public.bookings) as bookings,
      (select count(*)::int from public.webhook_events) as events,
      (select count(*)::int from public.payment_transactions) as payments
  `);
  if (
    JSON.stringify(afterRollback.rows[0]) !==
    JSON.stringify(baseline.rows[0])
  ) {
    throw new Error("Synthetic SePay verification data remained after rollback");
  }

  await sampleNetwork();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      migration015: true,
      inboxColumns: columns.rowCount,
      serviceOnlyRpc: true,
      validPaymentAtomic: true,
      duplicateReplaySafe: true,
      duplicatePaymentRows: 0,
      syntheticMutationRolledBack: true,
      bookingBaselineCount: baseline.rows[0].bookings,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  if (transactionOpen) await client.query("rollback").catch(() => {});
  await client.end().catch(() => {});
}
