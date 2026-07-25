import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đối soát thanh toán | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const reasonLabels: Record<string, string> = {
  account_mismatch: "Sai tài khoản nhận",
  amount_mismatch: "Sai số tiền",
  booking_not_found: "Không tìm thấy mã lịch hẹn",
  booking_not_held: "Lịch hẹn không còn giữ chỗ",
  outbound_transfer: "Giao dịch chuyển ra",
};

function formatDateTime(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export default async function AdminPaymentsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");

  const supabase = await createAuthServerClient();
  const [eventsResult, paymentsResult, bookingsResult] = await Promise.all([
    supabase
      .from("webhook_events")
      .select(
        "id,event_id,status,attempts,error_message,received_at,processed_at,signature_valid",
      )
      .eq("provider", "sepay")
      .order("received_at", { ascending: false })
      .limit(50),
    supabase
      .from("payment_transactions")
      .select(
        "id,booking_id,provider_transaction_id,order_id,amount,currency,status,occurred_at,created_at",
      )
      .eq("provider", "sepay")
      .order("created_at", { ascending: false })
      .limit(50),
    supabase
      .from("bookings")
      .select("id,public_id,status")
      .order("created_at", { ascending: false })
      .limit(200),
  ]);
  const hasError =
    eventsResult.error || paymentsResult.error || bookingsResult.error;
  const bookings = new Map(
    (bookingsResult.data || []).map((booking) => [booking.id, booking]),
  );
  const alerts = (eventsResult.data || []).filter(
    (event) => event.status === "ignored" || event.status === "failed",
  );

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Đối soát thanh toán</h1>
          <p>
            Chỉ xác nhận tiền sau khi đối chiếu giao dịch tại ngân hàng hoặc
            SePay. Không dùng màn hình này làm bằng chứng duy nhất.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>

      {hasError ? (
        <p className={styles.message}>Không thể tải dữ liệu đối soát.</p>
      ) : null}
      {alerts.length ? (
        <section className={styles.alertPanel} role="alert">
          <strong>{alerts.length} webhook cần kiểm tra</strong>
          <span>
            Kiểm tra lý do, đối chiếu giao dịch gốc rồi mở lịch hẹn tương ứng.
          </span>
        </section>
      ) : (
        <p className={styles.notice} role="status">
          Không có webhook SePay bị bỏ qua hoặc thất bại trong danh sách gần
          nhất.
        </p>
      )}

      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <h2>Webhook gần nhất</h2>
          <span>{eventsResult.data?.length || 0} sự kiện</span>
        </div>
        <div className={styles.recordList}>
          {eventsResult.data?.map((event) => (
            <article className={styles.recordCard} key={event.id}>
              <div className={styles.recordSummary}>
                <div>
                  <strong>SePay #{event.event_id}</strong>
                  <span>{formatDateTime(event.received_at)}</span>
                </div>
                <span
                  className={
                    event.status === "processed"
                      ? styles.active
                      : styles.inactive
                  }
                >
                  {event.status}
                </span>
              </div>
              <div className={styles.paymentMeta}>
                <span>Chữ ký: {event.signature_valid ? "hợp lệ" : "không hợp lệ"}</span>
                <span>Số lần nhận: {event.attempts}</span>
                <span>
                  Kết quả:{" "}
                  {reasonLabels[event.error_message || ""] ||
                    event.error_message ||
                    "Đã xử lý"}
                </span>
                <span>Xử lý lúc: {formatDateTime(event.processed_at)}</span>
              </div>
            </article>
          ))}
          {!eventsResult.data?.length && !eventsResult.error ? (
            <p className={styles.description}>Chưa có webhook SePay.</p>
          ) : null}
        </div>
      </section>

      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <h2>Giao dịch gần nhất</h2>
          <span>{paymentsResult.data?.length || 0} giao dịch</span>
        </div>
        <div className={styles.recordList}>
          {paymentsResult.data?.map((payment) => {
            const booking = payment.booking_id
              ? bookings.get(payment.booking_id)
              : null;
            return (
              <article className={styles.recordCard} key={payment.id}>
                <div className={styles.recordSummary}>
                  <div>
                    <strong>{payment.order_id}</strong>
                    <span>
                      SePay #{payment.provider_transaction_id || "—"} ·{" "}
                      {formatDateTime(payment.occurred_at || payment.created_at)}
                    </span>
                  </div>
                  <span
                    className={
                      payment.status === "paid"
                        ? styles.active
                        : styles.inactive
                    }
                  >
                    {payment.status}
                  </span>
                </div>
                <div className={styles.paymentMeta}>
                  <span>{formatMoney(payment.amount, payment.currency)}</span>
                  <span>
                    Lịch:{" "}
                    {booking ? (
                      <Link href={`/admin/bookings?filter=${booking.status}`}>
                        {booking.public_id}
                      </Link>
                    ) : (
                      "Chưa khớp"
                    )}
                  </span>
                </div>
              </article>
            );
          })}
          {!paymentsResult.data?.length && !paymentsResult.error ? (
            <p className={styles.description}>Chưa có giao dịch SePay.</p>
          ) : null}
        </div>
      </section>
    </main>
  );
}
