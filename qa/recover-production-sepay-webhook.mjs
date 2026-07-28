import { createHmac } from "node:crypto";
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
const webhookSecret = process.env.SEPAY_WEBHOOK_SECRET?.trim();
const orderId = process.env.PAYMENT_ORDER_ID?.trim();
const eventId = process.env.SEPAY_EVENT_ID?.trim();
const approval = process.env.PRODUCTION_SEPAY_WEBHOOK_RECOVERY_APPROVED?.trim();

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  !webhookSecret ||
  !/^CCP[A-Z0-9]{16,32}$/.test(orderId || "") ||
  !/^[0-9]{1,40}$/.test(eventId || "") ||
  approval !== `${eventId}:${orderId}`
) {
  throw new Error("Refusing to recover an unapproved production webhook");
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
  application_name: "nhanso-production-sepay-webhook-recovery",
});

try {
  await client.connect();
  await sample();
  const target = await client.query(
    `
      select b.public_id, b.amount
      from public.bookings b
      where b.payment_order_id = $1
        and b.payment_provider = 'sepay'
        and b.status = 'held'
        and not exists (
          select 1
          from public.payment_transactions p
          where p.booking_id = b.id
            and p.status = 'paid'
        )
    `,
    [orderId],
  );
  if (target.rowCount !== 1) {
    throw new Error("The requested booking is not ready for webhook recovery");
  }

  const payload = {
    id: Number(eventId),
    gateway: "BIDV",
    transactionDate: "2026-07-28 07:56:29",
    accountNumber: "962470907072634TONY",
    subAccount: "962470907072634TONY",
    transferType: "in",
    transferAmount: Number(target.rows[0].amount),
    content: orderId,
    code: orderId,
    referenceCode: "7f367208-def3-44ca-8d16-377f1431ed6e",
  };
  const rawBody = JSON.stringify(payload);
  const timestamp = String(Math.floor(Date.now() / 1000));
  const signature = `sha256=${createHmac("sha256", webhookSecret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
  const response = await fetch(
    "https://nhanso.clowcat.com.vn/api/sepay-webhook",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-SePay-Signature": signature,
        "X-SePay-Timestamp": timestamp,
      },
      body: rawBody,
    },
  );
  await sample();
  const result = await response.json();
  if (!response.ok || result?.success !== true) {
    throw new Error(`Production webhook recovery failed with HTTP ${response.status}`);
  }

  const verification = await client.query(
    `
      select
        b.public_id,
        b.status::text,
        w.status::text as webhook_status,
        p.status::text as payment_status
      from public.bookings b
      join public.payment_transactions p
        on p.booking_id = b.id
        and p.provider = 'sepay'
        and p.provider_transaction_id = $2
      join public.webhook_events w
        on w.provider = 'sepay'
        and w.event_id = $2
      where b.payment_order_id = $1
    `,
    [orderId, eventId],
  );
  if (
    verification.rowCount !== 1 ||
    verification.rows[0].status !== "confirmed" ||
    verification.rows[0].payment_status !== "paid" ||
    verification.rows[0].webhook_status !== "processed"
  ) {
    throw new Error("Recovered webhook did not confirm the booking");
  }

  console.log(
    JSON.stringify(
      {
        status: "PASS",
        bookingId: verification.rows[0].public_id,
        bookingStatus: verification.rows[0].status,
        paymentStatus: verification.rows[0].payment_status,
        webhookStatus: verification.rows[0].webhook_status,
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
