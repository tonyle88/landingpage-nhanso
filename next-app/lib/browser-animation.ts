/**
 * Gộp nhiều sự kiện scroll/resize thành tối đa một callback trong một khung hình.
 * Dùng chung cho navbar, thanh tiến độ và carousel gói tư vấn.
 * Trả schedule để gắn listener và cancel để dọn requestAnimationFrame khi component tháo khỏi DOM.
 * Callback tự đọc trạng thái mới nhất của DOM; helper không lưu từng event trung gian.
 */
export function createFrameScheduler(callback: () => void) {
  let frame: number | null = null;
  return {
    schedule() {
      if (frame !== null) return;
      frame = window.requestAnimationFrame(() => {
        frame = null;
        callback();
      });
    },
    cancel() {
      if (frame !== null) window.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}

/**
 * Điều khiển vòng vẽ particles cho trang chính và blog, giới hạn số lần vẽ khoảng 30 FPS.
 * Tạm dừng khi tab bị ẩn hoặc người dùng chọn reduced motion; tự tiếp tục khi điều kiện thay đổi.
 * Callback nhận timestamp và elapsedMs; reset elapsed khi tiếp tục để tránh hạt nhảy xa.
 * Trả hàm cleanup hủy frame và gỡ listener visibility/motion; caller phải gọi khi unmount.
 */
export function startVisibleAnimation(
  draw: (timestamp: number, elapsedMs: number) => void,
) {
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const frameInterval = 1000 / 30;
  let frame: number | null = null;
  let lastDraw: number | null = null;
  let disposed = false;

  const stop = () => {
    if (frame !== null) window.cancelAnimationFrame(frame);
    frame = null;
    lastDraw = null;
  };
  const animate = (timestamp: number) => {
    frame = null;
    if (disposed || document.hidden || motion.matches) return;
    if (lastDraw === null || timestamp - lastDraw >= frameInterval) {
      const elapsedMs = lastDraw === null ? frameInterval : timestamp - lastDraw;
      lastDraw = timestamp;
      draw(timestamp, elapsedMs);
    }
    frame = window.requestAnimationFrame(animate);
  };
  const sync = () => {
    if (disposed || document.hidden || motion.matches) {
      stop();
    } else if (frame === null) {
      frame = window.requestAnimationFrame(animate);
    }
  };

  document.addEventListener("visibilitychange", sync);
  motion.addEventListener("change", sync);
  sync();

  return () => {
    disposed = true;
    stop();
    document.removeEventListener("visibilitychange", sync);
    motion.removeEventListener("change", sync);
  };
}
