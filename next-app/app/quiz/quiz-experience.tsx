"use client";

import { useMemo, useState } from "react";
import styles from "./quiz.module.css";
import { landingPlainText } from "@/lib/landing-text";
import type { PublicPackage } from "@/lib/packages";
import { QUIZ_QUESTIONS, recommendPackages } from "@/lib/package-quiz";

function formatPrice(value: number, currency: string) {
  const suffix = currency.toUpperCase() === "VND" ? "đ" : ` ${currency.toUpperCase()}`;
  return `${value.toLocaleString("vi-VN")}${suffix}`;
}

export default function QuizExperience({ packages }: { packages: PublicPackage[] }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const question = QUIZ_QUESTIONS[step];
  const selected = question ? answers[question.id] : "";
  const recommendations = useMemo(
    () => recommendPackages(packages, answers),
    [answers, packages],
  );
  const recommendation = recommendations[0];
  const progress = finished ? 100 : Math.round(((step + 1) / QUIZ_QUESTIONS.length) * 100);

  function next() {
    if (!selected) return;
    if (step === QUIZ_QUESTIONS.length - 1) {
      setFinished(true);
      return;
    }
    setStep((value) => value + 1);
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setFinished(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.cosmicField} aria-hidden="true">
        {['1', '2', '3', '4', '5', '6', '7', '8', '9', '11/2', '22/4', '33/6'].map((number) => (
          <span key={number}>{number}</span>
        ))}
        <i /><i /><i />
      </div>
      <header className={styles.navbar}>
        <a className={styles.brand} href="/" aria-label="Clow Cat Patronus · Trang chủ">
          <img src="/assets/images/logo.png" alt="" width="52" height="52" />
          <span>Clow Cat Patronus</span>
        </a>
        <button
          aria-expanded={menuOpen}
          aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
          className={styles.menuButton}
          onClick={() => setMenuOpen((value) => !value)}
          type="button"
        >
          <span /><span /><span />
        </button>
        <nav className={`${styles.navLinks}${menuOpen ? ` ${styles.navLinksOpen}` : ""}`} aria-label="Điều hướng chính">
          <a href="/#about">Về Chúng Tôi</a>
          <a href="/#benefits">Bạn Nhận Được Gì?</a>
          <a href="/#packages">Gói Tư Vấn</a>
          <a href="/blog">Giải Mã Nhân Số Học</a>
          <a className={styles.activeNav} href="/quiz" aria-current="page">Quiz</a>
          <a className={styles.navCta} href="/#contact">Đặt Lịch Ngay</a>
        </nav>
      </header>

      <main className={styles.main}>
        <section className={styles.intro}>
          <div className={styles.introCopy}>
            <span className={styles.kicker}>Quiz chọn gói · khoảng 3–4 phút</span>
            <h1>Gói tư vấn nào <em>thực sự hợp</em> với bạn?</h1>
            <p>
              Mười hai câu hỏi giúp bạn xác định phạm vi và độ sâu phù hợp với
              nhu cầu hiện tại — không cần nhập tên, email hay ngày sinh.
            </p>
          </div>
          <div className={styles.trustNotes} aria-label="Thông tin về bài quiz">
            <span><strong>12</strong>Câu hỏi</span>
            <span><strong>01</strong>Gợi ý chính</span>
            <span><strong>0</strong>Dữ liệu cá nhân</span>
          </div>
        </section>

        <section className={styles.quizShell} aria-live="polite">
          <div className={styles.progressHeader}>
            <span>{finished ? "Đã hoàn thành" : `Câu ${step + 1} / ${QUIZ_QUESTIONS.length}`}</span>
            <strong>{progress}%</strong>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>

          {!finished && question ? (
            <div className={styles.questionLayout} key={question.id}>
              <aside className={styles.questionAside}>
                <span className={styles.questionNumber}>{String(step + 1).padStart(2, "0")}</span>
                <p>{question.eyebrow}</p>
                <small>{question.hint}</small>
              </aside>
              <div className={styles.questionPanel}>
                <h2>{question.question}</h2>
                <div className={styles.options} role="radiogroup" aria-label={question.question}>
                  {question.options.map((option) => {
                    const active = selected === option.id;
                    return (
                      <button
                        aria-checked={active}
                        className={`${styles.option}${active ? ` ${styles.optionSelected}` : ""}`}
                        key={option.id}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                        role="radio"
                        type="button"
                      >
                        <span className={styles.optionMarker}>{active ? "✓" : ""}</span>
                        <span><strong>{option.label}</strong><small>{option.description}</small></span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.backButton}
                    disabled={step === 0}
                    onClick={() => setStep((value) => Math.max(0, value - 1))}
                    type="button"
                  >
                    ← Quay lại
                  </button>
                  <button className={styles.nextButton} disabled={!selected} onClick={next} type="button">
                    {step === QUIZ_QUESTIONS.length - 1 ? "Xem gói phù hợp" : "Câu tiếp theo"} →
                  </button>
                </div>
              </div>
            </div>
          ) : recommendation ? (
            <div className={styles.result} key="quiz-result">
              <div className={styles.resultLead}>
                <span className={styles.resultMark}>✦</span>
                <p>Kết quả dành cho bạn</p>
                <h2>{landingPlainText(recommendation.item.name)}</h2>
                <p className={styles.resultReason}>{recommendation.reason}</p>
              </div>
              <div className={styles.resultPackage}>
                {recommendation.item.badge ? <span>{landingPlainText(recommendation.item.badge)}</span> : <span>Phù hợp nhất</span>}
                <div className={styles.resultPrice}>
                  <strong>{formatPrice(recommendation.item.onlinePrice, recommendation.item.currency)}</strong>
                  <small>{recommendation.item.unit}</small>
                </div>
                <ul>
                  {recommendation.item.features.slice(0, 5).map((feature, index) => (
                    <li key={`${recommendation.item.code}-${index}`}>✦ <span>{landingPlainText(feature)}</span></li>
                  ))}
                </ul>
                <a className={styles.primaryResultCta} href={`/?package=${encodeURIComponent(recommendation.item.code)}#contact`}>
                  Chọn gói này và đặt lịch
                </a>
              </div>

              {recommendations.length > 1 ? (
                <div className={styles.alternatives}>
                  <div><span>Gợi ý kế tiếp</span><strong>{landingPlainText(recommendations[1].item.name)}</strong></div>
                  <a href="/#packages">So sánh tất cả gói →</a>
                </div>
              ) : null}

              <button className={styles.restartButton} onClick={restart} type="button">↻ Làm lại Quiz</button>
              <p className={styles.disclaimer}>Kết quả mang tính gợi ý theo nhu cầu bạn vừa chọn. Nếu còn phân vân, Clow Cat sẽ giúp bạn xác nhận lại trước khi đặt lịch.</p>
            </div>
          ) : (
            <div className={styles.noPackages}>
              <span>✦</span>
              <h2>Các gói đang được cập nhật</h2>
              <p>Vui lòng quay lại sau hoặc nhắn Clow Cat để được gợi ý trực tiếp.</p>
              <a href="/#contact">Liên hệ tư vấn</a>
            </div>
          )}
        </section>

        <section className={styles.methodNote}>
          <span>01</span><p><strong>Phạm vi</strong> Bạn muốn giải quyết một chủ đề hay nhìn toàn cảnh?</p>
          <span>02</span><p><strong>Độ sâu</strong> Bạn cần định hướng nhanh, chỉ số cốt lõi hay bản đồ dài hạn?</p>
          <span>03</span><p><strong>Góc nhìn</strong> Một hệ thống hay nhiều phương pháp cùng soi chiếu?</p>
        </section>
      </main>

      <footer className={styles.footer}>
        <span>Clow Cat Patronus · Hiểu mình hơn, sống đúng hướng hơn.</span>
        <nav aria-label="Liên kết cuối trang"><a href="/">Trang chủ</a><a href="/blog">Bài viết</a><a href="/#contact">Liên hệ</a></nav>
      </footer>
    </div>
  );
}
