import type { Database } from "@/lib/supabase/database.types";

export type CustomerSummary =
  Database["public"]["Functions"]["admin_list_booking_customers"]["Returns"][number];

export const CUSTOMER_PAGE_SIZE = 10;
export const CUSTOMER_EXPORT_LIMIT = 5000;
export const CUSTOMER_MONTHS = [
  "Tháng 1",
  "Tháng 2",
  "Tháng 3",
  "Tháng 4",
  "Tháng 5",
  "Tháng 6",
  "Tháng 7",
  "Tháng 8",
  "Tháng 9",
  "Tháng 10",
  "Tháng 11",
  "Tháng 12",
] as const;

export function normalizeCustomerSearch(value: string | null | undefined) {
  return String(value || "").trim().slice(0, 100);
}

export function parseCustomerPage(value: string | null | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function currentVietnamYear(date = new Date()) {
  return Number(
    new Intl.DateTimeFormat("en", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
    }).format(date),
  );
}

export function customerYearOptions(date = new Date()) {
  const currentYear = currentVietnamYear(date);
  return Array.from({ length: 10 }, (_, index) => currentYear - index);
}

export function parseCustomerPeriod(
  yearValue: string | null | undefined,
  monthValue: string | null | undefined,
  date = new Date(),
) {
  const rawYear = Number.parseInt(yearValue || "", 10);
  const rawMonth = Number.parseInt(monthValue || "", 10);
  const month =
    Number.isSafeInteger(rawMonth) && rawMonth >= 1 && rawMonth <= 12
      ? rawMonth
      : null;
  const year =
    Number.isSafeInteger(rawYear) && rawYear >= 2000 && rawYear <= 2100
      ? rawYear
      : month
        ? currentVietnamYear(date)
        : null;
  return { year, month };
}

export function customerPeriodLabel(
  year: number | null,
  month: number | null,
) {
  if (year && month) return `${CUSTOMER_MONTHS[month - 1]}/${year}`;
  if (year) return `Năm ${year}`;
  return "Tất cả thời gian";
}

type CustomerFilter = {
  search: string;
  year: number | null;
  month: number | null;
};

function appendCustomerFilter(
  params: URLSearchParams,
  { search, year, month }: CustomerFilter,
) {
  if (search) params.set("q", search);
  if (year) params.set("year", String(year));
  if (month) params.set("month", String(month));
}

export function customerDirectoryHref({
  search,
  year,
  month,
  page = 1,
}: CustomerFilter & { page?: number }) {
  const params = new URLSearchParams();
  appendCustomerFilter(params, { search, year, month });
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/customers?${query}` : "/admin/customers";
}

export function customerExportHref(
  basePath: "/admin/customers/export" | "/admin/customers/report",
  filter: CustomerFilter,
) {
  const params = new URLSearchParams();
  appendCustomerFilter(params, filter);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

export function formatCustomerBirthDate(value: string | null) {
  if (!value) return "—";
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}
