import { execFileSync } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import { chmod, mkdir, readFile, readdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
import { hashRows, projectRows } from "./lib/public-content-import.mjs";

const root = resolve(import.meta.dirname, "..");
const inputPath = resolve(root, ".staging-import/public-content-import.json");
const sqlPath = resolve(root, ".staging-import/public-content-import.sql");
const reportPath = resolve(root, ".staging-import/m8-rehearsal-report.json");
const migrationsDirectory = resolve(root, "next-app/supabase/migrations");
const image =
  process.env.SUPABASE_POSTGRES_IMAGE ??
  "public.ecr.aws/supabase/postgres:17.6.1.143";
const expectedTables = [
  "site_settings",
  "landing_sections",
  "packages",
  "testimonials",
  "blog_categories",
  "blog_posts",
];

const document = JSON.parse(await readFile(inputPath, "utf8"));
const importSql = await readFile(sqlPath, "utf8");
const migrations = (await readdir(migrationsDirectory))
  .filter((name) => /^\d+_[a-z0-9_]+\.sql$/.test(name))
  .sort();

if (document.metadata?.strategy !== "upsert") {
  throw new Error("Snapshot is not marked as an idempotent upsert");
}
if (
  expectedTables.some(
    (table) =>
      !Array.isArray(document.tables?.[table]) ||
      document.tables[table].length === 0,
  )
) {
  throw new Error("Snapshot does not contain every approved public table");
}
if (migrations.length === 0) throw new Error("No migrations found");

function docker(args, options = {}) {
  return execFileSync("docker", args, {
    cwd: root,
    encoding: "utf8",
    stdio: options.capture ? "pipe" : "ignore",
    maxBuffer: 20 * 1024 * 1024,
  });
}

function quoteIdentifier(value) {
  if (!/^[a-z_][a-z0-9_]*$/.test(value)) {
    throw new Error(`Unsafe identifier: ${value}`);
  }
  return `"${value}"`;
}

function psql(container, args, options = {}) {
  const { user = "postgres", ...dockerOptions } = options;
  return docker(
    [
      "exec",
      container,
      "psql",
      "--username",
      user,
      "--dbname",
      "postgres",
      "--set",
      "ON_ERROR_STOP=1",
      ...args,
    ],
    { ...dockerOptions, capture: true },
  );
}

async function runPass(passNumber) {
  const suffix = randomUUID().slice(0, 8);
  const container = `nhanso-m8-rehearsal-${passNumber}-${suffix}`;
  const volume = `nhanso_m8_rehearsal_${passNumber}_${suffix}`;
  const startedAt = Date.now();

  try {
    docker(["volume", "create", volume]);
    docker([
      "run",
      "--name",
      container,
      "--label",
      "com.clowcat.m8-rehearsal=true",
      "--network",
      "none",
      "--env",
      "POSTGRES_PASSWORD=postgres",
      "--env",
      "POSTGRES_DB=postgres",
      "--volume",
      `${volume}:/var/lib/postgresql/data`,
      "--detach",
      image,
    ]);

    let ready = false;
    let consecutiveReadyChecks = 0;
    for (let attempt = 0; attempt < 180; attempt += 1) {
      try {
        docker(
          ["exec", container, "pg_isready", "-U", "postgres", "-d", "postgres"],
          { capture: true },
        );
        consecutiveReadyChecks += 1;
        if (consecutiveReadyChecks >= 10) {
          ready = true;
          break;
        }
      } catch {
        consecutiveReadyChecks = 0;
      } finally {
        Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 500);
      }
    }
    if (!ready) throw new Error(`Rehearsal pass ${passNumber} did not start`);

    const isolation = docker(
      [
        "inspect",
        container,
        "--format",
        "network={{.HostConfig.NetworkMode}} published={{json .NetworkSettings.Ports}}",
      ],
      { capture: true },
    ).trim();
    if (isolation !== "network=none published={}") {
      throw new Error(`Unsafe rehearsal isolation: ${isolation}`);
    }

    // The standalone Supabase Postgres image does not run the Storage service's
    // platform migration. This minimal table only satisfies our bucket
    // declaration migration; no Storage objects or policies are simulated here.
    psql(container, [
      "--command",
      `create schema if not exists storage;
       create table if not exists storage.buckets (
         id text primary key,
         name text not null,
         public boolean not null default false,
         file_size_limit bigint,
         allowed_mime_types text[]
       );
       grant usage on schema storage to postgres;
       grant select, insert, update, delete on storage.buckets to postgres;
      `,
    ], { user: "supabase_admin" });

    for (const migration of migrations) {
      const target = `/tmp/${migration}`;
      docker(["cp", resolve(migrationsDirectory, migration), `${container}:${target}`]);
      psql(container, ["--file", target]);
    }
    docker(["cp", sqlPath, `${container}:/tmp/public-content-import.sql`]);

    // The second execution is deliberate and must not create duplicate rows.
    psql(container, ["--file", "/tmp/public-content-import.sql"]);
    psql(container, ["--file", "/tmp/public-content-import.sql"]);

    const tables = {};
    for (const table of expectedTables) {
      const expected = document.tables[table];
      const columns = Object.keys(expected[0]).sort();
      const projection = columns.map(quoteIdentifier).join(", ");
      const query = [
        "select coalesce(jsonb_agg(to_jsonb(q)), '[]'::jsonb)::text",
        `from (select ${projection} from public.${quoteIdentifier(table)}) q`,
      ].join(" ");
      const raw = psql(
        container,
        ["--tuples-only", "--no-align", "--command", query],
        { capture: true },
      ).trim();
      const actual = projectRows(JSON.parse(raw), columns);
      const expectedHash = hashRows(expected);
      const actualHash = hashRows(actual);
      tables[table] = {
        expectedCount: expected.length,
        actualCount: actual.length,
        expectedHash,
        actualHash,
        matches:
          expected.length === actual.length && expectedHash === actualHash,
      };
    }

    const orphanBlogPosts = Number(
      psql(
        container,
        [
          "--tuples-only",
          "--no-align",
          "--command",
          `select count(*) from public.blog_posts p
           left join public.blog_categories c on c.id = p.category_id
           where p.category_id is not null and c.id is null`,
        ],
        { capture: true },
      ).trim(),
    );
    const allMatch =
      orphanBlogPosts === 0 &&
      Object.values(tables).every((result) => result.matches);
    if (!allMatch) {
      throw new Error(`Rehearsal pass ${passNumber} parity check failed`);
    }

    return {
      pass: passNumber,
      freshDatabase: true,
      importExecutions: 2,
      isolation,
      migrationCount: migrations.length,
      durationMs: Date.now() - startedAt,
      tables,
      orphanBlogPosts,
      allMatch,
    };
  } finally {
    try {
      docker(["rm", "--force", container], { capture: true });
    } catch {}
    try {
      docker(["volume", "rm", volume], { capture: true });
    } catch {}
  }
}

const snapshotSha256 = createHash("sha256")
  .update(await readFile(inputPath))
  .digest("hex");
const sqlSha256 = createHash("sha256").update(importSql).digest("hex");
const passes = [await runPass(1), await runPass(2)];
const repeatable = expectedTables.every(
  (table) =>
    passes[0].tables[table].actualHash ===
    passes[1].tables[table].actualHash,
);
if (!repeatable) throw new Error("Fresh-database rehearsal hashes differ");

const report = {
  generatedAt: new Date().toISOString(),
  status: "PASS",
  scope: "approved-public-content-only",
  sourceGeneratedAt: document.metadata.generatedAt,
  snapshotSha256,
  sqlSha256,
  sourceSecretsUsed: false,
  productionTargetUsed: false,
  passes,
  repeatable,
  exceptionCount: 0,
};
await mkdir(resolve(root, ".staging-import"), { recursive: true });
await writeFile(reportPath, `${JSON.stringify(report, null, 2)}\n`, {
  mode: 0o600,
});
await chmod(reportPath, 0o600);

console.log(
  JSON.stringify({
    status: report.status,
    scope: report.scope,
    snapshotSha256,
    sqlSha256,
    sourceSecretsUsed: false,
    productionTargetUsed: false,
    passes: passes.map((pass) => ({
      pass: pass.pass,
      durationMs: pass.durationMs,
      isolation: pass.isolation,
      migrationCount: pass.migrationCount,
      importExecutions: pass.importExecutions,
      counts: Object.fromEntries(
        Object.entries(pass.tables).map(([table, result]) => [
          table,
          result.actualCount,
        ]),
      ),
      allMatch: pass.allMatch,
    })),
    repeatable,
    exceptionCount: 0,
    report: ".staging-import/m8-rehearsal-report.json",
  }),
);
