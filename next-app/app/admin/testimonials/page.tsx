import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { deleteTestimonialAction } from "./actions";
import { TestimonialForm } from "./testimonial-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý testimonials | Clow Cat Patronus",
  robots: { index: false, follow: false },
};
const notices: Record<string, string> = {
  saved: "Đã lưu testimonial và ghi audit log.",
  deleted: "Đã xóa testimonial và ghi audit log.",
  invalid: "Dữ liệu testimonial chưa hợp lệ.",
  confirm: "Hãy nhập XOA để xác nhận.",
  error: "Không thể thực hiện thay đổi.",
};

export default async function AdminTestimonialsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");
  const supabase = await createAuthServerClient();
  const { data: items, error } = await supabase
    .from("testimonials")
    .select("*")
    .order("sort_order");
  const { status } = await searchParams;

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Testimonials</h1>
          <p>Quản lý ảnh minh chứng, mô tả truy cập và thứ tự hiển thị.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      {status && notices[status] ? <p className={styles.notice}>{notices[status]}</p> : null}
      {error ? <p className={styles.message}>Không thể tải testimonials.</p> : null}
      <section className={styles.adminPanel}>
        <h2>Tạo testimonial</h2>
        <TestimonialForm />
      </section>
      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}><h2>Danh sách hiện tại</h2><span>{items?.length || 0} mục</span></div>
        <div className={styles.recordList}>
          {items?.map((item) => (
            <article className={styles.recordCard} key={item.id}>
              <div className={styles.recordSummary}>
                <div><strong>{item.alt_text}</strong><span>Thứ tự {item.sort_order}</span></div>
                <span className={item.enabled ? styles.active : styles.inactive}>
                  {item.enabled ? "Đang hiển thị" : "Đang ẩn"}
                </span>
              </div>
              <details>
                <summary>Chỉnh sửa</summary>
                <TestimonialForm item={item} />
                <form className={styles.dangerForm} action={deleteTestimonialAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận
                    <input name="confirmation" autoComplete="off" required />
                  </label>
                  <button className={styles.dangerButton} type="submit">Xóa testimonial</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
