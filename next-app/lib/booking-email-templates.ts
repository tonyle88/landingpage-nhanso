type BookingEmailDetails = {
  public_id: string;
  customer_name: string;
  email: string;
  phone: string;
  date_of_birth: string | null;
  concern: string | null;
  consultation_type: string;
  package_code: string;
  package_name: string;
  payment_order_id: string | null;
  amount: number;
  currency: string;
  slot_start: string;
  slot_end: string;
};

export type BookingEmail = {
  subject: string;
  html: string;
  text: string;
};

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function consultationLabel(value: string) {
  const normalized = value.trim().toLowerCase();
  if (normalized === "online") return "Online - Google Meet";
  if (normalized === "offline") return "Offline - Gặp trực tiếp";
  return value;
}

function formatMoney(amount: number, currency: string) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: currency || "VND",
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatSlot(startValue: string, endValue: string) {
  const start = new Date(startValue);
  const end = new Date(endValue);
  const date = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(start);
  const time = new Intl.DateTimeFormat("vi-VN", {
    timeZone: "Asia/Ho_Chi_Minh",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
  return `${date.charAt(0).toUpperCase()}${date.slice(1)} | ${time.format(start)} – ${time.format(end)}`;
}

function detailRow(label: string, value: string, accent = false) {
  return `
    <tr>
      <td style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);font-size:12px;letter-spacing:.8px;text-transform:uppercase;color:rgba(255,255,255,.52);">${escapeHtml(label)}</td>
      <td align="right" style="padding:14px 18px;border-bottom:1px solid rgba(255,255,255,.08);font-size:15px;font-weight:700;color:${accent ? "#f0c96a" : "#ffffff"};">${escapeHtml(value)}</td>
    </tr>`;
}

function emailShell({
  eyebrow,
  title,
  intro,
  content,
  footer,
}: {
  eyebrow: string;
  title: string;
  intro: string;
  content: string;
  footer: string;
}) {
  return `<!doctype html>
<html lang="vi">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#091c20;font-family:Arial,'Helvetica Neue',sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#091c20;padding:32px 14px;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="width:100%;max-width:560px;background:#0d2b30;border:1px solid rgba(232,168,120,.28);border-radius:20px;overflow:hidden;">
        <tr><td align="center" style="padding:32px 34px;background:#12363d;border-bottom:1px solid rgba(232,168,120,.2);">
          <div style="font-size:11px;letter-spacing:3px;text-transform:uppercase;color:#f0c96a;">${escapeHtml(eyebrow)}</div>
          <h1 style="margin:10px 0 0;font-family:Georgia,'Times New Roman',serif;font-size:28px;line-height:1.25;color:#ffffff;">${escapeHtml(title)}</h1>
          <div style="margin-top:10px;font-size:13px;color:rgba(255,255,255,.62);">Một đối tác của Clow Cat Patronus</div>
        </td></tr>
        <tr><td style="padding:28px 34px 14px;font-size:15px;line-height:1.7;color:rgba(255,255,255,.86);">${intro}</td></tr>
        <tr><td style="padding:8px 34px 26px;">${content}</td></tr>
        <tr><td align="center" style="padding:26px 34px;border-top:1px solid rgba(232,168,120,.2);">
          <div style="font-size:15px;font-style:italic;color:rgba(255,255,255,.88);">${footer}</div>
          <div style="margin-top:15px;color:#f0c96a;font-size:15px;font-weight:700;">Tony Le – Numerology</div>
          <div style="margin-top:16px;">
            <a href="https://www.facebook.com/clowcatpatronus" style="display:inline-block;margin:0 4px;padding:8px 14px;border-radius:8px;background:#1877f2;color:#fff;font-size:12px;text-decoration:none;">Facebook</a>
            <a href="https://www.instagram.com/clow_cat_patronus/" style="display:inline-block;margin:0 4px;padding:8px 14px;border-radius:8px;background:#bc1888;color:#fff;font-size:12px;text-decoration:none;">Instagram</a>
          </div>
        </td></tr>
        <tr><td align="center" style="padding:14px 28px;background:rgba(0,0,0,.24);font-size:11px;color:rgba(255,255,255,.38);">© 2026 Clow Cat Patronus · Nhân Số Học</td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function buildCustomerBookingEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  const type = consultationLabel(booking.consultation_type);
  const amount = formatMoney(booking.amount, booking.currency);
  const transferContent = booking.payment_order_id || booking.public_id;
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
      ${detailRow("Lịch hẹn", slot)}
      ${detailRow("Gói tư vấn", booking.package_name)}
      ${detailRow("Hình thức", type)}
      ${detailRow("Số tiền đã thanh toán", amount, true)}
      ${detailRow("Nội dung chuyển khoản", transferContent)}
      ${detailRow("Mã đặt lịch", booking.public_id)}
    </table>
    <div style="padding:18px 4px 0;font-size:13px;line-height:1.7;color:rgba(255,255,255,.66);">
      <strong style="color:#ffffff;">SĐT/Zalo liên hệ:</strong> ${escapeHtml(booking.phone)}
    </div>`;
  const text = [
    `Chào ${booking.customer_name},`,
    "Bạn đã đặt lịch và thanh toán thành công.",
    `Lịch hẹn: ${slot}`,
    `Gói: ${booking.package_name}`,
    `Hình thức: ${type}`,
    `Số tiền: ${amount}`,
    `Nội dung chuyển khoản: ${transferContent}`,
    `Mã đặt lịch: ${booking.public_id}`,
    "",
    "Hẹn gặp bạn tại buổi tư vấn!",
    "Tony Le – Numerology",
    "Một đối tác của Clow Cat Patronus",
  ].join("\n");
  return {
    subject:
      "[Thành Công] Xác nhận đặt lịch tư vấn Nhân Số Học – Clow Cat Patronus",
    html: emailShell({
      eyebrow: "Nhân Số Học",
      title: "🎉 Đặt Lịch Thành Công!",
      intro: `Chúc mừng <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong>! Bạn đã đăng ký và thanh toán thành công một buổi tư vấn Nhân Số Học.`,
      content,
      footer: "Hẹn gặp lại bạn tại Buổi Tư Vấn 🌙",
    }),
    text,
  };
}

export function buildOwnerBookingEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  const type = consultationLabel(booking.consultation_type);
  const amount = formatMoney(booking.amount, booking.currency);
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
      ${detailRow("Khách hàng", booking.customer_name, true)}
      ${detailRow("Lịch hẹn", slot)}
      ${detailRow("Gói tư vấn", booking.package_name)}
      ${detailRow("Hình thức", type)}
      ${detailRow("Số tiền", amount, true)}
      ${detailRow("Mã đặt lịch", booking.public_id)}
      ${detailRow("Nội dung CK", booking.payment_order_id || booking.public_id)}
      ${detailRow("Điện thoại / Zalo", booking.phone)}
      ${detailRow("Email", booking.email)}
      ${detailRow("Ngày sinh", booking.date_of_birth || "Không cung cấp")}
    </table>
    ${
      booking.concern
        ? `<div style="margin-top:16px;padding:16px 18px;border-radius:12px;background:rgba(240,201,106,.08);border:1px solid rgba(240,201,106,.2);">
             <div style="font-size:11px;letter-spacing:1px;text-transform:uppercase;color:#f0c96a;">Lời nhắn của khách</div>
             <div style="margin-top:8px;font-size:14px;line-height:1.65;color:rgba(255,255,255,.84);">${escapeHtml(booking.concern)}</div>
           </div>`
        : ""
    }`;
  const text = [
    "Có khách đặt lịch mới!",
    `Tên: ${booking.customer_name}`,
    `SĐT/Zalo: ${booking.phone}`,
    `Email: ${booking.email}`,
    `Ngày sinh: ${booking.date_of_birth || "Không cung cấp"}`,
    `Lịch: ${slot}`,
    `Gói: ${booking.package_name} (${booking.package_code})`,
    `Hình thức: ${type}`,
    `Số tiền: ${amount}`,
    `Nội dung chuyển khoản: ${booking.payment_order_id || booking.public_id}`,
    `Mã đặt lịch: ${booking.public_id}`,
    `Lời nhắn: ${booking.concern || "Không có"}`,
  ].join("\n");
  return {
    subject: `[Đặt lịch mới] ${booking.customer_name} – ${booking.package_name}`,
    html: emailShell({
      eyebrow: "Thông Báo Đặt Lịch",
      title: "Có Khách Đặt Lịch Mới!",
      intro: `Lịch tư vấn của <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong> đã được xác nhận. Thông tin lịch hẹn ở bên dưới.`,
      content,
      footer: "Thông báo tự động từ hệ thống đặt lịch",
    }),
    text,
  };
}

export function buildCustomerBookingRescheduledEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  const content = `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
      ${detailRow("Lịch hẹn mới", slot, true)}
      ${detailRow("Gói tư vấn", booking.package_name)}
      ${detailRow("Hình thức", consultationLabel(booking.consultation_type))}
      ${detailRow("Mã đặt lịch", booking.public_id)}
    </table>`;
  return {
    subject: "[Cập nhật] Lịch tư vấn Nhân Số Học đã được thay đổi",
    html: emailShell({
      eyebrow: "Cập Nhật Lịch Hẹn",
      title: "Lịch Tư Vấn Đã Được Đổi",
      intro: `Chào <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong>, lịch tư vấn của bạn đã được cập nhật theo yêu cầu.`,
      content,
      footer: "Hẹn gặp bạn theo lịch mới 🌙",
    }),
    text: [
      `Chào ${booking.customer_name},`,
      "Lịch tư vấn của bạn đã được cập nhật.",
      `Lịch mới: ${slot}`,
      `Gói: ${booking.package_name}`,
      `Mã đặt lịch: ${booking.public_id}`,
    ].join("\n"),
  };
}

export function buildOwnerBookingRescheduledEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  return {
    subject: `[Đổi lịch] ${booking.customer_name} – ${booking.package_name}`,
    html: emailShell({
      eyebrow: "Quản Lý Lịch Hẹn",
      title: "Lịch Tư Vấn Đã Được Đổi",
      intro: `Lịch của <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong> đã được cập nhật.`,
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
        ${detailRow("Lịch mới", slot, true)}
        ${detailRow("Điện thoại / Zalo", booking.phone)}
        ${detailRow("Mã đặt lịch", booking.public_id)}
      </table>`,
      footer: "Thông báo tự động từ hệ thống đặt lịch",
    }),
    text: [
      "Một lịch tư vấn đã được đổi.",
      `Khách: ${booking.customer_name}`,
      `Lịch mới: ${slot}`,
      `SĐT/Zalo: ${booking.phone}`,
      `Mã đặt lịch: ${booking.public_id}`,
    ].join("\n"),
  };
}

export function buildCustomerBookingCancelledEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  return {
    subject: "[Đã hủy] Lịch tư vấn Nhân Số Học",
    html: emailShell({
      eyebrow: "Thông Báo Hủy Lịch",
      title: "Lịch Tư Vấn Đã Được Hủy",
      intro: `Chào <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong>, lịch tư vấn dưới đây đã được hủy theo yêu cầu.`,
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
        ${detailRow("Lịch đã hủy", slot)}
        ${detailRow("Gói tư vấn", booking.package_name)}
        ${detailRow("Mã đặt lịch", booking.public_id)}
      </table>`,
      footer: "Cảm ơn bạn đã thông báo sớm",
    }),
    text: [
      `Chào ${booking.customer_name},`,
      "Lịch tư vấn của bạn đã được hủy theo yêu cầu.",
      `Lịch đã hủy: ${slot}`,
      `Mã đặt lịch: ${booking.public_id}`,
    ].join("\n"),
  };
}

export function buildOwnerBookingCancelledEmail(
  booking: BookingEmailDetails,
): BookingEmail {
  const slot = formatSlot(booking.slot_start, booking.slot_end);
  return {
    subject: `[Hủy lịch] ${booking.customer_name} – ${booking.package_name}`,
    html: emailShell({
      eyebrow: "Quản Lý Lịch Hẹn",
      title: "Một Lịch Tư Vấn Đã Được Hủy",
      intro: `Lịch của <strong style="color:#f0c96a;">${escapeHtml(booking.customer_name)}</strong> đã được hủy và khung giờ được giải phóng.`,
      content: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:rgba(255,255,255,.05);border:1px solid rgba(255,255,255,.1);border-radius:14px;overflow:hidden;">
        ${detailRow("Lịch đã hủy", slot)}
        ${detailRow("Điện thoại / Zalo", booking.phone)}
        ${detailRow("Mã đặt lịch", booking.public_id)}
      </table>`,
      footer: "Thông báo tự động từ hệ thống đặt lịch",
    }),
    text: [
      "Một lịch tư vấn đã được hủy.",
      `Khách: ${booking.customer_name}`,
      `Lịch đã hủy: ${slot}`,
      `SĐT/Zalo: ${booking.phone}`,
      `Mã đặt lịch: ${booking.public_id}`,
    ].join("\n"),
  };
}

export type { BookingEmailDetails };
