import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { QUIZ_QUESTIONS } from "@/lib/package-quiz";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { AdminToast } from "../admin-toast";
import styles from "../admin.module.css";
import { saveQuizQuestionsAction } from "./actions";
import { QuizEditor } from "./quiz-editor";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý Quiz | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã lưu bộ câu hỏi Quiz. Trang công khai đã được cập nhật.",
  invalid: "Bộ câu hỏi chưa hợp lệ. Hãy giữ 10–15 câu, mỗi câu có từ 2–6 đáp án và điền đủ nội dung.",
  error: "Không thể lưu bộ câu hỏi Quiz.",
};

export default async function AdminQuizPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const principal = await getAdminPrincipal();
  if (!principal) redirect("/admin/login?reason=unauthorized");
  if (!can(principal.role, "manage_content")) redirect("/admin");

  const params = await searchParams;
  const supabase = await createAuthServerClient();
  const { data, error } = await supabase
    .from("site_settings")
    .select("value")
    .eq("key", QUIZ_SETTING_KEY)
    .maybeSingle();
  const questions = (!error && data ? parseQuizQuestions(data.value) : null) || QUIZ_QUESTIONS;

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Nội dung website · {principal.role}</p>
          <h1>Quản lý Quiz</h1>
          <p>Chỉnh câu hỏi, đáp án, màu năng lượng và nhóm dịch vụ được gợi ý.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryLink} href="/quiz" target="_blank">Xem Quiz ↗</Link>
          <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
        </div>
      </header>
      <AdminToast
        cleanHref="/admin/quiz"
        message={params.status ? notices[params.status] : error ? "Không thể tải cấu hình Quiz; đang dùng bộ mặc định." : undefined}
        tone={["invalid", "error"].includes(params.status || "") || Boolean(error) ? "error" : "success"}
      />
      <section className={styles.quizAdminIntro}>
        <div><strong>10–15</strong><span>Câu hỏi đề xuất</span></div>
        <div><strong>2–6</strong><span>Đáp án mỗi câu</span></div>
        <div><strong>4</strong><span>Nhóm dịch vụ</span></div>
        <p>Mỗi đáp án cộng điểm cho một nhóm dịch vụ. Kết quả cuối sẽ đối chiếu với các gói đang bật trong mục Gói dịch vụ.</p>
      </section>
      <QuizEditor action={saveQuizQuestionsAction} questions={questions} />
    </main>
  );
}
