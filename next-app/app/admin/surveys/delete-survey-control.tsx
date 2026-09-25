"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteSurveyAction } from "./actions";
import styles from "./surveys.module.css";

function ConfirmDeleteButton({ ready }: { ready: boolean }) {
  const { pending } = useFormStatus();
  return <button className={styles.confirmSurveyDelete} type="submit" disabled={!ready || pending}>{pending ? "Đang xóa…" : "Xác nhận xóa khảo sát"}</button>;
}

export function DeleteSurveyControl({
  id,
  title,
  responseCount,
}: {
  id: string;
  title: string;
  responseCount: number | null;
}) {
  const [confirming, setConfirming] = useState(false);
  const [confirmation, setConfirmation] = useState("");

  return (
    <section className={styles.surveyDangerZone} aria-label="Xóa khảo sát">
      <div>
        <h3>Xóa khảo sát</h3>
        <p>
          Link khảo sát sẽ ngừng hoạt động. {responseCount === null
            ? "Toàn bộ đánh giá đã gửi cho khảo sát này cũng sẽ bị xóa vĩnh viễn."
            : `${responseCount} đánh giá đã gửi cho khảo sát này cũng sẽ bị xóa vĩnh viễn.`}
        </p>
      </div>
      {!confirming ? (
        <button className={styles.openSurveyDelete} type="button" onClick={() => setConfirming(true)}>Xóa khảo sát này</button>
      ) : (
        <form className={styles.surveyDeleteForm} action={deleteSurveyAction}>
          <input type="hidden" name="id" value={id} />
          <label>
            Nhập đúng tên khảo sát để xác nhận: <strong>{title}</strong>
            <input name="confirmation" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} autoComplete="off" required />
          </label>
          <div>
            <button type="button" onClick={() => { setConfirming(false); setConfirmation(""); }}>Hủy</button>
            <ConfirmDeleteButton ready={confirmation.trim() === title} />
          </div>
        </form>
      )}
    </section>
  );
}
