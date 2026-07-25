import { createHmac, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const baseUrl = process.env.SEPAY_WEBHOOK_BASE_URL || "http://127.0.0.1:3300";
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const secret =
  process.env.SEPAY_ROUTE_QA_SECRET || "m6-synthetic-route-secret";
const expectedAccount =
  process.env.SEPAY_ROUTE_QA_EXPECTED_ACCOUNT || "M6-SYNTHETIC-ACCOUNT";
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};

const isLocalTarget = /^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl);
const isPublicStagingTarget =
  baseUrl === "https://nhanso-staging.vercel.app";
if (
  (!isLocalTarget && !isPublicStagingTarget) ||
  !projectRef ||
  !password ||
  !stagingHosts[projectRef] ||
  !secret ||
  !expectedAccount
) {
  throw new Error("Refusing to run SePay route QA outside approved staging");
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
  application_name: "nhanso-sepay-route-qa",
});

const makeTransactionId = () =>
  `${Math.floor(Date.now() / 1000)}${Math.floor(Math.random() * 100_000)
    .toString()
    .padStart(5, "0")}`;
const sign = (rawBody, timestamp) =>
  `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
const postRaw = async (rawBody, timestamp, signature = sign(rawBody, timestamp)) => {
  const response = await fetch(`${baseUrl}/api/sepay-webhook`, {
    method: "POST",
    cache: "no-store",
    headers: {
      "content-type": "application/json",
      "x-sepay-signature": signature,
      "x-sepay-timestamp": timestamp,
    },
    body: rawBody,
  });
  return { response, data: await response.json() };
};

const bookingIds = [];
const eventIds = [];
let baseline;
try {
  await client.connect();
  await sampleNetwork();
  const baselineResult = await client.query(`
    select
      (select count(*)::int from public.bookings) as bookings,
      (select count(*)::int from public.webhook_events) as events,
      (select count(*)::int from public.payment_transactions) as payments
  `);
  baseline = baselineResult.rows[0];
  const packageResult = await client.query(`
    select code::text as code
    from public.packages
    where enabled and online_price is not null
    order by sort_order, code
    limit 1
  `);
  if (packageResult.rowCount !== 1) {
    throw new Error("No enabled package for SePay route QA");
  }

  const createBooking = async (offsetDays) => {
    const idempotencyKey = randomUUID();
    const slotStart = new Date(
      Date.now() +
        (offsetDays * 24 * 60 + Math.floor(Math.random() * 1_000)) * 60_000,
    );
    const result = await client.query(
      `select public.create_booking_reservation($1::uuid, $2::jsonb) as result`,
      [
        idempotencyKey,
        {
          customer_name: "M6 Route Synthetic Cleanup",
          date_of_birth: "1990-01-01",
          phone: "+84955555555",
          email: `m6-route-${idempotencyKey}@example.invalid`,
          consultation_type: "online",
          package_code: packageResult.rows[0].code,
          concern: "Synthetic SePay route QA; cleaned immediately.",
          slot_start: slotStart.toISOString(),
          slot_end: new Date(
            slotStart.getTime() + 2 * 60 * 60_000,
          ).toISOString(),
          payment_provider: "sepay",
        },
      ],
    );
    const booking = result.rows[0].result;
    const row = await client.query(
      "select id from public.bookings where idempotency_key = $1",
      [idempotencyKey],
    );
    bookingIds.push(row.rows[0].id);
    return booking;
  };

  const validBooking = await createBooking(145);
  const mismatchBooking = await createBooking(150);
  const now = String(Math.floor(Date.now() / 1000));
  const validEventId = makeTransactionId();
  const validPayload = {
    id: Number(validEventId),
    gateway: "SyntheticBank",
    transactionDate: "2026-07-25 12:00:00",
    accountNumber: expectedAccount,
    subAccount: "",
    code: validBooking.paymentOrderId,
    content: `${validBooking.paymentOrderId} synthetic`,
    transferType: "in",
    description: "",
    transferAmount: Number(validBooking.amount),
    accumulated: 0,
    referenceCode: `SYN-${validEventId}`,
  };
  eventIds.push(validEventId);
  const validRaw = JSON.stringify(validPayload);
  const valid = await postRaw(validRaw, now);
  await sampleNetwork();
  if (
    valid.response.status !== 200 ||
    JSON.stringify(valid.data) !== JSON.stringify({ success: true })
  ) {
    throw new Error("Valid signed SePay route callback failed");
  }

  const duplicate = await postRaw(validRaw, now);
  await sampleNetwork();
  if (
    duplicate.response.status !== 200 ||
    JSON.stringify(duplicate.data) !== JSON.stringify({ success: true })
  ) {
    throw new Error("Duplicate SePay route callback failed");
  }

  const tamperedEventId = makeTransactionId();
  const tamperedPayload = { ...validPayload, id: Number(tamperedEventId) };
  const originalTamperedRaw = JSON.stringify(tamperedPayload);
  const modifiedTamperedRaw = JSON.stringify({
    ...tamperedPayload,
    transferAmount: Number(validBooking.amount) + 1,
  });
  const tampered = await postRaw(
    modifiedTamperedRaw,
    now,
    sign(originalTamperedRaw, now),
  );
  await sampleNetwork();
  if (tampered.response.status !== 401 || tampered.data.success === true) {
    throw new Error("Tampered SePay callback was not rejected");
  }

  const expiredEventId = makeTransactionId();
  const expiredRaw = JSON.stringify({
    ...validPayload,
    id: Number(expiredEventId),
  });
  const expiredTimestamp = String(Number(now) - 301);
  const expired = await postRaw(expiredRaw, expiredTimestamp);
  await sampleNetwork();
  if (expired.response.status !== 401 || expired.data.success === true) {
    throw new Error("Expired SePay callback was not rejected");
  }

  const wrongAmountEventId = makeTransactionId();
  eventIds.push(wrongAmountEventId);
  const wrongAmountRaw = JSON.stringify({
    ...validPayload,
    id: Number(wrongAmountEventId),
    code: mismatchBooking.paymentOrderId,
    content: `${mismatchBooking.paymentOrderId} synthetic`,
    transferAmount: Number(mismatchBooking.amount) + 1,
  });
  const wrongAmount = await postRaw(wrongAmountRaw, now);
  await sampleNetwork();
  if (
    wrongAmount.response.status !== 200 ||
    wrongAmount.data.success !== true
  ) {
    throw new Error("Signed amount mismatch was not acknowledged safely");
  }

  const wrongAccountEventId = makeTransactionId();
  eventIds.push(wrongAccountEventId);
  const wrongAccountRaw = JSON.stringify({
    ...validPayload,
    id: Number(wrongAccountEventId),
    code: mismatchBooking.paymentOrderId,
    content: `${mismatchBooking.paymentOrderId} synthetic`,
    accountNumber: "WRONG-SYNTHETIC-ACCOUNT",
  });
  const wrongAccount = await postRaw(wrongAccountRaw, now);
  await sampleNetwork();
  if (
    wrongAccount.response.status !== 200 ||
    wrongAccount.data.success !== true
  ) {
    throw new Error("Signed account mismatch was not acknowledged safely");
  }

  const state = await client.query(
    `select
      (select status::text from public.bookings where id = $1) as valid_status,
      (select status::text from public.bookings where id = $2) as mismatch_status,
      (select count(*)::int from public.payment_transactions
       where provider = 'sepay' and provider_transaction_id = $3) as valid_payments,
      (select attempts from public.webhook_events
       where provider = 'sepay' and event_id = $3) as valid_attempts,
      (select count(*)::int from public.webhook_events
       where provider = 'sepay'
         and event_id in ($4, $5)) as rejected_events,
      (select count(*)::int from public.webhook_events
       where provider = 'sepay'
         and event_id in ($6, $7)
         and status = 'ignored') as ignored_events`,
    [
      bookingIds[0],
      bookingIds[1],
      validEventId,
      tamperedEventId,
      expiredEventId,
      wrongAmountEventId,
      wrongAccountEventId,
    ],
  );
  if (
    state.rows[0].valid_status !== "paid" ||
    state.rows[0].mismatch_status !== "held" ||
    state.rows[0].valid_payments !== 1 ||
    state.rows[0].valid_attempts !== 2 ||
    state.rows[0].rejected_events !== 0 ||
    state.rows[0].ignored_events !== 2
  ) {
    throw new Error("SePay route persistence verification failed");
  }

  await sampleNetwork();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: baseUrl,
      staging: projectRef,
      validSignedCallback: true,
      duplicateAcknowledged: true,
      duplicatePaymentRows: 0,
      tamperedRejected: 401,
      expiredRejected: 401,
      amountMismatchIgnored: true,
      accountMismatchIgnored: true,
      mismatchBookingStayedHeld: true,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  if (client._connected) {
    if (eventIds.length > 0) {
      await client.query(
        `delete from public.payment_transactions
         where provider = 'sepay' and provider_transaction_id = any($1::text[])`,
        [eventIds],
      );
      await client.query(
        `delete from public.webhook_events
         where provider = 'sepay' and event_id = any($1::text[])`,
        [eventIds],
      );
    }
    if (bookingIds.length > 0) {
      await client.query(
        `delete from public.audit_logs
         where target_type = 'booking' and target_id = any($1::text[])`,
        [bookingIds],
      );
      await client.query(
        "delete from public.bookings where id = any($1::uuid[])",
        [bookingIds],
      );
    }
    const after = await client.query(`
      select
        (select count(*)::int from public.bookings) as bookings,
        (select count(*)::int from public.webhook_events) as events,
        (select count(*)::int from public.payment_transactions) as payments
    `);
    if (baseline && JSON.stringify(after.rows[0]) !== JSON.stringify(baseline)) {
      throw new Error("Synthetic SePay route cleanup failed");
    }
  }
  await client.end().catch(() => {});
}
