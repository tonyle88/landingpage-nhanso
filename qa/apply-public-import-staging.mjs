import { execFile } from "node:child_process";
import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const pg = requireFromApp("pg");
const document = JSON.parse(
  await readFile(
    resolve(root, ".staging-import/public-content-import.json"),
    "utf8",
  ),
);
const sql = await readFile(
  resolve(root, ".staging-import/public-content-import.sql"),
  "utf8",
);
const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const password = process.env.SUPABASE_DB_PASSWORD;
const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

if (!projectRef || !password || !publicUrl) {
  throw new Error("Missing staging Supabase environment variables");
}
const stagingHosts = {
  dwledqvsooobegpqljur: "aws-0-ap-southeast-1.pooler.supabase.com",
};
if (
  new URL(publicUrl).hostname !== `${projectRef}.supabase.co` ||
  !stagingHosts[projectRef]
) {
  throw new Error("Refusing to run: target is not the configured staging project");
}

const evidence = new Set();
let sampling = false;
const sample = async () => {
  if (sampling) return;
  sampling = true;
  try {
    const { stdout } = await execFileAsync("lsof", [
      "-a",
      "-p",
      String(process.pid),
      "-iTCP",
      "-n",
      "-P",
    ]);
    for (const line of stdout.split("\n").slice(1)) {
      const match = line.match(/TCP\s+\S+->(\S+)\s+\(ESTABLISHED\)/);
      if (match) evidence.add(match[1]);
    }
  } catch {
    // A short query can finish between samples; the limitation is reported below.
  } finally {
    sampling = false;
  }
};

const client = new pg.Client({
  host: stagingHosts[projectRef],
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 15_000,
  query_timeout: 60_000,
  application_name: "nhanso-staging-public-import",
});
const timer = setInterval(sample, 25);

try {
  await client.connect();
  await sample();
  // Run twice deliberately: the second pass proves the generated upserts are safe.
  await client.query(sql);
  await client.query(sql);

  const tables = Object.keys(document.tables);
  const counts = {};
  for (const table of tables) {
    if (!/^[a-z_]+$/.test(table)) throw new Error("Unsafe table name");
    const result = await client.query(
      `select count(*)::int as count from public."${table}"`,
    );
    counts[table] = result.rows[0].count;
    if (counts[table] !== document.tables[table].length) {
      throw new Error(
        `${table} count mismatch: expected ${document.tables[table].length}, got ${counts[table]}`,
      );
    }
  }
  const orphanResult = await client.query(`
    select count(*)::int as count
    from public.blog_posts post
    left join public.blog_categories category on category.id = post.category_id
    where post.category_id is not null and category.id is null
  `);
  if (orphanResult.rows[0].count !== 0) {
    throw new Error("Blog category relationship validation failed");
  }
  await sample();
  console.log(
    JSON.stringify({
      status: "PASS",
      target: projectRef,
      passes: 2,
      counts,
      orphanBlogPosts: 0,
      networkEvidence: [...evidence].sort(),
      networkEvidenceCaptured: evidence.size > 0,
    }),
  );
} finally {
  clearInterval(timer);
  await client.end().catch(() => {});
}
