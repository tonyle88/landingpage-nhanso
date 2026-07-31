import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { NumerologyCalculator } from "./numerology-calculator";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Công cụ nhân số học | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

export default async function AdminNumerologyPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Công cụ nhân số học</h1>
          <p>
            Lập bản đồ đầy đủ từ họ tên và ngày sinh, sau đó xuất PDF gửi khách.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>
      <NumerologyCalculator />
    </main>
  );
}
