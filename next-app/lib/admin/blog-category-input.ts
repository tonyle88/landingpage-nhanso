import { formText, parseSortOrder } from "./form-input";
import { slugifyBlogTitle } from "./blog-post-input";

/**
 * Chuẩn bị danh mục blog: đọc tên/mô tả, tạo slug khi chưa nhập và kiểm tra thứ tự.
 * Chỉ kiểm tra cú pháp/giới hạn; việc tìm slug chưa trùng và ghi audit thuộc Server Action/RPC.
 */
export function blogCategoryPayloadFromForm(form: FormData) {
  const name = formText(form, "name");
  const requestedSlug = formText(form, "slug").toLowerCase();
  const slug = requestedSlug ||
    slugifyBlogTitle(name).slice(0, 100).replace(/-+$/g, "") ||
    "danh-muc";
  const description = formText(form, "description");
  const sortOrder = parseSortOrder(form.get("sort_order") || "0");
  if (!/^[a-z0-9][a-z0-9-]{1,99}$/.test(slug)) throw new Error("invalid slug");
  if (name.length < 2 || name.length > 120) throw new Error("invalid name");
  if (description.length > 500) throw new Error("invalid description");
  return {
    slug,
    name,
    description,
    enabled: form.get("enabled") === "on",
    sort_order: sortOrder,
  };
}
