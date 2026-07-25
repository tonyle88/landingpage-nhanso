import { createHash, createHmac, randomUUID } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const baseUrl = process.env.BOOKING_API_BASE_URL || "http://127.0.0.1:3100";
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const rateSecret = process.env.BOOKING_RATE_LIMIT_SECRET;
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};
if (
  !/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl) ||
  !projectRef ||
  !password ||
  !rateSecret ||
  !stagingHosts[projectRef]
) {
  throw new Error("Refusing to run Booking workflow QA outside local/staging");
}

const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-booking-api-workflow-qa",
});

const idempotencyKey = randomUUID();
const ip = `2001:db8:${idempotencyKey.replaceAll("-", "").slice(0, 4)}::1`;
const omitProxyHeader =
  process.env.BOOKING_WORKFLOW_OMIT_PROXY_HEADER === "true";
const effectiveIp = omitProxyHeader ? "127.0.0.1" : ip;
const email = `m5-workflow-${idempotencyKey}@example.invalid`;
const phone = "+84922222222";
let bookingId = "";
let baseline = 0;

const api = async (
  path,
  body,
  method = "POST",
  requestIdempotencyKey = idempotencyKey,
) => {
  const headers =
    method === "POST"
      ? {
          "content-type": "application/json",
          "idempotency-key": requestIdempotencyKey,
        }
      : {};
  if (!omitProxyHeader) {
    headers["x-vercel-forwarded-for"] = ip;
  }
  const response = await fetch(`${baseUrl}${path}`, {
    method,
    cache: "no-store",
    headers,
    body: method === "POST" ? JSON.stringify(body) : undefined,
  });
  return { response, data: await response.json() };
};

try {
  await client.connect();
  const baselineResult = await client.query(
    "select count(*)::int as count from public.bookings",
  );
  baseline = baselineResult.rows[0].count;
  const packageResult = await client.query(`
    select code::text as code, online_price
    from public.packages
    where enabled and online_price is not null
    order by sort_order, code
    limit 1
  `);
  if (packageResult.rowCount !== 1) {
    throw new Error("No enabled package for workflow QA");
  }

  const slotStart = new Date(
    Date.now() + (100 * 24 * 60 + Math.floor(Math.random() * 10_000)) * 60_000,
  );
  const slotEnd = new Date(slotStart.getTime() + 2 * 60 * 60_000);
  const reservationPayload = {
    customer_name: "M5 Workflow Cleanup",
    date_of_birth: "1990-01-01",
    phone,
    email,
    consultation_type: "online",
    package_code: packageResult.rows[0].code,
    concern: "Synthetic local-to-staging workflow QA; cleaned immediately.",
    slot_start: slotStart.toISOString(),
    slot_end: slotEnd.toISOString(),
    payment_provider: "manual_qr",
  };

  const created = await api("/api/bookings/reserve", reservationPayload);
  if (
    created.response.status !== 201 ||
    created.data.ok !== true ||
    created.data.replayed !== false ||
    Number(created.data.amount) !== Number(packageResult.rows[0].online_price)
  ) {
    throw new Error("Native reserve API workflow failed");
  }
  bookingId = created.data.bookingId;

  const deniedStatus = await api(
    "/api/bookings/status",
    { booking_id: bookingId },
    "POST",
    randomUUID(),
  );
  if (deniedStatus.response.status !== 404 || deniedStatus.data.ok !== false) {
    throw new Error("Booking status IDOR protection failed");
  }

  const replay = await api("/api/bookings/reserve", reservationPayload);
  if (
    replay.response.status !== 201 ||
    replay.data.replayed !== true ||
    replay.data.bookingId !== bookingId
  ) {
    throw new Error("Native reserve replay failed");
  }

  const statusHeld = await api("/api/bookings/status", {
    booking_id: bookingId,
  });
  if (
    statusHeld.response.status !== 200 ||
    statusHeld.data.status !== "held" ||
    Object.hasOwn(statusHeld.data, "email") ||
    Object.hasOwn(statusHeld.data, "phone")
  ) {
    throw new Error("Native minimal status API failed");
  }

  const slotsUrl = new URL("/api/bookings/slots", baseUrl);
  slotsUrl.searchParams.set(
    "from",
    new Date(slotStart.getTime() - 60_000).toISOString(),
  );
  slotsUrl.searchParams.set(
    "to",
    new Date(slotEnd.getTime() + 60_000).toISOString(),
  );
  const slots = await fetch(
    slotsUrl,
    omitProxyHeader
      ? undefined
      : { headers: { "x-vercel-forwarded-for": ip } },
  );
  const slotsData = await slots.json();
  if (
    slots.status !== 200 ||
    slotsData.ok !== true ||
    !slotsData.slots.some(
      (slot) =>
        new Date(slot.slot_start).getTime() === slotStart.getTime() &&
        new Date(slot.slot_end).getTime() === slotEnd.getTime(),
    )
  ) {
    throw new Error("Native unavailable-slots API failed");
  }

  const manualPayment = await api("/api/bookings/manual-payment", {
    booking_id: bookingId,
  });
  if (
    manualPayment.response.status !== 200 ||
    manualPayment.data.status !== "manual_review" ||
    !manualPayment.data.manualPaymentClaimedAt
  ) {
    throw new Error("Native manual-payment API failed");
  }

  const cancelled = await api("/api/bookings/cancel", {
    booking_id: bookingId,
  });
  if (
    cancelled.response.status !== 200 ||
    cancelled.data.status !== "cancelled"
  ) {
    throw new Error("Native cancellation API failed");
  }

  const statusCancelled = await api("/api/bookings/status", {
    booking_id: bookingId,
  });
  if (statusCancelled.data.status !== "cancelled") {
    throw new Error("Native cancelled status was not persisted");
  }

  console.log(
    JSON.stringify({
      status: "PASS",
      target: baseUrl,
      staging: projectRef,
      reserve: 201,
      idempotentReplay: true,
      trustedPrice: true,
      minimalStatus: true,
      wrongCredentialDenied: 404,
      loopbackWithoutProxyHeader: omitProxyHeader,
      unavailableSlotVisible: true,
      manualReview: true,
      cancel: true,
    }),
  );
} finally {
  if (client._connected) {
    if (bookingId) {
      await client.query(
        "delete from public.bookings where public_id = $1 and idempotency_key = $2",
        [bookingId, idempotencyKey],
      );
    }
    const hashes = [
      createHmac("sha256", rateSecret)
        .update(effectiveIp, "utf8")
        .digest("hex"),
      createHash("sha256").update(email.toLowerCase(), "utf8").digest("hex"),
      createHash("sha256").update(phone, "utf8").digest("hex"),
    ];
    await client.query(
      `delete from public.booking_rate_limit_buckets
       where identifier_hash = any($1::text[])`,
      [hashes],
    );
    const after = await client.query(
      "select count(*)::int as count from public.bookings",
    );
    if (after.rows[0].count !== baseline) {
      throw new Error("Synthetic workflow booking cleanup failed");
    }
  }
  await client.end().catch(() => {});
}
