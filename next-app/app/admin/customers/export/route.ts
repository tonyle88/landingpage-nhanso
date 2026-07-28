import { NextRequest, NextResponse } from "next/server";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  CUSTOMER_EXPORT_LIMIT,
  customerPeriodLabel,
  formatCustomerBirthDate,
  normalizeCustomerSearch,
  parseCustomerPeriod,
} from "@/lib/admin/customer-report";
import {
  formatBookingDateTime,
  reportFileStamp,
} from "@/lib/admin/booking-report";
import { createXlsxWorkbook } from "@/lib/admin/xlsx-workbook";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

const columns = [
  "Khách hàng",
  "Ngày sinh",
  "Email",
  "Điện thoại",
  "Số lần đặt thành công",
  "Lần thành công gần nhất",
  "Lần thành công đầu tiên",
  "Mã lịch gần nhất",
  "Gói gần nhất",
] as const;

export async function GET(request: NextRequest) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "read_operations")) {
    return NextResponse.json(
      { ok: false, message: "Unauthorized" },
      { status: 401 },
    );
  }

  const search = normalizeCustomerSearch(request.nextUrl.searchParams.get("q"));
  const { year, month } = parseCustomerPeriod(
    request.nextUrl.searchParams.get("year"),
    request.nextUrl.searchParams.get("month"),
  );
  const periodLabel = customerPeriodLabel(year, month);
  const supabase = await createAuthServerClient();
  const { data: customers, error } = await supabase.rpc(
    "admin_list_booking_customers",
    {
      p_search: search || null,
      p_year: year,
      p_month: month,
      p_limit: CUSTOMER_EXPORT_LIMIT,
      p_offset: 0,
    },
  );
  if (error) {
    return NextResponse.json(
      { ok: false, message: "Không thể tạo danh sách khách hàng." },
      { status: 500 },
    );
  }

  const generatedAt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  const rows = (customers || []).map((customer) => [
    customer.customer_name,
    formatCustomerBirthDate(customer.date_of_birth),
    customer.email,
    customer.phone,
    customer.successful_bookings,
    formatBookingDateTime(customer.latest_confirmed_at),
    formatBookingDateTime(customer.first_confirmed_at),
    customer.latest_booking_public_id,
    customer.latest_package_name,
  ]);
  const workbook = createXlsxWorkbook({
    sheetName: "Khách hàng",
    title: "Danh sách khách hàng đã đặt lịch thành công",
    metadata: `Xuất lúc: ${generatedAt} · Người xuất: ${principal.email || principal.userId} · Thời gian: ${periodLabel} · Tìm kiếm: ${search || "Tất cả"} · Tổng số: ${customers?.length || 0}`,
    columns,
    rows,
  });

  return new NextResponse(workbook, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="khach-hang-${year || "tat-ca"}${month ? `-${String(month).padStart(2, "0")}` : ""}-${reportFileStamp()}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
