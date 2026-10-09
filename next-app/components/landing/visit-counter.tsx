"use client";

import { useEffect, useState } from "react";

const SESSION_KEY = "clow.landing-visit.v1";
const SESSION_DURATION_MS = 30 * 60 * 1000;
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const numberFormat = new Intl.NumberFormat("vi-VN");

/**
 * Giữ mã phiên ngẫu nhiên trong 30 phút để reload/mở thêm tab không tăng lượt liên tục.
 * Không chứa tên, email hay thông tin thiết bị. Cookie là dự phòng khi localStorage bị chặn.
 * Nếu cả hai cơ chế lưu bị chặn, mã chỉ tồn tại trong lần mở trang hiện tại.
 */
function getVisitSessionId() {
  const now = Date.now();
  try {
    const stored = JSON.parse(localStorage.getItem(SESSION_KEY) || "null");
    if (stored && UUID_PATTERN.test(stored.id) && stored.expiresAt > now) {
      return stored.id as string;
    }
  } catch {
    // Private browsing/storage policies may reject access; try the session cookie.
  }
  const cookie = document.cookie.split("; ").find((part) => part.startsWith("clow_visit="));
  const cookieId = cookie?.slice("clow_visit=".length);
  if (cookieId && UUID_PATTERN.test(cookieId)) return cookieId;

  const id = crypto.randomUUID();
  try {
    localStorage.setItem(SESSION_KEY, JSON.stringify({ id, expiresAt: now + SESSION_DURATION_MS }));
  } catch {
    // The counter still works with the cookie if persistent storage is unavailable.
  }
  document.cookie = `clow_visit=${id}; Max-Age=1800; Path=/; SameSite=Lax${location.protocol === "https:" ? "; Secure" : ""}`;
  return id;
}

/**
 * Hiển thị tổng phiên truy cập trang chủ được server ghi nhận từ lúc kích hoạt bộ đếm.
 * Chỉ gửi một yêu cầu khi trang được nhìn thấy; không polling hoặc xử lý sự kiện cuộn.
 * Số tổng lấy từ DB, không lấy localStorage làm bộ đếm. Lỗi API hiển thị — thay vì số giả.
 */
export default function VisitCounter() {
  const [total, setTotal] = useState<string | null>(null);
  const [unavailable, setUnavailable] = useState(false);

  useEffect(() => {
    const controller = new AbortController();
    let started = false;
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;

    const recordVisit = async () => {
      if (started || document.visibilityState !== "visible") return;
      started = true;
      timeout = setTimeout(() => controller.abort(), 8_000);
      try {
        const response = await fetch("/api/visits", {
          method: "POST",
          headers: { "X-Visit-ID": getVisitSessionId() },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Visit counter unavailable");
        const result: unknown = await response.json();
        if (!result || typeof result !== "object" || !("total" in result)
          || typeof result.total !== "string" || !/^\d{1,19}$/.test(result.total)) {
          throw new Error("Invalid visit count");
        }
        if (!controller.signal.aborted) setTotal(result.total);
      } catch {
        if (timeout) clearTimeout(timeout);
        // An aborted request during unmount must not update the old component.
        if (!disposed) setUnavailable(true);
      } finally {
        if (timeout) clearTimeout(timeout);
      }
    };

    // The listener handles a page first opened in a background tab.
    void recordVisit();
    document.addEventListener("visibilitychange", recordVisit);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", recordVisit);
      if (timeout) clearTimeout(timeout);
      controller.abort();
    };
  }, []);

  return (
    <aside
      id="landing-visit-counter"
      className="landing-visit-counter"
      aria-label="Lượt truy cập trang chủ"
      title="Tổng lượt từ khi kích hoạt bộ đếm. Mỗi phiên trình duyệt được tính một lượt trong 30 phút."
    >
      <svg className="landing-visit-counter-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="landing-visit-counter-content" role="status" aria-live="polite" aria-atomic="true">
        <span className="landing-visit-counter-label">Lượt truy cập</span>
        <strong className="landing-visit-counter-value">
          {total === null ? "—" : numberFormat.format(BigInt(total))}
        </strong>
        <span className="landing-visit-counter-sr-only">
          {total === null ? (unavailable ? "Tạm chưa có dữ liệu" : "Đang tải số lượt") : "lượt"}
        </span>
      </div>
    </aside>
  );
}
