function ArrowIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

export default function BookingFlow() {
  return (
    <>
      <div className="booking-overlay" id="booking-overlay" />

      <div
        className="booking-modal"
        id="modal-calendar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-cal-title"
      >
        <div className="bmodal-inner">
          <button
            className="bmodal-close"
            id="close-calendar"
            aria-label="Đóng"
            type="button"
          >
            ✕
          </button>
          <div className="bmodal-header">
            <div className="bmodal-icon">
              <i className="fa-regular fa-calendar-check" aria-hidden="true" />
            </div>
            <h2 id="modal-cal-title">Chọn Ngày &amp; Giờ Tư Vấn</h2>
            <p className="bmodal-sub">
              Vui lòng chọn thời gian phù hợp với bạn. Lịch hiển thị là các
              khung giờ còn trống.
            </p>
          </div>

          <div className="cal-loading" id="cal-loading">
            <div className="cal-spinner" />
            <span>Đang tải lịch trống...</span>
          </div>

          <div className="cal-error" id="cal-error" style={{ display: "none" }}>
            <i
              className="fa-solid fa-triangle-exclamation"
              aria-hidden="true"
            />
            <p>Không thể tải lịch. Vui lòng thử lại.</p>
            <button className="btn-retry" id="retry-calendar" type="button">
              Thử lại
            </button>
          </div>

          <div id="cal-content" style={{ display: "none" }}>
            <div className="cal-date-strip" id="cal-date-strip" />
            <div className="cal-time-label">Khung giờ còn trống:</div>
            <div className="cal-time-grid" id="cal-time-grid" />
          </div>

          <div className="bmodal-footer">
            <div
              className="selected-slot-info"
              id="selected-slot-info"
              style={{ display: "none" }}
            >
              <i className="fa-regular fa-clock" aria-hidden="true" />
              <span id="selected-slot-text" />
            </div>
            <button
              className="btn btn-primary btn-full"
              id="btn-go-payment"
              type="button"
              disabled
            >
              <span>Tiến Hành Thanh Toán</span>
              <ArrowIcon />
            </button>
          </div>
        </div>
      </div>

      <div
        className="booking-modal"
        id="modal-payment"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-pay-title"
      >
        <div className="bmodal-inner">
          <button
            className="bmodal-close"
            id="close-payment"
            aria-label="Đóng"
            type="button"
          >
            ✕
          </button>
          <div className="bmodal-header">
            <div className="bmodal-icon">
              <i className="fa-solid fa-qrcode" aria-hidden="true" />
            </div>
            <h2 id="modal-pay-title">Thanh Toán Chuyển Khoản</h2>
            <p className="bmodal-sub">
              Quét mã QR bên dưới để hoàn tất thanh toán. Vui lòng giữ nguyên
              nội dung chuyển khoản.
            </p>
          </div>

          <div className="payment-layout">
            <div className="qr-wrap">
              <img
                id="qr-img"
                src=""
                alt="Mã QR chuyển khoản VietQR"
                className="qr-img"
              />
              <div className="qr-badge">
                <i
                  className="fa-solid fa-shield-halved"
                  aria-hidden="true"
                />{" "}
                Bảo mật 100%
              </div>
            </div>

            <div className="bank-details">
              <div className="bank-info-row">
                <span className="bank-info-label">Ngân hàng</span>
                <span className="bank-info-val" id="bank-name">
                  Vietcombank
                </span>
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Số TK</span>
                <span
                  className="bank-info-val copyable"
                  id="bank-account"
                  data-copy="0421003904479"
                >
                  0421003904479{" "}
                  <i className="fa-regular fa-copy" aria-hidden="true" />
                </span>
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Chủ TK</span>
                <span className="bank-info-val" id="bank-account-name">
                  LÊ CHÍ CƯỜNG
                </span>
              </div>
              <div className="bank-info-row highlight-row">
                <span className="bank-info-label">Số tiền</span>
                <span className="bank-info-val gold" id="pay-amount" />
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Hình thức</span>
                <span className="bank-info-val" id="pay-type" />
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Nội dung CK</span>
                <span
                  className="bank-info-val copyable small"
                  id="pay-content"
                  data-copy=""
                />
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Lịch hẹn</span>
                <span className="bank-info-val" id="pay-slot" />
              </div>
              <div className="bank-info-row">
                <span className="bank-info-label">Gói tư vấn</span>
                <span className="bank-info-val" id="pay-package" />
              </div>
              <div className="bank-info-row" id="pay-package-detail-row" hidden>
                <span className="bank-info-label">Chi tiết</span>
                <span
                  className="bank-info-val small"
                  id="pay-package-detail"
                />
              </div>
            </div>
          </div>

          <div className="pay-note">
            <i className="fa-solid fa-circle-info" aria-hidden="true" />
            <span id="payment-note-text">
              Sau khi chuyển khoản, nhấn nút bên dưới để hoàn tất. Chúng tôi sẽ
              xác nhận và gửi email cho bạn ngay.
            </span>
          </div>

          <div className="sepay-waiting" id="sepay-waiting" hidden>
            <div>
              <span className="sepay-status-label">Đang chờ thanh toán</span>
              <strong id="sepay-countdown">15:00</strong>
            </div>
            <p id="sepay-status-text">
              Hệ thống sẽ tự chuyển sang trang cảm ơn khi thanh toán được xác
              nhận.
            </p>
          </div>

          <button
            className="btn btn-primary btn-full"
            id="btn-confirm-payment"
            type="button"
          >
            <span>✓ Tôi Đã Chuyển Khoản Thành Công</span>
          </button>
          <button
            className="btn-back-text"
            id="btn-back-calendar"
            type="button"
          >
            ← Quay lại chọn lịch
          </button>
        </div>
      </div>

      <div
        className="booking-modal"
        id="modal-success"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-suc-title"
      >
        <div className="bmodal-inner success-inner">
          <div className="success-anim">
            <div className="success-circle">
              <i className="fa-solid fa-check" aria-hidden="true" />
            </div>
            <div className="success-stars">
              <span>✦</span><span>★</span><span>✦</span>
            </div>
          </div>
          <h2 id="modal-suc-title">Đặt Lịch Thành Công! 🎉</h2>
          <p className="success-greeting" id="success-greeting" />
          <div className="success-summary" id="success-summary" />
          <div className="success-email-note">
            <i className="fa-regular fa-envelope" aria-hidden="true" />
            Email xác nhận đã được gửi đến hộp thư của bạn. Vui lòng kiểm tra cả
            mục Spam nếu không thấy trong hộp thư đến.
          </div>
          <div className="success-action-buttons">
            <p>
              Bạn vui lòng nhắn tin cho Clow Cat Patronus để báo đã chuyển khoản
              thành công nhé:
            </p>
            <a
              href="https://m.me/clowcatpatronus"
              target="_blank"
              rel="noopener noreferrer"
              className="btn success-fanpage-btn"
              id="btn-message-fanpage"
              data-message="Khách hàng đã chuyển khoản thanh toán, vui lòng kiểm tra."
            >
              <i
                className="fab fa-facebook-messenger"
                aria-hidden="true"
              />
              <span>Nhắn tin Fanpage</span>
            </a>
            <button
              className="btn success-home-btn"
              id="btn-success-close"
              type="button"
            >
              <span>Về trang chính</span>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
