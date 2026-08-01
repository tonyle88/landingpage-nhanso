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
  context.fillStyle = options.color || "#183034";
  context.font = options.font || "12px NumerologyExportSans, Arial, sans-serif";
  context.fillText(String(value), x, y, options.maxWidth);
  context.restore();
}

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
  context.fillStyle = "#173f46";
  context.fill();
  drawCanvasText(context, number, x + 15, y + 19, {
    align: "center",
    color: "#ffffff",
    font: "800 9px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, title, x + 36, y + 14, {
    font: "700 17px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, subtitle, x + 36, y + 27, {
    color: "#68777b",
    font: "8px NumerologyExportSans, Arial, sans-serif",
  });
}

function drawCanvasPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  drawRoundRect(context, x, y, width, height, 8, "#ffffff", "#d7dfdc");
}

async function renderCustomerSummaryAsJpeg(
  result: NumerologyResult,
  generatedAt: string,
) {
  await ensureCustomerJpgFonts();
  await document.fonts.ready;
  const logicalWidth = 794;
  const logicalHeight = 1123;
  const pixelRatio = 2;
  const canvas = document.createElement("canvas");
  canvas.width = logicalWidth * pixelRatio;
  canvas.height = logicalHeight * pixelRatio;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Trình duyệt không hỗ trợ xuất JPG.");
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = "#fffdf8";
  context.fillRect(0, 0, logicalWidth, logicalHeight);

  context.fillStyle = "#102f34";
  context.fillRect(0, 0, logicalWidth, 58);
  drawCanvasText(context, "Clow Cat Patronus", 28, 31, {
    color: "#ffffff",
    font: "700 20px NumerologyExportSerif, Georgia, serif",
  });
  drawCanvasText(context, "HỒ SƠ NHÂN SỐ HỌC TÓM TẮT", 28, 44, {
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

  context.fillStyle = "#fffaf0";
  context.fillRect(0, 58, logicalWidth, 96);
  drawCanvasText(context, "HỒ SƠ KHÁCH HÀNG", logicalWidth / 2, 78, {
    align: "center",
    color: "#b4522f",
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
  const nameFontSize = result.fullName.length > 28 ? 29 : 35;
  drawCanvasText(context, result.fullName, logicalWidth / 2, 119, {
    align: "center",
    color: "#153b42",
    font: `italic 400 ${nameFontSize}px NumerologyExportScript, Georgia, serif`,
    maxWidth: 700,
  });
  drawCanvasText(context, `Ngày sinh · ${result.formattedDate}`, logicalWidth / 2, 142, {
    align: "center",
    color: "#b4522f",
    font: "700 11px NumerologyExportSans, Arial, sans-serif",
  });

  const topY = 162;
  drawCanvasPanel(context, 12, topY, 310, 242);
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
  const cellWidth = 95;
  const cellHeight = 58;
  CHART_ORDER.forEach((number, index) => {
    const column = index % 3;
    const row = Math.floor(index / 3);
    const x = chartX + column * cellWidth;
    const y = chartY + row * cellHeight;
    const birthCount = result.digitCounts[String(number)] || 0;
    const nameCount = result.nameDigitCounts[String(number)] || 0;
    context.fillStyle = birthCount ? "#eef5f3" : "#fff5ef";
    context.fillRect(x, y, cellWidth, cellHeight);
    context.strokeStyle = "#91aaa7";
    context.strokeRect(x, y, cellWidth, cellHeight);
    drawCanvasText(context, `Số ${number}`, x + 7, y + 12, {
      color: "#657378",
      font: "700 8.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, "NS", x + 7, y + 31, {
      color: "#768286",
      font: "700 7.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(
      context,
      birthCount ? String(number).repeat(birthCount) : "—",
      x + cellWidth - 8,
      y + 31,
      {
        align: "right",
        color: birthCount ? "#173f46" : "#b9aaa3",
        font: `800 ${birthCount > 5 ? 10 : 13}px NumerologyExportSans, Arial, sans-serif`,
        maxWidth: 62,
      },
    );
    drawCanvasText(context, "HT", x + 7, y + 49, {
      color: "#768286",
      font: "700 7.5px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(
      context,
      nameCount ? String(number).repeat(nameCount) : "—",
      x + cellWidth - 8,
      y + 49,
      {
        align: "right",
        color: nameCount ? "#d94e1f" : "#b9aaa3",
        font: `800 ${nameCount > 5 ? 10 : 13}px NumerologyExportSans, Arial, sans-serif`,
        maxWidth: 62,
      },
    );
  });

  drawCanvasPanel(context, 330, topY, 452, 242);
  drawCanvasSectionTitle(
    context,
    "02",
    "9 nhóm chỉ số",
    "Chỉ hiển thị kết quả cuối",
    342,
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
    const x = 342 + column * 144;
    const y = topY + 52 + row * 58;
    const isDebt = index === 8;
    const isMissing = index === 7;
    drawRoundRect(
      context,
      x,
      y,
      138,
      52,
      6,
      isDebt ? "#fff1e8" : isMissing ? "#eef8f4" : "#f2f7f6",
    );
    context.fillStyle = isDebt ? "#d94e1f" : isMissing ? "#2e8674" : "#2a5f6b";
    context.fillRect(x, y, 2, 52);
    drawCanvasText(context, metric.label.toUpperCase(), x + 8, y + 20, {
      color: "#68777b",
      font: "800 7px NumerologyExportSans, Arial, sans-serif",
      maxWidth: 78,
    });
    drawCanvasText(context, metric.value, x + 130, y + 33, {
      align: "right",
      color: "#b34a24",
      font: "700 18px NumerologyExportSerif, Georgia, serif",
      maxWidth: 74,
    });
  });

  const middleY = 412;
  drawCanvasPanel(context, 12, middleY, 340, 302);
  drawCanvasSectionTitle(
    context,
    "03",
    "Kim tự tháp Pitago",
    "Đỉnh · thử thách · mốc tuổi",
    24,
    middleY + 10,
  );
  const pyramidCenterX = 182;
  const pyramidNodes = [
    { peak: result.pyramid.peaks[3], x: pyramidCenterX, y: middleY + 74, label: "ĐỈNH 4" },
    { peak: result.pyramid.peaks[2], x: pyramidCenterX, y: middleY + 147, label: "ĐỈNH 3" },
    { peak: result.pyramid.peaks[0], x: 92, y: middleY + 222, label: "ĐỈNH 1" },
    { peak: result.pyramid.peaks[1], x: 272, y: middleY + 222, label: "ĐỈNH 2" },
  ];
  context.strokeStyle = "#d3a337";
  context.lineWidth = 1.5;
  context.beginPath();
  context.moveTo(92, middleY + 196);
  context.lineTo(pyramidCenterX, middleY + 172);
  context.lineTo(272, middleY + 196);
  context.moveTo(pyramidCenterX, middleY + 121);
  context.lineTo(pyramidCenterX, middleY + 100);
  context.stroke();
  pyramidNodes.forEach(({ peak, x, y, label }, index) => {
    context.beginPath();
    context.arc(x, y, 25, 0, Math.PI * 2);
    context.fillStyle = index === 0 ? "#fff0e7" : "#ffffff";
    context.fill();
    context.strokeStyle = index === 0 ? "#d2693f" : "#8aa9a4";
    context.stroke();
    drawCanvasText(context, label, x, y - 9, {
      align: "center",
      color: "#657378",
      font: "700 7px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, peak.display, x, y + 9, {
      align: "center",
      color: "#b34a24",
      font: "700 20px NumerologyExportSerif, Georgia, serif",
    });
    drawCanvasText(context, `TT ${peak.challenge}`, x, y + 19, {
      align: "center",
      color: "#657378",
      font: "700 7px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `${peak.milestoneAge} tuổi · ${peak.milestoneYear}`, x, y + 40, {
      align: "center",
      color: "#3e5f64",
      font: "700 8px NumerologyExportSans, Arial, sans-serif",
    });
  });
  [
    ["THÁNG", result.pyramid.base.month],
    ["NGÀY", result.pyramid.base.day],
    ["NĂM", result.pyramid.base.year],
  ].forEach(([label, value], index) => {
    const x = 42 + index * 101;
    drawRoundRect(context, x, middleY + 271, 91, 23, 5, "#eaf4f1", "#b8cbc7");
    drawCanvasText(context, label, x + 10, middleY + 286, {
      color: "#657378",
      font: "700 7px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, value, x + 74, middleY + 287, {
      align: "right",
      color: "#b34a24",
      font: "700 14px NumerologyExportSerif, Georgia, serif",
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
      index === 1 ? "#fff7df" : "#f3f8f6",
      index === 1 ? "#d4a843" : "#d7dfdc",
    );
    drawCanvasText(context, card.title.toUpperCase(), annualX + 7, middleY + 70, {
      color: "#657378",
      font: "700 6.4px NumerologyExportSans, Arial, sans-serif",
      maxWidth: card.width - 14,
    });
    drawCanvasText(context, card.value, annualX + 7, middleY + 92, {
      color: index === 1 ? "#b34a24" : "#173f46",
      font: index === 0
        ? "700 20px NumerologyExportSerif, Georgia, serif"
        : "700 14px NumerologyExportSerif, Georgia, serif",
      maxWidth: card.width - 14,
    });
    if (card.note) {
      drawCanvasText(context, card.note, annualX + 7, middleY + 106, {
        color: "#52686c",
        font: "5.8px NumerologyExportSans, Arial, sans-serif",
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
      item.isCurrent ? "#173f46" : "#edf4f2",
      item.isCurrent ? "#d4a843" : "transparent",
    );
    drawCanvasText(context, item.year, x + 19.5, middleY + 136, {
      align: "center",
      color: item.isCurrent ? "#ffffff" : "#52686c",
      font: "5.8px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, item.value, x + 19.5, middleY + 149, {
      align: "center",
      color: item.isCurrent ? "#ffffff" : "#52686c",
      font: "700 10px NumerologyExportSans, Arial, sans-serif",
    });
  });
  drawCanvasText(context, "4 ĐỈNH CAO & THỬ THÁCH", 372, middleY + 174, {
    color: "#173f46",
    font: "700 10px NumerologyExportSerif, Georgia, serif",
  });
  result.pyramid.peaks.forEach((peak, index) => {
    const column = index % 2;
    const row = Math.floor(index / 2);
    const x = 372 + column * 202;
    const y = middleY + 184 + row * 52;
    drawRoundRect(context, x, y, 197, 46, 5, "#f6f8f5", "#d7dfdc");
    context.fillStyle = "#d4a843";
    context.fillRect(x, y, 2, 46);
    drawCanvasText(context, `CHU KỲ ${index + 1}`, x + 8, y + 12, {
      color: "#b34a24",
      font: "800 7px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `Đỉnh ${peak.display}`, x + 8, y + 26, {
      color: "#173f46",
      font: "700 9px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `Thử thách ${peak.challenge}`, x + 98, y + 26, {
      color: "#173f46",
      font: "700 9px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, `${peak.milestoneAge} tuổi · ${peak.milestoneYear}`, x + 8, y + 39, {
      color: "#52686c",
      font: "700 7px NumerologyExportSans, Arial, sans-serif",
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
  context.strokeStyle = "#c4d2cf";
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
    context.fillStyle = point.isCurrent ? "#d7a52f" : "#ffffff";
    context.fill();
    context.strokeStyle = point.isCurrent ? "#ffffff" : "#28585f";
    context.lineWidth = point.isCurrent ? 3 : 2;
    context.stroke();
    drawCanvasText(context, point.value, point.x, point.y + 3, {
      align: "center",
      color: point.isCurrent ? "#ffffff" : "#173f46",
      font: "800 9px NumerologyExportSans, Arial, sans-serif",
    });
    drawCanvasText(context, point.year, point.x, sineY + 324, {
      align: "center",
      color: "#52686c",
      font: "700 8px NumerologyExportSans, Arial, sans-serif",
    });
  });
  const currentPoint = sinePoints.find((point) => point.isCurrent);
  if (currentPoint) {
    drawRoundRect(context, currentPoint.x - 36, sineY + 56, 72, 22, 11, "#173f46");
    drawCanvasText(context, "HIỆN TẠI", currentPoint.x, sineY + 71, {
      align: "center",
      color: "#ffffff",
      font: "800 8px NumerologyExportSans, Arial, sans-serif",
    });
  }
  drawCanvasText(
    context,
    "Thời gian vận hành được xác định riêng theo khúc giao thời của từng năm cá nhân.",
    397,
    sineY + 346,
    {
      align: "center",
      color: "#68777b",
      font: "8px NumerologyExportSans, Arial, sans-serif",
    },
  );

  context.fillStyle = "#102f34";
  context.fillRect(0, 1095, logicalWidth, 28);
  drawCanvasText(context, "Clow Cat Patronus · Nhân số học Pythagoras", 20, 1113, {
    color: "#b8c6c7",
    font: "7px NumerologyExportSans, Arial, sans-serif",
  });
  drawCanvasText(context, `${result.normalizedName} · ${result.formattedDate}`, 774, 1113, {
    align: "right",
    color: "#b8c6c7",
    font: "7px NumerologyExportSans, Arial, sans-serif",
  });

  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => blob
        ? resolve(blob)
        : reject(new Error("Không thể tạo file JPG.")),
      "image/jpeg",
      0.94,
    );
  });
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
      setFullName(nextResult.fullName);
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

    try {
      const jpeg = await renderCustomerSummaryAsJpeg(result, generatedAt);
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
