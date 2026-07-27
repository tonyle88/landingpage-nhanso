import { NextRequest, NextResponse } from "next/server";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  bookingReportSelect,
  bookingStatusLabels,
  formatBookingDateTime,
  parseBookingStatus,
  reportFileStamp,
} from "@/lib/admin/booking-report";
import { createXlsxWorkbook } from "@/lib/admin/xlsx-workbook";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

const columns = [
  "Mã lịch",
  "Trạng thái",
  "Bắt đầu",
  "Kết thúc",
  "Gói dịch vụ",
  "Khách hàng",
  "Điện thoại",
  "Email",
  "Hình thức",
  "Số tiền",
  "Tiền tệ",
  "Mã chuyển khoản",
  "Khách báo chuyển khoản",
  "Giữ chỗ đến",
  "Đã xác nhận lúc",
  "Nhu cầu",
  "Ngày tạo",
] as const;

export async function GET(request: NextRequest) {
  const principal = await getAdminPrincipal();
  if (!principal || !can(principal.role, "read_operations")) {
    return NextResponse.json({ ok: false, message: "Unauthorized" }, { status: 401 });
  }

  const selectedFilter = parseBookingStatus(
    request.nextUrl.searchParams.get("filter"),
  );
  const supabase = await createAuthServerClient();
  let query = supabase
    .from("bookings")
    .select(bookingReportSelect)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (selectedFilter) query = query.eq("status", selectedFilter);
  const { data: bookings, error } = await query;

  if (error) {
    return NextResponse.json(
      { ok: false, message: "Không thể tạo báo cáo lịch hẹn." },
      { status: 500 },
    );
  }

  const title = selectedFilter
    ? `Báo cáo lịch hẹn - ${bookingStatusLabels[selectedFilter]}`
    : "Báo cáo lịch hẹn - Tất cả trạng thái";
  const generatedAt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  const rows = (bookings || []).map((booking) => [
      booking.public_id,
      bookingStatusLabels[booking.status],
      formatBookingDateTime(booking.slot_start),
      formatBookingDateTime(booking.slot_end),
      booking.package_name,
      booking.customer_name,
      booking.phone,
      booking.email,
      booking.consultation_type,
      booking.amount,
      booking.currency,
      booking.payment_order_id || "—",
      formatBookingDateTime(booking.manual_payment_claimed_at),
      formatBookingDateTime(booking.hold_expires_at),
      formatBookingDateTime(booking.confirmed_at),
      booking.concern || "—",
      formatBookingDateTime(booking.created_at),
    ]);
  const workbook = createXlsxWorkbook({
    sheetName: "Lịch hẹn",
    title,
    metadata: `Xuất lúc: ${generatedAt} · Người xuất: ${principal.email || principal.userId} · Tổng số: ${bookings?.length || 0}`,
    columns,
    rows,
  });

  return new NextResponse(workbook, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="lich-hen-${reportFileStamp()}.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
