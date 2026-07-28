"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AdminModalPortal } from "./admin-modal-portal";
import styles from "./admin-pending-overlay.module.css";

const FALLBACK_LABEL = "Đang xử lý yêu cầu…";
const SAFETY_TIMEOUT_MS = 45_000;

export function AdminPendingOverlay() {
  const [message, setMessage] = useState(FALLBACK_LABEL);
  const [pending, setPending] = useState(false);
  const pendingRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);
  const disabledControlsRef = useRef<
    Array<HTMLButtonElement | HTMLInputElement>
  >([]);
  const submitterRef = useRef<
    HTMLButtonElement | HTMLInputElement | null
  >(null);
  const originalLabelRef = useRef("");

  const reset = useCallback(() => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    timerRef.current = null;
    pendingRef.current = false;
    formRef.current?.removeAttribute("aria-busy");
    formRef.current = null;

    for (const control of disabledControlsRef.current) {
      control.disabled = false;
    }
    disabledControlsRef.current = [];

    const submitter = submitterRef.current;
    if (submitter) {
      if (submitter instanceof HTMLInputElement) {
        submitter.value = originalLabelRef.current;
      } else {
        submitter.textContent = originalLabelRef.current;
      }
    }
    submitterRef.current = null;
    originalLabelRef.current = "";
    setPending(false);
  }, []);

  useEffect(() => {
    const handleSubmit = (event: SubmitEvent) => {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;

      // Confirmation handlers and client-side validation may cancel submission
      // after this event reaches the document. Wait one microtask before
      // locking the interface so cancelled actions stay interactive.
      queueMicrotask(() => {
        if (event.defaultPrevented || pendingRef.current) return;

        const submitter =
          event.submitter instanceof HTMLButtonElement ||
          event.submitter instanceof HTMLInputElement
            ? event.submitter
            : null;
        const originalLabel = submitter
          ? submitter instanceof HTMLInputElement
            ? submitter.value.trim()
            : submitter.textContent?.trim() || ""
          : "";
        const pendingLabel =
          submitter?.dataset.pendingLabel?.trim() ||
          (originalLabel ? `Đang xử lý: ${originalLabel}` : FALLBACK_LABEL);

        pendingRef.current = true;
        formRef.current = form;
        form.setAttribute("aria-busy", "true");
        setMessage(pendingLabel);
        setPending(true);

        disabledControlsRef.current = Array.from(
          form.querySelectorAll<HTMLButtonElement | HTMLInputElement>(
            'button[type="submit"], input[type="submit"]',
          ),
        ).filter((control) => {
          if (control.disabled) return false;
          control.disabled = true;
          return true;
        });

        if (submitter) {
          submitterRef.current = submitter;
          originalLabelRef.current = originalLabel;
          if (submitter instanceof HTMLInputElement) {
            submitter.value = "Đang xử lý…";
          } else {
            submitter.textContent = "Đang xử lý…";
          }
        }

        // A navigation normally unmounts this component. The timeout is only a
        // recovery path for a dropped network response.
        timerRef.current = window.setTimeout(reset, SAFETY_TIMEOUT_MS);
      });
    };

    document.addEventListener("submit", handleSubmit);
    window.addEventListener("pageshow", reset);
    return () => {
      document.removeEventListener("submit", handleSubmit);
      window.removeEventListener("pageshow", reset);
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, [reset]);

  if (!pending) return null;

  return (
    <AdminModalPortal>
      <div className={styles.backdrop} role="status" aria-live="assertive">
        <section className={styles.card} aria-label="Hệ thống đang xử lý">
          <span className={styles.spinner} aria-hidden="true" />
          <div>
            <strong>Vui lòng chờ</strong>
            <p>{message}</p>
            <small>Không đóng trang hoặc bấm lại trong lúc xử lý.</small>
          </div>
        </section>
      </div>
    </AdminModalPortal>
  );
}
