"use client";

import { useEffect } from "react";

const CONTENT_URL =
  "https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec";

type PaymentSettings = {
  sepayEnabled: boolean;
  bankName: string;
  bankBin: string;
  bankAccount: string;
  bankAccountName: string;
  sepayBankName: string;
  sepayBankAccount: string;
  paymentTimeoutMinutes: number;
};

type PackageSnapshot = {
  name?: string;
  label?: string;
  priceLabel?: string;
  typeLabel?: string;
};

type PaymentCheckOutcome =
  | "waiting"
  | "paid"
  | "confirmed"
  | "stopped"
  | "error";

const VERIFICATION_WINDOW_MS = 10_000;
const VERIFICATION_RETRY_MS = 2_000;

const DEFAULTS: PaymentSettings = {
  sepayEnabled: false,
  bankName: "BIDV",
  bankBin: "970418",
  bankAccount: "96247031088CUONG",
  bankAccountName: "LÊ CHÍ CƯỜNG",
  sepayBankName: "BIDV",
  sepayBankAccount: "96247031088CUONG",
  paymentTimeoutMinutes: 15,
};

function normalize(value: unknown): PaymentSettings {
  const item =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};
  return {
    sepayEnabled:
      (item.sepayEnabled === true ||
        String(item.sepayEnabled).toLowerCase() === "true"),
    bankName: String(item.bankName || DEFAULTS.bankName).trim(),
    bankBin: String(item.bankBin || DEFAULTS.bankBin).trim(),
    bankAccount: String(item.bankAccount || DEFAULTS.bankAccount).trim(),
    bankAccountName: String(
      item.bankAccountName || DEFAULTS.bankAccountName,
    ).trim(),
    sepayBankName: String(
      item.sepayBankName || DEFAULTS.sepayBankName,
    ).trim(),
    sepayBankAccount: String(
      item.sepayBankAccount || DEFAULTS.sepayBankAccount,
    ).trim(),
    paymentTimeoutMinutes: Math.max(
      1,
      Number(item.paymentTimeoutMinutes || DEFAULTS.paymentTimeoutMinutes),
    ),
  };
}

declare global {
  interface Window {
    ClowPaymentRuntime?: {
      getSettings: () => PaymentSettings;
      applySettings: (value: unknown) => void;
      refreshSettings: () => Promise<void>;
      open: (snapshot: PackageSnapshot) => void;
      prepare: () => void;
      stop: () => void;
    };
  }
}

export function usePaymentRuntime() {
  useEffect(() => {
    let settings = { ...DEFAULTS };
    let loadedAt = 0;
    let countdownTimer = 0;
    let pollTimer = 0;
    let verificationGeneration = 0;
    let statusCheckPromise: Promise<PaymentCheckOutcome> | null = null;
    let currentSnapshot: PackageSnapshot = {};

    const stop = () => {
      verificationGeneration += 1;
      window.clearInterval(countdownTimer);
      window.clearInterval(pollTimer);
      countdownTimer = 0;
      pollTimer = 0;
    };
    const stopCountdown = () => {
      window.clearInterval(countdownTimer);
      countdownTimer = 0;
    };
    const applySettings = (value: unknown) => {
      settings = normalize(value);
      loadedAt = Date.now();
    };
    const refreshSettings = async () => {
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        let nextSettings: unknown = settings;
        const landingSettingsAreStale =
          !loadedAt || Date.now() - loadedAt >= 60000;
        if (landingSettingsAreStale) {
          const response = await fetch(
            `${CONTENT_URL}?action=getLandingContent&_=${Date.now()}&paymentRefresh=1`,
            {
              method: "GET",
              mode: "cors",
              cache: "no-store",
              signal: controller.signal,
            },
          );
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const payload = (await response.json()) as {
            ok?: boolean;
            paymentSettings?: unknown;
          };
          if (payload.ok === false || !payload.paymentSettings) {
            throw new Error(
              "Không tải được cấu hình thanh toán mới nhất. Vui lòng thử lại sau ít phút.",
            );
          }
          nextSettings = payload.paymentSettings;
        }
        // The admin toggle lives in Supabase, so this endpoint must always be
        // revalidated before reserving a slot. Do not reuse the landing-content
        // cache for the SePay/manual decision.
        const nativeResponse = await fetch(
          `/api/payment-settings?_=${Date.now()}`,
          {
            method: "GET",
            cache: "no-store",
            headers: { "Cache-Control": "no-cache" },
            signal: controller.signal,
          },
        );
        const nativePayload = (await nativeResponse.json()) as {
          ok?: boolean;
          sepayEnabled?: boolean;
        };
        if (!nativeResponse.ok || !nativePayload.ok) {
          throw new Error(
            "Không tải được trạng thái SePay. Vui lòng thử lại sau ít phút.",
          );
        }
        nextSettings = {
          ...(nextSettings as Record<string, unknown>),
          sepayEnabled: nativePayload.sepayEnabled === true,
        };
        applySettings(nextSettings);
      } finally {
        window.clearTimeout(timeout);
      }
    };

    const closeModals = () => {
      stop();
      document.querySelector("#booking-overlay")?.classList.remove("active");
      ["modal-calendar", "modal-payment", "modal-success"].forEach((id) => {
        document.getElementById(id)?.classList.remove("active");
      });
      document.body.style.overflow = "";
    };
    const openModal = (id: string) => {
      document.querySelector("#booking-overlay")?.classList.add("active");
      document.getElementById(id)?.classList.add("active");
      document.body.style.overflow = "hidden";
    };
    const appendSummaryRow = (
      container: HTMLElement,
      iconClass: string,
      label: string,
      value: string,
    ) => {
      const row = document.createElement("div");
      row.className = "success-summary-row";
      const icon = document.createElement("i");
      icon.className = iconClass;
      icon.setAttribute("aria-hidden", "true");
      const text = document.createElement("span");
      const strong = document.createElement("strong");
      strong.textContent = `${label}:`;
      text.append(strong, document.createTextNode(` ${value}`));
      row.append(icon, text);
      container.appendChild(row);
    };
    const showSuccess = (
      mode: "confirmed" | "manual-review",
      customerEmailSent = false,
    ) => {
      const state = window.ClowBookingState?.getState();
      const calendar = window.ClowBookingCalendar?.getSelection();
      if (!state) return;
      const manualReview = mode === "manual-review";
      const title = document.querySelector<HTMLElement>("#modal-suc-title");
      const emailNote = document.querySelector<HTMLElement>(
        "#modal-success .success-email-note",
      );
      const greeting =
        document.querySelector<HTMLElement>("#success-greeting");
      const summary =
        document.querySelector<HTMLElement>("#success-summary");
      if (title) {
        title.textContent = manualReview
          ? "Đã Ghi Nhận Thanh Toán!"
          : "Đặt Lịch Thành Công!";
      }
      if (emailNote) {
        emailNote.textContent = manualReview
          ? "Lịch đang được giữ chỗ. Clow Cat Patronus sẽ xác nhận sau khi kiểm tra giao dịch chuyển khoản."
          : customerEmailSent
            ? "Email xác nhận đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra cả mục Spam nếu không thấy trong hộp thư đến."
            : "Lịch hẹn đã được xác nhận. Nếu chưa thấy email, vui lòng kiểm tra lại hộp thư và mục Spam sau ít phút.";
      }
      if (greeting) {
        greeting.textContent = manualReview
          ? `Cảm ơn ${state.name}! Chúng mình đã ghi nhận thông báo chuyển khoản của bạn.`
          : `Chào mừng ${state.name}! Lịch tư vấn của bạn đã được xác nhận.`;
      }
      if (summary) {
        summary.replaceChildren();
        appendSummaryRow(
          summary,
          "fa-regular fa-clock",
          "Thời gian",
          calendar?.fullSlotLabel || "",
        );
        appendSummaryRow(
          summary,
          "fa-solid fa-box-open",
          "Gói",
          currentSnapshot.name || currentSnapshot.label || "",
        );
        appendSummaryRow(
          summary,
          "fa-solid fa-money-bill-wave",
          "Số tiền",
          currentSnapshot.priceLabel || "",
        );
        appendSummaryRow(
          summary,
          "fa-solid fa-video",
          "Hình thức",
          currentSnapshot.typeLabel || state.consultationType,
        );
        appendSummaryRow(
          summary,
          "fa-regular fa-envelope",
          "Email xác nhận",
          state.email,
        );
      }
      closeModals();
      openModal("modal-success");
    };
    const announceConfirmed = (customerEmailSent = false) => {
      stop();
      showSuccess("confirmed", customerEmailSent);
    };
    const checkStatus = async (): Promise<PaymentCheckOutcome> => {
      if (statusCheckPromise) return statusCheckPromise;
      if (!settings.sepayEnabled) return "stopped";
      const state = window.ClowBookingState?.getState();
      if (!state?.paymentOrderId || !state.bookingId) return "stopped";

      const request = (async (): Promise<PaymentCheckOutcome> => {
        try {
          const result = await window.ClowBookingApi?.postAction(
            "checkBookingStatus",
            {
              bookingId: state.bookingId,
              idempotencyKey: state.idempotencyKey,
            },
          ) as {
            ok?: boolean;
            status?: string;
            emailDelivery?: {
              customer?: string;
            };
          };
          if (!result?.ok) return "waiting";
          if (result.status === "cancelled" || result.status === "expired") {
            stop();
            const statusText =
              document.querySelector<HTMLElement>("#sepay-status-text");
            const countdown =
              document.querySelector<HTMLElement>("#sepay-countdown");
            if (statusText) {
              statusText.textContent =
                result.status === "cancelled"
                  ? "Lịch giữ chỗ này đã bị hủy. Vui lòng quay lại chọn lịch để tạo mã thanh toán mới."
                  : "Mã thanh toán đã hết hạn. Vui lòng quay lại chọn lịch để tạo mã thanh toán mới.";
            }
            if (countdown) {
              countdown.style.display = "";
              countdown.textContent = "Đã dừng";
            }
            return "stopped";
          }
          if (result.status === "confirmed") {
            announceConfirmed(
              result.emailDelivery?.customer === "sent" ||
                result.emailDelivery?.customer === "already_sent",
            );
            return "confirmed";
          }
          if (result.status === "paid") {
            stopCountdown();
            const statusText =
              document.querySelector<HTMLElement>("#sepay-status-text");
            const countdown =
              document.querySelector<HTMLElement>("#sepay-countdown");
            if (statusText) {
              statusText.textContent =
                "Đã nhận thanh toán. Đang hoàn tất lịch hẹn...";
            }
            if (countdown) {
              countdown.style.display = "";
              countdown.textContent = "Đã thanh toán";
            }
            return "paid";
          }
          return "waiting";
        } catch (error) {
          console.warn("SePay status check failed:", error);
          return "error";
        }
      })();

      statusCheckPromise = request;
      try {
        return await request;
      } finally {
        if (statusCheckPromise === request) statusCheckPromise = null;
      }
    };

    const prepare = () => {
      stop();
      const waiting = document.querySelector<HTMLElement>("#sepay-waiting");
      const confirmButton = document.querySelector<HTMLButtonElement>(
        "#btn-confirm-payment",
      );
      const note = document.querySelector<HTMLElement>("#payment-note-text");
      const title = document.querySelector<HTMLElement>("#modal-pay-title");
      if (!waiting || !confirmButton || !note || !title) return;

      if (!settings.sepayEnabled) {
        waiting.hidden = true;
        confirmButton.hidden = false;
        confirmButton.style.display = "";
        confirmButton.disabled = false;
        confirmButton.textContent = "✓ Tôi Đã Chuyển Khoản Thành Công";
        title.textContent = "Thanh Toán Chuyển Khoản";
        note.textContent =
          "Sau khi chuyển khoản, nhấn nút bên dưới để thông báo. Lịch được giữ chỗ và sẽ xác nhận sau khi kiểm tra giao dịch.";
        return;
      }

      waiting.hidden = false;
      confirmButton.hidden = true;
      confirmButton.style.display = "none";
      confirmButton.disabled = true;
      title.textContent = "Thanh Toán SePay";
      note.textContent =
        "Vui lòng quét mã và giữ nguyên nội dung chuyển khoản. Hệ thống sẽ tự xác nhận khi nhận được thanh toán.";
      const countdown =
        document.querySelector<HTMLElement>("#sepay-countdown");
      const statusText =
        document.querySelector<HTMLElement>("#sepay-status-text");
      const statusLabel =
        document.querySelector<HTMLElement>("#sepay-status-label");
      const checkButton = document.querySelector<HTMLButtonElement>(
        "#btn-check-sepay-status",
      );
      if (statusLabel) statusLabel.textContent = "Thời gian giữ mã";
      if (statusText) {
        statusText.textContent =
          "Sau khi chuyển khoản, bấm kiểm tra một lần. Hệ thống sẽ xác thực giao dịch trong 5–10 giây.";
      }
      if (checkButton) {
        checkButton.disabled = false;
        checkButton.textContent = "Kiểm tra lại thanh toán";
        checkButton.setAttribute("aria-busy", "false");
      }
      waiting.dataset.verifying = "false";
      const expiresAt =
        Date.now() + Math.max(60, settings.paymentTimeoutMinutes * 60) * 1000;
      const updateCountdown = () => {
        const remaining = Math.max(
          0,
          Math.ceil((expiresAt - Date.now()) / 1000),
        );
        if (countdown) {
          countdown.style.display = "";
          countdown.textContent = `${String(Math.floor(remaining / 60)).padStart(2, "0")}:${String(remaining % 60).padStart(2, "0")}`;
        }
        if (remaining <= 0) {
          stop();
          if (statusText) {
            statusText.textContent =
              "Thanh toán đã quá hạn. Bạn có thể quay lại chọn lịch hoặc tải lại mã thanh toán.";
          }
        }
      };
      updateCountdown();
      countdownTimer = window.setInterval(updateCountdown, 1000);
      pollTimer = window.setInterval(() => void checkStatus(), 5000);
      window.setTimeout(() => void checkStatus(), 0);
    };

    const open = (snapshot: PackageSnapshot) => {
      const state = window.ClowBookingState?.getState();
      const calendar = window.ClowBookingCalendar?.getSelection();
      if (
        !state?.bookingId ||
        !state.paymentOrderId ||
        !state.expectedAmount
      ) {
        return;
      }
      currentSnapshot = snapshot;
      const bankName = settings.sepayEnabled
        ? settings.sepayBankName
        : settings.bankName;
      const bankAccount = settings.sepayEnabled
        ? settings.sepayBankAccount
        : settings.bankAccount;
      const qrUrl = settings.sepayEnabled
        ? `https://qr.sepay.vn/img?acc=${encodeURIComponent(bankAccount)}&bank=${encodeURIComponent(bankName)}&amount=${state.expectedAmount}&des=${encodeURIComponent(state.paymentOrderId)}`
        : `https://img.vietqr.io/image/${encodeURIComponent(settings.bankBin)}-${encodeURIComponent(bankAccount)}-compact2.jpg?amount=${state.expectedAmount}&addInfo=${encodeURIComponent(state.paymentOrderId)}&accountName=${encodeURIComponent(settings.bankAccountName)}`;
      const image = document.querySelector<HTMLImageElement>("#qr-img");
      if (image) image.src = qrUrl;
      const values: Record<string, string> = {
        "bank-name": bankName,
        "bank-account": bankAccount,
        "bank-account-name": settings.bankAccountName,
        "pay-amount": `${state.expectedAmount.toLocaleString("vi-VN")}đ`,
        "pay-content": state.paymentOrderId,
        "pay-slot": calendar?.fullSlotLabel || "",
        "pay-package": snapshot.name || snapshot.label || "",
        "pay-type": snapshot.typeLabel || state.consultationType,
        "pay-package-detail": snapshot.priceLabel || "",
      };
      Object.entries(values).forEach(([id, value]) => {
        const element = document.querySelector<HTMLElement>(`#${id}`);
        if (!element) return;
        element.textContent = value;
        if (id === "bank-account" || id === "pay-content") {
          element.dataset.copy = value;
        }
      });
      const detailRow = document.querySelector<HTMLElement>(
        "#pay-package-detail-row",
      );
      if (detailRow) detailRow.hidden = false;
      prepare();
      openModal("modal-payment");
    };

    const showToast = (message: string) => {
      const toast = document.querySelector<HTMLElement>("#toast");
      if (!toast) return;
      toast.textContent = message;
      toast.classList.add("show");
      window.setTimeout(() => toast.classList.remove("show"), 4000);
    };
    const confirmManualPayment = async () => {
      if (settings.sepayEnabled) {
        showToast(
          "SePay đang bật, hệ thống sẽ tự xác nhận khi nhận được thanh toán.",
        );
        return;
      }
      const button = document.querySelector<HTMLButtonElement>(
        "#btn-confirm-payment",
      );
      const state = window.ClowBookingState?.getState();
      if (!button || !state?.bookingId) return;
      button.textContent = "Đang xử lý...";
      button.disabled = true;
      try {
        const result = await window.ClowBookingApi?.postAction(
          "confirmBooking",
          {
            bookingId: state.bookingId,
            idempotencyKey: state.idempotencyKey,
          },
        );
        showSuccess(
          result?.status === "confirmed" ? "confirmed" : "manual-review",
        );
      } catch (error) {
        await window.ClowBookingApi?.logError("finalizeBooking", error, state);
        showToast(
          "Có lỗi khi xử lý. Vui lòng chụp màn hình và liên hệ qua Zalo/Facebook để được hỗ trợ.",
        );
        button.textContent = "✓ Tôi Đã Chuyển Khoản Thành Công";
        button.disabled = false;
      }
    };
    const confirmButton = document.querySelector<HTMLButtonElement>(
      "#btn-confirm-payment",
    );
    const checkSepayButton = document.querySelector<HTMLButtonElement>(
      "#btn-check-sepay-status",
    );
    const checkSepayNow = async () => {
      if (!checkSepayButton || checkSepayButton.disabled) return;
      const waiting = document.querySelector<HTMLElement>("#sepay-waiting");
      const statusText =
        document.querySelector<HTMLElement>("#sepay-status-text");
      const paymentModal =
        document.querySelector<HTMLElement>("#modal-payment");
      const runGeneration = verificationGeneration;
      let outcome: PaymentCheckOutcome = "waiting";

      window.clearInterval(pollTimer);
      pollTimer = 0;
      checkSepayButton.disabled = true;
      checkSepayButton.textContent = "Đang xác thực...";
      checkSepayButton.setAttribute("aria-busy", "true");
      if (waiting) waiting.dataset.verifying = "true";
      if (statusText) {
        statusText.textContent =
          "Đang xác thực giao dịch. Vui lòng chờ 5–10 giây...";
      }
      try {
        const deadline = Date.now() + VERIFICATION_WINDOW_MS;
        outcome = await checkStatus();
        while (
          verificationGeneration === runGeneration &&
          settings.sepayEnabled &&
          paymentModal?.classList.contains("active") &&
          outcome !== "confirmed" &&
          outcome !== "stopped" &&
          Date.now() < deadline
        ) {
          await new Promise<void>((resolve) => {
            window.setTimeout(
              resolve,
              Math.min(VERIFICATION_RETRY_MS, deadline - Date.now()),
            );
          });
          if (
            verificationGeneration !== runGeneration ||
            !paymentModal.classList.contains("active")
          ) {
            break;
          }
          outcome = await checkStatus();
        }

        if (
          verificationGeneration === runGeneration &&
          paymentModal?.classList.contains("active") &&
          statusText
        ) {
          statusText.textContent =
            outcome === "paid"
              ? "Đã nhận thanh toán. Hệ thống đang hoàn tất lịch hẹn, vui lòng giữ màn hình này."
              : outcome === "error"
                ? "Ngân hàng đang phản hồi chậm. Hệ thống vẫn tiếp tục kiểm tra tự động."
                : "Chưa thấy giao dịch mới. Hệ thống vẫn đang tự động kiểm tra; bạn không cần bấm lại.";
        }
      } finally {
        const shouldContinuePolling =
          verificationGeneration === runGeneration &&
          settings.sepayEnabled &&
          paymentModal?.classList.contains("active") &&
          outcome !== "confirmed" &&
          outcome !== "stopped";
        if (shouldContinuePolling && !pollTimer) {
          pollTimer = window.setInterval(() => void checkStatus(), 5000);
        }
        if (
          document.body.contains(checkSepayButton) &&
          paymentModal?.classList.contains("active")
        ) {
          checkSepayButton.disabled = false;
          checkSepayButton.textContent = "Kiểm tra lại thanh toán";
          checkSepayButton.setAttribute("aria-busy", "false");
        }
        if (waiting) waiting.dataset.verifying = "false";
      }
    };
    confirmButton?.addEventListener("click", confirmManualPayment);
    checkSepayButton?.addEventListener("click", checkSepayNow);

    const runtime = {
      getSettings: () => settings,
      applySettings,
      refreshSettings,
      open,
      prepare,
      stop,
    };
    window.ClowPaymentRuntime = runtime;
    return () => {
      stop();
      confirmButton?.removeEventListener("click", confirmManualPayment);
      checkSepayButton?.removeEventListener("click", checkSepayNow);
      if (window.ClowPaymentRuntime === runtime) {
        delete window.ClowPaymentRuntime;
      }
    };
  }, []);
}
