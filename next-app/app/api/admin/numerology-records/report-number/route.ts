import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

const MAX_REPORT_NUMBER = 999_999_999;

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

function parseRequestedNumber(value: unknown) {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  if (!/^\d{1,9}$/.test(raw)) return undefined;
  const parsed = Number.parseInt(raw, 10);
  if (!Number.isSafeInteger(parsed) || parsed < 1 || parsed > MAX_REPORT_NUMBER) {
    return undefined;
  }
  return parsed;
}

export async function POST(request: Request) {
  const principal = await getAdminPrincipal();
  if (!principal) return jsonError("Phiên đăng nhập đã hết hạn.", 401);

  let payload: Record<string, unknown>;
  try {
    const parsed = await request.json();
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
    payload = parsed as Record<string, unknown>;
  } catch {
    return jsonError("Dữ liệu cấp số hồ sơ không hợp lệ.", 400);
  }

  const normalizedName = String(payload.normalizedName || "").trim();
  const birthDate = String(payload.birthDate || "").trim();
  const requestedNumber = parseRequestedNumber(payload.requestedNumber);
  if (normalizedName.length < 2 || normalizedName.length > 180) {
    return jsonError("Tên chuẩn hóa không hợp lệ.", 400);
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) {
    return jsonError("Ngày sinh không hợp lệ.", 400);
  }
  if (requestedNumber === undefined) {
    return jsonError("Số hồ sơ chỉ gồm 1–9 chữ số và phải lớn hơn 0.", 400);
  }

  const supabase = await createAuthServerClient();
  const { data: existing, error: existingError } = await supabase
    .from("numerology_records")
    .select("id,report_number")
    .eq("created_by", principal.userId)
    .eq("normalized_name", normalizedName)
    .eq("birth_date", birthDate)
    .maybeSingle();

  if (existingError) {
    console.error("numerology report number lookup failed", existingError.code);
    return jsonError("Chưa thể cấp số hồ sơ. Hãy áp dụng migration số hồ sơ mới.", 503);
  }

  if (requestedNumber !== null) {
    const { data: conflict, error: conflictError } = await supabase
      .from("numerology_records")
      .select("id")
      .eq("created_by", principal.userId)
      .eq("report_number", requestedNumber)
      .neq("id", existing?.id || "00000000-0000-0000-0000-000000000000")
      .maybeSingle();
    if (conflictError) {
      console.error("numerology report number conflict check failed", conflictError.code);
      return jsonError("Không thể kiểm tra số hồ sơ lúc này.", 503);
    }
    if (conflict) return jsonError(`Số hồ sơ ${requestedNumber} đã được sử dụng.`, 409);
    return Response.json({ reportNumber: requestedNumber, source: "manual" });
  }

  if (existing?.report_number) {
    return Response.json({ reportNumber: existing.report_number, source: "existing" });
  }

  const { data: reserved, error: reserveError } = await supabase.rpc(
    "reserve_numerology_report_number",
  );
  if (reserveError || !reserved) {
    console.error("numerology report number reserve failed", reserveError?.code);
    return jsonError("Chưa thể phát sinh số hồ sơ. Hãy áp dụng migration số hồ sơ mới.", 503);
  }

  return Response.json({ reportNumber: reserved, source: "automatic" });
}
