/**
 * Các bộ đọc FormData dùng chung cho biểu mẫu quản trị.
 * Chỉ chuẩn hóa dữ liệu đầu vào; quy tắc bắt buộc và độ dài theo nghiệp vụ
 * vẫn được quyết định trong từng hàm *PayloadFromForm.
 */

/**
 * Đọc trường, thay giá trị thiếu bằng chuỗi rỗng và cắt khoảng trắng hai đầu.
 * @param maxLength Nếu truyền, cắt chuỗi sau trim; bỏ trống để parser kiểm tra
 * độ dài và báo lỗi thay vì âm thầm cắt dữ liệu người dùng nhập.
 * Dùng cho gói tư vấn, feedback, danh mục và nội dung trang chính.
 */
export function formText(form: FormData, name: string, maxLength?: number) {
  const value = String(form.get(name) || "").trim();
  return maxLength === undefined ? value : value.slice(0, maxLength);
}

/**
 * Chuyển thứ tự hiển thị thành số nguyên trong khoảng 0..10.000.
 * Dùng chung cho gói, feedback, danh mục blog và section trang chính.
 * Caller quyết định giá trị mặc định trước khi gọi; null và chuỗi rỗng thành 0.
 * @throws Error với mã lỗi do caller chọn nếu số âm, số lẻ, NaN hoặc vượt giới hạn.
 */
export function parseSortOrder(value: unknown, errorMessage = "invalid order") {
  const order = Number(value);
  if (!Number.isInteger(order) || order < 0 || order > 10_000) {
    throw new Error(errorMessage);
  }
  return order;
}

/**
 * Đọc UUID tùy chọn khi tạo/sửa/xóa gói, blog, feedback hoặc tham chiếu media.
 * @returns null nếu chưa có ID; UUID hợp lệ được giữ nguyên chữ hoa/thường.
 * @throws Error("invalid id") nếu ID không phải UUID phiên bản 1..5.
 * Không thay null bằng ID tùy ý: RPC dùng null để phân biệt tạo mới với sửa bản ghi.
 */
export function optionalUuid(value: FormDataEntryValue | null) {
  const id = String(value || "").trim();
  if (!id) return null;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    throw new Error("invalid id");
  }
  return id;
}
