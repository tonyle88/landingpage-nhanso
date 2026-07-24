import type { Tables } from "@/lib/supabase/database.types";
import { savePackageAction } from "./actions";
import styles from "../admin.module.css";

type Package = Tables<"packages">;

export function PackageForm({ item }: { item?: Package }) {
  const features = Array.isArray(item?.features)
    ? item.features.filter((value): value is string => typeof value === "string").join("\n")
    : "";
  return (
    <form className={styles.editorForm} action={savePackageAction}>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <div className={styles.formGrid}>
        <label className={styles.field}>Mã gói
          <input name="code" defaultValue={item?.code || ""} required />
        </label>
        <label className={styles.field}>Tên gói
          <input name="name" defaultValue={item?.name || ""} required />
        </label>
        <label className={styles.field}>Giá online
          <input name="online_price" type="number" min="0" step="1"
            defaultValue={item?.online_price ?? ""} />
        </label>
        <label className={styles.field}>Giá offline
          <input name="offline_price" type="number" min="0" step="1"
            defaultValue={item?.offline_price ?? ""} />
        </label>
        <label className={styles.field}>Tiền tệ
          <input name="currency" maxLength={3} defaultValue={item?.currency || "VND"} required />
        </label>
        <label className={styles.field}>Đơn vị
          <input name="unit" defaultValue={item?.unit || ""} />
        </label>
        <label className={styles.field}>Icon
          <input name="icon" defaultValue={item?.icon || ""} />
        </label>
        <label className={styles.field}>Màu nhấn
          <input name="accent_color" defaultValue={item?.accent_color || ""} />
        </label>
        <label className={styles.field}>Nhãn
          <input name="badge" defaultValue={item?.badge || ""} />
        </label>
        <label className={styles.field}>Nút CTA
          <input name="button_text" defaultValue={item?.button_text || ""} />
        </label>
        <label className={styles.field}>Thứ tự
          <input name="sort_order" type="number" min="0" max="10000"
            defaultValue={item?.sort_order ?? 0} required />
        </label>
      </div>
      <label className={styles.field}>Quyền lợi — mỗi dòng một mục
        <textarea name="features" rows={6} defaultValue={features} />
      </label>
      <div className={styles.checkRow}>
        <label><input name="enabled" type="checkbox" defaultChecked={item?.enabled ?? true} /> Hiển thị</label>
        <label><input name="featured" type="checkbox" defaultChecked={item?.featured ?? false} /> Nổi bật</label>
      </div>
      <button className={styles.submit} type="submit">
        {item ? "Lưu thay đổi" : "Tạo gói"}
      </button>
    </form>
  );
}
