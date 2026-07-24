import type { Tables } from "@/lib/supabase/database.types";
import { saveTestimonialAction } from "./actions";
import styles from "../admin.module.css";

type Testimonial = Tables<"testimonials">;

export function TestimonialForm({ item }: { item?: Testimonial }) {
  return (
    <form className={styles.editorForm} action={saveTestimonialAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <label className={styles.field}>URL ảnh HTTPS
        <input name="image_url" type="url" defaultValue={item?.image_url || ""} required />
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
