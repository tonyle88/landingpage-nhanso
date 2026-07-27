import type { Tables } from "@/lib/supabase/database.types";
import { saveBlogPostAction } from "./actions";
import { RichTextEditor } from "./rich-text-editor";
import { CoverImageField } from "./cover-image-field";
import styles from "../admin.module.css";

type BlogPost = Tables<"blog_posts">;
type BlogCategory = Tables<"blog_categories">;

function localDateTime(value: string | null | undefined, fallbackToNow = false) {
  const date = value ? new Date(value) : fallbackToNow ? new Date() : null;
  if (!date || !Number.isFinite(date.getTime())) return "";
  const pad = (part: number) => String(part).padStart(2, "0");
  return [
    date.getFullYear(),
    "-",
    pad(date.getMonth() + 1),
    "-",
    pad(date.getDate()),
    "T",
    pad(date.getHours()),
    ":",
    pad(date.getMinutes()),
  ].join("");
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
      <input type="hidden" name="thumbnail_asset_id" value={item?.thumbnail_asset_id || ""} />
      <input type="hidden" name="thumbnail_url" value={item?.thumbnail_url || ""} />
      <div className={`${styles.formGrid} ${styles.blogMetaGrid}`}>
        <label className={styles.field}>Slug
          <input name="slug" defaultValue={item?.slug || ""}
            placeholder="Để trống để tự tạo từ tiêu đề" />
          <small className={styles.slugHint}>
            Bài mới sẽ tự sinh slug không dấu từ tiêu đề. Slug của bài đã lưu được giữ ổn định.
          </small>
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
      <div className={styles.field}>
        <span>Tóm tắt</span>
        <RichTextEditor
          compact
          initialValue={item?.summary || ""}
          label="Tóm tắt bài viết"
          maxLength={600}
          name="summary"
          placeholder="Viết tóm tắt ngắn cho thẻ bài viết…"
        />
      </div>
      <div className={styles.field}>
        <span>Nội dung bài viết</span>
        <RichTextEditor initialValue={item?.content_html || ""} />
      </div>
      <CoverImageField coverUrl={item?.cover_url} thumbnailUrl={item?.thumbnail_url} />
      <label className={styles.field}>Thời điểm xuất bản
        <input name="published_at" type="datetime-local"
          defaultValue={localDateTime(item?.published_at, !item)} />
        <small>{item
          ? "Giữ nguyên ngày đang lưu nếu anh không thay đổi trường này."
          : "Bài viết mới mặc định dùng ngày và giờ hiện tại."}</small>
      </label>
      <div className={styles.checkRow}>
        <label><input name="pinned" type="checkbox"
          defaultChecked={item?.pinned ?? false} /> Ghim bài viết</label>
      </div>
      <button className={`${styles.submit} ${styles.blogSubmit}`} type="submit">
        {item ? "Lưu bài viết" : "Tạo bài viết"}
      </button>
    </form>
  );
}
