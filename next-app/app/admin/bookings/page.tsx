import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { isBookingCalendarConfigured } from "@/lib/booking-calendar";
import { isBookingEmailConfigured } from "@/lib/booking-email";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import {
  cancelConfirmedBookingAction,
  recoverBookingCalendarAction,
  recoverBookingEmailsAction,
  rescheduleConfirmedBookingAction,
  transitionBookingAction,
} from "./actions";
import { BookingCalendarActions } from "./booking-calendar-actions";
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
  rescheduled:
    "Đã đổi lịch, cập nhật Google Calendar và gửi email cho hai bên.",
  cancelled:
    "Đã hủy lịch, giải phóng khung giờ và gửi email cho hai bên.",
  calendar_synced: "Đã đồng bộ lại sự kiện Google Calendar.",
  calendar_warning:
    "Trạng thái đã được lưu nhưng Google Calendar chưa đồng bộ. Kiểm tra cấu hình Apps Script rồi bấm đồng bộ lại.",
  change_email_warning:
    "Calendar đã được cập nhật nhưng chưa gửi đủ email đổi/hủy lịch.",
  calendar_invalid: "Thông tin đổi hoặc hủy lịch không hợp lệ.",
  slot_unavailable: "Khung giờ mới đã có lịch. Vui lòng chọn giờ khác.",
  inside_72_hours:
    "Không thể đổi hoặc hủy tự động vì lịch còn dưới 72 giờ.",
};
const PAGE_SIZE = 6;
const EMAIL_ACTIONS = {
  customer: "booking.email.customer.sent",
  owner: "booking.email.owner.sent",
} as const;
const nextStatuses: Partial<Record<BookingStatus, BookingStatus[]>> = {
  pending: ["held", "cancelled", "expired"],
  held: ["paid", "cancelled", "expired"],
  paid: ["confirmed"],
};

function parsePage(value: string | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}

function bookingsHref(filter: BookingStatus | null, page: number) {
  const params = new URLSearchParams();
  if (filter) params.set("filter", filter);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/bookings?${query}` : "/admin/bookings";
}

export default async function AdminBookingsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; filter?: string; page?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");
  const { status, filter, page } = await searchParams;
  const selectedFilter = parseBookingStatus(filter);
  const selectedPage = parsePage(page);
  const pageStart = (selectedPage - 1) * PAGE_SIZE;

  const supabase = await createAuthServerClient();
  let request = supabase
    .from("bookings")
    .select(
      "id,public_id,calendar_event_id,customer_name,phone,email,consultation_type,package_name,amount,currency,slot_start,slot_end,concern,payment_provider,payment_order_id,status,hold_expires_at,manual_payment_claimed_at,confirmed_at,created_at",
      { count: "exact" },
    )
    .order("created_at", { ascending: false })
    .range(pageStart, pageStart + PAGE_SIZE - 1);
  if (selectedFilter) request = request.eq("status", selectedFilter);
  const { data: bookings, error, count } = await request;
  const totalBookings = count || 0;
  const totalPages = Math.max(1, Math.ceil(totalBookings / PAGE_SIZE));
  if (!error && totalBookings > 0 && selectedPage > totalPages) {
    redirect(bookingsHref(selectedFilter, totalPages));
  }

  const bookingIds = (bookings || []).map((booking) => booking.id);
  const { data: emailAudits } = bookingIds.length
    ? await supabase
        .from("audit_logs")
        .select("target_id,action")
        .eq("target_type", "booking")
        .eq("status", "success")
        .in("target_id", bookingIds)
        .in("action", Object.values(EMAIL_ACTIONS))
    : { data: [] };
  const emailDelivery = new Map<string, Set<string>>();
  for (const audit of emailAudits || []) {
    if (!audit.target_id) continue;
    const actions = emailDelivery.get(audit.target_id) || new Set<string>();
    actions.add(audit.action);
    emailDelivery.set(audit.target_id, actions);
  }

  const canManage = can(principal.role, "manage_operations");
  const emailConfigured = isBookingEmailConfigured();
  const calendarConfigured = isBookingCalendarConfigured();
  const cleanHref = bookingsHref(selectedFilter, selectedPage);

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
        tone={[
          "invalid",
          "stale",
          "error",
          "email_warning",
          "calendar_warning",
          "change_email_warning",
          "calendar_invalid",
          "slot_unavailable",
          "inside_72_hours",
        ].includes(status || "") ? "error" : "success"}
        cleanHref={cleanHref}
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
      {!calendarConfigured ? (
        <section className={styles.alertPanel} role="alert">
          <strong>Google Calendar chưa được cấu hình</strong>
          <span>
            Hãy triển khai file Apps Script Calendar và thêm
            GOOGLE_APPS_SCRIPT_URL cùng BOOKING_CALENDAR_SECRET trên Vercel.
            Lịch hẹn trong Supabase vẫn được giữ nguyên.
          </span>
        </section>
      ) : null}

      <section className={styles.adminPanel}>
        <form
          className={`${styles.searchForm} ${styles.bookingFilterForm}`}
          method="get"
        >
          <label className={styles.field}>
            Lọc trạng thái
            <select name="filter" defaultValue={selectedFilter || ""}>
              <option value="">Tất cả</option>
              {Object.entries(statusLabels).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <button
            className={`${styles.submit} ${styles.filterSubmit}`}
            type="submit"
          >
            <svg
              className={styles.filterSubmitIcon}
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path d="M4 6h16M7 12h10M10 18h4" />
            </svg>
            <span>Áp dụng</span>
          </button>
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
          <span>{totalBookings} lịch · 6 lịch/trang</span>
        </div>
        <div className={styles.recordList}>
          {bookings?.map((booking) => {
            const currentStatus = booking.status as BookingStatus;
            const transitions = nextStatuses[currentStatus] || [];
            const delivery = emailDelivery.get(booking.id);
            const customerEmailSent = delivery?.has(EMAIL_ACTIONS.customer);
            const ownerEmailSent = delivery?.has(EMAIL_ACTIONS.owner);
            const canChangeCalendar =
              new Date(booking.slot_start).getTime() >=
              Date.now() + 72 * 60 * 60 * 1000;
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
                <div className={styles.bookingOverview}>
                  <p>
                    <span>Khách</span>
                    <strong>{booking.customer_name}</strong>
                    <small>{booking.phone}</small>
                  </p>
                  <p>
                    <span>Số tiền</span>
                    <strong>{formatMoney(booking.amount, booking.currency)}</strong>
                    <small>{booking.consultation_type}</small>
                  </p>
                  <p>
                    <span>Mã chuyển khoản</span>
                    <strong className={styles.codeField}>
                      {booking.payment_order_id || "—"}
                    </strong>
                  </p>
                </div>
                {currentStatus === "confirmed" ? (
                  <div>
                    <div className={styles.emailDeliveryRow} aria-label="Trạng thái email xác nhận">
                      <span className={customerEmailSent ? styles.deliverySent : styles.deliveryMissing}>
                        {customerEmailSent ? "✓" : "!"} Email khách
                      </span>
                      <span className={ownerEmailSent ? styles.deliverySent : styles.deliveryMissing}>
                        {ownerEmailSent ? "✓" : "!"} Email chủ
                      </span>
                      <span className={booking.calendar_event_id ? styles.deliverySent : styles.deliveryMissing}>
                        {booking.calendar_event_id ? "✓" : "!"} Google Calendar
                      </span>
                    </div>
                    {canManage ? (
                      <BookingCalendarActions
                        id={booking.id}
                        slotStart={booking.slot_start}
                        canChange={canChangeCalendar}
                        rescheduleAction={rescheduleConfirmedBookingAction}
                        cancelAction={cancelConfirmedBookingAction}
                        recoverAction={recoverBookingCalendarAction}
                      />
                    ) : null}
                  </div>
                ) : null}
                <details className={styles.bookingDetails}>
                  <summary>Xem thông tin đầy đủ</summary>
                  <div className={styles.bookingMeta}>
                    <p><strong>Email:</strong> {booking.email}</p>
                    <p>
                      <strong>Khách báo chuyển khoản:</strong>{" "}
                      {formatDateTime(booking.manual_payment_claimed_at)}
                    </p>
                    <p><strong>Giữ chỗ đến:</strong> {formatDateTime(booking.hold_expires_at)}</p>
                    <p><strong>Ngày tạo:</strong> {formatDateTime(booking.created_at)}</p>
                    {booking.concern ? (
                      <p><strong>Nhu cầu:</strong> {booking.concern}</p>
                    ) : null}
                  </div>
                </details>
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
        {totalBookings > PAGE_SIZE ? (
          <nav className={styles.pagination} aria-label="Phân trang lịch hẹn">
            <Link
              className={selectedPage <= 1 ? styles.paginationDisabled : ""}
              href={bookingsHref(selectedFilter, Math.max(1, selectedPage - 1))}
              aria-disabled={selectedPage <= 1}
            >
              ← Trang trước
            </Link>
            <span>Trang {selectedPage}/{totalPages}</span>
            <Link
              className={selectedPage >= totalPages ? styles.paginationDisabled : ""}
              href={bookingsHref(selectedFilter, Math.min(totalPages, selectedPage + 1))}
              aria-disabled={selectedPage >= totalPages}
            >
              Trang sau →
            </Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
