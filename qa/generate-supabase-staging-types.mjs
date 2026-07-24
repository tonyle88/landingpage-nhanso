import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { once } from 'node:events';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'next-app');
process.loadEnvFile(resolve(appRoot, '.env.staging.local'));
await import('./supabase-staging-preflight.mjs');

const binary = resolve(
  appRoot,
  'node_modules/@supabase/cli-darwin-arm64/bin/supabase',
);
const target = resolve(appRoot, 'lib/supabase/database.types.ts');
const cli = spawn(binary, ['gen', 'types', 'typescript', '--linked'], {
  cwd: appRoot,
  env: process.env,
  stdio: ['ignore', 'pipe', 'inherit'],
});

let generated = '';
cli.stdout.setEncoding('utf8');
cli.stdout.on('data', (chunk) => {
  generated += chunk;
});

const [code, signal] = await once(cli, 'exit');
if (signal) throw new Error(`Supabase type generation terminated by ${signal}`);
assert.equal(code, 0, 'Supabase type generation failed');
assert.match(generated, /export type Json/);
assert.match(generated, /packages:/);
assert.match(generated, /bookings:/);
assert.doesNotMatch(generated, /sb_secret_|service_role|SUPABASE_/);

mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, generated, { mode: 0o644 });
console.log('Generated staging database types without credential values.');
