"use client";

import { useEffect } from "react";

type BookingState = {
  name: string;
  dob: string;
  phone: string;
  email: string;
  consultationType: string;
  package: string;
  concern: string;
  bookingId: string;
  paymentOrderId: string;
  expectedAmount: number;
  holdExpiresAt: string;
};

const createState = (): BookingState => ({
  name: "",
  dob: "",
  phone: "",
  email: "",
  consultationType: "",
  package: "",
  concern: "",
  bookingId: "",
  paymentOrderId: "",
  expectedAmount: 0,
  holdExpiresAt: "",
});

declare global {
  interface Window {
    ClowBookingState?: {
      getState: () => BookingState;
      patch: (values: Partial<BookingState>) => void;
    };
  }
}

function todayInputValue() {
  const today = new Date();
  return [
    today.getFullYear(),
    String(today.getMonth() + 1).padStart(2, "0"),
    String(today.getDate()).padStart(2, "0"),
  ].join("-");
}

function validateDob(value: string) {
  if (!value) return "Vui lòng nhập ngày tháng năm sinh.";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    return "Ngày sinh chưa đúng định dạng dd/mm/yyyy, năm phải gồm 4 số.";
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date();
  if (year < 1900 || year > today.getFullYear()) {
    return "Năm sinh chưa hợp lệ. Vui lòng nhập năm sinh gồm 4 số.";
  }
  const dob = new Date(year, month - 1, day);
  if (
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại ngày, tháng, năm.";
  }
  if (dob > today) return "Ngày sinh không được lớn hơn ngày hiện tại.";
  return "";
}

export function useBookingFormState() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("#booking-form");
    const dobInput = document.querySelector<HTMLInputElement>("#dob");
    if (!form || !dobInput) return;

    const state = createState();
    const runtime = {
      getState: () => state,
      patch: (values: Partial<BookingState>) => Object.assign(state, values),
    };
    window.ClowBookingState = runtime;
    dobInput.max = todayInputValue();

    const clearDobError = () => {
      const message = validateDob(dobInput.value);
      dobInput.setCustomValidity(dobInput.value ? message : "");
    };
    const requiredInputs = Array.from(
      form.querySelectorAll<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>(
        "[required]",
      ),
    );
    const handleInvalid = (event: Event) => {
      const input = event.currentTarget as HTMLInputElement;
      if (input.validity.valueMissing) {
        input.setCustomValidity("Vui lòng nhập thông tin");
      }
    };
    const clearRequiredError = (event: Event) => {
      const input = event.currentTarget as HTMLInputElement;
      if (input.id !== "dob") input.setCustomValidity("");
    };
    const handleSubmit = (event: SubmitEvent) => {
      event.preventDefault();
      const dobMessage = validateDob(dobInput.value);
      dobInput.setCustomValidity(dobMessage);
      if (dobMessage) {
        dobInput.reportValidity();
        dobInput.focus();
        return;
      }
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      runtime.patch({
        name: String(data.get("name") || ""),
        dob: String(data.get("dob") || ""),
        phone: String(data.get("phone") || ""),
        email: String(data.get("email") || ""),
        consultationType: String(data.get("consultationType") || ""),
        package: String(data.get("package") || ""),
        concern: String(data.get("concern") || ""),
        bookingId: "",
        paymentOrderId: "",
        expectedAmount: 0,
        holdExpiresAt: "",
      });
      window.dispatchEvent(new Event("clow-booking-form-valid"));
    };

    dobInput.addEventListener("input", clearDobError);
    dobInput.addEventListener("change", clearDobError);
    requiredInputs.forEach((input) => {
      input.addEventListener("invalid", handleInvalid);
      input.addEventListener("input", clearRequiredError);
      input.addEventListener("change", clearRequiredError);
    });
    form.addEventListener("submit", handleSubmit);
    window.dispatchEvent(new Event("clow-booking-state-ready"));

    return () => {
      dobInput.removeEventListener("input", clearDobError);
      dobInput.removeEventListener("change", clearDobError);
      requiredInputs.forEach((input) => {
        input.removeEventListener("invalid", handleInvalid);
        input.removeEventListener("input", clearRequiredError);
        input.removeEventListener("change", clearRequiredError);
      });
      form.removeEventListener("submit", handleSubmit);
      if (window.ClowBookingState === runtime) delete window.ClowBookingState;
    };
  }, []);
}
