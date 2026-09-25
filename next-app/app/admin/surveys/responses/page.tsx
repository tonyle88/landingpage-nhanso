import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import type { SurveyAnswer } from "@/lib/survey";
import { AdminToast } from "../../admin-toast";
import { SurveyAdminShell } from "../survey-admin-shell";
import styles from "../surveys.module.css";
import { DeleteResponseControl } from "./delete-response-control";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Đánh giá của khách hàng | Clow Cat Patronus",
  robots: { index: false, follow: false },
};
const RESPONSES_PER_PAGE = 20;

function validAnswers(value: unknown): SurveyAnswer[] {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is SurveyAnswer => Boolean(
    item && typeof item === "object" &&
    typeof item.prompt === "string" && typeof item.answer === "string",
  ));
}

export default async function SurveyResponsesPage({
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
    .select("id,title,active")
    .order("created_at", { ascending: false })
    .limit(100);
  const selected = surveys?.find((survey) => survey.id === params.id) || surveys?.[0];
  const page = Math.max(1, Math.min(10000, Number.parseInt(params.p || "1", 10) || 1));
  const [{ data: responses, error: responsesError }, { count: totalCount, error: countError }] = selected
    ? await Promise.all([
        supabase.from("service_survey_responses")
          .select("id,respondent_name,rating,answers,created_at")
          .eq("survey_id", selected.id)
          .order("created_at", { ascending: false })
          .range((page - 1) * RESPONSES_PER_PAGE, page * RESPONSES_PER_PAGE - 1),
        supabase.from("service_survey_responses")
          .select("id", { count: "exact", head: true })
          .eq("survey_id", selected.id),
      ])
    : [{ data: [], error: null }, { count: 0, error: null }];
  const loadError = Boolean(surveysError || responsesError || countError);
  if (selected && !loadError && page > Math.max(1, Math.ceil((totalCount || 0) / RESPONSES_PER_PAGE))) {
    const status = params.status === "deleted" ? "&status=deleted" : "";
    redirect(`/admin/surveys/responses?id=${selected.id}&p=${Math.max(1, Math.ceil((totalCount || 0) / RESPONSES_PER_PAGE))}${status}`);
  }
  const ratingCounts = [1, 2, 3, 4, 5].map((rating) =>
    (responses || []).filter((response) => response.rating === rating).length,
  );
  const average = responses?.length
    ? (responses.reduce((sum, response) => sum + response.rating, 0) / responses.length).toFixed(1)
    : null;
  const canDelete = can(principal.role, "manage_operations");
  const returnPath = selected ? `/admin/surveys/responses?id=${selected.id}&p=${page}` : "/admin/surveys/responses";

  return (
    <SurveyAdminShell role={principal.role} surveys={surveys || []} selectedId={selected?.id} view="responses">
      <AdminToast
        message={params.status === "deleted" ? "Đã xóa đánh giá của khách hàng." : params.status === "delete_error" ? "Không thể xóa đánh giá. Vui lòng thử lại." : params.status === "invalid_delete" ? "Đánh giá cần xóa không hợp lệ." : undefined}
        tone={params.status === "delete_error" || params.status === "invalid_delete" ? "error" : "success"}
        cleanHref={returnPath}
      />
      <section className={styles.panel}>
        <div className={styles.panelHeader}>
          <span>02 · PHẢN HỒI</span>
          <h2>Đánh giá của khách hàng</h2>
          <p>{selected ? `${totalCount ?? 0} phản hồi đã lưu. Hiển thị tối đa ${RESPONSES_PER_PAGE} phản hồi mỗi trang.` : "Chọn một khảo sát để xem phản hồi."}</p>
        </div>
        {surveys?.length ? (
          <form className={styles.responseFilter} action="/admin/surveys/responses" method="get">
            <label htmlFor="response-survey">Phản hồi của khảo sát</label>
            <select id="response-survey" name="id" defaultValue={selected?.id}>
              {surveys.map((survey, index) => <option key={survey.id} value={survey.id}>{String(index + 1).padStart(2, "0")} · {survey.title}</option>)}
            </select>
            <button type="submit">Xem đánh giá</button>
          </form>
        ) : null}
        {loadError ? <p className={styles.empty}>Không thể tải phản hồi. Vui lòng thử lại.</p> : null}
        {!loadError && responses?.length ? (
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
                  <div className={styles.responsePerson}>
                    <strong>{response.respondent_name}</strong>
                    <time dateTime={response.created_at}>{new Date(response.created_at).toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</time>
                  </div>
                  <div className={styles.responseMeta}>
                    <span className={styles.responseStars} aria-label={`${response.rating} trên 5 sao`}>{"★".repeat(response.rating)}{"☆".repeat(5 - response.rating)}</span>
                    {canDelete && selected ? <DeleteResponseControl surveyId={selected.id} responseId={response.id} respondentName={response.respondent_name} page={page} /> : null}
                  </div>
                </div>
                {validAnswers(response.answers).map((answer, index) => (
                  <div className={styles.answer} key={`${answer.id}-${index}`}><small>{answer.prompt}</small><p>{answer.answer}</p></div>
                ))}
              </article>
            ))}</div>
            {(totalCount || 0) > RESPONSES_PER_PAGE && selected ? (
              <nav className={styles.pagination} aria-label="Trang phản hồi">
                {page > 1 ? <Link href={`/admin/surveys/responses?id=${selected.id}&p=${page - 1}`}>← Trang trước</Link> : <span />}
                <span>Trang {page} / {Math.ceil((totalCount || 0) / RESPONSES_PER_PAGE)}</span>
                {page * RESPONSES_PER_PAGE < (totalCount || 0) ? <Link href={`/admin/surveys/responses?id=${selected.id}&p=${page + 1}`}>Trang sau →</Link> : <span />}
              </nav>
            ) : null}
          </>
        ) : !loadError ? <p className={styles.empty}>Chưa có phản hồi nào cho khảo sát này.</p> : null}
      </section>
    </SurveyAdminShell>
  );
}
