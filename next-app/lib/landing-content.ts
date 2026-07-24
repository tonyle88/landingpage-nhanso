import type { Database, Json } from "@/lib/supabase/database.types";

type SiteSettingRow = Database["public"]["Tables"]["site_settings"]["Row"];
type LandingSectionRow =
  Database["public"]["Tables"]["landing_sections"]["Row"];

export type LandingContentItem = {
  key: string;
  selector?: string;
  value: Json;
  type?: string;
  attribute?: string;
  enabled: boolean;
};

export type LandingSection = {
  id: string;
  type: "builtin" | "generic";
  order: number;
  enabled: boolean;
  tag?: string;
  title?: string;
  contentHtml?: string;
};

export type PublicLandingContent = {
  items: LandingContentItem[];
  sectionsLayout: LandingSection[];
};

function isJsonObject(
  value: Json,
): value is { [key: string]: Json | undefined } {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function toLandingContentItem(
  row: SiteSettingRow,
): LandingContentItem | null {
  if (!row.is_public) return null;
  const key = row.key.replace(/^landing\.content\./, "").trim();
  if (!key) return null;

  if (isJsonObject(row.value)) {
    if (!("value" in row.value) && !("selector" in row.value)) return null;
    const selector =
      typeof row.value.selector === "string"
        ? row.value.selector.trim()
        : undefined;
    const type =
      typeof row.value.type === "string" ? row.value.type.trim() : undefined;
    const attribute =
      typeof row.value.attribute === "string"
        ? row.value.attribute.trim()
        : undefined;
    return {
      key,
      value: row.value.value ?? "",
      ...(selector ? { selector } : {}),
      ...(type ? { type } : {}),
      ...(attribute ? { attribute } : {}),
      enabled: row.value.enabled !== false,
    };
  }

  return { key, value: row.value, enabled: true };
}

export function toLandingSection(row: LandingSectionRow): LandingSection {
  return {
    id: row.section_key,
    type: row.section_type === "builtin" ? "builtin" : "generic",
    order: row.sort_order,
    enabled: row.enabled,
    ...(row.eyebrow ? { tag: row.eyebrow } : {}),
    ...(row.title || row.display_name
      ? { title: row.title || row.display_name }
      : {}),
    ...(row.content_html ? { contentHtml: row.content_html } : {}),
  };
}
