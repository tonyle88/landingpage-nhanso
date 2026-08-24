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
      <div className={styles.packageAdminGuide}>
        <strong>Dữ liệu tự động dùng trong bảng so sánh</strong>
        <div>
          <span><b>Tên gói</b><small>Tiêu đề cột</small></span>
          <span><b>Giá online/offline</b><small>Hàng mức phí</small></span>
          <span><b>Nhãn</b><small>Định vị gói</small></span>
          <span><b>4 quyền lợi đầu</b><small>Nội dung so sánh</small></span>
        </div>
        <p>Gói được bật “Hiển thị” cũng tự tham gia kết quả Quiz. Hãy đặt mã, tên và quyền lợi sát với nội dung dịch vụ để gợi ý chính xác hơn.</p>
      </div>
      <div className={styles.formGrid}>
        <label className={styles.field}>Mã gói
          <input name="code" defaultValue={item?.code || ""} required />
          <small className={styles.fieldHint}>Mã ngắn, không dấu; ví dụ: year, big3, big7, combo3.</small>
        </label>
        <label className={styles.field}>Tên gói
          <input name="name" defaultValue={item?.name || ""} required />
          <small className={styles.fieldHint}>Hiển thị trên thẻ giá và tiêu đề cột so sánh.</small>
        </label>
        <label className={styles.field}>Giá online
          <input name="online_price" type="number" min="0" step="1"
            defaultValue={item?.online_price ?? ""} />
          <small className={styles.fieldHint}>Chỉ nhập số, không nhập dấu chấm hoặc chữ “đ”.</small>
        </label>
        <label className={styles.field}>Giá offline
          <input name="offline_price" type="number" min="0" step="1"
            defaultValue={item?.offline_price ?? ""} />
          <small className={styles.fieldHint}>Được đặt riêng bên dưới giá online trong bảng so sánh.</small>
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
          <small className={styles.fieldHint}>Ví dụ: Toàn diện nhất, Góc nhìn đa chiều nhất.</small>
        </label>
        <label className={styles.field}>Nút CTA
          <input name="button_text" defaultValue={item?.button_text || ""} />
        </label>
        <label className={styles.field}>Thứ tự
          <input name="sort_order" type="number" min="0" max="10000"
            defaultValue={item?.sort_order ?? 0} required />
        </label>
      </div>
      <label className={styles.field}>Quyền lợi và nội dung so sánh — mỗi dòng một mục
        <textarea name="features" rows={6} defaultValue={features} />
        <small className={styles.fieldHint}>Bốn dòng đầu xuất hiện trong bảng so sánh; toàn bộ các dòng vẫn hiển thị ở thẻ giá. Nên viết ngắn, rõ và không nhập giá vào đây.</small>
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
