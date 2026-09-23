import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { parseSurveyQuestions, surveyCopyWithDefaults } from "@/lib/survey";
import { AdminToast } from "../admin-toast";
import { SurveyAdminShell } from "./survey-admin-shell";
import { SurveyEditor } from "./survey-editor";
import styles from "./surveys.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Khảo sát dịch vụ | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  created: "Đã tạo khảo sát mới và link gửi khách hàng.",
  content_saved: "Đã lưu nội dung trang khảo sát.",
  questions_saved: "Đã lưu câu hỏi khảo sát.",
  invalid_content: "Nội dung trang chưa hợp lệ. Hãy điền đủ tiêu đề, lời mở đầu và các dòng chữ hiển thị.",
  invalid_questions: "Câu hỏi chưa hợp lệ. Hãy điền từ 1 đến 10 câu hỏi.",
  content_error: "Không thể lưu nội dung trang. Vui lòng thử lại.",
  questions_error: "Không thể lưu câu hỏi. Vui lòng thử lại.",
  error: "Không thể tạo khảo sát. Vui lòng thử lại.",
};

export default async function AdminSurveysPage({
  searchParams,
}: {
  searchParams: Promise<{ id?: string; status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const supabase = await createAuthServerClient();
  const { data: surveys, error: surveysError } = await supabase
    .from("service_surveys")
    .select("id,title,intro,questions,display_copy,active,created_at,updated_at")
    .order("created_at", { ascending: false })
    .limit(100);
  const selected = surveys?.find((survey) => survey.id === params.id) || surveys?.[0];
  const questions = parseSurveyQuestions(selected?.questions);

  return (
    <SurveyAdminShell role={principal.role} surveys={surveys || []} selectedId={selected?.id} view="editor">
      <AdminToast
        message={params.status ? notices[params.status] : surveysError ? "Chưa tải được khảo sát. Hãy áp dụng migration trước." : undefined}
        tone={["invalid_content", "invalid_questions", "content_error", "questions_error", "error"].includes(params.status || "") || Boolean(surveysError) ? "error" : "success"}
        cleanHref={selected ? `/admin/surveys?id=${selected.id}` : "/admin/surveys"}
      />
      {selected && questions ? (
        <section className={styles.panel}>
          <div className={styles.panelHeader}><span>01 · NỘI DUNG & LINK</span><h2>Chỉnh sửa khảo sát</h2><p>Link này có thể gửi trực tiếp cho khách sau khi lưu nội dung.</p></div>
          <SurveyEditor key={selected.id} survey={selected} questions={questions} copy={surveyCopyWithDefaults(selected.display_copy)} />
        </section>
      ) : surveysError ? null : <section className={styles.panel}><p className={styles.empty}>Chọn một khảo sát để chỉnh sửa.</p></section>}
    </SurveyAdminShell>
  );
}
