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

export function normalizeBookingName(value: string) {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeBookingEmail(value: string) {
  return value.trim().toLowerCase();
}

export function normalizeVietnamesePhone(value: string) {
  let phone = value.trim().replace(/[\s().-]/g, "");
  if (phone.startsWith("+84")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("84")) phone = `0${phone.slice(2)}`;
  return phone;
}

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

export function validateBookingPhone(value: string) {
  if (!value.trim()) return "Vui lòng nhập số điện thoại / Zalo.";
  if (!VIETNAMESE_PHONE_PATTERN.test(normalizeVietnamesePhone(value))) {
    return "Số điện thoại Việt Nam phải có 10 số và đúng đầu số.";
  }
  return "";
}

export function validateBookingEmail(value: string) {
  const email = normalizeBookingEmail(value);
  if (!email) return "Vui lòng nhập email.";
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) {
    return "Email chưa đúng định dạng. Vui lòng kiểm tra lại.";
  }
  return "";
}

export function validateBookingConcern(value: string) {
  return value.length > 2000
    ? "Nội dung trăn trở không được vượt quá 2.000 ký tự."
    : "";
}

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
