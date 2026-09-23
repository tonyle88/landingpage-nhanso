import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { DEFAULT_SURVEY_TITLE, parseSurveyQuestions, surveyCopyWithDefaults } from "@/lib/survey";
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
    .select("id,title,intro,questions,display_copy")
    .eq("id", id)
    .eq("active", true)
    .maybeSingle();
  const questions = parseSurveyQuestions(survey?.questions);
  if (error || !survey || !questions) {
    console.error("service survey unavailable", { code: error?.code, message: error?.message, found: Boolean(survey), validQuestions: Boolean(questions) });
    notFound();
  }
  const copy = surveyCopyWithDefaults(survey.display_copy);
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
        <span className={styles.headerCaption}>{copy.headerCaption}</span>
      </header>
      <div className={styles.container}>
        <div className={styles.intro}>
          <span className={styles.kicker}>{copy.eyebrow}</span>
          <h1 className={survey.title === DEFAULT_SURVEY_TITLE ? styles.singleLineTitle : undefined}>{survey.title}</h1>
          <p>{survey.intro}</p>
          <div className={styles.meta}><span>✦ &nbsp; {questions.length} {copy.questionCountUnit}</span><span>✦ &nbsp; {copy.durationText}</span></div>
        </div>
        <form className={styles.form} action={submitSurveyAction}>
          <input type="hidden" name="survey_id" value={survey.id} />
          <div className={styles.honeypot} aria-hidden="true">
            <label>Website <input name="website" tabIndex={-1} autoComplete="off" /></label>
          </div>
          {errorMessage ? <p className={styles.error} role="alert">{errorMessage}</p> : null}
          <div className={styles.sectionHead}><span>01</span><div><h2>{copy.experienceTitle}</h2><p>{copy.experienceDescription}</p></div></div>
          <label className={styles.field}>{copy.nameLabel} <span>*</span>
            <input name="respondent_name" autoComplete="name" maxLength={120} placeholder={copy.namePlaceholder} required />
          </label>
          <fieldset className={styles.ratingField}>
            <legend>{copy.ratingLabel} <span>*</span></legend>
            <p>{copy.ratingHint}</p>
            <div className={styles.stars}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <label key={rating}>
                  <input type="radio" name="rating" value={rating} required />
                  <span aria-hidden="true">★</span>
                  <small>{rating} {copy.starUnit}</small>
                </label>
              ))}
            </div>
          </fieldset>
          <div className={styles.sectionHead}><span>02</span><div><h2>{copy.sharingTitle}</h2><p>{copy.sharingDescription}</p></div></div>
          {questions.map((question, index) => (
            <label className={styles.question} key={question.id}>
              <span className={styles.questionNumber}>CÂU {String(index + 1).padStart(2, "0")}</span>
              <strong>{question.prompt}</strong>
              <textarea name={`answer_${question.id}`} maxLength={2000} rows={4} placeholder={copy.answerPlaceholder} required />
            </label>
          ))}
          <div className={styles.formFooter}>
            <p>{copy.privacyNote}</p>
            <button type="submit">{copy.submitLabel} <span aria-hidden="true">↗</span></button>
          </div>
        </form>
        <p className={styles.bottomNote}>{copy.bottomNote}</p>
      </div>
    </main>
  );
}
