/**
 * Quy ước trình bày bản đồ nhân số dùng chung cho giao diện, PDF và JPG.
 * Chỉ chứa dữ liệu tĩnh/toán hình học; không truy cập DOM hoặc gọi API.
 * Khi đổi thứ tự chỉ số hoặc vị trí điểm chu kỳ, sửa tại đây để các bản xuất đồng bộ.
 */
import type { NumerologyMetricKey } from "@/lib/numerology";

/** Thứ tự, nhãn và mô tả bảy chỉ số; dùng chung trong JSX và các trang canvas. */
export const METRICS: Array<[NumerologyMetricKey, string, string]> = [
  ["lifePath", "Đường đời", "Ngày + tháng + năm sinh"],
  ["birthday", "Ngày sinh", "Năng lượng ngày chào đời"],
  ["mission", "Sứ mệnh", "Toàn bộ chữ cái trong họ tên"],
  ["soul", "Linh hồn", "Nguyên âm trong họ tên"],
  ["personality", "Nhân cách", "Phụ âm trong họ tên"],
  ["attitude", "Thái độ", "Ngày sinh + tháng sinh"],
  ["maturity", "Trưởng thành", "Đường đời + sứ mệnh"],
];

/** Thứ tự ô của biểu đồ Pitago, đọc từ trái sang phải và từ hàng trên xuống. */
export const CHART_ORDER = [3, 6, 9, 2, 5, 8, 1, 4, 7];

/**
 * Cao độ chín điểm chu kỳ dùng chung trên màn hình và bản xuất PDF/JPG.
 * Mảng ánh xạ các chỉ số 1..9 sang tọa độ Y; 1 và 9 cùng cao độ.
 * Giá trị Y tăng về phía dưới canvas/SVG; giữ nguyên hình dáng biểu đồ đã thiết kế.
 */
export const CYCLE_POINT_Y = [48, 79, 143, 160, 107, 58, 178, 130, 48];

/**
 * Tạo SVG path Bézier cho biểu đồ chu kỳ trên màn hình nhân số học.
 * Lấy hai điểm lân cận để tính tay điều khiển; trả chuỗi rỗng nếu không có điểm.
 * Hàm thuần, không thay đổi mảng đầu vào và không truy cập DOM.
 */
export function createSmoothCyclePath(points: Array<{ x: number; y: number }>) {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const control1X = previous.x + (point.x - beforePrevious.x) / 6;
    const control1Y = previous.y + (point.y - beforePrevious.y) / 6;
    const control2X = point.x - (next.x - previous.x) / 6;
    const control2Y = point.y - (next.y - previous.y) / 6;
    return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${point.x} ${point.y}`;
  }, "");
}
