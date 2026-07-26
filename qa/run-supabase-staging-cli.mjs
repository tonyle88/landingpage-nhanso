import { execFileSync, spawn } from 'node:child_process';
import { once } from 'node:events';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const appRoot = resolve(root, 'next-app');
const envFile = resolve(appRoot, '.env.staging.local');
const binary = resolve(
  appRoot,
  'node_modules/@supabase/cli-darwin-arm64/bin/supabase',
);

if (!existsSync(envFile)) throw new Error('Missing ignored staging environment file');
if (!existsSync(binary)) throw new Error('Pinned Supabase CLI binary is missing');

process.loadEnvFile(envFile);
await import('./supabase-staging-preflight.mjs');

const operation = process.argv[2];
const operations = {
  link: ['link', '--project-ref', process.env.SUPABASE_PROJECT_REF, '--yes'],
  'dry-run': ['db', 'push', '--linked', '--dry-run', '--yes'],
  migrations: ['migration', 'list', '--linked'],
  push: ['db', 'push', '--linked', '--yes'],
};
const args = operations[operation];
if (!args) throw new Error('Allowed operations: link, dry-run, migrations, push');

const cli = spawn(binary, args, {
  cwd: appRoot,
  env: process.env,
  stdio: ['ignore', 'inherit', 'inherit'],
});

let networkOutput = '';
const socketEvidence = new Set();
const socketSampler = setInterval(() => {
  try {
    const snapshot = execFileSync(
      '/usr/sbin/lsof',
      ['-a', '-p', String(cli.pid), '-iTCP', '-nP', '-F', 'pcnT'],
      { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] },
    );
    for (const line of snapshot.split(/\r?\n/)) {
      if (line.startsWith('n') && line.includes('->')) socketEvidence.add(line);
    }
  } catch {}
}, 100);
const monitor = spawn(
  '/usr/bin/nettop',
  ['-p', String(cli.pid), '-L', '0', '-n', '-m', 'tcp'],
  { stdio: ['ignore', 'pipe', 'ignore'] },
);
monitor.stdout.setEncoding('utf8');
monitor.stdout.on('data', (chunk) => {
  if (networkOutput.length < 100_000) networkOutput += chunk;
});

const [code, signal] = await once(cli, 'exit');
clearInterval(socketSampler);
monitor.kill('SIGINT');
await Promise.race([
  once(monitor, 'exit'),
  new Promise((resolveWait) => setTimeout(resolveWait, 2_000)),
]);

const evidence = networkOutput
  .split(/\r?\n/)
  .filter((line) => line.trim())
  .slice(0, 40);
console.log(`Network evidence rows captured by nettop: ${Math.max(0, evidence.length - 1)}`);
for (const line of evidence) console.log(line);
console.log(`Network socket snapshots captured by lsof: ${socketEvidence.size}`);
for (const line of socketEvidence) console.log(line);

if (signal) throw new Error(`Supabase CLI terminated by ${signal}`);
if (code !== 0) process.exit(code ?? 1);
