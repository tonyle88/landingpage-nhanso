import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  CUSTOMER_PAGE_SIZE,
  customerDirectoryHref,
  customerExportHref,
  formatCustomerBirthDate,
  normalizeCustomerSearch,
  parseCustomerPage,
} from "@/lib/admin/customer-report";
import { formatBookingDateTime } from "@/lib/admin/booking-report";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý khách hàng | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "read_operations")) redirect("/admin");

  const params = await searchParams;
  const search = normalizeCustomerSearch(params.q);
  const selectedPage = parseCustomerPage(params.page);
  const offset = (selectedPage - 1) * CUSTOMER_PAGE_SIZE;
  const supabase = await createAuthServerClient();
  const { data: customers, error } = await supabase.rpc(
    "admin_list_booking_customers",
    {
      p_search: search || null,
      p_limit: CUSTOMER_PAGE_SIZE,
      p_offset: offset,
    },
  );

  const firstCustomer = customers?.[0];
  const totalCustomers = Number(firstCustomer?.total_customers || 0);
  const totalSuccessfulBookings = Number(
    firstCustomer?.total_successful_bookings || 0,
  );
  const returningCustomers = Number(firstCustomer?.returning_customers || 0);
  const totalPages = Math.max(
    1,
    Math.ceil(totalCustomers / CUSTOMER_PAGE_SIZE),
  );
  if (!error && totalCustomers > 0 && selectedPage > totalPages) {
    redirect(customerDirectoryHref(search, totalPages));
  }

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Khách hàng</h1>
          <p>
            Danh bạ được tổng hợp từ những lịch đã xác nhận thành công, gom theo
            email khách hàng.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>

      <section className={styles.customerStats} aria-label="Tổng quan khách hàng">
        <div>
          <strong>{totalCustomers}</strong>
          <span>Khách đã xác nhận</span>
        </div>
        <div>
          <strong>{totalSuccessfulBookings}</strong>
          <span>Lượt đặt thành công</span>
        </div>
        <div>
          <strong>{returningCustomers}</strong>
          <span>Khách quay lại</span>
        </div>
      </section>

      <section className={styles.adminPanel}>
        <form className={styles.customerToolbar} method="get">
          <label className={styles.field}>
            Tìm khách hàng
            <input
              defaultValue={search}
              name="q"
              placeholder="Tên, email hoặc số điện thoại"
              type="search"
            />
          </label>
          <button className={styles.submit} type="submit">
            Tìm kiếm
          </button>
          {search ? (
            <Link className={styles.secondaryLink} href="/admin/customers">
              Xóa lọc
            </Link>
          ) : null}
        </form>

        <div className={styles.reportActions} aria-label="Xuất danh sách khách hàng">
          <Link
            className={styles.secondaryLink}
            href={customerExportHref("/admin/customers/export", search)}
          >
            ↓ Xuất Excel
          </Link>
          <Link
            className={styles.secondaryLink}
            href={customerExportHref("/admin/customers/report", search)}
            target="_blank"
            rel="noopener noreferrer"
          >
            ↗ Xuất PDF
          </Link>
          <span>
            {search
              ? `Đang áp dụng tìm kiếm “${search}”.`
              : "Xuất toàn bộ danh sách đã xác nhận."}
          </span>
        </div>

        <div className={styles.sectionHeading}>
          <h2>Danh sách khách hàng</h2>
          <span>{totalCustomers} khách · 10 khách/trang</span>
        </div>

        {error ? (
          <p className={styles.customerEmpty}>
            Không thể tải danh sách khách hàng. Vui lòng thử lại.
          </p>
        ) : null}
        {!error && customers?.length ? (
          <div className={styles.customerTable}>
            <div className={styles.customerTableHeader} aria-hidden="true">
              <span>Khách hàng</span>
              <span>Ngày sinh</span>
              <span>Lần gần nhất</span>
              <span>Số lần đặt</span>
            </div>
            {customers.map((customer) => (
              <article className={styles.customerRow} key={customer.customer_key}>
                <div className={styles.customerIdentity}>
                  <span className={styles.customerAvatar} aria-hidden="true">
                    {customer.customer_name.slice(0, 1).toUpperCase()}
                  </span>
                  <span>
                    <strong>{customer.customer_name}</strong>
                    <a href={`mailto:${customer.email}`}>{customer.email}</a>
                    <small>{customer.phone}</small>
                  </span>
                </div>
                <div className={styles.customerDatum}>
                  <span>Ngày sinh</span>
                  <strong>{formatCustomerBirthDate(customer.date_of_birth)}</strong>
                </div>
                <div className={styles.customerDatum}>
                  <span>Lần gần nhất</span>
                  <strong>
                    {formatBookingDateTime(customer.latest_confirmed_at)}
                  </strong>
                  <small>
                    {customer.latest_package_name} ·{" "}
                    {customer.latest_booking_public_id}
                  </small>
                </div>
                <div className={styles.customerBookingCount}>
                  <strong>{customer.successful_bookings}</strong>
                  <span>
                    {customer.successful_bookings > 1
                      ? "lần · khách quay lại"
                      : "lần"}
                  </span>
                </div>
              </article>
            ))}
          </div>
        ) : null}
        {!error && !customers?.length ? (
          <p className={styles.customerEmpty}>
            {search
              ? "Không tìm thấy khách hàng phù hợp."
              : "Chưa có khách hàng đặt lịch thành công."}
          </p>
        ) : null}

        {totalCustomers > CUSTOMER_PAGE_SIZE ? (
          <nav className={styles.pagination} aria-label="Phân trang khách hàng">
            <Link
              aria-disabled={selectedPage <= 1}
              className={
                selectedPage <= 1 ? styles.paginationDisabled : ""
              }
              href={customerDirectoryHref(
                search,
                Math.max(1, selectedPage - 1),
              )}
            >
              ← Trang trước
            </Link>
            <span>
              Trang {selectedPage}/{totalPages}
            </span>
            <Link
              aria-disabled={selectedPage >= totalPages}
              className={
                selectedPage >= totalPages ? styles.paginationDisabled : ""
              }
              href={customerDirectoryHref(
                search,
                Math.min(totalPages, selectedPage + 1),
              )}
            >
              Trang sau →
            </Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
