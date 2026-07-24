import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

const baseUrl = process.env.NEXT_PARITY_BASE_URL || "http://127.0.0.1:4327";
const qaDir = path.dirname(fileURLToPath(import.meta.url));
const nextAppDir = path.resolve(qaDir, "../next-app");

async function fetchRoute(route, init = {}) {
  return fetch(`${baseUrl}${route}`, init);
}

function scriptTags(html) {
  return [...html.matchAll(/<script\b[^>]*>/gi)].map((match) => match[0]);
}

function assertNonceParity(response, html) {
  const csp = response.headers.get("content-security-policy") || "";
  const nonce = csp.match(/'nonce-([^']+)'/)?.[1];
  assert.ok(nonce, "CSP must contain a request nonce");
  const scripts = scriptTags(html);
  assert.ok(scripts.length > 0, "route must emit scripts");
  scripts.forEach((tag) => {
    assert.match(tag, new RegExp(`nonce=["']${nonce}["']`));
  });
  assert.doesNotMatch(csp, /script-src[^;]*'unsafe-inline'/);
}

function assertSecurityHeaders(response) {
  assert.equal(response.headers.get("x-frame-options"), "SAMEORIGIN");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(
    response.headers.get("referrer-policy"),
    "strict-origin-when-cross-origin",
  );
  assert.match(response.headers.get("permissions-policy") || "", /camera=\(\)/);
  assert.equal(
    response.headers.get("cross-origin-resource-policy"),
    "same-site",
  );
}

test("landing route preserves SEO, structure and CSP", async () => {
  const response = await fetchRoute("/");
  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
  const html = await response.text();
  assertNonceParity(response, html);
  assert.match(
    html,
    /<title>Nhân Số Học Khai Phá Tiềm Năng \| Clow Cat Patronus<\/title>/,
  );
  assert.match(html, /<meta name="description" content="[^"]+"/);
  assert.match(html, /<meta property="og:title" content="[^"]+"/);
  assert.match(html, /<html lang="vi"/);
  [
    "navbar",
    "hero",
    "dynamic-layout",
    "packages",
    "mini-report-form",
    "booking-form",
    "modal-calendar",
    "modal-payment",
    "modal-success",
  ].forEach((id) => assert.match(html, new RegExp(`id="${id}"`)));
  assert.match(html, /<script[^>]+src="\/script\.js"/);
});

test("blog route preserves SEO, shell and isolated runtime", async () => {
  const response = await fetchRoute("/blog");
  assert.equal(response.status, 200);
  assertSecurityHeaders(response);
  const html = await response.text();
  assertNonceParity(response, html);
  assert.match(html, /<html lang="vi"/);
  assert.match(html, /id="blog-container"/);
  assert.match(html, /<script[^>]+src="\/blog\.js"/);
  assert.doesNotMatch(html, /<script[^>]+src="\/script\.js"/);
  assert.match(html, /href="\/#contact"/);
});

test("legacy URLs permanently redirect to Next routes", async () => {
  const indexResponse = await fetchRoute("/index.html", {
    redirect: "manual",
  });
  const blogResponse = await fetchRoute("/blog.html", {
    redirect: "manual",
  });
  assert.equal(indexResponse.status, 308);
  assert.equal(indexResponse.headers.get("location"), "/");
  assert.equal(blogResponse.status, 308);
  assert.equal(blogResponse.headers.get("location"), "/blog");
});

test("typed runtimes replace migrated legacy implementations", () => {
  const legacy = fs.readFileSync(
    path.join(nextAppDir, "public/script.js"),
    "utf8",
  );
  const landingRuntime = fs.readFileSync(
    path.join(nextAppDir, "app/landing-runtime.tsx"),
    "utf8",
  );
  [
    "useBookingApiClient",
    "useBookingCalendar",
    "useBookingFormState",
    "useLandingContent",
    "useLandingEffects",
    "useMiniReportContent",
    "usePackages",
    "usePaymentRuntime",
    "useTestimonials",
  ].forEach((hook) => assert.match(landingRuntime, new RegExp(`${hook}\\(`)));
  assert.doesNotMatch(legacy, /new Proxy/);
  assert.doesNotMatch(
    legacy,
    /function (renderTestimonials|renderPackages|renderDateStrip|renderTimeSlots|finalizeBooking|showSuccessModal)/,
  );
});
