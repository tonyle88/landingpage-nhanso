import { formText, optionalUuid, parseSortOrder } from "./form-input";

/**
 * Chuẩn bị payload feedback ảnh sau khi upload hoặc khi sửa metadata có sẵn.
 * Kiểm tra URL HTTPS, UUID media tùy chọn, alt text và thứ tự; checkbox dùng giá trị on.
 * Không upload hoặc xóa ảnh tại đây; action quản lý vòng đời media và rollback riêng.
 */
export function testimonialPayloadFromForm(form: FormData) {
  const imageUrl = formText(form, "image_url");
  const mediaAssetId = optionalUuid(form.get("media_asset_id"));
  const altText = formText(form, "alt_text").slice(0, 240);
  const sortOrder = parseSortOrder(form.get("sort_order") || "0");
  let parsed: URL;
  try {
    parsed = new URL(imageUrl);
  } catch {
    throw new Error("invalid URL");
  }
  if (parsed.protocol !== "https:" || imageUrl.length > 2048) {
    throw new Error("invalid URL");
  }
  if (altText.length < 2) throw new Error("invalid alt");
  return {
    media_asset_id: mediaAssetId,
    image_url: imageUrl,
    alt_text: altText,
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}
