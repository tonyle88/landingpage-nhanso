import type { Tables } from "@/lib/supabase/database.types";
import { saveBlogCategoryAction } from "./actions";
import styles from "../admin.module.css";

type BlogCategory = Tables<"blog_categories">;

export function CategoryForm({ item }: { item?: BlogCategory }) {
  return (
    <form className={styles.editorForm} action={saveBlogCategoryAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className={styles.formGrid}>
        <label className={styles.field}>Slug
          <input name="slug" defaultValue={item?.slug || ""} required />
        </label>
        <label className={styles.field}>Tên danh mục
          <input name="name" maxLength={120} defaultValue={item?.name || ""} required />
        </label>
        <label className={styles.field}>Thứ tự
          <input name="sort_order" type="number" min="0" max="10000"
            defaultValue={item?.sort_order ?? 0} required />
        </label>
      </div>
      <label className={styles.field}>Mô tả
        <textarea name="description" rows={3} maxLength={500}
          defaultValue={item?.description || ""} />
      </label>
      <div className={styles.checkRow}>
        <label><input name="enabled" type="checkbox"
          defaultChecked={item?.enabled ?? true} /> Hiển thị</label>
      </div>
      <button
        className={styles.submit}
        data-pending-label={
          item ? "Đang lưu danh mục…" : "Đang tạo danh mục…"
        }
        type="submit"
      >
        {item ? "Lưu danh mục" : "Tạo danh mục"}
      </button>
    </form>
  );
}
