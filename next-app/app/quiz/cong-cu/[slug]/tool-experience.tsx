"use client";

import { useMemo, useState, type ReactNode } from "react";
import styles from "./tool.module.css";
import { ClowGlint } from "@/components/ui/clow-glint";
import {
  LOVE_LANGUAGE_QUESTIONS,
  LOVE_LANGUAGES,
  scoreLifeWheel,
  scoreLoveLanguages,
  scoreVakad,
  SELF_DISCOVERY_TOOLS,
  VAKAD_DIMENSIONS,
  VAKAD_QUESTIONS,
  WHEEL_CATEGORIES,
  type LoveLanguageCode,
  type SelfDiscoveryToolSlug,
  type VakadDimension,
} from "@/lib/self-discovery-tools";

type ChartItem = { key: string; label: string; value: number; color: string };

function ToolHeader({ slug }: { slug: SelfDiscoveryToolSlug }) {
  const [open, setOpen] = useState(false);
  return (
    <header className={styles.navbar}>
      <a className={styles.brand} href="/" aria-label="Clow Cat Patronus · Trang chủ">
        <img src="/assets/images/logo.png" alt="" width="52" height="52" />
        <span>Clow Cat Patronus</span>
      </a>
      <button className={styles.menuButton} onClick={() => setOpen((value) => !value)} type="button" aria-expanded={open} aria-label={open ? "Đóng menu" : "Mở menu"}>
        <span /><span /><span />
      </button>
      <nav className={`${styles.navLinks}${open ? ` ${styles.navLinksOpen}` : ""}`} aria-label="Điều hướng chính">
        <a href="/">Trang chủ</a>
        <a href="/quiz">Quiz chọn gói</a>
        {SELF_DISCOVERY_TOOLS.map((tool) => (
          <a className={tool.slug === slug ? styles.activeNav : ""} href={`/quiz/cong-cu/${tool.slug}`} key={tool.slug}>{tool.title}</a>
        ))}
      </nav>
    </header>
  );
}

function Progress({ current, total, label }: { current: number; total: number; label: string }) {
  const value = Math.round((current / total) * 100);
  return (
    <div className={styles.progress}>
      <div><span>{label}</span><strong>{value}%</strong></div>
      <i aria-hidden="true"><span style={{ width: `${value}%` }} /></i>
    </div>
  );
}

function Navigation({
  canContinue,
  first,
  final,
  onBack,
  onNext,
}: {
  canContinue: boolean;
  first: boolean;
  final: boolean;
  onBack: () => void;
  onNext: () => void;
}) {
  return (
    <div className={styles.actions}>
      <button className={styles.secondaryButton} disabled={first} onClick={onBack} type="button">← Quay lại</button>
      <button className={styles.primaryButton} disabled={!canContinue} onClick={onNext} type="button">
        {final ? "Xem biểu đồ & luận giải" : "Tiếp tục"} →
      </button>
    </div>
  );
}

function RadarChart({ items, max }: { items: ChartItem[]; max: number }) {
  const center = 210;
  const radius = 142;
  const point = (index: number, ratio: number) => {
    const angle = -Math.PI / 2 + (Math.PI * 2 * index) / items.length;
    return [center + Math.cos(angle) * radius * ratio, center + Math.sin(angle) * radius * ratio] as const;
  };
  const polygon = (ratio: number) => items.map((_, index) => point(index, ratio).join(",")).join(" ");
  const valuePoints = items.map((item, index) => point(index, Math.max(0, Math.min(1, item.value / max))));

  return (
    <div className={styles.radarWrap}>
      <svg className={styles.radar} role="img" aria-label="Biểu đồ kết quả" viewBox="0 0 420 420">
        {[.25, .5, .75, 1].map((ratio) => <polygon className={styles.radarGrid} key={ratio} points={polygon(ratio)} />)}
        {items.map((item, index) => {
          const [x, y] = point(index, 1);
          const [labelX, labelY] = point(index, 1.18);
          return (
            <g key={item.key}>
              <line className={styles.radarAxis} x1={center} y1={center} x2={x} y2={y} />
              <text className={styles.radarLabel} x={labelX} y={labelY}>{item.label}</text>
            </g>
          );
        })}
        <polygon className={styles.radarValue} points={valuePoints.map(([x, y]) => `${x},${y}`).join(" ")} />
        {valuePoints.map(([x, y], index) => <circle className={styles.radarPoint} cx={x} cy={y} key={items[index].key} r="6" style={{ fill: items[index].color }} />)}
      </svg>
    </div>
  );
}

function ScoreBars({ items, max, suffix = " điểm" }: { items: ChartItem[]; max: number; suffix?: string }) {
  return (
    <div className={styles.scoreBars}>
      {items.map((item) => (
        <div className={styles.scoreBar} key={item.key}>
          <div><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}{suffix}</strong></div>
          <b aria-hidden="true"><span style={{ width: `${Math.min(100, (item.value / max) * 100)}%`, background: item.color }} /></b>
        </div>
      ))}
    </div>
  );
}

function ToolIntro({
  slug,
  title,
  description,
  formula,
  notes,
  onStart,
}: {
  slug: SelfDiscoveryToolSlug;
  title: string;
  description: string;
  formula: string;
  notes: string[];
  onStart: () => void;
}) {
  const tool = SELF_DISCOVERY_TOOLS.find((item) => item.slug === slug)!;
  return (
    <section className={styles.startCard} style={{ "--tool-accent": tool.accent } as React.CSSProperties}>
      <div className={styles.startCopy}>
        <span className={styles.eyebrow}><ClowGlint size="xs" /> Công cụ hiểu mình · {tool.meta}</span>
        <h1>{title}</h1>
        <p>{description}</p>
        <div className={styles.formula}><small>Công thức từ workbook mẫu</small><strong>{formula}</strong></div>
        <button className={styles.primaryButton} onClick={onStart} type="button">Bắt đầu khám phá →</button>
      </div>
      <div className={styles.startOrbit} aria-hidden="true">
        <span>{tool.number}</span><i /><i /><i />
      </div>
      <ul className={styles.startNotes}>{notes.map((note) => <li key={note}><ClowGlint size="xs" />{note}</li>)}</ul>
    </section>
  );
}

function ResultShell({ children, onRestart }: { children: ReactNode; onRestart: () => void }) {
  return (
    <section className={styles.resultShell}>
      {children}
      <div className={styles.resultFooter}>
        <p>Kết quả phản ánh câu trả lời ở thời điểm hiện tại và dùng để tự quan sát, không phải chẩn đoán tâm lý hay y khoa.</p>
        <button className={styles.secondaryButton} onClick={onRestart} type="button">↻ Làm lại bài</button>
      </div>
    </section>
  );
}

function VakadAssessment() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [rankings, setRankings] = useState<Record<string, VakadDimension[]>>({});
  const question = VAKAD_QUESTIONS[step];
  const ranking = rankings[question?.id] || [];

  const result = useMemo(() => scoreVakad(rankings), [rankings]);
  const items = (Object.keys(VAKAD_DIMENSIONS) as VakadDimension[]).map((key) => ({
    key,
    label: VAKAD_DIMENSIONS[key].shortLabel,
    value: result[key],
    color: VAKAD_DIMENSIONS[key].color,
  }));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  const spread = ordered[0].value - ordered[ordered.length - 1].value;
  const topKeys = ordered.filter((item) => item.value === ordered[0].value).map((item) => item.key as VakadDimension);

  function toggle(dimension: VakadDimension) {
    setRankings((current) => {
      const selected = current[question.id] || [];
      return { ...current, [question.id]: selected.includes(dimension) ? selected.filter((item) => item !== dimension) : [...selected, dimension] };
    });
  }

  function restart() {
    setStarted(false); setStep(0); setFinished(false); setRankings({});
  }

  if (!started) return <ToolIntro slug="vakad" title="Khám phá bản đồ VAKAd" description="Nhận diện cách bạn ưu tiên nhìn, nghe, cảm nhận và phân tích khi tiếp nhận thông tin hoặc ra quyết định." formula="Mỗi câu xếp hạng duy nhất 4 · 3 · 2 · 1; cộng điểm theo V, A, K và Ad." notes={["Tổng điểm bốn kênh luôn là 150", "Có thể có hai kênh đồng nổi trội", "Không có kênh tốt hay xấu"]} onStart={() => setStarted(true)} />;

  if (finished) {
    const balanceText = spread <= 5 ? "Bốn kênh của bạn khá cân bằng" : spread <= 12 ? "Bạn có xu hướng phối hợp nhiều kênh" : "Bạn có một xu hướng tiếp nhận khá rõ";
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>VAKAd của bạn</span><h1>{topKeys.map((key) => VAKAD_DIMENSIONS[key].label).join(" & ")}</h1><p>{balanceText}. Hãy xem đây là cách ưu tiên tự nhiên, không phải giới hạn cố định.</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={60} /><ScoreBars items={ordered} max={60} /></div>
        <div className={styles.insightGrid}>
          {ordered.map((item, index) => {
            const detail = VAKAD_DIMENSIONS[item.key as VakadDimension];
            return <article className={index === 0 ? styles.primaryInsight : ""} key={item.key}><span>{index === 0 ? "Kênh nổi trội" : `Vị trí ${index + 1}`}</span><h2>{detail.label} · {item.value}</h2><p>{detail.description}</p><strong>Ứng dụng:</strong><p>{detail.suggestion}</p></article>;
          })}
        </div>
      </ResultShell>
    );
  }

  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={VAKAD_QUESTIONS.length} label={`Câu ${step + 1} / ${VAKAD_QUESTIONS.length}`} />
      <div className={styles.questionCard} key={question.id}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Chạm các lựa chọn theo thứ tự <strong>đúng nhất → ít đúng nhất</strong>. Chạm lại để bỏ chọn.</p></div>
        <h1>{question.question}</h1>
        <div className={styles.rankOptions}>
          {question.options.map((option) => {
            const index = ranking.indexOf(option.dimension);
            const score = index >= 0 ? 4 - index : null;
            return <button className={`${styles.rankOption}${score ? ` ${styles.selectedOption}` : ""}`} onClick={() => toggle(option.dimension)} type="button" key={option.dimension}><span>{score || "·"}</span><p>{option.text}</p><small>{score ? ["", "Ít đúng", "Đúng", "Khá đúng", "Đúng nhất"][score] : "Chưa xếp hạng"}</small></button>;
          })}
        </div>
        <Navigation first={step === 0} final={step === VAKAD_QUESTIONS.length - 1} canContinue={ranking.length === 4} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === VAKAD_QUESTIONS.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

function LoveLanguageAssessment() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, LoveLanguageCode>>({});
  const question = LOVE_LANGUAGE_QUESTIONS[step];
  const selected = answers[question?.id];
  const result = useMemo(() => scoreLoveLanguages(answers), [answers]);
  const items = (Object.keys(LOVE_LANGUAGES) as LoveLanguageCode[]).map((key) => ({ key, label: LOVE_LANGUAGES[key].shortLabel, value: result[key], color: LOVE_LANGUAGES[key].color }));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  const topKeys = ordered.filter((item) => item.value === ordered[0].value).map((item) => item.key as LoveLanguageCode);

  function restart() { setStarted(false); setStep(0); setFinished(false); setAnswers({}); }
  if (!started) return <ToolIntro slug="ngon-ngu-yeu-thuong" title="Bạn cảm nhận yêu thương bằng cách nào?" description="Ba mươi cặp tình huống giúp nhận diện điều khiến bạn cảm thấy được quan tâm rõ nhất trong một mối quan hệ." formula="Mỗi câu chọn một trong hai; cộng số lần xuất hiện của A, B, C, D và E." notes={["Chọn điều bạn thực sự mong muốn", "Không có đáp án đúng hoặc sai", "Tôn trọng ranh giới và sự đồng thuận"]} onStart={() => setStarted(true)} />;
  if (finished) {
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>Ngôn ngữ nổi trội</span><h1>{topKeys.map((key) => LOVE_LANGUAGES[key].label).join(" & ")}</h1><p>Điểm cao cho thấy cách bạn dễ nhận biết tình cảm nhất. Điểm thấp không có nghĩa là bạn không cần hình thức đó.</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={12} /><ScoreBars items={ordered} max={12} suffix=" / 12" /></div>
        <div className={styles.insightGrid}>
          {ordered.map((item, index) => { const detail = LOVE_LANGUAGES[item.key as LoveLanguageCode]; return <article className={index === 0 ? styles.primaryInsight : ""} key={item.key}><span>{index === 0 ? "Ngôn ngữ chính" : `Vị trí ${index + 1}`}</span><h2>{detail.label} · {item.value}</h2><p>{detail.description}</p><strong>Gợi ý:</strong><p>{detail.suggestion}</p></article>; })}
        </div>
      </ResultShell>
    );
  }
  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={LOVE_LANGUAGE_QUESTIONS.length} label={`Câu ${step + 1} / ${LOVE_LANGUAGE_QUESTIONS.length}`} />
      <div className={styles.questionCard} key={question.id}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Nếu phải chọn một điều khiến bạn cảm thấy được yêu thương hơn, bạn sẽ chọn điều nào?</p></div>
        <h1>Điều nào gần với mong muốn thật của bạn hơn?</h1>
        <div className={styles.loveOptions} role="radiogroup">
          {question.options.map((option) => <button aria-checked={selected === option.code} className={`${styles.loveOption}${selected === option.code ? ` ${styles.selectedOption}` : ""}`} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.code }))} role="radio" type="button" key={option.code}><span>{option.code}</span><p>{option.text}</p></button>)}
        </div>
        <Navigation first={step === 0} final={step === LOVE_LANGUAGE_QUESTIONS.length - 1} canContinue={Boolean(selected)} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === LOVE_LANGUAGE_QUESTIONS.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

function LifeWheelAssessment() {
  const [started, setStarted] = useState(false);
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const category = WHEEL_CATEGORIES[step];
  const complete = category?.questions.every((_, index) => Number.isFinite(answers[`${category.id}-${index + 1}`]));
  const result = useMemo(() => scoreLifeWheel(answers), [answers]);
  const items = WHEEL_CATEGORIES.map((item) => ({ key: item.id, label: item.shortLabel, value: result[item.id], color: item.color }));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  const overall = items.reduce((sum, item) => sum + item.value, 0) / items.length;

  function restart() { setStarted(false); setStep(0); setFinished(false); setAnswers({}); }
  if (!started) return <ToolIntro slug="banh-xe-cuoc-doi" title="Bánh xe cuộc đời hiện tại của bạn" description="Chấm mức độ hài lòng từ 1 đến 10 để nhìn độ cân bằng của tám vùng: sự nghiệp, phát triển, sở thích, quan hệ, tình yêu, sức khỏe, niềm tin và đóng góp." formula="Điểm mỗi vùng = trung bình cộng các câu trong vùng; biểu đồ dùng tám điểm trung bình." notes={["1 là rất chưa hài lòng, 10 là rất hài lòng", "Trả lời theo hiện tại, không theo kỳ vọng", "Tập trung vào một hoặc hai vùng ưu tiên"]} onStart={() => setStarted(true)} />;
  if (finished) {
    const low = ordered[ordered.length - 1];
    const high = ordered[0];
    const lowCategory = WHEEL_CATEGORIES.find((item) => item.id === low.key)!;
    const balance = high.value - low.value;
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>Mức cân bằng hiện tại</span><h1>{overall.toFixed(1)} / 10</h1><p>{balance <= 2 ? "Bánh xe của bạn tương đối cân bằng." : balance <= 4 ? "Một vài vùng đang chênh lệch và cần được chăm sóc có chủ đích." : "Bánh xe có độ chênh lớn; hãy bắt đầu từ vùng thấp nhất bằng bước nhỏ, thực tế."}</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={10} /><ScoreBars items={ordered} max={10} suffix=" / 10" /></div>
        <div className={styles.wheelSummary}>
          <article><span>Vùng đang nâng đỡ bạn</span><h2>{WHEEL_CATEGORIES.find((item) => item.id === high.key)?.label} · {high.value}</h2><p>Đây có thể là nguồn lực giúp bạn cải thiện các vùng còn lại.</p></article>
          <article className={styles.priorityCard}><span>Vùng ưu tiên</span><h2>{lowCategory.label} · {low.value}</h2><p>{lowCategory.action}</p></article>
        </div>
        <div className={styles.insightGrid}>
          {ordered.map((item) => { const detail = WHEEL_CATEGORIES.find((entry) => entry.id === item.key)!; const level = item.value >= 8 ? "Đang nâng đỡ" : item.value >= 6 ? "Khá ổn" : item.value >= 4 ? "Cần chú ý" : "Ưu tiên phục hồi"; return <article key={item.key}><span>{level}</span><h2>{detail.label} · {item.value}</h2><p>{detail.action}</p></article>; })}
        </div>
      </ResultShell>
    );
  }
  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={WHEEL_CATEGORIES.length} label={`Vùng ${step + 1} / ${WHEEL_CATEGORIES.length}`} />
      <div className={styles.questionCard} key={category.id} style={{ "--section-accent": category.color } as React.CSSProperties}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Chấm theo trải nghiệm hiện tại: <strong>1 · rất chưa hài lòng</strong> đến <strong>10 · rất hài lòng</strong>.</p></div>
        <h1>{category.label}</h1>
        <div className={styles.wheelQuestions}>
          {category.questions.map((text, index) => {
            const id = `${category.id}-${index + 1}`;
            const value = answers[id];
            return <fieldset key={id}><legend><span>{index + 1}</span>{text}</legend><div className={styles.scale}>{Array.from({ length: 10 }, (_, score) => score + 1).map((score) => <button aria-label={`${score} điểm`} className={value === score ? styles.scaleSelected : ""} onClick={() => setAnswers((current) => ({ ...current, [id]: score }))} type="button" key={score}>{score}</button>)}</div><small>{value ? `${value}/10` : "Chưa chấm"}</small></fieldset>;
          })}
        </div>
        <Navigation first={step === 0} final={step === WHEEL_CATEGORIES.length - 1} canContinue={Boolean(complete)} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === WHEEL_CATEGORIES.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

export default function ToolExperience({ slug }: { slug: SelfDiscoveryToolSlug }) {
  const tool = SELF_DISCOVERY_TOOLS.find((item) => item.slug === slug)!;
  return (
    <div className={styles.page} style={{ "--tool-accent": tool.accent } as React.CSSProperties}>
      <div className={styles.cosmicField} aria-hidden="true"><span>1</span><span>3</span><span>6</span><span>9</span><span>11/2</span><span>22/4</span><i /><i /></div>
      <ToolHeader slug={slug} />
      <main className={styles.main}>
        <div className={styles.toolCrumbs}><a href="/quiz">Quiz</a><span>→</span><strong>{tool.title}</strong></div>
        {slug === "vakad" ? <VakadAssessment /> : slug === "ngon-ngu-yeu-thuong" ? <LoveLanguageAssessment /> : <LifeWheelAssessment />}
        <section className={styles.otherTools}>
          <span>Khám phá thêm</span>
          <div>{SELF_DISCOVERY_TOOLS.filter((item) => item.slug !== slug).map((item) => <a href={`/quiz/cong-cu/${item.slug}`} key={item.slug}><small>{item.number}</small><strong>{item.title}</strong><p>{item.subtitle}</p></a>)}</div>
        </section>
      </main>
      <footer className={styles.footer}><span>Clow Cat Patronus · Công cụ tự quan sát và hiểu mình.</span><a href="/quiz">Trở lại Quiz</a></footer>
    </div>
  );
}
