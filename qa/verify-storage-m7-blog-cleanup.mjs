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
  throw new Error("Refusing to verify blog cleanup outside staging");
}

const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: "nhanso-blog-cleanup-readonly",
});
const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await db.connect();
try {
  const remaining = await db.query(
    "select id from public.blog_posts where slug = $1",
    ["m7-storage-qa-20260725"],
  );
  if (remaining.rowCount !== 0) throw new Error("Blog QA row remains");

  const audit = await db.query(
    `select before_data
     from public.audit_logs
     where action = 'blog_post.delete'
       and before_data->>'slug' = $1
     order by created_at desc
     limit 1`,
    ["m7-storage-qa-20260725"],
  );
  if (audit.rowCount !== 1) throw new Error("Blog delete audit missing");
  const before = audit.rows[0].before_data;
  const assetId = before?.cover_asset_id;
  const coverUrl = before?.cover_url;
  if (typeof assetId !== "string" || typeof coverUrl !== "string") {
    throw new Error("Blog delete audit lacks Storage identifiers");
  }

  const metadata = await db.query(
    "select id from public.media_assets where id = $1",
    [assetId],
  );
  if (metadata.rowCount !== 0) throw new Error("Blog media metadata orphan");

  const marker = "/content-images/";
  const markerIndex = coverUrl.indexOf(marker);
  if (markerIndex < 0) throw new Error("Blog audit cover URL is not Storage");
  const objectPath = coverUrl.slice(markerIndex + marker.length);
  const slash = objectPath.lastIndexOf("/");
  const folder = objectPath.slice(0, slash);
  const name = objectPath.slice(slash + 1);
  const { data: objects, error: listError } = await supabase.storage
    .from("content-images")
    .list(folder, { search: name, limit: 10 });
  if (listError || objects.some((item) => item.name === name)) {
    throw new Error("Blog Storage object orphan");
  }

  console.log(
    JSON.stringify({
      status: "PASS",
      staging: projectRef,
      blogRows: 0,
      deleteAuditRows: 1,
      orphanMetadata: 0,
      orphanObjects: 0,
    }),
  );
} finally {
  await db.end();
}
