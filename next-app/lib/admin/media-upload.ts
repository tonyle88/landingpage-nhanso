import "server-only";

import { randomUUID } from "node:crypto";
import sharp from "sharp";
import { createServiceServerClient } from "@/lib/supabase/server";

const BUCKET = "content-images";
const MAX_BYTES = 5 * 1024 * 1024;
const MIME_EXTENSIONS = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;

type AllowedMime = keyof typeof MIME_EXTENSIONS;

function hasValidMagic(bytes: Uint8Array, mime: AllowedMime) {
  if (mime === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mime === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47 &&
      bytes[4] === 0x0d &&
      bytes[5] === 0x0a &&
      bytes[6] === 0x1a &&
      bytes[7] === 0x0a
    );
  }
  return (
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  );
}

export type UploadedMedia = {
  id: string;
  bucket: string;
  objectPath: string;
  publicUrl: string;
};

export async function uploadContentImage({
  file,
  folder,
  altText,
  uploadedBy,
  webp,
}: {
  file: File;
  folder: "blog" | "testimonials";
  altText: string;
  uploadedBy: string;
  webp?: {
    width: number;
    height: number;
    fit: "cover" | "inside";
    quality?: number;
  };
}): Promise<UploadedMedia | null> {
  if (!file.size) return null;
  if (file.size > MAX_BYTES) throw new Error("image too large");

  const mime = file.type as AllowedMime;
  if (!MIME_EXTENSIONS[mime]) throw new Error("unsupported image type");

  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!hasValidMagic(bytes, mime)) throw new Error("invalid image signature");

  let uploadBytes = bytes;
  let uploadMime: AllowedMime = mime;
  let extension = MIME_EXTENSIONS[mime];
  if (webp) {
    uploadBytes = new Uint8Array(await sharp(bytes, { failOn: "warning" })
      .rotate()
      .resize({
        width: webp.width,
        height: webp.height,
        fit: webp.fit,
        withoutEnlargement: true,
      })
      .webp({ quality: webp.quality ?? 70, effort: 5 })
      .toBuffer());
    uploadMime = "image/webp";
    extension = "webp";
  }

  const supabase = createServiceServerClient();
  if (!supabase) throw new Error("storage is not configured");

  const objectPath = `${folder}/${randomUUID()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(BUCKET)
    .upload(objectPath, uploadBytes, {
      contentType: uploadMime,
      cacheControl: "31536000",
      upsert: false,
    });
  if (uploadError) throw new Error("storage upload failed");

  const { data: publicData } = supabase.storage
    .from(BUCKET)
    .getPublicUrl(objectPath);
  const publicUrl = publicData.publicUrl;
  const { data: asset, error: assetError } = await supabase
    .from("media_assets")
    .insert({
      bucket: BUCKET,
      object_path: objectPath,
      public_url: publicUrl,
      mime_type: uploadMime,
      byte_size: uploadBytes.byteLength,
      alt_text: altText.slice(0, 240),
      is_public: true,
      uploaded_by: uploadedBy,
    })
    .select("id")
    .single();

  if (assetError || !asset) {
    await supabase.storage.from(BUCKET).remove([objectPath]);
    throw new Error("media metadata insert failed");
  }
  return {
    id: asset.id,
    bucket: BUCKET,
    objectPath,
    publicUrl,
  };
}

export async function removeUploadedMedia(upload: UploadedMedia | null) {
  if (!upload) return;
  const supabase = createServiceServerClient();
  if (!supabase) return;
  await supabase.storage.from(upload.bucket).remove([upload.objectPath]);
  await supabase.from("media_assets").delete().eq("id", upload.id);
}

export async function removeStoredMediaById(id: string | null | undefined) {
  if (!id) return;
  const supabase = createServiceServerClient();
  if (!supabase) return;
  const { data } = await supabase
    .from("media_assets")
    .select("id,bucket,object_path")
    .eq("id", id)
    .maybeSingle();
  if (
    !data ||
    data.bucket !== BUCKET ||
    !/^(blog|testimonials)\/[0-9a-f-]+\.(jpg|png|webp)$/.test(data.object_path)
  ) {
    return;
  }
  const { error: storageError } = await supabase.storage
    .from(BUCKET)
    .remove([data.object_path]);
  if (!storageError) {
    await supabase.from("media_assets").delete().eq("id", data.id);
  }
}
