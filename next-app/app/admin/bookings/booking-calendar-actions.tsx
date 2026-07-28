"use client";

import { useId, useMemo, useRef, useState } from "react";
import styles from "../admin.module.css";

type ServerAction = (formData: FormData) => void | Promise<void>;

function vietnamDateInput(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function BookingCalendarActions({
  id,
  slotStart,
  canChange,
  rescheduleAction,
  cancelAction,
  recoverAction,
}: {
  id: string;
  slotStart: string;
  canChange: boolean;
  rescheduleAction: ServerAction;
  cancelAction: ServerAction;
  recoverAction: ServerAction;
}) {
  const [mode, setMode] = useState<"reschedule" | "cancel" | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [date, setDate] = useState("");
  const formRef = useRef<HTMLFormElement>(null);
  const titleId = useId();
  const messageId = useId();
  const minimumDate = useMemo(
    () => vietnamDateInput(new Date(Date.now() + 72 * 60 * 60 * 1000)),
    [],
  );
  const weekday = date
    ? new Intl.DateTimeFormat("en-US", {
        timeZone: "Asia/Ho_Chi_Minh",
        weekday: "short",
      }).format(new Date(`${date}T12:00:00+07:00`))
    : "";
  const isWeekend = weekday === "Sat" || weekday === "Sun";
  const times = isWeekend
    ? ["09:00", "11:00", "13:00", "15:00", "17:00", "19:00"]
    : ["19:00"];

  return (
    <>
      <div className={styles.actionRow}>
        <button
          className={styles.secondaryLink}
          type="button"
          disabled={!canChange}
          title={
            canChange
              ? "Chọn ngày và giờ mới"
              : "Chỉ đổi hoặc hủy khi còn ít nhất 72 giờ"
          }
          onClick={() => setMode("reschedule")}
        >
          ↻ Đổi lịch
        </button>
        <button
          className={styles.dangerButton}
          type="button"
          disabled={!canChange}
          title={
            canChange
              ? "Hủy lịch và giải phóng khung giờ"
              : "Chỉ đổi hoặc hủy khi còn ít nhất 72 giờ"
          }
          onClick={() => setMode("cancel")}
        >
          Hủy lịch
        </button>
        {!canChange ? (
          <span className={styles.description}>
            Còn dưới 72 giờ — vui lòng xử lý thủ công.
          </span>
        ) : null}
        <form action={recoverAction}>
          <input type="hidden" name="id" value={id} />
          <button className={styles.secondaryLink} type="submit">
            ↻ Đồng bộ lại Calendar
          </button>
        </form>
      </div>

      {mode ? (
        <div
          className={styles.confirmBackdrop}
          role="presentation"
          onMouseDown={() => setMode(null)}
          onKeyDown={(event) => {
            if (event.key === "Escape") setMode(null);
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
              {mode === "cancel" ? "!" : "↻"}
            </span>
            <div>
              <p className={styles.eyebrow}>Google Calendar</p>
              <h3 id={titleId}>
                {mode === "cancel" ? "Xác nhận hủy lịch?" : "Chọn lịch mới"}
              </h3>
              <p id={messageId}>
                {mode === "cancel"
                  ? "Lịch sẽ chuyển sang đã hủy, sự kiện Calendar bị xóa và hai bên nhận email thông báo."
                  : "Chọn ngày trước, sau đó chọn một khung giờ còn trống. Calendar và email hai bên sẽ được cập nhật."}
              </p>
              <form
                ref={formRef}
                action={
                  mode === "cancel" ? cancelAction : rescheduleAction
                }
                className={styles.calendarChangeForm}
                onSubmit={() => setSubmitting(true)}
              >
                <input type="hidden" name="id" value={id} />
                <input
                  type="hidden"
                  name="expected_slot_start"
                  value={slotStart}
                />
                {mode === "reschedule" ? (
                  <div className={styles.calendarChangeFields}>
                    <label className={styles.field}>
                      Ngày mới
                      <input
                        name="new_date"
                        type="date"
                        min={minimumDate}
                        required
                        value={date}
                        onChange={(event) => setDate(event.target.value)}
                      />
                    </label>
                    {date ? (
                      <label className={styles.field}>
                        Giờ mới
                        <select name="new_time" required defaultValue="">
                          <option value="" disabled>Chọn giờ</option>
                          {times.map((time) => (
                            <option key={time} value={time}>
                              {time} – {String(Number(time.slice(0, 2)) + 2).padStart(2, "0")}:00
                            </option>
                          ))}
                        </select>
                      </label>
                    ) : null}
                  </div>
                ) : null}
              </form>
              <div className={styles.confirmActions}>
                <button
                  className={styles.secondaryLink}
                  type="button"
                  disabled={submitting}
                  onClick={() => setMode(null)}
                >
                  Quay lại
                </button>
                <button
                  className={
                    mode === "cancel" ? styles.dangerButton : styles.submit
                  }
                  type="button"
                  disabled={submitting || (mode === "reschedule" && !date)}
                  onClick={() => formRef.current?.requestSubmit()}
                >
                  {submitting
                    ? "Đang xử lý..."
                    : mode === "cancel"
                      ? "Xác nhận hủy lịch"
                      : "Đổi lịch & gửi email"}
                </button>
              </div>
            </div>
          </section>
        </div>
      ) : null}
    </>
  );
}
