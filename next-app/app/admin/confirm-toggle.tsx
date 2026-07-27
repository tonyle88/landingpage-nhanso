"use client";

import { useRef, useState } from "react";
import styles from "./admin.module.css";

export function ConfirmToggle({
  checked,
  action,
  label,
  confirmTitle,
  confirmMessage,
}: {
  checked: boolean;
  action: (formData: FormData) => void | Promise<void>;
  label: string;
  confirmTitle: string;
  confirmMessage: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <>
      <form ref={formRef} action={action} className={styles.toggleForm}>
        <input type="hidden" name="enabled" value={String(!checked)} />
        <button
          className={styles.toggleControl}
          type="button"
          role="switch"
          aria-checked={checked}
          aria-label={label}
          onClick={() => setConfirming(true)}
        >
          <span className={styles.toggleTrack} aria-hidden="true">
            <span className={styles.toggleThumb} />
          </span>
          <span>{checked ? "Đang bật" : "Đang tắt"}</span>
        </button>
      </form>

      {confirming ? (
        <div className={styles.confirmBackdrop} role="presentation" onMouseDown={() => setConfirming(false)}>
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="sepay-confirm-title"
            aria-describedby="sepay-confirm-message"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className={styles.confirmIcon} aria-hidden="true">{checked ? "!" : "✓"}</span>
            <div>
              <p className={styles.eyebrow}>Xác nhận thay đổi</p>
              <h3 id="sepay-confirm-title">{confirmTitle}</h3>
              <p id="sepay-confirm-message">{confirmMessage}</p>
            </div>
            <div className={styles.confirmActions}>
              <button className={styles.secondaryLink} type="button" onClick={() => setConfirming(false)}>
                Giữ nguyên
              </button>
              <button
                className={checked ? styles.dangerButton : styles.submit}
                type="button"
                onClick={() => formRef.current?.requestSubmit()}
              >
                Xác nhận thay đổi
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
