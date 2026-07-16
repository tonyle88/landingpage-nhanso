import test from 'node:test';
import assert from 'node:assert/strict';
import { createHmac } from 'node:crypto';
import webhookHandler, { verifySepaySignature } from '../api/sepay-webhook.mjs';

const secret = 'synthetic-test-secret';
const timestamp = '1784169314';
const now = 1784169314000;
const rawBody = '{"id":123,"transferAmount":500000,"content":"CCP1234567890123456"}';
const signature = `sha256=${createHmac('sha256', secret).update(`${timestamp}.${rawBody}`).digest('hex')}`;

test('accepts a valid SePay HMAC signature', () => {
  assert.equal(verifySepaySignature({ rawBody, signature, timestamp, secret, now }), true);
});

test('rejects a modified payload', () => {
  assert.equal(verifySepaySignature({ rawBody: rawBody.replace('500000', '5000000'), signature, timestamp, secret, now }), false);
});

test('rejects an expired timestamp', () => {
  assert.equal(verifySepaySignature({ rawBody, signature, timestamp, secret, now: now + 301000 }), false);
});

test('rejects missing authentication headers', () => {
  assert.equal(verifySepaySignature({ rawBody, signature: '', timestamp: '', secret, now }), false);
});

test('endpoint rejects unsigned requests before forwarding', async () => {
  const originalFetch = globalThis.fetch;
  let forwarded = false;
  globalThis.fetch = async () => {
    forwarded = true;
    return Response.json({ ok: true, success: true });
  };
  try {
    const response = await webhookHandler.fetch(new Request('https://example.test/api/sepay-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: rawBody,
    }));
    assert.equal(response.status, 401);
    assert.equal(forwarded, false);
  } finally {
    globalThis.fetch = originalFetch;
  }
});

test('endpoint forwards an authenticated payload with the internal secret', async () => {
  const originalFetch = globalThis.fetch;
  const originalEnv = {
    webhook: process.env.SEPAY_WEBHOOK_SECRET,
    bookingUrl: process.env.BOOKING_SCRIPT_WEBHOOK_URL,
    forwardSecret: process.env.BOOKING_WEBHOOK_FORWARD_SECRET,
  };
  process.env.SEPAY_WEBHOOK_SECRET = secret;
  process.env.BOOKING_SCRIPT_WEBHOOK_URL = 'https://script.google.test/exec';
  process.env.BOOKING_WEBHOOK_FORWARD_SECRET = 'internal-synthetic-secret';

  let forwardedBody;
  globalThis.fetch = async (_url, options) => {
    forwardedBody = JSON.parse(options.body);
    return Response.json({ ok: true, success: true });
  };

  const currentTimestamp = String(Math.floor(Date.now() / 1000));
  const currentSignature = `sha256=${createHmac('sha256', secret).update(`${currentTimestamp}.${rawBody}`).digest('hex')}`;
  try {
    const response = await webhookHandler.fetch(new Request('https://example.test/api/sepay-webhook', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-SePay-Signature': currentSignature,
        'X-SePay-Timestamp': currentTimestamp,
      },
      body: rawBody,
    }));
    assert.equal(response.status, 200);
    assert.equal(forwardedBody.action, 'sepayWebhook');
    assert.equal(forwardedBody.proxySecret, 'internal-synthetic-secret');
    assert.equal(forwardedBody.id, 123);
  } finally {
    globalThis.fetch = originalFetch;
    process.env.SEPAY_WEBHOOK_SECRET = originalEnv.webhook;
    process.env.BOOKING_SCRIPT_WEBHOOK_URL = originalEnv.bookingUrl;
    process.env.BOOKING_WEBHOOK_FORWARD_SECRET = originalEnv.forwardSecret;
  }
});
