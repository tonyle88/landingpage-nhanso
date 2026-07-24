export function LandingPreamble() {
  return (
    <>
      <div
        className="landing-loader"
        aria-live="polite"
        aria-label="Đang tải trang"
      >
        <div className="landing-loader-card">
          <div className="landing-loader-spinner" />
          <div className="landing-loader-title">Đang tải nội dung...</div>
          <div className="landing-loader-subtitle">Clow Cat Patronus</div>
        </div>
      </div>
      <canvas id="particles-canvas" />
    </>
  );
}

export function LandingNavbar() {
  const navItems = [
    ["#about", "Về Chúng Tôi"],
    ["#benefits", "Những Gì Bạn Nhận Được"],
    ["#testimonials", "Khách Hàng Nghĩ Gì?"],
    ["#packages", "Gói Tư Vấn"],
    ["#process", "Hành Trình"],
    ["/blog", "Giải mã nhân số học"],
  ];

  return (
    <nav id="navbar" className="navbar" aria-label="Điều hướng chính">
      <div className="nav-container">
        <a href="#hero" className="nav-logo">
          <img
            src="/assets/images/logo.png"
            alt="Clow Cat Patronus Logo"
            className="logo-img"
            width="568"
            height="567"
            decoding="async"
            fetchPriority="high"
          />
          <span className="logo-text">Clow Cat Patronus</span>
        </a>
        <ul className="nav-links" id="nav-links">
          {navItems.map(([href, label]) => (
            <li key={href}>
              <a href={href} className="nav-link">
                {label}
              </a>
            </li>
          ))}
          <li>
            <a href="#contact" className="nav-link nav-cta">
              Đặt Lịch Ngay
            </a>
          </li>
        </ul>
        <button className="hamburger" id="hamburger" aria-label="Mở menu">
          <span />
          <span />
          <span />
        </button>
      </div>
      <div className="scroll-progress-container">
        <div className="scroll-progress-bar" id="scrollProgress">
          <div className="scroll-progress-title" id="scrollTitle">
            Khám Phá
          </div>
        </div>
      </div>
    </nav>
  );
}

export function HeroSection() {
  const rings = [
    ["1", "2", "3", "4", "5", "6", "7", "8", "9"],
    ["9", "8", "7", "6", "5", "4", "3", "2", "1"],
    ["3", "7", "1", "9", "4", "2", "8", "5", "6"],
    ["2", "5", "8", "1", "4", "7", "3", "6", "9"],
    ["1", "1", "2", "2", "2", "4", "3", "3", "6"],
    ["6", "3", "9", "2", "8", "4", "7", "5", "1"],
  ];
  const floatingNumbers = [
    ["fn-1", "1", { top: "8%", left: "3%", fontSize: "5rem", opacity: 0.13, animationDelay: "0s" }],
    ["fn-2", "2", { top: "72%", left: "5%", fontSize: "7rem", opacity: 0.1, animationDelay: "1.5s" }],
    ["fn-3", "5", { top: "15%", right: "4%", fontSize: "5.5rem", opacity: 0.12, animationDelay: "0.8s" }],
    ["fn-4", "7", { top: "55%", right: "5%", fontSize: "6rem", opacity: 0.11, animationDelay: "2.2s" }],
    ["fn-5", "8", { top: "40%", left: "2%", fontSize: "4rem", opacity: 0.09, animationDelay: "3s" }],
    ["fn-6", "9", { bottom: "8%", right: "12%", fontSize: "4.5rem", opacity: 0.1, animationDelay: "1.2s" }],
    ["fn-teal", "1", { top: "25%", left: "8%", fontSize: "2.8rem", opacity: 0.14, animationDelay: "0.4s" }],
    ["fn-gold", "5", { top: "80%", left: "20%", fontSize: "3rem", opacity: 0.12, animationDelay: "2.8s" }],
    ["fn-teal", "7", { top: "10%", right: "18%", fontSize: "2.4rem", opacity: 0.15, animationDelay: "1.8s" }],
    ["fn-gold", "2", { top: "65%", right: "22%", fontSize: "2.6rem", opacity: 0.11, animationDelay: "0.6s" }],
    ["fn-1", "8", { bottom: "15%", left: "35%", fontSize: "2.2rem", opacity: 0.1, animationDelay: "3.5s" }],
    ["fn-3", "9", { top: "48%", right: "15%", fontSize: "2rem", opacity: 0.13, animationDelay: "2s" }],
    ["fn-master", "11/2", { top: "6%", left: "40%", fontSize: "1.8rem", opacity: 0.22, animationDelay: "1s" }],
    ["fn-master", "22/4", { bottom: "12%", right: "30%", fontSize: "1.6rem", opacity: 0.2, animationDelay: "2.5s" }],
    ["fn-master", "33/6", { top: "75%", left: "55%", fontSize: "1.7rem", opacity: 0.18, animationDelay: "0.3s" }],
    ["fn-master", "11/2", { top: "32%", right: "38%", fontSize: "1.4rem", opacity: 0.16, animationDelay: "3.8s" }],
    ["fn-master", "22/4", { bottom: "25%", left: "12%", fontSize: "1.5rem", opacity: 0.17, animationDelay: "1.7s" }],
    ["fn-master", "33/6", { top: "88%", right: "48%", fontSize: "1.4rem", opacity: 0.15, animationDelay: "4.2s" }],
  ] as const;

  return (
    <section className="hero" id="hero">
      <div className="hero-bg-image" />
      <div className="twinkling-stars" />
      <div className="hero-overlay" />

      {rings.map((numbers, index) => (
        <div className={`number-ring ring-${index + 1}`} key={index}>
          {numbers.map((number, numberIndex) => (
            <span className="ring-num" key={`${number}-${numberIndex}`}>
              {number}
            </span>
          ))}
        </div>
      ))}

      <div className="hero-floats" aria-hidden="true">
        {floatingNumbers.map(([className, number, style], index) => (
          <span
            className={`float-num ${className}`}
            style={style}
            key={`${number}-${index}`}
          >
            {number}
          </span>
        ))}
      </div>

      <div className="hero-content">
        <div className="hero-badge reveal">✦ Hơn 800 ca tư vấn thực tế ✦</div>
        <h1 className="hero-title reveal">
          <span className="title-line title-gradient-anim">NHÂN SỐ HỌC</span>
          <span className="title-line accent">KHAI PHÁ</span>
          <span className="title-line title-gradient-anim">TIỀM NĂNG</span>
        </h1>
        <p className="hero-subtitle reveal">
          Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh và hành
          trình phát triển của chính mình
        </p>
        <div className="hero-stats reveal">
          <div className="stat-item stat-anim" style={{ animationDelay: "0s" }}>
            <span className="stat-number">3+</span>
            <span className="stat-label">Năm kinh nghiệm</span>
          </div>
          <div className="stat-divider">✦</div>
          <div
            className="stat-item stat-anim"
            style={{ animationDelay: "0.2s" }}
          >
            <span className="stat-number glow-text">800+</span>
            <span className="stat-label">Ca tư vấn</span>
          </div>
          <div className="stat-divider">✦</div>
          <div
            className="stat-item stat-anim"
            style={{ animationDelay: "0.4s" }}
          >
            <span className="stat-number">100%</span>
            <span className="stat-label">Cá nhân hoá</span>
          </div>
        </div>
        <div className="hero-ctas reveal">
          <a href="#contact" className="btn btn-primary" id="hero-cta-primary">
            <span>Đặt Lịch Tư Vấn</span>
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M5 12h14M12 5l7 7-7 7" />
            </svg>
          </a>
          <a
            href="#about"
            className="btn btn-ghost"
            id="hero-cta-secondary"
          >
            Tìm Hiểu Thêm
          </a>
        </div>
      </div>

      <div className="scroll-indicator">
        <div className="scroll-line" />
        <span>Cuộn xuống</span>
      </div>
    </section>
  );
}

export function PainPointsSection() {
  const painPoints = [
    ["fa-compass", <>Mơ hồ về <strong>định hướng học tập, công việc</strong> hay tương lai?</>],
    ["fa-link-slash", <>Bế tắc trong các <strong>mối quan hệ</strong> và cảm xúc?</>],
    ["fa-gem", <>Cảm thấy bản thân có nhiều <strong>tiềm năng</strong> nhưng chưa biết cách phát huy?</>],
    ["fa-code-branch", <>Đứng giữa những <strong>lựa chọn quan trọng</strong> nhưng không biết đâu là hướng đi phù hợp?</>],
  ];

  return (
    <section className="pain-points section" id="pain-points">
      <div className="section-bg-shared bg-img-2" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Bạn Đang Gặp Phải?</span>
          <h2 className="section-title">Những Câu Hỏi Chưa Có Lời Giải</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="pain-grid">
          {painPoints.map(([icon, content], index) => (
            <div
              className="pain-card reveal"
              data-delay={index * 100}
              key={icon as string}
            >
              <div className="pain-icon">
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
              </div>
              <p>{content}</p>
            </div>
          ))}
        </div>
        <div className="pain-conclusion reveal">
          <div className="conclusion-glow" />
          <p>
            <i
              className="fa-solid fa-sparkles"
              style={{
                color: "var(--color-gold-light)",
                marginRight: "8px",
              }}
              aria-hidden="true"
            />{" "}
            <strong>Nhân Số Học</strong> là tấm bản đồ giúp bạn hiểu rõ bản
            thân, tính cách, điểm mạnh, điểm yếu và hành trình phát triển của
            chính mình.
          </p>
        </div>
      </div>
    </section>
  );
}

export function MiniReportSection() {
  const resultCards = [
    ["Linh hồn", "mini-soul", "mini-soul-text", "Động lực sâu bên trong."],
    ["Sứ mệnh", "mini-mission", "mini-mission-text", "Cách bạn biểu đạt năng lực."],
    ["Năm cá nhân", "mini-personal-year", "mini-personal-year-text", "Gợi ý chu kỳ hiện tại."],
  ];

  return (
    <section className="mini-report section" id="mini-report">
      <div className="section-bg-shared bg-img-1" />
      <div className="container">
        <div className="mini-report-shell reveal">
          <div className="mini-report-copy">
            <span className="section-tag">Tra Cứu Thử Miễn Phí</span>
            <h2 className="section-title mini-report-title">
              Nhận bản xem nhanh nhân số của bạn
            </h2>
            <p className="mini-report-desc">
              Nhập tên và ngày sinh để xem số chủ đạo, năm cá nhân và một vài
              gợi ý ban đầu trước khi đặt lịch tư vấn sâu.
            </p>
            <div className="mini-report-points">
              {[
                "Kết quả hiển thị tức thì",
                "Không cần thanh toán",
                "Gợi ý bước tiếp theo rõ ràng",
              ].map((point) => (
                <span key={point}>
                  <i className="fa-solid fa-circle-check" aria-hidden="true" />{" "}
                  {point}
                </span>
              ))}
            </div>
          </div>
          <form className="mini-report-form" id="mini-report-form">
            <div className="form-group">
              <label htmlFor="mini-name">Họ và tên</label>
              <input
                type="text"
                id="mini-name"
                name="miniName"
                placeholder="Nhập họ tên của bạn"
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="mini-dob">Ngày sinh</label>
              <input
                type="date"
                id="mini-dob"
                name="miniDob"
                min="1900-01-01"
                required
              />
            </div>
            <button
              type="submit"
              className="btn btn-primary btn-full"
              id="mini-report-submit"
            >
              <span>Xem phân tích sơ bộ</span>
              <i
                className="fa-solid fa-wand-magic-sparkles"
                aria-hidden="true"
              />
            </button>
          </form>
        </div>
        <div className="mini-report-result" id="mini-report-result" hidden>
          <div className="mini-result-card mini-result-main">
            <span className="mini-result-label">Số chủ đạo</span>
            <strong id="mini-life-path">-</strong>
            <p id="mini-life-path-text">Kết quả sẽ hiện tại đây.</p>
          </div>
          {resultCards.map(([label, valueId, textId, text]) => (
            <div className="mini-result-card" key={valueId}>
              <span className="mini-result-label">{label}</span>
              <strong id={valueId}>-</strong>
              <p id={textId}>{text}</p>
            </div>
          ))}
          <div className="mini-result-card mini-result-keywords">
            <span className="mini-result-label">Từ khóa nổi bật</span>
            <div className="mini-keywords" id="mini-keywords" />
          </div>
          <div className="mini-result-action">
            <p id="mini-result-note">
              Đây là bản xem nhanh. Buổi tư vấn 1:1 sẽ giúp bạn nối các chỉ số
              thành một lộ trình cụ thể hơn.
            </p>
            <a href="#contact" className="btn btn-primary">
              Đặt lịch phân tích sâu
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}

export function AboutSection() {
  return (
    <section className="about section" id="about">
      <div className="section-bg-shared bg-img-3" />
      <div className="about-overlay" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Về Chúng Tôi</span>
          <h2 className="section-title">Những Người Đồng Hành</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>

        <div className="about-video reveal" data-delay="150">
          <div className="about-video-glow" />
          <div className="about-video-frame">
            <iframe
              src="https://www.youtube.com/embed/7KYlOuSyGPQ?rel=0&modestbranding=1&playsinline=1"
              data-youtube-embed="7KYlOuSyGPQ"
              title="Video giới thiệu Clow Cat Patronus"
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
            />
          </div>
        </div>

        <div className="mentors-grid">
          <div className="mentor-block reveal">
            <div className="mentor-image-col">
              <div className="mentor-arch-frame">
                <picture>
                  <source
                    srcSet="/assets/images/mentor_bao.webp"
                    type="image/webp"
                  />
                  <img
                    src="/assets/images/mentor_bao.png"
                    alt="Phan Thái Bảo"
                    id="mentor1-img"
                    width="1400"
                    height="1868"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>
            <div className="mentor-content-col">
              <div className="mentor-role">NGƯỜI HƯỚNG DẪN</div>
              <h3 className="mentor-name">Phan Thái Bảo</h3>
              <p className="mentor-desc">
                Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá
                bản thân qua ngôn ngữ của những lá bài Clow huyền bí.
              </p>
              <div className="mentor-features">
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-star" aria-hidden="true" />
                  <span>Hơn&nbsp;<strong>10 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ bài Clow</span>
                </div>
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-users" aria-hidden="true" />
                  <span>Đã tư vấn cho hơn&nbsp;<strong>1.000 khách hàng</strong></span>
                </div>
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-graduation-cap" aria-hidden="true" />
                  <span>Khai giảng từ&nbsp;<strong>2019</strong>, hơn&nbsp;<strong>20 khoá học</strong> với&nbsp;<strong>120+ học viên</strong></span>
                </div>
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-microphone-lines" aria-hidden="true" />
                  <span>Tổ chức hơn&nbsp;<strong>10 buổi workshop</strong> từ 2024 với chủ đề Ứng dụng Huyền Học và Bài Clow để HIỂU &amp; THƯƠNG</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mentor-block reveal">
            <div className="mentor-image-col">
              <div className="mentor-arch-frame">
                <picture>
                  <source
                    srcSet="/assets/images/mentor_cuong.webp"
                    type="image/webp"
                  />
                  <img
                    src="/assets/images/mentor_cuong.png"
                    alt="Lê Chí Cường"
                    id="mentor2-img"
                    width="1400"
                    height="1401"
                    loading="lazy"
                    decoding="async"
                  />
                </picture>
              </div>
            </div>
            <div className="mentor-content-col">
              <div className="mentor-role">NGƯỜI HƯỚNG DẪN</div>
              <h3 className="mentor-name">Lê Chí Cường</h3>
              <p className="mentor-desc">
                Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá
                bản thân qua ngôn ngữ của nhân số học.
              </p>
              <div className="mentor-features">
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-book-open" aria-hidden="true" />
                  <span>Hơn&nbsp;<strong>3 năm</strong> nghiên cứu Huyền Học, đặc biệt bộ môn nhân số học</span>
                </div>
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-users" aria-hidden="true" />
                  <span>Đã tư vấn nhân số cho hơn&nbsp;<strong>900 khách hàng</strong></span>
                </div>
                <div className="mentor-feature-card">
                  <i className="fa-solid fa-handshake-angle" aria-hidden="true" />
                  <span>Luôn hỗ trợ và đồng hành cùng các buổi Workshop của Clow Cat Patronus</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

export function BenefitsSection() {
  const benefits = [
    ["01", "fa-eye", "Hiểu Mình Hơn", "Khám phá tính cách, điểm mạnh và điểm yếu thực sự của bản thân qua lăng kính Nhân Số Học."],
    ["02", "fa-key", "Gỡ Bỏ Rào Cản", "Nhận diện và giải phóng những rào cản nội tâm đang ngăn bạn phát triển và tiến về phía trước."],
    ["03", "fa-map-location-dot", "Định Hướng Rõ Ràng", "Có được lộ trình rõ ràng về học tập, công việc và các mối quan hệ quan trọng trong cuộc sống."],
    ["04", "fa-sun", "Tự Tin Quyết Định", "Tự tin đưa ra những quyết định quan trọng với sự hiểu biết sâu sắc về bản thân và con đường phía trước."],
  ];

  return (
    <section className="benefits section" id="benefits">
      <div className="section-bg-shared bg-img-1" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Những Gì Bạn Nhận Được</span>
          <h2 className="section-title">Sau Buổi Tư Vấn, Bạn Sẽ</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="benefits-grid">
          {benefits.map(([number, icon, title, description], index) => (
            <div
              className="benefit-card reveal"
              data-delay={index * 150}
              key={number}
            >
              <div className="benefit-number">{number}</div>
              <div className="benefit-icon">
                <i className={`fa-solid ${icon}`} aria-hidden="true" />
              </div>
              <h3>{title}</h3>
              <p>{description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TestimonialsSection() {
  return (
    <section
      className="testimonials section"
      id="testimonials"
      aria-labelledby="testimonials-title"
    >
      <div className="section-bg-shared bg-img-2" />
      <div className="container">
        <div className="section-header testimonials-header reveal">
          <span className="section-tag">Khách Hàng Nghĩ Gì?</span>
          <h2
            className="section-title testimonials-title"
            id="testimonials-title"
          >
            <span className="testimonial-title-main">Những Hành Trình</span>
            <span className="testimonial-title-accent">Chữa Lành</span>
          </h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
      </div>
      <div className="testimonials-stage reveal" data-delay="150">
        <div
          className="testimonials-track"
          id="testimonials-track"
          tabIndex={0}
          aria-label="Ảnh cảm nhận khách hàng"
        />
        <div className="testimonials-controls">
          <div
            className="testimonials-dots"
            id="testimonials-dots"
            aria-label="Chọn ảnh feedback"
          />
          <div className="testimonial-arrows">
            <button
              className="testimonial-nav testimonial-nav-prev"
              type="button"
              aria-label="Xem feedback trước"
            >
              <i className="fa-solid fa-chevron-left" aria-hidden="true" />
            </button>
            <button
              className="testimonial-nav testimonial-nav-next"
              type="button"
              aria-label="Xem feedback tiếp theo"
            >
              <i className="fa-solid fa-chevron-right" aria-hidden="true" />
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PackagesSection() {
  return (
    <section className="packages section" id="packages">
      <div className="section-bg-shared bg-img-2" />
      <div className="packages-overlay" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Gói Tư Vấn</span>
          <h2 className="section-title section-title-packages">
            <span>Chọn Hình Thức</span>
            <span>Phù Hợp</span>
          </h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>

        <div className="packages-grid packages-grid-3">
          <div className="package-card reveal" data-delay="0">
            <div className="package-glow glow-orange" />
            <div className="package-header">
              <div className="package-icon">
                <i className="fa-solid fa-hourglass-half" aria-hidden="true" />
              </div>
              <h3 className="package-name">Dự Đoán Năm Cá Nhân</h3>
              <div className="package-price">
                <span className="price-current">
                  500.000<sup>đ</sup>
                </span>
                <span className="price-unit">/buổi</span>
              </div>
            </div>
            <div className="package-divider" />
            <ul className="package-features">
              {[
                "Dự đoán xu hướng năm cá nhân",
                "Nhận diện cơ hội & thách thức",
                "Định hướng theo chu kỳ số",
                "Gợi ý hành động phù hợp năm",
              ].map((feature) => (
                <li key={feature}>
                  <span className="feature-check">✦</span>{" "}
                  <span>{feature}</span>
                </li>
              ))}
            </ul>
            <a href="#contact" className="btn btn-package" id="pkg-year">
              Đặt Lịch Ngay
            </a>
          </div>

          <div
            className="package-card package-featured reveal"
            data-delay="100"
          >
            <div className="package-glow glow-gold" />
            <div className="featured-glow-ring" />
            <div className="featured-badge">✨ Toàn Diện Nhất ✨</div>
            <div className="package-header">
              <div className="package-icon featured-icon">
                <i className="fa-solid fa-infinity" aria-hidden="true" />
              </div>
              <h3 className="package-name featured-name">
                Phân Tích Toàn Diện
              </h3>
              <div className="package-price featured-price-wrap">
                <span className="price-current price-highlight">
                  2.000.000<sup>đ</sup>
                </span>
                <span className="price-unit">/buổi</span>
              </div>
            </div>
            <div className="package-divider featured-divider" />
            <ul className="package-features">
              <li>
                <span className="feature-check featured-check">✦</span>{" "}
                <span><strong>7 chỉ số cốt lõi</strong>: chủ đạo · linh hồn · sứ mệnh · nhân cách · thái độ · trưởng thành · nợ nghiệp</span>
              </li>
              <li>
                <span className="feature-check featured-check">✦</span>{" "}
                <span><strong>4 đỉnh cao</strong> trong cuộc đời</span>
              </li>
              <li>
                <span className="feature-check featured-check">✦</span>{" "}
                <span><strong>3 chu kỳ</strong> cuộc đời lớn</span>
              </li>
              <li>
                <span className="feature-check featured-check">✦</span>{" "}
                <span>Sơ đồ mũi tên phẩm chất</span>
              </li>
              <li>
                <span className="feature-check featured-check">✦</span>{" "}
                <span>Thông điệp chữa lành chuyên sâu</span>
              </li>
              <li>
                <span className="feature-check gift featured-check">🎁</span>{" "}
                <span>Tặng file PDF tóm tắt đầy đủ</span>
              </li>
            </ul>
            <a
              href="#contact"
              className="btn btn-primary btn-featured-pkg"
              id="pkg-big7"
            >
              Đặt Lịch Ngay
            </a>
          </div>

          <div className="package-card reveal" data-delay="200">
            <div className="package-glow glow-teal" />
            <div className="package-header">
              <div className="package-icon">
                <i className="fa-solid fa-fingerprint" aria-hidden="true" />
              </div>
              <h3 className="package-name">
                Phân Tích 3 Chỉ Số
                <br />
                Tính Cách Nổi Bật
              </h3>
              <div className="package-price">
                <span className="price-current">
                  1.000.000<sup>đ</sup>
                </span>
                <span className="price-unit">/buổi</span>
              </div>
            </div>
            <ul className="package-features">
              <li>
                <span className="feature-check">✦</span>{" "}
                <span>Phân tích <strong>BIG 3</strong>: chủ đạo · linh hồn · sứ mệnh</span>
              </li>
              <li>
                <span className="feature-check">✦</span>{" "}
                <span><strong>4 đỉnh cao</strong> trong cuộc đời</span>
              </li>
              <li>
                <span className="feature-check">✦</span>{" "}
                <span><strong>3 chu kỳ</strong> cuộc đời lớn</span>
              </li>
              <li>
                <span className="feature-check">✦</span>{" "}
                <span>Định hướng học tập, công việc &amp; quan hệ</span>
              </li>
              <li>
                <span className="feature-check">✦</span>{" "}
                <span>Thông điệp chữa lành &amp; lộ trình cá nhân</span>
              </li>
            </ul>
            <a href="#contact" className="btn btn-package" id="pkg-big3">
              Đặt Lịch Ngay
            </a>
          </div>
        </div>

        <div className="session-info reveal">
          <div className="session-info-item">
            <span className="session-icon">
              <i className="fa-regular fa-hourglass-half" aria-hidden="true" />
            </span>
            <span>
              Thời gian mỗi buổi tư vấn: <strong>tối đa 2 tiếng</strong>
            </span>
          </div>
          <div className="session-info-divider">·</div>
          <div className="session-info-item">
            <span className="session-icon">
              <i className="fa-regular fa-calendar-check" aria-hidden="true" />
            </span>
            <span>
              Yêu cầu sắp xếp lịch trước <strong>ít nhất 1 ngày</strong>
            </span>
          </div>
          <div className="session-info-divider">·</div>
          <div className="session-info-item">
            <span className="session-icon">
              <i className="fa-solid fa-motorcycle" aria-hidden="true" />
            </span>
            <span>
              Nếu lựa chọn xem hình thức offline, tụi mình phụ thu thêm chi phí
              xăng xe là <strong>50.000đ</strong> cho các gói dưới 2.000.000đ
              nhé.
            </span>
          </div>
        </div>
      </div>
    </section>
  );
}

export function PackageComparisonSection() {
  const comparisonRows = [
    ["Phù hợp nếu bạn", "Muốn định hướng 6-12 tháng tới", "Muốn hiểu tính cách lõi", "Muốn bản đồ cá nhân sâu để dùng lâu dài"],
    ["Chỉ số phân tích", "Năm cá nhân và chu kỳ hiện tại", "Chủ đạo, linh hồn, sứ mệnh", "7 chỉ số cốt lõi, chu kỳ, đỉnh cao"],
    ["Đầu ra chính", "Gợi ý hành động theo năm", "Hiểu điểm mạnh, động lực và hướng phát triển", "Lộ trình phân tích đầy đủ kèm PDF tóm tắt"],
    ["Mức độ chuyên sâu", "Cơ bản", "Trung bình", "Chuyên sâu nhất"],
  ];

  return (
    <section className="package-compare section" id="package-compare">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Chọn Gói Dễ Hơn</span>
          <h2 className="section-title">So Sánh Nhanh Các Gói Tư Vấn</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="compare-table-wrap reveal">
          <table className="compare-table">
            <thead>
              <tr>
                <th>Tiêu chí</th>
                <th>Năm cá nhân</th>
                <th>BIG 3</th>
                <th>Toàn diện</th>
              </tr>
            </thead>
            <tbody>
              {comparisonRows.map((row) => (
                <tr key={row[0]}>
                  {row.map((cell) => (
                    <td key={cell}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

export function MethodsSection() {
  const methods = [
    {
      theme: "method-clow",
      letter: "C",
      subtitle: "CLOW GUIDANCE",
      title: "Bài Clow",
      description:
        "Lắng nghe thông điệp từ từng lá bài để nhìn rõ điều đang mắc kẹt.",
      tags: ["Chữa lành", "Định hướng"],
      backTitle: "Thông điệp và lộ trình hành động",
      backDescription:
        "Bài Clow giúp bạn gọi tên năng lượng hiện tại, nhận diện rào cản cảm xúc và chọn bước đi gần nhất phù hợp với hoàn cảnh thật.",
      backItems: [
        "Phân tích chủ đề trọng tâm",
        "Gợi ý hành động dễ áp dụng",
        "Thông điệp chữa lành cá nhân",
      ],
    },
    {
      theme: "method-astro",
      letter: "A",
      subtitle: "ASTROLOGY MAP",
      title: "Chiêm tinh",
      description:
        "Quan sát nhịp vận hành, xu hướng tính cách và thời điểm chuyển mình.",
      tags: ["Bản đồ sao", "Chu kỳ"],
      backTitle: "Hiểu nhịp vận hành cá nhân",
      backDescription:
        "Chiêm tinh bổ sung góc nhìn về khí chất, cách phản ứng, nhu cầu cảm xúc và những giai đoạn nên tiến, nên lùi hoặc nên chuẩn bị kỹ hơn.",
      backItems: [
        "Nhận diện thế mạnh tự nhiên",
        "Đọc xu hướng giai đoạn hiện tại",
        "Gợi ý cách ra quyết định hài hòa",
      ],
    },
    {
      theme: "method-numero",
      letter: "N",
      subtitle: "NUMEROLOGY CODE",
      title: "Nhân số",
      description:
        "Giải mã con số chủ đạo, bài học linh hồn và kiểu phát triển phù hợp.",
      tags: ["Năng lực", "Bài học"],
      backTitle: "Giải mã bản thiết kế nội tại",
      backDescription:
        "Nhân số giúp bạn hiểu nhịp phát triển, động lực sâu bên trong và những bài học lặp lại trong học tập, công việc, tình cảm hoặc tài chính.",
      backItems: [
        "Đọc con số chủ đạo và năm cá nhân",
        "Nhận diện mẫu hành vi lặp lại",
        "Chọn hướng phát triển bền vững",
      ],
    },
  ];

  return (
    <section className="methods section" id="methods">
      <div className="container">
        <div className="section-header methods-header reveal">
          <span className="section-tag">GÓI TƯ VẤN LINH HOẠT 3 TRONG 1</span>
          <h2 className="section-title">
            Một Buổi Tư Vấn, <em>Ba Lăng Kính Soi Chiếu</em>
          </h2>
          <p className="section-desc">
            Chọn góc nhìn bạn muốn đào sâu hoặc kết hợp cả ba hệ quy chiếu để
            nhận được
            <br />
            bức tranh rõ hơn về câu chuyện hiện tại của mình.
          </p>
        </div>

        <div className="methods-grid">
          {methods.map((method, index) => (
            <div
              className="method-card reveal"
              data-delay={index * 100}
              role="button"
              tabIndex={0}
              aria-label={`Lật thẻ ${method.title}`}
              key={method.title}
            >
              <div className="method-card-inner">
                <div className={`method-card-front ${method.theme}`}>
                  <div className="method-front-content">
                    <div className="method-letter">{method.letter}</div>
                    <div className="method-subtitle">{method.subtitle}</div>
                    <h3 className="method-title">{method.title}</h3>
                    <p className="method-desc">{method.description}</p>
                    <div className="method-tags">
                      {method.tags.map((tag) => (
                        <span className="method-tag" key={tag}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div className="method-action">
                    <span>BẤM ĐỂ LẬT</span>
                    <i
                      className="fa-solid fa-wand-magic-sparkles"
                      aria-hidden="true"
                    />
                  </div>
                </div>
                <div className={`method-card-back ${method.theme}`}>
                  <div className="method-back-header">MẶT SAU</div>
                  <h3 className="method-back-title">{method.backTitle}</h3>
                  <p className="method-back-desc">{method.backDescription}</p>
                  <ul className="method-back-list">
                    {method.backItems.map((item) => (
                      <li key={item}>
                        <i
                          className="fa-solid fa-sparkles"
                          aria-hidden="true"
                        />{" "}
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div
          className="methods-cta reveal text-center"
          style={{ marginTop: "48px" }}
        >
          <button
            className="btn btn-primary"
            id="btn-methods-booking"
            type="button"
          >
            <i className="fa-solid fa-sparkles" aria-hidden="true" /> Đặt lịch
            ngay
          </button>
        </div>
      </div>
    </section>
  );
}

export function ProcessSection() {
  const steps = [
    {
      number: "01",
      icon: "fa-regular fa-calendar-check",
      title: "Đặt Lịch",
      description:
        "Chọn thời gian phù hợp với lịch trình của bạn. Linh hoạt theo nguyện vọng cá nhân.",
    },
    {
      number: "02",
      icon: "fa-regular fa-comments",
      title: "Chia Sẻ",
      description:
        "Chia sẻ những điều đang khiến bạn trăn trở, những câu hỏi chưa có lời giải.",
    },
    {
      number: "03",
      icon: "fa-solid fa-wand-magic-sparkles",
      title: "Nhận Định Hướng",
      description:
        "Nhận thông điệp chữa lành và lộ trình cá nhân hoá để tự tin bước tiếp.",
    },
  ];

  return (
    <section className="process section" id="process">
      <div className="section-bg-shared bg-img-3" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Hành Trình</span>
          <h2 className="section-title">Chỉ 3 Bước Đơn Giản</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="process-steps">
          {steps.map((step, index) => (
            <div
              className="process-step reveal"
              data-delay={index * 200}
              key={step.number}
            >
              <div
                className={`step-connector ${index === 0 ? "left-hidden" : ""}`}
              />
              <div className="step-circle">
                <span className="step-num">{step.number}</span>
              </div>
              <div
                className={`step-connector ${index === steps.length - 1 ? "right-hidden" : ""}`}
              />
              <div className="step-content">
                <div className="step-icon">
                  <i className={step.icon} aria-hidden="true" />
                </div>
                <h3>{step.title}</h3>
                <p>{step.description}</p>
              </div>
            </div>
          ))}
        </div>
        <div className="process-quote reveal">
          <p>
            <i className="fa-solid fa-sparkles" aria-hidden="true" />
            <span>Đôi khi chỉ cần hiểu đúng bản thân,</span>
            <em>Mọi thứ sẽ dần rõ ràng hơn</em>
          </p>
        </div>
      </div>
    </section>
  );
}

export function FaqSection() {
  const faqItems = [
    [
      "Tôi chưa biết chọn gói nào thì sao?",
      "Bạn có thể gửi điều đang trăn trở trong form đặt lịch. Tụi mình sẽ hỗ trợ chọn gói phù hợp trước khi xác nhận lịch.",
    ],
    [
      "Buổi tư vấn diễn ra như thế nào?",
      "Buổi tư vấn là cuộc trò chuyện 1:1, đi từ ngày sinh, họ tên, các chỉ số cốt lõi đến câu chuyện thực tế của bạn.",
    ],
    [
      "Sau buổi tư vấn có nhận file không?",
      "Gói Toàn Diện có PDF tóm tắt đầy đủ. Các gói khác vẫn có phần ghi chú định hướng theo nội dung đã tư vấn.",
    ],
    [
      "Thông tin cá nhân của tôi có được bảo mật không?",
      "Có. Thông tin ngày sinh, số điện thoại và nội dung chia sẻ chỉ dùng để chuẩn bị và thực hiện buổi tư vấn.",
    ],
    [
      "Online và offline khác nhau gì?",
      "Online phù hợp nếu bạn muốn linh hoạt thời gian và địa điểm. Offline phù hợp khi bạn muốn gặp trực tiếp tại TP.HCM.",
    ],
    [
      "Có thể đổi lịch không?",
      "Có thể đổi lịch nếu bạn báo trước để tụi mình sắp xếp lại khung giờ phù hợp.",
    ],
  ];

  return (
    <section className="faq section" id="faq">
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Giải Đáp Trước Khi Đặt Lịch</span>
          <h2 className="section-title">Những Câu Hỏi Thường Gặp</h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="faq-list reveal">
          {faqItems.map(([question, answer], index) => (
            <details className="faq-item" open={index === 0} key={question}>
              <summary>{question}</summary>
              <p>{answer}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ContactSection() {
  return (
    <section className="contact section" id="contact">
      <div className="section-bg-shared bg-img-1" />
      <div className="contact-bg" />
      <div className="container">
        <div className="section-header reveal">
          <span className="section-tag">Liên Hệ</span>
          <h2 className="section-title">
            Bắt Đầu Hành Trình
            <br />
            Khám Phá Bản Thân
          </h2>
          <div className="section-divider">
            <span>✦</span><span>✦</span><span>✦</span>
          </div>
        </div>
        <div className="contact-grid">
          <div className="contact-info reveal">
            <div className="contact-card">
              <h3>
                <i
                  className="fa-solid fa-sparkles"
                  style={{
                    color: "var(--color-gold-light)",
                    marginRight: "8px",
                  }}
                  aria-hidden="true"
                />
                Thông Tin Liên Hệ
              </h3>
              <div className="contact-item">
                <span className="contact-icon">
                  <i className="fa-solid fa-comments" aria-hidden="true" />
                </span>
                <div>
                  <strong>Zalo / Facebook</strong>
                  <p>Nhắn tin để đặt lịch nhanh nhất</p>
                </div>
              </div>
              <div className="contact-item">
                <span className="contact-icon">
                  <i className="fa-regular fa-clock" aria-hidden="true" />
                </span>
                <div>
                  <strong>Giờ làm việc</strong>
                  <p>Thứ 2 – Chủ Nhật: 8:00 – 21:00</p>
                </div>
              </div>
            </div>
          </div>
          <div className="contact-form-wrapper reveal">
            <form className="contact-form" id="booking-form">
              <h3>
                <i
                  className="fa-regular fa-calendar-check"
                  style={{
                    color: "var(--color-gold-light)",
                    marginRight: "8px",
                  }}
                  aria-hidden="true"
                />
                Đặt Lịch Tư Vấn
              </h3>
              <div className="form-group">
                <label htmlFor="name">Họ và Tên *</label>
                <input
                  type="text"
                  id="name"
                  name="name"
                  placeholder="Nhập họ và tên của bạn"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="dob">
                  Ngày tháng năm sinh (trên giấy tờ - hoặc có nhiều ngày sinh
                  hãy nhập ngày mà bạn thực sự mong muốn xem) *
                </label>
                <input
                  type="date"
                  id="dob"
                  name="dob"
                  min="1900-01-01"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="phone">Số Điện Thoại / Zalo *</label>
                <input
                  type="tel"
                  id="phone"
                  name="phone"
                  placeholder="Số điện thoại liên lạc"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="consultation-type">Hình Thức *</label>
                <select
                  id="consultation-type"
                  name="consultationType"
                  required
                  defaultValue=""
                >
                  <option value="">-- Chọn hình thức --</option>
                  <option value="online">Online - Google Meet</option>
                  <option value="offline">
                    Offline - Trực tiếp tại TP.HCM
                  </option>
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="package">Gói Tư Vấn *</label>
                <select
                  id="package"
                  name="package"
                  required
                  disabled
                  defaultValue=""
                >
                  <option value="">-- Chọn hình thức trước --</option>
                </select>
                <div
                  className="package-choice-summary"
                  id="package-choice-summary"
                  hidden
                />
              </div>
              <div className="form-group">
                <label htmlFor="email">Email *</label>
                <input
                  type="email"
                  id="email"
                  name="email"
                  placeholder="Email để nhận xác nhận đặt lịch"
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="concern">Điều Bạn Đang Trăn Trở</label>
                <textarea
                  id="concern"
                  name="concern"
                  rows={4}
                  placeholder="Chia sẻ những điều bạn muốn tìm hiểu hoặc vấn đề bạn đang gặp phải..."
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-full"
                id="submit-booking"
              >
                <span>Chọn Lịch &amp; Thanh Toán</span>
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  aria-hidden="true"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
              <p className="form-note">
                Bước tiếp theo: chọn ngày giờ phù hợp và hoàn tất thanh toán.
              </p>
              <div
                className="form-trust-list"
                aria-label="Cam kết khi đặt lịch"
              >
                <span>
                  <i className="fa-solid fa-shield-halved" aria-hidden="true" />{" "}
                  Bảo mật thông tin
                </span>
                <span>
                  <i
                    className="fa-regular fa-calendar-check"
                    aria-hidden="true"
                  />{" "}
                  Có thể đổi lịch
                </span>
                <span>
                  <i
                    className="fa-regular fa-file-lines"
                    aria-hidden="true"
                  />{" "}
                  Nhận tóm tắt sau buổi tư vấn
                </span>
              </div>
            </form>
          </div>
        </div>
      </div>
    </section>
  );
}

export function LandingFooter() {
  const socialLinks = [
    ["https://www.facebook.com/clowcatpatronus", "fb", "fab fa-facebook-f", "Facebook"],
    ["https://www.instagram.com/clow_cat_patronus/", "ig", "fab fa-instagram", "Instagram"],
    ["https://www.tiktok.com/@clow_cat_patronus", "tk", "fab fa-tiktok", "TikTok"],
    ["https://www.youtube.com/@ClowCatPatronusOfficial-1340", "yt", "fab fa-youtube", "YouTube"],
  ];

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-content">
          <div className="footer-col footer-contact-col">
            <h4 className="footer-title">LIÊN HỆ</h4>
            <p className="footer-desc">
              Tìm hiểu thêm qua các nền tảng mạng xã hội của Clow Cat Patronus:
            </p>
            <div className="footer-socials">
              {socialLinks.map(([href, platform, icon, label]) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`social-icon ${platform}`}
                  aria-label={label}
                >
                  <i className={icon} aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          <div className="footer-col footer-logo-col">
            <img
              src="/assets/images/logo.png"
              alt="Clow Cat Patronus"
              className="footer-logo"
              width="568"
              height="567"
              loading="lazy"
              decoding="async"
            />
            <h3 className="footer-tagline">
              KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG
            </h3>
          </div>

          <div className="footer-col footer-links-col">
            <h4 className="footer-title">DỊCH VỤ</h4>
            <ul className="footer-links-list">
              <li>
                <a href="#packages">Gói Khám Phá</a>
              </li>
              <li>
                <a href="#packages">Gói Kết Nối</a>
              </li>
              <li>
                <a href="#packages">Gói Toàn Diện</a>
              </li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom">
          <p>© 2026 ClowCat Patronus. Tất cả quyền được bảo lưu.</p>
          <p className="footer-made-with">
            ✦ Được tạo ra với tình yêu và năng lượng tích cực ✦
          </p>
        </div>
      </div>
    </footer>
  );
}
