import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { deleteBlogCategoryAction, deleteBlogPostAction } from "./actions";
import { BlogPostForm } from "./blog-post-form";
import { CategoryForm } from "./category-form";
import styles from "../admin.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý blog | Clow Cat Patronus",
  robots: { index: false, follow: false },
};
const notices: Record<string, string> = {
  saved: "Đã lưu bài viết và ghi audit log.",
  deleted: "Đã xóa bài viết và ghi audit log.",
  invalid: "Dữ liệu bài viết chưa hợp lệ hoặc chứa HTML nguy hiểm.",
  confirm: "Hãy nhập XOA để xác nhận.",
  error: "Không thể thực hiện thay đổi.",
};
const categoryNotices: Record<string, string> = {
  saved: "Đã lưu danh mục và ghi audit log.",
  deleted: "Đã xóa danh mục và ghi audit log.",
  invalid: "Dữ liệu danh mục chưa hợp lệ.",
  confirm: "Hãy nhập XOA để xác nhận danh mục.",
  in_use: "Không thể xóa danh mục đang được bài viết sử dụng.",
  error: "Không thể thực hiện thay đổi danh mục.",
};

export default async function AdminBlogPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; category_status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");
  const supabase = await createAuthServerClient();
  const [{ data: posts, error }, { data: categories }] = await Promise.all([
    supabase.from("blog_posts").select("*").order("updated_at", { ascending: false }),
    supabase.from("blog_categories").select("*").order("sort_order"),
  ]);
  const { status, category_status: categoryStatus } = await searchParams;
  const categoryRows = categories || [];

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Blog</h1>
          <p>Quản lý bài viết, trạng thái xuất bản và nội dung HTML an toàn.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      {status && notices[status] ? <p className={styles.notice}>{notices[status]}</p> : null}
      {categoryStatus && categoryNotices[categoryStatus] ? (
        <p className={styles.notice}>{categoryNotices[categoryStatus]}</p>
      ) : null}
      {error ? <p className={styles.message}>Không thể tải bài viết.</p> : null}
      <section className={styles.adminPanel}>
        <h2>Danh mục blog</h2>
        <CategoryForm />
        <div className={styles.recordList}>
          {categoryRows.map((category) => (
            <article className={styles.recordCard} key={category.id}>
              <div className={styles.recordSummary}>
                <div><strong>{category.name}</strong><span>{category.slug}</span></div>
                <span className={category.enabled ? styles.active : styles.inactive}>
                  {category.enabled ? "Đang hiển thị" : "Đang ẩn"}
                </span>
              </div>
              <details>
                <summary>Chỉnh sửa danh mục</summary>
                <CategoryForm item={category} />
                <form className={styles.dangerForm} action={deleteBlogCategoryAction}>
                  <input type="hidden" name="id" value={category.id} />
                  <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận
                    <input name="confirmation" autoComplete="off" required />
                  </label>
                  <button className={styles.dangerButton} type="submit">Xóa danh mục</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </section>
      <section className={styles.adminPanel}>
        <h2>Tạo bài viết</h2>
        <BlogPostForm categories={categoryRows} />
      </section>
      <section className={styles.adminPanel}>
        <div className={styles.sectionHeading}>
          <h2>Danh sách hiện tại</h2><span>{posts?.length || 0} bài</span>
        </div>
        <div className={styles.recordList}>
          {posts?.map((item) => (
            <article className={styles.recordCard} key={item.id}>
              <div className={styles.recordSummary}>
                <div><strong>{item.title}</strong><span>{item.slug}</span></div>
                <span className={item.status === "published" ? styles.active : styles.inactive}>
                  {item.status}
                </span>
              </div>
              <details>
                <summary>Chỉnh sửa</summary>
                <BlogPostForm item={item} categories={categoryRows} />
                <form className={styles.dangerForm} action={deleteBlogPostAction}>
                  <input type="hidden" name="id" value={item.id} />
                  <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận
                    <input name="confirmation" autoComplete="off" required />
                  </label>
                  <button className={styles.dangerButton} type="submit">Xóa bài viết</button>
                </form>
              </details>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
