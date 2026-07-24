import { createHash } from "node:crypto";

function text(value) {
  return String(value ?? "").trim();
}

function integer(value, fallback = 0) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
}

function slug(value, fallback) {
  const normalized = text(value)
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return normalized || fallback;
}

function publicUrl(value) {
  const candidate = text(value);
  if (!candidate) return null;
  if (candidate.startsWith("/") && !candidate.startsWith("//")) {
    return candidate;
  }
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" || url.protocol === "http:"
      ? url.href
      : null;
  } catch {
    return null;
  }
}

function publishedAt(value) {
  const candidate = text(value);
  if (!candidate) return null;
  const zoned = /^\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}(?::\d{2})?$/.test(
    candidate,
  )
    ? `${candidate.replace(" ", "T")}+07:00`
    : candidate;
  const date = new Date(zoned);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

export function deterministicUuid(scope, value) {
  const bytes = createHash("sha256")
    .update(`${scope}:${value}`)
    .digest()
    .subarray(0, 16);
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.toString("hex");
  return [
    hex.slice(0, 8),
    hex.slice(8, 12),
    hex.slice(12, 16),
    hex.slice(16, 20),
    hex.slice(20),
  ].join("-");
}

export function transformGooglePublicContent({
  landing,
  blog,
  articleDetails,
}) {
  const categoryIds = new Map(
    (blog.blogCategories || []).map((item) => [
      text(item.id),
      deterministicUuid("blog-category", text(item.id)),
    ]),
  );

  return {
    site_settings: (landing.items || [])
      .filter((item) => text(item.key))
      .map((item) => ({
        key: `landing.content.${text(item.key)}`,
        value: {
          value: item.value ?? "",
          selector: text(item.selector),
          type: text(item.type) || "text",
          attribute: text(item.attribute),
          enabled: item.enabled !== false,
        },
        description: text(item.description) || null,
        is_public: true,
      })),
    landing_sections: (landing.sectionsLayout || [])
      .filter((item) => text(item.id))
      .map((item, index) => ({
        id: deterministicUuid("landing-section", text(item.id)),
        section_key: text(item.id),
        section_type: item.type === "builtin" ? "builtin" : "generic",
        display_name: text(item.name) || text(item.title) || text(item.id),
        title: text(item.title) || null,
        eyebrow: text(item.tag) || null,
        content_html: text(item.contentHtml) || null,
        enabled: item.enabled !== false,
        sort_order: integer(item.order, index + 1),
      })),
    packages: (landing.packages || [])
      .filter(
        (item) =>
          item.enabled !== false && text(item.code) && text(item.name),
      )
      .map((item, index) => ({
        id: deterministicUuid("package", text(item.code)),
        code: text(item.code),
        name: text(item.name),
        online_price: integer(item.onlinePrice),
        offline_price:
          item.offlinePrice == null ? null : integer(item.offlinePrice),
        currency: "VND",
        unit: text(item.unit) || "/buổi",
        icon: text(item.icon) || null,
        accent_color: text(item.accent) || null,
        featured: item.featured === true,
        badge: text(item.badge) || null,
        features: Array.isArray(item.features)
          ? item.features.map(text).filter(Boolean)
          : [],
        button_text: text(item.buttonText) || null,
        enabled: true,
        sort_order: integer(item.sortOrder, index + 1),
      })),
    testimonials: (landing.feedbackImages || [])
      .filter((item) => publicUrl(item.url))
      .map((item, index) => {
        const imageUrl = publicUrl(item.url);
        return {
          id: deterministicUuid("testimonial", imageUrl),
          media_asset_id: null,
          image_url: imageUrl,
          alt_text: `Cảm nhận của khách hàng ${index + 1}`,
          enabled: true,
          sort_order: index + 1,
        };
      }),
    blog_categories: (blog.blogCategories || [])
      .filter((item) => text(item.id) && text(item.name))
      .map((item, index) => {
        const legacyId = text(item.id);
        return {
          id: categoryIds.get(legacyId),
          slug: slug(legacyId, `category-${index + 1}`),
          name: text(item.name),
          description: null,
          enabled: true,
          sort_order: integer(item.order, index + 1),
        };
      }),
    blog_posts: (articleDetails || [])
      .filter(
        (item) =>
          item.enabled !== false &&
          text(item.id) &&
          text(item.title) &&
          publishedAt(item.date),
      )
      .map((item, index) => {
        const legacyId = text(item.id);
        return {
          id: deterministicUuid("blog-post", legacyId),
          category_id: categoryIds.get(text(item.categoryId)) || null,
          slug: slug(legacyId, `post-${index + 1}`),
          title: text(item.title),
          summary: text(item.summary) || null,
          content_html: String(item.contentHtml ?? ""),
          cover_asset_id: null,
          cover_url: publicUrl(item.thumbnail),
          pinned: item.pinned === true,
          status: "published",
          published_at: publishedAt(item.date),
          author_id: null,
        };
      }),
  };
}

function stableValue(value) {
  if (Array.isArray(value)) return value.map(stableValue);
  if (value && typeof value === "object") {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, stableValue(value[key])]),
    );
  }
  return value;
}

export function stableJson(value) {
  return JSON.stringify(stableValue(value));
}

export function hashRows(rows) {
  const normalized = rows.map(stableJson).sort();
  return createHash("sha256").update(JSON.stringify(normalized)).digest("hex");
}

export function projectRows(rows, columns) {
  return rows.map((row) =>
    Object.fromEntries(
      columns.map((column) => {
        const value = row[column] ?? null;
        if (
          value &&
          column.endsWith("_at") &&
          typeof value === "string" &&
          !Number.isNaN(Date.parse(value))
        ) {
          return [column, new Date(value).toISOString()];
        }
        return [column, value];
      }),
    ),
  );
}
