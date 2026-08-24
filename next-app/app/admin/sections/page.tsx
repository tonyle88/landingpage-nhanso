import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { SectionForm } from "./section-form";
import { ContentItemForm, type AdminLandingContentItem } from "./content-item-form";
import styles from "../admin.module.css";
import { AdminToast } from "../admin-toast";
import { landingContentCatalog } from "@/lib/landing-content-catalog";
import { quickUpdateLandingSectionAction } from "./actions";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý section | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã lưu section và ghi audit log.",
  move_up: "Đã đưa section lên một vị trí.",
  move_down: "Đã đưa section xuống một vị trí.",
  toggle: "Đã cập nhật trạng thái hiển thị của section.",
  unchanged: "Section đã ở vị trí ngoài cùng.",
  invalid: "Nội dung section chưa hợp lệ hoặc chứa HTML nguy hiểm.",
  error: "Không thể lưu section.",
};

const contentNotices: Record<string, string> = {
  saved: "Đã lưu nội dung trang chủ và ghi audit log.",
  invalid: "Trường nội dung chưa hợp lệ.",
  error: "Không thể lưu nội dung trang chủ.",
};

type SectionGuide = {
  title: string;
  location: string;
  description: string;
  anchor?: string;
};

const sectionGuide: Record<string, SectionGuide> = {
  meta: { title: "SEO & chia sẻ mạng xã hội", location: "Dùng chung", description: "Tiêu đề, mô tả và ảnh khi chia sẻ website." },
  nav: { title: "Thanh điều hướng", location: "Dùng chung · đầu trang", description: "Logo, các liên kết menu và nút đặt lịch." },
  hero: { title: "Mở đầu trang chủ", location: "Trang chủ · đầu tiên", description: "Thông điệp chính, số liệu nổi bật và nút kêu gọi hành động.", anchor: "#hero" },
  pain: { title: "Câu hỏi khách hàng đang gặp", location: "Trang chủ · sau mở đầu", description: "Bốn vấn đề thường gặp và đoạn giới thiệu Nhân Số Học.", anchor: "#pain-points" },
  mini_report: { title: "Tra cứu thử miễn phí", location: "Trang chủ · công cụ xem nhanh", description: "Tiêu đề, mô tả và hướng dẫn tra cứu sơ bộ.", anchor: "#mini-report" },
  about: { title: "Về chúng tôi & người hướng dẫn", location: "Trang chủ · giới thiệu", description: "Thông tin hai người hướng dẫn và kinh nghiệm nổi bật.", anchor: "#about" },
  benefits: { title: "Sau buổi tư vấn, bạn sẽ", location: "Trang chủ · lợi ích", description: "Bốn kết quả khách hàng nhận được sau buổi tư vấn.", anchor: "#benefits" },
  testimonials: { title: "Khách hàng nghĩ gì", location: "Trang chủ · cảm nhận", description: "Tiêu đề section và thư viện ảnh phản hồi khách hàng.", anchor: "#testimonials" },
  packages: { title: "Gói tư vấn & bảng giá", location: "Trang chủ · bảng giá", description: "Các gói dịch vụ, mức phí và quyền lợi đi kèm.", anchor: "#packages" },
  compare: { title: "So sánh các gói tư vấn", location: "Trang chủ · sau bảng giá", description: "Bảng so sánh được đồng bộ tự động từ danh sách gói.", anchor: "#package-compare" },
  methods: { title: "Gói tư vấn linh hoạt 3 trong 1", location: "Trang chủ · phương pháp", description: "Ba lăng kính Bài Clow, Chiêm tinh và Nhân số.", anchor: "#methods" },
  process: { title: "Hành trình 3 bước", location: "Trang chủ · quy trình", description: "Các bước đặt lịch, chia sẻ và nhận định hướng.", anchor: "#process" },
  faq: { title: "Câu hỏi thường gặp", location: "Trang chủ · trước liên hệ", description: "Các giải đáp quan trọng trước khi khách đặt lịch.", anchor: "#faq" },
  contact: { title: "Liên hệ & đặt lịch", location: "Trang chủ · cuối trang", description: "Thông tin liên hệ và biểu mẫu đặt lịch tư vấn.", anchor: "#contact" },
  footer: { title: "Chân trang", location: "Dùng chung · cuối trang", description: "Thông tin thương hiệu và liên kết cuối trang." },
  social: { title: "Mạng xã hội", location: "Dùng chung", description: "Các liên kết Facebook, Instagram, TikTok và YouTube." },
};

const contentGroupGuide: Record<string, SectionGuide & { order: number }> = {
  hero: { ...sectionGuide.hero, order: 10 },
  pain: { ...sectionGuide.pain, order: 20 },
  mini_report: { ...sectionGuide.mini_report, order: 30 },
  about: { ...sectionGuide.about, order: 40 },
  benefits: { ...sectionGuide.benefits, order: 50 },
  testimonials: { ...sectionGuide.testimonials, order: 60 },
  packages: { ...sectionGuide.packages, order: 70 },
  compare: { ...sectionGuide.compare, order: 80 },
  methods: { ...sectionGuide.methods, order: 90 },
  process: { ...sectionGuide.process, order: 100 },
  faq: { ...sectionGuide.faq, order: 110 },
  contact: { ...sectionGuide.contact, order: 120 },
  meta: { ...sectionGuide.meta, order: 200 },
  nav: { ...sectionGuide.nav, order: 210 },
  footer: { ...sectionGuide.footer, order: 220 },
  social: { ...sectionGuide.social, order: 230 },
};

function normalizeSectionKey(value: string) {
  return value.trim().toLocaleLowerCase("vi").replaceAll("-", "_");
}

function getSectionGuide(sectionKey: string, fallback: string): SectionGuide {
  return sectionGuide[normalizeSectionKey(sectionKey)] || {
    title: fallback,
    location: "Trang chủ · section tùy chỉnh",
    description: "Section bổ sung được tạo trong hệ thống quản trị.",
  };
}

export default async function AdminSectionsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; content_status?: string; q?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const query = (params.q || "").trim().slice(0, 80);
  const supabase = await createAuthServerClient();
  const [{ data: sections, error }, { data: settings, error: settingsError }] = await Promise.all([
    supabase.from("landing_sections").select("*").order("sort_order").order("section_key"),
    supabase.from("site_settings").select("key,value,description")
      .like("key", "landing.content.%").eq("is_public", true).order("key"),
  ]);
  const normalizedQuery = query.toLocaleLowerCase("vi");
  const rows = (sections || []).filter((item) => {
    if (!normalizedQuery) return true;
    const guide = getSectionGuide(item.section_key, item.display_name);
    return `${item.section_key} ${item.display_name} ${guide.title} ${guide.location} ${guide.description}`
      .toLocaleLowerCase("vi")
      .includes(normalizedQuery);
  });
  const sectionPosition = new Map((sections || []).map((item, index) => [item.id, index]));
  const lastSectionIndex = Math.max(0, (sections || []).length - 1);
  const storedContentItems = (settings || []).flatMap((item) => {
    if (!item.value || typeof item.value !== "object" || Array.isArray(item.value)) return [];
    return [{
      key: item.key,
      description: item.description,
      value: item.value as AdminLandingContentItem["value"],
    } satisfies AdminLandingContentItem];
  });
  const storedContentByKey = new Map(storedContentItems.map((item) => [item.key, item]));
  const catalogKeys = new Set(landingContentCatalog.map((item) => item.key));
  const contentItems: AdminLandingContentItem[] = [
    ...landingContentCatalog.map((fallback) => {
      const stored = storedContentByKey.get(fallback.key);
      if (!stored) return fallback;
      return {
        ...fallback,
        description: stored.description || fallback.description,
        value: { ...fallback.value, ...stored.value },
      };
    }),
    ...storedContentItems.filter((item) => !catalogKeys.has(item.key)),
  ];
  const filteredContentItems = contentItems.filter((item) => {
    if (!normalizedQuery) return true;
    const key = item.key.replace("landing.content.", "");
    const group = key.split(".")[0] || "other";
    const guide = contentGroupGuide[group];
    return `${key} ${item.description || ""} ${guide?.title || ""} ${guide?.description || ""}`
      .toLocaleLowerCase("vi")
      .includes(normalizedQuery);
  });
  const contentGroups = new Map<string, AdminLandingContentItem[]>();
  filteredContentItems.forEach((item) => {
    const group = item.key.replace("landing.content.", "").split(".")[0] || "other";
    if (!contentGroups.has(group)) contentGroups.set(group, []);
    contentGroups.get(group)?.push(item);
  });
  const orderedContentGroups = Array.from(contentGroups.entries()).sort(([groupA], [groupB]) => {
    const orderA = contentGroupGuide[groupA]?.order ?? 999;
    const orderB = contentGroupGuide[groupB]?.order ?? 999;
    return orderA - orderB || groupA.localeCompare(groupB, "vi");
  });

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Nội dung website · {principal.role}</p>
          <h1>Bố cục & nội dung website</h1>
          <p>Sắp xếp Trang chủ, sửa đúng nội dung khách nhìn thấy và chuyển nhanh sang khu vực Blog.</p>
        </div>
        <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
      </header>
      <AdminToast
        message={params.status ? notices[params.status] : params.content_status ? contentNotices[params.content_status] : undefined}
        tone={["invalid", "error"].includes(params.status || params.content_status || "") ? "error" : "success"}
        cleanHref={query ? `/admin/sections?q=${encodeURIComponent(query)}` : "/admin/sections"}
      />
      {error ? <AdminToast message="Không thể tải danh sách section." tone="error" cleanHref="/admin/sections" /> : null}

      <nav className={styles.contentAdminHub} aria-label="Khu vực quản trị nội dung">
        <a href="#homepage-layout">
          <span>01</span><strong>Bố cục Trang chủ</strong><small>Ẩn, hiện và đổi thứ tự section</small>
        </a>
        <a href="#homepage-content">
          <span>02</span><strong>Nội dung Trang chủ</strong><small>Sửa tiêu đề, mô tả và các thẻ</small>
        </a>
        <Link href="/admin/packages">
          <span>03</span><strong>Gói tư vấn & bảng giá</strong><small>Quản lý giá, quyền lợi và so sánh gói</small>
        </Link>
        <Link href="/admin/blog">
          <span>04</span><strong>Bài viết Blog</strong><small>Soạn bài, chủ đề và trạng thái xuất bản</small>
        </Link>
      </nav>

      <section className={styles.sectionManager} id="homepage-layout">
        <aside className={styles.sectionIndex}>
          <div>
            <p className={styles.eyebrow}>Bố cục Trang chủ</p>
            <h2>Thứ tự hiển thị</h2>
            <small>Chọn tên bên dưới để đi nhanh đến section.</small>
          </div>
          <form className={styles.sectionSearch} method="get">
            <input name="q" defaultValue={query} placeholder="Tìm section hoặc nội dung…" />
            <button type="submit" aria-label="Tìm">Tìm</button>
          </form>
          <nav aria-label="Danh sách section">
            {rows.map((item) => {
              const guide = getSectionGuide(item.section_key, item.display_name);
              return <a key={item.id} href={`#section-${item.id}`}>
                <span>{guide.title}</span>
                <small>{item.sort_order}</small>
              </a>;
            })}
          </nav>
          <Link className={styles.viewSiteLink} href="/" target="_blank">Xem Trang chủ ↗</Link>
        </aside>
        <div className={styles.sectionWorkspace}>
          <div className={styles.workspaceHeading}>
            <div><p className={styles.eyebrow}>01 · Bố cục Trang chủ</p><h2>Ẩn, hiện & sắp xếp section</h2></div>
            <p>Nội dung chữ được sửa ở khu vực số 02 bên dưới. Phần này chỉ dùng để điều khiển vị trí và trạng thái hiển thị.</p>
          </div>
          <div className={styles.sectionOrderHint}>
            <span aria-hidden="true">ⓘ</span>
            <p>Dùng mũi tên ↑ ↓ để đổi vị trí. Nút gạt dọc dùng để bật hoặc ẩn section. Thay đổi được áp dụng ngay trên Trang chủ.</p>
          </div>
          <div className={styles.sectionStats}>
            <div><strong>{rows.length}</strong><span>section</span></div>
            <div><strong>{rows.filter((item) => item.enabled).length}</strong><span>đang bật</span></div>
          </div>
          <div className={styles.recordList}>
            {!error && rows.length === 0 ? (
              <p className={styles.message}>Không tìm thấy section phù hợp.</p>
            ) : null}
            {rows.map((item) => {
              const guide = getSectionGuide(item.section_key, item.display_name);
              return <article className={`${styles.recordCard} ${styles.sectionOrderCard} ${item.enabled ? "" : styles.sectionOrderCardDisabled}`} id={`section-${item.id}`} key={item.id}>
                <div className={styles.recordSummary}>
                  <div className={styles.sectionOrderIdentity}>
                    <span className={styles.sectionGrip} aria-hidden="true">⠿</span>
                    <div>
                      <strong>{guide.title}</strong>
                      <span>{guide.location}</span>
                      <small>{guide.description}</small>
                    </div>
                  </div>
                  <div className={styles.sectionQuickArea}>
                    <form className={styles.sectionQuickActions} action={quickUpdateLandingSectionAction}>
                      <input type="hidden" name="id" value={item.id} />
                      <button
                        className={styles.sectionToggleButton}
                        type="submit"
                        name="intent"
                        value="toggle"
                        aria-label={item.enabled ? `Ẩn ${item.display_name}` : `Hiện ${item.display_name}`}
                        aria-pressed={item.enabled}
                        data-pending-label="Đang cập nhật trạng thái section…"
                        data-pending-preserve="true"
                        title={item.enabled ? "Đang hiển thị · bấm để ẩn" : "Đang ẩn · bấm để hiện"}
                      >
                        <span className={styles.sectionToggleTrack} aria-hidden="true"><span /></span>
                      </button>
                      <span className={styles.sectionTypeBadge}>{item.section_type === "builtin" ? "Gốc" : "Tùy chỉnh"}</span>
                      <button
                        type="submit"
                        name="intent"
                        value="move_up"
                        disabled={sectionPosition.get(item.id) === 0}
                        aria-label={`Đưa ${item.display_name} lên`}
                        data-pending-label="Đang đưa section lên…"
                        data-pending-preserve="true"
                        title="Đưa lên"
                      >↑</button>
                      <button
                        type="submit"
                        name="intent"
                        value="move_down"
                        disabled={sectionPosition.get(item.id) === lastSectionIndex}
                        aria-label={`Đưa ${item.display_name} xuống`}
                        data-pending-label="Đang đưa section xuống…"
                        data-pending-preserve="true"
                        title="Đưa xuống"
                      >↓</button>
                    </form>
                  </div>
                </div>
                <details>
                  <summary>Cài đặt section nâng cao</summary>
                  <SectionForm item={item} />
                </details>
              </article>;
            })}
          </div>
        </div>
      </section>
      <section className={styles.homepageContent} id="homepage-content">
        <div className={styles.sectionHeading}>
          <div>
            <p className={styles.eyebrow}>02 · Nội dung Trang chủ</p>
            <h2>Sửa đúng phần khách nhìn thấy</h2>
            <p>Mỗi nhóm bên dưới ghi rõ vị trí hiển thị. Mở nhóm cần sửa, thay nội dung rồi bấm “Lưu mục”; không cần thao tác với mã kỹ thuật.</p>
          </div>
          <strong>{filteredContentItems.length} trường</strong>
        </div>
        {settingsError ? <p className={styles.message}>Không thể tải nội dung trang chủ.</p> : null}
        {normalizedQuery && filteredContentItems.length === 0 ? (
          <p className={styles.message}>Không tìm thấy trường nội dung phù hợp với “{query}”.</p>
        ) : null}
        <div className={styles.contentGroups}>
          {orderedContentGroups.map(([group, items], index) => {
            const guide = contentGroupGuide[group] || {
              title: group,
              location: "Nội dung bổ sung",
              description: "Nhóm nội dung được thêm từ dữ liệu cũ.",
              order: 999,
            };
            return (
            <details className={styles.contentGroup} key={group} open={index === 0}>
              <summary>
                <span><strong>{guide.title}</strong><small>{guide.location}</small></span>
                <em>{items.length} trường</em>
              </summary>
              <div className={styles.contentGroupIntro}>
                <p>{guide.description}</p>
                {guide.anchor ? <Link href={`/${guide.anchor}`} target="_blank">Xem vị trí trên Trang chủ ↗</Link> : null}
              </div>
              <div className={styles.contentItemGrid}>
                {items.map((item) => <ContentItemForm item={item} key={item.key} />)}
              </div>
            </details>
            );
          })}
        </div>
      </section>

      <section className={styles.contentDestinations} aria-labelledby="specialized-content-title">
        <div className={styles.sectionHeading}>
          <div><p className={styles.eyebrow}>Nội dung có màn hình riêng</p><h2 id="specialized-content-title">Quản lý dữ liệu chuyên biệt</h2></div>
        </div>
        <div>
          <Link href="/admin/packages"><strong>Gói tư vấn & bảng giá</strong><span>Thêm gói, sửa giá, quyền lợi và nội dung dùng trong bảng so sánh/Quiz.</span></Link>
          <Link href="/admin/testimonials"><strong>Ảnh phản hồi khách hàng</strong><span>Tải ảnh, sắp xếp và bật/ẩn nội dung trong section “Khách hàng nghĩ gì”.</span></Link>
          <Link href="/admin/blog"><strong>Bài viết Blog</strong><span>Soạn bài, sửa ảnh bìa, phân loại chủ đề và quản lý trạng thái xuất bản.</span></Link>
          <Link href="/admin/quiz"><strong>Quiz & công cụ hiểu mình</strong><span>Sửa tiêu đề, câu hỏi, đáp án và luận giải của các công cụ trắc nghiệm.</span></Link>
        </div>
      </section>
    </main>
  );
}
