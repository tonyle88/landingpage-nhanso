import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { validateBookingReservationPayload } from "@/lib/booking-validation";
import type { Json } from "@/lib/supabase/database.types";
import { createServiceServerClient } from "@/lib/supabase/server";

const MAX_RESERVATION_BODY_BYTES = 16_384;
const MAX_CANCELLATION_BODY_BYTES = 2_048;
const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

class BookingRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly responseHeaders: Record<string, string> = {},
  ) {
    super(message);
  }
}

function jsonResponse(
  body: Record<string, unknown>,
  status: number,
  additionalHeaders: Record<string, string> = {},
) {
  return Response.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "application/json; charset=utf-8",
      ...additionalHeaders,
    },
  });
}

function readClientIp(request: Request) {
  const requestHostname = new URL(request.url).hostname;
  const loopbackIp =
    requestHostname === "127.0.0.1" ||
    requestHostname === "localhost" ||
    requestHostname === "::1"
      ? "127.0.0.1"
      : null;
  const candidates = [
    request.headers.get("cf-connecting-ip"),
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0],
    loopbackIp,
  ];
  for (const candidate of candidates) {
    const value = candidate?.trim();
    if (value && isIP(value)) return value;
  }
  throw new BookingRequestError(
    503,
    "Hệ thống đặt lịch tạm thời không khả dụng.",
  );
}

function hashClientIp(request: Request) {
  const secret = process.env.BOOKING_RATE_LIMIT_SECRET?.trim();
  if (!secret || secret.length < 32) {
    throw new BookingRequestError(
      503,
      "Hệ thống đặt lịch tạm thời không khả dụng.",
    );
  }
  return createHmac("sha256", secret)
    .update(readClientIp(request), "utf8")
    .digest("hex");
}

async function enforceRateLimit(
  request: Request,
  payload: Record<string, Json | undefined>,
) {
  const supabase = createServiceServerClient();
  if (!supabase) {
    throw new BookingRequestError(
      503,
      "Hệ thống đặt lịch tạm thời không khả dụng.",
    );
  }
  const email = typeof payload.email === "string" ? payload.email : null;
  const phone = typeof payload.phone === "string" ? payload.phone : null;
  const { data, error } = await supabase.rpc("consume_booking_rate_limit", {
    p_ip_hash: hashClientIp(request),
    p_email: email,
    p_phone: phone,
  });
  if (error || !data || typeof data !== "object" || Array.isArray(data)) {
    throw new BookingRequestError(
      503,
      "Hệ thống đặt lịch tạm thời không khả dụng.",
    );
  }
  const result = data as Record<string, Json | undefined>;
  if (result.allowed !== true) {
    const retryAfter =
      typeof result.retryAfter === "number"
        ? Math.max(1, Math.min(900, Math.ceil(result.retryAfter)))
        : 900;
    throw new BookingRequestError(
      429,
      `Bạn đã gửi quá nhiều yêu cầu. Hãy thử lại sau ${retryAfter} giây.`,
      { "Retry-After": String(retryAfter) },
    );
  }
  return supabase;
}

async function readBoundedJson(
  request: Request,
  maximumBytes: number,
): Promise<Record<string, Json | undefined>> {
  const contentType = request.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.startsWith("application/json")) {
    throw new BookingRequestError(415, "Yêu cầu phải dùng JSON.");
  }

  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    throw new BookingRequestError(413, "Dữ liệu yêu cầu quá lớn.");
  }
  if (!request.body) {
    throw new BookingRequestError(400, "Thiếu dữ liệu yêu cầu.");
  }

  const reader = request.body.getReader();
  const decoder = new TextDecoder("utf-8", { fatal: true });
  let byteCount = 0;
  let text = "";
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      byteCount += value.byteLength;
      if (byteCount > maximumBytes) {
        await reader.cancel();
        throw new BookingRequestError(413, "Dữ liệu yêu cầu quá lớn.");
      }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
  } catch (error) {
    if (error instanceof BookingRequestError) throw error;
    throw new BookingRequestError(400, "JSON không hợp lệ.");
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new BookingRequestError(400, "JSON không hợp lệ.");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new BookingRequestError(400, "JSON phải là một object.");
  }
  return parsed as Record<string, Json | undefined>;
}

function readIdempotencyKey(request: Request) {
  const key = request.headers.get("idempotency-key")?.trim() ?? "";
  if (!UUID_PATTERN.test(key)) {
    throw new BookingRequestError(400, "Idempotency-Key không hợp lệ.");
  }
  return key;
}

function mapDatabaseError(code?: string) {
  if (code === "23P01" || code === "23505") {
    return new BookingRequestError(409, "Khung giờ này không còn khả dụng.");
  }
  if (code === "P0002") {
    return new BookingRequestError(404, "Không tìm thấy lịch hẹn.");
  }
  if (code === "22023" || code === "22P02") {
    return new BookingRequestError(400, "Dữ liệu đặt lịch không hợp lệ.");
  }
  return new BookingRequestError(
    503,
    "Hệ thống đặt lịch tạm thời không khả dụng.",
  );
}

function handleError(error: unknown) {
  const safeError =
    error instanceof BookingRequestError
      ? error
      : new BookingRequestError(
          503,
          "Hệ thống đặt lịch tạm thời không khả dụng.",
        );
  return jsonResponse(
    { ok: false, message: safeError.message },
    safeError.status,
    safeError.responseHeaders,
  );
}

export async function reserveBooking(request: Request) {
  try {
    const idempotencyKey = readIdempotencyKey(request);
    const payload = await readBoundedJson(
      request,
      MAX_RESERVATION_BODY_BYTES,
    );
    const validation = validateBookingReservationPayload(payload);
    if (!validation.ok) {
      throw new BookingRequestError(400, validation.message);
    }
    const normalizedPayload = validation.value as Record<
      string,
      Json | undefined
    >;
    const supabase = await enforceRateLimit(request, normalizedPayload);

    const { data, error } = await supabase.rpc("create_booking_reservation", {
      p_idempotency_key: idempotencyKey,
      p_payload: normalizedPayload,
    });
    if (error) throw mapDatabaseError(error.code);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    return jsonResponse({ ok: true, ...data }, 201);
  } catch (error) {
    return handleError(error);
  }
}

export async function cancelBooking(request: Request) {
  try {
    const idempotencyKey = readIdempotencyKey(request);
    const payload = await readBoundedJson(
      request,
      MAX_CANCELLATION_BODY_BYTES,
    );
    const publicId =
      typeof payload.booking_id === "string" ? payload.booking_id.trim() : "";
    if (!/^BKG-[A-Z0-9]{16}$/.test(publicId)) {
      throw new BookingRequestError(400, "Mã lịch hẹn không hợp lệ.");
    }
    const supabase = await enforceRateLimit(request, {});

    const { data, error } = await supabase.rpc("cancel_booking_reservation", {
      p_public_id: publicId,
      p_idempotency_key: idempotencyKey,
    });
    if (error) throw mapDatabaseError(error.code);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    return jsonResponse({ ok: true, ...data }, 200);
  } catch (error) {
    return handleError(error);
  }
}

export async function listUnavailableBookingSlots(request: Request) {
  try {
    const url = new URL(request.url);
    const from = new Date(url.searchParams.get("from") || "");
    const to = new Date(url.searchParams.get("to") || "");
    const maximumRangeMs = 31 * 24 * 60 * 60 * 1000;
    if (
      Number.isNaN(from.getTime()) ||
      Number.isNaN(to.getTime()) ||
      to <= from ||
      to.getTime() - from.getTime() > maximumRangeMs
    ) {
      throw new BookingRequestError(400, "Khoảng thời gian không hợp lệ.");
    }
    const supabase = createServiceServerClient();
    if (!supabase) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    const { data, error } = await supabase.rpc(
      "list_booking_unavailable_slots",
      { p_from: from.toISOString(), p_to: to.toISOString() },
    );
    if (error) throw mapDatabaseError(error.code);
    return jsonResponse({ ok: true, slots: data ?? [] }, 200, {
      "Cache-Control": "public, max-age=15, stale-while-revalidate=30",
    });
  } catch (error) {
    return handleError(error);
  }
}

async function readBookingCredential(
  request: Request,
  maximumBytes = MAX_CANCELLATION_BODY_BYTES,
) {
  const idempotencyKey = readIdempotencyKey(request);
  const payload = await readBoundedJson(request, maximumBytes);
  const publicId =
    typeof payload.booking_id === "string" ? payload.booking_id.trim() : "";
  if (!/^BKG-[A-Z0-9]{16}$/.test(publicId)) {
    throw new BookingRequestError(400, "Mã lịch hẹn không hợp lệ.");
  }
  return { idempotencyKey, payload, publicId };
}

export async function getBookingStatus(request: Request) {
  try {
    const { idempotencyKey, publicId } =
      await readBookingCredential(request);
    const supabase = createServiceServerClient();
    if (!supabase) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    const { data, error } = await supabase.rpc(
      "get_booking_reservation_status",
      { p_public_id: publicId, p_idempotency_key: idempotencyKey },
    );
    if (error) throw mapDatabaseError(error.code);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    return jsonResponse({ ok: true, ...data }, 200);
  } catch (error) {
    return handleError(error);
  }
}

export async function acknowledgeManualPayment(request: Request) {
  try {
    const { idempotencyKey, payload, publicId } =
      await readBookingCredential(request);
    const supabase = await enforceRateLimit(request, payload);
    const { data, error } = await supabase.rpc(
      "acknowledge_manual_booking_payment",
      { p_public_id: publicId, p_idempotency_key: idempotencyKey },
    );
    if (error) throw mapDatabaseError(error.code);
    if (!data || typeof data !== "object" || Array.isArray(data)) {
      throw new BookingRequestError(
        503,
        "Hệ thống đặt lịch tạm thời không khả dụng.",
      );
    }
    return jsonResponse({ ok: true, ...data }, 200);
  } catch (error) {
    return handleError(error);
  }
}
