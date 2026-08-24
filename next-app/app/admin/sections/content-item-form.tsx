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
  const valueWithoutLegacyGlints = rawValue.replace(/\u2726/g, "");
  const displayValue = type === "text"
    ? landingPlainText(valueWithoutLegacyGlints).trim()
    : valueWithoutLegacyGlints;
  const multiline = type === "html" || displayValue.length > 100 || displayValue.includes("\n");
  const friendlyType = type === "html" ? "Có định dạng" : "Văn bản";
  const technicalKey = item.key.replace("landing.content.", "");

  return (
    <form className={styles.contentItemForm} action={saveLandingContentItemAction}>
      <input type="hidden" name="key" value={item.key} />
      <input type="hidden" name="description" value={item.description || ""} />
      <input type="hidden" name="selector" value={String(item.value.selector || "")} />
      <input type="hidden" name="type" value={type} />
      <input type="hidden" name="attribute" value={String(item.value.attribute || "")} />
      <div className={styles.contentItemMeta}>
        <strong>{item.description || "Nội dung hiển thị"}</strong>
        <span>{friendlyType}</span>
      </div>
      <label className={styles.field}>
        <span className={styles.visuallyHidden}>{item.description || "Nội dung"}</span>
        {multiline ? (
          <textarea name="value" rows={type === "html" ? 5 : 3} defaultValue={displayValue} />
        ) : (
          <input name="value" defaultValue={displayValue} />
        )}
      </label>
      <div className={styles.contentItemFooter}>
        <label className={styles.compactCheck}>
          <input name="enabled" type="checkbox" defaultChecked={item.value.enabled !== false} /> Hiển thị nội dung này
        </label>
        <button className={styles.smallSubmit} type="submit">Lưu mục</button>
      </div>
      <details className={styles.contentTechnicalDetails}>
        <summary>Thông tin kỹ thuật</summary>
        <dl>
          <div><dt>Mã trường</dt><dd><code>{technicalKey}</code></dd></div>
          <div><dt>Vị trí CSS</dt><dd><code>{String(item.value.selector || "—")}</code></dd></div>
        </dl>
      </details>
    </form>
  );
}
