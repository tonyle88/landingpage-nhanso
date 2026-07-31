"use client";

import Image from "next/image";
import { FormEvent, useState } from "react";
import {
  calculateNumerology,
  type NamePart,
  type NumerologyMetricKey,
  type NumerologyResult,
} from "@/lib/numerology";
import styles from "../admin.module.css";

const METRICS: Array<[NumerologyMetricKey, string, string]> = [
  ["lifePath", "Đường đời", "Ngày + tháng + năm sinh"],
  ["birthday", "Ngày sinh", "Năng lượng ngày chào đời"],
  ["mission", "Sứ mệnh", "Toàn bộ chữ cái trong họ tên"],
  ["soul", "Linh hồn", "Nguyên âm trong họ tên"],
  ["personality", "Nhân cách", "Phụ âm trong họ tên"],
  ["attitude", "Thái độ", "Ngày sinh + tháng sinh"],
  ["maturity", "Trưởng thành", "Đường đời + sứ mệnh"],
];
const CHART_ORDER = [3, 6, 9, 2, 5, 8, 1, 4, 7];
const CYCLE_POINT_Y = [48, 79, 143, 166, 107, 48, 178, 130, 82];

function createSmoothCyclePath(points: Array<{ x: number; y: number }>) {
  return points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    const previous = points[index - 1];
    const beforePrevious = points[index - 2] || previous;
    const next = points[index + 1] || point;
    const control1X = previous.x + (point.x - beforePrevious.x) / 6;
    const control1Y = previous.y + (point.y - beforePrevious.y) / 6;
    const control2X = point.x - (next.x - previous.x) / 6;
    const control2Y = point.y - (next.y - previous.y) / 6;
    return `${path} C ${control1X} ${control1Y}, ${control2X} ${control2Y}, ${point.x} ${point.y}`;
  }, "");
}

function blobToDataUrl(blob: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result)));
    reader.addEventListener("error", () => reject(reader.error));
    reader.readAsDataURL(blob);
  });
}

function loadImage(source: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new window.Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", () => reject(new Error("Không thể dựng ảnh JPG.")));
    image.src = source;
  });
}

async function renderElementAsJpeg(element: HTMLElement) {
  await document.fonts.ready;

  const width = Math.ceil(element.getBoundingClientRect().width);
  const height = Math.ceil(element.getBoundingClientRect().height);
  const clone = element.cloneNode(true) as HTMLElement;
  const sourceNodes: Array<HTMLElement | SVGElement> = [
    element,
    ...Array.from(element.querySelectorAll<HTMLElement | SVGElement>("*")),
  ];
  const clonedNodes: Array<HTMLElement | SVGElement> = [
    clone,
    ...Array.from(clone.querySelectorAll<HTMLElement | SVGElement>("*")),
  ];

  sourceNodes.forEach((sourceNode, index) => {
    const targetNode = clonedNodes[index];
    const computedStyle = window.getComputedStyle(sourceNode);
    for (const property of computedStyle) {
      targetNode.style.setProperty(
        property,
        computedStyle.getPropertyValue(property),
        computedStyle.getPropertyPriority(property),
      );
    }
  });

  const sourceImages = Array.from(element.querySelectorAll("img"));
  const clonedImages = Array.from(clone.querySelectorAll("img"));
  await Promise.all(sourceImages.map(async (sourceImage, index) => {
    const response = await fetch(sourceImage.currentSrc || sourceImage.src);
    if (!response.ok) throw new Error("Không thể tải hình ảnh trong bản tóm tắt.");
    const clonedImage = clonedImages[index];
    clonedImage.removeAttribute("srcset");
    clonedImage.removeAttribute("sizes");
    clonedImage.srcset = "";
    clonedImage.src = await blobToDataUrl(await response.blob());
  }));

  clone.setAttribute("xmlns", "http://www.w3.org/1999/xhtml");
  clone.style.position = "static";
  clone.style.inset = "auto";
  clone.style.zIndex = "auto";
  clone.style.width = `${width}px`;
  clone.style.height = `${height}px`;

  const serialized = new XMLSerializer().serializeToString(clone);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
      <foreignObject width="100%" height="100%">${serialized}</foreignObject>
    </svg>
  `;
  const svgUrl = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml;charset=utf-8" }));

  try {
    const image = await loadImage(svgUrl);
    const pixelRatio = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * pixelRatio;
    canvas.height = height * pixelRatio;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Trình duyệt không hỗ trợ xuất JPG.");
    context.fillStyle = "#fffdf8";
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => blob
          ? resolve(blob)
          : reject(new Error("Không thể tạo file JPG.")),
        "image/jpeg",
        0.94,
      );
    });
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

function WordPart({ part }: { part: NamePart }) {
  if (!part.raw) return <span className={styles.numerologyEmpty}>—</span>;
  const calculation = part.raw === part.reduced
    ? String(part.raw)
    : `${part.raw} → ${part.reduced}`;
  return (
    <>
      <span className={styles.numerologyLetters}>{part.letters}</span>
      <strong>{calculation}</strong>
    </>
  );
}

export function NumerologyCalculator() {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [message, setMessage] = useState("");
  const [isExportingJpg, setIsExportingJpg] = useState(false);

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    try {
      const nextResult = calculateNumerology(fullName, birthDate);
      setResult(nextResult);
      setGeneratedAt(new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date()));
      setMessage("");
      window.requestAnimationFrame(() => {
        document.getElementById("numerology-report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tính chỉ số.");
    }
  }

  function reset() {
    setFullName("");
    setBirthDate("");
    setResult(null);
    setGeneratedAt("");
    setMessage("");
  }

  function printPdf(mode: "full" | "summary") {
    if (!result) return;
    const previousTitle = document.title;
    const safeName = result.normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    document.title = mode === "summary"
      ? `Tom-tat-nhan-so-${safeName || "khach-hang"}`
      : `Ban-do-nhan-so-${safeName || "khach-hang"}`;
    document.body.dataset.numerologyPrint = mode;
    const restorePrintState = () => {
      document.title = previousTitle;
      delete document.body.dataset.numerologyPrint;
    };
    window.addEventListener("afterprint", restorePrintState, { once: true });
    window.print();
    window.setTimeout(restorePrintState, 800);
  }

  async function exportCustomerJpg() {
    if (!result || isExportingJpg) return;
    setIsExportingJpg(true);
    setMessage("");
    document.body.dataset.numerologyImage = "summary";

    try {
      await new Promise<void>((resolve) => {
        window.requestAnimationFrame(() => window.requestAnimationFrame(() => resolve()));
      });
      const summary = document.querySelector<HTMLElement>(
        `.${styles.numerologyCustomerSummary}`,
      );
      if (!summary) throw new Error("Không tìm thấy bản tóm tắt để xuất JPG.");
      const jpeg = await renderElementAsJpeg(summary);
      const safeName = result.normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const url = URL.createObjectURL(jpeg);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Tom-tat-nhan-so-${safeName || "khach-hang"}.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xuất JPG.");
    } finally {
      delete document.body.dataset.numerologyImage;
      setIsExportingJpg(false);
    }
  }

  const missingDisplay = result?.missing.length
    ? result.missing.join(" · ")
    : "Không có";
  const debtDisplay = result?.karmicDebts.length
    ? result.karmicDebts.map((item) => item.display).join(" · ")
    : "Không có";
  const cyclePoints = result?.annualCycle.cycle.map((item, index) => ({
    ...item,
    x: 60 + index * 97.5,
    y: CYCLE_POINT_Y[index],
  })) || [];
  const cyclePath = createSmoothCyclePath(cyclePoints);

  return (
    <section className={styles.numerologyWorkspace}>
      <section className={styles.numerologyFormPanel}>
        <div>
          <p className={styles.eyebrow}>Hồ sơ khách hàng</p>
          <h2>Thông tin lập bản đồ</h2>
          <p>
            Áp dụng cùng công thức Pythagoras như trang chủ. Dữ liệu chỉ được
            tính trong trình duyệt, không tự lưu hoặc gửi lên hệ thống.
          </p>
        </div>
        <form className={styles.numerologyForm} onSubmit={submit}>
          <label className={styles.field}>
            Họ và tên khai sinh
            <input
              autoComplete="off"
              onChange={(event) => setFullName(event.target.value)}
              placeholder="Ví dụ: Trần Minh Tú"
              required
              value={fullName}
            />
          </label>
          <label className={styles.field}>
            Ngày sinh
            <input
              min="1900-01-01"
              onChange={(event) => setBirthDate(event.target.value)}
              required
              type="date"
              value={birthDate}
            />
          </label>
          <div className={styles.numerologyFormActions}>
            <button className={styles.submit} type="submit">
              ✦ Lập bản đồ
            </button>
            <button className={styles.secondaryLink} onClick={reset} type="button">
              Làm mới
            </button>
          </div>
          <p className={styles.numerologyMessage} role="status">
            {message}
          </p>
        </form>
      </section>

      {result ? (
        <section className={styles.numerologyResult}>
          <div className={styles.numerologyResultToolbar}>
            <span>
              <strong>Đã lập đủ 9 nhóm chỉ số</strong>
              <small>Kiểm tra lại thông tin trước khi xuất.</small>
            </span>
            <div className={styles.numerologyResultActions}>
              <button
                className={styles.secondaryLink}
                onClick={() => printPdf("full")}
                type="button"
              >
                ↓ PDF đầy đủ
              </button>
              <button
                className={styles.submit}
                onClick={() => printPdf("summary")}
                type="button"
              >
                ↓ PDF khách · 1 trang A4
              </button>
              <button
                className={styles.secondaryLink}
                disabled={isExportingJpg}
                onClick={exportCustomerJpg}
                type="button"
              >
                {isExportingJpg ? "Đang tạo JPG…" : "↓ JPG khách · khổ A4"}
              </button>
            </div>
          </div>

          <article
            className={styles.numerologyReport}
            id="numerology-report"
          >
            <header className={styles.numerologyReportHeader}>
              <div>
                <Image
                  alt=""
                  height={52}
                  src="/assets/images/logo2.png"
                  width={52}
                />
                <span>
                  <strong>Clow Cat Patronus</strong>
                  <small>Bản đồ nhân số học cá nhân</small>
                </span>
              </div>
              <span>
                <small>Ngày lập bản đồ</small>
                <strong>{generatedAt}</strong>
              </span>
            </header>

            <section className={styles.numerologyClient}>
              <p>Hồ sơ nhân số học</p>
              <h2>{result.fullName}</h2>
              <span>Ngày sinh {result.formattedDate}</span>
            </section>

            <section
              aria-label="Các chỉ số nhân số học"
              className={styles.numerologyMetrics}
            >
              {METRICS.map(([key, label, note]) => {
                const metric = result.metrics[key];
                return (
                  <article
                    className={metric.karmicDebt
                      ? styles.numerologyMetricDebt
                      : styles.numerologyMetric}
                    key={key}
                  >
                    <span>{label}</span>
                    <strong>{metric.display}</strong>
                    <small>{note}</small>
                  </article>
                );
              })}
              <article className={styles.numerologyMetricMissing}>
                <span>Chỉ số thiếu</span>
                <strong>{missingDisplay}</strong>
                <small>Các số 1–9 không có trong ngày sinh</small>
              </article>
              <article className={styles.numerologyMetricDebt}>
                <span>Nợ nghiệp</span>
                <strong>{debtDisplay}</strong>
                <small>
                  {result.karmicDebts.length
                    ? result.karmicDebts
                      .map((item) => `${item.display}: ${item.sources.join(", ")}`)
                      .join(" · ")
                    : "Không phát hiện 13/4, 14/5, 16/7 hoặc 19/1."}
                </small>
              </article>
            </section>

            <section className={styles.numerologyColumns}>
              <article className={styles.numerologyReportCard}>
                <div className={styles.numerologyCardHeading}>
                  <span>01</span>
                  <div>
                    <h3>Biểu đồ ngày sinh &amp; họ tên</h3>
                    <p>
                      Số ngày sinh và số quy đổi từ từng chữ trong họ tên được
                      đặt chung đúng ô 1–9. Ô màu nhạt là số thiếu trong ngày sinh.
                    </p>
                  </div>
                </div>
                <div
                  aria-label="Chú giải màu biểu đồ"
                  className={styles.numerologyChartLegend}
                >
                  <span>
                    <i
                      aria-hidden="true"
                      className={styles.numerologyLegendBirth}
                    />
                    Ngày sinh
                  </span>
                  <span>
                    <i
                      aria-hidden="true"
                      className={styles.numerologyLegendName}
                    />
                    Họ tên
                  </span>
                  <small>Chỉ số thiếu vẫn chỉ xét ngày sinh.</small>
                </div>
                <div className={styles.numerologyBirthChart}>
                  {CHART_ORDER.map((number) => {
                    const birthCount = result.digitCounts[String(number)] || 0;
                    const nameCount =
                      result.nameDigitCounts[String(number)] || 0;
                    return (
                      <div
                        className={birthCount
                          ? styles.numerologyBirthCell
                          : styles.numerologyBirthCellMissing}
                        key={number}
                      >
                        <small>Số {number}</small>
                        <div className={styles.numerologyCellValues}>
                          <span>
                            <abbr title="Ngày sinh">NS</abbr>
                            <strong className={birthCount
                              ? styles.numerologyBirthDigits
                              : styles.numerologyBirthDigitsMissing}
                            >
                              {birthCount
                                ? String(number).repeat(birthCount)
                                : "—"}
                            </strong>
                          </span>
                          <span>
                            <abbr title="Họ tên">HT</abbr>
                            <strong className={nameCount
                              ? styles.numerologyNameDigits
                              : styles.numerologyNameDigitsMissing}
                            >
                              {nameCount
                                ? String(number).repeat(nameCount)
                                : "—"}
                            </strong>
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.numerologyReportCard}>
                <div className={styles.numerologyCardHeading}>
                  <span>02</span>
                  <div>
                    <h3>Giải mã họ tên</h3>
                    <p>Giá trị Pythagoras được tính và rút gọn theo từng từ.</p>
                  </div>
                </div>
                <div className={styles.numerologyTableWrap}>
                  <table className={styles.numerologyNameTable}>
                    <thead>
                      <tr>
                        <th>Từ</th>
                        <th>Sứ mệnh</th>
                        <th>Linh hồn</th>
                        <th>Nhân cách</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.nameBreakdown.map((word, index) => (
                        <tr key={`${word.word}-${index}`}>
                          <th scope="row">{word.word}</th>
                          <td><WordPart part={word.all} /></td>
                          <td><WordPart part={word.vowels} /></td>
                          <td><WordPart part={word.consonants} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </article>
            </section>

            <section
              className={`${styles.numerologyReportCard} ${styles.numerologyPyramidSection}`}
            >
              <div className={styles.numerologyCardHeading}>
                <span>03</span>
                <div>
                  <h3>Kim tự tháp Pitago</h3>
                  <p>
                    Bốn đỉnh cao, bốn thử thách và các mốc 9 năm được tính từ
                    tháng–ngày–năm sinh. Thử thách đỉnh 3 dùng quy tắc riêng:
                    |đỉnh 1 − đỉnh 2|. Đỉnh 11, 22, 33 được hiển thị dạng
                    11/2, 22/4, 33/6 và dùng số rút gọn để tính tiếp.
                  </p>
                </div>
              </div>
              <div className={styles.numerologyPyramidLayout}>
                <div
                  aria-label="Biểu đồ kim tự tháp Pitago"
                  className={styles.numerologyPyramid}
                >
                  <div className={styles.numerologyPyramidTop}>
                    <div className={styles.numerologyPyramidCircle}>
                      <span>Đỉnh 4</span>
                      <strong>{result.pyramid.peaks[3].display}</strong>
                    </div>
                    <small className={styles.numerologyPyramidMilestone}>
                      {result.pyramid.peaks[3].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[3].milestoneYear}
                    </small>
                  </div>
                  <div className={styles.numerologyPyramidArrow}>↑</div>
                  <div className={styles.numerologyPyramidMiddle}>
                    <div className={styles.numerologyPyramidCircle}>
                      <span>Đỉnh 3</span>
                      <strong>{result.pyramid.peaks[2].display}</strong>
                    </div>
                    <small className={styles.numerologyPyramidMilestone}>
                      {result.pyramid.peaks[2].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[2].milestoneYear}
                    </small>
                  </div>
                  <div className={styles.numerologyPyramidArrow}>↗ ↑ ↖</div>
                  <div className={styles.numerologyPyramidPair}>
                    {[0, 1].map((index) => (
                      <div key={index}>
                        <div className={styles.numerologyPyramidCircle}>
                          <span>Đỉnh {index + 1}</span>
                          <strong>{result.pyramid.peaks[index].display}</strong>
                        </div>
                        <small className={styles.numerologyPyramidMilestone}>
                          {result.pyramid.peaks[index].milestoneAge} tuổi ·{" "}
                          {result.pyramid.peaks[index].milestoneYear}
                        </small>
                      </div>
                    ))}
                  </div>
                  <div className={styles.numerologyPyramidArrow}>↗ ↑ ↖</div>
                  <div className={styles.numerologyPyramidBase}>
                    <div>
                      <span>Tháng sinh</span>
                      <strong>{result.pyramid.base.month}</strong>
                    </div>
                    <div>
                      <span>Ngày sinh</span>
                      <strong>{result.pyramid.base.day}</strong>
                    </div>
                    <div>
                      <span>Năm sinh</span>
                      <strong>{result.pyramid.base.year}</strong>
                    </div>
                  </div>
                </div>

                <div className={styles.numerologyPyramidDetails}>
                  <div className={styles.numerologyPyramidRule}>
                    <span>Mốc đỉnh đầu tiên</span>
                    <strong>{result.pyramid.firstMilestoneFormula}</strong>
                    <small>Các đỉnh tiếp theo cách nhau 9 năm.</small>
                  </div>
                  <div className={styles.numerologyPyramidCycles}>
                    {result.pyramid.peaks.map((peak, index) => (
                      <article key={index}>
                        <span>Chu kỳ {index + 1}</span>
                        <div>
                          <strong>Đỉnh {peak.display}</strong>
                          <small>{peak.formula}</small>
                        </div>
                        <div>
                          <strong>Thử thách {peak.challenge}</strong>
                          <small>{peak.challengeFormula}</small>
                        </div>
                        <p>
                          Mốc {peak.milestoneAge} tuổi · năm{" "}
                          {peak.milestoneYear}
                        </p>
                      </article>
                    ))}
                  </div>
                </div>
              </div>
            </section>

            <section
              className={`${styles.numerologyReportCard} ${styles.numerologyCalculations}`}
            >
              <div className={styles.numerologyCardHeading}>
                <span>04</span>
                <div>
                  <h3>Chi tiết phép tính</h3>
                  <p>
                    Số chủ 11, 22, 33 và số nợ nghiệp được giữ dưới dạng số kép.
                  </p>
                </div>
              </div>
              <div className={styles.numerologyCalculationList}>
                {METRICS.map(([key, label]) => (
                  <div className={styles.numerologyCalculation} key={key}>
                    <span>Chỉ số {label.toLowerCase()}</span>
                    <strong>{result.metrics[key].formula}</strong>
                  </div>
                ))}
              </div>
              <div className={styles.numerologySpecials}>
                <span>Chỉ số thiếu <strong>{missingDisplay}</strong></span>
                <span>Chỉ số nợ nghiệp <strong>{debtDisplay}</strong></span>
              </div>
            </section>

            <section
              className={`${styles.numerologyReportCard} ${styles.numerologyAnnualSection}`}
            >
              <div className={styles.numerologyCardHeading}>
                <span>05</span>
                <div>
                  <h3>Năm thế giới &amp; năm cá nhân</h3>
                  <p>
                    Tính theo năm hiện tại, kèm năm cá nhân kế tiếp và vị trí
                    trong chu kỳ 9 năm.
                  </p>
                </div>
              </div>

              <div className={styles.numerologyAnnualCards}>
                <article>
                  <span>Năm thế giới {result.annualCycle.worldYear.year}</span>
                  <strong>{result.annualCycle.worldYear.value}</strong>
                  <small>{result.annualCycle.worldYear.formula}</small>
                </article>
                <article className={styles.numerologyAnnualCurrent}>
                  <span>
                    Năm cá nhân hiện tại · {result.annualCycle.currentPersonalYear.year}
                  </span>
                  <strong>
                    PY ({result.annualCycle.currentPersonalYear.year}) ={" "}
                    {result.annualCycle.currentPersonalYear.value}
                  </strong>
                  <small>{result.annualCycle.currentPersonalYear.formula}</small>
                  <p>
                    Vận hành:{" "}
                    {result.annualCycle.currentPersonalYear.operatingFrom}
                    {" – "}
                    {result.annualCycle.currentPersonalYear.operatingTo}
                    {" · "}
                    {result.annualCycle.currentPersonalYear.durationMonths} tháng
                  </p>
                </article>
                <article>
                  <span>
                    Năm cá nhân kế tiếp · {result.annualCycle.nextPersonalYear.year}
                  </span>
                  <strong>
                    PY ({result.annualCycle.nextPersonalYear.year}) ={" "}
                    {result.annualCycle.nextPersonalYear.value}
                  </strong>
                  <small>{result.annualCycle.nextPersonalYear.formula}</small>
                  <p>
                    Vận hành:{" "}
                    {result.annualCycle.nextPersonalYear.operatingFrom}
                    {" – "}
                    {result.annualCycle.nextPersonalYear.operatingTo}
                    {" · "}
                    {result.annualCycle.nextPersonalYear.durationMonths} tháng
                  </p>
                </article>
              </div>

              <div className={styles.numerologySineChart}>
                <div className={styles.numerologySineHeading}>
                  <span>Biểu đồ chu kỳ hình sin</span>
                  <small>
                    Chu kỳ{" "}
                    {result.annualCycle.cycle[0].year}
                    {"–"}
                    {result.annualCycle.cycle[8].year}
                  </small>
                </div>
                <svg
                  aria-label={`Chu kỳ năm cá nhân, đánh dấu năm hiện tại ${result.annualCycle.currentPersonalYear.year}`}
                  role="img"
                  viewBox="0 0 900 220"
                >
                  <line
                    className={styles.numerologySineAxis}
                    x1="35"
                    x2="865"
                    y1="107"
                    y2="107"
                  />
                  <path
                    className={styles.numerologySinePath}
                    d={cyclePath}
                  />
                  {cyclePoints.map((point) => (
                    <g key={point.year}>
                      {point.isCurrent ? (
                        <>
                          <line
                            className={styles.numerologySineCurrentLine}
                            x1={point.x}
                            x2={point.x}
                            y1="20"
                            y2="185"
                          />
                          <rect
                            className={styles.numerologySineCurrentBadge}
                            height="24"
                            rx="12"
                            width="86"
                            x={point.x - 43}
                            y="7"
                          />
                          <text
                            className={styles.numerologySineCurrentBadgeText}
                            textAnchor="middle"
                            x={point.x}
                            y="23"
                          >
                            Hiện tại
                          </text>
                        </>
                      ) : null}
                      <circle
                        className={point.isCurrent
                          ? styles.numerologySineCurrentPoint
                          : styles.numerologySinePoint}
                        cx={point.x}
                        cy={point.y}
                        r={point.isCurrent ? 15 : 9}
                      />
                      <text
                        className={point.isCurrent
                          ? styles.numerologySineCurrentValue
                          : styles.numerologySineValue}
                        textAnchor="middle"
                        x={point.x}
                        y={point.y + 5}
                      >
                        {point.value}
                      </text>
                      <text
                        className={styles.numerologySineYear}
                        textAnchor="middle"
                        x={point.x}
                        y="205"
                      >
                        {point.year}
                      </text>
                    </g>
                  ))}
                </svg>
                <p>
                  Thời gian vận hành được xác định riêng theo khúc giao thời
                  của từng năm cá nhân trong chu kỳ 1–9.
                </p>
              </div>
            </section>

            <footer className={styles.numerologyFooter}>
              <span>
                Clow Cat Patronus · Bản đồ tham khảo theo nhân số học Pythagoras
              </span>
              <span>{result.normalizedName} · {result.formattedDate}</span>
            </footer>
          </article>

          <article
            aria-label="Hồ sơ nhân số học tóm tắt một trang A4"
            className={styles.numerologyCustomerSummary}
          >
            <header className={styles.numerologySummaryHeader}>
              <div>
                <Image
                  alt=""
                  height={38}
                  src="/assets/images/logo2.png"
                  width={38}
                />
                <span>
                  <strong>Clow Cat Patronus</strong>
                  <small>Hồ sơ nhân số học tóm tắt</small>
                </span>
              </div>
              <span>
                <small>Ngày lập</small>
                <strong>{generatedAt}</strong>
              </span>
            </header>

            <section className={styles.numerologySummaryIdentity}>
              <div>
                <small>Hồ sơ khách hàng</small>
                <h2>{result.fullName}</h2>
                <span>Ngày sinh {result.formattedDate}</span>
              </div>
              <p>
                Bản tổng hợp kết quả cuối theo hệ thống nhân số học Pythagoras.
              </p>
            </section>

            <section className={styles.numerologySummaryTop}>
              <article className={styles.numerologySummaryPanel}>
                <div className={styles.numerologySummaryPanelTitle}>
                  <span>01</span>
                  <div>
                    <strong>Biểu đồ ngày sinh &amp; họ tên</strong>
                    <small>Xanh: ngày sinh · Cam: họ tên</small>
                  </div>
                </div>
                <div className={styles.numerologySummaryBirthChart}>
                  {CHART_ORDER.map((number) => {
                    const birthCount =
                      result.digitCounts[String(number)] || 0;
                    const nameCount =
                      result.nameDigitCounts[String(number)] || 0;
                    return (
                      <div
                        className={birthCount
                          ? styles.numerologySummaryBirthCell
                          : styles.numerologySummaryBirthCellMissing}
                        key={number}
                      >
                        <small>Số {number}</small>
                        <span>
                          <abbr title="Ngày sinh">NS</abbr>
                          <strong className={birthCount
                            ? styles.numerologyBirthDigits
                            : styles.numerologyBirthDigitsMissing}
                          >
                            {birthCount
                              ? String(number).repeat(birthCount)
                              : "—"}
                          </strong>
                        </span>
                        <span>
                          <abbr title="Họ tên">HT</abbr>
                          <strong className={nameCount
                            ? styles.numerologyNameDigits
                            : styles.numerologyNameDigitsMissing}
                          >
                            {nameCount
                              ? String(number).repeat(nameCount)
                              : "—"}
                          </strong>
                        </span>
                      </div>
                    );
                  })}
                </div>
              </article>

              <article className={styles.numerologySummaryPanel}>
                <div className={styles.numerologySummaryPanelTitle}>
                  <span>02</span>
                  <div>
                    <strong>9 nhóm chỉ số</strong>
                    <small>Chỉ hiển thị kết quả cuối</small>
                  </div>
                </div>
                <div className={styles.numerologySummaryMetrics}>
                  {METRICS.map(([key, label]) => (
                    <div key={key}>
                      <span>{label}</span>
                      <strong>{result.metrics[key].display}</strong>
                    </div>
                  ))}
                  <div className={styles.numerologySummaryMetricSpecial}>
                    <span>Chỉ số thiếu</span>
                    <strong>{missingDisplay}</strong>
                  </div>
                  <div className={styles.numerologySummaryMetricDebt}>
                    <span>Nợ nghiệp</span>
                    <strong>{debtDisplay}</strong>
                  </div>
                </div>
              </article>
            </section>

            <section className={styles.numerologySummaryMiddle}>
              <article className={styles.numerologySummaryPanel}>
                <div className={styles.numerologySummaryPanelTitle}>
                  <span>03</span>
                  <div>
                    <strong>Kim tự tháp Pitago</strong>
                    <small>Đỉnh · thử thách · mốc tuổi</small>
                  </div>
                </div>
                <div className={styles.numerologySummaryPyramid}>
                  <div className={styles.numerologySummaryPyramidLevel}>
                    <div className={styles.numerologySummaryPyramidNode}>
                      <span>Đỉnh 4</span>
                      <strong>{result.pyramid.peaks[3].display}</strong>
                      <small>TT {result.pyramid.peaks[3].challenge}</small>
                    </div>
                    <p>
                      {result.pyramid.peaks[3].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[3].milestoneYear}
                    </p>
                  </div>
                  <i aria-hidden="true">↑</i>
                  <div className={styles.numerologySummaryPyramidLevel}>
                    <div className={styles.numerologySummaryPyramidNode}>
                      <span>Đỉnh 3</span>
                      <strong>{result.pyramid.peaks[2].display}</strong>
                      <small>TT {result.pyramid.peaks[2].challenge}</small>
                    </div>
                    <p>
                      {result.pyramid.peaks[2].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[2].milestoneYear}
                    </p>
                  </div>
                  <i aria-hidden="true">↗ ↑ ↖</i>
                  <div className={styles.numerologySummaryPyramidPair}>
                    {[0, 1].map((index) => (
                      <div key={index}>
                        <div className={styles.numerologySummaryPyramidNode}>
                          <span>Đỉnh {index + 1}</span>
                          <strong>
                            {result.pyramid.peaks[index].display}
                          </strong>
                          <small>
                            TT {result.pyramid.peaks[index].challenge}
                          </small>
                        </div>
                        <p>
                          {result.pyramid.peaks[index].milestoneAge} tuổi ·{" "}
                          {result.pyramid.peaks[index].milestoneYear}
                        </p>
                      </div>
                    ))}
                  </div>
                  <div className={styles.numerologySummaryPyramidBase}>
                    <span>Tháng <strong>{result.pyramid.base.month}</strong></span>
                    <span>Ngày <strong>{result.pyramid.base.day}</strong></span>
                    <span>Năm <strong>{result.pyramid.base.year}</strong></span>
                  </div>
                </div>
              </article>

              <article className={styles.numerologySummaryPanel}>
                <div className={styles.numerologySummaryPanelTitle}>
                  <span>04</span>
                  <div>
                    <strong>Năm cá nhân</strong>
                    <small>Hiện tại và chu kỳ kế tiếp</small>
                  </div>
                </div>
                <div className={styles.numerologySummaryAnnual}>
                  <div>
                    <span>
                      Năm thế giới{" "}
                      {result.annualCycle.worldYear.year}
                    </span>
                    <strong>{result.annualCycle.worldYear.value}</strong>
                  </div>
                  <div className={styles.numerologySummaryAnnualCurrent}>
                    <span>Năm cá nhân hiện tại</span>
                    <strong>
                      PY ({result.annualCycle.currentPersonalYear.year}) ={" "}
                      {result.annualCycle.currentPersonalYear.value}
                    </strong>
                    <small>
                      {result.annualCycle.currentPersonalYear.operatingFrom}
                      {" – "}
                      {result.annualCycle.currentPersonalYear.operatingTo}
                    </small>
                  </div>
                  <div>
                    <span>Năm cá nhân kế tiếp</span>
                    <strong>
                      PY ({result.annualCycle.nextPersonalYear.year}) ={" "}
                      {result.annualCycle.nextPersonalYear.value}
                    </strong>
                    <small>
                      {result.annualCycle.nextPersonalYear.operatingFrom}
                      {" – "}
                      {result.annualCycle.nextPersonalYear.operatingTo}
                    </small>
                  </div>
                </div>
                <div className={styles.numerologySummaryCycleStrip}>
                  {result.annualCycle.cycle.map((item) => (
                    <span
                      className={item.isCurrent
                        ? styles.numerologySummaryCycleCurrent
                        : undefined}
                      key={item.year}
                    >
                      <small>{item.year}</small>
                      <strong>{item.value}</strong>
                    </span>
                  ))}
                </div>
                <div className={styles.numerologySummaryPeakCycles}>
                  <div className={styles.numerologySummaryPeakCyclesHeading}>
                    <strong>4 đỉnh cao &amp; thử thách</strong>
                    <small>Mốc chuyển tiếp theo từng chu kỳ</small>
                  </div>
                  <div className={styles.numerologySummaryPeakCycleGrid}>
                    {result.pyramid.peaks.map((peak, index) => (
                      <article key={`summary-cycle-${index + 1}`}>
                        <span>Chu kỳ {index + 1}</span>
                        <div>
                          <p>
                            Đỉnh <strong>{peak.display}</strong>
                          </p>
                          <p>
                            Thử thách <strong>{peak.challenge}</strong>
                          </p>
                        </div>
                        <small>
                          {peak.milestoneAge} tuổi · {peak.milestoneYear}
                        </small>
                      </article>
                    ))}
                  </div>
                </div>
              </article>
            </section>

            <section className={styles.numerologySummarySine}>
              <div className={styles.numerologySummaryPanelTitle}>
                <span>05</span>
                <div>
                  <strong>Biểu đồ chu kỳ hình SIN</strong>
                  <small>
                    Chu kỳ {result.annualCycle.cycle[0].year}
                    {"–"}
                    {result.annualCycle.cycle[8].year}
                  </small>
                </div>
              </div>
              <svg
                aria-label={`Chu kỳ năm cá nhân, đánh dấu năm hiện tại ${result.annualCycle.currentPersonalYear.year}`}
                role="img"
                viewBox="0 0 900 220"
              >
                <line
                  className={styles.numerologySineAxis}
                  x1="35"
                  x2="865"
                  y1="107"
                  y2="107"
                />
                <path
                  className={styles.numerologySinePath}
                  d={cyclePath}
                />
                {cyclePoints.map((point) => (
                  <g key={point.year}>
                    {point.isCurrent ? (
                      <line
                        className={styles.numerologySineCurrentLine}
                        x1={point.x}
                        x2={point.x}
                        y1="20"
                        y2="185"
                      />
                    ) : null}
                    <circle
                      className={point.isCurrent
                        ? styles.numerologySineCurrentPoint
                        : styles.numerologySinePoint}
                      cx={point.x}
                      cy={point.y}
                      r={point.isCurrent ? 15 : 9}
                    />
                    <text
                      className={point.isCurrent
                        ? styles.numerologySineCurrentValue
                        : styles.numerologySineValue}
                      textAnchor="middle"
                      x={point.x}
                      y={point.y + 5}
                    >
                      {point.value}
                    </text>
                    <text
                      className={styles.numerologySineYear}
                      textAnchor="middle"
                      x={point.x}
                      y="205"
                    >
                      {point.year}
                    </text>
                  </g>
                ))}
              </svg>
            </section>

            <footer className={styles.numerologySummaryFooter}>
              <span>Clow Cat Patronus · Nhân số học Pythagoras</span>
              <span>{result.normalizedName} · {result.formattedDate}</span>
            </footer>
          </article>
        </section>
      ) : null}
    </section>
  );
}
