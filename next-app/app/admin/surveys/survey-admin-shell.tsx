import Link from "next/link";
import type { ReactNode } from "react";
import adminStyles from "../admin.module.css";
import { createSurveyAction } from "./actions";
import styles from "./surveys.module.css";

type SurveyLink = { id: string; title: string; active: boolean };

export function SurveyAdminShell({
  role,
  surveys,
  selectedId,
  view,
  children,
}: {
  role: string;
  surveys: SurveyLink[];
  selectedId?: string;
  view: "editor" | "responses";
  children: ReactNode;
}) {
  return (
    <main className={adminStyles.adminShell}>
      <header className={adminStyles.pageHeader}>
        <div>
          <p className={adminStyles.eyebrow}>Nội dung website · {role}</p>
          <h1>Khảo sát chất lượng dịch vụ</h1>
          <p>Tạo link gửi khách sau buổi tư vấn, điều chỉnh câu hỏi và đọc phản hồi.</p>
        </div>
        <div className={adminStyles.headerActions}>
          <Link className={adminStyles.secondaryLink} href="/admin">Tổng quan</Link>
        </div>
      </header>
      <div className={styles.layout}>
        <aside className={styles.sidebar} aria-label="Quản lý khảo sát">
          <div className={styles.sidebarTop}>
            <div><span>QUẢN LÝ LINK</span><h2>Khảo sát</h2></div>
            <form action={createSurveyAction}><button type="submit">+ Tạo mới</button></form>
          </div>
          {surveys.map((survey) => (
            <Link
              className={`${styles.surveyItem} ${view === "editor" && selectedId === survey.id ? styles.selected : ""}`}
              href={`/admin/surveys?id=${survey.id}`}
              aria-current={view === "editor" && selectedId === survey.id ? "page" : undefined}
              key={survey.id}
            >
              <strong>{survey.title}</strong>
              <span>{survey.active ? "● Đang mở" : "○ Đã đóng"}</span>
            </Link>
          ))}
          {!surveys.length ? <p className={styles.empty}>Chưa có khảo sát. Nhấn “Tạo mới” để bắt đầu.</p> : null}
          <Link
            className={`${styles.responsesNav} ${view === "responses" ? styles.selected : ""}`}
            href={`/admin/surveys/responses${selectedId ? `?id=${selectedId}` : ""}`}
            aria-current={view === "responses" ? "page" : undefined}
          >
            <span>02 · PHẢN HỒI</span>
            <strong>Đánh giá của khách hàng</strong>
            <small>Xem và quản lý phản hồi</small>
          </Link>
        </aside>
        <div className={styles.mainColumn}>{children}</div>
      </div>
    </main>
  );
}
