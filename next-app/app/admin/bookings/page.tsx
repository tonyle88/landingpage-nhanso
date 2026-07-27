import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { isBookingEmailConfigured } from "@/lib/booking-email";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import {
  recoverBookingEmailsAction,
  transitionBookingAction,
} from "./actions";
import {
  BookingEmailRecoveryButton,
  BookingTransitionButton,
} from "./booking-transition-button";
import {
  bookingStatusLabels as statusLabels,
  formatBookingDateTime as formatDateTime,
  formatBookingMoney as formatMoney,
  parseBookingStatus,
  type BookingStatus,
} from "@/lib/admin/booking-report";
import styles from "../admin.module.css";
import { AdminToast } from "../admin-toast";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý lịch hẹn | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  updated: "Đã cập nhật trạng thái lịch hẹn và ghi audit log.",
  email_warning:
    "Đã xác nhận lịch nhưng chưa gửi đủ email. Hãy kiểm tra cấu hình email rồi thử gửi lại.",
  email_resent:
    "Đã kiểm tra và gửi đủ email còn thiếu cho lịch hẹn.",
  invalid: "Yêu cầu cập nhật trạng thái chưa hợp lệ.",
  stale: "Lịch hẹn đã thay đổi. Trang đã được tải lại để tránh ghi đè.",
  error: "Không thể cập nhật lịch hẹn. Không có thay đổi nào được xác nhận.",
};
const nextStatuses: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ["held", "cancelled", "expired"],
  held: ["paid", "cancelled", "expired"],
  paid: ["confirmed"],
  confirmed: ["cancelled"],
};

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");
  const { status, filter } = await searchParams;
  const selectedFilter = parseBookingStatus(filter);

  const supabase = await createAuthServerClient();
  let request = supabase
    .from("bookings")
    .select(
      "id,public_id,customer_name,phone,email,consultation_type,package_name,amount,currency,slot_start,slot_end,concern,payment_provider,payment_order_id,status,hold_expires_at,manual_payment_claimed_at,confirmed_at,created_at",
    )
    .order("created_at", { ascending: false })
    .limit(100);
  if (selectedFilter) request = request.eq("status", selectedFilter);
  const { data: bookings, error } = await request;
  const canManage = can(principal.role, "manage_operations");
  const emailConfigured = isBookingEmailConfigured();

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Lịch hẹn</h1>
          <p>
            Xác nhận theo từng bước. “Khách đã báo chuyển khoản” không đồng
            nghĩa giao dịch đã được xác minh.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>

      <AdminToast
        message={status ? notices[status] : undefined}
        tone={["invalid", "stale", "error", "email_warning"].includes(status || "") ? "error" : "success"}
        cleanHref={selectedFilter ? `/admin/bookings?filter=${selectedFilter}` : "/admin/bookings"}
      />
      {error ? <AdminToast message="Không thể tải lịch hẹn." tone="error" cleanHref="/admin/bookings" /> : null}
      {!emailConfigured ? (
        <section className={styles.alertPanel} role="alert">
          <strong>Email xác nhận chưa được cấu hình</strong>
          <span>
            Lịch vẫn có thể được xác nhận, nhưng hệ thống chưa thể gửi thư cho
            khách và chủ trang. Hãy cấu hình dịch vụ email trên môi trường
            production rồi dùng nút gửi lại email còn thiếu.
          </span>
        </section>
      ) : null}

      <section className={styles.adminPanel}>
        <form className={styles.searchForm} method="get">
          <label className={styles.field}>
            Lọc trạng thái
            <select name="filter" defaultValue={selectedFilter || ""}>
              <option value="">Tất cả</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button className={styles.submit} type="submit">Lọc</button>
        </form>
        <div className={styles.reportActions} aria-label="Xuất báo cáo lịch hẹn">
          <Link
            className={styles.secondaryLink}
            href={`/admin/bookings/export${selectedFilter ? `?filter=${selectedFilter}` : ""}`}
          >
            ↓ Xuất Excel
          </Link>
          <Link
            className={styles.secondaryLink}
            href={`/admin/bookings/report${selectedFilter ? `?filter=${selectedFilter}` : ""}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Xuất PDF
          </Link>
          <span>Áp dụng bộ lọc trạng thái hiện tại.</span>
        </div>
        <div className={styles.sectionHeading}>
          <h2>Danh sách gần nhất</h2>
          <span>{bookings?.length || 0} lịch</span>
        </div>
        <div className={styles.recordList}>
          {bookings?.map((booking) => {
            const currentStatus = booking.status as BookingStatus;
            const transitions = nextStatuses[currentStatus] || [];
            return (
              <article className={styles.recordCard} key={booking.id}>
                <div className={styles.recordSummary}>
                  <div>
                    <strong>{booking.public_id}</strong>
                    <span>
                      {formatDateTime(booking.slot_start)} · {booking.package_name}
                    </span>
                  </div>
                  <span
                    className={
                      currentStatus === "confirmed" ||
                      currentStatus === "paid"
                        ? styles.active
                        : styles.inactive
                    }
                  >
                    {statusLabels[currentStatus]}
                  </span>
                </div>
                <div className={styles.bookingMeta}>
                  <p><strong>Khách:</strong> {booking.customer_name}</p>
                  <p><strong>Liên hệ:</strong> {booking.phone} · {booking.email}</p>
                  <p>
                    <strong>Hình thức:</strong> {booking.consultation_type} ·{" "}
                    {formatMoney(booking.amount, booking.currency)}
                  </p>
                  <p>
                    <strong>Mã chuyển khoản:</strong>{" "}
                    <span className={styles.codeField}>
                      {booking.payment_order_id || "—"}
                    </span>
                  </p>
                  <p>
                    <strong>Khách báo chuyển khoản:</strong>{" "}
                    {formatDateTime(booking.manual_payment_claimed_at)}
                  </p>
                  <p><strong>Giữ chỗ đến:</strong> {formatDateTime(booking.hold_expires_at)}</p>
                  {booking.concern ? (
                    <p><strong>Nhu cầu:</strong> {booking.concern}</p>
                  ) : null}
                </div>
                {canManage && transitions.length ? (
                  <div className={styles.actionRow}>
                    {transitions.map((nextStatus) => (
                      <BookingTransitionButton
                        action={transitionBookingAction}
                        expectedStatus={currentStatus}
                        id={booking.id}
                        key={nextStatus}
                        label={statusLabels[nextStatus]}
                        nextStatus={nextStatus}
                      />
                    ))}
                  </div>
                ) : null}
                {canManage && currentStatus === "confirmed" ? (
                  <div className={styles.actionRow}>
                    <BookingEmailRecoveryButton
                      action={recoverBookingEmailsAction}
                      id={booking.id}
                    />
                  </div>
                ) : null}
              </article>
            );
          })}
          {!bookings?.length && !error ? (
            <p className={styles.description}>Chưa có lịch hẹn phù hợp.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
