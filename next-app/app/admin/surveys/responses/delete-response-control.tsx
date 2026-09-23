"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteSurveyResponseAction } from "./actions";
import styles from "../surveys.module.css";

function ConfirmButton() {
  const { pending } = useFormStatus();
  return <button className={styles.confirmDelete} type="submit" disabled={pending}>{pending ? "Đang xóa…" : "Xác nhận xóa"}</button>;
}

export function DeleteResponseControl({
  surveyId,
  responseId,
  respondentName,
  page,
}: {
  surveyId: string;
  responseId: string;
  respondentName: string;
  page: number;
}) {
  const [confirming, setConfirming] = useState(false);
  if (!confirming) {
    return <button className={styles.deleteButton} type="button" onClick={() => setConfirming(true)} aria-label={`Xóa đánh giá của ${respondentName}`}>Xóa đánh giá</button>;
  }
  return (
    <form className={styles.deleteForm} action={deleteSurveyResponseAction}>
      <input type="hidden" name="survey_id" value={surveyId} />
      <input type="hidden" name="response_id" value={responseId} />
      <input type="hidden" name="page" value={page} />
      <p>Xóa vĩnh viễn đánh giá của {respondentName}?</p>
      <div>
        <button type="button" onClick={() => setConfirming(false)}>Hủy</button>
        <ConfirmButton />
      </div>
    </form>
  );
}
