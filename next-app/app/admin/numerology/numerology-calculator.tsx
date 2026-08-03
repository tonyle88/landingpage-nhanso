"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useState } from "react";
import {
  calculateNumerology,
  type NamePart,
  type NumerologyMetricKey,
  type NumerologyResult,
} from "@/lib/numerology";
import type { NumerologyRecordListItem } from "@/lib/admin/numerology-records";
import { ClowGlint } from "@/components/ui/clow-glint";
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
// Shared by the live chart, full PDF, customer PDF and A4 JPG.
// 1/9 are level, 6 sits slightly lower, and 7 remains below a raised 4.
const CYCLE_POINT_Y = [48, 79, 143, 160, 107, 58, 178, 130, 48];

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
  context.fillStyle = options.color || "#f7f3ea";
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

function drawCanvasPanel(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  drawRoundRect(context, x, y, width, height, 8, "#122f33", "#34565b");
}

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

async function renderCustomerSummaryAsJpeg(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
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
  context.fillStyle = "#071f23";
  context.fillRect(0, 0, logicalWidth, logicalHeight);

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

async function renderCustomerDetailAsJpeg(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
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
  if (!context) throw new Error("Trình duyệt không hỗ trợ tạo PDF đầy đủ.");
  context.scale(pixelRatio, pixelRatio);
  context.fillStyle = "#071f23";
  context.fillRect(0, 0, logicalWidth, logicalHeight);

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

async function createOptimizedArchiveFiles(
  result: NumerologyResult,
  generatedAt: string,
  reportNumber: number,
) {
  const summary = await renderCustomerSummaryAsJpeg(result, generatedAt, reportNumber);
  const detail = await renderCustomerDetailAsJpeg(result, generatedAt, reportNumber);
  const pdf = await createPdfFromJpegPages([summary, detail]);
  return { image: summary, pdf };
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

const PYRAMID_EDGES = [
  "month-peak-1",
  "day-peak-1",
  "day-peak-2",
  "year-peak-2",
  "peak-1-peak-3",
  "peak-2-peak-3",
  "peak-3-peak-4",
] as const;

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

function formatArchiveBytes(bytes: number) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatArchiveDate(value: string) {
  const [year, month, day] = value.split("-");
  return year && month && day ? `${day}/${month}/${year}` : value;
}

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

  async function saveArchive(
    nextResult: NumerologyResult,
    generatedAtLabel: string,
    nextReportNumber: number,
  ) {
    if (!canSave || !historyAvailable) return;
    setIsSavingArchive(true);
    setHistoryMessage("Đang tối ưu và lưu PDF đầy đủ cùng ảnh A4…");
    try {
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

  function reset() {
    setFullName("");
    setBirthDate("");
    setResult(null);
    setManualReportNumber("");
    setReportNumber(null);
    setGeneratedAt("");
    setMessage("");
  }

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
    if (!result || !reportNumber || isExportingJpg) return;
    setIsExportingJpg(true);
    setMessage("");

    try {
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
                    Hồ sơ số {record.reportNumber} · Ngày sinh {formatArchiveDate(record.birthDate)}
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
