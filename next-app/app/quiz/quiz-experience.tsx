"use client";

import { type CSSProperties, useEffect, useMemo, useRef, useState } from "react";
import styles from "./quiz.module.css";
import { landingPlainText } from "@/lib/landing-text";
import type { PublicPackage } from "@/lib/packages";
import { QUIZ_QUESTIONS, recommendPackages, type QuizQuestion } from "@/lib/package-quiz";
import { ClowGlint } from "@/components/ui/clow-glint";
import { SELF_DISCOVERY_TOOLS, type SelfDiscoveryToolSlug } from "@/lib/self-discovery-tools";

const mysticNumbers = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "11/2", "22/4", "33/6", "4", "5", "6"];

const questionThemes = [
  { accent: "#f4c75b", rgb: "244 199 91", deep: "#6d3c0c" },
  { accent: "#ff914d", rgb: "255 145 77", deep: "#6a2713" },
  { accent: "#75bfff", rgb: "117 191 255", deep: "#153d72" },
  { accent: "#ee6bb6", rgb: "238 107 182", deep: "#681c53" },
  { accent: "#65d9d0", rgb: "101 217 208", deep: "#105951" },
  { accent: "#c58aff", rgb: "197 138 255", deep: "#4d2772" },
  { accent: "#dbe95c", rgb: "219 233 92", deep: "#596313" },
  { accent: "#73db78", rgb: "115 219 120", deep: "#1e612b" },
  { accent: "#ff786d", rgb: "255 120 109", deep: "#762c26" },
  { accent: "#5fd8f2", rgb: "95 216 242", deep: "#145b6c" },
  { accent: "#8f91ff", rgb: "143 145 255", deep: "#35377a" },
  { accent: "#ff9fbd", rgb: "255 159 189", deep: "#773149" },
] as const;

type TransitionDirection = "forward" | "back";
type QuestionThemeStyle = CSSProperties & {
  "--question-accent": string;
  "--question-rgb": string;
  "--question-deep": string;
};

function formatPrice(value: number, currency: string) {
  const suffix = currency.toUpperCase() === "VND" ? "đ" : ` ${currency.toUpperCase()}`;
  return `${value.toLocaleString("vi-VN")}${suffix}`;
}

function hexToRgbChannels(value: string, fallback: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return fallback;
  return `${Number.parseInt(match[1], 16)} ${Number.parseInt(match[2], 16)} ${Number.parseInt(match[3], 16)}`;
}

function darkenHex(value: string, fallback: string) {
  const match = /^#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(value);
  if (!match) return fallback;
  const channels = match.slice(1).map((channel) => Math.round(Number.parseInt(channel, 16) * .4));
  return `#${channels.map((channel) => channel.toString(16).padStart(2, "0")).join("")}`;
}

type QuizHubIconName = "package" | SelfDiscoveryToolSlug;

function QuizHubIcon({ name }: { name: QuizHubIconName }) {
  if (name === "package") {
    return (
      <svg aria-hidden="true" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="31" />
        <path d="M48 17v10M48 69v10M17 48h10M69 48h10" />
        <path d="m48 30 8 18-8 18-8-18 8-18Z" />
        <circle cx="48" cy="48" r="5" />
      </svg>
    );
  }
  if (name === "vakad") {
    return (
      <svg aria-hidden="true" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r="8" />
        <circle cx="48" cy="17" r="7" /><circle cx="79" cy="48" r="7" />
        <circle cx="48" cy="79" r="7" /><circle cx="17" cy="48" r="7" />
        <path d="M48 24v16M72 48H56M48 56v16M24 48h16" />
        <path d="m33 33 15 15 15-15M33 63l15-15 15 15" />
      </svg>
    );
  }
  if (name === "ngon-ngu-yeu-thuong") {
    return (
      <svg aria-hidden="true" viewBox="0 0 96 96">
        <path d="M48 75S19 58 19 36c0-11 8-18 18-18 6 0 10 3 11 8 2-5 6-8 12-8 10 0 17 7 17 18 0 22-29 39-29 39Z" />
        <path d="M48 28v34M31 42h34" />
        <circle cx="48" cy="13" r="3" /><circle cx="82" cy="43" r="3" />
        <circle cx="65" cy="77" r="3" /><circle cx="31" cy="77" r="3" /><circle cx="14" cy="43" r="3" />
      </svg>
    );
  }
  return (
    <svg aria-hidden="true" viewBox="0 0 96 96">
      <circle cx="48" cy="48" r="32" /><circle cx="48" cy="48" r="9" />
      <path d="M48 16v23M48 57v23M16 48h23M57 48h23M25 25l16 16M55 55l16 16M71 25 55 41M41 55 25 71" />
      <circle cx="48" cy="16" r="3" /><circle cx="80" cy="48" r="3" />
      <circle cx="48" cy="80" r="3" /><circle cx="16" cy="48" r="3" />
    </svg>
  );
}

const PACKAGE_QUIZ_CARD = {
  slug: "chon-goi",
  number: "01",
  title: "Trắc nghiệm chọn gói",
  subtitle: "Xác định hình thức tư vấn phù hợp với nhu cầu hiện tại",
  meta: "12 câu · khoảng 3–4 phút",
  accent: "#f28b52",
  meaning: "Làm rõ điều bạn đang vướng, mức độ chuyên sâu mong muốn và loại góc nhìn bạn cần trước khi đặt lịch.",
  measures: "Nhu cầu · phạm vi · độ sâu",
  outcome: "Một gói phù hợp nhất kèm lý do và lựa chọn kế tiếp.",
} as const;

export default function QuizExperience({
  packages,
  questions = QUIZ_QUESTIONS,
  mode = "hub",
}: {
  packages: PublicPackage[];
  questions?: QuizQuestion[];
  mode?: "hub" | "assessment";
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<TransitionDirection | null>(null);
  const [entryDirection, setEntryDirection] = useState<TransitionDirection>("forward");
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const question = questions[step];
  const selected = question ? answers[question.id] : "";
  const recommendations = useMemo(
    () => recommendPackages(packages, answers, questions),
    [answers, packages, questions],
  );
  const recommendation = recommendations[0];
  const packageConclusion = recommendation ? [
    `${landingPlainText(recommendation.item.name)} là lựa chọn khớp nhất với phạm vi, độ sâu và ưu tiên bạn vừa thể hiện trong bài trắc nghiệm.`,
    recommendation.reason,
    `Giá trị chính bạn sẽ nhận được gồm ${recommendation.item.features.slice(0, 2).map(landingPlainText).join(" và ").toLowerCase()}.`,
    recommendations[1] ? `${landingPlainText(recommendations[1].item.name)} là phương án kế tiếp nếu bạn muốn thay đổi phạm vi hoặc cách tiếp cận.` : "Bạn có thể trao đổi trực tiếp với Clow Cat nếu muốn điều chỉnh phạm vi trước buổi tư vấn.",
    "Trước khi đặt lịch, hãy xác định một câu hỏi quan trọng nhất bạn muốn làm rõ để buổi tư vấn đi đúng trọng tâm ngay từ đầu.",
  ] : [];
  const progress = finished ? 100 : Math.round(((step + 1) / questions.length) * 100);
  const mysticNumber = mysticNumbers[step] || "∞";
  const fallbackTheme = questionThemes[step % questionThemes.length];
  const accent = question?.color || fallbackTheme.accent;
  const questionThemeStyle: QuestionThemeStyle = {
    "--question-accent": accent,
    "--question-rgb": hexToRgbChannels(accent, fallbackTheme.rgb),
    "--question-deep": darkenHex(accent, fallbackTheme.deep),
  };
  const isHub = mode === "hub";

  useEffect(() => () => {
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
  }, []);

  function transition(direction: TransitionDirection, complete: () => void) {
    if (transitionDirection) return;
    setTransitionDirection(direction);
    transitionTimer.current = setTimeout(() => {
      setEntryDirection(direction);
      complete();
      setTransitionDirection(null);
      transitionTimer.current = null;
    }, 380);
  }

  function next() {
    if (!selected || transitionDirection) return;
    if (step === questions.length - 1) {
      transition("forward", () => setFinished(true));
      return;
    }
    transition("forward", () => setStep((value) => value + 1));
  }

  function previous() {
    if (step === 0 || transitionDirection) return;
    transition("back", () => setStep((value) => Math.max(0, value - 1)));
  }

  function restart() {
    setAnswers({});
    setStep(0);
    setEntryDirection("forward");
    setTransitionDirection(null);
    setFinished(false);
  }

  return (
    <div className={styles.page}>
      <div className={styles.cosmicField} aria-hidden="true">
        {mysticNumbers.slice(0, 12).map((number, index) => (
          <span key={`${number}-${index}`}>{number}</span>
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
        {isHub ? (
          <>
            <section className={`${styles.intro} ${styles.hubIntro}`}>
              <div className={styles.introCopy}>
                <span className={styles.kicker}>4 công cụ tự khám phá · miễn phí</span>
                <h1>Chọn một cánh cửa để <em>hiểu mình rõ hơn</em></h1>
                <p>
                  Mỗi công cụ soi chiếu một khía cạnh khác nhau: nhu cầu tư vấn, cách tiếp nhận
                  thông tin, cách cảm nhận tình yêu và mức cân bằng trong tám vùng cuộc sống.
                  Chọn đúng khối bên dưới để bắt đầu bài riêng của bạn.
                </p>
              </div>
              <div className={styles.hubMandala} aria-hidden="true">
                <span>4</span><small>góc nhìn</small>
                <i /><i /><i /><i />
              </div>
            </section>

            <section className={`${styles.toolGateway} ${styles.hubGateway}`} aria-labelledby="self-discovery-tools">
              <div className={styles.toolGatewayHeading}>
                <span><ClowGlint size="xs" /> Kho công cụ hiểu mình</span>
                <h2 id="self-discovery-tools">Bốn bài trắc nghiệm, bốn lớp thông tin riêng biệt</h2>
                <p>Mỗi khối mở một trang độc lập, có hướng dẫn, câu hỏi, biểu đồ và luận giải ngay trên trình duyệt. Không yêu cầu tên, email hoặc ngày sinh.</p>
              </div>
              <div className={styles.toolCards}>
                <a href="/quiz/chon-goi" style={{ "--tool-card-accent": PACKAGE_QUIZ_CARD.accent } as CSSProperties}>
                  <span className={styles.toolIcon}><QuizHubIcon name="package" /></span>
                  <small>{PACKAGE_QUIZ_CARD.meta}</small>
                  <h3>{PACKAGE_QUIZ_CARD.title}</h3>
                  <p>{PACKAGE_QUIZ_CARD.meaning}</p>
                  <ul><li>{PACKAGE_QUIZ_CARD.measures}</li><li>{PACKAGE_QUIZ_CARD.outcome}</li></ul>
                  <strong>Bắt đầu chọn gói →</strong>
                </a>
                {SELF_DISCOVERY_TOOLS.map((tool) => (
                  <a href={`/quiz/cong-cu/${tool.slug}`} key={tool.slug} style={{ "--tool-card-accent": tool.accent } as CSSProperties}>
                    <span className={styles.toolIcon}><QuizHubIcon name={tool.slug} /></span>
                    <small>{tool.meta}</small>
                    <h3>{tool.title}</h3>
                    <p>{tool.meaning}</p>
                    <ul><li>{tool.measures}</li><li>{tool.outcome}</li></ul>
                    <strong>Khám phá công cụ →</strong>
                  </a>
                ))}
              </div>
            </section>
          </>
        ) : (
          <>
        <section className={styles.intro}>
          <div className={styles.introCopy}>
            <span className={styles.kicker}>Quiz chọn gói · khoảng 3–4 phút</span>
            <h1>Trắc nghiệm <em>nhân số học</em> để biết bạn đang cần gì?</h1>
            <p>
              {questions.length} câu hỏi chuyên sâu giúp bạn xác định phạm vi và độ sâu phù hợp với
              nhu cầu hiện tại — không cần nhập tên, email hay ngày sinh.
            </p>
          </div>
          <div className={styles.mysticPanel}>
            <div className={styles.mysticPortal} aria-hidden="true">
              <div className={styles.portalRingOuter} />
              <div className={styles.portalRingMiddle} />
              <div className={styles.portalRingInner} />
              <span className={styles.portalNumberOne}>1</span>
              <span className={styles.portalNumberThree}>3</span>
              <span className={styles.portalNumberSix}>6</span>
              <span className={styles.portalNumberNine}>9</span>
              <span className={styles.portalMaster}>11/2 · 22/4 · 33/6</span>
              <div className={styles.portalCore}><small>Mở cổng</small><strong>{questions.length}</strong><span>tầng nhu cầu</span></div>
            </div>
            <div className={styles.trustNotes} aria-label="Thông tin về bài quiz">
              <span><strong>{questions.length}</strong>Câu hỏi</span>
              <span><strong>01</strong>Gợi ý chính</span>
              <span><strong>0</strong>Dữ liệu cá nhân</span>
            </div>
          </div>
        </section>

        <section className={styles.quizShell} aria-live="polite" style={questionThemeStyle}>
          <div className={styles.progressHeader}>
            <span>{finished ? "Đã hoàn thành" : `Câu ${step + 1} / ${questions.length}`}</span>
            <strong>{progress}%</strong>
          </div>
          <div className={styles.progressTrack} aria-hidden="true">
            <span style={{ width: `${progress}%` }} />
          </div>
          <div
            className={styles.constellationProgress}
            aria-label={`Tiến độ ${progress}%`}
            style={{ gridTemplateColumns: `repeat(${questions.length}, minmax(0, 1fr))` }}
          >
            {questions.map((item, index) => {
              const complete = finished || index < step;
              const active = !finished && index === step;
              return (
                <span
                  className={`${complete ? styles.constellationComplete : ""}${active ? ` ${styles.constellationActive}` : ""}`}
                  key={item.id}
                >
                  <i>{mysticNumbers[index]}</i>
                </span>
              );
            })}
          </div>

          {!finished && question ? (
            <div
              className={`${styles.questionLayout} ${entryDirection === "back" ? styles.questionEnterBack : styles.questionEnterForward}${transitionDirection ? ` ${transitionDirection === "back" ? styles.questionExitBack : styles.questionExitForward}` : ""}`}
              key={question.id}
            >
              <aside className={styles.questionAside}>
                <span className={styles.questionNumber}>
                  <strong>{mysticNumber}</strong>
                  <small>Câu {String(step + 1).padStart(2, "0")}</small>
                </span>
                <span className={styles.numberFrequency}>Tần số {mysticNumber}</span>
                <p>{question.eyebrow}</p>
                <small>{question.hint}</small>
              </aside>
              <div className={styles.questionPanel}>
                <div className={styles.mysticPrompt}>
                  <ClowGlint size="xs" />
                  <small>Chọn bằng cảm nhận đầu tiên của bạn</small>
                  <ClowGlint size="xs" />
                </div>
                <h2>{question.question}</h2>
                <div className={styles.options} role="radiogroup" aria-label={question.question}>
                  {question.options.map((option, optionIndex) => {
                    const active = selected === option.id;
                    return (
                      <button
                        aria-checked={active}
                        className={`${styles.option}${active ? ` ${styles.optionSelected}` : ""}`}
                        disabled={Boolean(transitionDirection)}
                        key={option.id}
                        onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.id }))}
                        role="radio"
                        type="button"
                      >
                        <span className={styles.optionMarker}>{active ? "✓" : String(optionIndex + 1).padStart(2, "0")}</span>
                        <span><strong>{option.label}</strong><small>{option.description}</small></span>
                      </button>
                    );
                  })}
                </div>
                <div className={styles.actions}>
                  <button
                    className={styles.backButton}
                    disabled={step === 0 || Boolean(transitionDirection)}
                    onClick={previous}
                    type="button"
                  >
                    ← Quay lại
                  </button>
                  <button className={styles.nextButton} disabled={!selected || Boolean(transitionDirection)} onClick={next} type="button">
                    {step === questions.length - 1 ? "Xem gói phù hợp" : "Câu tiếp theo"} →
                  </button>
                </div>
              </div>
            </div>
          ) : recommendation ? (
            <div className={styles.result} key="quiz-result">
              <div className={styles.resultLead}>
                <span className={styles.resultMark}><ClowGlint size="lg" /></span>
                <p>Kết quả dành cho bạn</p>
                <h2>{landingPlainText(recommendation.item.name)}</h2>
                <p className={styles.resultReason}>{recommendation.reason}</p>
                <ol className={styles.resultConclusion}>
                  {packageConclusion.map((line, index) => <li key={`${index}-${line}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{line}</p></li>)}
                </ol>
              </div>
              <div className={styles.resultPackage}>
                {recommendation.item.badge ? <span>{landingPlainText(recommendation.item.badge)}</span> : <span>Phù hợp nhất</span>}
                <div className={styles.resultPrice}>
                  <strong>{formatPrice(recommendation.item.onlinePrice, recommendation.item.currency)}</strong>
                  <small>{recommendation.item.unit}</small>
                </div>
                <ul>
                  {recommendation.item.features.slice(0, 5).map((feature, index) => (
                    <li key={`${recommendation.item.code}-${index}`}>
                      <ClowGlint size="xs" />
                      <span>{landingPlainText(feature)}</span>
                    </li>
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
              <ClowGlint size="xl" />
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
          </>
        )}
      </main>

      <footer className={styles.footer}>
        <span>Clow Cat Patronus · Hiểu mình hơn, sống đúng hướng hơn.</span>
        <nav aria-label="Liên kết cuối trang"><a href="/">Trang chủ</a><a href="/blog">Bài viết</a><a href="/#contact">Liên hệ</a></nav>
      </footer>
    </div>
  );
}
