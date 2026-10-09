"use client";

/**
 * Giao diện tính nhân số, xem lịch sử và lưu/xuất hồ sơ cho admin.
 * Luồng tính: submit -> calculateNumerology (lib/numerology.ts) -> cập nhật result.
 * Luồng lưu: saveArchive -> cấp số hồ sơ -> module numerology-export -> API lưu Blob.
 * Luồng xuất JPG: exportCustomerJpg -> cấp/lấy số hồ sơ -> vẽ Blob -> tải xuống.
 * Lịch sử và quyền lấy từ props/API; quy ước biểu đồ nằm ở numerology-presentation.
 * Mã vẽ PDF/JPG được tải theo nhu cầu, giúp phần giao diện tập trung vào state và sự kiện.
 */
import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  calculateNumerology,
  type NamePart,
  type NumerologyResult,
} from "@/lib/numerology";
import type { NumerologyRecordListItem } from "@/lib/admin/numerology-records";
import {
  METRICS,
  CHART_ORDER,
  CYCLE_POINT_Y,
  createSmoothCyclePath,
} from "@/lib/admin/numerology-presentation";
import {
  formatArchiveBytes,
  formatBirthDate as formatArchiveDate,
} from "@/lib/admin/display-format";
import { ClowGlint } from "@/components/ui/clow-glint";
import styles from "../admin.module.css";

/**
 * Hiển thị một phần phân tích họ tên: chữ cái và tổng số trước/sau rút gọn.
 * Dùng cho bảng chi tiết nguyên âm/phụ âm; giá trị trống hiển thị dấu —.
 * Chỉ trình bày kết quả đã tính, không tự áp dụng lại quy tắc nhân số.
 */
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

const PYRAMID_EDGES = [
  "month-peak-1",
  "day-peak-1",
  "day-peak-2",
  "year-peak-2",
  "peak-1-peak-3",
  "peak-2-peak-3",
  "peak-3-peak-4",
] as const;

/**
 * Vẽ cây kim tự tháp từ dữ liệu tháng/ngày/năm và bốn đỉnh trong kết quả tính.
 * Mỗi đỉnh hiển thị thử thách, tuổi và năm mốc; CSS định vị các cạnh theo data-node/data-edge.
 * compact đổi bố cục hiển thị, không thay đổi chỉ số hoặc tính lại các mốc.
 */
function PyramidTree({
  pyramid,
  compact = false,
}: {
  pyramid: NumerologyResult["pyramid"];
  compact?: boolean;
}) {
  const baseNodes = [
    { key: "month", label: "Tháng", value: pyramid.base.month },
    { key: "day", label: "Ngày", value: pyramid.base.day },
    { key: "year", label: "Năm", value: pyramid.base.year },
  ];

  return (
    <div
      aria-label="Sơ đồ cây kim tự tháp Pitago"
      className={`${styles.numerologyPyramidVisual} ${
        compact ? styles.numerologyPyramidVisualCompact : ""
      }`}
    >
      <div className={styles.numerologyPyramidLegend} aria-hidden="true">
        <span><i />Đỉnh cao</span>
        <span><i />Thử thách</span>
      </div>
      <div className={styles.numerologyPyramidTree}>
        {PYRAMID_EDGES.map((edge) => (
          <i
            aria-hidden="true"
            className={styles.numerologyPyramidTreeEdge}
            data-edge={edge}
            key={edge}
          />
        ))}

        {pyramid.peaks.map((peak, index) => (
          <div
            className={styles.numerologyPyramidTreePeak}
            data-node={`peak-${index + 1}`}
            key={`peak-${index + 1}`}
          >
            <span>Đỉnh {index + 1}</span>
            <strong>{peak.display}</strong>
            <b aria-label={`Thử thách ${peak.challenge}`}>
              {peak.challenge}
            </b>
            <small className={styles.numerologyPyramidMilestone}>
              {peak.milestoneAge}T · {peak.milestoneYear}
            </small>
          </div>
        ))}

        {baseNodes.map((node) => (
          <div
            className={styles.numerologyPyramidTreeBase}
            data-node={`base-${node.key}`}
            key={node.key}
          >
            <strong>{node.value}</strong>
            <span>{node.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

type NumerologyCalculatorProps = {
  canConfigureHistory: boolean;
  canSave: boolean;
  historyAvailable: boolean;
  historyLimit: number;
  initialRecords: NumerologyRecordListItem[];
  initialTotal: number;
};

/**
 * Điều phối form tra cứu, kết quả, phân trang hồ sơ và thao tác xuất/in báo cáo.
 * Tính toán thuần nằm ở lib/numerology; quy ước trình bày ở numerology-presentation.
 * Mã vẽ JPG/đóng gói PDF chỉ tải bằng import() khi lưu hoặc xuất, không import tĩnh.
 * Các cờ canSave/canConfigureHistory phục vụ UI; API vẫn kiểm tra quyền và chủ sở hữu hồ sơ.
 */
export function NumerologyCalculator({
  canConfigureHistory,
  canSave,
  historyAvailable,
  historyLimit,
  initialRecords,
  initialTotal,
}: NumerologyCalculatorProps) {
  const [fullName, setFullName] = useState("");
  const [birthDate, setBirthDate] = useState("");
  const [result, setResult] = useState<NumerologyResult | null>(null);
  const [manualReportNumber, setManualReportNumber] = useState("");
  const [reportNumber, setReportNumber] = useState<number | null>(null);
  const [generatedAt, setGeneratedAt] = useState("");
  const [message, setMessage] = useState("");
  const [isExportingJpg, setIsExportingJpg] = useState(false);
  const [isSavingArchive, setIsSavingArchive] = useState(false);
  const [isResolvingReportNumber, setIsResolvingReportNumber] = useState(false);
  const [records, setRecords] = useState(initialRecords);
  const [configuredHistoryLimit, setConfiguredHistoryLimit] = useState(historyLimit);
  const [historyLimitDraft, setHistoryLimitDraft] = useState(String(historyLimit));
  const [historyLimitSaving, setHistoryLimitSaving] = useState(false);
  const [historyTotal, setHistoryTotal] = useState(initialTotal);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyPageCount, setHistoryPageCount] = useState(
    Math.max(1, Math.ceil(initialTotal / 20)),
  );
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyMessage, setHistoryMessage] = useState(
    historyAvailable ? "" : "Kho hồ sơ chưa sẵn sàng. Hãy áp dụng migration mới.",
  );

  /**
   * Đọc một trang hồ sơ qua API riêng rồi cập nhật danh sách và tổng số của giao diện.
   * Chỉ yêu cầu trang cần xem; thông báo lỗi qua historyMessage thay vì xóa kết quả đang xem.
   */
  async function loadHistoryPage(page: number) {
    if (!historyAvailable || historyLoading) return;
    setHistoryLoading(true);
    setHistoryMessage("");
    try {
      const response = await fetch(`/api/admin/numerology-records?page=${page}`, {
        cache: "no-store",
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể tải danh sách.");
      setRecords(payload.records || []);
      setHistoryTotal(payload.total || 0);
      setHistoryPage(payload.page || page);
      setHistoryPageCount(payload.pageCount || 1);
      if (payload.historyLimit) {
        setConfiguredHistoryLimit(payload.historyLimit);
        setHistoryLimitDraft(String(payload.historyLimit));
      }
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Không thể tải danh sách.");
    } finally {
      setHistoryLoading(false);
    }
  }

  /**
   * Lưu giới hạn hồ sơ của tài khoản qua API settings; khóa form trong khi gửi.
   * Sau khi lưu, tải lại lịch sử theo cấu hình mới và hiển thị lỗi nếu API từ chối.
   */
  async function updateHistoryLimit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canConfigureHistory || historyLimitSaving) return;
    const limit = Number(historyLimitDraft);
    if (!Number.isSafeInteger(limit) || limit < 20 || limit > 1000) {
      setHistoryMessage("Giới hạn phải là số nguyên từ 20 đến 1000.");
      return;
    }
    setHistoryLimitSaving(true);
    setHistoryMessage("Đang cập nhật giới hạn riêng cho từng tài khoản…");
    try {
      const response = await fetch("/api/admin/numerology-records/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ limit }),
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể cập nhật giới hạn.");
      const nextLimit = Number(payload.historyLimit) || limit;
      setConfiguredHistoryLimit(nextLimit);
      setHistoryLimitDraft(String(nextLimit));
      await loadHistoryPage(1);
      setHistoryMessage(`Đã đặt giới hạn ${nextLimit} hồ sơ cho mỗi tài khoản.`);
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Không thể cập nhật giới hạn.");
    } finally {
      setHistoryLimitSaving(false);
    }
  }

  /**
   * Tải module xuất báo cáo, tạo PDF/JPG rồi gửi multipart FormData tới API hồ sơ.
   * Chỉ chạy khi được phép lưu và kho khả dụng; metadata đi cùng số hồ sơ đã được cấp.
   * Sau khi lưu thành công, tải lại trang lịch sử đầu tiên; trạng thái loading luôn được trả lại.
   */
  async function saveArchive(
    nextResult: NumerologyResult,
    generatedAtLabel: string,
    nextReportNumber: number,
  ) {
    if (!canSave || !historyAvailable) return;
    setIsSavingArchive(true);
    setHistoryMessage("Đang tối ưu và lưu PDF đầy đủ cùng ảnh A4…");
    try {
      const { createOptimizedArchiveFiles } = await import("@/lib/admin/numerology-export");
      const files = await createOptimizedArchiveFiles(
        nextResult,
        generatedAtLabel,
        nextReportNumber,
      );
      const form = new FormData();
      form.set("customerName", nextResult.fullName);
      form.set("reportNumber", String(nextReportNumber));
      form.set("normalizedName", nextResult.normalizedName);
      form.set("birthDate", nextResult.isoDate);
      form.set("resultData", JSON.stringify(nextResult));
      form.set("pdf", files.pdf, "ban-do-nhan-so.pdf");
      form.set("image", files.image, "tom-tat-a4.jpg");
      const response = await fetch("/api/admin/numerology-records", {
        method: "POST",
        body: form,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.error || "Không thể lưu hồ sơ.");
      await loadHistoryPage(1);
      setHistoryMessage("Đã lưu riêng tư PDF đầy đủ và ảnh A4 đã tối ưu.");
    } catch (error) {
      setHistoryMessage(error instanceof Error ? error.message : "Không thể lưu hồ sơ.");
    } finally {
      setIsSavingArchive(false);
    }
  }

  /**
   * Yêu cầu API cấp/giữ số hồ sơ cho họ tên chuẩn hóa và ngày sinh hiện tại.
   * Số nhập tay được gửi dưới requestedNumber; để trống thì server quyết định.
   * Chỉ nhận số nguyên dương an toàn, tránh xuất báo cáo với mã hồ sơ chưa hợp lệ.
   */
  async function resolveReportNumber(nextResult: NumerologyResult) {
    const response = await fetch("/api/admin/numerology-records/report-number", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        normalizedName: nextResult.normalizedName,
        birthDate: nextResult.isoDate,
        requestedNumber: manualReportNumber.trim() || null,
      }),
    });
    const payload = await response.json();
    if (!response.ok) throw new Error(payload.error || "Không thể cấp số hồ sơ.");
    const resolved = Number(payload.reportNumber);
    if (!Number.isSafeInteger(resolved) || resolved < 1) {
      throw new Error("Số hồ sơ được cấp không hợp lệ.");
    }
    return resolved;
  }

  /**
   * Xử lý nút tính: kiểm tra đầu vào, tính chỉ số, lấy số hồ sơ và cập nhật kết quả.
   * Khóa thao tác cấp số để tránh gửi lặp; lưu archive chạy riêng để không chặn hiển thị kết quả.
   */
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (isResolvingReportNumber) return;
    setIsResolvingReportNumber(true);
    try {
      const nextResult = calculateNumerology(fullName, birthDate);
      const nextReportNumber = await resolveReportNumber(nextResult);
      const generatedAtLabel = new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date());
      setResult(nextResult);
      setReportNumber(nextReportNumber);
      setFullName(nextResult.fullName);
      setGeneratedAt(generatedAtLabel);
      setMessage("");
      void saveArchive(nextResult, generatedAtLabel, nextReportNumber);
      window.requestAnimationFrame(() => {
        document.getElementById("numerology-report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể tính chỉ số.");
    } finally {
      setIsResolvingReportNumber(false);
    }
  }

  /**
   * Mở hồ sơ đã lưu bằng cách tính lại từ tên/ngày sinh và giữ số hồ sơ của bản ghi.
   * Không cấp số mới hoặc tạo bản lưu mới; cuộn tới kết quả sau khi giao diện cập nhật.
   */
  function openRecentRecord(record: NumerologyRecordListItem) {
    try {
      const nextResult = calculateNumerology(record.customerName, record.birthDate);
      const generatedAtLabel = new Intl.DateTimeFormat("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(new Date(record.updatedAt));
      setFullName(nextResult.fullName);
      setBirthDate(nextResult.isoDate);
      setResult(nextResult);
      setReportNumber(record.reportNumber);
      setManualReportNumber("");
      setGeneratedAt(generatedAtLabel);
      setMessage("");
      window.requestAnimationFrame(() => {
        document.getElementById("numerology-report")?.scrollIntoView({
          behavior: "smooth",
          block: "start",
        });
      });
    } catch {
      setHistoryMessage("Không thể mở lại hồ sơ này.");
    }
  }

  /**
   * Xóa trạng thái nhập và kết quả đang xem trong calculator.
   * Không xóa bản ghi hoặc file đã lưu trong kho hồ sơ.
   */
  function reset() {
    setFullName("");
    setBirthDate("");
    setResult(null);
    setManualReportNumber("");
    setReportNumber(null);
    setGeneratedAt("");
    setMessage("");
  }

  /**
   * Đặt chế độ in full/summary và tên tài liệu rồi gọi hộp thoại in trình duyệt.
   * Khôi phục title và thuộc tính CSS sau afterprint, kèm timer dự phòng cho trình duyệt.
   * Chỉ dùng khi đã có kết quả và số hồ sơ; không thực hiện tải hoặc lưu file tự động.
   */
  function printPdf(mode: "full" | "summary") {
    if (!result || !reportNumber) return;
    const previousTitle = document.title;
    const safeName = result.normalizedName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    document.title = mode === "summary"
      ? `Ho-so-${reportNumber}-tom-tat-${safeName || "khach-hang"}`
      : `Ho-so-${reportNumber}-day-du-${safeName || "khach-hang"}`;
    document.documentElement.dataset.numerologyPrint = mode;
    document.body.dataset.numerologyPrint = mode;
    const restorePrintState = () => {
      document.title = previousTitle;
      delete document.documentElement.dataset.numerologyPrint;
      delete document.body.dataset.numerologyPrint;
    };
    window.addEventListener("afterprint", restorePrintState, { once: true });
    window.print();
    window.setTimeout(restorePrintState, 800);
  }

  /**
   * Tải module vẽ khi cần, tạo JPG A4 và mở liên kết tải với tên theo số hồ sơ.
   * Khóa nút để tránh xuất trùng; thu hồi Object URL sau khi kích hoạt tải nhằm giải phóng bộ nhớ.
   */
  async function exportCustomerJpg() {
    if (!result || !reportNumber || isExportingJpg) return;
    setIsExportingJpg(true);
    setMessage("");

    try {
      const { renderCustomerSummaryAsJpeg } = await import("@/lib/admin/numerology-export");
      const jpeg = await renderCustomerSummaryAsJpeg(result, generatedAt, reportNumber);
      const safeName = result.normalizedName
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
      const url = URL.createObjectURL(jpeg);
      const link = document.createElement("a");
      link.href = url;
      link.download = `Ho-so-${reportNumber}-${safeName || "khach-hang"}.jpg`;
      link.click();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Không thể xuất JPG.");
    } finally {
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
      <section className={styles.numerologyHistoryPanel}>
        <div className={styles.numerologyHistoryHeader}>
          <div>
            <p className={styles.eyebrow}>Kho hồ sơ riêng tư</p>
            <h2>Khách hàng tra gần đây</h2>
            <p>
              Kho của riêng tài khoản đang đăng nhập · {historyTotal}/{configuredHistoryLimit} hồ sơ
              gần nhất · 20 người mỗi trang.
            </p>
          </div>
          <div className={styles.numerologyHistoryControls}>
            <Link className={styles.numerologyArchiveManageLink} href="/admin/numerology/archive">
              Quản lý toàn bộ kho →
            </Link>
            <span className={styles.numerologyArchiveStatus} data-saving={isSavingArchive}>
              {isSavingArchive ? "Đang tối ưu file…" : "PDF + JPG A4"}
            </span>
            {canConfigureHistory ? (
              <form onSubmit={updateHistoryLimit}>
                <label htmlFor="numerology-history-limit">Giới hạn mỗi tài khoản</label>
                <span>
                  <input
                    aria-describedby="numerology-history-limit-help"
                    id="numerology-history-limit"
                    max={1000}
                    min={20}
                    onChange={(event) => setHistoryLimitDraft(event.target.value)}
                    step={1}
                    type="number"
                    value={historyLimitDraft}
                  />
                  <button disabled={historyLimitSaving} type="submit">
                    {historyLimitSaving ? "Đang lưu…" : "Lưu giới hạn"}
                  </button>
                </span>
                <small id="numerology-history-limit-help">Từ 20–1000 hồ sơ, áp dụng riêng cho từng user.</small>
              </form>
            ) : (
              <small className={styles.numerologyHistoryLimitNote}>
                Giới hạn {configuredHistoryLimit} hồ sơ/tài khoản
              </small>
            )}
          </div>
        </div>

        {records.length ? (
          <div className={styles.numerologyHistoryList} aria-busy={historyLoading}>
            {records.map((record) => (
              <article className={styles.numerologyHistoryItem} key={record.id}>
                <button type="button" onClick={() => openRecentRecord(record)}>
                  <span>{record.customerName.charAt(0)}</span>
                  <strong>{record.customerName}</strong>
                  <small>
                    Hồ sơ số {record.reportNumber} · Ngày sinh {formatArchiveDate(record.birthDate, "")}
                  </small>
                </button>
                <div>
                  <a
                    href={`/api/admin/numerology-records/${record.id}/download?type=pdf`}
                  >
                    PDF · {formatArchiveBytes(record.pdfByteSize)}
                  </a>
                  <a
                    href={`/api/admin/numerology-records/${record.id}/download?type=jpg`}
                  >
                    JPG · {formatArchiveBytes(record.imageByteSize)}
                  </a>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className={styles.numerologyHistoryEmpty}>
            <ClowGlint size="sm" />
            <strong>Chưa có hồ sơ đã lưu</strong>
            <span>Hồ sơ đầu tiên sẽ xuất hiện sau khi bạn lập bản đồ.</span>
          </div>
        )}

        <div className={styles.numerologyHistoryFooter}>
          <p role="status">{historyMessage}</p>
          {historyPageCount > 1 ? (
            <nav aria-label="Phân trang hồ sơ gần đây">
              <button
                disabled={historyLoading || historyPage <= 1}
                onClick={() => void loadHistoryPage(historyPage - 1)}
                type="button"
              >
                ← Trước
              </button>
              <span>Trang {historyPage}/{historyPageCount}</span>
              <button
                disabled={historyLoading || historyPage >= historyPageCount}
                onClick={() => void loadHistoryPage(historyPage + 1)}
                type="button"
              >
                Sau →
              </button>
            </nav>
          ) : null}
        </div>
      </section>

      <section className={styles.numerologyFormPanel}>
        <div>
          <p className={styles.eyebrow}>Hồ sơ khách hàng</p>
          <h2>Thông tin lập bản đồ</h2>
          <p>
            Áp dụng cùng công thức Pythagoras như trang chủ. PDF đầy đủ và ảnh
            A4 được tối ưu rồi lưu trong kho riêng tư của trang quản trị.
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
          <label className={styles.field}>
            Số hồ sơ (không bắt buộc)
            <input
              autoComplete="off"
              inputMode="numeric"
              maxLength={9}
              onChange={(event) => {
                setManualReportNumber(event.target.value.replace(/\D/g, ""));
              }}
              pattern="[1-9][0-9]{0,8}"
              placeholder="Để trống để cấp tự động"
              value={manualReportNumber}
            />
          </label>
          <div className={styles.numerologyFormActions}>
            <button
              className={styles.submit}
              disabled={isResolvingReportNumber}
              type="submit"
            >
              <ClowGlint size="sm" />
              {isResolvingReportNumber ? "Đang cấp số hồ sơ…" : "Lập bản đồ"}
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
              <small>Hồ sơ nhân số học số {reportNumber}</small>
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
              <p>Hồ sơ nhân số học số {reportNumber}</p>
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
                <PyramidTree pyramid={result.pyramid} />

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
            aria-label={`Hồ sơ nhân số học số ${reportNumber} tóm tắt một trang A4`}
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
                  <small>Hồ sơ nhân số học số {reportNumber} · Tóm tắt</small>
                </span>
              </div>
              <span>
                <small>Ngày lập</small>
                <strong>{generatedAt}</strong>
              </span>
            </header>

            <section className={styles.numerologySummaryIdentity}>
              <div>
                <small>Hồ sơ nhân số học số {reportNumber}</small>
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
                <PyramidTree compact pyramid={result.pyramid} />
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
