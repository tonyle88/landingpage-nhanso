import { formText, parseSortOrder } from "./form-input";
const unsafeHtml =
  /<\s*(script|iframe|object|embed|style)\b|on[a-z]+\s*=|javascript\s*:/i;

/**
 * Đọc nội dung và bố cục một section cho action quản trị trang chính.
 * Kiểm tra giới hạn tên, tiêu đề, HTML và thứ tự; từ chối các mẫu HTML chủ động đã quy định.
 * Không coi regex là sanitizer tổng quát: lớp hiển thị vẫn phải sanitize HTML trước khi render.
 */
export function landingSectionPayloadFromForm(form: FormData) {
  const displayName = formText(form, "display_name");
  const title = formText(form, "title");
  const eyebrow = formText(form, "eyebrow");
  const contentHtml = formText(form, "content_html");
  const sortOrder = parseSortOrder(form.get("sort_order"), "invalid sort order");

  if (displayName.length < 2 || displayName.length > 160) {
    throw new Error("invalid display name");
  }
  if (title.length > 300 || eyebrow.length > 160) {
    throw new Error("invalid section copy");
  }
  if (contentHtml.length > 100_000 || unsafeHtml.test(contentHtml)) {
    throw new Error("invalid section HTML");
  }

  return {
    display_name: displayName,
    title,
    eyebrow,
    content_html: contentHtml,
    sort_order: sortOrder,
    enabled: form.get("enabled") === "on",
  };
}
