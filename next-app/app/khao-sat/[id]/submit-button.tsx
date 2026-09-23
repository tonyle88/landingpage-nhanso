"use client";

import { useFormStatus } from "react-dom";

export function SurveySubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending} aria-live="polite">
      {pending ? "Đang gửi đánh giá…" : label}
      {pending ? null : <span aria-hidden="true">↗</span>}
    </button>
  );
}
