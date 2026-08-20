import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getAdminPrincipal } from "@/lib/auth/admin-principal";
import { can } from "@/lib/auth/roles";
import { QUIZ_QUESTIONS } from "@/lib/package-quiz";
import { parseQuizQuestions, QUIZ_SETTING_KEY } from "@/lib/quiz-question-schema";
import {
  LIFE_WHEEL_SETTING_KEY,
  LOVE_LANGUAGE_QUESTIONS,
  LOVE_LANGUAGE_SETTING_KEY,
  parseLoveLanguageQuestions,
  parseVakadQuestions,
  parseWheelCategories,
  VAKAD_QUESTIONS,
  VAKAD_SETTING_KEY,
  WHEEL_CATEGORIES,
} from "@/lib/self-discovery-tools";
import { createAuthServerClient } from "@/lib/supabase/auth-server";
import { AdminToast } from "../admin-toast";
import styles from "../admin.module.css";
import {
  saveLifeWheelQuestionsAction,
  saveLoveLanguageQuestionsAction,
  saveQuizQuestionsAction,
  saveVakadQuestionsAction,
} from "./actions";
import { QuizEditor } from "./quiz-editor";
import { LifeWheelEditor, LoveLanguageEditor, VakadEditor } from "./self-discovery-editors";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Quản lý Quiz | Clow Cat Patronus",
  robots: { index: false, follow: false },
};

const notices: Record<string, string> = {
  saved: "Đã lưu bộ câu hỏi Quiz. Trang công khai đã được cập nhật.",
  invalid: "Bộ câu hỏi chưa hợp lệ. Hãy giữ 10–15 câu, mỗi câu có từ 2–6 đáp án và điền đủ nội dung.",
  error: "Không thể lưu bộ câu hỏi Quiz.",
  "saved-vakad": "Đã lưu riêng bộ câu hỏi VAKAd và cập nhật trang công khai.",
  "invalid-vakad": "Câu hỏi VAKAd chưa hợp lệ. Hãy điền đủ 15 câu và 4 lựa chọn mỗi câu.",
  "error-vakad": "Không thể lưu bộ câu hỏi VAKAd.",
  "saved-love": "Đã lưu riêng bộ câu hỏi Ngôn ngữ yêu thương và cập nhật trang công khai.",
  "invalid-love": "Câu hỏi Ngôn ngữ yêu thương chưa hợp lệ. Hãy điền đủ 30 cặp lựa chọn.",
  "error-love": "Không thể lưu bộ câu hỏi Ngôn ngữ yêu thương.",
  "saved-wheel": "Đã lưu riêng bộ câu hỏi Bánh xe cuộc đời và cập nhật trang công khai.",
  "invalid-wheel": "Câu hỏi Bánh xe cuộc đời chưa hợp lệ. Hãy điền đủ tám vùng và toàn bộ câu hỏi.",
  "error-wheel": "Không thể lưu bộ câu hỏi Bánh xe cuộc đời.",
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
    .select("key,value")
    .in("key", [QUIZ_SETTING_KEY, VAKAD_SETTING_KEY, LOVE_LANGUAGE_SETTING_KEY, LIFE_WHEEL_SETTING_KEY]);
  const settings = new Map((data || []).map((setting) => [setting.key, setting.value]));
  const questions = (!error ? parseQuizQuestions(settings.get(QUIZ_SETTING_KEY)) : null) || QUIZ_QUESTIONS;
  const vakadQuestions = (!error ? parseVakadQuestions(settings.get(VAKAD_SETTING_KEY)) : null) || VAKAD_QUESTIONS;
  const loveQuestions = (!error ? parseLoveLanguageQuestions(settings.get(LOVE_LANGUAGE_SETTING_KEY)) : null) || LOVE_LANGUAGE_QUESTIONS;
  const wheelCategories = (!error ? parseWheelCategories(settings.get(LIFE_WHEEL_SETTING_KEY)) : null) || WHEEL_CATEGORIES;
  const statusIsError = params.status?.startsWith("invalid") || params.status?.startsWith("error");

  return (
    <main className={styles.adminShell}>
      <header className={styles.pageHeader}>
        <div>
          <p className={styles.eyebrow}>Nội dung website · {principal.role}</p>
          <h1>Quản lý Quiz</h1>
          <p>Chỉnh riêng Quiz chọn gói, VAKAd, Ngôn ngữ yêu thương và Bánh xe cuộc đời.</p>
        </div>
        <div className={styles.headerActions}>
          <Link className={styles.secondaryLink} href="/quiz" target="_blank">Xem Quiz ↗</Link>
          <Link className={styles.secondaryLink} href="/admin">Tổng quan</Link>
        </div>
      </header>
      <AdminToast
        cleanHref="/admin/quiz"
        message={params.status ? notices[params.status] : error ? "Không thể tải cấu hình Quiz; đang dùng bộ mặc định." : undefined}
        tone={statusIsError || Boolean(error) ? "error" : "success"}
      />
      <section className={styles.quizAdminIntro}>
        <div><strong>10–15</strong><span>Câu hỏi đề xuất</span></div>
        <div><strong>2–6</strong><span>Đáp án mỗi câu</span></div>
        <div><strong>3</strong><span>Công cụ tự khám phá</span></div>
        <p>Mỗi phần có nút lưu riêng. Các mã chấm điểm được khóa để bạn thoải mái sửa câu chữ mà không làm sai công thức kết quả.</p>
      </section>
      <section className={styles.toolEditorSection} id="quiz-chon-goi">
        <header className={styles.toolEditorHeader}>
          <span>00</span><div><h2>Quiz chọn gói tư vấn</h2><p>Bộ câu hỏi gợi ý dịch vụ đang dùng trên trang Quiz chính.</p></div>
          <Link href="/quiz" target="_blank">Xem Quiz ↗</Link>
        </header>
        <QuizEditor action={saveQuizQuestionsAction} questions={questions} />
      </section>
      <VakadEditor action={saveVakadQuestionsAction} questions={vakadQuestions} />
      <LoveLanguageEditor action={saveLoveLanguageQuestionsAction} questions={loveQuestions} />
      <LifeWheelEditor action={saveLifeWheelQuestionsAction} categories={wheelCategories} />
    </main>
  );
}
