import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminToast } from "../../admin-toast";
import { NUMEROLOGY_HISTORY_PAGE_SIZE, parseNumerologyHistoryPage } from "@/lib/admin/numerology-records";
import { getNumerologyHistoryLimit } from "@/lib/admin/numerology-records.server";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { ArchiveDeleteButton } from "./archive-delete-button";
import { deleteNumerologyRecordAction } from "./actions";
import styles from "../../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kho hồ sơ nhân số | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  deleted: "Đã xóa hồ sơ cùng PDF và JPG khỏi kho riêng.",
  deleted_cleanup_pending: "Đã xóa hồ sơ. Hệ thống sẽ tiếp tục dọn file lưu trữ còn sót.",
  forbidden: "Tài khoản của bạn không có quyền xóa hồ sơ.",
  invalid: "Mã hồ sơ cần xóa không hợp lệ.",
  missing: "Hồ sơ không tồn tại hoặc không thuộc kho của tài khoản này.",
  error: "Không thể xóa hồ sơ lúc này.",
};

function sanitizeSearch(value: string) {
  return value
    .normalize("NFC")
    .replace(/[^\p{L}\p{N}\s'.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function formatBirthDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Ho_Chi_Minh",
  }).format(new Date(value));
}

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function pageHref(page: number, query: string) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  if (page > 1) params.set("page", String(page));
  const suffix = params.toString();
  return `/admin/numerology/archive${suffix ? `?${suffix}` : ""}`;
}

export default async function NumerologyArchivePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string; status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");

  const params = await searchParams;
  const query = sanitizeSearch(params.q || "");
  const historyLimit = await getNumerologyHistoryLimit();
  const page = parseNumerologyHistoryPage(params.page || null, historyLimit);
  const offset = (page - 1) * NUMEROLOGY_HISTORY_PAGE_SIZE;
  const supabase = await createAuthServerClient();
  let request = supabase
    .from("numerology_records")
    .select(
      "id,report_number,customer_name,birth_date,pdf_byte_size,image_byte_size,updated_at",
      { count: "exact" },
    )
    .eq("created_by", principal.userId);

  if (query) {
    request = /^\d{1,9}$/.test(query)
      ? request.eq("report_number", Number.parseInt(query, 10))
      : request.ilike("customer_name", `%${query}%`);
  }
  const { data, error, count } = await request
    .order("updated_at", { ascending: false })
    .range(offset, offset + NUMEROLOGY_HISTORY_PAGE_SIZE - 1);
  const total = error ? 0 : Math.min(count || 0, historyLimit);
  const pageCount = Math.max(1, Math.ceil(total / NUMEROLOGY_HISTORY_PAGE_SIZE));
  if (!error && page > pageCount) redirect(pageHref(pageCount, query));
  const cleanHref = pageHref(page, query);
  const status = params.status || "";
  const canDelete = can(principal.role, "manage_content");

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Kho riêng tư · {principal.role}</p>
          <h1>Kho hồ sơ nhân số</h1>
          <p>
            Tra cứu hồ sơ thuộc tài khoản đang đăng nhập theo tên khách hoặc mã hồ sơ.
          </p>
        </div>
        <div className={styles.reportActions}>
          <Link className={styles.secondaryLink} href="/admin/numerology">Công cụ tính</Link>
          <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
        </div>
      </header>

      <AdminToast
        cleanHref={cleanHref}
        message={notices[status]}
        tone={["forbidden", "invalid", "missing", "error"].includes(status) ? "error" : "success"}
      />

      <section className={styles.numerologyArchiveSummary}>
        <div><strong>{total}</strong><span>{query ? "Hồ sơ tìm thấy" : "Hồ sơ đang lưu"}</span></div>
        <div><strong>{historyLimit}</strong><span>Giới hạn mỗi tài khoản</span></div>
        <div><strong>20</strong><span>Hồ sơ mỗi trang</span></div>
      </section>

      <section className={`${styles.adminPanel} ${styles.numerologyArchivePanel}`}>
        <form className={styles.numerologyArchiveSearch} method="get">
          <label className={styles.field}>
            Tìm theo tên hoặc mã hồ sơ
            <input defaultValue={query} name="q" placeholder="Ví dụ: Lê Thị Miền hoặc 125" />
          </label>
          <button className={styles.submit} type="submit">Tra cứu</button>
          {query ? <Link className={styles.secondaryLink} href="/admin/numerology/archive">Xóa bộ lọc</Link> : null}
        </form>

        {error ? (
          <div className={styles.numerologyArchiveEmpty}>
            <strong>Chưa thể tải kho hồ sơ</strong>
            <span>Hãy thử tải lại trang sau ít phút.</span>
          </div>
        ) : data?.length ? (
          <div className={styles.numerologyArchiveTable}>
            <div className={styles.numerologyArchiveTableHeader} aria-hidden="true">
              <span>Khách hàng</span><span>Mã hồ sơ</span><span>Lần cập nhật</span><span>File lưu</span><span>Thao tác</span>
            </div>
            {data.map((record) => (
              <article className={styles.numerologyArchiveRow} key={record.id}>
                <div>
                  <span>{record.customer_name.charAt(0)}</span>
                  <p><strong>{record.customer_name}</strong><small>Ngày sinh {formatBirthDate(record.birth_date)}</small></p>
                </div>
                <strong>#{record.report_number}</strong>
                <time dateTime={record.updated_at}>{formatUpdatedAt(record.updated_at)}</time>
                <div className={styles.numerologyArchiveDownloads}>
                  <a href={`/api/admin/numerology-records/${record.id}/download?type=pdf`}>PDF · {formatBytes(record.pdf_byte_size)}</a>
                  <a href={`/api/admin/numerology-records/${record.id}/download?type=jpg`}>JPG · {formatBytes(record.image_byte_size)}</a>
                </div>
                {canDelete ? (
                  <ArchiveDeleteButton
                    action={deleteNumerologyRecordAction}
                    customerName={record.customer_name}
                    id={record.id}
                    page={page}
                    query={query}
                  />
                ) : <small>Chỉ được xem</small>}
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.numerologyArchiveEmpty}>
            <strong>{query ? "Không tìm thấy hồ sơ phù hợp" : "Kho hồ sơ đang trống"}</strong>
            <span>{query ? "Thử nhập một phần tên khách hoặc đúng mã hồ sơ." : "Hồ sơ sẽ xuất hiện sau khi lập bản đồ."}</span>
          </div>
        )}

        {pageCount > 1 ? (
          <nav aria-label="Phân trang kho hồ sơ" className={styles.pagination}>
            <Link className={page <= 1 ? styles.paginationDisabled : ""} href={pageHref(page - 1, query)}>← Trước</Link>
            <span>Trang {page}/{pageCount}</span>
            <Link className={page >= pageCount ? styles.paginationDisabled : ""} href={pageHref(page + 1, query)}>Sau →</Link>
          </nav>
        ) : null}
      </section>
    </main>
  );
}
