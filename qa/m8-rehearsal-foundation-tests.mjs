import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import test from "node:test";

const root = resolve(import.meta.dirname, "..");
const read = (path) => readFile(resolve(root, path), "utf8");

test("M8 rehearsal requires a local ignored snapshot and fixed public tables", async () => {
  const source = await read("qa/rehearse-public-content-m8.mjs");
  assert.match(source, /\.staging-import\/public-content-import\.json/);
  assert.match(source, /expectedTables = \[/);
  assert.match(source, /approved-public-content-only/);
  assert.doesNotMatch(
    source,
    /\.env(?:\.staging)?\.local|SUPABASE_DB_PASSWORD|service_role/,
  );
});

test("each rehearsal starts from an isolated fresh database", async () => {
  const source = await read("qa/rehearse-public-content-m8.mjs");
  assert.match(source, /"--network",\s+"none"/);
  assert.match(source, /network=none published=\{\}/);
  assert.match(source, /const passes = \[await runPass\(1\), await runPass\(2\)\]/);
  assert.match(source, /docker\(\["volume", "rm", volume\]/);
});

test("rehearsal proves idempotence, relationships, counts and hashes", async () => {
  const source = await read("qa/rehearse-public-content-m8.mjs");
  assert.equal(
    (source.match(/"\/tmp\/public-content-import\.sql"/g) || []).length,
    2,
  );
  assert.match(source, /orphanBlogPosts/);
  assert.match(source, /expectedCount/);
  assert.match(source, /expectedHash/);
  assert.match(source, /actualHash/);
  assert.match(source, /Fresh-database rehearsal hashes differ/);
});

test("M8 report is local-only and stores no row payload", async () => {
  const source = await read("qa/rehearse-public-content-m8.mjs");
  assert.match(source, /\.staging-import\/m8-rehearsal-report\.json/);
  assert.match(source, /sourceSecretsUsed: false/);
  assert.match(source, /productionTargetUsed: false/);
  assert.doesNotMatch(source, /console\.log\(document|console\.log\(actual/);
});

test("previous SePay hotfix is replay-safe on a fresh database", async () => {
  const sql = await read(
    "next-app/supabase/migrations/202607250016_fix_sepay_payment_status_cast.sql",
  );
  assert.match(sql, /position\('::public\.payment_status' in v_definition\)/);
  assert.match(sql, /then\s+return;/);
  assert.match(sql, /expected SePay payment status expression not found/);
});

test("standalone rehearsal only shims the platform-managed Storage bucket table", async () => {
  const source = await read("qa/rehearse-public-content-m8.mjs");
  assert.match(source, /create schema if not exists storage/);
  assert.match(source, /create table if not exists storage\.buckets/);
  assert.doesNotMatch(source, /storage\.objects/);
});
