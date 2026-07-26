export function blogCategoryPayloadFromForm(form: FormData) {
  const slug = String(form.get("slug") || "").trim().toLowerCase();
  const name = String(form.get("name") || "").trim();
  const description = String(form.get("description") || "").trim();
  const sortOrder = Number(String(form.get("sort_order") || "0"));
  if (!/^[a-z0-9][a-z0-9-]{1,99}$/.test(slug)) throw new Error("invalid slug");
  if (name.length < 2 || name.length > 120) throw new Error("invalid name");
  if (description.length > 500) throw new Error("invalid description");
  if (!Number.isInteger(sortOrder) || sortOrder < 0 || sortOrder > 10000) {
    throw new Error("invalid order");
  }
  return {
    slug,
    name,
    description,
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}
