import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");
const pg = requireFromApp("pg");

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const approved = process.env.PRODUCTION_MEDIA_REPAIR_APPROVED?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
if (
  projectRef !== "nuexmwyyibhkfcisaavw" ||
  approved !== projectRef ||
  !password ||
  !accessToken
) {
  throw new Error("Production media repair is not explicitly approved");
}

const response = await fetch(
  `https://api.supabase.com/v1/projects/${projectRef}/api-keys`,
  {
    headers: { authorization: `Bearer ${accessToken}` },
    signal: AbortSignal.timeout(15_000),
  },
);
if (!response.ok) throw new Error("Unable to retrieve project service key");
const keys = await response.json();
const secret = keys.find((key) => key.name === "service_role")?.api_key?.trim();
if (!secret) throw new Error("Project service key is unavailable");

const document = JSON.parse(
  await readFile(resolve(root, ".staging-import/public-content-import.json")),
);
const sources = new Map([
  ...document.tables.testimonials.map((row) => [
    `testimonial:${row.id}`,
    row.image_url,
  ]),
  ...document.tables.blog_posts.map((row) => [`blog:${row.id}`, row.cover_url]),
]);
const supabase = createClient(`https://${projectRef}.supabase.co`, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: "nhanso-production-media-repair",
});

const MAX_BYTES = 5 * 1024 * 1024;
function detectImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return null;
}
function candidates(source) {
  const parsed = new URL(source);
  if (parsed.hostname !== "drive.google.com") return [parsed.toString()];
  const id =
    parsed.searchParams.get("id") ||
    parsed.pathname.match(/\/file\/d\/([^/]+)/)?.[1];
  if (!id) return [parsed.toString()];
  return [
    parsed.toString(),
    `https://drive.usercontent.google.com/download?id=${encodeURIComponent(id)}&export=download&confirm=t`,
    `https://drive.google.com/uc?id=${encodeURIComponent(id)}&export=download`,
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`,
  ];
}
async function fetchImage(source) {
  for (const candidate of candidates(source)) {
    const result = await fetch(candidate, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
      headers: { "user-agent": "nhanso-production-media-repair/1.0" },
    });
    if (!result.ok) continue;
    const bytes = new Uint8Array(await result.arrayBuffer());
    const mime = bytes.length <= MAX_BYTES && detectImage(bytes);
    if (bytes.length && mime) return { bytes, mime };
  }
  throw new Error("Approved source media is unavailable");
}

await db.connect();
try {
  const existing = await db.query(
    "select count(*)::int as count from storage.objects where bucket_id = 'content-images'",
  );
  if (existing.rows[0].count !== 0) {
    throw new Error("Refusing repair because Storage is not empty");
  }
  const assets = await db.query(`
    select 'testimonial'::text as kind, testimonial.id as content_id,
           asset.object_path, asset.mime_type
    from public.testimonials testimonial
    join public.media_assets asset on asset.id = testimonial.media_asset_id
    union all
    select 'blog'::text, post.id, asset.object_path, asset.mime_type
    from public.blog_posts post
    join public.media_assets asset on asset.id = post.cover_asset_id
    order by 1, 2
  `);
  if (assets.rowCount !== 28) {
    throw new Error(`Expected 28 repair targets, got ${assets.rowCount}`);
  }
  let restored = 0;
  for (const asset of assets.rows) {
    const source = sources.get(`${asset.kind}:${asset.content_id}`);
    if (!source) throw new Error("Source mapping is incomplete");
    const image = await fetchImage(source);
    if (image.mime !== asset.mime_type) {
      throw new Error("Source MIME no longer matches committed metadata");
    }
    const { error } = await supabase.storage
      .from("content-images")
      .upload(asset.object_path, image.bytes, {
        contentType: image.mime,
        cacheControl: "31536000",
        upsert: false,
      });
    if (error) throw new Error("Storage repair upload failed");
    restored += 1;
  }
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      restored,
      writes: restored,
    }),
  );
} finally {
  await db.end().catch(() => {});
}
