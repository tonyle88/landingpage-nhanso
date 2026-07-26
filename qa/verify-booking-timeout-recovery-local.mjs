import { createHash, createHmac, randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
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
  throw new Error("Refusing to run timeout recovery QA outside local/staging");
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
  application_name: "nhanso-booking-timeout-recovery-qa",
});

const idempotencyKey = randomUUID();
const email = `m5-timeout-${idempotencyKey}@example.invalid`;
const phone = "+84933333333";
const effectiveIp = "127.0.0.1";
let baseline = 0;

try {
  await client.connect();
  await sampleNetwork();
  const baselineResult = await client.query(
    "select count(*)::int as count from public.bookings",
  );
  baseline = baselineResult.rows[0].count;
  const packageResult = await client.query(`
    select code::text as code
    from public.packages
    where enabled and online_price is not null
    order by sort_order, code
    limit 1
  `);
  if (packageResult.rowCount !== 1) {
    throw new Error("No enabled package for timeout recovery QA");
  }

  const slotStart = new Date(
    Date.now() + (140 * 24 * 60 + Math.floor(Math.random() * 10_000)) * 60_000,
  );
  const payload = {
    customer_name: "M5 Timeout Recovery Cleanup",
    date_of_birth: "1990-01-01",
    phone,
    email,
    consultation_type: "online",
    package_code: packageResult.rows[0].code,
    concern: "Synthetic timeout recovery QA; cleaned immediately.",
    slot_start: slotStart.toISOString(),
    slot_end: new Date(slotStart.getTime() + 2 * 60 * 60_000).toISOString(),
    payment_provider: "manual_qr",
  };
  const headers = {
    "content-type": "application/json",
    "idempotency-key": idempotencyKey,
  };

  // Model the dangerous timeout boundary: the server has committed and started
  // its response, but the client loses that response before consuming its body.
  const lostResponseController = new AbortController();
  const lostResponse = await fetch(`${baseUrl}/api/bookings/reserve`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(payload),
    signal: lostResponseController.signal,
  });
  if (lostResponse.status !== 201) {
    throw new Error("Initial reservation did not reach the commit boundary");
  }
  lostResponseController.abort();

  const committed = await client.query(
    `select count(*)::int as count
     from public.bookings
     where idempotency_key = $1`,
    [idempotencyKey],
  );
  if (committed.rows[0].count !== 1) {
    throw new Error("Expected exactly one committed timeout-boundary booking");
  }

  const retryResponse = await fetch(`${baseUrl}/api/bookings/reserve`, {
    method: "POST",
    cache: "no-store",
    headers,
    body: JSON.stringify(payload),
  });
  const retryData = await retryResponse.json();
  if (
    retryResponse.status !== 201 ||
    retryData.ok !== true ||
    retryData.replayed !== true
  ) {
    throw new Error("Retry after lost response did not replay safely");
  }

  const afterRetry = await client.query(
    `select count(*)::int as count
     from public.bookings
     where idempotency_key = $1`,
    [idempotencyKey],
  );
  if (afterRetry.rows[0].count !== 1) {
    throw new Error("Retry after lost response created a duplicate booking");
  }

  await sampleNetwork();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: baseUrl,
      staging: projectRef,
      responseLostAfterCommit: true,
      retryReplayed: true,
      duplicateBookings: 0,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  if (client._connected) {
    await client.query(
      "delete from public.bookings where idempotency_key = $1",
      [idempotencyKey],
    );
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
    const afterCleanup = await client.query(
      "select count(*)::int as count from public.bookings",
    );
    if (afterCleanup.rows[0].count !== baseline) {
      throw new Error("Synthetic timeout recovery cleanup failed");
    }
  }
  await client.end().catch(() => {});
}
