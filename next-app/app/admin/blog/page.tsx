import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminToast } from "../admin-toast";
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

const PAGE_SIZE = 8;
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

type Params = {
  status?: string;
  category_status?: string;
  view?: "posts" | "categories";
  category?: string;
  publication?: string;
  q?: string;
  page?: string;
};

function blogHref(params: Record<string, string | number | undefined>) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== "") query.set(key, String(value));
  });
  const suffix = query.toString();
  return suffix ? `/admin/blog?${suffix}` : "/admin/blog";
}

export default async function AdminBlogPage({ searchParams }: { searchParams: Promise<Params> }) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const supabase = await createAuthServerClient();
  const [{ data: posts, error }, { data: categories }] = await Promise.all([
    supabase.from("blog_posts").select("*").order("pinned", { ascending: false }).order("updated_at", { ascending: false }),
    supabase.from("blog_categories").select("*").order("sort_order"),
  ]);
  const params = await searchParams;
  const view = params.view === "categories" ? "categories" : "posts";
  const categoryRows = categories || [];
  const categoryNames = new Map(categoryRows.map((row) => [row.id, row.name]));
  const q = (params.q || "").trim().toLocaleLowerCase("vi");
  const filteredPosts = (posts || []).filter((post) => {
    const matchesCategory = !params.category || post.category_id === params.category;
    const matchesPublication = !params.publication || post.status === params.publication;
    const matchesQuery = !q || `${post.title} ${post.slug} ${post.summary || ""}`.toLocaleLowerCase("vi").includes(q);
    return matchesCategory && matchesPublication && matchesQuery;
  });
  const totalPages = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  const requestedPage = Number.parseInt(params.page || "1", 10);
  const currentPage = Math.min(totalPages, Math.max(1, Number.isFinite(requestedPage) ? requestedPage : 1));
  const visiblePosts = filteredPosts.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const publishedCount = (posts || []).filter((post) => post.status === "published").length;
  const toastCode = params.category_status || params.status;
  const toastMessage = params.category_status
    ? categoryNotices[params.category_status]
    : params.status ? notices[params.status] : undefined;
  const toastTone = ["invalid", "confirm", "error", "in_use"].includes(toastCode || "") ? "error" : "success";

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Admin Console · {principal.role}</p>
          <h1>Quản lý bài viết</h1>
          <p>Soạn thảo, phân loại và xuất bản nội dung trên một màn hình trực quan.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>

      <AdminToast
        message={toastMessage}
        tone={toastTone}
        cleanHref={params.category_status ? "/admin/blog?view=categories" : "/admin/blog"}
      />
      {error ? <AdminToast message="Không thể tải danh sách bài viết." tone="error" cleanHref="/admin/blog" /> : null}

      <section className={styles.blogStats} aria-label="Thống kê blog">
        <div><strong>{posts?.length || 0}</strong><span>Tổng bài viết</span></div>
        <div><strong>{publishedCount}</strong><span>Đã xuất bản</span></div>
        <div><strong>{(posts?.length || 0) - publishedCount}</strong><span>Nháp / lưu trữ</span></div>
        <div><strong>{categoryRows.length}</strong><span>Chủ đề</span></div>
      </section>

      <section className={styles.adminPanel}>
        <nav className={styles.blogTabs} aria-label="Khu vực quản lý blog">
          <Link className={view === "posts" ? styles.blogTabActive : ""} href="/admin/blog?view=posts">
            <span aria-hidden="true">▤</span> Bài viết
          </Link>
          <Link className={view === "categories" ? styles.blogTabActive : ""} href="/admin/blog?view=categories">
            <span aria-hidden="true">⌑</span> Chủ đề
          </Link>
        </nav>

        {view === "categories" ? (
          <div className={styles.blogWorkspace}>
            <div className={styles.blogToolbar}>
              <div><p className={styles.eyebrow}>Phân loại nội dung</p><h2>Danh sách chủ đề</h2></div>
              <details className={styles.createPopover}>
                <summary>＋ Thêm chủ đề</summary>
                <div className={styles.createPopoverBody}><CategoryForm /></div>
              </details>
            </div>
            <div className={styles.blogTable}>
              <div className={styles.blogTableHeader}><span>Chủ đề</span><span>Slug</span><span>Thứ tự</span><span>Trạng thái</span></div>
              {categoryRows.map((category) => (
                <details className={styles.blogTableRow} key={category.id}>
                  <summary>
                    <strong>{category.name}</strong><code>{category.slug}</code><span>{category.sort_order}</span>
                    <span className={category.enabled ? styles.active : styles.inactive}>{category.enabled ? "Hiển thị" : "Đang ẩn"}</span>
                  </summary>
                  <div className={styles.blogEditPanel}>
                    <CategoryForm item={category} />
                    <form className={styles.dangerForm} action={deleteBlogCategoryAction}>
                      <input type="hidden" name="id" value={category.id} />
                      <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận<input name="confirmation" autoComplete="off" required /></label>
                      <button className={styles.dangerButton} type="submit">Xóa danh mục</button>
                    </form>
                  </div>
                </details>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.blogWorkspace}>
            <div className={styles.blogToolbar}>
              <div><p className={styles.eyebrow}>Thư viện nội dung</p><h2>Danh sách bài viết</h2></div>
              <details className={styles.createPopover} id="new-post">
                <summary>＋ Viết bài mới</summary>
                <div className={styles.createPopoverBody}><BlogPostForm categories={categoryRows} /></div>
              </details>
            </div>

            <form className={styles.blogFilters} method="get">
              <input type="hidden" name="view" value="posts" />
              <label><span>Tìm bài viết</span><input name="q" defaultValue={params.q || ""} placeholder="Tiêu đề, slug hoặc tóm tắt…" /></label>
              <label><span>Chủ đề</span><select name="category" defaultValue={params.category || ""}><option value="">Tất cả chủ đề</option>{categoryRows.map((category) => <option key={category.id} value={category.id}>{category.name}</option>)}</select></label>
              <label><span>Trạng thái</span><select name="publication" defaultValue={params.publication || ""}><option value="">Tất cả</option><option value="published">Đã xuất bản</option><option value="draft">Bản nháp</option><option value="archived">Lưu trữ</option></select></label>
              <button className={styles.submit} type="submit">Lọc</button>
              {(params.q || params.category || params.publication) ? <Link className={styles.clearFilters} href="/admin/blog">Xóa lọc</Link> : null}
            </form>

            <div className={styles.blogTable}>
              <div className={`${styles.blogTableHeader} ${styles.postColumns}`}><span>Bài viết</span><span>Chủ đề</span><span>Cập nhật</span><span>Trạng thái</span></div>
              {visiblePosts.map((item) => (
                <details className={styles.blogTableRow} key={item.id}>
                  <summary className={styles.postColumns}>
                    <span className={styles.postTitle}><strong>{item.title}</strong><small>{item.pinned ? "📌 " : ""}{item.slug}</small></span>
                    <span>{item.category_id ? categoryNames.get(item.category_id) || "—" : "Chưa phân loại"}</span>
                    <time dateTime={item.updated_at || undefined}>{item.updated_at ? new Intl.DateTimeFormat("vi-VN", { dateStyle: "short" }).format(new Date(item.updated_at)) : "—"}</time>
                    <span className={item.status === "published" ? styles.active : styles.inactive}>{item.status === "published" ? "Đã xuất bản" : item.status === "draft" ? "Bản nháp" : "Lưu trữ"}</span>
                  </summary>
                  <div className={styles.blogEditPanel}>
                    <div className={styles.editPanelHeading}><div><p className={styles.eyebrow}>Chỉnh sửa bài viết</p><h3>{item.title}</h3></div><span>Thay đổi được lưu qua audit log</span></div>
                    <BlogPostForm item={item} categories={categoryRows} />
                    <form className={styles.dangerForm} action={deleteBlogPostAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <label className={styles.field}>Nhập <strong>XOA</strong> để xác nhận<input name="confirmation" autoComplete="off" required /></label>
                      <button className={styles.dangerButton} type="submit">Xóa bài viết</button>
                    </form>
                  </div>
                </details>
              ))}
              {visiblePosts.length === 0 ? <div className={styles.blogEmpty}><strong>Không tìm thấy bài viết</strong><span>Hãy đổi bộ lọc hoặc tạo bài viết mới.</span></div> : null}
            </div>

            <nav className={styles.pagination} aria-label="Phân trang bài viết">
              <Link aria-disabled={currentPage === 1} className={currentPage === 1 ? styles.paginationDisabled : ""} href={blogHref({ view: "posts", q: params.q, category: params.category, publication: params.publication, page: currentPage - 1 })}>← Trang trước</Link>
              <span>Trang <strong>{currentPage}</strong> / {totalPages} · {filteredPosts.length} bài</span>
              <Link aria-disabled={currentPage === totalPages} className={currentPage === totalPages ? styles.paginationDisabled : ""} href={blogHref({ view: "posts", q: params.q, category: params.category, publication: params.publication, page: currentPage + 1 })}>Trang sau →</Link>
            </nav>
          </div>
        )}
      </section>
    </main>
  );
}
