import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { AdminNavIcon } from "./admin-nav-icon";
import styles from "./admin.module.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Quản trị | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const contentNavigation = [
  { href: "/admin/sections", icon: "sections" as const, title: "Nội dung trang chủ", description: "Chỉnh sửa section, tiêu đề, nút bấm và SEO." },
  { href: "/admin/packages", icon: "packages" as const, title: "Gói dịch vụ", description: "Quản lý nội dung, mức giá và trạng thái hiển thị." },
  { href: "/admin/testimonials", icon: "testimonials" as const, title: "Testimonials", description: "Cập nhật hình ảnh và phản hồi của khách hàng." },
  { href: "/admin/blog", icon: "blog" as const, title: "Bài viết & danh mục", description: "Soạn bài, phân loại và kiểm soát xuất bản." },
  { href: "/admin/settings", icon: "settings" as const, title: "Cấu hình website", description: "Thiết lập thông tin chung và tham số vận hành." },
];

const operationNavigation = [
  { href: "/admin/bookings", icon: "bookings" as const, title: "Lịch hẹn", description: "Theo dõi, xác nhận và cập nhật trạng thái tư vấn." },
  { href: "/admin/customers", icon: "customers" as const, title: "Khách hàng", description: "Tổng hợp khách đã đặt lịch thành công và tần suất quay lại." },
  { href: "/admin/payments", icon: "payments" as const, title: "Đối soát thanh toán", description: "Kiểm tra webhook và xác minh giao dịch SePay." },
];

const toolNavigation = [
  {
    href: "/admin/numerology",
    icon: "numerology" as const,
    title: "Công cụ nhân số học",
    description: "Tính 9 nhóm chỉ số, lập biểu đồ ngày sinh và xuất PDF cho khách.",
  },
  {
    href: "/admin/reports",
    icon: "reports" as const,
    title: "Xuất PDF report khách hàng",
    description: "Ghép file DOCX và bản đồ JPG A4 thành hồ sơ phân tích hoàn chỉnh.",
  },
];

const systemNavigation = [
  {
    href: "/admin/members",
    icon: "members" as const,
    title: "Quản lý thành viên",
    description: "Tạo tài khoản nội bộ, theo dõi trạng thái và phân quyền truy cập.",
  },
];

type AdminNavigationItem =
  | (typeof contentNavigation)[number]
  | (typeof operationNavigation)[number]
  | (typeof toolNavigation)[number]
  | (typeof systemNavigation)[number];

function AdminNavigationCard({ item }: { item: AdminNavigationItem }) {
  return (
    <Link className={styles.adminNavCard} href={item.href}>
      <span className={styles.adminNavIcon}><AdminNavIcon name={item.icon} /></span>
      <span className={styles.adminNavCopy}>
        <strong>{item.title}</strong>
        <small>{item.description}</small>
      </span>
      <span className={styles.adminNavArrow} aria-hidden="true">→</span>
    </Link>
  );
}

export default async function AdminPage() {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");

  return (
    <main className={styles.shell}>
      <section className={styles.dashboard}>
        <div className={styles.dashboardHeader}>
          <div className={styles.dashboardIdentity}>
            <p className={styles.eyebrow}>Admin Console</p>
            <h1>Xin chào<span className={styles.titleAccent}>.</span></h1>
            <div className={styles.accountLine}>
              <span className={styles.accountAvatar} aria-hidden="true">
                {(principal.email || "A").slice(0, 1).toUpperCase()}
              </span>
              <span>
                <strong>{principal.email || "Tài khoản quản trị"}</strong>
                <small><span className={styles.statusDot} /> Hệ thống production đang hoạt động</small>
              </span>
              <span className={styles.role}>{principal.role}</span>
            </div>
          </div>
          <form action="/admin/logout" method="post">
            <button className={styles.logout} type="submit">
              <span aria-hidden="true">↗</span> Đăng xuất
            </button>
          </form>
        </div>
        <div className={styles.dashboardIntro}>
          <p className={styles.description}>
            Không gian quản trị tập trung cho nội dung website, lịch tư vấn và thanh toán.
            Chọn một khu vực để bắt đầu.
          </p>
        </div>
        <div className={styles.dashboardSection}>
          <div className={styles.dashboardSectionHeading}>
            <div><span>01</span><h2>Nội dung website</h2></div>
            <p>Cập nhật những gì khách hàng nhìn thấy.</p>
          </div>
          <nav className={styles.adminNav} aria-label="Quản trị nội dung">
            {contentNavigation.map((item) => <AdminNavigationCard item={item} key={item.href} />)}
          </nav>
        </div>
        <div className={styles.dashboardSection}>
          <div className={styles.dashboardSectionHeading}>
            <div><span>02</span><h2>Vận hành</h2></div>
            <p>Theo dõi lịch hẹn và dòng tiền.</p>
          </div>
          <nav className={`${styles.adminNav} ${styles.operationNav}`} aria-label="Quản trị vận hành">
            {operationNavigation.map((item) => <AdminNavigationCard item={item} key={item.href} />)}
          </nav>
        </div>
        <div className={styles.dashboardSection}>
          <div className={styles.dashboardSectionHeading}>
            <div><span>03</span><h2>Công cụ chuyên môn</h2></div>
            <p>Lập hồ sơ chuyên sâu để phục vụ tư vấn.</p>
          </div>
          <nav className={styles.adminNav} aria-label="Công cụ chuyên môn">
            {toolNavigation.map((item) => (
              <AdminNavigationCard item={item} key={item.href} />
            ))}
          </nav>
        </div>
        {principal.role === "owner" ? (
          <div className={styles.dashboardSection}>
            <div className={styles.dashboardSectionHeading}>
              <div><span>04</span><h2>Hệ thống</h2></div>
              <p>Quản lý người có quyền truy cập trang admin.</p>
            </div>
            <nav className={styles.adminNav} aria-label="Quản trị hệ thống">
              {systemNavigation.map((item) => (
                <AdminNavigationCard item={item} key={item.href} />
              ))}
            </nav>
          </div>
        ) : null}
      </section>
    </main>
  );
}
