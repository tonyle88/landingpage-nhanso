import "server-only";

import { createHmac } from "node:crypto";
import { isIP } from "node:net";
import { createServiceServerClient } from "@/lib/supabase/server";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const BOT_PATTERN = /bot\b|crawler|spider|headless|lighthouse|pagespeed|preview/i;

function json(body: Record<string, unknown>, status = 200) {
  return Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

/** Ghi mã chẩn đoán vận hành; không ghi IP, mã phiên, header, body hoặc giá trị secret. */
function unavailable(reason: string) {
  console.warn("landing-visits-unavailable", { reason });
  return json({ ok: false }, 503);
}

/**
 * Lấy IP từ proxy triển khai dùng để giới hạn spam; không lưu hoặc trả IP cho trình duyệt.
 * Chỉ trên Vercel mới nhận x-forwarded-for: nền tảng ghi đè header này từ kết nối thật.
 * Ưu tiên x-vercel-forwarded-for khi có; máy chủ sau Cloudflare dùng cf-connecting-ip.
 * Ngoài Vercel không nhận x-forwarded-for tùy ý. Thiếu IP hợp lệ thì không ghi lượt.
 */
function networkIdentity(request: Request) {
  const candidates = process.env.VERCEL === "1"
    ? [request.headers.get("x-vercel-forwarded-for"), request.headers.get("x-forwarded-for")]
    : [request.headers.get("cf-connecting-ip")];
  for (const candidate of candidates) {
    const ip = candidate?.split(",")[0]?.trim();
    if (ip && isIP(ip)) return ip;
  }
  return null;
}

/**
 * Ghi nhận phiên trang chủ qua RPC nguyên tử, chống đếm lặp và mất lượt khi truy cập đồng thời.
 * Chỉ chạy trên production. Dev/preview và bot nhận diện được không tạo lượt mới.
 * Phiên và IP được HMAC với secret sẵn có; IP hash đổi mỗi ngày.
 * RPC dọn dữ liệu tạm cũ hơn 24 giờ khi có request mới, vẫn giữ tổng lượt lịch sử.
 * RPC chỉ mở cho service_role, trình duyệt không được ghi trực tiếp vào bảng hoặc gửi số tổng.
 */
export async function recordLandingVisit(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || origin !== new URL(request.url).origin
    || request.headers.get("sec-fetch-site") === "cross-site") {
    return json({ ok: false }, 403);
  }
  const sessionId = request.headers.get("x-visit-id") || "";
  if (!UUID_PATTERN.test(sessionId)) return json({ ok: false }, 400);
  if (process.env.NODE_ENV !== "production"
    || (process.env.VERCEL_ENV && process.env.VERCEL_ENV !== "production")) {
    return json({ ok: false }, 503);
  }

  const supabase = createServiceServerClient();
  if (!supabase) return unavailable("SERVICE_CLIENT_MISSING");
  const secret = process.env.BOOKING_RATE_LIMIT_SECRET?.trim()
    || process.env.SUPABASE_SECRET_KEY?.trim()
    || process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const ip = networkIdentity(request);
  if (!secret) return unavailable("HASH_SECRET_MISSING");
  if (!ip) return unavailable("TRUSTED_NETWORK_HEADER_MISSING");
  const hash = (value: string) => createHmac("sha256", secret).update(value).digest("hex");

  try {
    const { data, error } = await supabase.rpc("record_landing_visit", {
      p_session_hash: hash(`landing-session:${sessionId}`),
      p_network_hash: hash(`landing-network:${new Date().toISOString().slice(0, 10)}:${ip}`),
      p_count_visit: !BOT_PATTERN.test(request.headers.get("user-agent") || ""),
    }).abortSignal(AbortSignal.timeout(5_000));
    if (error || !data || typeof data !== "object" || Array.isArray(data)) {
      const code = error?.code && /^[A-Z0-9_]{1,16}$/.test(error.code) ? error.code : "RPC_RESULT_INVALID";
      return unavailable(code);
    }
    if (data.allowed !== true) return json({ ok: false }, 429);
    if (typeof data.total !== "string" || !/^\d{1,19}$/.test(data.total)) {
      return unavailable("TOTAL_FORMAT_INVALID");
    }
    return json({ ok: true, total: data.total });
  } catch {
    // Never expose database errors, request identifiers or secrets in public responses/logs.
    return unavailable("RPC_REQUEST_FAILED");
  }
}
