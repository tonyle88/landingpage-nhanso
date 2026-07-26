import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const migrationUrl = new URL(
  '../next-app/supabase/migrations/202607240001_initial_schema.sql',
  import.meta.url,
);
const seedUrl = new URL('../next-app/supabase/seed.sql', import.meta.url);
const rlsTestUrl = new URL(
  '../next-app/supabase/tests/database/rls.test.sql',
  import.meta.url,
);
const sql = await readFile(migrationUrl, 'utf8');
const seed = await readFile(seedUrl, 'utf8');
const rlsTest = await readFile(rlsTestUrl, 'utf8');

const tables = [
  'profiles', 'admin_roles', 'site_settings', 'landing_sections', 'packages',
  'testimonials', 'blog_categories', 'blog_posts', 'bookings',
  'payment_transactions', 'media_assets', 'webhook_events', 'audit_logs',
];

test('migration defines all M2 tables and enables RLS', () => {
  for (const table of tables) {
    assert.match(sql, new RegExp(`create table public\\.${table}\\s*\\(`));
    assert.match(
      sql,
      new RegExp(`alter table public\\.${table} enable row level security;`),
    );
  }
});

test('domain tables use UUIDs, timestamptz, constraints and indexes', () => {
  assert.ok((sql.match(/uuid primary key/g) ?? []).length >= 12);
  assert.ok((sql.match(/timestamptz/g) ?? []).length >= 20);
  assert.ok((sql.match(/\bcheck \(/g) ?? []).length >= 12);
  assert.ok((sql.match(/create index/g) ?? []).length >= 12);
  assert.match(sql, /unique \(provider, event_id\)/);
  assert.match(sql, /check \(slot_end > slot_start\)/);
});

test('anon reads are limited to explicitly public content', () => {
  const publicTables = [
    'site_settings', 'landing_sections', 'packages', 'media_assets',
    'testimonials', 'blog_categories', 'blog_posts',
  ];
  const anonPolicies = [...sql.matchAll(
    /create policy "[^"]+_public_read" on public\.(\w+) for select\s+to anon, authenticated/gs,
  )].map((match) => match[1]).sort();
  assert.deepEqual(anonPolicies, publicTables.sort());
  for (const table of ['profiles', 'admin_roles', 'bookings',
    'payment_transactions', 'webhook_events', 'audit_logs']) {
    assert.doesNotMatch(
      sql,
      new RegExp(`on public\\.${table} for (?:select|insert|update|delete|all)\\s+to anon`),
    );
  }
});

test('sensitive tables have no direct unauthenticated write path', () => {
  assert.match(sql, /revoke all on all tables in schema public from anon, authenticated/);
  assert.match(sql, /grant select on public\.site_settings,[\s\S]+to anon/);
  assert.match(sql, /grant select, insert, update, delete on all tables in schema public to authenticated/);
  assert.doesNotMatch(sql, /bookings_public_insert/);
  assert.match(sql, /bookings_admin_auditor_read/);
  assert.match(sql, /payment_transactions_admin_auditor_read/);
  assert.match(sql, /webhook_events_admin_auditor_read/);
  assert.match(sql, /audit_logs_admin_auditor_read/);
  assert.match(sql, /security definer/);
  assert.match(sql, /revoke all on function public\.has_admin_role/);
});

test('seed is synthetic and excludes likely real identifiers and secrets', () => {
  assert.match(seed, /Synthetic development data only/);
  assert.match(seed, /example\.test/);
  assert.doesNotMatch(seed, /service_role|api[_-]?key|secret|password/i);
  assert.doesNotMatch(seed, /\b0\d{8,10}\b/);
  assert.doesNotMatch(seed, /@[a-z0-9.-]+\.(com|vn)\b/i);
});

test('pgTAP RLS suite covers each intended access tier', () => {
  assert.match(rlsTest, /select plan\(11\)/);
  assert.match(rlsTest, /set local role anon/);
  assert.match(rlsTest, /set local role authenticated/);
  for (const tier of ['regular authenticated user', 'editor', 'auditor', 'admin']) {
    assert.match(rlsTest, new RegExp(tier));
  }
  assert.match(rlsTest, /anon cannot create bookings directly/);
  assert.match(rlsTest, /auditor cannot update bookings/);
  assert.match(rlsTest, /admin can update bookings/);
  assert.match(rlsTest, /rollback;/);
});
