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
  return new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

export function formatBookingMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function reportFileStamp(date = new Date()) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

export function escapeXml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}
