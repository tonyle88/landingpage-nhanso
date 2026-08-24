import type { Tables } from "@/lib/supabase/database.types";
import { saveLandingSectionAction } from "./actions";
import styles from "../admin.module.css";

type LandingSection = Tables<"landing_sections">;

export function SectionForm({ item }: { item: LandingSection }) {
  return (
    <form className={styles.editorForm} action={saveLandingSectionAction}>
      <input type="hidden" name="id" value={item.id} />
      <div className={styles.sectionAdvancedNotice}>
        <strong>Đây là cài đặt nâng cao.</strong>
        <span>Tên quản trị và mã section chỉ giúp nhận diện trong Admin. Nội dung chữ khách nhìn thấy nên sửa ở khu vực “Nội dung Trang chủ” bên dưới.</span>
      </div>
      <div className={styles.formGrid}>
        <label className={styles.field}>Mã kỹ thuật (không sửa)
          <input value={item.section_key} readOnly />
        </label>
        <label className={styles.field}>Tên quản trị trong Admin
          <input name="display_name" defaultValue={item.display_name} maxLength={160} required />
        </label>
        <label className={styles.field}>Số thứ tự hiển thị
          <input name="sort_order" type="number" min="0" max="10000" defaultValue={item.sort_order} required />
        </label>
      </div>
      <label className={styles.field}>Nhãn nhỏ dự phòng
        <input name="eyebrow" defaultValue={item.eyebrow || ""} maxLength={160} />
      </label>
      <label className={styles.field}>Tiêu đề dự phòng
        <textarea name="title" rows={2} maxLength={300} defaultValue={item.title || ""} />
      </label>
      <label className={styles.field}>HTML cho section tùy chỉnh
        <textarea className={styles.codeField} name="content_html" rows={10}
          maxLength={100000} defaultValue={item.content_html || ""} />
        <small>Section có sẵn thường không cần sửa ô này. Chỉ dùng khi bạn đã tạo section HTML tùy chỉnh.</small>
      </label>
      <div className={styles.checkRow}>
        <label><input name="enabled" type="checkbox" defaultChecked={item.enabled} /> Hiển thị section trên Trang chủ</label>
      </div>
      <button className={styles.submit} type="submit">Lưu cài đặt section</button>
    </form>
  );
}
