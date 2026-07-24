export function testimonialPayloadFromForm(form: FormData) {
  const imageUrl = String(form.get("image_url") || "").trim();
  const altText = String(form.get("alt_text") || "").trim().slice(0, 240);
  const sortOrder = Number(String(form.get("sort_order") || "0"));
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
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    throw new Error("invalid order");
  }
  return {
    image_url: imageUrl,
    alt_text: altText,
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}
