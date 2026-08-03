"use client";

import { useRef, useState } from "react";
import { AdminModalPortal } from "../../admin-modal-portal";
import styles from "../../admin.module.css";

export function ArchiveDeleteButton({
  action,
  customerName,
  id,
  page,
  query,
}: {
  action: (formData: FormData) => void | Promise<void>;
  customerName: string;
  id: string;
  page: number;
  query: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = `archive-delete-title-${id}`;
  const messageId = `archive-delete-message-${id}`;

  return (
    <>
      <form action={action} ref={formRef}>
        <input name="id" type="hidden" value={id} />
        <input name="query" type="hidden" value={query} />
        <input name="page" type="hidden" value={page} />
        <button className={styles.numerologyArchiveDelete} onClick={() => setConfirming(true)} type="button">
          Xóa hồ sơ
        </button>
      </form>

      {confirming ? (
        <AdminModalPortal>
          <div className={styles.confirmBackdrop} role="presentation" onMouseDown={() => setConfirming(false)}>
            <section
              aria-describedby={messageId}
              aria-labelledby={titleId}
              aria-modal="true"
              className={styles.confirmDialog}
              onKeyDown={(event) => {
                if (event.key === "Escape") setConfirming(false);
              }}
              onMouseDown={(event) => event.stopPropagation()}
              role="alertdialog"
            >
              <span aria-hidden="true" className={styles.confirmIcon}>!</span>
              <div>
                <p className={styles.eyebrow}>Xác nhận xóa</p>
                <h3 id={titleId}>Xóa hồ sơ của {customerName}?</h3>
                <p id={messageId}>
                  PDF đầy đủ, ảnh JPG A4 và dữ liệu tra cứu sẽ bị xóa khỏi kho riêng.
                  Thao tác này không thể hoàn tác.
                </p>
              </div>
              <div className={styles.confirmActions}>
                <button className={styles.secondaryLink} onClick={() => setConfirming(false)} type="button">
                  Giữ hồ sơ
                </button>
                <button className={styles.dangerButton} onClick={() => formRef.current?.requestSubmit()} type="button">
                  Xác nhận xóa
                </button>
              </div>
            </section>
          </div>
        </AdminModalPortal>
      ) : null}
    </>
  );
}
