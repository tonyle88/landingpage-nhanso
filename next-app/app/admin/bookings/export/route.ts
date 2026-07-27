import { NextRequest, NextResponse } from "next/server";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  bookingReportSelect,
  bookingStatusLabels,
  escapeXml,
  formatBookingDateTime,
  parseBookingStatus,
  reportFileStamp,
} from "@/lib/admin/booking-report";
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

function stringCell(value: unknown, style = "Cell") {
  return `<Cell ss:StyleID="${style}"><Data ss:Type="String">${escapeXml(value)}</Data></Cell>`;
}

function numberCell(value: number) {
  return `<Cell ss:StyleID="Money"><Data ss:Type="Number">${Number.isFinite(value) ? value : 0}</Data></Cell>`;
}

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
  const rows = (bookings || []).map((booking) => {
    const values = [
      booking.public_id,
      bookingStatusLabels[booking.status],
      formatBookingDateTime(booking.slot_start),
      formatBookingDateTime(booking.slot_end),
      booking.package_name,
      booking.customer_name,
      booking.phone,
      booking.email,
      booking.consultation_type,
    ];
    return `<Row>${values.map((value) => stringCell(value)).join("")}${numberCell(booking.amount)}${[
      booking.currency,
      booking.payment_order_id || "—",
      formatBookingDateTime(booking.manual_payment_claimed_at),
      formatBookingDateTime(booking.hold_expires_at),
      formatBookingDateTime(booking.confirmed_at),
      booking.concern || "—",
      formatBookingDateTime(booking.created_at),
    ].map((value) => stringCell(value)).join("")}</Row>`;
  });

  const workbook = `<?xml version="1.0" encoding="UTF-8"?>
<?mso-application progid="Excel.Sheet"?>
<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet"
 xmlns:o="urn:schemas-microsoft-com:office:office"
 xmlns:x="urn:schemas-microsoft-com:office:excel"
 xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">
 <Styles>
  <Style ss:ID="Default" ss:Name="Normal"><Alignment ss:Vertical="Center"/><Font ss:FontName="Arial" ss:Size="10"/></Style>
  <Style ss:ID="Title"><Font ss:FontName="Arial" ss:Size="16" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#12343A" ss:Pattern="Solid"/></Style>
  <Style ss:ID="Meta"><Font ss:FontName="Arial" ss:Size="10" ss:Color="#4B5F63"/></Style>
  <Style ss:ID="Header"><Alignment ss:Horizontal="Center" ss:Vertical="Center" ss:WrapText="1"/><Font ss:FontName="Arial" ss:Bold="1" ss:Color="#FFFFFF"/><Interior ss:Color="#D94E1F" ss:Pattern="Solid"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#A73B16"/></Borders></Style>
  <Style ss:ID="Cell"><Alignment ss:Vertical="Top" ss:WrapText="1"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2E3"/></Borders></Style>
  <Style ss:ID="Money"><NumberFormat ss:Format="#,##0"/><Alignment ss:Horizontal="Right" ss:Vertical="Top"/><Borders><Border ss:Position="Bottom" ss:LineStyle="Continuous" ss:Weight="1" ss:Color="#D9E2E3"/></Borders></Style>
 </Styles>
 <Worksheet ss:Name="Lịch hẹn">
  <Table>
   ${columns.map((_, index) => `<Column ss:Width="${index === 15 ? 240 : index === 5 || index === 7 ? 145 : 105}"/>`).join("")}
   <Row ss:Height="30"><Cell ss:MergeAcross="16" ss:StyleID="Title"><Data ss:Type="String">${escapeXml(title)}</Data></Cell></Row>
   <Row><Cell ss:MergeAcross="16" ss:StyleID="Meta"><Data ss:Type="String">Xuất lúc: ${escapeXml(generatedAt)} · Người xuất: ${escapeXml(principal.email || principal.userId)} · Tổng số: ${bookings?.length || 0}</Data></Cell></Row>
   <Row ss:Height="32">${columns.map((column) => stringCell(column, "Header")).join("")}</Row>
   ${rows.join("\n   ")}
  </Table>
  <WorksheetOptions xmlns="urn:schemas-microsoft-com:office:excel"><FreezePanes/><FrozenNoSplit/><SplitHorizontal>3</SplitHorizontal><TopRowBottomPane>3</TopRowBottomPane><ProtectObjects>False</ProtectObjects><ProtectScenarios>False</ProtectScenarios></WorksheetOptions>
 </Worksheet>
</Workbook>`;

  return new NextResponse(workbook, {
    headers: {
      "Content-Type": "application/vnd.ms-excel; charset=utf-8",
      "Content-Disposition": `attachment; filename="lich-hen-${reportFileStamp()}.xls"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
