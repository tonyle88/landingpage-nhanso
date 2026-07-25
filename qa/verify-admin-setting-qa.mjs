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
const qaKey = "codex.qa.setting.20260724";
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};
if (
  !projectRef ||
  !password ||
  !stagingHosts[projectRef] ||
  !allowedStates.has(expectedState)
) {
  throw new Error("Refusing unsafe setting QA verification");
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
  application_name: "nhanso-setting-live-qa",
});

try {
  await client.connect();
  await sample();
  const record = await client.query(
    `select is_public, value->>'label' as label, (value->>'version')::int as version
     from public.site_settings where key = $1`,
    [qaKey],
  );
  const settingCount = await client.query(
    "select count(*)::int as count from public.site_settings",
  );
  const audits = await client.query(
    `select
       action,
       count(*)::int as count,
       bool_and(before_data is not null) as has_before,
       bool_and(after_data is not null) as has_after,
       bool_and(not coalesce(before_data ? 'value', false)) as before_has_no_raw,
       bool_and(not coalesce(after_data ? 'value', false)) as after_has_no_raw,
       bool_and(
         case
           when after_data is null then true
           when action = 'site_setting.delete' then true
           else after_data->>'value_sha256' = encode(
             extensions.digest(
               (select value::text from public.site_settings where key = $1),
               'sha256'
             ),
             'hex'
           )
         end
       ) as current_hash_matches
     from public.audit_logs
     where target_type = 'site_setting' and target_id = $1
     group by action`,
    [qaKey],
  );
  const auditCounts = Object.fromEntries(
    audits.rows.map((row) => [row.action, row.count]),
  );
  const createAudit = audits.rows.find(
    (row) => row.action === "site_setting.create",
  );
  const updateAudit = audits.rows.find(
    (row) => row.action === "site_setting.update",
  );
  const allAuditRowsSafe = audits.rows.every(
    (row) => row.before_has_no_raw === true && row.after_has_no_raw === true,
  );
  let pass = false;
  if (expectedState === "created") {
    const row = record.rows[0];
    pass =
      record.rowCount === 1 &&
      row.label === "QA tạm thời" &&
      row.version === 1 &&
      row.is_public === false &&
      settingCount.rows[0].count === 225 &&
      auditCounts["site_setting.create"] === 1 &&
      createAudit?.current_hash_matches === true &&
      allAuditRowsSafe;
  } else if (expectedState === "updated") {
    const row = record.rows[0];
    pass =
      record.rowCount === 1 &&
      row.label === "QA đã cập nhật" &&
      row.version === 2 &&
      row.is_public === true &&
      settingCount.rows[0].count === 225 &&
      auditCounts["site_setting.create"] === 1 &&
      auditCounts["site_setting.update"] >= 1 &&
      updateAudit?.has_before === true &&
      updateAudit?.has_after === true &&
      updateAudit?.current_hash_matches === true &&
      allAuditRowsSafe;
  } else {
    pass =
      record.rowCount === 0 &&
      settingCount.rows[0].count === 224 &&
      auditCounts["site_setting.create"] === 1 &&
      auditCounts["site_setting.update"] >= 1 &&
      auditCounts["site_setting.delete"] === 1 &&
      allAuditRowsSafe;
  }
  if (!pass) {
    const row = record.rows[0];
    console.log(JSON.stringify({
      status: "MISMATCH",
      expectedState,
      recordCount: record.rowCount,
      totalSettings: settingCount.rows[0].count,
      isPublic: row?.is_public ?? null,
      version: row?.version ?? null,
      createAudits: auditCounts["site_setting.create"] || 0,
      updateAudits: auditCounts["site_setting.update"] || 0,
      deleteAudits: auditCounts["site_setting.delete"] || 0,
      auditRowsContainNoRawValue: allAuditRowsSafe,
    }));
    throw new Error(`Setting QA ${expectedState} verification failed`);
  }
  await sample();
  console.log(JSON.stringify({
    status: "PASS",
    target: projectRef,
    expectedState,
    recordCount: record.rowCount,
    remainingSettings: settingCount.rows[0].count,
    createAudits: auditCounts["site_setting.create"] || 0,
    updateAudits: auditCounts["site_setting.update"] || 0,
    deleteAudits: auditCounts["site_setting.delete"] || 0,
    auditRowsContainNoRawValue: true,
    networkEvidence: [...evidence].sort(),
    networkEvidenceCaptured: evidence.size > 0,
  }));
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
