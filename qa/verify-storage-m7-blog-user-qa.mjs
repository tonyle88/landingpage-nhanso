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
  throw new Error("Refusing to verify blog Storage QA outside staging");
}

const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: "nhanso-blog-storage-qa-readonly",
});
const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
await db.connect();
try {
  const result = await db.query(
    `select id, cover_asset_id, cover_url, status::text
     from public.blog_posts
     where slug = $1`,
    ["m7-storage-qa-20260725"],
  );
  if (result.rowCount !== 1) throw new Error("Expected one blog Storage QA row");
  const post = result.rows[0];
  if (
    post.status !== "draft" ||
    !post.cover_asset_id ||
    typeof post.cover_url !== "string" ||
    new URL(post.cover_url).hostname !== `${projectRef}.supabase.co`
  ) {
    throw new Error("Blog Storage metadata mismatch");
  }

  const metadata = await db.query(
    `select bucket, object_path, mime_type, byte_size, is_public
     from public.media_assets
     where id = $1`,
    [post.cover_asset_id],
  );
  if (metadata.rowCount !== 1) throw new Error("Blog media metadata missing");
  const asset = metadata.rows[0];
  if (
    asset.bucket !== "content-images" ||
    !asset.object_path.startsWith("blog/") ||
    !asset.is_public ||
    !["image/jpeg", "image/png", "image/webp"].includes(asset.mime_type) ||
    Number(asset.byte_size) <= 0 ||
    Number(asset.byte_size) > 5 * 1024 * 1024
  ) {
    throw new Error("Blog media metadata is invalid");
  }

  const slash = asset.object_path.lastIndexOf("/");
  const folder = asset.object_path.slice(0, slash);
  const name = asset.object_path.slice(slash + 1);
  const { data: objects, error: listError } = await supabase.storage
    .from("content-images")
    .list(folder, { search: name, limit: 10 });
  if (listError || !objects.some((item) => item.name === name)) {
    throw new Error("Blog Storage object missing");
  }

  const audit = await db.query(
    `select count(*)::int as count
     from public.audit_logs
     where action = 'blog_post.create' and target_id = $1`,
    [post.id],
  );
  if (audit.rows[0].count !== 1) throw new Error("Blog create audit mismatch");

  console.log(
    JSON.stringify({
      status: "PASS",
      staging: projectRef,
      blogRows: 1,
      draft: true,
      linkedMediaMetadata: true,
      storageObjectExists: true,
      createAuditRows: 1,
    }),
  );
} finally {
  await db.end();
}
