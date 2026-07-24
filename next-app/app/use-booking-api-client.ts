"use client";

import { useEffect } from "react";

const BOOKING_URL =
  "https://script.google.com/macros/s/AKfycbxbWZXF2iCsWsr0cWL0JVChANywEq7D7l_mCIvrvqZs78vSOsPej3PuXFgHbOiVNoKr/exec";
const REQUEST_TIMEOUT_MS = 12000;
const RETRY_COUNT = 2;

type BookingData = Record<string, unknown>;
type BookingResponse = Record<string, unknown> & {
  ok?: boolean;
  message?: string;
};

declare global {
  interface Window {
    ClowBookingApi?: {
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

function toUrlParams(data: BookingData, action: string) {
  const params = new URLSearchParams({ action });
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      params.append(key, String(value));
    }
  });
  return params;
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
  error: unknown,
  data: BookingData = {},
) {
  try {
    const message =
      error instanceof Error ? error.message : String(error || "Unknown client error");
    const body = toUrlParams(
      {
        context,
        message,
        pageUrl: window.location.href,
        package: data.package || "",
        phone: data.phone || "",
        email: data.email || "",
        submittedAt: new Date().toISOString(),
      },
      "logClientError",
    ).toString();
    await fetch(BOOKING_URL, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    });
  } catch (logFailure) {
    console.warn("Không ghi được client error log:", logFailure);
  }
}

async function postAction(action: string, data: BookingData) {
  const body = toUrlParams(data, action);
  let lastError: unknown;
  for (let attempt = 0; attempt <= RETRY_COUNT; attempt += 1) {
    try {
      const response = await fetchWithTimeout(
        BOOKING_URL,
        { method: "POST", mode: "cors", cache: "no-store", body },
        REQUEST_TIMEOUT_MS,
      );
      const result = (await response.json()) as BookingResponse;
      if (!result.ok) {
        throw new Error(
          result.message || "Không thể hoàn tất thao tác đặt lịch.",
        );
      }
      return result;
    } catch (error) {
      lastError = error;
      if (attempt < RETRY_COUNT) {
        await new Promise<void>((resolve) =>
          window.setTimeout(resolve, 700 * (attempt + 1)),
        );
      }
    }
  }
  await logError(action, lastError, data);
  throw lastError;
}

export function useBookingApiClient() {
  useEffect(() => {
    const runtime = { fetchWithTimeout, postAction, logError };
    window.ClowBookingApi = runtime;
    window.dispatchEvent(new Event("clow-booking-api-ready"));
    return () => {
      if (window.ClowBookingApi === runtime) {
        delete window.ClowBookingApi;
      }
    };
  }, []);
}
