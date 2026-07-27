import { landingPlainText } from "@/lib/landing-text";
import { saveLandingContentItemAction } from "./actions";
import styles from "../admin.module.css";

export type AdminLandingContentItem = {
  key: string;
  description: string | null;
  value: {
    value?: unknown;
    selector?: unknown;
    type?: unknown;
    attribute?: unknown;
    enabled?: unknown;
  };
};

export function ContentItemForm({ item }: { item: AdminLandingContentItem }) {
  const type = String(item.value.type || "text").toLowerCase();
  const rawValue = item.value.value == null ? "" : String(item.value.value);
  const displayValue = type === "text" ? landingPlainText(rawValue) : rawValue;
  const multiline = type === "html" || displayValue.length > 100 || displayValue.includes("\n");

  return (
    <form className={styles.contentItemForm} action={saveLandingContentItemAction}>
      <input type="hidden" name="key" value={item.key} />
      <input type="hidden" name="description" value={item.description || ""} />
      <input type="hidden" name="selector" value={String(item.value.selector || "")} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="attribute" value={String(item.value.attribute || "")} />
      <div className={styles.contentItemMeta}>
        <code>{item.key.replace("landing.content.", "")}</code>
        <span>{type === "html" ? "Văn bản định dạng" : type}</span>
      </div>
      <label className={styles.field}>
        {item.description || "Nội dung"}
        {multiline ? (
          <textarea name="value" rows={type === "html" ? 5 : 3} defaultValue={displayValue} />
        ) : (
          <input name="value" defaultValue={displayValue} />
        )}
      </label>
      <div className={styles.contentItemFooter}>
        <label className={styles.compactCheck}>
          <input name="enabled" type="checkbox" defaultChecked={item.value.enabled !== false} /> Bật
        </label>
        <small title={String(item.value.selector || "")}>{String(item.value.selector || "")}</small>
        <button className={styles.smallSubmit} type="submit">Lưu mục</button>
      </div>
    </form>
  );
}
