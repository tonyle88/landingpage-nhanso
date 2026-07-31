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

  function printPdf() {
    if (!result) return;
    const previousTitle = document.title;
    const safeName = result.normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    document.title = `Ban-do-nhan-so-${safeName || "khach-hang"}`;
    const restoreTitle = () => {
      document.title = previousTitle;
    };
    window.addEventListener("afterprint", restoreTitle, { once: true });
    window.print();
    window.setTimeout(restoreTitle, 500);
  }

  const missingDisplay = result?.missing.length
    ? result.missing.join(" · ")
    : "Không có";
  const debtDisplay = result?.karmicDebts.length
    ? result.karmicDebts.map((item) => item.display).join(" · ")
    : "Không có";

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
            <button className={styles.submit} onClick={printPdf} type="button">
              ↓ Xuất PDF
            </button>
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
                    <h3>Biểu đồ ngày sinh</h3>
                    <p>Ô “—” là số không xuất hiện trong ngày sinh.</p>
                  </div>
                </div>
                <div className={styles.numerologyBirthChart}>
                  {CHART_ORDER.map((number) => {
                    const count = result.digitCounts[String(number)] || 0;
                    return (
                      <div
                        className={count
                          ? styles.numerologyBirthCell
                          : styles.numerologyBirthCellMissing}
                        key={number}
                      >
                        <small>Số {number}</small>
                        <strong>{count ? String(number).repeat(count) : "—"}</strong>
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
                    |tháng sinh − năm sinh|.
                  </p>
                </div>
              </div>
              <div className={styles.numerologyPyramidLayout}>
                <div
                  aria-label="Biểu đồ kim tự tháp Pitago"
                  className={styles.numerologyPyramid}
                >
                  <div className={styles.numerologyPyramidTop}>
                    <span>Đỉnh 4</span>
                    <strong>{result.pyramid.peaks[3].value}</strong>
                    <small>
                      {result.pyramid.peaks[3].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[3].milestoneYear}
                    </small>
                  </div>
                  <div className={styles.numerologyPyramidArrow}>↑</div>
                  <div className={styles.numerologyPyramidMiddle}>
                    <span>Đỉnh 3</span>
                    <strong>{result.pyramid.peaks[2].value}</strong>
                    <small>
                      {result.pyramid.peaks[2].milestoneAge} tuổi ·{" "}
                      {result.pyramid.peaks[2].milestoneYear}
                    </small>
                  </div>
                  <div className={styles.numerologyPyramidArrow}>↗ ↑ ↖</div>
                  <div className={styles.numerologyPyramidPair}>
                    {[0, 1].map((index) => (
                      <div key={index}>
                        <span>Đỉnh {index + 1}</span>
                        <strong>{result.pyramid.peaks[index].value}</strong>
                        <small>
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
                          <strong>Đỉnh {peak.value}</strong>
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

            <footer className={styles.numerologyFooter}>
              <span>
                Clow Cat Patronus · Bản đồ tham khảo theo nhân số học Pythagoras
              </span>
              <span>{result.normalizedName} · {result.formattedDate}</span>
            </footer>
          </article>
        </section>
      ) : null}
    </section>
  );
}
