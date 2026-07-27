import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { SectionForm } from "./section-form";
import { ContentItemForm, type AdminLandingContentItem } from "./content-item-form";
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

const contentNotices: Record<string, string> = {
  saved: "Đã lưu nội dung trang chủ và ghi audit log.",
  invalid: "Trường nội dung chưa hợp lệ.",
  error: "Không thể lưu nội dung trang chủ.",
};

const sectionLabels: Record<string, string> = {
  meta: "SEO & chia sẻ", nav: "Điều hướng", hero: "Mở đầu", pain: "Nỗi đau khách hàng",
  about: "Giới thiệu mentor", benefits: "Lợi ích", methods: "Phương pháp", mini_report: "Tra cứu thử",
  compare: "Bảng so sánh", testimonials: "Testimonials", packages: "Gói dịch vụ", process: "Quy trình",
  contact: "Liên hệ & đặt lịch", footer: "Chân trang", social: "Mạng xã hội",
};

export default async function AdminSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; content_status?: string; q?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const supabase = await createAuthServerClient();
  const [{ data: sections, error }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("landing_sections").select("*").order("sort_order").order("section_key"),
    supabase.from("site_settings").select("key,value,description")
      .like("key", "landing.content.%").eq("is_public", true).order("key"),
  ]);
  const normalizedQuery = query.toLocaleLowerCase("vi");
  const rows = (sections || []).filter((item) => {
    if (!normalizedQuery) return true;
    return `${item.section_key} ${item.display_name}`
      .toLocaleLowerCase("vi")
      .includes(normalizedQuery);
  });
  const contentItems = (settings || []).flatMap((item) => {
    if (!item.value || typeof item.value !== "object" || Array.isArray(item.value)) return [];
    return [{
      key: item.key,
      description: item.description,
      value: item.value as AdminLandingContentItem["value"],
    } satisfies AdminLandingContentItem];
  });
  const contentGroups = new Map<string, AdminLandingContentItem[]>();
  contentItems.forEach((item) => {
    const group = item.key.replace("landing.content.", "").split(".")[0] || "other";
    if (!contentGroups.has(group)) contentGroups.set(group, []);
    contentGroups.get(group)?.push(item);
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
      {params.content_status && contentNotices[params.content_status] ? (
        <p className={styles.notice} role="status">{contentNotices[params.content_status]}</p>
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
      <section className={styles.homepageContent} id="homepage-content">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>Toàn bộ trường đang dùng trên trang chủ</p>
            <h2>Nội dung chi tiết</h2>
            <p>Quản lý tiêu đề, mô tả, nút, form, liên kết và SEO. Trường văn bản cũ có thẻ thừa sẽ tự được làm sạch khi lưu.</p>
          </div>
          <strong>{contentItems.length} trường</strong>
        </div>
        {settingsError ? <p className={styles.message}>Không thể tải nội dung trang chủ.</p> : null}
        <div className={styles.contentGroups}>
          {Array.from(contentGroups.entries()).map(([group, items], index) => (
            <details className={styles.contentGroup} key={group} open={index === 0}>
              <summary><span>{sectionLabels[group] || group}</span><small>{items.length} trường</small></summary>
              <div className={styles.contentItemGrid}>
                {items.map((item) => <ContentItemForm item={item} key={item.key} />)}
              </div>
            </details>
          ))}
        </div>
      </section>
    </main>
  );
}
