import assert from "node:assert/strict";
import { randomUUID } from "node:crypto";

const baseUrl = process.env.BOOKING_API_BASE_URL || "http://127.0.0.1:3100";
if (!/^http:\/\/127\.0\.0\.1:\d+$/.test(baseUrl)) {
  throw new Error("Refusing to test a non-local booking API");
}

const request = (path, init) =>
  fetch(`${baseUrl}${path}`, {
    ...init,
    redirect: "manual",
    headers: {
      "x-vercel-forwarded-for": "192.0.2.45",
      ...init.headers,
    },
  });

const missingKey = await request("/api/bookings/reserve", {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: "{}",
});
assert.equal(missingKey.status, 400);

const wrongContentType = await request("/api/bookings/reserve", {
  method: "POST",
  headers: {
    "content-type": "text/plain",
    "idempotency-key": randomUUID(),
  },
  body: "{}",
});
assert.equal(wrongContentType.status, 415);

const tooLarge = await request("/api/bookings/reserve", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": randomUUID(),
  },
  body: JSON.stringify({ concern: "x".repeat(17_000) }),
});
assert.equal(tooLarge.status, 413);

const invalidPayload = await request("/api/bookings/reserve", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": randomUUID(),
  },
  body: "{}",
});
assert.equal(invalidPayload.status, 400);

const loopbackWithoutProxyHeader = await fetch(
  `${baseUrl}/api/bookings/reserve`,
  {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": randomUUID(),
    },
    body: "{}",
  },
);
assert.equal(loopbackWithoutProxyHeader.status, 400);

const invalidCancellation = await request("/api/bookings/cancel", {
  method: "POST",
  headers: {
    "content-type": "application/json",
    "idempotency-key": randomUUID(),
  },
  body: JSON.stringify({ booking_id: "invalid" }),
});
assert.equal(invalidCancellation.status, 400);

const runInvalidReservation = (ip, payload) =>
  request("/api/bookings/reserve", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "idempotency-key": randomUUID(),
      "x-vercel-forwarded-for": ip,
    },
    body: JSON.stringify(payload),
  });

const identitySuffix = randomUUID().replaceAll("-", "");
const identityIpPrefix = identitySuffix.slice(0, 4);
const identityEmail = `m5-${identitySuffix}@example.invalid`;
const identityPhone = `+849${identitySuffix.replace(/\D/g, "").padEnd(8, "1").slice(0, 8)}`;
const identityResponses = [];
for (let attempt = 0; attempt < 6; attempt += 1) {
  identityResponses.push(
    await runInvalidReservation(
      `2001:db8:${identityIpPrefix}:${attempt + 1}::1`,
      { email: identityEmail, phone: identityPhone },
    ),
  );
}
assert.deepEqual(
  identityResponses.slice(0, 5).map((response) => response.status),
  [400, 400, 400, 400, 400],
);
assert.equal(identityResponses[5].status, 429);
assert.match(identityResponses[5].headers.get("retry-after") || "", /^\d+$/);

const ipSuffix = randomUUID().replaceAll("-", "").slice(0, 4);
const ipResponses = [];
for (let attempt = 0; attempt < 21; attempt += 1) {
  ipResponses.push(
    await runInvalidReservation(`2001:db8:${ipSuffix}::1`, {}),
  );
}
assert.deepEqual(
  ipResponses.slice(0, 20).map((response) => response.status),
  Array(20).fill(400),
);
assert.equal(ipResponses[20].status, 429);
assert.match(ipResponses[20].headers.get("retry-after") || "", /^\d+$/);

for (const response of [
  missingKey,
  wrongContentType,
  tooLarge,
  invalidPayload,
  loopbackWithoutProxyHeader,
  invalidCancellation,
  ...identityResponses,
  ...ipResponses,
]) {
  assert.equal(response.headers.get("cache-control"), "no-store");
  const body = await response.json();
  assert.equal(body.ok, false);
  assert.equal(typeof body.message, "string");
  assert.doesNotMatch(body.message, /postgres|supabase|stack|function|relation/i);
}

console.log(
  JSON.stringify({
    status: "PASS",
    target: baseUrl,
    missingIdempotencyKey: 400,
    wrongContentType: 415,
    oversizedBody: 413,
    invalidDatabasePayload: 400,
    loopbackWithoutProxyHeader: 400,
    invalidCancellationId: 400,
    identityAttempt6: 429,
    ipAttempt21: 429,
    retryAfterHeader: true,
    safeNoStoreErrors: true,
  }),
);
