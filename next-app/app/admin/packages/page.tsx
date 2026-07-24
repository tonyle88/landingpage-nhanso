import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { deletePackageAction } from "./actions";
import { PackageForm } from "./package-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý gói dịch vụ | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã lưu gói dịch vụ và ghi audit log.",
  deleted: "Đã xóa gói dịch vụ và ghi audit log.",
  invalid: "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra lại.",
  confirm: "Mã xác nhận xóa chưa đúng.",
  error: "Không thể thực hiện thay đổi. Dữ liệu chưa được xác nhận.",
};

export default async function AdminPackagesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");
  const supabase = await createAuthServerClient();
  const { data: packages, error } = await supabase
    .from("packages")
    .select("*")
    .order("sort_order")
    .order("code");
  const { status } = await searchParams;

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Gói dịch vụ</h1>
          <p>Thay đổi được kiểm tra ở server, enforce bằng RLS và ghi audit log.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      {status && notices[status] ? (
        <p className={styles.notice} role="status">{notices[status]}</p>
      ) : null}
      {error ? <p className={styles.message}>Không thể tải danh sách gói.</p> : null}

      <section className={styles.adminPanel}>
        <h2>Tạo gói mới</h2>
        <PackageForm />
      </section>

      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <h2>Danh sách hiện tại</h2>
          <span>{packages?.length || 0} gói</span>
        </div>
        <div className={styles.recordList}>
          {packages?.map((item) => (
            <article className={styles.recordCard} key={item.id}>
              <div className={styles.recordSummary}>
                <div>
                  <strong>{item.name}</strong>
                  <span>{item.code} · thứ tự {item.sort_order}</span>
                </div>
                <span className={item.enabled ? styles.active : styles.inactive}>
                  {item.enabled ? "Đang hiển thị" : "Đang ẩn"}
                </span>
              </div>
              <details>
                <summary>Chỉnh sửa</summary>
                <PackageForm item={item} />
                <form className={styles.dangerForm} action={deletePackageAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <input type="hidden" name="expected_code" value={item.code} />
                  <label className={styles.field}>
                    Nhập <strong>{item.code}</strong> để xác nhận xóa
                    <input name="confirmation" autoComplete="off" required />
                  </label>
                  <button className={styles.dangerButton} type="submit">Xóa gói</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
