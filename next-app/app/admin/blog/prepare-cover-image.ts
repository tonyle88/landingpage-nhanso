import { safeMediaFileStem } from "@/lib/admin/media-file-name";

export const MAX_SOURCE_IMAGE_BYTES = 5 * 1024 * 1024;
export const MAX_FORM_IMAGE_BYTES = 4 * 1024 * 1024;

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const OUTPUT_ATTEMPTS = [
  { maxDimension: 2400, quality: 0.8 },
  { maxDimension: 2000, quality: 0.74 },
  { maxDimension: 1600, quality: 0.68 },
  { maxDimension: 1280, quality: 0.62 },
];

function canvasToBlob(canvas: HTMLCanvasElement, quality: number) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob?.type === "image/webp"
        ? resolve(blob)
        : reject(new Error("Trình duyệt không hỗ trợ mã hóa ảnh WebP.")),
      "image/webp",
      quality,
    );
  });
}

async function optimizeImage(file: File) {
  const bitmap = await createImageBitmap(file);
  try {
    for (const { maxDimension, quality } of OUTPUT_ATTEMPTS) {
      const scale = Math.min(1, maxDimension / bitmap.width, maxDimension / bitmap.height);
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const context = canvas.getContext("2d");
      if (!context) throw new Error("Trình duyệt không thể mở vùng xử lý ảnh.");
      context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      const blob = await canvasToBlob(canvas, quality);
      if (blob.size <= MAX_FORM_IMAGE_BYTES) return blob;
    }
  } finally {
    bitmap.close();
  }
  throw new Error("Không thể giảm ảnh xuống dung lượng phù hợp. Hãy chọn ảnh khác.");
}

export async function prepareCoverImage(file: File, title: string) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new Error("Chỉ hỗ trợ ảnh JPEG, PNG hoặc WebP.");
  }
  if (!file.size || file.size > MAX_SOURCE_IMAGE_BYTES) {
    throw new Error("Ảnh bìa phải nhỏ hơn hoặc bằng 5 MB.");
  }

  const fallbackName = file.name.replace(/\.[^.]+$/, "");
  const stem = safeMediaFileStem(title || fallbackName);
  if (typeof createImageBitmap !== "function") {
    if (file.size > MAX_FORM_IMAGE_BYTES) {
      throw new Error("Trình duyệt không thể tối ưu ảnh này. Hãy chọn ảnh dưới 4 MB.");
    }
    return new File([file], `${stem}-anh-bia.${file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg"}`, {
      type: file.type,
      lastModified: file.lastModified,
    });
  }

  const optimized = await optimizeImage(file);
  return new File([optimized], `${stem}-anh-bia.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}
