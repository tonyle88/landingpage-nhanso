import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { CustomerReportGenerator } from "./customer-report-generator";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Xuất PDF report khách hàng | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function AdminReportsPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader} data-report-ui>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Xuất PDF report khách hàng</h1>
          <p>
            Ghép nội dung phân tích từ DOCX với bản đồ JPG A4 thành hồ sơ hoàn chỉnh.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>
      <CustomerReportGenerator />
    </main>
  );
}

