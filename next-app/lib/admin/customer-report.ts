import type { Database } from "@/lib/supabase/database.types";

export type CustomerSummary =
  Database["public"]["Functions"]["admin_list_booking_customers"]["Returns"][number];

export const CUSTOMER_PAGE_SIZE = 10;
export const CUSTOMER_EXPORT_LIMIT = 5000;

export function normalizeCustomerSearch(value: string | null | undefined) {
  return String(value || "").trim().slice(0, 100);
}

export function parseCustomerPage(value: string | null | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

export function customerDirectoryHref(search: string, page = 1) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/customers?${query}` : "/admin/customers";
}

export function customerExportHref(
  basePath: "/admin/customers/export" | "/admin/customers/report",
  search: string,
) {
  const params = new URLSearchParams();
  if (search) params.set("q", search);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function formatCustomerBirthDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

