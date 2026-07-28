import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  CUSTOMER_EXPORT_LIMIT,
  customerPeriodLabel,
  formatCustomerBirthDate,
  normalizeCustomerSearch,
  parseCustomerPeriod,
} from "@/lib/admin/customer-report";
import { formatBookingDateTime } from "@/lib/admin/booking-report";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { PrintReport } from "../../bookings/report/print-report";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Báo cáo khách hàng | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function CustomerReportPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; year?: string; month?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");

  const params = await searchParams;
  const search = normalizeCustomerSearch(params.q);
  const { year, month } = parseCustomerPeriod(params.year, params.month);
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
  const generatedAt = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "full",
    timeStyle: "medium",
  }).format(new Date());
  const totalBookings = (customers || []).reduce(
    (sum, customer) => sum + Number(customer.successful_bookings),
    0,
  );

  return (
    <main className="report-page">
      <style>{`
        *{box-sizing:border-box}body{margin:0;background:#eef3f3;color:#173237;font-family:Arial,sans-serif}.report-page{width:min(1080px,calc(100% - 32px));margin:24px auto;background:#fff;padding:28px;box-shadow:0 12px 40px #17323718}.report-head{display:flex;justify-content:space-between;gap:24px;border-bottom:3px solid #d94e1f;padding-bottom:18px}.report-head h1{margin:0 0 8px;color:#12343a}.report-head p{margin:4px 0;color:#52676b}.report-print-button{border:0;border-radius:8px;padding:12px 18px;background:#12343a;color:#fff;font-weight:700;cursor:pointer}.report-summary{display:flex;flex-wrap:wrap;gap:24px;margin:18px 0;padding:13px 16px;background:#fff7e7;border:1px solid #f0c96a}.report-table{width:100%;border-collapse:collapse;font-size:12px}.report-table th{background:#12343a;color:#fff;text-align:left;padding:9px}.report-table td{border-bottom:1px solid #dce5e6;padding:9px;vertical-align:top}.report-table tbody tr:nth-child(even){background:#f5f8f8}.report-empty{padding:30px;text-align:center;color:#667}.report-footer{margin-top:20px;color:#667;font-size:11px}@media print{@page{size:A4 landscape;margin:10mm}body{background:#fff}.report-page{width:100%;margin:0;padding:0;box-shadow:none}.report-print-button{display:none}.report-table{font-size:9px}.report-table th,.report-table td{padding:5px}.report-head{break-after:avoid}.report-table tr{break-inside:avoid}.report-footer{position:fixed;bottom:0}}
      `}</style>
      <header className="report-head">
        <div>
          <h1>Danh sách khách hàng</h1>
          <p>Clow Cat Patronus · Khách đã đặt lịch thành công</p>
          <p>
            Thời gian xác nhận: {periodLabel}
            {search ? ` · Tìm kiếm: ${search}` : ""}
          </p>
        </div>
        <PrintReport />
      </header>
      <section className="report-summary">
        <strong>Tổng số: {customers?.length || 0} khách</strong>
        <span>{totalBookings} lượt đặt thành công</span>
        <span>Xuất lúc: {generatedAt}</span>
        <span>Người xuất: {principal.email || principal.userId}</span>
      </section>
      {error ? (
        <p className="report-empty">Không thể tải dữ liệu báo cáo.</p>
      ) : (
        <table className="report-table">
          <thead>
            <tr>
              <th>Khách hàng</th>
              <th>Ngày sinh</th>
              <th>Liên hệ</th>
              <th>Lần gần nhất</th>
              <th>Số lần đặt</th>
            </tr>
          </thead>
          <tbody>
            {customers?.map((customer) => (
              <tr key={customer.customer_key}>
                <td>
                  <strong>{customer.customer_name}</strong>
                  <br />
                  Khách từ: {formatBookingDateTime(customer.first_confirmed_at)}
                </td>
                <td>{formatCustomerBirthDate(customer.date_of_birth)}</td>
                <td>
                  {customer.email}
                  <br />
                  {customer.phone}
                </td>
                <td>
                  <strong>
                    {formatBookingDateTime(customer.latest_confirmed_at)}
                  </strong>
                  <br />
                  {customer.latest_package_name}
                  <br />
                  {customer.latest_booking_public_id}
                </td>
                <td>{customer.successful_bookings}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {!customers?.length && !error ? (
        <p className="report-empty">Chưa có khách hàng phù hợp.</p>
      ) : null}
      <footer className="report-footer">
        Báo cáo nội bộ · Dữ liệu cá nhân chỉ sử dụng cho mục đích vận hành được
        cho phép.
      </footer>
    </main>
  );
}
