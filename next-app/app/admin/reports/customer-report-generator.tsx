"use client";

import Image from "next/image";
import { ChangeEvent, useEffect, useMemo, useState } from "react";
import {
  parseCustomerReportDocx,
  type CustomerReportBlock,
  type CustomerReportSection,
  type ParsedCustomerReport,
} from "@/lib/client-docx-report";
import adminStyles from "../admin.module.css";
import styles from "./customer-report.module.css";
import { ClowGlint } from "@/components/ui/clow-glint";

type SectionPage = {
  section: CustomerReportSection;
  blocks: CustomerReportBlock[];
  continuation: boolean;
};

function blockWeight(block: CustomerReportBlock) {
  if (block.kind === "table") {
    return 8 + block.rows.reduce((sum, row) => (
      sum + Math.max(4, Math.ceil(row.join(" ").length / 115) * 3)
    ), 0);
  }
  const base = block.kind === "subheading" ? 4 : block.kind === "list" ? 5 : 3;
  return base + Math.ceil(block.text.length / 105) * 3;
}

function paginateSection(section: CustomerReportSection): SectionPage[] {
  const pages: SectionPage[] = [];
  let blocks: CustomerReportBlock[] = [];
  let weight = 0;

  section.blocks.forEach((block) => {
    const nextWeight = blockWeight(block);
    if (blocks.length && weight + nextWeight > 112) {
      pages.push({ section, blocks, continuation: pages.length > 0 });
      blocks = [];
      weight = 0;
    }
    blocks.push(block);
    weight += nextWeight;
  });

  if (blocks.length || !pages.length) {
    pages.push({ section, blocks, continuation: pages.length > 0 });
  }
  return pages;
}

function TextWithLead({ text }: { text: string }) {
  const colon = text.indexOf(":");
  if (colon <= 0 || colon > 72) return text;
  return (
    <>
      <strong>{text.slice(0, colon + 1)}</strong>{text.slice(colon + 1)}
    </>
  );
}

function ReportBlock({ block }: { block: CustomerReportBlock }) {
  if (block.kind === "table") {
    return (
      <div className={styles.reportTableWrap}>
        <table className={styles.reportTable}>
          <thead>
            <tr>
              {(block.rows[0] || []).map((cell, index) => (
                <th key={`${cell}-${index}`}>{cell}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {block.rows.slice(1).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td key={`${cell}-${cellIndex}`}>
                    {cellIndex === 1 ? <strong>{cell}</strong> : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (block.kind === "subheading") {
    return <h3 className={styles.reportSubheading}>{block.text}</h3>;
  }
  if (block.kind === "list") {
    return (
      <div className={styles.reportListItem}>
        <ClowGlint size="xs" />
        <p><TextWithLead text={block.text} /></p>
      </div>
    );
  }
  return <p className={styles.reportParagraph}><TextWithLead text={block.text} /></p>;
}

function ReportPageFrame({
  children,
  customerName,
  pageNumber,
}: {
  children: React.ReactNode;
  customerName: string;
  pageNumber: number;
}) {
  return (
    <article className={styles.reportPage} data-report-page>
      <header className={styles.reportPageHeader}>
        <span>
          <Image alt="Clow Cat Patronus" height={34} src="/assets/images/logo2.png" width={34} />
          <strong>Clow Cat Patronus</strong>
        </span>
        <small>Hồ sơ nhân số học toàn diện</small>
      </header>
      <div className={styles.reportPageBody}>{children}</div>
      <footer className={styles.reportPageFooter}>
        <span>© 2026 Clow Cat Patronus · Được tạo ra với tình yêu và năng lượng tích cực</span>
        <span>{customerName} · Trang {pageNumber}</span>
      </footer>
    </article>
  );
}

export function CustomerReportGenerator() {
  const [parsed, setParsed] = useState<ParsedCustomerReport | null>(null);
  const [mapSource, setMapSource] = useState("");
  const [mapLabel, setMapLabel] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [expertName, setExpertName] = useState("Lê Chí Cường");
  const [generatedAt, setGeneratedAt] = useState("");
  const [message, setMessage] = useState("");
  const [isReading, setIsReading] = useState(false);

  useEffect(() => {
    setGeneratedAt(new Intl.DateTimeFormat("vi-VN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    }).format(new Date()));
  }, []);

  const sectionPages = useMemo(() => (
    parsed?.sections.flatMap(paginateSection) || []
  ), [parsed]);

  const totalPages = 2 + sectionPages.length;
  const isReady = Boolean(parsed && mapSource && customerName.trim() && birthDate.trim());

  async function readDocx(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsReading(true);
    setMessage("");
    try {
      const next = await parseCustomerReportDocx(file);
      setParsed(next);
      setCustomerName(next.customerName);
      setBirthDate(next.birthDate);
    } catch (error) {
      setParsed(null);
      setMessage(error instanceof Error ? error.message : "Không thể đọc file DOCX.");
    } finally {
      setIsReading(false);
    }
  }

  function readMap(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(jpeg|png)$/i.test(file.type)) {
      setMapSource("");
      setMapLabel("");
      setMessage("Ảnh bản đồ cần là file JPG hoặc PNG.");
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setMessage("Không thể đọc ảnh bản đồ khách.");
    reader.onload = () => {
      setMapSource(String(reader.result || ""));
      setMapLabel(file.name);
      setMessage("");
    };
    reader.readAsDataURL(file);
  }

  function printReport() {
    if (!isReady) return;
    const oldTitle = document.title;
    document.title = `Report-nhan-so-${customerName.trim().replace(/\s+/g, "-")}`;
    document.body.dataset.customerReportPrint = "true";
    const cleanup = () => {
      delete document.body.dataset.customerReportPrint;
      document.title = oldTitle;
    };
    window.addEventListener("afterprint", cleanup, { once: true });
    window.requestAnimationFrame(() => window.print());
    window.setTimeout(cleanup, 2_000);
  }

  function reset() {
    setParsed(null);
    setMapSource("");
    setMapLabel("");
    setCustomerName("");
    setBirthDate("");
    setExpertName("Lê Chí Cường");
    setMessage("");
  }

  return (
    <section className={styles.reportWorkspace}>
      <section className={styles.reportUploader} data-report-ui>
        <div className={styles.reportUploaderIntro}>
          <p>Hai file đầu vào</p>
          <h2>Ghép nội dung thành report hoàn chỉnh</h2>
          <span>
            DOCX cung cấp nội dung phân tích; JPG/PNG A4 trở thành trang bản đồ.
            Mọi dữ liệu chỉ được xử lý trong trình duyệt và không gửi lên hệ thống.
          </span>
        </div>

        <div className={styles.reportUploadGrid}>
          <label className={styles.reportDropField}>
            <span>01 · Nội dung phân tích</span>
            <strong>{isReading ? "Đang đọc DOCX…" : parsed ? parsed.title : "Chọn file .docx"}</strong>
            <small>Tự nhận diện họ tên, ngày sinh, các chương và bảng chỉ số.</small>
            <input accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onChange={readDocx} type="file" />
          </label>
          <label className={styles.reportDropField}>
            <span>02 · Bản đồ khách A4</span>
            <strong>{mapLabel || "Chọn file JPG/PNG"}</strong>
            <small>Dùng đúng ảnh xuất từ nút “JPG khách · khổ A4”.</small>
            <input accept="image/jpeg,image/png" onChange={readMap} type="file" />
          </label>
        </div>

        <div className={styles.reportMetaGrid}>
          <label className={adminStyles.field}>
            Họ và tên khách
            <input onChange={(event) => setCustomerName(event.target.value)} placeholder="Lê Thị Miền" value={customerName} />
          </label>
          <label className={adminStyles.field}>
            Ngày sinh
            <input onChange={(event) => setBirthDate(event.target.value)} placeholder="28/06/1985" value={birthDate} />
          </label>
          <label className={adminStyles.field}>
            Chuyên gia đồng hành
            <input onChange={(event) => setExpertName(event.target.value)} value={expertName} />
          </label>
        </div>

        {message ? <p className={styles.reportMessage} role="status">{message}</p> : null}
      </section>

      {parsed ? (
        <section className={styles.reportPreviewArea}>
          <div className={styles.reportToolbar} data-report-ui>
            <div>
              <strong>{isReady ? `Report đã sẵn sàng · ${totalPages} trang A4` : "Cần thêm ảnh bản đồ và thông tin khách"}</strong>
              <small>{parsed.sections.length} chương phân tích · {parsed.metrics.length} chỉ số nhận diện</small>
            </div>
            <span>
              <button className={adminStyles.secondaryLink} onClick={reset} type="button">Làm mới</button>
              <button className={adminStyles.submit} disabled={!isReady} onClick={printReport} type="button">
                ↓ Xuất PDF report
              </button>
            </span>
          </div>

          <div className={styles.reportDocument} id="customer-report">
            <article className={`${styles.reportPage} ${styles.reportCover}`} data-report-page>
              <div className={styles.reportCoverBrand}>
                <Image alt="Clow Cat Patronus" height={82} src="/assets/images/logo2.png" width={82} />
                <span><strong>Clow Cat Patronus</strong></span>
              </div>
              <div className={styles.reportCoverTitle}>
                <span>Hồ sơ</span>
                <strong>Nhân số học</strong>
                <em>Toàn diện</em>
              </div>
              <div className={styles.reportCoverMain}>
                <h2>
                  {customerName || parsed.customerName}
                  <span aria-hidden="true"> · </span>
                  <small>{birthDate || "Chưa nhận diện"}</small>
                </h2>
                <span>
                  Bản phân tích chuyên sâu giúp nhận diện tính cách, nội tâm,
                  bài học và lộ trình chuyển hóa cá nhân.
                </span>
              </div>
              <div className={styles.reportCoverStats}>
                <div><strong>9</strong><span>Chỉ số cốt lõi</span></div>
                <div><strong>{parsed.sections.length}</strong><span>Chương phân tích</span></div>
                <div><strong>{totalPages}</strong><span>Trang hồ sơ</span></div>
              </div>
              <div className={styles.reportCoverMeta}>
                <span><small>Chuyên gia đồng hành</small><strong>{expertName || "Clow Cat Patronus"}</strong></span>
                <span><small>Ngày lập report</small><strong>{generatedAt}</strong></span>
              </div>
              <footer>© 2026 Clow Cat Patronus · Được tạo ra với tình yêu và năng lượng tích cực</footer>
            </article>

            <article className={`${styles.reportPage} ${styles.reportMapPage}`} data-report-page>
              {mapSource ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img alt={`Bản đồ nhân số học của ${customerName}`} src={mapSource} />
              ) : (
                <div><strong>Chưa có ảnh bản đồ khách</strong><span>Chọn JPG hoặc PNG khổ A4 để hoàn thiện trang này.</span></div>
              )}
            </article>

            {sectionPages.map((page, index) => (
              <ReportPageFrame
                customerName={customerName || parsed.customerName}
                key={`${page.section.number}-${index}`}
                pageNumber={index + 3}
              >
                <div className={styles.reportSectionHeading}>
                  <span>{String(page.section.number).padStart(2, "0")}</span>
                  <div>
                    <h2>{page.section.title}</h2>
                    <p>{page.continuation ? "Phân tích chuyên sâu · tiếp theo" : `Dành riêng cho ${customerName || parsed.customerName}`}</p>
                  </div>
                </div>
                <div className={styles.reportSectionContent}>
                  {page.blocks.map((block, blockIndex) => (
                    <ReportBlock block={block} key={`${block.kind}-${blockIndex}`} />
                  ))}
                </div>
                <div className={styles.reportPageMotto}>Khám phá bản thân, bật phá tiềm năng</div>
              </ReportPageFrame>
            ))}
          </div>
        </section>
      ) : (
        <section className={styles.reportEmptyState} data-report-ui>
          <span>DOCX</span>
          <h2>Report xem trước sẽ xuất hiện tại đây</h2>
          <p>Chọn file nội dung để hệ thống tự tách chương và dàn trang theo mẫu Clow Cat Patronus.</p>
        </section>
      )}
    </section>
  );
}
