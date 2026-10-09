/**
 * Đổi ngày ISO YYYY-MM-DD sang DD/MM/YYYY cho danh sách khách và hồ sơ nhân số.
 * Không tạo Date nên ngày sinh không bị lệch ngày theo múi giờ của trình duyệt.
 * Giữ nguyên chuỗi không đủ ba phần; giá trị thiếu dùng nhãn do caller chọn.
 */
export function formatBirthDate(value: string | null, emptyLabel = "—") {
  if (!value) return emptyLabel;
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

/**
 * Hiển thị dung lượng PDF/JPG trên hai màn danh sách hồ sơ nhân số.
 * Giữ quy tắc giao diện: file dưới 1 MiB làm tròn KB; từ 1 MiB hiển thị một số lẻ.
 * @param emptyLabel Nhãn file 0 byte: calculator dùng "0 KB", kho hồ sơ dùng "1 KB".
 * Đây là định dạng hiển thị, không dùng chuỗi kết quả để kiểm tra quota hoặc lưu DB.
 */
export function formatArchiveBytes(bytes: number, emptyLabel = "0 KB") {
  if (!bytes) return emptyLabel;
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
