import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { SectionForm } from "./section-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý section | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã lưu section và ghi audit log.",
  invalid: "Nội dung section chưa hợp lệ hoặc chứa HTML nguy hiểm.",
  error: "Không thể lưu section.",
};

export default async function AdminSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const supabase = await createAuthServerClient();
  const request = supabase.from("landing_sections").select("*")
    .order("sort_order").order("section_key");
  const { data: sections, error } = await request;
  const normalizedQuery = query.toLocaleLowerCase("vi");
  const rows = (sections || []).filter((item) => {
    if (!normalizedQuery) return true;
    return `${item.section_key} ${item.display_name}`
      .toLocaleLowerCase("vi")
      .includes(normalizedQuery);
  });

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Landing page content · {principal.role}</p>
          <h1>Quản trị section</h1>
          <p>Chọn section, chỉnh nội dung và thứ tự hiển thị như buồng lái cũ.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      {params.status && notices[params.status] ? (
        <p className={styles.notice} role="status">{notices[params.status]}</p>
      ) : null}
      {error ? <p className={styles.message}>Không thể tải danh sách section.</p> : null}
      <section className={styles.sectionManager}>
        <aside className={styles.sectionIndex}>
          <p className={styles.eyebrow}>Tất cả section</p>
          <form className={styles.sectionSearch} method="get">
            <input name="q" defaultValue={query} placeholder="Tìm section…" />
            <button type="submit" aria-label="Tìm">Tìm</button>
          </form>
          <nav aria-label="Danh sách section">
            {rows.map((item) => (
              <a key={item.id} href={`#section-${item.id}`}>
                <span>{item.display_name}</span>
                <small>{item.sort_order}</small>
              </a>
            ))}
          </nav>
          <Link className={styles.viewSiteLink} href="/" target="_blank">Xem landing page ↗</Link>
        </aside>
        <div className={styles.sectionWorkspace}>
          <div className={styles.sectionStats}>
            <div><strong>{rows.length}</strong><span>section</span></div>
            <div><strong>{rows.filter((item) => item.enabled).length}</strong><span>đang bật</span></div>
          </div>
          <div className={styles.recordList}>
            {!error && rows.length === 0 ? (
              <p className={styles.message}>Không tìm thấy section phù hợp.</p>
            ) : null}
            {rows.map((item) => (
              <article className={styles.recordCard} id={`section-${item.id}`} key={item.id}>
                <div className={styles.recordSummary}>
                  <div><strong>{item.display_name}</strong><span>{item.section_key} · {item.section_type}</span></div>
                  <span className={item.enabled ? styles.active : styles.inactive}>
                    {item.enabled ? "Đang hiển thị" : "Đang ẩn"}
                  </span>
                </div>
                <details>
                  <summary>Chỉnh sửa nội dung</summary>
                  <SectionForm item={item} />
                </details>
              </article>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
