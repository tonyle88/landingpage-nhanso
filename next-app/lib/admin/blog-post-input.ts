import { optionalUuid } from "./package-input";

const unsafeHtml =
  /<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:/i;
const statuses = new Set(["draft", "published", "archived"]);

export function slugifyBlogTitle(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 160)
    .replace(/-+$/g, "");
}

export function blogPostPayloadFromForm(form: FormData) {
  const title = String(form.get("title") || "").trim();
  const requestedSlug = String(form.get("slug") || "").trim().toLowerCase();
  const slug = requestedSlug || slugifyBlogTitle(title);
  const summary = String(form.get("summary") || "").trim();
  const contentHtml = String(form.get("content_html") || "").trim();
  const coverUrl = String(form.get("cover_url") || "").trim();
  const coverAssetId = optionalUuid(form.get("cover_asset_id"));
  const thumbnailUrl = String(form.get("thumbnail_url") || "").trim();
  const thumbnailAssetId = optionalUuid(form.get("thumbnail_asset_id"));
  const status = String(form.get("status") || "draft");
  const categoryId = optionalUuid(form.get("category_id"));
  const publishedInput = String(form.get("published_at") || "").trim();

  if (!/^[a-z0-9][a-z0-9-]{1,159}$/.test(slug)) throw new Error("invalid slug");
  if (title.length < 2 || title.length > 200) throw new Error("invalid title");
  if (summary.length > 600 || unsafeHtml.test(summary)) {
    throw new Error("invalid summary");
  }
  if (!contentHtml || contentHtml.length > 100_000 || unsafeHtml.test(contentHtml)) {
    throw new Error("invalid content");
  }
  if (!statuses.has(status)) throw new Error("invalid status");
  if (coverUrl) {
    let parsed: URL;
    try {
      parsed = new URL(coverUrl);
    } catch {
      throw new Error("invalid cover URL");
    }
    if (parsed.protocol !== "https:" || coverUrl.length > 2048) {
      throw new Error("invalid cover URL");
    }
  }
  if (thumbnailUrl) {
    let parsed: URL;
    try {
      parsed = new URL(thumbnailUrl);
    } catch {
      throw new Error("invalid thumbnail URL");
    }
    if (parsed.protocol !== "https:" || thumbnailUrl.length > 2048) {
      throw new Error("invalid thumbnail URL");
    }
  }
  let publishedAt = "";
  if (publishedInput) {
    const date = new Date(publishedInput);
    if (!Number.isFinite(date.getTime())) throw new Error("invalid publish date");
    publishedAt = date.toISOString();
  }
  return {
    category_id: categoryId,
    slug,
    title,
    summary,
    content_html: contentHtml,
    cover_asset_id: coverAssetId,
    cover_url: coverUrl,
    thumbnail_asset_id: thumbnailAssetId,
    thumbnail_url: thumbnailUrl,
    pinned: form.get("pinned") === "on",
    status,
    published_at: publishedAt,
  };
}
