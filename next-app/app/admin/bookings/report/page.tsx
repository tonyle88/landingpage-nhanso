import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  bookingReportSelect,
  bookingStatusLabels,
  formatBookingDateTime,
  formatBookingMoney,
  parseBookingStatus,
} from "@/lib/admin/booking-report";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { PrintReport } from "./print-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Báo cáo lịch hẹn | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function BookingReportPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");

  const { filter } = await searchParams;
  const selectedFilter = parseBookingStatus(filter);
  const supabase = await createAuthServerClient();
  let query = supabase
    .from("bookings")
    .select(bookingReportSelect)
    .order("created_at", { ascending: false })
    .limit(5000);
  if (selectedFilter) query = query.eq("status", selectedFilter);
  const { data: bookings, error } = await query;
  const generatedAt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());

  return (
    <main className="report-page">
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#eef3f3;color:#173237;font-family:Arial,sans-serif}.report-page{width:min(1180px,calc(100% - 32px));margin:24px auto;background:#fff;padding:28px;box-shadow:0 12px 40px #17323718}.report-head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #d94e1f;padding-bottom:18px}.report-head h1{margin:0 0 8px;color:#12343a}.report-head p{margin:4px 0;color:#52676b}.report-print-button{border:0;border-radius:8px;padding:12px 18px;background:#12343a;color:#fff;font-weight:700;cursor:pointer}.report-summary{display:flex;gap:24px;margin:18px 0;padding:13px 16px;background:#fff7e7;border:1px solid #f0c96a}.report-table{width:100%;border-collapse:collapse;font-size:12px}.report-table th{background:#12343a;color:#fff;text-align:left;padding:9px}.report-table td{border-bottom:1px solid #dce5e6;padding:9px;vertical-align:top}.report-table tbody tr:nth-child(even){background:#f5f8f8}.report-empty{padding:30px;text-align:center;color:#667}.report-footer{margin-top:20px;color:#667;font-size:11px}@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff}.report-page{width:100%;margin:0;padding:0;box-shadow:none}.report-print-button{display:none}.report-table{font-size:9px}.report-table th,.report-table td{padding:5px}.report-head{break-after:avoid}.report-table tr{break-inside:avoid}.report-footer{position:fixed;bottom:0}}
      `}</style>
      <header className="report-head">
        <div>
          <h1>Báo cáo lịch hẹn</h1>
          <p>Clow Cat Patronus · Danh sách khách đã đặt lịch</p>
          <p>Bộ lọc: {selectedFilter ? bookingStatusLabels[selectedFilter] : "Tất cả trạng thái"}</p>
        </div>
        <PrintReport />
      </header>
      <section className="report-summary">
        <strong>Tổng số: {bookings?.length || 0} lịch</strong>
        <span>Xuất lúc: {generatedAt}</span>
        <span>Người xuất: {principal.email || principal.userId}</span>
      </section>
      {error ? <p className="report-empty">Không thể tải dữ liệu báo cáo.</p> : (
        <table className="report-table">
          <thead><tr><th>Mã lịch</th><th>Trạng thái / Thời gian</th><th>Khách hàng</th><th>Dịch vụ</th><th>Thanh toán</th><th>Nhu cầu</th></tr></thead>
          <tbody>
            {bookings?.map((booking) => (
              <tr key={booking.id}>
                <td><strong>{booking.public_id}</strong><br />Tạo: {formatBookingDateTime(booking.created_at)}</td>
                <td><strong>{bookingStatusLabels[booking.status]}</strong><br />{formatBookingDateTime(booking.slot_start)} – {formatBookingDateTime(booking.slot_end)}</td>
                <td><strong>{booking.customer_name}</strong><br />{booking.phone}<br />{booking.email}</td>
                <td>{booking.package_name}<br />{booking.consultation_type}</td>
                <td><strong>{formatBookingMoney(booking.amount, booking.currency)}</strong><br />Mã: {booking.payment_order_id || "—"}<br />Báo CK: {formatBookingDateTime(booking.manual_payment_claimed_at)}</td>
                <td>{booking.concern || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!bookings?.length && !error ? <p className="report-empty">Chưa có lịch hẹn phù hợp.</p> : null}
      <footer className="report-footer">Báo cáo nội bộ · Dữ liệu cá nhân chỉ sử dụng cho mục đích vận hành được cho phép.</footer>
    </main>
  );
}
