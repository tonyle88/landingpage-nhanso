const socialLinks = [
  ["https://www.facebook.com/clowcatpatronus", "fb", "fab fa-facebook-f", "Facebook"],
  ["https://www.instagram.com/clow_cat_patronus/", "ig", "fab fa-instagram", "Instagram"],
  ["https://www.tiktok.com/@clow_cat_patronus", "tk", "fab fa-tiktok", "TikTok"],
  ["https://www.youtube.com/@ClowCatPatronusOfficial-1340", "yt", "fab fa-youtube", "YouTube"],
];

export default function LandingUtilities() {
  return (
    <>
      <div className="floating-socials">
        {socialLinks.map(([href, platform, icon, label]) => (
          <a
            key={href}
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className={`float-icon ${platform}`}
            title={label}
            aria-label={label}
          >
            <i className={icon} aria-hidden="true" />
          </a>
        ))}
      </div>

      <div className="toast" id="toast" />

      <button
        id="scrollTopBtn"
        className="scroll-top-btn"
        aria-label="Lên đầu trang"
        type="button"
      >
        <i className="fa-solid fa-arrow-up" aria-hidden="true" />
      </button>

      <a
        href="#contact"
        className="mobile-sticky-cta"
        id="mobile-sticky-cta"
      >
        <i className="fa-regular fa-calendar-check" aria-hidden="true" />
        <span>Đặt lịch tư vấn</span>
      </a>

      <audio id="bg-music" src="/nhac.mp3" loop autoPlay preload="none" />
      <button
        id="musicToggleBtn"
        className="music-toggle-btn playing"
        aria-label="Tắt nhạc"
        aria-pressed="true"
        type="button"
      >
        <i className="fa-solid fa-volume-high" aria-hidden="true" />
      </button>
    </>
  );
}
