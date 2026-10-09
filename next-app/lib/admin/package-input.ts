import type { Json } from "@/lib/supabase/database.types";
import { formText as text, parseSortOrder } from "./form-input";

export type PackagePayload = {
  code: string;
  name: string;
  online_price: string;
  offline_price: string;
  currency: string;
  unit: string;
  icon: string;
  accent_color: string;
  featured: boolean;
  badge: string;
  features: Json;
  button_text: string;
  enabled: boolean;
  sort_order: number;
};

/**
 * Đọc giá từ form gói và kiểm tra chuỗi số nguyên không âm có thể biểu diễn an toàn.
 * Giữ kết quả dạng chuỗi để RPC xử lý numeric; chuỗi rỗng là chưa nhập giá, không phải giá 0.
 */
function price(form: FormData, name: string) {
  const value = text(form, name, 20);
  if (!value) return "";
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value))) {
    throw new Error("invalid price");
  }
  return value;
}

/**
 * Tạo payload RPC admin_save_package từ biểu mẫu tạo/sửa gói tư vấn.
 * Chuẩn hóa mã, tiền tệ, hai mức giá, danh sách tối đa 30 tính năng và thứ tự hiển thị.
 * Cắt các trường văn bản theo giới hạn hiện có; từ chối mã/giá/tiền tệ không hợp lệ.
 * Không lấy giá từ lựa chọn đặt lịch của khách và không ghi DB trực tiếp.
 */
export function packagePayloadFromForm(form: FormData): PackagePayload {
  const code = text(form, "code", 64).toLowerCase();
  const name = text(form, "name", 160);
  const onlinePrice = price(form, "online_price");
  const offlinePrice = price(form, "offline_price");
  const currency = text(form, "currency", 3).toUpperCase() || "VND";
  const sortOrder = parseSortOrder(text(form, "sort_order", 6) || "0", "invalid sort order");
  const features = text(form, "features", 4000)
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .slice(0, 30)
    .map((item) => item.slice(0, 200));

  if (!/^[a-z0-9][a-z0-9-]{1,63}$/.test(code)) {
    throw new Error("invalid code");
  }
  if (name.length < 2) throw new Error("invalid name");
  if (!onlinePrice && !offlinePrice) throw new Error("missing price");
  if (!/^[A-Z]{3}$/.test(currency)) throw new Error("invalid currency");

  return {
    code,
    name,
    online_price: onlinePrice,
    offline_price: offlinePrice,
    currency,
    unit: text(form, "unit", 80),
    icon: text(form, "icon", 80),
    accent_color: text(form, "accent_color", 32),
    featured: form.get("featured") === "on",
    badge: text(form, "badge", 80),
    features,
    button_text: text(form, "button_text", 120),
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}
