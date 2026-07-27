"use client";

import { useEffect } from "react";

const REQUEST_TIMEOUT_MS = 12000;
const RETRY_COUNT = 2;

type BookingData = Record<string, unknown>;
type BookingResponse = Record<string, unknown> & {
  ok?: boolean;
  message?: string;
};

class BookingApiError extends Error {
  constructor(
    message: string,
    readonly retryable: boolean,
  ) {
    super(message);
  }
}

declare global {
  interface Window {
    ClowBookingApi?: {
      nativeEnabled: boolean;
      fetchWithTimeout: (
        input: RequestInfo | URL,
        init?: RequestInit,
        timeoutMs?: number,
      ) => Promise<Response>;
      postAction: (
        action: string,
        data: BookingData,
      ) => Promise<BookingResponse>;
      logError: (
        context: string,
        error: unknown,
        data?: BookingData,
      ) => Promise<void>;
    };
  }
}

function nativeRequest(action: string, data: BookingData) {
  const idempotencyKey = String(data.idempotencyKey || "");
  const common = {
    method: "POST",
    cache: "no-store" as RequestCache,
    headers: {
      "Content-Type": "application/json",
      "Idempotency-Key": idempotencyKey,
    },
  };
  if (action === "createBooking") {
    return {
      url: "/api/bookings/reserve",
      init: {
        ...common,
        body: JSON.stringify({
          customer_name: data.name,
          date_of_birth: data.dob,
          phone: data.phone,
          email: data.email,
          consultation_type: data.consultationType,
          package_code: data.package,
          concern: data.concern,
          slot_start: data.slotStart,
          slot_end: data.slotEnd,
          payment_provider:
            data.paymentProvider === "sepay" ? "sepay" : "manual_qr",
        }),
      },
    };
  }
  const bookingBody = JSON.stringify({ booking_id: data.bookingId });
  if (action === "cancelBooking") {
    return {
      url: "/api/bookings/cancel",
      init: { ...common, body: bookingBody },
    };
  }
  if (action === "checkBookingStatus") {
    return {
      url: "/api/bookings/status",
      init: { ...common, body: bookingBody },
    };
  }
  if (action === "confirmBooking") {
    return {
      url: "/api/bookings/manual-payment",
      init: { ...common, body: bookingBody },
    };
  }
  throw new BookingApiError("Thao tác đặt lịch không hợp lệ.", false);
}

async function fetchWithTimeout(
  input: RequestInfo | URL,
  init: RequestInit = {},
  timeoutMs = 10000,
) {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    window.clearTimeout(timeout);
  }
}

async function logError(
  context: string,
  _error: unknown,
  _data: BookingData = {},
) {
  console.warn(`Booking action failed: ${context}`);
}

async function postAction(action: string, data: BookingData) {
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const native = nativeRequest(action, data);
      const response = await fetchWithTimeout(
        native.url,
        native.init,
        REQUEST_TIMEOUT_MS,
      );
      const result = (await response.json()) as BookingResponse;
      if (!response.ok || !result.ok) {
        throw new BookingApiError(
          result.message || "Không thể hoàn tất thao tác đặt lịch.",
          response.status >= 500,
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      const retryable =
        !(error instanceof BookingApiError) || error.retryable;
      if (attempt < RETRY_COUNT && retryable) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 700 * (attempt + 1)),
        );
      } else {
        break;
      }
    }
  }
  await logError(action, lastError, data);
  throw lastError;
}

export function useBookingApiClient() {
  useEffect(() => {
    const runtime = {
      nativeEnabled: true,
      fetchWithTimeout,
      postAction,
      logError,
    };
    window.ClowBookingApi = runtime;
    window.dispatchEvent(new Event("clow-booking-api-ready"));
    return () => {
      if (window.ClowBookingApi === runtime) {
        delete window.ClowBookingApi;
      }
    };
  }, []);
}
