import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");
const pg = requireFromApp("pg");

const apply = process.argv.includes("--apply");
const probe = process.argv.includes("--probe");
const allowPartial = process.argv.includes("--allow-partial");
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
  throw new Error("Refusing to migrate media outside approved staging");
}
if (apply && process.env.M7_STORAGE_MIGRATION_APPROVED !== projectRef) {
  throw new Error("Missing explicit M7 staging migration approval");
}

const MAX_BYTES = 5 * 1024 * 1024;
const allowedHosts = new Set(["drive.google.com", "i.ibb.co"]);
const db = new pg.Client({
  host: "aws-0-ap-southeast-1.pooler.supabase.com",
  port: 5432,
  database: "postgres",
  user: `postgres.${projectRef}`,
  password,
  ssl: { rejectUnauthorized: false },
  application_name: apply
    ? "nhanso-storage-m7-apply"
    : "nhanso-storage-m7-dry-run",
});
const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const networkEvidence = new Set();
const sampleNetwork = async () => {
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
      if (match) networkEvidence.add(match[1]);
    }
  } catch {}
};

function detectImage(bytes) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return { mime: "image/jpeg", extension: "jpg" };
  }
  if (
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a
  ) {
    return { mime: "image/png", extension: "png" };
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
    return { mime: "image/webp", extension: "webp" };
  }
  return null;
}

function downloadUrls(source) {
  const parsed = new URL(source);
  if (parsed.hostname !== "drive.google.com") return [parsed.toString()];
  const pathMatch = parsed.pathname.match(/\/file\/d\/([^/]+)/);
  const id = parsed.searchParams.get("id") || pathMatch?.[1];
  if (!id) return [parsed.toString()];
  const direct = new URL("https://drive.usercontent.google.com/download");
  direct.searchParams.set("id", id);
  direct.searchParams.set("export", "download");
  direct.searchParams.set("confirm", "t");
  const uc = new URL("https://drive.google.com/uc");
  uc.searchParams.set("id", id);
  uc.searchParams.set("export", "download");
  return [
    parsed.toString(),
    direct.toString(),
    uc.toString(),
    `https://lh3.googleusercontent.com/d/${encodeURIComponent(id)}=w1600`,
  ];
}

async function fetchImage(source) {
  for (const candidate of downloadUrls(source)) {
    const response = await fetch(candidate, {
      redirect: "follow",
      signal: AbortSignal.timeout(30_000),
      headers: { "user-agent": "nhanso-staging-media-migration/1.0" },
    });
    if (!response.ok) continue;
    const declaredLength = Number(response.headers.get("content-length") || 0);
    if (declaredLength > MAX_BYTES) continue;
    const bytes = new Uint8Array(await response.arrayBuffer());
    if (!bytes.length || bytes.length > MAX_BYTES) continue;
    const type = detectImage(bytes);
    if (type) return { bytes, type };
  }
  throw new Error(
    `External media is unavailable or invalid (host=${
      new URL(source).hostname
    })`,
  );
}

await db.connect();
const uploaded = [];
try {
  const result = await db.query(`
    select 'testimonial'::text as kind, id, image_url as source_url,
           alt_text as label
    from public.testimonials
    where media_asset_id is null and image_url is not null
    union all
    select 'blog'::text as kind, id, cover_url as source_url, title as label
    from public.blog_posts
    where cover_asset_id is null and cover_url is not null
    order by kind, id
  `);
  const rows = result.rows.filter((row) => {
    try {
      return allowedHosts.has(new URL(row.source_url).hostname.toLowerCase());
    } catch {
      return false;
    }
  });
  const hostCounts = {};
  const kindCounts = {};
  for (const row of rows) {
    const host = new URL(row.source_url).hostname.toLowerCase();
    hostCounts[host] = (hostCounts[host] || 0) + 1;
    kindCounts[row.kind] = (kindCounts[row.kind] || 0) + 1;
  }
  if (!apply) {
    if (probe) {
      const accessible = {};
      const inaccessible = {};
      for (const row of rows) {
        const key = `${row.kind}:${new URL(row.source_url).hostname.toLowerCase()}`;
        try {
          await fetchImage(row.source_url);
          accessible[key] = (accessible[key] || 0) + 1;
        } catch {
          inaccessible[key] = (inaccessible[key] || 0) + 1;
        }
        await sampleNetwork();
      }
      console.log(
        JSON.stringify({
          status: "PROBE",
          staging: projectRef,
          plannedRows: rows.length,
          accessible,
          inaccessible,
          writes: 0,
          networkEvidence: [...networkEvidence].sort(),
          networkEvidenceCaptured: networkEvidence.size > 0,
        }),
      );
      process.exit(0);
    }
    console.log(
      JSON.stringify({
        status: "DRY_RUN",
        staging: projectRef,
        plannedRows: rows.length,
        hostCounts,
        kindCounts,
        writes: 0,
      }),
    );
    process.exit(0);
  }
  if (rows.length !== 30) {
    throw new Error(`Migration plan changed; expected 30 rows, got ${rows.length}`);
  }

  let unavailableRows = 0;
  for (const row of rows) {
    let image;
    try {
      image = await fetchImage(row.source_url);
    } catch (error) {
      if (!allowPartial) throw error;
      unavailableRows += 1;
      continue;
    }
    const { bytes, type } = image;
    const folder = row.kind === "blog" ? "blog" : "testimonials";
    const objectPath = `${folder}/${randomUUID()}.${type.extension}`;
    const { error: uploadError } = await supabase.storage
      .from("content-images")
      .upload(objectPath, bytes, {
        contentType: type.mime,
        cacheControl: "31536000",
        upsert: false,
      });
    if (uploadError) throw new Error("Supabase media upload failed");
    const publicUrl = supabase.storage
      .from("content-images")
      .getPublicUrl(objectPath).data.publicUrl;
    uploaded.push({
      ...row,
      objectPath,
      publicUrl,
      mime: type.mime,
      byteSize: bytes.length,
      sourceHost: new URL(row.source_url).hostname.toLowerCase(),
    });
    await sampleNetwork();
  }
  if (
    (!allowPartial && unavailableRows !== 0) ||
    (allowPartial && (uploaded.length !== 28 || unavailableRows !== 2))
  ) {
    throw new Error(
      `Accessible media plan changed (uploaded=${uploaded.length}, unavailable=${unavailableRows})`,
    );
  }

  await db.query("begin");
  try {
    for (const item of uploaded) {
      const assetId = randomUUID();
      await db.query(
        `insert into public.media_assets (
           id, bucket, object_path, public_url, mime_type, byte_size,
           alt_text, is_public
         ) values ($1, 'content-images', $2, $3, $4, $5, $6, true)`,
        [
          assetId,
          item.objectPath,
          item.publicUrl,
          item.mime,
          item.byteSize,
          String(item.label || "").slice(0, 240),
        ],
      );
      if (item.kind === "testimonial") {
        await db.query(
          `update public.testimonials
           set media_asset_id = $1, image_url = $2
           where id = $3 and media_asset_id is null`,
          [assetId, item.publicUrl, item.id],
        );
      } else {
        await db.query(
          `update public.blog_posts
           set cover_asset_id = $1, cover_url = $2
           where id = $3 and cover_asset_id is null`,
          [assetId, item.publicUrl, item.id],
        );
      }
      await db.query(
        `insert into public.audit_logs (
           action, target_type, target_id, message, after_data
         ) values (
           'media.migrate', $1, $2, 'M7 staging external media migration',
           jsonb_build_object(
             'source_host', $3::text,
             'bucket', 'content-images',
             'object_path', $4::text,
             'byte_size', $5::integer
           )
         )`,
        [item.kind, item.id, item.sourceHost, item.objectPath, item.byteSize],
      );
    }
    await db.query("commit");
  } catch (error) {
    await db.query("rollback");
    throw error;
  }

  console.log(
    JSON.stringify({
      status: "PASS",
      staging: projectRef,
      migratedRows: uploaded.length,
      unavailableRows,
      hostCounts,
      kindCounts,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} catch (error) {
  if (uploaded.length > 0) {
    await supabase.storage
      .from("content-images")
      .remove(uploaded.map((item) => item.objectPath));
  }
  throw error;
} finally {
  await db.end();
}
