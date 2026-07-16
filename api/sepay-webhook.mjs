import { createHmac, timingSafeEqual } from 'node:crypto';

const MAX_BODY_BYTES = 256 * 1024;
const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

function json(body, status = 200) {
  return Response.json(body, {
    status,
    headers: {
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(String(left || ''), 'utf8');
  const rightBuffer = Buffer.from(String(right || ''), 'utf8');
  return leftBuffer.length === rightBuffer.length && timingSafeEqual(leftBuffer, rightBuffer);
}

export function verifySepaySignature({ rawBody, signature, timestamp, secret, now = Date.now() }) {
  if (!rawBody || !signature || !timestamp || !secret) return false;
  if (!/^\d+$/.test(String(timestamp))) return false;

  const timestampSeconds = Number(timestamp);
  const nowSeconds = Math.floor(now / 1000);
  if (!Number.isSafeInteger(timestampSeconds) || Math.abs(nowSeconds - timestampSeconds) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const expected = `sha256=${createHmac('sha256', secret)
    .update(`${timestamp}.${rawBody}`, 'utf8')
    .digest('hex')}`;
  return safeEqual(signature, expected);
}

async function forwardToBookingScript(payload, env = process.env) {
  const bookingUrl = env.BOOKING_SCRIPT_WEBHOOK_URL;
  const proxySecret = env.BOOKING_WEBHOOK_FORWARD_SECRET;
  if (!bookingUrl || !proxySecret) throw new Error('Webhook forwarding is not configured.');

  const response = await fetch(bookingUrl, {
    method: 'POST',
    redirect: 'follow',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      ...payload,
      action: 'sepayWebhook',
      proxySecret,
    }),
    signal: AbortSignal.timeout(20_000),
  });

  const responseText = await response.text();
  let result;
  try {
    result = JSON.parse(responseText);
  } catch {
    throw new Error(`Booking backend returned HTTP ${response.status}.`);
  }

  if (!response.ok || result.ok !== true || result.success !== true) {
    throw new Error(result.message || `Booking backend rejected the webhook (${response.status}).`);
  }
  return result;
}

export default {
  async fetch(request) {
    if (request.method !== 'POST') {
      return json({ ok: false, message: 'Method not allowed.' }, 405);
    }

    const contentType = request.headers.get('content-type') || '';
    if (!contentType.toLowerCase().includes('application/json')) {
      return json({ ok: false, message: 'Content-Type must be application/json.' }, 415);
    }

    const rawBody = await request.text();
    if (!rawBody || Buffer.byteLength(rawBody, 'utf8') > MAX_BODY_BYTES) {
      return json({ ok: false, message: 'Invalid request body.' }, 413);
    }

    const signature = request.headers.get('x-sepay-signature') || '';
    const timestamp = request.headers.get('x-sepay-timestamp') || '';
    if (!verifySepaySignature({
      rawBody,
      signature,
      timestamp,
      secret: process.env.SEPAY_WEBHOOK_SECRET,
    })) {
      return json({ ok: false, message: 'Invalid or expired webhook signature.' }, 401);
    }

    let payload;
    try {
      payload = JSON.parse(rawBody);
    } catch {
      return json({ ok: false, message: 'Malformed JSON.' }, 400);
    }
    if (!payload || Array.isArray(payload) || typeof payload !== 'object') {
      return json({ ok: false, message: 'Webhook payload must be an object.' }, 400);
    }

    try {
      const result = await forwardToBookingScript(payload);
      return json({ ok: true, success: true, duplicate: result.duplicate === true });
    } catch (error) {
      console.error('SePay webhook forwarding failed:', error instanceof Error ? error.message : String(error));
      return json({ ok: false, message: 'Webhook processing failed.' }, 502);
    }
  },
};
