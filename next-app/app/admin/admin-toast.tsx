"use client";

import { useEffect, useState } from "react";
import styles from "./admin.module.css";

export function AdminToast({
  message,
  tone = "success",
  cleanHref,
}: {
  message?: string;
  tone?: "success" | "error";
  cleanHref: string;
}) {
  const [visible, setVisible] = useState(Boolean(message));

  useEffect(() => {
    if (!message) return;
    setVisible(true);
    window.history.replaceState(null, "", cleanHref);
    const timer = window.setTimeout(() => setVisible(false), 5200);
    return () => window.clearTimeout(timer);
  }, [cleanHref, message]);

  if (!message || !visible) return null;

  return (
    <div
      className={`${styles.adminToast} ${tone === "error" ? styles.adminToastError : ""}`}
      role={tone === "error" ? "alert" : "status"}
      aria-live="polite"
    >
      <span className={styles.toastIcon} aria-hidden="true">
        {tone === "error" ? "!" : "✓"}
      </span>
      <div>
        <strong>{tone === "error" ? "Chưa thể hoàn tất" : "Đã cập nhật"}</strong>
        <p>{message}</p>
      </div>
      <button type="button" onClick={() => setVisible(false)} aria-label="Đóng thông báo">×</button>
    </div>
  );
}
