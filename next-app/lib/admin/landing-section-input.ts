const unsafeHtml =
  /<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:/i;

export function landingSectionPayloadFromForm(form: FormData) {
  const displayName = String(form.get("display_name") || "").trim();
  const title = String(form.get("title") || "").trim();
  const eyebrow = String(form.get("eyebrow") || "").trim();
  const contentHtml = String(form.get("content_html") || "").trim();
  const sortOrder = Number(form.get("sort_order"));

  if (displayName.length < 2 || displayName.length > 160) {
    throw new Error("invalid display name");
  }
  if (title.length > 300 || eyebrow.length > 160) {
    throw new Error("invalid section copy");
  }
  if (contentHtml.length > 100_000 || unsafeHtml.test(contentHtml)) {
    throw new Error("invalid section HTML");
  }
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10_000) {
    throw new Error("invalid sort order");
  }

  return {
    display_name: displayName,
    title,
    eyebrow,
    content_html: contentHtml,
    sort_order: sortOrder,
    enabled: form.get("enabled") === "on",
  };
}
