import "server-only";

import { unstable_cache } from "next/cache";
import { createPublicServerClient } from "./server";
import type { Json } from "./database.types";

/**
 * Đọc đúng một value công khai của site_settings cho quiz và các công cụ khám phá.
 * Chỉ dùng public client, lọc is_public=true và giới hạn truy vấn 4 giây bằng AbortController.
 * Trả null khi thiếu cấu hình, không có bản ghi hoặc truy vấn lỗi để caller dùng nội dung dự phòng.
 * Timer được dọn ở finally kể cả khi truy vấn thất bại; không đọc cấu hình riêng tư.
 */
async function queryPublicSiteSetting(key: string): Promise<Json | null> {
  const client = createPublicServerClient();
  if (!client) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 4_000);
  try {
    const { data, error } = await client
      .from("site_settings")
      .select("value")
      .eq("key", key)
      .eq("is_public", true)
      .abortSignal(controller.signal)
      .maybeSingle();
    return error ? null : data?.value ?? null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Cache kết quả đọc cấu hình quiz/công cụ công khai trong 300 giây.
 * Next đưa tham số key vào cache key nên các bộ câu hỏi không ghi đè lẫn nhau.
 * Action quiz và settings gọi updateTag("public-site-settings") sau khi ghi thành công
 * để lần đọc tiếp theo nhận cấu hình mới; parser của từng công cụ vẫn kiểm tra value.
 * Không dùng hàm này để lấy secret, cấu hình riêng tư hoặc dữ liệu theo tài khoản.
 */
export const getPublicSiteSetting = unstable_cache(
  queryPublicSiteSetting,
  ["public-site-setting-v1"],
  { revalidate: 300, tags: ["public-site-settings"] },
);
