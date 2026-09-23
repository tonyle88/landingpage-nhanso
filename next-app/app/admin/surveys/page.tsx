import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { parseSurveyQuestions, type SurveyAnswer } from "@/lib/survey";
import { AdminToast } from "../admin-toast";
import adminStyles from "../admin.module.css";
import { createSurveyAction } from "./actions";
import { SurveyEditor } from "./survey-editor";
import styles from "./surveys.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Khảo sát dịch vụ | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  created: "Đã tạo khảo sát mới và link gửi khách hàng.",
  saved: "Đã lưu thay đổi khảo sát.",
  invalid: "Nội dung chưa hợp lệ. Hãy điền đủ tiêu đề, lời mở đầu và 1–10 câu hỏi.",
  error: "Không thể lưu khảo sát. Hãy kiểm tra migration và thử lại.",
};

function validAnswers(value: unknown): SurveyAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SurveyAnswer => Boolean(
    item && typeof item === "object" &&
    typeof item.prompt === "string" && typeof item.answer === "string",
  ));
}

export default async function AdminSurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; p?: string; status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const supabase = await createAuthServerClient();
  const { data: surveys, error: surveysError } = await supabase
    .from("service_surveys")
    .select("id,title,intro,questions,active,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const selected = surveys?.find((survey) => survey.id === params.id) || surveys?.[0];
  const questions = parseSurveyQuestions(selected?.questions);
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.p || "1", 10) || 1));
  const [{ data: responses, error: responsesError }, { count: totalCount }] = selected
    ? await Promise.all([
        supabase.from("service_survey_responses")
          .select("id,respondent_name,rating,answers,created_at")
          .eq("survey_id", selected.id)
          .order("created_at", { ascending: false })
          .range((page - 1) * 100, page * 100 - 1),
        supabase.from("service_survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", selected.id),
      ])
    : [{ data: [], error: null }, { count: 0 }];
  const ratingCounts = [1, 2, 3, 4, 5].map((rating) =>
    (responses || []).filter((response) => response.rating === rating).length,
  );
  const average = responses?.length
    ? (responses.reduce((sum, response) => sum + response.rating, 0) / responses.length).toFixed(1)
    : null;

  return (
    <main className={adminStyles.adminShell}>
      <header className={adminStyles.pageHeader}>
        <div>
          <p className={adminStyles.eyebrow}>Nội dung website · {principal.role}</p>
          <h1>Khảo sát chất lượng dịch vụ</h1>
          <p>Tạo link gửi khách sau buổi tư vấn, điều chỉnh câu hỏi và đọc phản hồi.</p>
        </div>
        <div className={adminStyles.headerActions}>
          <Link className={adminStyles.secondaryLink} href="/admin">Tổng quan</Link>
        </div>
      </header>
      <AdminToast
        message={params.status ? notices[params.status] : surveysError ? "Chưa tải được khảo sát. Hãy áp dụng migration trước." : undefined}
        tone={["invalid", "error"].includes(params.status || "") || Boolean(surveysError) ? "error" : "success"}
        cleanHref={selected ? `/admin/surveys?id=${selected.id}` : "/admin/surveys"}
      />
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <div className={styles.sidebarTop}>
            <div><span>QUẢN LÝ LINK</span><h2>Khảo sát</h2></div>
            <form action={createSurveyAction}><button type="submit">+ Tạo mới</button></form>
          </div>
          {(surveys || []).map((survey) => (
            <Link className={`${styles.surveyItem} ${selected?.id === survey.id ? styles.selected : ""}`}
              href={`/admin/surveys?id=${survey.id}`} key={survey.id}>
              <strong>{survey.title}</strong>
              <span>{survey.active ? "● Đang mở" : "○ Đã đóng"}</span>
            </Link>
          ))}
          {!surveys?.length && !surveysError ? <p className={styles.empty}>Chưa có khảo sát. Nhấn “Tạo mới” để bắt đầu.</p> : null}
        </aside>
        <div className={styles.mainColumn}>
          {selected && questions ? (
            <>
              <section className={styles.panel}>
                <div className={styles.panelHeader}><span>01 · NỘI DUNG & LINK</span><h2>Chỉnh sửa khảo sát</h2><p>Link này có thể gửi trực tiếp cho khách sau khi lưu nội dung.</p></div>
                <SurveyEditor key={selected.id} survey={selected} questions={questions} />
              </section>
              <section className={styles.panel}>
                <div className={styles.panelHeader}><span>02 · PHẢN HỒI</span><h2>Đánh giá của khách hàng</h2><p>{totalCount ?? 0} phản hồi đã lưu. Hiển thị tối đa 100 phản hồi mỗi trang.</p></div>
                {responsesError ? <p className={styles.empty}>Không thể tải phản hồi. Vui lòng thử lại.</p> : null}
                {responses?.length ? (
                  <>
                    <div className={styles.ratingOverview}>
                      <div><strong>{average}</strong><span>★ Trung bình phản hồi trang {page}</span></div>
                      <div className={styles.ratingBars}>{ratingCounts.map((count, index) => (
                        <div key={index}><span>{index + 1} ★</span><meter min={0} max={responses.length} value={count} /><em>{count}</em></div>
                      ))}</div>
                    </div>
                    <div className={styles.responseList}>{responses.map((response) => (
                      <article className={styles.responseCard} key={response.id}>
                        <div className={styles.responseHead}>
                          <div><strong>{response.respondent_name}</strong><time dateTime={response.created_at}>{new Date(response.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time></div>
                          <span aria-label={`${response.rating} trên 5 sao`}>{"★".repeat(response.rating)}{"☆".repeat(5 - response.rating)}</span>
                        </div>
                        {validAnswers(response.answers).map((answer, index) => (
                          <div className={styles.answer} key={`${answer.id}-${index}`}><small>{answer.prompt}</small><p>{answer.answer}</p></div>
                        ))}
                      </article>
                    ))}</div>
                    {(totalCount || 0) > 100 ? (
                      <nav className={styles.pagination} aria-label="Trang phản hồi">
                        {page > 1 ? <Link href={`/admin/surveys?id=${selected.id}&p=${page - 1}`}>← Trang trước</Link> : <span />}
                        <span>Trang {page} / {Math.ceil((totalCount || 0) / 100)}</span>
                        {page * 100 < (totalCount || 0) ? <Link href={`/admin/surveys?id=${selected.id}&p=${page + 1}`}>Trang sau →</Link> : <span />}
                      </nav>
                    ) : null}
                  </>
                ) : !responsesError ? <p className={styles.empty}>Chưa có phản hồi nào. Sao chép link bên trên và gửi cho khách sau buổi tư vấn.</p> : null}
              </section>
            </>
          ) : surveysError ? null : <section className={styles.panel}><p className={styles.empty}>Chọn một khảo sát để chỉnh sửa.</p></section>}
        </div>
      </div>
    </main>
  );
}
