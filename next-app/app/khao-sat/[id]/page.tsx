import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { parseSurveyQuestions } from "@/lib/survey";
import { createServiceServerClient } from "@/lib/supabase/server";
import { submitSurveyAction } from "./actions";
import styles from "../survey.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Khảo sát chất lượng tư vấn | Clow Cat Patronus",
  description: "Chia sẻ trải nghiệm sau buổi tư vấn để chúng tôi phục vụ bạn tốt hơn.",
  robots: { index: false, follow: false },
};

export default async function SurveyPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ status?: string }>;
}) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const supabase = createServiceServerClient();
  if (!supabase) notFound();
  const { data: survey, error } = await supabase
    .from("service_surveys")
    .select("id,title,intro,questions")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  const questions = parseSurveyQuestions(survey?.questions);
  if (error || !survey || !questions) {
    console.error("service survey unavailable", { code: error?.code, message: error?.message, found: Boolean(survey), validQuestions: Boolean(questions) });
    notFound();
  }
  const { status } = await searchParams;
  const errorMessage = status === "invalid"
    ? "Vui lòng điền tên, chọn 1–5 sao và trả lời đầy đủ các câu hỏi."
    : status === "closed"
      ? "Khảo sát này đã đóng. Vui lòng liên hệ người tư vấn."
      : status === "error"
        ? "Chưa gửi được đánh giá. Vui lòng thử lại sau ít phút."
        : status === "limited"
          ? "Bạn đã gửi nhiều đánh giá trong thời gian ngắn. Vui lòng thử lại sau 15 phút."
        : null;

  return (
    <main className={styles.page}>
      <div className={styles.ambient} aria-hidden="true">✦</div>
      <header className={styles.header}>
        <Link href="/" className={styles.brand}>
          <Image src="/assets/images/logo2.png" width={46} height={46} alt="Clow Cat Patronus" />
          <span>Clow Cat Patronus</span>
        </Link>
        <span className={styles.headerCaption}>Lắng nghe để tốt hơn</span>
      </header>
      <div className={styles.container}>
        <div className={styles.intro}>
          <span className={styles.kicker}>PHẢN HỒI SAU BUỔI TƯ VẤN</span>
          <h1>{survey.title}</h1>
          <p>{survey.intro}</p>
          <div className={styles.meta}><span>✦ &nbsp; {questions.length} câu hỏi</span><span>✦ &nbsp; Khoảng 3 phút</span></div>
        </div>
        <form className={styles.form} action={submitSurveyAction}>
          <input type="hidden" name="survey_id" value={survey.id} />
          <div className={styles.honeypot} aria-hidden="true">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
          <div className={styles.sectionHead}><span>01</span><div><h2>Trải nghiệm của em</h2><p>Mỗi chia sẻ đều giúp anh hoàn thiện buổi tư vấn tiếp theo.</p></div></div>
          <label className={styles.field}>Tên của em <span>*</span>
            <input name="respondent_name" autoComplete="name" maxLength={120} placeholder="Em muốn được gọi là…" required />
          </label>
          <fieldset className={styles.ratingField}>
            <legend>Em đánh giá tổng thể buổi tư vấn bao nhiêu sao? <span>*</span></legend>
            <p>1 sao = cần cải thiện nhiều · 5 sao = rất hài lòng</p>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating}>
                  <input type="radio" name="rating" value={rating} required />
                  <span aria-hidden="true">★</span>
                  <small>{rating} sao</small>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.sectionHead}><span>02</span><div><h2>Điều em muốn chia sẻ</h2><p>Cứ viết thật lòng, không có câu trả lời đúng hay sai.</p></div></div>
          {questions.map((question, index) => (
            <label className={styles.question} key={question.id}>
              <span className={styles.questionNumber}>CÂU {String(index + 1).padStart(2, "0")}</span>
              <strong>{question.prompt}</strong>
              <textarea name={`answer_${question.id}`} maxLength={2000} rows={4} placeholder="Em chia sẻ suy nghĩ của mình ở đây…" required />
            </label>
          ))}
          <div className={styles.formFooter}>
            <p>Phản hồi của em chỉ được dùng để cải thiện chất lượng tư vấn và được lưu trong hệ thống quản trị.</p>
            <button type="submit">Gửi đánh giá của em <span aria-hidden="true">↗</span></button>
          </div>
        </form>
        <p className={styles.bottomNote}>Clow Cat Patronus · Đồng hành cùng hành trình hiểu mình</p>
      </div>
    </main>
  );
}
