import { execFileSync } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const suffix = randomUUID().slice(0, 8);
const container = `nhanso-supabase-db-test-${suffix}`;
const volume = `nhanso_supabase_db_test_${suffix}`;
const image =
  process.env.SUPABASE_POSTGRES_IMAGE ??
  'public.ecr.aws/supabase/postgres:17.6.1.143';

const files = [
  ['next-app/supabase/migrations/202607240001_initial_schema.sql', '/tmp/initial_schema.sql'],
  ['next-app/supabase/seed.sql', '/tmp/seed.sql'],
  ['next-app/supabase/tests/database/rls.test.sql', '/tmp/rls.test.sql'],
];

function docker(args, options = {}) {
  return execFileSync('docker', args, {
    cwd: root,
    encoding: 'utf8',
    stdio: options.capture ? 'pipe' : 'inherit',
  });
}

function psql(file, options = {}) {
  return docker([
    'exec', container, 'psql',
    '--username', 'postgres',
    '--dbname', 'postgres',
    '--set', 'ON_ERROR_STOP=1',
    ...(options.tap ? ['--tuples-only', '--no-align'] : []),
    '--file', file,
  ], { capture: options.capture });
}

try {
  docker(['volume', 'create', volume]);
  docker([
    'run',
    '--name', container,
    '--label', 'com.clowcat.synthetic=true',
    '--network', 'none',
    '--env', 'POSTGRES_PASSWORD=postgres',
    '--env', 'POSTGRES_DB=postgres',
    '--volume', `${volume}:/var/lib/postgresql/data`,
    '--detach',
    image,
  ]);

  let ready = false;
  for (let attempt = 0; attempt < 120; attempt += 1) {
    try {
      docker(
        ['exec', container, 'pg_isready', '-U', 'postgres', '-d', 'postgres'],
        { capture: true },
      );
      ready = true;
      break;
    } catch {
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
    }
  }
  if (!ready) throw new Error('Synthetic Supabase Postgres did not become ready');

  const isolation = docker([
    'inspect', container,
    '--format', 'network={{.HostConfig.NetworkMode}} published={{json .NetworkSettings.Ports}}',
  ], { capture: true }).trim();
  if (isolation !== 'network=none published={}') {
    throw new Error(`Unsafe Docker isolation: ${isolation}`);
  }
  console.log(`Verified isolation: ${isolation}`);

  for (const [source, target] of files) {
    docker(['cp', resolve(root, source), `${container}:${target}`]);
  }

  psql('/tmp/initial_schema.sql');
  psql('/tmp/seed.sql');
  const tap = psql('/tmp/rls.test.sql', { tap: true, capture: true });
  process.stdout.write(tap);

  const passed = [...tap.matchAll(/^ok \d+ - /gm)].length;
  if (/^not ok /m.test(tap) || passed !== 11) {
    throw new Error(`RLS suite failed: expected 11 passing tests, received ${passed}`);
  }
} finally {
  try {
    docker(['rm', '--force', container], { capture: true });
  } catch {}
  try {
    docker(['volume', 'rm', volume], { capture: true });
  } catch {}
}
