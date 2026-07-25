import { randomUUID } from "node:crypto";
import { execFile } from "node:child_process";
import { createRequire } from "node:module";
import { resolve } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const root = resolve(import.meta.dirname, "..");
const requireFromApp = createRequire(resolve(root, "next-app/package.json"));
const { createClient } = requireFromApp("@supabase/supabase-js");

const projectRef = process.env.SUPABASE_PROJECT_REF?.trim();
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const secret = process.env.SUPABASE_SECRET_KEY?.trim();
if (
  projectRef !== "dwledqvsooobegpqljur" ||
  url !== `https://${projectRef}.supabase.co` ||
  !secret
) {
  throw new Error("Refusing to run Storage QA outside approved staging");
}

const supabase = createClient(url, secret, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const bucket = "content-images";
const objectPath = `qa/${randomUUID()}.png`;
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
      const match = line.match(/TCP\\s+\\S+->(\\S+)\\s+\\(ESTABLISHED\\)/);
      if (match) networkEvidence.add(match[1]);
    }
  } catch {}
};

const png = Uint8Array.from([
  0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a,
  0x00, 0x00, 0x00, 0x0d, 0x49, 0x48, 0x44, 0x52,
  0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
  0x08, 0x06, 0x00, 0x00, 0x00, 0x1f, 0x15, 0xc4,
  0x89, 0x00, 0x00, 0x00, 0x0d, 0x49, 0x44, 0x41,
  0x54, 0x08, 0xd7, 0x63, 0xf8, 0xcf, 0xc0, 0xf0,
  0x1f, 0x00, 0x05, 0x00, 0x01, 0xff, 0x89, 0x99,
  0x3d, 0x1d, 0x00, 0x00, 0x00, 0x00, 0x49, 0x45,
  0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
]);

let assetId;
try {
  const { data: bucketData, error: bucketError } =
    await supabase.storage.getBucket(bucket);
  if (
    bucketError ||
    !bucketData?.public ||
    bucketData.file_size_limit !== 5 * 1024 * 1024 ||
    JSON.stringify(bucketData.allowed_mime_types?.sort()) !==
      JSON.stringify(["image/jpeg", "image/png", "image/webp"].sort())
  ) {
    throw new Error("Storage bucket configuration mismatch");
  }

  const { error: uploadError } = await supabase.storage
    .from(bucket)
    .upload(objectPath, png, {
      contentType: "image/png",
      upsert: false,
    });
  if (uploadError) throw new Error("Synthetic PNG upload failed");
  await sampleNetwork();

  const { data: publicData } = supabase.storage
    .from(bucket)
    .getPublicUrl(objectPath);
  const publicResponse = await fetch(publicData.publicUrl, {
    cache: "no-store",
  });
  if (
    publicResponse.status !== 200 ||
    !publicResponse.headers.get("content-type")?.startsWith("image/png")
  ) {
    throw new Error("Public Storage URL verification failed");
  }
  await sampleNetwork();

  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket,
      object_path: objectPath,
      public_url: publicData.publicUrl,
      mime_type: "image/png",
      byte_size: png.byteLength,
      alt_text: "M7 synthetic cleanup",
      is_public: true,
    })
    .select("id")
    .single();
  if (assetError || !asset) {
    throw new Error(
      `Media metadata insert failed (${assetError?.code || "no-code"}: ${
        assetError?.message || "no row"
      })`,
    );
  }
  assetId = asset.id;

  const invalidPath = `qa/${randomUUID()}.txt`;
  const { error: invalidMimeError } = await supabase.storage
    .from(bucket)
    .upload(invalidPath, Uint8Array.from([0x51, 0x41]), {
      contentType: "text/plain",
      upsert: false,
    });
  if (!invalidMimeError) {
    await supabase.storage.from(bucket).remove([invalidPath]);
    throw new Error("Disallowed MIME upload unexpectedly succeeded");
  }

  console.log(
    JSON.stringify({
      status: "PASS",
      staging: projectRef,
      bucketPublic: true,
      maxBytes: 5 * 1024 * 1024,
      allowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
      syntheticPublicRead: true,
      invalidMimeRejected: true,
      networkEvidence: [...networkEvidence].sort(),
      networkEvidenceCaptured: networkEvidence.size > 0,
    }),
  );
} finally {
  if (assetId) {
    await supabase.from("media_assets").delete().eq("id", assetId);
  }
  await supabase.storage.from(bucket).remove([objectPath]);
}
