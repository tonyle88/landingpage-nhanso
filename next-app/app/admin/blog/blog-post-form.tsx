import type { Tables } from "@/lib/supabase/database.types";
import { saveBlogPostAction } from "./actions";
import styles from "../admin.module.css";

type BlogPost = Tables<"blog_posts">;
type BlogCategory = Tables<"blog_categories">;

function localDateTime(value: string | null | undefined) {
  return value ? new Date(value).toISOString().slice(0, 16) : "";
}

export function BlogPostForm({
  item,
  categories,
}: {
  item?: BlogPost;
  categories: BlogCategory[];
}) {
  return (
    <form className={styles.editorForm} action={saveBlogPostAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="cover_asset_id" value={item?.cover_asset_id || ""} />
      <div className={styles.formGrid}>
        <label className={styles.field}>Slug
          <input name="slug" defaultValue={item?.slug || ""} required />
        </label>
        <label className={styles.field}>Danh mục
          <select name="category_id" defaultValue={item?.category_id || ""}>
            <option value="">Không chọn</option>
            {categories.map((category) => (
              <option key={category.id} value={category.id}>{category.name}</option>
            ))}
          </select>
        </label>
        <label className={styles.field}>Trạng thái
          <select name="status" defaultValue={item?.status || "draft"}>
            <option value="draft">Bản nháp</option>
            <option value="published">Đã xuất bản</option>
            <option value="archived">Lưu trữ</option>
          </select>
        </label>
      </div>
      <label className={styles.field}>Tiêu đề
        <input name="title" maxLength={200} defaultValue={item?.title || ""} required />
      </label>
      <label className={styles.field}>Tóm tắt
        <textarea name="summary" rows={3} maxLength={600}
          defaultValue={item?.summary || ""} />
      </label>
      <label className={styles.field}>Nội dung HTML an toàn
        <textarea name="content_html" rows={10} maxLength={100000}
          defaultValue={item?.content_html || ""} required />
      </label>
      <label className={styles.field}>URL ảnh bìa HTTPS
        <input name="cover_url" type="url" defaultValue={item?.cover_url || ""} />
      </label>
      <label className={styles.field}>Hoặc tải ảnh bìa mới lên Supabase Storage
        <input name="cover_file" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>JPEG, PNG hoặc WebP; tối đa 5 MB. Ảnh tải lên sẽ thay URL phía trên.</small>
      </label>
      <label className={styles.field}>Thời điểm xuất bản
        <input name="published_at" type="datetime-local"
          defaultValue={localDateTime(item?.published_at)} />
      </label>
      <div className={styles.checkRow}>
        <label><input name="pinned" type="checkbox"
          defaultChecked={item?.pinned ?? false} /> Ghim bài viết</label>
      </div>
      <button className={styles.submit} type="submit">
        {item ? "Lưu bài viết" : "Tạo bài viết"}
      </button>
    </form>
  );
}
