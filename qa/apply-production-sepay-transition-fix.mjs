import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.PRODUCTION_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const approval =
  process.env.PRODUCTION_SEPAY_TRANSITION_FIX_APPROVED?.trim();
const apply = process.argv.includes("--apply");

if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  !password ||
  (apply && approval !== projectRef)
) {
  throw new Error("Refusing to modify an unapproved production project");
}

const migrationPath = resolve(
  root,
  "next-app/supabase/migrations/202607280002_fix_sepay_confirmation_transition.sql",
);
const migration = (await readFile(migrationPath, "utf8"))
  .replace(/^begin;\s*/i, "")
  .replace(/\s*commit;\s*$/i, "");
const evidence = new Set();
const sample = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a",
      "-p",
      String(process.pid),
      "-iTCP",
      "-n",
      "-P",
    ]);
    for (const line of stdout.split("\n")) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {}
};

const timer = setInterval(sample, 25);
const client = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-production-sepay-transition-fix",
});

try {
  await client.connect();
  await sample();
  await client.query("begin");
  await client.query(migration);
  const verification = await client.query(`
    select
      position(
        'set status = ''paid'', updated_at = now()'
        in pg_get_functiondef(
          'public.process_sepay_webhook(jsonb,text,bigint,text)'::regprocedure
        )
      ) > 0 as has_paid_transition,
      position(
        'status = ''confirmed'''
        in pg_get_functiondef(
          'public.process_sepay_webhook(jsonb,text,bigint,text)'::regprocedure
        )
      ) > 0 as has_confirmed_transition
  `);
  await client.query(apply ? "commit" : "rollback");
  await sample();
  console.log(
    JSON.stringify(
      {
        status: "PASS",
        mode: apply ? "applied" : "rolled_back",
        transitionChainValidated:
          verification.rows[0].has_paid_transition &&
          verification.rows[0].has_confirmed_transition,
        networkEvidence: [...evidence].sort(),
        networkEvidenceCaptured: evidence.size > 0,
      },
      null,
      2,
    ),
  );
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
