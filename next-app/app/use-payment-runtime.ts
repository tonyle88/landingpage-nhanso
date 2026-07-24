"use client";

import { useEffect } from "react";

const CONTENT_URL =
  "https://script.google.com/macros/s/AKfycbw3m9zkv9mX-BgMtB7DZj2rMrZtkAAOFDQow2UKxttXRz8G5Zlc4qponSGrvPBxJwEO/exec";
const BOOKING_URL =
  "https://script.google.com/macros/s/AKfycbxbWZXF2iCsWsr0cWL0JVChANywEq7D7l_mCIvrvqZs78vSOsPej3PuXFgHbOiVNoKr/exec";

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
      item.sepayEnabled === true ||
      String(item.sepayEnabled).toLowerCase() === "true",
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
    let currentSnapshot: PackageSnapshot = {};

    const stop = () => {
      window.clearInterval(countdownTimer);
      window.clearInterval(pollTimer);
      countdownTimer = 0;
      pollTimer = 0;
    };
    const applySettings = (value: unknown) => {
      settings = normalize(value);
      loadedAt = Date.now();
    };
    const refreshSettings = async () => {
      if (loadedAt && Date.now() - loadedAt < 60000) return;
      const controller = new AbortController();
      const timeout = window.setTimeout(() => controller.abort(), 4500);
      try {
        const response = await fetch(
          `${CONTENT_URL}?action=getLandingContent&_=${Date.now()}&paymentRefresh=1`,
          { method: "GET", mode: "cors", cache: "no-store", signal: controller.signal },
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
        applySettings(payload.paymentSettings);
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
    const showSuccess = (mode: "confirmed" | "manual-review") => {
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
          : "Email xác nhận đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra cả mục Spam nếu không thấy trong hộp thư đến.";
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
    const announceConfirmed = () => {
      stop();
      showSuccess("confirmed");
    };
    const checkStatus = async () => {
      if (!settings.sepayEnabled) return;
      const state = window.ClowBookingState?.getState();
      if (!state?.paymentOrderId || !state.bookingId) return;
      try {
        const params = new URLSearchParams({
          action: "checkSepayPayment",
          paymentOrderId: state.paymentOrderId,
          bookingId: state.bookingId,
        });
        const response = await window.ClowBookingApi?.fetchWithTimeout(
          `${BOOKING_URL}?${params}`,
          { method: "GET", mode: "cors", cache: "no-store" },
          12000,
        );
        if (!response) return;
        const result = (await response.json()) as {
          ok?: boolean;
          status?: string;
        };
        if (!result.ok) return;
        if (result.status === "confirmed") {
          announceConfirmed();
          return;
        }
        if (result.status !== "paid") return;

        stop();
        const statusText =
          document.querySelector<HTMLElement>("#sepay-status-text");
        if (statusText) {
          statusText.textContent = "Đang hoàn tất lịch hẹn...";
        }
        const countdown =
          document.querySelector<HTMLElement>("#sepay-countdown");
        if (countdown) countdown.style.display = "none";
        const confirmation = await window.ClowBookingApi?.postAction(
          "confirmBooking",
          { bookingId: state.bookingId },
        );
        if (confirmation?.status === "confirmed") announceConfirmed();
      } catch (error) {
        console.warn("SePay status check failed:", error);
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
          { bookingId: state.bookingId },
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
    confirmButton?.addEventListener("click", confirmManualPayment);

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
      if (window.ClowPaymentRuntime === runtime) {
        delete window.ClowPaymentRuntime;
      }
    };
  }, []);
}
