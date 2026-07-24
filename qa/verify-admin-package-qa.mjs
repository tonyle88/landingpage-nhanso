import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const expectedState = process.argv[2];
const allowedStates = new Set(["created", "updated", "deleted"]);
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};
if (
  !projectRef ||
  !password ||
  !stagingHosts[projectRef] ||
  !allowedStates.has(expectedState)
) {
  throw new Error("Refusing unsafe package QA verification");
}

const evidence = new Set();
const sample = async () => {
  try {
    const { stdout } = await execFileAsync("/usr/sbin/lsof", [
      "-a", "-p", String(process.pid), "-iTCP", "-n", "-P",
    ]);
    for (const line of stdout.split("\n")) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {}
};
const timer = setInterval(sample, 25);
const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 30_000,
  application_name: "nhanso-package-live-qa",
});

try {
  await client.connect();
  await sample();
  const record = await client.query(`
    select online_price, enabled, featured, sort_order
    from public.packages
    where code = 'codex-qa-package-20260724'
  `);
  const packageCount = await client.query(
    "select count(*)::int as count from public.packages",
  );
  const audits = await client.query(`
    select
      action,
      count(*)::int as count,
      bool_and(before_data is not null) as has_before,
      bool_and(after_data is not null) as has_after
    from public.audit_logs
    where target_type = 'package'
      and coalesce(after_data->>'code', before_data->>'code') =
        'codex-qa-package-20260724'
    group by action
  `);
  const auditCounts = Object.fromEntries(
    audits.rows.map((row) => [row.action, row.count]),
  );
  const updateAudit = audits.rows.find((row) => row.action === "package.update");
  let pass = false;
  if (expectedState === "created") {
    const row = record.rows[0];
    pass =
      record.rowCount === 1 &&
      Number(row.online_price) === 1000 &&
      row.enabled === false &&
      row.featured === false &&
      row.sort_order === 999 &&
      auditCounts["package.create"] === 1;
  } else if (expectedState === "updated") {
    const row = record.rows[0];
    pass =
      record.rowCount === 1 &&
      Number(row.online_price) === 2000 &&
      row.enabled === false &&
      row.featured === true &&
      row.sort_order === 9998 &&
      auditCounts["package.create"] === 1 &&
      auditCounts["package.update"] >= 1 &&
      updateAudit?.has_before === true &&
      updateAudit?.has_after === true;
  } else {
    pass =
      record.rowCount === 0 &&
      packageCount.rows[0].count === 4 &&
      auditCounts["package.create"] === 1 &&
      auditCounts["package.update"] >= 1 &&
      auditCounts["package.delete"] === 1;
  }
  if (!pass) {
    const row = record.rows[0];
    console.log(JSON.stringify({
      status: "MISMATCH",
      expectedState,
      recordCount: record.rowCount,
      onlinePrice: row ? Number(row.online_price) : null,
      enabled: row?.enabled ?? null,
      featured: row?.featured ?? null,
      sortOrder: row?.sort_order ?? null,
      createAudits: auditCounts["package.create"] || 0,
      updateAudits: auditCounts["package.update"] || 0,
      deleteAudits: auditCounts["package.delete"] || 0,
    }));
    throw new Error(`Package QA ${expectedState} verification failed`);
  }
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    expectedState,
    recordCount: record.rowCount,
    remainingPackages: packageCount.rows[0].count,
    createAudits: auditCounts["package.create"] || 0,
    updateAudits: auditCounts["package.update"] || 0,
    deleteAudits: auditCounts["package.delete"] || 0,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
