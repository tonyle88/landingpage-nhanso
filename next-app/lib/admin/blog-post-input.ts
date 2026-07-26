import { optionalUuid } from "./package-input";

const unsafeHtml =
  /<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:/i;
const statuses = new Set(["draft", "published", "archived"]);

export function blogPostPayloadFromForm(form: FormData) {
  const slug = String(form.get("slug") || "").trim().toLowerCase();
  const title = String(form.get("title") || "").trim();
  const summary = String(form.get("summary") || "").trim();
  const contentHtml = String(form.get("content_html") || "").trim();
  const coverUrl = String(form.get("cover_url") || "").trim();
  const coverAssetId = optionalUuid(form.get("cover_asset_id"));
  const status = String(form.get("status") || "draft");
  const categoryId = optionalUuid(form.get("category_id"));
  const publishedInput = String(form.get("published_at") || "").trim();

  if (!/^[a-z0-9][a-z0-9-]{1,159}$/.test(slug)) throw new Error("invalid slug");
  if (title.length < 2 || title.length > 200) throw new Error("invalid title");
  if (summary.length > 600) throw new Error("invalid summary");
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
    pinned: form.get("pinned") === "on",
    status,
    published_at: publishedAt,
  };
}
