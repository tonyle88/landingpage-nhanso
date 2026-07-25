import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");
const pg = requireFromApp("pg");

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
if (
  projectRef !== "dwledqvsooobegpqljur" ||
  url !== `https://${projectRef}.supabase.co` ||
  !secret ||
  !password
) {
  throw new Error("Refusing to verify Storage cleanup outside staging");
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const altText = "M7 Storage QA";
const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: "nhanso-storage-cleanup-readonly",
});
await db.connect();

const remaining = await db.query(
  "select id from public.testimonials where alt_text = $1",
  [altText],
);
if (remaining.rowCount !== 0) {
  throw new Error(
    `QA testimonials were not fully deleted (remaining=${remaining.rowCount})`,
  );
}

const auditResult = await db.query(
  `select before_data, created_at
   from public.audit_logs
   where action = 'testimonial.delete'
     and before_data->>'alt_text' = $1
   order by created_at desc
   limit 2`,
  [altText],
);
const auditRows = auditResult.rows;
if (auditRows.length !== 2) {
  throw new Error("Expected two testimonial delete audit rows");
}

const assetIds = [];
const objectPaths = [];
for (const row of auditRows) {
  const before = row.before_data;
  if (!before || typeof before !== "object" || Array.isArray(before)) {
    throw new Error("Invalid testimonial audit snapshot");
  }
  if (typeof before.media_asset_id === "string") {
    assetIds.push(before.media_asset_id);
  }
  if (typeof before.image_url === "string") {
    const marker = "/content-images/";
    const markerIndex = before.image_url.indexOf(marker);
    if (markerIndex >= 0) {
      objectPaths.push(before.image_url.slice(markerIndex + marker.length));
    }
  }
}
if (assetIds.length !== 2 || objectPaths.length !== 2) {
  throw new Error("QA audit rows did not identify both Storage assets");
}

const metadata = await db.query(
  "select id from public.media_assets where id = any($1::uuid[])",
  [assetIds],
);
if (metadata.rowCount !== 0) {
  throw new Error("Orphan media metadata remains after delete");
}

for (const objectPath of objectPaths) {
  const slash = objectPath.lastIndexOf("/");
  const folder = objectPath.slice(0, slash);
  const name = objectPath.slice(slash + 1);
  const { data: objects, error: listError } = await supabase.storage
    .from("content-images")
    .list(folder, { search: name, limit: 10 });
  if (listError || objects.some((item) => item.name === name)) {
    throw new Error("Orphan Storage object remains after delete");
  }
}

console.log(
  JSON.stringify({
    status: "PASS",
    staging: projectRef,
    deletedTestimonials: 2,
    deleteAuditRows: 2,
    orphanMetadata: 0,
    orphanObjects: 0,
  }),
);
await db.end();
