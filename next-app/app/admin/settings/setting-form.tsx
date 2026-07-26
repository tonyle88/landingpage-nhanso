import type { Tables } from "@/lib/supabase/database.types";
import { saveSettingAction } from "./actions";
import styles from "../admin.module.css";

type SiteSetting = Tables<"site_settings">;

export function SettingForm({ item }: { item?: SiteSetting }) {
  return (
    <form className={styles.editorForm} action={saveSettingAction}>
      <label className={styles.field}>Key
        <input name="key" defaultValue={item?.key || ""} readOnly={Boolean(item)}
          required />
      </label>
      <label className={styles.field}>Giá trị JSON
        <textarea className={styles.codeField} name="value" rows={8}
          maxLength={100000}
          defaultValue={item ? JSON.stringify(item.value, null, 2) : "{}"}
          required />
      </label>
      <label className={styles.field}>Mô tả
        <textarea name="description" rows={3} maxLength={500}
          defaultValue={item?.description || ""} />
      </label>
      <div className={styles.checkRow}>
        <label><input name="is_public" type="checkbox"
          defaultChecked={item?.is_public ?? false} /> Public read</label>
      </div>
      <button className={styles.submit} type="submit">
        {item ? "Lưu setting" : "Tạo setting"}
      </button>
    </form>
  );
}
