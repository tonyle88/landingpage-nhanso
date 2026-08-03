import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { NUMEROLOGY_HISTORY_SETTING_KEY } from "@/lib/admin/numerology-records.server";
import { createAuthServerClient } from "@/lib/supabase/auth-server";

export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return Response.json({ error: message }, { status });
}

export async function PUT(request: Request) {
  const principal = await getAdminPrincipal();
  if (!principal) return jsonError("Phiên đăng nhập đã hết hạn.", 401);
  if (!can(principal.role, "manage_operations")) {
    return jsonError("Chỉ owner hoặc admin được thay đổi giới hạn lưu trữ.", 403);
  }

  let limit: number;
  try {
    const payload = await request.json();
    limit = Number(payload?.limit);
  } catch {
    return jsonError("Giới hạn lưu trữ không hợp lệ.", 400);
  }
  if (!Number.isSafeInteger(limit) || limit < 20 || limit > 1000) {
    return jsonError("Giới hạn phải là số nguyên từ 20 đến 1000.", 400);
  }

  const supabase = await createAuthServerClient();
  const { error } = await supabase.rpc("admin_save_site_setting", {
    p_key: NUMEROLOGY_HISTORY_SETTING_KEY,
    p_payload: {
      value: { limit },
      description: "Số hồ sơ nhân số học gần nhất được giữ riêng cho mỗi tài khoản (20-1000).",
      is_public: false,
    },
  });
  if (error) {
    console.error("numerology history limit update failed", error.code);
    return jsonError("Không thể cập nhật giới hạn kho hồ sơ lúc này.", 503);
  }

  return Response.json({ historyLimit: limit });
}
