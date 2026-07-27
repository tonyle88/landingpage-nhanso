import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import { finalizeAndEmailSepayBooking } from "@/lib/booking-email";
import { createServiceServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/database.types";

const MAX_BODY_BYTES = 256 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function json(body: object, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

function safeEqual(left: unknown, right: unknown) {
  const leftBuffer = Buffer.from(String(left || ""), "utf8");
  const rightBuffer = Buffer.from(String(right || ""), "utf8");
  return (
    leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer)
  );
}

export function verifySepaySignature({
  rawBody,
  signature,
  timestamp,
  secret,
  now = Date.now(),
}: {
  rawBody: string;
  signature: string;
  timestamp: string;
  secret: string | undefined;
  now?: number;
}) {
  if (!rawBody || !signature || !timestamp || !secret) return false;
  if (!/^\d+$/.test(timestamp)) return false;

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(now / 1000);
  if (
    !Number.isSafeInteger(timestampSeconds) ||
    Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS
  ) {
    return false;
  }

  const expected = `sha256=${createHmac("sha256", secret)
    .update(`${timestamp}.${rawBody}`, "utf8")
    .digest("hex")}`;
  return safeEqual(signature, expected);
}

async function processInSupabase(
  payload: Record<string, unknown>,
  rawBody: string,
  timestamp: string,
) {
  const expectedAccount = process.env.SEPAY_BANK_ACCOUNT_NUMBER?.trim();
  const supabase = createServiceServerClient();
  if (!expectedAccount || !supabase) {
    throw new Error("Supabase webhook processing is not configured.");
  }

  const { data, error } = await supabase.rpc("process_sepay_webhook", {
    p_payload: payload as Json,
    p_payload_sha256: createHash("sha256")
      .update(rawBody, "utf8")
      .digest("hex"),
    p_signature_timestamp: Number(timestamp),
    p_expected_account_number: expectedAccount,
  });
  if (error) {
    throw new Error("Supabase webhook processing failed.");
  }
  const result =
    data && typeof data === "object" && !Array.isArray(data)
      ? (data as Record<string, Json | undefined>)
      : {};
  if (result.processed === true) {
    const eventId = String(payload.id || "").trim();
    if (eventId) {
      try {
        await finalizeAndEmailSepayBooking(supabase, eventId);
      } catch (followUpError) {
        console.error(
          "SePay booking finalization follow-up failed:",
          followUpError instanceof Error
            ? followUpError.message
            : "Unknown follow-up error.",
        );
      }
    }
  }
}

export async function handleSepayWebhook(request: Request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("application/json")) {
    return json(
      { ok: false, message: "Content-Type must be application/json." },
      415,
    );
  }

  const rawBody = await request.text();
  if (!rawBody || Buffer.byteLength(rawBody, "utf8") > MAX_BODY_BYTES) {
    return json({ ok: false, message: "Invalid request body." }, 413);
  }

  const signature = request.headers.get("x-sepay-signature") || "";
  const timestamp = request.headers.get("x-sepay-timestamp") || "";
  if (
    !verifySepaySignature({
      rawBody,
      signature,
      timestamp,
      secret: process.env.SEPAY_WEBHOOK_SECRET,
    })
  ) {
    return json(
      { ok: false, message: "Invalid or expired webhook signature." },
      401,
    );
  }

  let payload: unknown;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return json({ ok: false, message: "Malformed JSON." }, 400);
  }
  if (!payload || Array.isArray(payload) || typeof payload !== "object") {
    return json(
      { ok: false, message: "Webhook payload must be an object." },
      400,
    );
  }

  try {
    await processInSupabase(
      payload as Record<string, unknown>,
      rawBody,
      timestamp,
    );
    return json({ success: true });
  } catch (error) {
    console.error(
      "SePay webhook forwarding failed:",
      error instanceof Error ? error.message : String(error),
    );
    return json({ ok: false, message: "Webhook processing failed." }, 502);
  }
}
