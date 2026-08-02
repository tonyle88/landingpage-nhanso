import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import {
  NUMEROLOGY_HISTORY_PAGE_SIZE,
  toNumerologyRecordListItem,
} from "@/lib/admin/numerology-records";
import { getNumerologyHistoryLimit } from "@/lib/admin/numerology-records.server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
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

  const historyLimit = await getNumerologyHistoryLimit();
  const supabase = await createAuthServerClient();
  const { data, error, count } = await supabase
    .from("numerology_records")
    .select(
      "id,customer_name,birth_date,pdf_byte_size,image_byte_size,updated_at",
      { count: "exact" },
    )
    .order("updated_at", { ascending: false })
    .range(0, NUMEROLOGY_HISTORY_PAGE_SIZE - 1);
  const initialRecords = error ? [] : (data || []).map(toNumerologyRecordListItem);
  const initialTotal = error ? 0 : Math.min(count || 0, historyLimit);

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Công cụ nhân số học</h1>
          <p>
            Lập bản đồ, xuất file và quản lý {historyLimit} hồ sơ khách hàng gần nhất.
          </p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">
          Tổng quan
        </Link>
      </header>
      <NumerologyCalculator
        canSave={can(principal.role, "manage_content")}
        historyAvailable={!error}
        historyLimit={historyLimit}
        initialRecords={initialRecords}
        initialTotal={initialTotal}
      />
    </main>
  );
}
