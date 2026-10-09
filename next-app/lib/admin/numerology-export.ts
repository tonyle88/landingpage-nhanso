"use client";

/**
 * Vẽ báo cáo nhân số A4 trên canvas và đóng gói JPEG thành PDF ngay trong trình duyệt.
 * Calculator tải module này bằng import() khi lưu/xuất để tránh tải mã vẽ khi chỉ xem form.
 * Module chỉ tạo Blob; caller quyết định tải xuống hoặc gửi Blob vào API lưu hồ sơ riêng.
 */
import type { NamePart, NumerologyResult } from "@/lib/numerology";
import { METRICS, CHART_ORDER, CYCLE_POINT_Y } from "./numerology-presentation";

/**
 * Nạp font tiếng Việt cục bộ trước khi vẽ JPG/PDF.
 * Chỉ nạp các font chưa có trong document.fonts; nếu tải lỗi, giữ font hệ thống dự phòng.
 * Được gọi bởi cả trang tóm tắt và trang chi tiết; không chạy lúc mở biểu mẫu.
 */
async function ensureCustomerJpgFonts() {
  const definitions = [
    {
      family: "NumerologyExportSans",
      source:
        "/assets/vendor/fonts/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM70w-.ttf",
      descriptors: { weight: "700" },
    },
    {
      family: "NumerologyExportSerif",
      source:
        "/assets/vendor/fonts/nuFvD-vYSZviVYUb_rj3ij__anPXJzDwcbmjWBN2PKeiukDQ.ttf",
      descriptors: { weight: "700" },
    },
    {
      family: "NumerologyExportScript",
      source:
        "/assets/vendor/fonts/nuFRD-vYSZviVYUb_rj3ij__anPXDTnCjmHKM4nYO7KN_qiTbtY.ttf",
      descriptors: { style: "italic", weight: "400" },
    },
  ] satisfies Array<{
    family: string;
    source: string;
    descriptors: FontFaceDescriptors;
  }>;

  await Promise.all(definitions.map(async ({ family, source, descriptors }) => {
    if (document.fonts.check(`12px ${family}`)) return;
    try {
      const loaded = await new FontFace(
        family,
        `url("${source}") format("truetype")`,
        descriptors,
      ).load();
      document.fonts.add(loaded);
    } catch {
      // The canvas keeps its system-font fallback if a local font cannot load.
    }
  }));
}

/**
 * Vẽ nền/viền bo góc cho ô chỉ số, nhãn hoặc khung báo cáo.
 * Tọa độ và kích thước dùng đơn vị logic A4, không phải pixel đã nhân tỉ lệ.
 * Stroke mặc định trong suốt; caller tự quản lý trạng thái canvas quanh nhóm thao tác.
 */
function drawRoundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
  fill: string,
  stroke = "transparent",
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
  context.fillStyle = fill;
  context.fill();
  if (stroke !== "transparent") {
    context.strokeStyle = stroke;
    context.lineWidth = 1;
    context.stroke();
  }
}

/**
 * Vẽ một dòng chữ cho báo cáo JPG/PDF với font, màu và căn lề tùy chọn.
 * Được dùng cho tiêu đề, tên khách, chỉ số và nhãn ngày; giữ style trong save/restore.
 * Không tự xuống dòng: caller chia đoạn dài trước khi gọi.
 */
function drawCanvasText(
  context: CanvasRenderingContext2D,
  value: string | number,
  x: number,
  y: number,
  options: {
    align?: CanvasTextAlign;
    color?: string;
    font?: string;
    maxWidth?: number;
  } = {},
) {
  context.save();
  context.textAlign = options.align || "left";
  context.textBaseline = "alphabetic";
  context.fillStyle = options.color || "#f7f3ea";
  context.font = options.font || "12px NumerologyExportSans, Arial, sans-serif";
  context.fillText(String(value), x, y, options.maxWidth);
  context.restore();
}

/**
 * Vẽ tiêu đề nhóm nội dung và đường trang trí cho các trang báo cáo.
 * Giúp trang tóm tắt và chi tiết dùng cùng quy ước màu, vị trí và font tiêu đề.
 */
function drawCanvasSectionTitle(
  context: CanvasRenderingContext2D,
  number: string,
  title: string,
  subtitle: string,
  x: number,
  y: number,
) {
  context.beginPath();
  context.arc(x + 15, y + 15, 15, 0, Math.PI * 2);
  context.fillStyle = "#e84a16";
  context.fill();
  drawCanvasText(context, number, x + 15, y + 19, {
    align: "center",
    color: "#ffffff",
    font: "800 10px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, title, x + 36, y + 14, {
    color: "#f2b27e",
    font: "700 19px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, subtitle, x + 36, y + 27, {
    color: "#b9c7c6",
    font: "9px NumerologyExportSans, Arial, sans-serif",
  });
}

/**
 * Vẽ nền và viền panel cho các vùng biểu đồ/chỉ số trên trang tóm tắt.
 * Dùng chung helper bo góc; caller vẽ tiêu đề và nội dung bên trong panel.
 */
function drawCanvasPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  drawRoundRect(context, x, y, width, height, 8, "#122f33", "#34565b");
}

/**
 * Vẽ mũi tên nối các ô trong biểu đồ tháp nhân số của báo cáo.
 * Dùng tọa độ hai đầu do caller tính; save/restore tránh ảnh hưởng nét vẽ tiếp theo.
 */
function drawCanvasArrow(
  context: CanvasRenderingContext2D,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  color = "#8ea39f",
) {
  const angle = Math.atan2(toY - fromY, toX - fromX);
  context.save();
  context.strokeStyle = color;
  context.fillStyle = color;
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(fromX, fromY);
  context.lineTo(toX, toY);
  context.stroke();
  context.beginPath();
  context.moveTo(toX, toY);
  context.lineTo(
    toX - 6 * Math.cos(angle - Math.PI / 6),
    toY - 6 * Math.sin(angle - Math.PI / 6),
  );
  context.lineTo(
    toX - 6 * Math.cos(angle + Math.PI / 6),
    toY - 6 * Math.sin(angle + Math.PI / 6),
  );
  context.closePath();
  context.fill();
  context.restore();
}

/**
 * Chuẩn bị canvas A4 dùng chung cho trang tóm tắt và trang chi tiết.
 * Chờ font, tạo ảnh 1588×2246, scale hệ tọa độ và tô nền cùng một lần theo quy ước.
 * Trả canvas/context cùng kích thước logic; caller chỉ vẽ nội dung riêng của trang.
 */
async function createReportCanvas(errorMessage: string) {
  await ensureCustomerJpgFonts();
  await document.fonts.ready;
  const logicalWidth = 794;
  const logicalHeight = 1123;
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) throw new Error(errorMessage);
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = "#071f23";
  context.fillRect(0, 0, logicalWidth, logicalHeight);
  return { canvas, context, logicalWidth };
}

/**
 * Tạo Blob JPEG một trang A4 tóm tắt từ kết quả calculateNumerology.
 * Bao gồm họ tên, ngày sinh, số hồ sơ, các chỉ số, biểu đồ và chu kỳ cá nhân.
 * Canvas logic 794×1123 được nhân tỉ lệ 2 thành ảnh 1588×2246; font được nạp trước khi vẽ.
 * @param generatedAt Nhãn ngày lập đã định dạng để in lên ảnh.
 * @param reportNumber Số hồ sơ đã được API cấp; không tự tạo hoặc suy đoán số tại đây.
 * Không tải xuống hay ghi DB; caller nhận Blob để xuất JPG hoặc ghép trang PDF.
 */
export async function renderCustomerSummaryAsJpeg(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
) {
  const { canvas, context, logicalWidth } = await createReportCanvas("Trình duyệt không hỗ trợ xuất JPG.");

  const topAccent = context.createRadialGradient(735, 70, 0, 735, 70, 190);
  topAccent.addColorStop(0, "rgba(131, 75, 48, 0.52)");
  topAccent.addColorStop(1, "rgba(131, 75, 48, 0)");
  context.fillStyle = topAccent;
  context.fillRect(545, 0, 249, 275);
  const bottomAccent = context.createRadialGradient(45, 1045, 0, 45, 1045, 220);
  bottomAccent.addColorStop(0, "rgba(44, 73, 73, 0.72)");
  bottomAccent.addColorStop(1, "rgba(44, 73, 73, 0)");
  context.fillStyle = bottomAccent;
  context.fillRect(0, 820, 270, 303);

  context.fillStyle = "rgba(6, 27, 31, 0.94)";
  context.fillRect(0, 0, logicalWidth, 58);
  drawCanvasText(context, "Clow Cat Patronus", 28, 31, {
    color: "#ffffff",
    font: "700 20px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, `HỒ SƠ NHÂN SỐ HỌC SỐ ${reportNumber} · TÓM TẮT`, 28, 44, {
    color: "#b8c6c7",
    font: "700 8px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, "NGÀY LẬP", 766, 22, {
    align: "right",
    color: "#b8c6c7",
    font: "700 8px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, generatedAt, 766, 39, {
    align: "right",
    color: "#ffffff",
    font: "700 15px NumerologyExportSerif, Georgia, serif",
  });

  context.fillStyle = "rgba(255, 255, 255, 0.04)";
  context.fillRect(0, 58, logicalWidth, 96);
  drawCanvasText(context, `HỒ SƠ NHÂN SỐ HỌC SỐ ${reportNumber}`, logicalWidth / 2, 78, {
    align: "center",
    color: "#f2b27e",
    font: "800 8px NumerologyExportSans, Arial, sans-serif",
  });
  context.strokeStyle = "#d4a843";
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(188, 86);
  context.lineTo(292, 86);
  context.moveTo(502, 86);
  context.lineTo(606, 86);
  context.stroke();
  const nameFontSize = result.fullName.length > 28 ? 31 : 39;
  drawCanvasText(context, result.fullName, logicalWidth / 2, 119, {
    align: "center",
    color: "#fffaf2",
    font: `italic 400 ${nameFontSize}px NumerologyExportScript, Georgia, serif`,
    maxWidth: 700,
  });
  drawCanvasText(context, `Ngày sinh · ${result.formattedDate}`, logicalWidth / 2, 142, {
    align: "center",
    color: "#f2b27e",
    font: "700 13px NumerologyExportSans, Arial, sans-serif",
  });

  const topY = 162;
  drawCanvasPanel(context, 12, topY, 340, 242);
  drawCanvasSectionTitle(
    context,
    "01",
    "Biểu đồ ngày sinh & họ tên",
    "Xanh: ngày sinh · Cam: họ tên",
    24,
    topY + 10,
  );
  const chartX = 24;
  const chartY = topY + 50;
  const cellWidth = 105.33;
  const cellHeight = 58;
  CHART_ORDER.forEach((number, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = chartX + column * cellWidth;
    const y = chartY + row * cellHeight;
    const birthCount = result.digitCounts[String(number)] || 0;
    const nameCount = result.nameDigitCounts[String(number)] || 0;
    context.fillStyle = birthCount ? "#193b3e" : "#342820";
    context.fillRect(x, y, cellWidth, cellHeight);
    context.strokeStyle = "#516c6b";
    context.strokeRect(x, y, cellWidth, cellHeight);
    drawCanvasText(context, `Số ${number}`, x + 7, y + 12, {
      color: "#c0cdcb",
      font: "700 9.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, "NS", x + 7, y + 31, {
      color: "#b9c7c6",
      font: "700 8.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(
      context,
      birthCount ? String(number).repeat(birthCount) : "—",
      x + cellWidth / 2,
      y + 31,
      {
        align: "center",
        color: birthCount ? "#8ee8dc" : "#8d8b84",
        font: `800 ${birthCount > 5 ? 12 : 15}px NumerologyExportSans, Arial, sans-serif`,
        maxWidth: 76,
      },
    );
    drawCanvasText(context, "HT", x + 7, y + 49, {
      color: "#b9c7c6",
      font: "700 8.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(
      context,
      nameCount ? String(number).repeat(nameCount) : "—",
      x + cellWidth / 2,
      y + 49,
      {
        align: "center",
        color: nameCount ? "#f2b27e" : "#8d8b84",
        font: `800 ${nameCount > 5 ? 12 : 15}px NumerologyExportSans, Arial, sans-serif`,
        maxWidth: 76,
      },
    );
  });

  drawCanvasPanel(context, 360, topY, 422, 242);
  drawCanvasSectionTitle(
    context,
    "02",
    "9 nhóm chỉ số",
    "Chỉ hiển thị kết quả cuối",
    372,
    topY + 10,
  );
  const missingDisplay = result.missing.length
    ? result.missing.join(" · ")
    : "Không có";
  const debtDisplay = result.karmicDebts.length
    ? result.karmicDebts.map((item) => item.display).join(" · ")
    : "Không có";
  const summaryMetrics = [
    ...METRICS.map(([key, label]) => ({ label, value: result.metrics[key].display })),
    { label: "Chỉ số thiếu", value: missingDisplay },
    { label: "Nợ nghiệp", value: debtDisplay },
  ];
  summaryMetrics.forEach((metric, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 372 + column * 134;
    const y = topY + 52 + row * 58;
    const isDebt = index === 8;
    const isMissing = index === 7;
    drawRoundRect(
      context,
      x,
      y,
      128,
      52,
      6,
      isDebt ? "#442d24" : isMissing ? "#193d38" : "#183437",
    );
    context.fillStyle = isDebt ? "#e84a16" : isMissing ? "#5be3d0" : "#67938e";
    context.fillRect(x, y, 2, 52);
    drawCanvasText(context, metric.label.toUpperCase(), x + 8, y + 20, {
      color: "#b9c7c6",
      font: "800 7.8px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 72,
    });
    drawCanvasText(context, metric.value, x + 120, y + 34, {
      align: "right",
      color: "#f1b383",
      font: "700 20px NumerologyExportSerif, Georgia, serif",
      maxWidth: 70,
    });
  });

  const middleY = 412;
  drawRoundRect(context, 12, middleY, 340, 302, 8, "#0d3034", "#34565b");
  context.save();
  context.beginPath();
  context.roundRect(12, middleY, 340, 302, 8);
  context.clip();
  context.fillStyle = "#09262b";
  context.fillRect(12, middleY, 340, 55);
  context.fillStyle = "#173d41";
  context.beginPath();
  context.moveTo(12, middleY + 246);
  context.bezierCurveTo(
    82,
    middleY + 231,
    124,
    middleY + 266,
    176,
    middleY + 302,
  );
  context.lineTo(12, middleY + 302);
  context.closePath();
  context.fill();
  context.restore();
  context.beginPath();
  context.arc(36, middleY + 25, 15, 0, Math.PI * 2);
  context.fillStyle = "#ef6a2e";
  context.fill();
  drawCanvasText(context, "03", 36, middleY + 29, {
    align: "center",
    color: "#ffffff",
    font: "800 10px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, "Kim tự tháp Pitago", 58, middleY + 24, {
    color: "#f2b27e",
    font: "700 18px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, "Đỉnh cao · thử thách · mốc tuổi", 58, middleY + 39, {
    color: "#b9cbcb",
    font: "8.5px NumerologyExportSans, Arial, sans-serif",
  });
  context.beginPath();
  context.arc(243, middleY + 37, 6, 0, Math.PI * 2);
  context.strokeStyle = "#7f9798";
  context.lineWidth = 1.5;
  context.stroke();
  drawCanvasText(context, "Đỉnh", 254, middleY + 40, {
    color: "#63e3d1",
    font: "700 7.5px NumerologyExportSans, Arial, sans-serif",
  });
  context.beginPath();
  context.arc(299, middleY + 37, 6, 0, Math.PI * 2);
  context.fillStyle = "#dca72a";
  context.fill();
  drawCanvasText(context, "TT", 310, middleY + 40, {
    color: "#e2ad2d",
    font: "700 7.5px NumerologyExportSans, Arial, sans-serif",
  });
  const pyramidCenterX = 182;
  const pyramidNodes = [
    { peak: result.pyramid.peaks[3], x: pyramidCenterX, y: middleY + 75 },
    { peak: result.pyramid.peaks[2], x: pyramidCenterX, y: middleY + 133 },
    { peak: result.pyramid.peaks[0], x: 126, y: middleY + 191 },
    { peak: result.pyramid.peaks[1], x: 238, y: middleY + 191 },
  ];
  drawCanvasArrow(context, 83, middleY + 247, 108, middleY + 207, "#9b826c");
  drawCanvasArrow(context, 165, middleY + 245, 143, middleY + 208, "#9b826c");
  drawCanvasArrow(context, 199, middleY + 245, 221, middleY + 208, "#9b826c");
  drawCanvasArrow(context, 281, middleY + 247, 256, middleY + 207, "#9b826c");
  drawCanvasArrow(context, 144, middleY + 174, 164, middleY + 148, "#9b826c");
  drawCanvasArrow(context, 220, middleY + 174, 200, middleY + 148, "#9b826c");
  drawCanvasArrow(context, 182, middleY + 113, 182, middleY + 95, "#9b826c");
  pyramidNodes.forEach(({ peak, x, y }) => {
    context.beginPath();
    context.arc(x, y, 20, 0, Math.PI * 2);
    context.fillStyle = "#082429";
    context.fill();
    context.strokeStyle = "#71888a";
    context.lineWidth = 1.8;
    context.stroke();
    drawCanvasText(context, peak.display, x, y + 6, {
      align: "center",
      color: "#5be3d0",
      font: "700 19px NumerologyExportSerif, Georgia, serif",
    });
    drawCanvasText(
      context,
      `${peak.milestoneAge}T · ${peak.milestoneYear}`,
      x,
      y + 31,
      {
      align: "center",
      color: "#ffffff",
      font: "800 7.8px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 70,
      },
    );
  });
  const challengeNodes = [
    { value: result.pyramid.peaks[3].challenge, x: 150, y: middleY + 67 },
    { value: result.pyramid.peaks[2].challenge, x: 150, y: middleY + 125 },
    { value: result.pyramid.peaks[0].challenge, x: 94, y: middleY + 183 },
    { value: result.pyramid.peaks[1].challenge, x: 270, y: middleY + 183 },
  ];
  challengeNodes.forEach(({ value, x, y }) => {
    context.beginPath();
    context.arc(x, y, 11, 0, Math.PI * 2);
    context.fillStyle = "#563c31";
    context.fill();
    context.strokeStyle = "#aa8060";
    context.lineWidth = 1;
    context.stroke();
    drawCanvasText(context, value, x, y + 4, {
      align: "center",
      color: "#e3aa21",
      font: "800 12px NumerologyExportSans, Arial, sans-serif",
    });
  });
  [
    ["THÁNG", result.pyramid.base.month],
    ["NGÀY", result.pyramid.base.day],
    ["NĂM", result.pyramid.base.year],
  ].forEach(([label, value], index) => {
    const x = 74 + index * 108;
    context.beginPath();
    context.arc(x, middleY + 252, 19, 0, Math.PI * 2);
    context.fillStyle = "#082429";
    context.fill();
    context.strokeStyle = "#71888a";
    context.lineWidth = 1.8;
    context.stroke();
    drawCanvasText(context, value, x, middleY + 258, {
      align: "center",
      color: "#5be3d0",
      font: "700 18px NumerologyExportSerif, Georgia, serif",
    });
    drawCanvasText(context, label, x, middleY + 286, {
      align: "center",
      color: "#ffffff",
      font: "800 9px NumerologyExportSans, Arial, sans-serif",
    });
  });

  drawCanvasPanel(context, 360, middleY, 422, 302);
  drawCanvasSectionTitle(
    context,
    "04",
    "Năm cá nhân",
    "Hiện tại và chu kỳ kế tiếp",
    372,
    middleY + 10,
  );
  const annualCards = [
    {
      title: `Năm thế giới ${result.annualCycle.worldYear.year}`,
      value: String(result.annualCycle.worldYear.value),
      note: "",
      width: 91,
    },
    {
      title: "Năm cá nhân hiện tại",
      value: `PY (${result.annualCycle.currentPersonalYear.year}) = ${result.annualCycle.currentPersonalYear.value}`,
      note: `${result.annualCycle.currentPersonalYear.operatingFrom} – ${result.annualCycle.currentPersonalYear.operatingTo}`,
      width: 150,
    },
    {
      title: "Năm cá nhân kế tiếp",
      value: `PY (${result.annualCycle.nextPersonalYear.year}) = ${result.annualCycle.nextPersonalYear.value}`,
      note: `${result.annualCycle.nextPersonalYear.operatingFrom} – ${result.annualCycle.nextPersonalYear.operatingTo}`,
      width: 150,
    },
  ];
  let annualX = 372;
  annualCards.forEach((card, index) => {
    drawRoundRect(
      context,
      annualX,
      middleY + 50,
      card.width,
      65,
      6,
      index === 1 ? "#503b2d" : "#183437",
      index === 1 ? "#d4a843" : "#496967",
    );
    drawCanvasText(context, card.title.toUpperCase(), annualX + 7, middleY + 70, {
      color: "#b9c7c6",
      font: "700 7.2px NumerologyExportSans, Arial, sans-serif",
      maxWidth: card.width - 14,
    });
    drawCanvasText(context, card.value, annualX + 7, middleY + 92, {
      color: index === 1 ? "#f1b383" : "#fff8ef",
      font: index === 0
        ? "700 22px NumerologyExportSerif, Georgia, serif"
        : "700 15px NumerologyExportSerif, Georgia, serif",
      maxWidth: card.width - 14,
    });
    if (card.note) {
      drawCanvasText(context, card.note, annualX + 7, middleY + 106, {
        color: "#b9c7c6",
        font: "6.4px NumerologyExportSans, Arial, sans-serif",
        maxWidth: card.width - 14,
      });
    }
    annualX += card.width + 5;
  });
  result.annualCycle.cycle.forEach((item, index) => {
    const x = 372 + index * 44.4;
    drawRoundRect(
      context,
      x,
      middleY + 123,
      39,
      31,
      4,
      item.isCurrent ? "#e84a16" : "#163337",
      item.isCurrent ? "#d4a843" : "transparent",
    );
    drawCanvasText(context, item.year, x + 19.5, middleY + 136, {
      align: "center",
      color: item.isCurrent ? "#ffffff" : "#b9c7c6",
      font: "6.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, item.value, x + 19.5, middleY + 149, {
      align: "center",
      color: item.isCurrent ? "#ffffff" : "#fff8ef",
      font: "700 11px NumerologyExportSans, Arial, sans-serif",
    });
  });
  drawCanvasText(context, "4 ĐỈNH CAO & THỬ THÁCH", 372, middleY + 174, {
    color: "#f2b27e",
    font: "700 12px NumerologyExportSerif, Georgia, serif",
  });
  result.pyramid.peaks.forEach((peak, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 372 + column * 202;
    const y = middleY + 184 + row * 52;
    drawRoundRect(context, x, y, 197, 46, 5, "#163337", "#496967");
    context.fillStyle = "#d4a843";
    context.fillRect(x, y, 2, 46);
    drawCanvasText(context, `CHU KỲ ${index + 1}`, x + 8, y + 12, {
      color: "#f2b27e",
      font: "800 8px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `Đỉnh ${peak.display}`, x + 8, y + 26, {
      color: "#fff8ef",
      font: "700 10px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `Thử thách ${peak.challenge}`, x + 98, y + 26, {
      color: "#fff8ef",
      font: "700 10px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `${peak.milestoneAge} tuổi · ${peak.milestoneYear}`, x + 8, y + 39, {
      color: "#b9c7c6",
      font: "700 8px NumerologyExportSans, Arial, sans-serif",
    });
  });

  const sineY = 722;
  drawCanvasPanel(context, 12, sineY, 770, 365);
  drawCanvasSectionTitle(
    context,
    "05",
    "Biểu đồ chu kỳ hình SIN",
    `Chu kỳ ${result.annualCycle.cycle[0].year}–${result.annualCycle.cycle[8].year}`,
    24,
    sineY + 10,
  );
  const sinePoints = result.annualCycle.cycle.map((item, index) => ({
    ...item,
    x: 78 + index * 80,
    y: sineY + 105 + (CYCLE_POINT_Y[index] - 48) * 1.45,
  }));
  context.save();
  context.setLineDash([5, 7]);
  context.strokeStyle = "#587573";
  context.beginPath();
  context.moveTo(58, sineY + 194);
  context.lineTo(736, sineY + 194);
  context.stroke();
  context.restore();
  context.strokeStyle = "#d9612b";
  context.lineWidth = 4;
  context.lineCap = "round";
  context.lineJoin = "round";
  context.beginPath();
  sinePoints.forEach((point, index) => {
    if (index === 0) {
      context.moveTo(point.x, point.y);
      return;
    }
    const previous = sinePoints[index - 1];
    const beforePrevious = sinePoints[index - 2] || previous;
    const next = sinePoints[index + 1] || point;
    context.bezierCurveTo(
      previous.x + (point.x - beforePrevious.x) / 6,
      previous.y + (point.y - beforePrevious.y) / 6,
      point.x - (next.x - previous.x) / 6,
      point.y - (next.y - previous.y) / 6,
      point.x,
      point.y,
    );
  });
  context.stroke();
  sinePoints.forEach((point) => {
    if (point.isCurrent) {
      context.save();
      context.setLineDash([4, 5]);
      context.strokeStyle = "#d4a843";
      context.lineWidth = 1.5;
      context.beginPath();
      context.moveTo(point.x, sineY + 65);
      context.lineTo(point.x, sineY + 300);
      context.stroke();
      context.restore();
    }
    context.beginPath();
    context.arc(point.x, point.y, point.isCurrent ? 11 : 8, 0, Math.PI * 2);
    context.fillStyle = point.isCurrent ? "#d7a52f" : "#082429";
    context.fill();
    context.strokeStyle = point.isCurrent ? "#ffffff" : "#70d8ca";
    context.lineWidth = point.isCurrent ? 3 : 2;
    context.stroke();
    drawCanvasText(context, point.value, point.x, point.y + 3, {
      align: "center",
      color: point.isCurrent ? "#ffffff" : "#eaf9f6",
      font: "800 10.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, point.year, point.x, sineY + 324, {
      align: "center",
      color: "#b9c7c6",
      font: "700 9.5px NumerologyExportSans, Arial, sans-serif",
    });
  });
  const currentPoint = sinePoints.find((point) => point.isCurrent);
  if (currentPoint) {
    drawRoundRect(context, currentPoint.x - 36, sineY + 56, 72, 22, 11, "#e84a16");
    drawCanvasText(context, "HIỆN TẠI", currentPoint.x, sineY + 71, {
      align: "center",
      color: "#ffffff",
      font: "800 9px NumerologyExportSans, Arial, sans-serif",
    });
  }
  drawCanvasText(
    context,
    "Thời gian vận hành được xác định riêng theo khúc giao thời của từng năm cá nhân.",
    397,
    sineY + 346,
    {
      align: "center",
      color: "#b9c7c6",
      font: "9px NumerologyExportSans, Arial, sans-serif",
    },
  );

  context.fillStyle = "rgba(6, 27, 31, 0.94)";
  context.fillRect(0, 1095, logicalWidth, 28);
  drawCanvasText(context, "Clow Cat Patronus · Nhân số học Pythagoras", 20, 1113, {
    color: "#b8c6c7",
    font: "8px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, `${result.normalizedName} · ${result.formattedDate}`, 774, 1113, {
    align: "right",
    color: "#b8c6c7",
    font: "8px NumerologyExportSans, Arial, sans-serif",
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error("Không thể tạo file JPG.")),
      "image/jpeg",
      0.86,
    );
  });
}

/**
 * Tạo trang A4 thứ hai cho PDF đầy đủ: công thức, phân tích họ tên và chu kỳ.
 * Dùng cùng kết quả và số hồ sơ với trang tóm tắt; trả Blob JPEG chất lượng 0.84.
 * Giữ kích thước ảnh đồng nhất với trang đầu để createPdfFromJpegPages đóng gói đúng.
 */
async function renderCustomerDetailAsJpeg(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
) {
  const { canvas, context, logicalWidth } = await createReportCanvas("Trình duyệt không hỗ trợ tạo PDF đầy đủ.");

  const accent = context.createRadialGradient(720, 120, 0, 720, 120, 230);
  accent.addColorStop(0, "rgba(128, 72, 47, .5)");
  accent.addColorStop(1, "rgba(128, 72, 47, 0)");
  context.fillStyle = accent;
  context.fillRect(490, 0, 304, 360);
  context.fillStyle = "rgba(6, 27, 31, .96)";
  context.fillRect(0, 0, logicalWidth, 58);
  drawCanvasText(context, "Clow Cat Patronus", 28, 31, {
    color: "#fff",
    font: "700 20px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, `BẢN ĐỒ NHÂN SỐ HỌC SỐ ${reportNumber} · TRANG 2`, 28, 44, {
    color: "#b8c6c7",
    font: "700 8px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, generatedAt, 766, 36, {
    align: "right",
    color: "#fff",
    font: "700 14px NumerologyExportSerif, Georgia, serif",
  });

  drawCanvasText(context, result.fullName, logicalWidth / 2, 104, {
    align: "center",
    color: "#fffaf2",
    font: `italic 400 ${result.fullName.length > 28 ? 29 : 35}px NumerologyExportScript, Georgia, serif`,
    maxWidth: 700,
  });
  drawCanvasText(context, `Ngày sinh · ${result.formattedDate}`, logicalWidth / 2, 130, {
    align: "center",
    color: "#f2b27e",
    font: "700 13px NumerologyExportSans, Arial, sans-serif",
  });

  drawCanvasPanel(context, 18, 154, 758, 266);
  drawCanvasSectionTitle(context, "06", "Chi tiết 9 nhóm chỉ số", "Kết quả và phép tính đối chiếu", 30, 166);
  const detailedMetrics = [
    ...METRICS.map(([key, label]) => ({
      label,
      value: result.metrics[key].display,
      formula: result.metrics[key].formula,
    })),
    {
      label: "Chỉ số thiếu",
      value: result.missing.length ? result.missing.join(" · ") : "Không có",
      formula: "Các số không xuất hiện trong ngày sinh",
    },
    {
      label: "Nợ nghiệp",
      value: result.karmicDebts.length
        ? result.karmicDebts.map((item) => item.display).join(" · ")
        : "Không có",
      formula: result.karmicDebts.length
        ? result.karmicDebts.map((item) => item.sources.join(", ")).join(" · ")
        : "Không phát hiện 13/4, 14/5, 16/7 hoặc 19/1",
    },
  ];
  detailedMetrics.forEach((metric, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = 30 + column * 247;
    const y = 210 + row * 65;
    drawRoundRect(context, x, y, 235, 56, 6, index === 8 ? "#432d25" : "#18373a", "#3b5a5e");
    drawCanvasText(context, metric.label.toUpperCase(), x + 10, y + 17, {
      color: "#b9c7c6",
      font: "800 8px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, metric.value, x + 225, y + 28, {
      align: "right",
      color: "#f2b27e",
      font: "700 18px NumerologyExportSerif, Georgia, serif",
      maxWidth: 90,
    });
    drawCanvasText(context, metric.formula, x + 10, y + 46, {
      color: "#d3dddc",
      font: "8.2px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 212,
    });
  });

  drawCanvasPanel(context, 18, 434, 370, 286);
  drawCanvasSectionTitle(context, "07", "Giải mã họ tên", "Từng từ theo hệ Pythagoras", 30, 446);
  ["TỪ", "SỨ MỆNH", "LINH HỒN", "NHÂN CÁCH"].forEach((label, index) => {
    drawCanvasText(context, label, 34 + [0, 91, 187, 279][index], 500, {
      color: "#f2b27e",
      font: "800 8px NumerologyExportSans, Arial, sans-serif",
    });
  });
  result.nameBreakdown.slice(0, 9).forEach((word, index) => {
    const y = 528 + index * 20;
    context.strokeStyle = "rgba(143, 168, 166, .24)";
    context.beginPath();
    context.moveTo(30, y + 7);
    context.lineTo(376, y + 7);
    context.stroke();
    const value = (part: NamePart) => part.raw === part.reduced
      ? String(part.raw || "—")
      : `${part.raw} → ${part.reduced}`;
    drawCanvasText(context, word.word, 34, y, {
      color: "#fff",
      font: "700 9px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 78,
    });
    drawCanvasText(context, value(word.all), 125, y, { color: "#dbe6e4", font: "9px NumerologyExportSans, Arial, sans-serif" });
    drawCanvasText(context, value(word.vowels), 221, y, { color: "#dbe6e4", font: "9px NumerologyExportSans, Arial, sans-serif" });
    drawCanvasText(context, value(word.consonants), 313, y, { color: "#dbe6e4", font: "9px NumerologyExportSans, Arial, sans-serif" });
  });

  drawCanvasPanel(context, 402, 434, 374, 286);
  drawCanvasSectionTitle(context, "08", "Bốn đỉnh cao & thử thách", result.pyramid.firstMilestoneFormula, 414, 446);
  result.pyramid.peaks.forEach((peak, index) => {
    const y = 502 + index * 49;
    drawRoundRect(context, 414, y, 350, 41, 5, "#17373a", "#3b5a5e");
    drawCanvasText(context, `CHU KỲ ${index + 1}`, 424, y + 15, {
      color: "#f2b27e",
      font: "800 8px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `Đỉnh ${peak.display}`, 424, y + 32, {
      color: "#fff",
      font: "700 11px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, peak.formula, 492, y + 32, {
      color: "#b9c7c6",
      font: "8px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 100,
    });
    drawCanvasText(context, `TT ${peak.challenge}`, 606, y + 18, {
      color: "#f2b27e",
      font: "700 10px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `${peak.milestoneAge} tuổi · ${peak.milestoneYear}`, 754, y + 31, {
      align: "right",
      color: "#fff",
      font: "700 9px NumerologyExportSans, Arial, sans-serif",
    });
  });

  drawCanvasPanel(context, 18, 734, 758, 335);
  drawCanvasSectionTitle(context, "09", "Năm thế giới & năm cá nhân", "Chu kỳ hiện tại và thời gian vận hành", 30, 746);
  const annual = result.annualCycle;
  const annualCards = [
    { title: `Năm thế giới ${annual.worldYear.year}`, value: String(annual.worldYear.value), formula: annual.worldYear.formula },
    { title: `PY (${annual.currentPersonalYear.year})`, value: String(annual.currentPersonalYear.value), formula: annual.currentPersonalYear.formula },
    { title: `PY (${annual.nextPersonalYear.year})`, value: String(annual.nextPersonalYear.value), formula: annual.nextPersonalYear.formula },
  ];
  annualCards.forEach((card, index) => {
    const x = 30 + index * 247;
    drawRoundRect(context, x, 798, 235, 74, 6, index === 1 ? "#503b2d" : "#18373a", index === 1 ? "#d4a843" : "#3b5a5e");
    drawCanvasText(context, card.title.toUpperCase(), x + 10, 818, { color: "#b9c7c6", font: "800 8px NumerologyExportSans, Arial, sans-serif" });
    drawCanvasText(context, card.value, x + 225, 843, { align: "right", color: "#f2b27e", font: "700 25px NumerologyExportSerif, Georgia, serif" });
    drawCanvasText(context, card.formula, x + 10, 861, { color: "#fff", font: "8.5px NumerologyExportSans, Arial, sans-serif", maxWidth: 205 });
  });
  drawCanvasText(context, `Hiện tại: ${annual.currentPersonalYear.operatingFrom} – ${annual.currentPersonalYear.operatingTo}`, 30, 901, {
    color: "#fff",
    font: "700 11px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, `Kế tiếp: ${annual.nextPersonalYear.operatingFrom} – ${annual.nextPersonalYear.operatingTo}`, 408, 901, {
    color: "#fff",
    font: "700 11px NumerologyExportSans, Arial, sans-serif",
  });
  annual.cycle.forEach((item, index) => {
    const x = 31 + index * 81;
    drawRoundRect(context, x, 927, 72, 61, 6, item.isCurrent ? "#e84a16" : "#17373a", item.isCurrent ? "#d4a843" : "#3b5a5e");
    drawCanvasText(context, item.year, x + 36, 948, { align: "center", color: "#b9c7c6", font: "9px NumerologyExportSans, Arial, sans-serif" });
    drawCanvasText(context, item.value, x + 36, 975, { align: "center", color: "#fff", font: "700 19px NumerologyExportSerif, Georgia, serif" });
  });
  drawCanvasText(context, "PDF được tối ưu bằng ảnh JPEG A4 nén chất lượng cao để tiết kiệm dung lượng.", logicalWidth / 2, 1030, {
    align: "center",
    color: "#b9c7c6",
    font: "9px NumerologyExportSans, Arial, sans-serif",
  });
  context.fillStyle = "rgba(6, 27, 31, .96)";
  context.fillRect(0, 1095, logicalWidth, 28);
  drawCanvasText(context, "Clow Cat Patronus · Hồ sơ riêng tư", 20, 1113, { color: "#b8c6c7", font: "8px NumerologyExportSans, Arial, sans-serif" });
  drawCanvasText(context, `${result.normalizedName} · ${result.formattedDate}`, 774, 1113, { align: "right", color: "#b8c6c7", font: "8px NumerologyExportSans, Arial, sans-serif" });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob ? resolve(blob) : reject(new Error("Không thể tạo trang PDF chi tiết.")),
      "image/jpeg",
      0.84,
    );
  });
}

/**
 * Ghép các khối nhị phân theo đúng thứ tự để tạo object/stream PDF.
 * Cấp phát một buffer có tổng byteLength, rồi chép từng chunk vào vị trí liên tiếp.
 * Không chuyển dữ liệu ảnh sang chuỗi vì có thể làm sai byte và offset của PDF.
 */
function joinBytes(chunks: Uint8Array[]) {
  const length = chunks.reduce((sum, chunk) => sum + chunk.byteLength, 0);
  const output = new Uint8Array(length);
  let offset = 0;
  chunks.forEach((chunk) => {
    output.set(chunk, offset);
    offset += chunk.byteLength;
  });
  return output;
}

/**
 * Đóng gói các Blob JPEG A4 thành PDF mà không cần thư viện PDF hoặc máy chủ.
 * Mỗi trang có object Page, Content và Image; ảnh 1588×2246 đặt lên khổ 595.28×841.89 point.
 * Bảng xref dùng offset tính theo byte của dữ liệu nhị phân, không theo số ký tự chuỗi.
 * Đầu vào phải là JPEG đúng kích thước của hai hàm render; không phải bộ chuyển ảnh tổng quát.
 * Trả Blob application/pdf; ảnh được nhúng bằng DCTDecode nên không nén lại lần nữa.
 */
async function createPdfFromJpegPages(pages: Blob[]) {
  const encoder = new TextEncoder();
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objectCount = 2 + pages.length * 3;
  const objects = new Map<number, Uint8Array>();
  const pageObjectIds = pages.map((_, index) => 3 + index * 3);
  objects.set(1, encoder.encode("<< /Type /Catalog /Pages 2 0 R >>"));
  objects.set(2, encoder.encode(`<< /Type /Pages /Count ${pages.length} /Kids [${pageObjectIds.map((id) => `${id} 0 R`).join(" ")}] >>`));

  for (let index = 0; index < pages.length; index += 1) {
    const pageId = 3 + index * 3;
    const contentId = pageId + 1;
    const imageId = pageId + 2;
    const imageBytes = new Uint8Array(await pages[index].arrayBuffer());
    const content = encoder.encode(`q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im1 Do\nQ`);
    objects.set(pageId, encoder.encode(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Resources << /XObject << /Im1 ${imageId} 0 R >> >> /Contents ${contentId} 0 R >>`));
    objects.set(contentId, joinBytes([
      encoder.encode(`<< /Length ${content.byteLength} >>\nstream\n`),
      content,
      encoder.encode("\nendstream"),
    ]));
    objects.set(imageId, joinBytes([
      encoder.encode(`<< /Type /XObject /Subtype /Image /Width 1588 /Height 2246 /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${imageBytes.byteLength} >>\nstream\n`),
      imageBytes,
      encoder.encode("\nendstream"),
    ]));
  }

  const chunks: Uint8Array[] = [new Uint8Array([37, 80, 68, 70, 45, 49, 46, 52, 10, 37, 211, 235, 233, 225, 10])];
  const offsets = new Array<number>(objectCount + 1).fill(0);
  let length = chunks[0].byteLength;
  for (let id = 1; id <= objectCount; id += 1) {
    const body = objects.get(id);
    if (!body) throw new Error("Không thể đóng gói PDF.");
    offsets[id] = length;
    const object = joinBytes([encoder.encode(`${id} 0 obj\n`), body, encoder.encode("\nendobj\n")]);
    chunks.push(object);
    length += object.byteLength;
  }
  const xrefOffset = length;
  const xref = ["xref", `0 ${objectCount + 1}`, "0000000000 65535 f "];
  for (let id = 1; id <= objectCount; id += 1) {
    xref.push(`${String(offsets[id]).padStart(10, "0")} 00000 n `);
  }
  chunks.push(encoder.encode(`${xref.join("\n")}\ntrailer\n<< /Size ${objectCount + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`));
  return new Blob([joinBytes(chunks)], { type: "application/pdf" });
}

/**
 * Chuẩn bị cặp file để calculator gửi vào API lưu hồ sơ riêng của người dùng.
 * Vẽ trang tóm tắt và trang chi tiết tuần tự để hạn chế canvas lớn cùng tồn tại.
 * Trả { image, pdf }: image là JPG tóm tắt; pdf chứa cả hai trang.
 * Dùng lại Blob của trang tóm tắt khi ghép PDF, tránh vẽ hoặc mã hóa ảnh đó hai lần.
 */
export async function createOptimizedArchiveFiles(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
) {
  const summary = await renderCustomerSummaryAsJpeg(result, generatedAt, reportNumber);
  const detail = await renderCustomerDetailAsJpeg(result, generatedAt, reportNumber);
  const pdf = await createPdfFromJpegPages([summary, detail]);
  return { image: summary, pdf };
}
