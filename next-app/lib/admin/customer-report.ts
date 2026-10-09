import { formatBirthDate } from "./display-format";
export { parsePositivePage as parseCustomerPage } from "../pagination";

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

/**
 * Chuẩn hóa từ khóa tìm khách: trim và giới hạn 100 ký tự trước khi truyền RPC/query URL.
 * Không đọc/lọc toàn bộ khách trong trình duyệt; việc tìm kiếm thực hiện tại DB.
 */
export function normalizeCustomerSearch(value: string | null | undefined) {
  return String(value || "").trim().slice(0, 100);
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

/**
 * Đọc bộ lọc năm/tháng dùng chung giữa danh sách khách, bản in và file xuất Excel.
 * Kiểm tra khoảng năm theo năm hiện tại tại Việt Nam và tháng 1..12; giá trị không hợp lệ thành null.
 * Giữ một quy tắc lọc để dữ liệu người dùng nhìn thấy và dữ liệu xuất ra khớp nhau.
 */
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

/**
 * Tạo URL phân trang khách từ tìm kiếm, năm, tháng và trang hiện tại.
 * Dùng URLSearchParams để mã hóa từ khóa và giữ bộ lọc khi chuyển trang.
 */
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

/**
 * Tạo URL xuất Excel/bản in với cùng bộ lọc đang dùng trên màn danh sách khách.
 * Chỉ đưa từ khóa và bộ lọc do admin chọn, không tuần tự hóa các bản ghi khách vào URL.
 */
export function customerExportHref(
  basePath: "/admin/customers/export" | "/admin/customers/report",
  filter: CustomerFilter,
) {
  const params = new URLSearchParams();
  appendCustomerFilter(params, filter);
  const query = params.toString();
  return query ? `${basePath}?${query}` : basePath;
}

/**
 * Tên hàm theo nghiệp vụ báo cáo khách, dùng helper formatBirthDate chung.
 * Giữ nhãn — khi không có ngày và tránh parse Date làm lệch ngày theo múi giờ.
 */
export function formatCustomerBirthDate(value: string | null) {
  return formatBirthDate(value);
}
