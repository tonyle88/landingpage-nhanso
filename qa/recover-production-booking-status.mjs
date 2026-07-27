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
const approval =
  process.env.PRODUCTION_BOOKING_STATUS_RECOVERY_APPROVED?.trim();

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  !/^CCP[A-Z0-9]{16,32}$/.test(orderId || "") ||
  approval !== orderId
) {
  throw new Error("Refusing to recover an unapproved production booking");
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
  application_name: "nhanso-production-booking-status-recovery",
});

try {
  await client.connect();
  await sample();
  const target = await client.query(
    `
      select b.public_id, b.idempotency_key
      from public.bookings b
      where b.payment_order_id = $1
        and b.payment_provider = 'sepay'
        and b.status = 'confirmed'
        and exists (
          select 1
          from public.payment_transactions p
          where p.booking_id = b.id
            and p.provider = 'sepay'
            and p.status = 'paid'
            and p.amount = b.amount
        )
    `,
    [orderId],
  );
  if (target.rowCount !== 1 || !target.rows[0].idempotency_key) {
    throw new Error("The requested booking is not ready for status recovery");
  }

  const response = await fetch(
    "https://nhanso.clowcat.com.vn/api/bookings/status",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": target.rows[0].idempotency_key,
      },
      body: JSON.stringify({ booking_id: target.rows[0].public_id }),
    },
  );
  await sample();
  const result = await response.json();
  if (!response.ok || result?.ok !== true || result?.status !== "confirmed") {
    throw new Error(`Production status recovery failed with HTTP ${response.status}`);
  }
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        bookingId: target.rows[0].public_id,
        bookingStatus: result.status,
        emailDelivery: result.emailDelivery || null,
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
