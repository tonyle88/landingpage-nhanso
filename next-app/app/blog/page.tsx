import { headers } from "next/headers";
import { connection } from "next/server";
import type { Metadata } from "next";
import BlogRuntime from "./blog-runtime";
import { serializeJsonForHtml } from "@/lib/blog";
import { getPublicBlogCategories } from "@/lib/supabase/public-blog-categories";
import { getPublicBlogPosts } from "@/lib/supabase/public-blog-posts";

const navItems = [
  { href: "/#about", label: "Về Chúng Tôi" },
  { href: "/#benefits", label: "Những Gì Bạn Nhận Được" },
  { href: "/#testimonials", label: "Khách Hàng Nghĩ Gì?" },
  { href: "/#packages", label: "Gói Tư Vấn" },
  { href: "/#process", label: "Hành Trình" },
  { href: "/blog", label: "Giải Mã Nhân Số Học" },
];

const socialLinks = [
  {
    href: "https://www.facebook.com/clowcatpatronus",
    label: "Facebook",
    className: "fb",
    icon: "fab fa-facebook-f",
  },
  {
    href: "https://www.instagram.com/clow_cat_patronus/",
    label: "Instagram",
    className: "ig",
    icon: "fab fa-instagram",
  },
  {
    href: "https://www.tiktok.com/@clow_cat_patronus",
    label: "TikTok",
    className: "tk",
    icon: "fab fa-tiktok",
  },
  {
    href: "https://www.youtube.com/@ClowCatPatronusOfficial-1340",
    label: "YouTube",
    className: "yt",
    icon: "fab fa-youtube",
  },
];

type BlogPageProps = {
  searchParams: Promise<{ id?: string | string[] }>;
};

function requestedArticleId(value: string | string[] | undefined) {
  return typeof value === "string" ? value : "";
}

export async function generateMetadata({
  searchParams,
}: BlogPageProps): Promise<Metadata> {
  const articleId = requestedArticleId((await searchParams).id);
  const publicBlogPosts = await getPublicBlogPosts();
  const article = publicBlogPosts.posts.find((post) => post.id === articleId);

  if (!article) {
    return {
      title: "Giải Mã Nhân Số Học | Clow Cat Patronus",
      description:
        "Bài viết giúp bạn khám phá bản thân, tính cách, điểm mạnh và hành trình phát triển qua nhân số học.",
      alternates: { canonical: "/blog" },
      openGraph: {
        title: "Giải Mã Nhân Số Học | Clow Cat Patronus",
        description:
          "Khám phá bản thân và hành trình phát triển của chính mình qua nhân số học.",
        images: ["/assets/images/hero_bg.png"],
      },
    };
  }

  const canonical = `/blog?id=${encodeURIComponent(article.id)}`;
  return {
    title: `${article.title} | Clow Cat Patronus`,
    description: article.summary,
    alternates: { canonical },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.summary,
      publishedTime: article.date,
      url: canonical,
      images: article.thumbnail
        ? [article.thumbnail]
        : ["/assets/images/hero_bg.png"],
    },
  };
}

export default async function BlogPage({ searchParams }: BlogPageProps) {
  await connection();
  const [requestHeaders, publicBlogCategories, publicBlogPosts, params] =
    await Promise.all([
      headers(),
      getPublicBlogCategories(),
      getPublicBlogPosts(),
      searchParams,
    ]);
  const nonce = requestHeaders.get("x-nonce") || undefined;
  const articleId = requestedArticleId(params.id);
  const article = publicBlogPosts.posts.find((post) => post.id === articleId);
  const category = article
    ? publicBlogCategories.categories.find(
        (item) => item.id === article.categoryId,
      )
    : undefined;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL || "https://nhanso.clowcat.com.vn";
  const initialBlogData = serializeJsonForHtml({
    categories: publicBlogCategories.categories,
    posts: publicBlogPosts.posts,
  });
  const structuredData = serializeJsonForHtml(
    article
      ? {
          "@context": "https://schema.org",
          "@type": "BlogPosting",
          headline: article.title,
          description: article.summary,
          image: article.thumbnail || undefined,
          datePublished: article.date,
          articleSection: category?.name,
          mainEntityOfPage: new URL(
            `/blog?id=${encodeURIComponent(article.id)}`,
            siteUrl,
          ).href,
          publisher: {
            "@type": "Organization",
            name: "Clow Cat Patronus",
          },
        }
      : {
          "@context": "https://schema.org",
          "@type": "Blog",
          name: "Giải Mã Nhân Số Học",
          description:
            "Khám phá bản thân và hành trình phát triển qua nhân số học.",
          url: new URL("/blog", siteUrl).href,
          blogPost: publicBlogPosts.posts.map((post) => ({
            "@type": "BlogPosting",
            headline: post.title,
            datePublished: post.date,
            url: new URL(
              `/blog?id=${encodeURIComponent(post.id)}`,
              siteUrl,
            ).href,
          })),
        },
  );

  return (
    <>
      <script
        id="blog-initial-data"
        type="application/json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: initialBlogData }}
      />
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: structuredData }}
      />
      <BlogRuntime />

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
      <div className="hero-bg blog-page-bg" />

      <nav className="navbar" id="navbar" aria-label="Điều hướng chính">
        <div className="nav-container">
          <a href="/" className="nav-logo">
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
            {navItems.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="nav-link">
                  {item.label}
                </a>
              </li>
            ))}
            <li>
              <a href="/#contact" className="nav-link nav-cta">
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

      <main className="blog-main">
        <div id="blog-container" className="blog-container" />
      </main>

      <footer className="footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-col footer-contact-col">
              <h4 className="footer-title">LIÊN HỆ</h4>
              <p className="footer-desc">
                Tìm hiểu thêm qua các nền tảng mạng xã hội của Clow Cat
                Patronus:
              </p>
              <div className="footer-socials">
                {socialLinks.map((social) => (
                  <a
                    key={social.href}
                    href={social.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`social-icon ${social.className}`}
                    aria-label={social.label}
                  >
                    <i className={social.icon} aria-hidden="true" />
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
                  <a href="/#packages">Gói Khám Phá</a>
                </li>
                <li>
                  <a href="/#packages">Gói Kết Nối</a>
                </li>
                <li>
                  <a href="/#packages">Gói Toàn Diện</a>
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

      <div className="floating-socials">
        {socialLinks.map((social) => (
          <a
            key={social.href}
            href={social.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`float-icon ${social.className}`}
            title={social.label}
            aria-label={social.label}
          >
            <i className={social.icon} aria-hidden="true" />
          </a>
        ))}
      </div>

      <div className="toast" id="toast" />

      <button
        id="scrollTopBtn"
        className="scroll-top-btn"
        aria-label="Lên đầu trang"
      >
        <i className="fa-solid fa-arrow-up" aria-hidden="true" />
      </button>

      <a
        href="/#contact"
        className="mobile-sticky-cta"
        id="mobile-sticky-cta"
      >
        <i className="fa-regular fa-calendar-check" aria-hidden="true" />
        <span>Đặt lịch tư vấn</span>
      </a>

      <audio id="bg-music" src="/nhac.mp3" loop preload="none" />
      <button
        id="musicToggleBtn"
        className="music-toggle-btn playing"
        aria-label="Tắt nhạc"
        aria-pressed="true"
      >
        <i className="fa-solid fa-volume-high" aria-hidden="true" />
      </button>

      <script
        src="/assets/vendor/dompurify/purify.min.js"
        nonce={nonce}
        defer
      />
      <script src="/assets/js/sanitize-html.js" nonce={nonce} defer />
      <script src="/blog.js" nonce={nonce} defer />
    </>
  );
}
