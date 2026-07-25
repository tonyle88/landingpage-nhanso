import { createRequire } from "node:module";
import { resolve } from "node:path";

const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
if (projectRef !== "dwledqvsooobegpqljur" || !password) {
  throw new Error("Refusing to audit media hosts outside approved staging");
}

const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: "nhanso-storage-host-audit",
});
await db.connect();
try {
  const result = await db.query(`
    select 'testimonial'::text as kind, null::text as slug,
           null::text as title, image_url as url
    from public.testimonials where image_url is not null
    union all
    select 'blog'::text as kind, slug::text, title, cover_url as url
    from public.blog_posts where cover_url is not null
  `);
  const hostCounts = new Map();
  const unresolvedBlog = [];
  for (const row of result.rows) {
    let host = "invalid";
    try {
      host = new URL(row.url).hostname.toLowerCase();
    } catch {}
    hostCounts.set(host, (hostCounts.get(host) || 0) + 1);
    if (
      row.kind === "blog" &&
      (host === "drive.google.com" || host === "i.ibb.co")
    ) {
      unresolvedBlog.push({ slug: row.slug, title: row.title });
    }
  }
  console.log(
    JSON.stringify({
      status: "PASS",
      staging: projectRef,
      mediaRows: result.rowCount,
      hostCounts: Object.fromEntries([...hostCounts].sort()),
      unresolvedBlog,
    }),
  );
} finally {
  await db.end();
}
