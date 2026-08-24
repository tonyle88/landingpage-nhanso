"use client";

import { useMemo, useState, type CSSProperties, type ReactNode } from "react";
import styles from "./tool.module.css";
import {
  LOVE_LANGUAGES,
  scoreLifeWheel,
  scoreLoveLanguages,
  scoreVakad,
  SELF_DISCOVERY_TOOLS,
  VAKAD_DIMENSIONS,
  type LoveLanguageCode,
  type LoveLanguageQuestion,
  type SelfDiscoveryToolSlug,
  type VakadDimension,
  type VakadQuestion,
  type WheelCategory,
} from "@/lib/self-discovery-tools";

type ChartItem = { key: string; label: string; value: number; color: string };

const RANK_COLORS: Record<number, string> = {
  4: "#f4c75b",
  3: "#56ddd2",
  2: "#71b7ff",
  1: "#f28ab8",
};

const SCALE_COLORS = [
  "#ef6a4d", "#f07c4e", "#ee9450", "#e8ab54", "#dbbe59",
  "#bfc962", "#9ed16c", "#7fd47b", "#63d392", "#55d5b7",
];

const TOOL_GUIDES: Record<SelfDiscoveryToolSlug, {
  eyebrow: string;
  description: string;
  points: ReadonlyArray<{ title: string; text: string }>;
}> = {
  vakad: {
    eyebrow: "Bản đồ cách tiếp nhận thông tin",
    description: "VAKAd không xếp bạn vào một kiểu người cố định. Công cụ so sánh bốn kênh mà bạn thường ưu tiên khi học, giao tiếp và ra quyết định: Thị giác (V), Thính giác (A), Cảm giác–vận động (K) và Phân tích–đối thoại nội tâm (Ad).",
    points: [
      { title: "Công cụ đo gì?", text: "Mức độ ưu tiên tương đối của bốn kênh V, A, K và Ad qua 15 tình huống gần với đời sống." },
      { title: "Bạn nhận được gì?", text: "Biểu đồ radar, tỷ trọng từng kênh, thứ tự nổi trội và gợi ý ứng dụng riêng cho mỗi kênh." },
      { title: "Dùng kết quả thế nào?", text: "Điều chỉnh cách học, trình bày, ghi nhớ và trao đổi để thông tin đi vào tự nhiên, ít mệt hơn." },
    ],
  },
  "ngon-ngu-yeu-thuong": {
    eyebrow: "Bản đồ cách trao và nhận sự quan tâm",
    description: "Ngôn ngữ yêu thương giúp gọi tên cách bạn dễ cảm nhận tình cảm nhất. Kết quả không đánh giá mức độ yêu thương, mà cho thấy hình thức biểu đạt nào khiến sự quan tâm trở nên rõ ràng và có ý nghĩa với bạn.",
    points: [
      { title: "Công cụ đo gì?", text: "Mức ưu tiên giữa lời khẳng định, thời gian chất lượng, quà tặng, hành động giúp đỡ và tiếp xúc cơ thể." },
      { title: "Bạn nhận được gì?", text: "Thứ tự năm ngôn ngữ, biểu đồ tỷ trọng và diễn giải nhu cầu cụ thể phía sau từng kết quả." },
      { title: "Dùng kết quả thế nào?", text: "Nói rõ điều mình cần, quan sát ngôn ngữ của người thân và tránh mặc định rằng ai cũng cảm nhận giống mình." },
    ],
  },
  "banh-xe-cuoc-doi": {
    eyebrow: "Bản đồ cân bằng tám vùng cuộc sống",
    description: "Bánh xe cuộc đời là ảnh chụp toàn cảnh ở thời điểm hiện tại. Việc chấm điểm tám vùng giúp bạn thấy độ cân bằng, nhận diện nguồn lực đang nâng đỡ và chọn đúng một vùng ưu tiên thay vì cố thay đổi mọi thứ cùng lúc.",
    points: [
      { title: "Công cụ đo gì?", text: "Mức hài lòng chủ quan trong tám vùng quan trọng, từ sự nghiệp, phát triển bản thân đến sức khỏe và quan hệ." },
      { title: "Bạn nhận được gì?", text: "Điểm trung bình, biểu đồ tám cạnh, vùng cao nhất, vùng thấp nhất và mức chênh lệch tổng thể." },
      { title: "Dùng kết quả thế nào?", text: "Chọn một hành động nhỏ, có thể thực hiện trong 7–30 ngày cho vùng ưu tiên rồi đánh giá lại định kỳ." },
    ],
  },
};

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
        <a href="/quiz">Kho công cụ</a>
        <a href="/quiz/chon-goi">Quiz chọn gói</a>
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
        <div className={styles.scoreBar} key={item.key} style={{ "--score-accent": item.color } as CSSProperties}>
          <div><span><i style={{ background: item.color }} />{item.label}</span><strong>{item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}{suffix}</strong></div>
          <b aria-hidden="true"><span style={{ width: `${Math.min(100, (item.value / max) * 100)}%`, background: item.color }} /></b>
        </div>
      ))}
    </div>
  );
}

function DonutChart({ items, suffix = " điểm" }: { items: ChartItem[]; suffix?: string }) {
  const total = items.reduce((sum, item) => sum + item.value, 0) || 1;
  const ordered = [...items].sort((a, b) => b.value - a.value);
  let cursor = 0;
  const gradient = items.map((item) => {
    const start = cursor;
    cursor += (item.value / total) * 100;
    return `${item.color} ${start}% ${cursor}%`;
  }).join(", ");
  const top = ordered[0];
  const topPercent = Math.round((top.value / total) * 100);

  return (
    <div className={styles.donutPanel}>
      <div className={styles.donutTitle}><span>Tỷ trọng kết quả</span><small>So sánh trực quan giữa các nhóm</small></div>
      <div className={styles.donut} style={{ background: `conic-gradient(${gradient})` }} role="img" aria-label="Biểu đồ tròn tỷ trọng kết quả">
        <div><strong>{topPercent}%</strong><span>{top.label}</span><small>Nổi trội</small></div>
      </div>
      <div className={styles.donutLegend}>
        {ordered.map((item) => <div key={item.key}><i style={{ background: item.color }} /><span>{item.label}</span><strong>{item.value.toLocaleString("vi-VN", { maximumFractionDigits: 1 })}{suffix}</strong></div>)}
      </div>
    </div>
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

function ConclusionPanel({ lines }: { lines: ReadonlyArray<string> }) {
  return (
    <section className={styles.conclusionPanel} aria-labelledby="tool-conclusion-title">
      <div><span>Kết luận dành cho bạn</span><h2 id="tool-conclusion-title">Hiểu kết quả và bắt đầu từ điều thực tế</h2></div>
      <ol>{lines.map((line, index) => <li key={`${index}-${line}`}><span>{String(index + 1).padStart(2, "0")}</span><p>{line}</p></li>)}</ol>
    </section>
  );
}

function VakadAssessment({ questions }: { questions: ReadonlyArray<VakadQuestion> }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [rankings, setRankings] = useState<Record<string, VakadDimension[]>>({});
  const question = questions[step];
  const ranking = rankings[question?.id] || [];

  const result = useMemo(() => scoreVakad(rankings, questions), [questions, rankings]);
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
    setStep(0); setFinished(false); setRankings({});
  }

  if (finished) {
    const balanceText = spread <= 5 ? "Bốn kênh của bạn khá cân bằng" : spread <= 12 ? "Bạn có xu hướng phối hợp nhiều kênh" : "Bạn có một xu hướng tiếp nhận khá rõ";
    const topLabel = topKeys.map((key) => VAKAD_DIMENSIONS[key].label).join(" và ");
    const second = ordered[1];
    const conclusion = [
      `${topLabel} đang là kênh nổi trội, vì vậy bạn thường hiểu nhanh hơn khi thông tin được trình bày đúng theo đặc tính của kênh này.`,
      spread <= 5 ? "Bốn kênh khá cân bằng; bạn có khả năng đổi cách tiếp nhận linh hoạt theo tình huống." : `Khoảng chênh ${spread} điểm cho thấy xu hướng ưu tiên tương đối rõ, nhưng đây không phải một giới hạn cố định.`,
      `Khi học hoặc làm việc, hãy dùng kênh chính trước rồi bổ sung ${second.label.toLowerCase()} để kiểm tra và ghi nhớ thông tin sâu hơn.`,
      "Trong giao tiếp, hãy nói rõ bạn cần nhìn thấy, nghe giải thích, trực tiếp trải nghiệm hay có thời gian phân tích để người đối diện dễ phối hợp.",
      "Hãy quan sát lại kết quả sau một giai đoạn thay đổi môi trường; thói quen và kỹ năng được rèn luyện có thể làm tỷ trọng các kênh dịch chuyển.",
    ];
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>VAKAd của bạn</span><h1>{topKeys.map((key) => VAKAD_DIMENSIONS[key].label).join(" & ")}</h1><p>{balanceText}. Hãy xem đây là cách ưu tiên tự nhiên, không phải giới hạn cố định.</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={60} /><DonutChart items={items} /><ScoreBars items={ordered} max={60} /></div>
        <ConclusionPanel lines={conclusion} />
        <div className={styles.insightGrid}>
          {ordered.map((item, index) => {
            const detail = VAKAD_DIMENSIONS[item.key as VakadDimension];
            return <article className={index === 0 ? styles.primaryInsight : ""} key={item.key} style={{ "--insight-accent": detail.color } as CSSProperties}><span>{index === 0 ? "Kênh nổi trội" : `Vị trí ${index + 1}`}</span><h2>{detail.label} · {item.value}</h2><p>{detail.description}</p><strong>Ứng dụng:</strong><p>{detail.suggestion}</p></article>;
          })}
        </div>
      </ResultShell>
    );
  }

  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={questions.length} label={`Câu ${step + 1} / ${questions.length}`} />
      <div className={styles.questionCard} key={question.id}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Chạm các lựa chọn theo thứ tự <strong>đúng nhất → ít đúng nhất</strong>. Chạm lại để bỏ chọn.</p></div>
        <h1>{question.question}</h1>
        <div className={styles.rankOptions}>
          {question.options.map((option) => {
            const index = ranking.indexOf(option.dimension);
            const score = index >= 0 ? 4 - index : null;
            const color = score ? RANK_COLORS[score] : VAKAD_DIMENSIONS[option.dimension].color;
            return <button className={`${styles.rankOption}${score ? ` ${styles.selectedOption}` : ""}`} onClick={() => toggle(option.dimension)} style={{ "--option-accent": color } as CSSProperties} type="button" key={option.dimension}><span>{score || "·"}</span><p>{option.text}</p><small>{score ? ["", "Ít đúng", "Đúng", "Khá đúng", "Đúng nhất"][score] : "Chưa xếp hạng"}</small></button>;
          })}
        </div>
        <Navigation first={step === 0} final={step === questions.length - 1} canContinue={ranking.length === 4} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === questions.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

function LoveLanguageAssessment({ questions }: { questions: ReadonlyArray<LoveLanguageQuestion> }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, LoveLanguageCode>>({});
  const question = questions[step];
  const selected = answers[question?.id];
  const result = useMemo(() => scoreLoveLanguages(answers, questions), [answers, questions]);
  const items = (Object.keys(LOVE_LANGUAGES) as LoveLanguageCode[]).map((key) => ({ key, label: LOVE_LANGUAGES[key].shortLabel, value: result[key], color: LOVE_LANGUAGES[key].color }));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  const topKeys = ordered.filter((item) => item.value === ordered[0].value).map((item) => item.key as LoveLanguageCode);

  function restart() { setStep(0); setFinished(false); setAnswers({}); }
  if (finished) {
    const topLabel = topKeys.map((key) => LOVE_LANGUAGES[key].label).join(" và ");
    const second = ordered[1];
    const conclusion = [
      `${topLabel} là cách bạn dễ nhận biết tình cảm nhất trong những lựa chọn hiện tại; nhu cầu cốt lõi là được quan tâm theo cách đủ cụ thể để bạn cảm nhận được.`,
      `${second.label} là ngôn ngữ hỗ trợ quan trọng và có thể trở nên nổi bật hơn tùy mối quan hệ hoặc hoàn cảnh sống.`,
      "Bạn nên chia sẻ kết quả bằng một lời đề nghị rõ ràng, tích cực, thay vì chờ người khác tự đoán điều khiến mình cảm thấy được yêu thương.",
      "Ngôn ngữ của người đối diện có thể khác bạn; hãy hỏi và quan sát cách họ thường trao đi sự quan tâm trước khi kết luận họ thiếu tình cảm.",
      "Trong tuần tới, hãy chủ động trao một hành động theo ngôn ngữ của người thân và đề nghị nhận lại một hành động nhỏ theo ngôn ngữ của bạn.",
    ];
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>Ngôn ngữ nổi trội</span><h1>{topKeys.map((key) => LOVE_LANGUAGES[key].label).join(" & ")}</h1><p>Điểm cao cho thấy cách bạn dễ nhận biết tình cảm nhất. Điểm thấp không có nghĩa là bạn không cần hình thức đó.</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={12} /><DonutChart items={items} suffix=" / 12" /><ScoreBars items={ordered} max={12} suffix=" / 12" /></div>
        <ConclusionPanel lines={conclusion} />
        <div className={styles.insightGrid}>
          {ordered.map((item, index) => { const detail = LOVE_LANGUAGES[item.key as LoveLanguageCode]; return <article className={index === 0 ? styles.primaryInsight : ""} key={item.key} style={{ "--insight-accent": detail.color } as CSSProperties}><span>{index === 0 ? "Ngôn ngữ chính" : `Vị trí ${index + 1}`}</span><h2>{detail.label} · {item.value}</h2><p>{detail.description}</p><strong>Gợi ý:</strong><p>{detail.suggestion}</p></article>; })}
        </div>
      </ResultShell>
    );
  }
  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={questions.length} label={`Câu ${step + 1} / ${questions.length}`} />
      <div className={styles.questionCard} key={question.id}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Nếu phải chọn một điều khiến bạn cảm thấy được yêu thương hơn, bạn sẽ chọn điều nào?</p></div>
        <h1>Điều nào gần với mong muốn thật của bạn hơn?</h1>
        <div className={styles.loveOptions} role="radiogroup">
          {question.options.map((option) => <button aria-checked={selected === option.code} className={`${styles.loveOption}${selected === option.code ? ` ${styles.selectedOption}` : ""}`} onClick={() => setAnswers((current) => ({ ...current, [question.id]: option.code }))} role="radio" style={{ "--option-accent": LOVE_LANGUAGES[option.code].color } as CSSProperties} type="button" key={option.code}><span>{option.code}</span><p>{option.text}</p><small>{selected === option.code ? "Đã chọn" : LOVE_LANGUAGES[option.code].shortLabel}</small></button>)}
        </div>
        <Navigation first={step === 0} final={step === questions.length - 1} canContinue={Boolean(selected)} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === questions.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

function LifeWheelAssessment({ categories }: { categories: ReadonlyArray<WheelCategory> }) {
  const [step, setStep] = useState(0);
  const [finished, setFinished] = useState(false);
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const category = categories[step];
  const complete = category?.questions.every((_, index) => Number.isFinite(answers[`${category.id}-${index + 1}`]));
  const result = useMemo(() => scoreLifeWheel(answers, categories), [answers, categories]);
  const items = categories.map((item) => ({ key: item.id, label: item.shortLabel, value: result[item.id], color: item.color }));
  const ordered = [...items].sort((a, b) => b.value - a.value);
  const overall = items.reduce((sum, item) => sum + item.value, 0) / items.length;

  function restart() { setStep(0); setFinished(false); setAnswers({}); }
  if (finished) {
    const low = ordered[ordered.length - 1];
    const high = ordered[0];
    const lowCategory = categories.find((item) => item.id === low.key)!;
    const highCategory = categories.find((item) => item.id === high.key)!;
    const balance = high.value - low.value;
    const conclusion = [
      `Mức cân bằng chung ${overall.toFixed(1)}/10 cho thấy bức tranh hiện tại của bạn; đây là dữ liệu để ưu tiên, không phải điểm số đánh giá giá trị bản thân.`,
      `${highCategory.label} (${high.value}/10) đang là vùng nguồn lực; hãy tận dụng sự ổn định ở đây để tạo năng lượng cho những thay đổi tiếp theo.`,
      `${lowCategory.label} (${low.value}/10) là vùng nên được chú ý trước, đặc biệt vì khoảng chênh toàn bánh xe hiện là ${balance.toFixed(1)} điểm.`,
      `Bước khởi đầu phù hợp: ${lowCategory.action}`,
      "Chỉ chọn một hành động nhỏ trong 7 ngày, ghi nhận tiến triển và chấm lại bánh xe sau 30 ngày để nhìn thấy chuyển động thực tế.",
    ];
    return (
      <ResultShell onRestart={restart}>
        <div className={styles.resultHeading}><span>Mức cân bằng hiện tại</span><h1>{overall.toFixed(1)} / 10</h1><p>{balance <= 2 ? "Bánh xe của bạn tương đối cân bằng." : balance <= 4 ? "Một vài vùng đang chênh lệch và cần được chăm sóc có chủ đích." : "Bánh xe có độ chênh lớn; hãy bắt đầu từ vùng thấp nhất bằng bước nhỏ, thực tế."}</p></div>
        <div className={styles.chartGrid}><RadarChart items={items} max={10} /><DonutChart items={items} suffix=" / 10" /><ScoreBars items={ordered} max={10} suffix=" / 10" /></div>
        <ConclusionPanel lines={conclusion} />
        <div className={styles.wheelSummary}>
          <article style={{ "--insight-accent": high.color } as CSSProperties}><span>Vùng đang nâng đỡ bạn</span><h2>{highCategory.label} · {high.value}</h2><p>Đây có thể là nguồn lực giúp bạn cải thiện các vùng còn lại.</p></article>
          <article className={styles.priorityCard} style={{ "--insight-accent": low.color } as CSSProperties}><span>Vùng ưu tiên</span><h2>{lowCategory.label} · {low.value}</h2><p>{lowCategory.action}</p></article>
        </div>
        <div className={styles.insightGrid}>
          {ordered.map((item) => { const detail = categories.find((entry) => entry.id === item.key)!; const level = item.value >= 8 ? "Đang nâng đỡ" : item.value >= 6 ? "Khá ổn" : item.value >= 4 ? "Cần chú ý" : "Ưu tiên phục hồi"; return <article key={item.key} style={{ "--insight-accent": detail.color } as CSSProperties}><span>{level}</span><h2>{detail.label} · {item.value}</h2><p>{detail.action}</p></article>; })}
        </div>
      </ResultShell>
    );
  }
  return (
    <section className={styles.assessment}>
      <Progress current={step + 1} total={categories.length} label={`Vùng ${step + 1} / ${categories.length}`} />
      <div className={styles.questionCard} key={category.id} style={{ "--section-accent": category.color } as CSSProperties}>
        <div className={styles.questionMeta}><span>{String(step + 1).padStart(2, "0")}</span><p>Chấm theo trải nghiệm hiện tại: <strong>1 · rất chưa hài lòng</strong> đến <strong>10 · rất hài lòng</strong>.</p></div>
        <h1>{category.label}</h1>
        <div className={styles.wheelQuestions}>
          {category.questions.map((text, index) => {
            const id = `${category.id}-${index + 1}`;
            const value = answers[id];
            return <fieldset key={id}><legend><span>{index + 1}</span>{text}</legend><div className={styles.scale}>{Array.from({ length: 10 }, (_, score) => score + 1).map((score) => <button aria-label={`${score} điểm`} className={value === score ? styles.scaleSelected : ""} onClick={() => setAnswers((current) => ({ ...current, [id]: score }))} style={{ "--score-color": SCALE_COLORS[score - 1] } as CSSProperties} type="button" key={score}>{score}</button>)}</div><small className={value ? styles.scoredLabel : ""}>{value ? `${value}/10 · Đã chấm` : "Chưa chấm"}</small></fieldset>;
          })}
        </div>
        <Navigation first={step === 0} final={step === categories.length - 1} canContinue={Boolean(complete)} onBack={() => setStep((value) => Math.max(0, value - 1))} onNext={() => step === categories.length - 1 ? setFinished(true) : setStep((value) => value + 1)} />
      </div>
    </section>
  );
}

type ToolExperienceProps =
  | { slug: "vakad"; content: ReadonlyArray<VakadQuestion> }
  | { slug: "ngon-ngu-yeu-thuong"; content: ReadonlyArray<LoveLanguageQuestion> }
  | { slug: "banh-xe-cuoc-doi"; content: ReadonlyArray<WheelCategory> };

export default function ToolExperience(props: ToolExperienceProps) {
  const { slug } = props;
  const tool = SELF_DISCOVERY_TOOLS.find((item) => item.slug === slug)!;
  const guide = TOOL_GUIDES[slug];
  return (
    <div className={styles.page} style={{ "--tool-accent": tool.accent } as CSSProperties}>
      <div className={styles.cosmicField} aria-hidden="true"><span>1</span><span>3</span><span>6</span><span>9</span><span>11/2</span><span>22/4</span><i /><i /></div>
      <ToolHeader slug={slug} />
      <main className={styles.main}>
        <div className={styles.toolCrumbs}><a href="/quiz">Kho công cụ</a><span>→</span><strong>{tool.title}</strong></div>
        <section className={styles.toolOverview}>
          <div className={styles.overviewLead}>
            <span>{guide.eyebrow}</span>
            <h1>{tool.title}</h1>
            <p>{guide.description}</p>
            <a href="#bat-dau">Bắt đầu làm bài ↓</a>
          </div>
          <div className={styles.overviewPoints}>
            {guide.points.map((point, index) => <article key={point.title}><span>{String(index + 1).padStart(2, "0")}</span><h2>{point.title}</h2><p>{point.text}</p></article>)}
          </div>
        </section>
        <div className={styles.assessmentAnchor} id="bat-dau">
          {props.slug === "vakad" ? <VakadAssessment questions={props.content} /> : props.slug === "ngon-ngu-yeu-thuong" ? <LoveLanguageAssessment questions={props.content} /> : <LifeWheelAssessment categories={props.content} />}
        </div>
        <section className={styles.otherTools}>
          <span>Khám phá thêm</span>
          <div>{SELF_DISCOVERY_TOOLS.filter((item) => item.slug !== slug).map((item) => <a href={`/quiz/cong-cu/${item.slug}`} key={item.slug}><small>{item.number}</small><strong>{item.title}</strong><p>{item.subtitle}</p></a>)}</div>
        </section>
      </main>
      <footer className={styles.footer}><span>Clow Cat Patronus · Công cụ tự quan sát và hiểu mình.</span><a href="/quiz">Trở lại Quiz</a></footer>
    </div>
  );
}
