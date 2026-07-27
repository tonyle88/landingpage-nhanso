"use client";

import { useEffect } from "react";
import {
  normalizeBookingEmail,
  normalizeBookingName,
  normalizeVietnamesePhone,
  validateBookingConcern,
  validateBookingDob,
  validateBookingEmail,
  validateBookingName,
  validateBookingPhone,
} from "@/lib/booking-validation";

type BookingState = {
  name: string;
  dob: string;
  phone: string;
  email: string;
  consultationType: string;
  package: string;
  concern: string;
  idempotencyKey: string;
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
  idempotencyKey: "",
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

export function useBookingFormState() {
  useEffect(() => {
    const form = document.querySelector<HTMLFormElement>("#booking-form");
    if (!form) return;
    const field = <T extends HTMLInputElement | HTMLTextAreaElement>(
      name: string,
    ) => form.elements.namedItem(name) as T | null;
    const nameInput = field<HTMLInputElement>("name");
    const dobInput = field<HTMLInputElement>("dob");
    const phoneInput = field<HTMLInputElement>("phone");
    const emailInput = field<HTMLInputElement>("email");
    const concernInput = field<HTMLTextAreaElement>("concern");
    if (!nameInput || !dobInput || !phoneInput || !emailInput || !concernInput) {
      return;
    }

    const state = createState();
    const runtime = {
      getState: () => state,
      patch: (values: Partial<BookingState>) => Object.assign(state, values),
    };
    window.ClowBookingState = runtime;
    dobInput.max = todayInputValue();

    const clearDobError = () => {
      const message = validateBookingDob(dobInput.value);
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
      const validations = [
        [nameInput, validateBookingName(nameInput.value)],
        [dobInput, validateBookingDob(dobInput.value)],
        [phoneInput, validateBookingPhone(phoneInput.value)],
        [emailInput, validateBookingEmail(emailInput.value)],
        [concernInput, validateBookingConcern(concernInput.value)],
      ] as const;
      validations.forEach(([input, message]) =>
        input.setCustomValidity(message),
      );
      const firstInvalid = validations.find(([, message]) => message)?.[0];
      if (firstInvalid) {
        firstInvalid.reportValidity();
        firstInvalid.focus();
        return;
      }
      if (!form.reportValidity()) return;

      const data = new FormData(form);
      runtime.patch({
        name: normalizeBookingName(String(data.get("name") || "")),
        dob: String(data.get("dob") || ""),
        phone: normalizeVietnamesePhone(String(data.get("phone") || "")),
        email: normalizeBookingEmail(String(data.get("email") || "")),
        consultationType: String(data.get("consultationType") || ""),
        package: String(data.get("package") || ""),
        concern: String(data.get("concern") || ""),
        idempotencyKey: window.crypto.randomUUID(),
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
