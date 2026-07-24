import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'next-app');

function required(name) {
  const value = process.env[name]?.trim();
  assert.ok(value, `${name} is required`);
  assert.doesNotMatch(value, /replace-with|example\.com|project-ref/i, `${name} is a placeholder`);
  return value;
}

assert.equal(required('DEPLOY_TARGET'), 'staging', 'DEPLOY_TARGET must be staging');

const projectRef = required('SUPABASE_PROJECT_REF');
assert.match(projectRef, /^[a-z0-9]{20}$/, 'SUPABASE_PROJECT_REF has an invalid format');

const supabaseUrl = required('NEXT_PUBLIC_SUPABASE_URL');
assert.equal(
  supabaseUrl,
  `https://${projectRef}.supabase.co`,
  'NEXT_PUBLIC_SUPABASE_URL does not match SUPABASE_PROJECT_REF',
);

const publishableKey = required('NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
assert.match(
  publishableKey,
  /^sb_publishable_[A-Za-z0-9_-]+$/,
  'Use the staging publishable key, not a legacy or secret key',
);

const siteUrl = new URL(required('NEXT_PUBLIC_SITE_URL'));
assert.equal(siteUrl.protocol, 'https:', 'Staging site URL must use HTTPS');
assert.doesNotMatch(siteUrl.hostname, /^nhanso\.clowcat\.com\.vn$/i, 'Production hostname is forbidden');

for (const [name, value] of Object.entries(process.env)) {
  if (!name.startsWith('NEXT_PUBLIC_')) continue;
  assert.doesNotMatch(name, /SERVICE|SECRET|PASSWORD|PRIVATE/i, `${name} must remain server-only`);
  assert.doesNotMatch(value ?? '', /service_role|sb_secret_/i, `${name} contains a secret key`);
}

const trackedEnvFiles = execFileSync(
  'git',
  ['ls-files', '--', '*.env', '.env*', 'next-app/.env*'],
  { cwd: root, encoding: 'utf8' },
)
  .split(/\r?\n/)
  .filter(Boolean)
  .filter((path) => !path.endsWith('.env.example'));
assert.deepEqual(trackedEnvFiles, [], 'A sensitive environment file is tracked by Git');

const linkedRefPath = resolve(appRoot, 'supabase/.temp/project-ref');
if (existsSync(linkedRefPath)) {
  const linkedRef = readFileSync(linkedRefPath, 'utf8').trim();
  assert.equal(linkedRef, projectRef, 'Supabase CLI is linked to a different project');
}

const clientStaticDir = resolve(appRoot, '.next/static');
if (existsSync(clientStaticDir)) {
  const secretNeedles = [
    process.env.SUPABASE_SECRET_KEY,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
  ].filter((value) => typeof value === 'string' && value.length >= 20);
  const patterns = ['sb_secret_[A-Za-z0-9_-]{20,}', ...secretNeedles];
  const scan = spawnSync(
    'rg',
    ['-l', patterns.join('|'), clientStaticDir],
    { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
  );
  assert.ok(scan.status === 0 || scan.status === 1, 'Client bundle scan failed');
  if (scan.stdout.trim()) {
    throw new Error('A concrete server-only Supabase secret exists in the client bundle');
  }
}

console.log('Supabase staging preflight passed without printing credential values.');
