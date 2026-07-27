"use client";

import { useId, useRef, useState } from "react";
import type { Database } from "@/lib/supabase/database.types";
import styles from "../admin.module.css";

type BookingStatus = Database["public"]["Enums"]["booking_status"];

const confirmationCopy: Record<
  BookingStatus,
  { title: string; message: string; confirmLabel: string; dangerous?: boolean }
> = {
  pending: {
    title: "Chuyển về chờ xử lý?",
    message: "Trạng thái lịch hẹn sẽ được đưa về bước chờ xử lý.",
    confirmLabel: "Xác nhận chuyển",
  },
  held: {
    title: "Xác nhận giữ chỗ?",
    message:
      "Khung giờ sẽ tiếp tục được giữ cho khách, nhưng chưa gửi email xác nhận lịch.",
    confirmLabel: "Xác nhận giữ chỗ",
  },
  paid: {
    title: "Xác nhận đã nhận đủ tiền?",
    message:
      "Chỉ tiếp tục sau khi đã đối soát đúng số tiền và mã chuyển khoản. Bước này chưa gửi email; hãy xác nhận lịch ở bước tiếp theo.",
    confirmLabel: "Đã kiểm tra tiền",
  },
  confirmed: {
    title: "Xác nhận lịch và gửi email?",
    message:
      "Lịch hẹn sẽ được xác nhận. Hệ thống đồng thời gửi email giao diện Clow Cat Patronus cho khách và email báo có khách đặt cho chủ hệ thống.",
    confirmLabel: "Xác nhận & gửi email",
  },
  cancelled: {
    title: "Hủy lịch hẹn này?",
    message:
      "Khung giờ sẽ được giải phóng. Hãy chắc chắn bạn đã trao đổi với khách trước khi hủy.",
    confirmLabel: "Hủy lịch hẹn",
    dangerous: true,
  },
  expired: {
    title: "Đánh dấu lịch đã hết hạn?",
    message:
      "Khung giờ sẽ được giải phóng và đơn này không thể tiếp tục thanh toán.",
    confirmLabel: "Đánh dấu hết hạn",
    dangerous: true,
  },
};

export function BookingTransitionButton({
  id,
  expectedStatus,
  nextStatus,
  label,
  action,
}: {
  id: string;
  expectedStatus: BookingStatus;
  nextStatus: BookingStatus;
  label: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const messageId = useId();
  const copy = confirmationCopy[nextStatus];

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="id" value={id} />
        <input
          type="hidden"
          name="expected_status"
          value={expectedStatus}
        />
        <input type="hidden" name="next_status" value={nextStatus} />
        <button
          className={styles.secondaryLink}
          type="button"
          onClick={() => setConfirming(true)}
        >
          → {label}
        </button>
      </form>

      {confirming ? (
        <div
          className={styles.confirmBackdrop}
          role="presentation"
          onMouseDown={() => setConfirming(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setConfirming(false);
          }}
        >
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className={styles.confirmIcon} aria-hidden="true">
              {copy.dangerous ? "!" : "✓"}
            </span>
            <div>
              <p className={styles.eyebrow}>Xác nhận lịch hẹn</p>
              <h3 id={titleId}>{copy.title}</h3>
              <p id={messageId}>{copy.message}</p>
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.secondaryLink}
                type="button"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                Quay lại
              </button>
              <button
                className={
                  copy.dangerous ? styles.dangerButton : styles.submit
                }
                type="button"
                disabled={submitting}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {submitting ? "Đang xử lý..." : copy.confirmLabel}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}

export function BookingEmailRecoveryButton({
  id,
  action,
}: {
  id: string;
  action: (formData: FormData) => void | Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const messageId = useId();

  return (
    <>
      <form
        ref={formRef}
        action={action}
        onSubmit={() => setSubmitting(true)}
      >
        <input type="hidden" name="id" value={id} />
        <button
          className={styles.secondaryLink}
          type="button"
          onClick={() => setConfirming(true)}
        >
          ✉ Kiểm tra & gửi email còn thiếu
        </button>
      </form>
      {confirming ? (
        <div
          className={styles.confirmBackdrop}
          role="presentation"
          onMouseDown={() => setConfirming(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setConfirming(false);
          }}
        >
          <section
            className={styles.confirmDialog}
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={messageId}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className={styles.confirmIcon} aria-hidden="true">✉</span>
            <div>
              <p className={styles.eyebrow}>Email xác nhận</p>
              <h3 id={titleId}>Kiểm tra và gửi email còn thiếu?</h3>
              <p id={messageId}>
                Hệ thống kiểm tra lịch sử gửi thư, chỉ gửi phần còn thiếu cho
                khách hoặc chủ hệ thống và không gửi trùng thư đã thành công.
              </p>
            </div>
            <div className={styles.confirmActions}>
              <button
                className={styles.secondaryLink}
                type="button"
                disabled={submitting}
                onClick={() => setConfirming(false)}
              >
                Quay lại
              </button>
              <button
                className={styles.submit}
                type="button"
                disabled={submitting}
                onClick={() => formRef.current?.requestSubmit()}
              >
                {submitting ? "Đang gửi..." : "Kiểm tra & gửi"}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
