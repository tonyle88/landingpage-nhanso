const BLOCK_BREAKS = /<\/(?:p|div|li|h[1-6]|blockquote)>|<br\s*\/?\s*>/gi;
const HTML_TAG = /<[^>]*>/g;

const ENTITIES: Record<string, string> = {
  "&nbsp;": " ",
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
};

/**
 * Đổi nội dung Quill/HTML thành văn bản đọc được cho trang chính và biểu mẫu admin.
 * Giữ ngắt dòng của đoạn/danh sách, giải mã một số HTML entity và trim kết quả.
 * Chuỗi không chứa thẻ HTML được giữ nguyên ngoài khoảng trắng hai đầu.
 * Hàm này chuyển sang text; không thay thế bộ sanitize khi cần hiển thị HTML.
 */
export function landingPlainText(value: unknown): string {
  const source = value == null ? "" : String(value);
  if (!/<\/?[a-z][\s\S]*>/i.test(source)) return source.trim();
  return source
    .replace(BLOCK_BREAKS, "\n")
    .replace(HTML_TAG, "")
    .replace(/&(nbsp|amp|lt|gt|quot|#39);/gi, (entity) =>
      ENTITIES[entity.toLowerCase()] || entity,
    )
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n[ \t]+/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
