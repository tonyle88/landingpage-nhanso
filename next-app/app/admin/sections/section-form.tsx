import type { Tables } from "@/lib/supabase/database.types";
import { saveLandingSectionAction } from "./actions";
import styles from "../admin.module.css";

type LandingSection = Tables<"landing_sections">;

export function SectionForm({ item }: { item: LandingSection }) {
  return (
    <form className={styles.editorForm} action={saveLandingSectionAction}>
      <input type="hidden" name="id" value={item.id} />
      <div className={styles.formGrid}>
        <label className={styles.field}>Khóa section
          <input value={item.section_key} readOnly />
        </label>
        <label className={styles.field}>Tên hiển thị
          <input name="display_name" defaultValue={item.display_name} maxLength={160} required />
        </label>
        <label className={styles.field}>Thứ tự
          <input name="sort_order" type="number" min="0" max="10000" defaultValue={item.sort_order} required />
        </label>
      </div>
      <label className={styles.field}>Eyebrow
        <input name="eyebrow" defaultValue={item.eyebrow || ""} maxLength={160} />
      </label>
      <label className={styles.field}>Tiêu đề
        <textarea name="title" rows={2} maxLength={300} defaultValue={item.title || ""} />
      </label>
      <label className={styles.field}>Nội dung HTML an toàn
        <textarea className={styles.codeField} name="content_html" rows={10}
          maxLength={100000} defaultValue={item.content_html || ""} />
      </label>
      <div className={styles.checkRow}>
        <label><input name="enabled" type="checkbox" defaultChecked={item.enabled} /> Hiển thị section</label>
      </div>
      <button className={styles.submit} type="submit">Lưu section</button>
    </form>
  );
}
