import type { Tables } from "@/lib/supabase/database.types";
import { saveTestimonialAction } from "./actions";
import styles from "../admin.module.css";

type Testimonial = Tables<"testimonials">;

export function TestimonialForm({ item }: { item?: Testimonial }) {
  return (
    <form className={styles.editorForm} action={saveTestimonialAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="media_asset_id" value={item?.media_asset_id || ""} />
      <label className={styles.field}>URL ảnh HTTPS
        <input name="image_url" type="url" defaultValue={item?.image_url || ""} />
        <small>Có thể để trống khi chọn tệp ảnh mới bên dưới.</small>
      </label>
      <label className={styles.field}>Hoặc tải ảnh mới lên Supabase Storage
        <input name="image_file" type="file" accept="image/jpeg,image/png,image/webp" />
        <small>JPEG, PNG hoặc WebP; tối đa 5 MB. Ảnh tải lên sẽ thay URL phía trên.</small>
      </label>
      <label className={styles.field}>Mô tả ảnh
        <input name="alt_text" maxLength={240} defaultValue={item?.alt_text || ""} required />
      </label>
      <label className={styles.field}>Thứ tự
        <input name="sort_order" type="number" min="0" max="10000"
          defaultValue={item?.sort_order ?? 0} required />
      </label>
      <div className={styles.checkRow}>
        <label><input name="enabled" type="checkbox" defaultChecked={item?.enabled ?? true} /> Hiển thị</label>
      </div>
      <button className={styles.submit} type="submit">
        {item ? "Lưu thay đổi" : "Tạo testimonial"}
      </button>
    </form>
  );
}
