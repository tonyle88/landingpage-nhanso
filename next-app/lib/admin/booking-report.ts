import type { Database } from "@/lib/supabase/database.types";

export type BookingStatus = Database["public"]["Enums"]["booking_status"];

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending: "Chờ giữ chỗ",
  held: "Đang giữ chỗ",
  paid: "Đã xác nhận tiền",
  confirmed: "Đã xác nhận lịch",
  cancelled: "Đã hủy",
  expired: "Đã hết hạn",
};

export const bookingReportSelect =
  "id,public_id,customer_name,phone,email,consultation_type,package_name,amount,currency,slot_start,slot_end,concern,payment_provider,payment_order_id,status,hold_expires_at,manual_payment_claimed_at,confirmed_at,created_at";

export function parseBookingStatus(value: string | null | undefined) {
  return value && Object.hasOwn(bookingStatusLabels, value)
    ? (value as BookingStatus)
    : null;
}

export function formatBookingDateTime(value: string | null) {
  if (!value) return "—";
  return bookingDateTimeFormatter.format(new Date(value));
}

const bookingDateTimeFormatter = new Intl.DateTimeFormat("vi-VN", {
  timeZone: "Asia/Ho_Chi_Minh",
  dateStyle: "short",
  timeStyle: "short",
});
const moneyFormatters = new Map<string, Intl.NumberFormat>();

export function formatBookingMoney(amount: number, currency: string) {
  let formatter = moneyFormatters.get(currency);
  if (!formatter) {
    formatter = new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    moneyFormatters.set(currency, formatter);
  }
  return formatter.format(amount);
}

export function reportFileStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}
