import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function AdminPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");

  return (
    <main className={styles.shell}>
      <section className={styles.dashboard}>
        <div className={styles.dashboardHeader}>
          <div>
            <p className={styles.eyebrow}>Admin Console</p>
            <h1>Xin chào</h1>
            <p>{principal.email || "Tài khoản quản trị"}</p>
            <span className={styles.role}>{principal.role}</span>
          </div>
          <form action="/admin/logout" method="post">
            <button className={styles.logout} type="submit">
              Đăng xuất
            </button>
          </form>
        </div>
        <p className={styles.description}>
          Cổng xác thực và phân quyền staging đã hoạt động. Các màn hình quản trị
          nội dung sẽ được chuyển ở bước tiếp theo.
        </p>
        <nav className={styles.adminNav} aria-label="Quản trị nội dung">
          <Link href="/admin/packages">Quản lý gói dịch vụ</Link>
          <Link href="/admin/testimonials">Quản lý testimonials</Link>
        </nav>
      </section>
    </main>
  );
}
