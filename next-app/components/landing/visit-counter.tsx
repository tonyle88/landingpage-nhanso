"use client";

import { useEffect, useRef, useState } from "react";

const numberFormat = new Intl.NumberFormat("vi-VN");
const countUnits = [
  { divisor: 1_000n, label: "nghìn" },
  { divisor: 1_000_000n, label: "triệu" },
  { divisor: 1_000_000_000n, label: "tỷ" },
  { divisor: 1_000_000_000_000n, label: "nghìn tỷ" },
  { divisor: 1_000_000_000_000_000n, label: "triệu tỷ" },
  { divisor: 1_000_000_000_000_000_000n, label: "tỷ tỷ" },
];

/** Dùng chung cho tổng/online: dưới 10.000 giữ số đầy đủ; số lớn rút gọn một chữ số
 * thập phân để vừa khung mobile. Tính bằng bigint để không mất độ chính xác của DB.
 * Nâng đơn vị khi làm tròn tới 1.000; số chính xác luôn có trong title/aria-label.
 */
function formatCount(value: string) {
  const count = BigInt(value);
  if (count < 10_000n) return numberFormat.format(count);
  let unitIndex = 0;
  while (unitIndex + 1 < countUnits.length && count >= countUnits[unitIndex + 1].divisor) unitIndex++;
  let unit = countUnits[unitIndex];
  let tenths = (count * 10n + unit.divisor / 2n) / unit.divisor;
  if (tenths >= 10_000n && unitIndex + 1 < countUnits.length) {
    unit = countUnits[++unitIndex];
    tenths = (count * 10n + unit.divisor / 2n) / unit.divisor;
  }
  const fraction = tenths % 10n;
  return `${tenths / 10n}${fraction ? `,${fraction}` : ""}\u00a0${unit.label}`;
}
const VISITOR_KEY = "clow.site-visitor.v1";
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const HEARTBEAT_MS = 30_000;
const NOTICE_DURATION_MS = 8_000;

/** Mã ngẫu nhiên dùng chung giữa các tab để một trình duyệt online chỉ được tính một lần.
 * Đổi mã sau 24 giờ; không chứa tên/IP. Nếu storage bị chặn, dùng mã trong bộ nhớ của tab.
 */
function getVisitorId() {
  try {
    const stored = JSON.parse(localStorage.getItem(VISITOR_KEY) || "null");
    if (stored && UUID_PATTERN.test(stored.id) && stored.expiresAt > Date.now()) return stored.id as string;
  } catch { /* Storage bị chặn: vẫn đếm online cho tab bằng mã trong bộ nhớ. */ }
  const id = crypto.randomUUID();
  try {
    localStorage.setItem(VISITOR_KEY, JSON.stringify({ id, expiresAt: Date.now() + 86_400_000 }));
  } catch { /* Không yêu cầu quyền storage để xem nội dung website. */ }
  return id;
}

/** Chỉ nhận pathname và ID bài blog; cuộn/hash/tham số quảng cáo không tạo lượt mới.
 * Khóa ở trong bộ nhớ, không gửi URL/bài viết đến API và không lưu cookie.
 */
function currentPageKey() {
  return JSON.stringify([location.pathname, new URLSearchParams(location.search).get("id") || ""]);
}

type Counts = { total: string; online: string };
/** Kiểm tra chuỗi bigint trước khi format, tránh mất chính xác hoặc hiển thị số giả. */
function parseCounts(value: unknown): Counts {
  if (!value || typeof value !== "object" || !("total" in value) || !("online" in value)
    || typeof value.total !== "string" || typeof value.online !== "string"
    || !/^\d{1,19}$/.test(value.total) || !/^\d{1,19}$/.test(value.online)) {
    throw new Error("Invalid visit counts");
  }
  return { total: value.total, online: value.online };
}

/**
 * Dùng chung cho trang chủ, danh sách blog và bài viết; cùng một tổng lịch sử trong DB.
 * Mở/tải lại/chuyển bài tạo UUID lượt xem mới. React chạy lại effect giữ UUID hiện tại
 * để RPC chống ghi trùng, không gộp các lần tải thành phiên 30 phút.
 * Heartbeat 30 giây khi tab hiển thị cập nhật online/tổng, không tăng lượt xem.
 * Tab ẩn dừng timer; server loại tín hiệu cũ sau 2 phút. Không xử lý sự kiện cuộn.
 */
export default function VisitCounter() {
  const [counts, setCounts] = useState<Counts | null>(null);
  const [unavailable, setUnavailable] = useState(false);
  const [noticeKey, setNoticeKey] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const pageView = useRef<{ key: string; id: string; recorded: boolean } | null>(null);
  const visitorId = useRef<string | null>(null);

  // Chỉ hiện 8 giây sau dữ liệu đầu tiên của mỗi lượt xem. Heartbeat giữ nguyên khóa,
  // không bật lại khung; timeout được dọn khi đổi bài hoặc unmount, không theo dõi cuộn.
  useEffect(() => {
    if (!noticeKey) return;
    setIsVisible(true);
    const hideTimer = setTimeout(() => setIsVisible(false), NOTICE_DURATION_MS);
    return () => clearTimeout(hideTimer);
  }, [noticeKey]);

  useEffect(() => {
    let activeController: AbortController | undefined;
    let startedKey: string | undefined;
    let disposed = false;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    let heartbeat: ReturnType<typeof setInterval> | undefined;

    const recordVisit = async (refresh = false) => {
      if (document.visibilityState !== "visible") return;
      const key = currentPageKey();
      const newView = startedKey !== key;
      if (!newView && !refresh) return;
      startedKey = key;
      if (pageView.current?.key !== key) pageView.current = { key, id: crypto.randomUUID(), recorded: false };
      visitorId.current ||= getVisitorId();
      activeController?.abort();
      if (timeout) clearTimeout(timeout);
      const controller = new AbortController();
      activeController = controller;
      setUnavailable(false);
      timeout = setTimeout(() => controller.abort(), 8_000);
      const requestTimeout = timeout;
      try {
        const response = await fetch("/api/visits", {
          method: "POST",
          headers: {
            "X-Visit-ID": pageView.current.id,
            "X-Visitor-ID": visitorId.current,
            // Chưa nhận phản hồi thành công thì thử lại cùng UUID; RPC không tăng trùng.
            "X-Visit-Mode": pageView.current.recorded ? "heartbeat" : "view",
          },
          credentials: "same-origin",
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) throw new Error("Visit counter unavailable");
        const result = parseCounts(await response.json());
        if (!disposed && activeController === controller && !controller.signal.aborted) {
          pageView.current.recorded = true;
          setCounts(result);
          setNoticeKey(pageView.current.id);
        }
      } catch {
        // Phản hồi trang cũ không ghi đè trạng thái của trang vừa chuyển tới.
        if (!disposed && activeController === controller) {
          setCounts(null);
          setUnavailable(true);
        }
      } finally {
        clearTimeout(requestTimeout);
      }
    };

    // Quay lại tab gửi heartbeat; không tính thành một lần tải mới.
    const onVisibility = () => {
      if (heartbeat) clearInterval(heartbeat);
      if (document.visibilityState !== "visible") return;
      void recordVisit(true);
      heartbeat = setInterval(() => void recordVisit(true), HEARTBEAT_MS);
    };
    const onNavigation = () => void recordVisit();
    onVisibility();
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("clow-blog-view-changed", onNavigation);
    return () => {
      disposed = true;
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("clow-blog-view-changed", onNavigation);
      if (heartbeat) clearInterval(heartbeat);
      if (timeout) clearTimeout(timeout);
      activeController?.abort();
    };
  }, []);

  return (
    <aside id="landing-visit-counter" className={`landing-visit-counter${isVisible ? " is-visible" : ""}`}
      aria-hidden={!isVisible} inert={!isVisible}
      aria-label="Tổng lượt truy cập và trình duyệt đang online"
      title="Tổng lượt xem trang chủ và blog từ khi kích hoạt. Online là số trình duyệt có tín hiệu hoạt động trong 2 phút gần nhất; nhiều tab cùng trình duyệt tính một.">
      <svg className="landing-visit-counter-icon" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7S2 12 2 12Z" stroke="currentColor" strokeWidth="1.5" />
        <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="1.5" />
      </svg>
      <div className="landing-visit-counter-content" role="status" aria-live="polite" aria-atomic="true">
        <div className="landing-visit-counter-row">
          <span className="landing-visit-counter-label">Tổng lượt xem</span>
          <strong className="landing-visit-counter-value"
            title={counts ? numberFormat.format(BigInt(counts.total)) : undefined}
            aria-label={counts ? `${numberFormat.format(BigInt(counts.total))} lượt xem` : undefined}
            tabIndex={counts ? 0 : undefined}>{counts ? formatCount(counts.total) : "—"}</strong>
        </div>
        <div className="landing-visit-counter-row">
          <span className="landing-visit-counter-label">Đang online</span>
          <strong className="landing-visit-counter-value landing-visit-counter-online"
            title={counts ? numberFormat.format(BigInt(counts.online)) : undefined}
            aria-label={counts ? `${numberFormat.format(BigInt(counts.online))} trình duyệt đang online` : undefined}
            tabIndex={counts ? 0 : undefined}>{counts ? formatCount(counts.online) : "—"}</strong>
        </div>
        <span className="landing-visit-counter-sr-only">
          {counts ? "lượt xem và trình duyệt đang hoạt động" : unavailable ? "Tạm chưa có dữ liệu" : "Đang tải số lượt"}
        </span>
      </div>
    </aside>
  );
}
