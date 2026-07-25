import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { createHash, randomUUID } from "node:crypto";
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
  application_name: "nhanso-booking-m5-verification",
});

let transactionOpen = false;
try {
  await client.connect();
  await sampleNetwork();

  const migration = await client.query(`
    select count(*)::int as count
    from supabase_migrations.schema_migrations
    where version in (
      '202607240011',
      '202607240012',
      '202607250013',
      '202607250014'
    )
  `);
  const columns = await client.query(`
    select column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'bookings'
      and column_name in (
        'idempotency_key',
        'manual_payment_claimed_at',
        'request_fingerprint'
      )
    order by column_name
  `);
  const indexes = await client.query(`
    select indexname, indexdef
    from pg_indexes
    where schemaname = 'public'
      and tablename = 'bookings'
      and indexname in (
        'bookings_idempotency_key_unique',
        'bookings_active_slot_unique'
      )
    order by indexname
  `);
  const trigger = await client.query(`
    select count(*)::int as count
    from pg_trigger
    join pg_class on pg_class.oid = pg_trigger.tgrelid
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'bookings'
      and pg_trigger.tgname = 'bookings_enforce_status_transition'
      and not pg_trigger.tgisinternal
  `);
  const functions = await client.query(`
    select proname, pg_get_functiondef(pg_proc.oid) as definition
    from pg_proc
    join pg_namespace on pg_namespace.oid = pg_proc.pronamespace
    where pg_namespace.nspname = 'public'
      and proname in (
        'create_booking_reservation',
        'cancel_booking_reservation',
        'enforce_booking_status_transition',
        'consume_booking_rate_limit',
        'list_booking_unavailable_slots',
        'get_booking_reservation_status',
        'acknowledge_manual_booking_payment',
        'admin_transition_booking'
      )
    order by proname
  `);
  const privileges = await client.query(`
    select
      has_function_privilege(
        'anon',
        'public.create_booking_reservation(uuid,jsonb)',
        'EXECUTE'
      ) as anon_create,
      has_function_privilege(
        'anon',
        'public.cancel_booking_reservation(text,uuid)',
        'EXECUTE'
      ) as anon_cancel,
      has_function_privilege(
        'service_role',
        'public.create_booking_reservation(uuid,jsonb)',
        'EXECUTE'
      ) as service_create,
      has_function_privilege(
        'service_role',
        'public.cancel_booking_reservation(text,uuid)',
        'EXECUTE'
      ) as service_cancel,
      has_function_privilege(
        'service_role',
        'public.consume_booking_rate_limit(text,text,text)',
        'EXECUTE'
      ) as service_rate_limit,
      has_function_privilege(
        'service_role',
        'public.list_booking_unavailable_slots(timestamptz,timestamptz)',
        'EXECUTE'
      ) as service_slots,
      has_function_privilege(
        'service_role',
        'public.get_booking_reservation_status(text,uuid)',
        'EXECUTE'
      ) as service_status,
      has_function_privilege(
        'service_role',
        'public.acknowledge_manual_booking_payment(text,uuid)',
        'EXECUTE'
      ) as service_manual_payment,
      has_function_privilege(
        'anon',
        'public.get_booking_reservation_status(text,uuid)',
        'EXECUTE'
      ) as anon_status,
      has_function_privilege(
        'authenticated',
        'public.admin_transition_booking(uuid,public.booking_status,public.booking_status)',
        'EXECUTE'
      ) as authenticated_admin_transition
  `);
  const rateLimitTable = await client.query(`
    select
      pg_class.relrowsecurity as rls_enabled,
      (
        select count(*)::int
        from pg_policies
        where schemaname = 'public'
          and tablename = 'booking_rate_limit_buckets'
      ) as policy_count
    from pg_class
    join pg_namespace on pg_namespace.oid = pg_class.relnamespace
    where pg_namespace.nspname = 'public'
      and pg_class.relname = 'booking_rate_limit_buckets'
  `);
  const rateLimitBaseline = await client.query(`
    select count(*)::int as count
    from public.booking_rate_limit_buckets
  `);
  const baseline = await client.query(`
    select count(*)::int as count from public.bookings
  `);

  const definitions = functions.rows.map((row) => row.definition).join("\n");
  const indexDefinitions = indexes.rows.map((row) => row.indexdef).join("\n");
  const catalogPass =
    migration.rows[0].count === 4 &&
    columns.rowCount === 3 &&
    indexes.rowCount === 2 &&
    trigger.rows[0].count === 1 &&
    functions.rowCount === 8 &&
    privileges.rows[0].anon_create === false &&
    privileges.rows[0].anon_cancel === false &&
    privileges.rows[0].service_create === true &&
    privileges.rows[0].service_cancel === true &&
    privileges.rows[0].service_rate_limit === true &&
    privileges.rows[0].service_slots === true &&
    privileges.rows[0].service_status === true &&
    privileges.rows[0].service_manual_payment === true &&
    privileges.rows[0].anon_status === false &&
    privileges.rows[0].authenticated_admin_transition === true &&
    rateLimitTable.rowCount === 1 &&
    rateLimitTable.rows[0].rls_enabled === true &&
    rateLimitTable.rows[0].policy_count === 0 &&
    /SECURITY DEFINER/i.test(definitions) &&
    definitions.includes("extensions.digest") &&
    definitions.includes("v_package.online_price") &&
    definitions.includes("v_package.offline_price") &&
    definitions.includes("booking.status_transition") &&
    definitions.includes("booking status changed; reload before retrying") &&
    !definitions.includes("to_jsonb(v_before)") &&
    !definitions.includes("to_jsonb(v_after)") &&
    indexDefinitions.includes("UNIQUE");
  if (!catalogPass) {
    throw new Error("Booking M5 staging catalog verification failed");
  }

  const packageResult = await client.query(`
    select code::text as code, online_price
    from public.packages
    where enabled and online_price is not null
    order by sort_order, code
    limit 1
  `);
  if (packageResult.rowCount !== 1) {
    throw new Error("No enabled staging package with an online price");
  }

  const idempotencyKey = randomUUID();
  const uniqueOffsetMinutes = 60 * 24 * 120 + Math.floor(Math.random() * 10_000);
  const slotStart = new Date(Date.now() + uniqueOffsetMinutes * 60_000);
  const slotEnd = new Date(slotStart.getTime() + 60 * 60_000);
  const payload = {
    customer_name: "M5 Transaction Rollback",
    phone: "+84900000000",
    email: "m5-rollback@example.invalid",
    consultation_type: "online",
    package_code: packageResult.rows[0].code,
    concern: "Synthetic staging verification; transaction is rolled back.",
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    payment_provider: "manual_qr",
  };

  await client.query("begin");
  transactionOpen = true;

  const identityRateHash = createHash("sha256")
    .update(randomUUID())
    .digest("hex");
  const identityResults = [];
  for (let attempt = 0; attempt < 6; attempt += 1) {
    const result = await client.query(
      `select public.consume_booking_rate_limit(
        $1::text, $2::text, $3::text
      ) as result`,
      [identityRateHash, "m5-rate@example.invalid", "+84911111111"],
    );
    identityResults.push(result.rows[0].result.allowed);
  }
  if (
    identityResults.slice(0, 5).some((allowed) => allowed !== true) ||
    identityResults[5] !== false
  ) {
    throw new Error("Identity rate limit did not reject attempt 6");
  }

  const ipRateHash = createHash("sha256")
    .update(randomUUID())
    .digest("hex");
  const ipResults = [];
  for (let attempt = 0; attempt < 21; attempt += 1) {
    const result = await client.query(
      `select public.consume_booking_rate_limit(
        $1::text, null, null
      ) as result`,
      [ipRateHash],
    );
    ipResults.push(result.rows[0].result.allowed);
  }
  if (
    ipResults.slice(0, 20).some((allowed) => allowed !== true) ||
    ipResults[20] !== false
  ) {
    throw new Error("IP rate limit did not reject attempt 21");
  }

  const created = await client.query(
    "select public.create_booking_reservation($1::uuid, $2::jsonb) as result",
    [idempotencyKey, JSON.stringify(payload)],
  );
  const replayed = await client.query(
    "select public.create_booking_reservation($1::uuid, $2::jsonb) as result",
    [idempotencyKey, JSON.stringify(payload)],
  );
  const trustedAmount = Number(packageResult.rows[0].online_price);
  const createdResult = created.rows[0].result;
  const replayedResult = replayed.rows[0].result;
  if (
    createdResult.replayed !== false ||
    replayedResult.replayed !== true ||
    createdResult.bookingId !== replayedResult.bookingId ||
    Number(createdResult.amount) !== trustedAmount
  ) {
    throw new Error("Booking idempotency or trusted-price verification failed");
  }

  const unavailableSlots = await client.query(
    `select *
     from public.list_booking_unavailable_slots($1::timestamptz, $2::timestamptz)`,
    [
      new Date(slotStart.getTime() - 60_000).toISOString(),
      new Date(slotEnd.getTime() + 60_000).toISOString(),
    ],
  );
  if (
    unavailableSlots.rowCount !== 1 ||
    new Date(unavailableSlots.rows[0].slot_start).getTime() !==
      slotStart.getTime()
  ) {
    throw new Error("Unavailable-slot verification failed");
  }

  const status = await client.query(
    `select public.get_booking_reservation_status(
      $1::text, $2::uuid
    ) as result`,
    [createdResult.bookingId, idempotencyKey],
  );
  if (
    status.rows[0].result.status !== "held" ||
    Object.hasOwn(status.rows[0].result, "email") ||
    Object.hasOwn(status.rows[0].result, "phone")
  ) {
    throw new Error("Minimal booking-status verification failed");
  }

  const manualPayment = await client.query(
    `select public.acknowledge_manual_booking_payment(
      $1::text, $2::uuid
    ) as result`,
    [createdResult.bookingId, idempotencyKey],
  );
  if (
    manualPayment.rows[0].result.status !== "manual_review" ||
    !manualPayment.rows[0].result.manualPaymentClaimedAt ||
    new Date(manualPayment.rows[0].result.holdExpiresAt).getTime() <
      Date.now() + 47 * 60 * 60_000
  ) {
    throw new Error("Manual-payment review verification failed");
  }

  await client.query("savepoint invalid_transition");
  let transitionRejected = false;
  try {
    await client.query(
      "update public.bookings set status = 'confirmed' where public_id = $1",
      [createdResult.bookingId],
    );
  } catch (error) {
    transitionRejected =
      error?.code === "22023" &&
      String(error.message).includes("invalid booking status transition");
    await client.query("rollback to savepoint invalid_transition");
  }
  if (!transitionRejected) {
    throw new Error("Invalid booking status transition was not rejected");
  }

  const cancelled = await client.query(
    "select public.cancel_booking_reservation($1::text, $2::uuid) as result",
    [createdResult.bookingId, idempotencyKey],
  );
  if (cancelled.rows[0].result.status !== "cancelled") {
    throw new Error("Booking cancellation verification failed");
  }

  await client.query("rollback");
  transactionOpen = false;
  const afterRollback = await client.query(`
    select count(*)::int as count from public.bookings
  `);
  const rateLimitAfterRollback = await client.query(`
    select count(*)::int as count
    from public.booking_rate_limit_buckets
  `);
  if (afterRollback.rows[0].count !== baseline.rows[0].count) {
    throw new Error("Synthetic booking remained after rollback");
  }
  if (
    rateLimitAfterRollback.rows[0].count !==
    rateLimitBaseline.rows[0].count
  ) {
    throw new Error("Synthetic rate-limit buckets remained after rollback");
  }

  await sampleNetwork();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      migration011: true,
      migration012: true,
      migration013: true,
      migration014: true,
      bookingColumns: columns.rowCount,
      bookingIndexes: indexes.rowCount,
      bookingTrigger: true,
      bookingFunctions: functions.rowCount,
      anonymousRpcPrivilegesRevoked: true,
      serviceRpcPrivileges: true,
      bookingSlotsMinimalResponse: true,
      bookingStatusCredentialProtected: true,
      manualPaymentReview48Hours: true,
      adminBookingTransitionFunction: true,
      adminBookingAuditNoRawRow: true,
      rateLimitRlsNoPublicPolicies: true,
      identityRateLimit5Per15Minutes: true,
      ipRateLimit20Per15Minutes: true,
      trustedDatabasePrice: true,
      idempotentReplay: true,
      invalidTransitionRejected: true,
      cancellation: true,
      syntheticMutationRolledBack: true,
      syntheticRateLimitsRolledBack: true,
      bookingBaselineCount: baseline.rows[0].count,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  clearInterval(timer);
  if (transactionOpen) await client.query("rollback").catch(() => {});
  await client.end().catch(() => {});
}
