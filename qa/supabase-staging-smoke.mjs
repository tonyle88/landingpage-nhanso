import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'next-app');
process.loadEnvFile(resolve(appRoot, '.env.staging.local'));
await import('./supabase-staging-preflight.mjs');

const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const headers = {
  apikey: publishableKey,
  Authorization: `Bearer ${publishableKey}`,
};
const socketEvidence = new Set();
const sampler = setInterval(() => {
  try {
    const snapshot = execFileSync(
      '/usr/sbin/lsof',
      ['-a', '-p', String(process.pid), '-iTCP', '-nP', '-F', 'pcnT'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    for (const line of snapshot.split(/\r?\n/)) {
      if (line.startsWith('n') && line.includes('->')) socketEvidence.add(line);
    }
  } catch {}
}, 50);

async function request(path, init = {}) {
  const response = await fetch(`${baseUrl}/rest/v1/${path}`, {
    ...init,
    headers: { ...headers, ...init.headers },
    signal: AbortSignal.timeout(10_000),
  });
  await response.arrayBuffer();
  return response.status;
}

try {
  assert.equal(
    await request('packages?select=code&limit=1'),
    200,
    'anon must read public packages through RLS',
  );
  assert.equal(
    await request('testimonials?select=id,image_url,media_assets(public_url)&limit=1'),
    200,
    'anon must read public testimonials and public media through RLS',
  );
  assert.equal(
    await request('site_settings?select=key,value&is_public=eq.true&limit=1'),
    200,
    'anon must read public site settings through RLS',
  );
  assert.equal(
    await request('landing_sections?select=section_key&enabled=eq.true&limit=1'),
    200,
    'anon must read enabled landing sections through RLS',
  );
  assert.equal(
    await request('blog_posts?select=slug&limit=1'),
    200,
    'anon must read published blog posts through RLS',
  );

  const bookingRead = await request('bookings?select=id&limit=1');
  assert.ok(
    bookingRead === 401 || bookingRead === 403,
    `anon booking read must be denied, received ${bookingRead}`,
  );

  const packageWrite = await request('packages', {
    method: 'POST',
    headers: { 'content-type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify({
      code: 'FORBIDDEN-STAGING-SMOKE',
      name: 'Must never be inserted',
      online_price: 1,
    }),
  });
  assert.ok(
    packageWrite === 401 || packageWrite === 403,
    `anon package write must be denied, received ${packageWrite}`,
  );

  console.log('Staging Data API smoke passed: public reads allowed; sensitive read/write denied.');
} finally {
  clearInterval(sampler);
  console.log(`Network socket snapshots captured by lsof: ${socketEvidence.size}`);
  for (const line of socketEvidence) console.log(line);
}
