import type { Database } from "@/lib/supabase/database.types";

type PackageRow = Database["public"]["Tables"]["packages"]["Row"];

export type PublicPackage = {
  code: string;
  name: string;
  onlinePrice: number;
  unit: string;
  icon: string;
  accent: string;
  featured: boolean;
  badge: string;
  features: string[];
  buttonText: string;
  sortOrder: number;
  enabled: boolean;
};

export function toPublicPackage(row: PackageRow): PublicPackage | null {
  if (!row.enabled || !row.code.trim() || !row.name.trim()) return null;
  if (row.online_price == null || row.online_price <= 0) return null;

  return {
    code: row.code,
    name: row.name,
    onlinePrice: row.online_price,
    unit: row.unit || "/buổi",
    icon: row.icon || "sparkles",
    accent: row.accent_color || "teal",
    featured: row.featured,
    badge: row.badge || "",
    features: Array.isArray(row.features)
      ? row.features.filter(
          (feature): feature is string => typeof feature === "string",
        )
      : [],
    buttonText: row.button_text || "Đặt Lịch Ngay",
    sortOrder: row.sort_order,
    enabled: row.enabled,
  };
}
