type BookingPayload = Record<string, unknown>;

export type ValidatedBookingPayload = {
  customer_name: string;
  date_of_birth: string;
  phone: string;
  email: string;
  consultation_type: "online" | "offline";
  package_code: string;
  concern: string;
  slot_start: string;
  slot_end: string;
  payment_provider: "sepay" | "manual_qr";
};

type ValidationResult =
  | { ok: true; value: ValidatedBookingPayload }
  | { ok: false; message: string };

const NAME_PATTERN = /^[\p{L}\p{M} .'’-]+$/u;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const VIETNAMESE_PHONE_PATTERN = /^(?:03|05|07|08|09)\d{8}$/;

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Gom khoảng trắng trong tên khách trước khi kiểm tra form hoặc payload đặt lịch.
 * Giữ nguyên dấu/chữ hoa để không tự thay đổi tên khách đã nhập.
 */
export function normalizeBookingName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

/**
 * Trim và chuyển email sang chữ thường để frontend/backend đối chiếu cùng một dạng.
 * Chỉ chuẩn hóa; validateBookingEmail chịu trách nhiệm kiểm tra cú pháp và độ dài.
 */
export function normalizeBookingEmail(value: string) {
  return value.trim().toLowerCase();
}

/**
 * Bỏ dấu phân cách và đổi đầu +84/84 thành 0 trước khi kiểm tra số di động Việt Nam.
 * Không tự chấp nhận đầu số: validateBookingPhone kiểm tra mẫu 10 chữ số sau chuẩn hóa.
 */
export function normalizeVietnamesePhone(value: string) {
  let phone = value.trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("84")) phone = `0${phone.slice(2)}`;
  return phone;
}

/**
 * Kiểm tra tên khách có đủ chữ cái, dài tối đa 100 ký tự và dùng ký tự cho phép.
 * Trả chuỗi rỗng khi hợp lệ, hoặc thông báo tiếng Việt để form/API hiển thị lỗi.
 */
export function validateBookingName(value: string) {
  const name = normalizeBookingName(value);
  const letterCount = (name.match(/\p{L}/gu) || []).length;
  if (!name) return "Vui lòng nhập họ và tên.";
  if (name.length < 2 || letterCount < 2) {
    return "Họ và tên phải có ít nhất 2 chữ cái.";
  }
  if (name.length > 100) return "Họ và tên không được vượt quá 100 ký tự.";
  if (!NAME_PATTERN.test(name)) {
    return "Họ và tên chỉ được chứa chữ cái và dấu câu thông dụng.";
  }
  return "";
}

/**
 * Kiểm tra ngày sinh ISO tồn tại, từ năm 1900 và không ở tương lai.
 * Dùng chung giữa form đặt lịch và API; trả thông báo lỗi thay vì ném exception.
 */
export function validateBookingDob(value: string) {
  if (!value) return "Vui lòng nhập ngày tháng năm sinh.";
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return "Ngày sinh chưa đúng định dạng ngày/tháng/năm.";
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const today = new Date();
  const dob = new Date(year, month - 1, day);
  if (
    year < 1900 ||
    dob.getFullYear() !== year ||
    dob.getMonth() !== month - 1 ||
    dob.getDate() !== day
  ) {
    return "Ngày sinh không hợp lệ. Vui lòng kiểm tra lại.";
  }
  if (dob > today) return "Ngày sinh không được lớn hơn ngày hiện tại.";
  return "";
}

/**
 * Kiểm tra số di động Việt Nam sau khi chuẩn hóa +84/84 và dấu phân cách.
 * Trả chuỗi rỗng khi hợp lệ, thông báo tiếng Việt khi thiếu hoặc sai đầu số/độ dài.
 */
export function validateBookingPhone(value: string) {
  if (!value.trim()) return "Vui lòng nhập số điện thoại / Zalo.";
  if (!VIETNAMESE_PHONE_PATTERN.test(normalizeVietnamesePhone(value))) {
    return "Số điện thoại Việt Nam phải có 10 số và đúng đầu số.";
  }
  return "";
}

/**
 * Kiểm tra email sau trim/lowercase, có cấu trúc cơ bản và không quá 254 ký tự.
 * Không xác minh hộp thư tồn tại hoặc gửi email; phần gửi thư thuộc booking-email.
 */
export function validateBookingEmail(value: string) {
  const email = normalizeBookingEmail(value);
  if (!email) return "Vui lòng nhập email.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Email chưa đúng định dạng. Vui lòng kiểm tra lại.";
  }
  return "";
}

/**
 * Giới hạn ghi chú/trăn trở của khách ở 2.000 ký tự.
 * Không bắt buộc có nội dung; trả thông báo lỗi hoặc chuỗi rỗng để ghép với các validator khác.
 */
export function validateBookingConcern(value: string) {
  return value.length > 2000
    ? "Nội dung trăn trở không được vượt quá 2.000 ký tự."
    : "";
}

/**
 * Cổng kiểm tra payload đặt lịch phía server, dùng lại các validator của frontend.
 * Chuẩn hóa danh tính, kiểm tra loại tư vấn/gói/phương thức thanh toán và khoảng giờ tối đa 4 tiếng.
 * Trả discriminated union {ok:true,value} hoặc {ok:false,message}; không tự tính giá.
 * Tính khả dụng, số tiền chính thức và trạng thái giữ chỗ vẫn do RPC trong DB quyết định.
 */
export function validateBookingReservationPayload(
  payload: BookingPayload,
): ValidationResult {
  const customerName = normalizeBookingName(text(payload.customer_name));
  const dateOfBirth = text(payload.date_of_birth);
  const phone = normalizeVietnamesePhone(text(payload.phone));
  const email = normalizeBookingEmail(text(payload.email));
  const concern = text(payload.concern);
  const packageCode = text(payload.package_code);
  const consultationType = text(payload.consultation_type);
  const paymentProvider = text(payload.payment_provider);
  const slotStart = text(payload.slot_start);
  const slotEnd = text(payload.slot_end);

  const fieldError =
    validateBookingName(customerName) ||
    validateBookingDob(dateOfBirth) ||
    validateBookingPhone(phone) ||
    validateBookingEmail(email) ||
    validateBookingConcern(concern);
  if (fieldError) return { ok: false, message: fieldError };
  if (consultationType !== "online" && consultationType !== "offline") {
    return { ok: false, message: "Hình thức tư vấn không hợp lệ." };
  }
  if (!packageCode || packageCode.length > 80) {
    return { ok: false, message: "Gói tư vấn không hợp lệ." };
  }
  if (paymentProvider !== "sepay" && paymentProvider !== "manual_qr") {
    return { ok: false, message: "Phương thức thanh toán không hợp lệ." };
  }
  const start = Date.parse(slotStart);
  const end = Date.parse(slotEnd);
  if (
    !Number.isFinite(start) ||
    !Number.isFinite(end) ||
    end <= start ||
    end - start > 4 * 60 * 60 * 1000
  ) {
    return { ok: false, message: "Khung giờ tư vấn không hợp lệ." };
  }

  return {
    ok: true,
    value: {
      customer_name: customerName,
      date_of_birth: dateOfBirth,
      phone,
      email,
      consultation_type: consultationType,
      package_code: packageCode,
      concern,
      slot_start: slotStart,
      slot_end: slotEnd,
      payment_provider: paymentProvider,
    },
  };
}
