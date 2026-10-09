/**
 * Đọc số trang từ query string cho danh sách lịch hẹn và danh sách khách hàng.
 * @returns Số nguyên dương an toàn, hoặc trang 1 khi thiếu/không hợp lệ.
 * Giữ hành vi parseInt hiện có ("2abc" -> 2); đây không phải kiểm tra payload API.
 * Không chặn trang vượt tổng số trang: caller có count từ DB và tự redirect về trang cuối.
 */
export function parsePositivePage(value: string | null | undefined) {
  const page = Number.parseInt(value || "1", 10);
  return Number.isSafeInteger(page) && page > 0 ? page : 1;
}
