"use client";

export type CustomerReportParagraph = {
  kind: "paragraph" | "subheading" | "list";
  text: string;
};

export type CustomerReportTable = {
  kind: "table";
  rows: string[][];
};

export type CustomerReportBlock = CustomerReportParagraph | CustomerReportTable;

export type CustomerReportSection = {
  number: number;
  title: string;
  blocks: CustomerReportBlock[];
};

export type ParsedCustomerReport = {
  title: string;
  customerName: string;
  birthDate: string;
  sections: CustomerReportSection[];
  metrics: Array<{ label: string; value: string; description: string }>;
};

type ZipEntry = {
  compressionMethod: number;
  compressedSize: number;
  localHeaderOffset: number;
};

const decoder = new TextDecoder("utf-8");

function findZipEntry(bytes: Uint8Array, wantedName: string): ZipEntry | null {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const minimumOffset = Math.max(0, bytes.length - 65_557);
  let endOffset = -1;

  for (let offset = bytes.length - 22; offset >= minimumOffset; offset -= 1) {
    if (view.getUint32(offset, true) === 0x06054b50) {
      endOffset = offset;
      break;
    }
  }

  if (endOffset < 0) throw new Error("File DOCX không có cấu trúc ZIP hợp lệ.");

  const totalEntries = view.getUint16(endOffset + 10, true);
  let offset = view.getUint32(endOffset + 16, true);

  for (let index = 0; index < totalEntries; index += 1) {
    if (view.getUint32(offset, true) !== 0x02014b50) {
      throw new Error("Không thể đọc danh mục nội dung trong file DOCX.");
    }

    const flags = view.getUint16(offset + 8, true);
    const compressionMethod = view.getUint16(offset + 10, true);
    const compressedSize = view.getUint32(offset + 20, true);
    const fileNameLength = view.getUint16(offset + 28, true);
    const extraLength = view.getUint16(offset + 30, true);
    const commentLength = view.getUint16(offset + 32, true);
    const localHeaderOffset = view.getUint32(offset + 42, true);
    const nameBytes = bytes.subarray(offset + 46, offset + 46 + fileNameLength);
    const fileName = decoder.decode(nameBytes);

    if (fileName === wantedName) {
      if (flags & 0x1) throw new Error("DOCX đang được mã hóa và không thể đọc.");
      return { compressionMethod, compressedSize, localHeaderOffset };
    }

    offset += 46 + fileNameLength + extraLength + commentLength;
  }

  return null;
}

async function inflateZipEntry(bytes: Uint8Array, entry: ZipEntry) {
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  const offset = entry.localHeaderOffset;
  if (view.getUint32(offset, true) !== 0x04034b50) {
    throw new Error("Không thể mở nội dung XML trong file DOCX.");
  }

  const fileNameLength = view.getUint16(offset + 26, true);
  const extraLength = view.getUint16(offset + 28, true);
  const dataOffset = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.subarray(dataOffset, dataOffset + entry.compressedSize);

  if (entry.compressionMethod === 0) return compressed;
  if (entry.compressionMethod !== 8) {
    throw new Error("DOCX dùng phương thức nén chưa được hỗ trợ.");
  }

  if (typeof DecompressionStream === "undefined") {
    throw new Error("Trình duyệt này chưa hỗ trợ đọc DOCX. Vui lòng dùng Chrome hoặc Edge mới nhất.");
  }

  const compressedCopy = new Uint8Array(compressed.byteLength);
  compressedCopy.set(compressed);
  const stream = new Blob([compressedCopy.buffer])
    .stream()
    .pipeThrough(new DecompressionStream("deflate-raw"));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

function directChild(element: Element | null, localName: string) {
  if (!element) return null;
  return Array.from(element.children).find((child) => child.localName === localName) || null;
}

function descendants(element: Element, localName: string) {
  return Array.from(element.getElementsByTagNameNS("*", localName));
}

function wordAttribute(element: Element | null, name: string) {
  if (!element) return "";
  return element.getAttribute(`w:${name}`)
    || element.getAttribute(name)
    || Array.from(element.attributes).find((attribute) => attribute.localName === name)?.value
    || "";
}

function nodeText(node: Node): string {
  if (node.nodeType !== Node.ELEMENT_NODE) return "";
  const element = node as Element;
  if (element.localName === "t") return element.textContent || "";
  if (element.localName === "tab") return "\t";
  if (element.localName === "br" || element.localName === "cr") return "\n";
  return Array.from(element.childNodes).map(nodeText).join("");
}

function normalizeText(value: string) {
  return value
    .replace(/\u00a0/g, " ")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .trim();
}

function runIsBold(run: Element) {
  const properties = directChild(run, "rPr");
  const bold = directChild(properties, "b") || directChild(properties, "bCs");
  if (!bold) return false;
  const value = wordAttribute(bold, "val").toLowerCase();
  return value !== "0" && value !== "false" && value !== "off";
}

function parseParagraph(element: Element) {
  const text = normalizeText(nodeText(element));
  const properties = directChild(element, "pPr");
  const style = wordAttribute(directChild(properties, "pStyle"), "val").toLowerCase();
  const hasList = Boolean(directChild(properties, "numPr"));
  const runs = descendants(element, "r").filter((run) => normalizeText(nodeText(run)));
  const allBold = runs.length > 0 && runs.every(runIsBold);

  return {
    text,
    hasList,
    isHeading: style.startsWith("heading") || (allBold && text.length <= 130),
  };
}

function parseTable(element: Element): CustomerReportTable {
  const rows = descendants(element, "tr").map((row) => (
    descendants(row, "tc").map((cell) => {
      const paragraphs = descendants(cell, "p")
        .map((paragraph) => normalizeText(nodeText(paragraph)))
        .filter(Boolean);
      return paragraphs.join("\n");
    })
  ));
  return { kind: "table", rows: rows.filter((row) => row.some(Boolean)) };
}

function formatVietnameseName(value: string) {
  return value
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("vi-VN")
    .split(" ")
    .map((word) => word
      .split("-")
      .map((part) => part
        ? `${part[0].toLocaleUpperCase("vi-VN")}${part.slice(1)}`
        : "")
      .join("-"))
    .join(" ");
}

function extractMetrics(sections: CustomerReportSection[]) {
  const table = sections
    .flatMap((section) => section.blocks)
    .find((block): block is CustomerReportTable => block.kind === "table");
  if (!table || table.rows.length < 2) return [];

  const header = table.rows[0].map((cell) => cell.toLocaleLowerCase("vi-VN"));
  const labelIndex = Math.max(0, header.findIndex((cell) => /chỉ số|chi so/.test(cell)));
  const valueIndex = header.findIndex((cell) => /giá trị|gia tri|kết quả|ket qua/.test(cell));
  const descriptionIndex = header.findIndex((cell) => /bản chất|ban chat|mô tả|mo ta|ý nghĩa|y nghia/.test(cell));

  return table.rows.slice(1).map((row) => ({
    label: row[labelIndex] || "Chỉ số",
    value: row[valueIndex >= 0 ? valueIndex : 1] || "—",
    description: row[descriptionIndex >= 0 ? descriptionIndex : 2] || "",
  })).filter((metric) => metric.label.trim());
}

export async function parseCustomerReportDocx(file: File): Promise<ParsedCustomerReport> {
  if (!/\.docx$/i.test(file.name)) {
    throw new Error("Vui lòng chọn đúng file nội dung định dạng .docx.");
  }

  const bytes = new Uint8Array(await file.arrayBuffer());
  const documentEntry = findZipEntry(bytes, "word/document.xml");
  if (!documentEntry) throw new Error("Không tìm thấy nội dung chính trong file DOCX.");
  const xmlBytes = await inflateZipEntry(bytes, documentEntry);
  const xml = decoder.decode(xmlBytes);
  const document = new DOMParser().parseFromString(xml, "application/xml");
  if (document.querySelector("parsererror")) {
    throw new Error("Nội dung XML trong DOCX không hợp lệ.");
  }

  const body = descendants(document.documentElement, "body")[0];
  if (!body) throw new Error("DOCX không có nội dung để tạo report.");

  let reportTitle = "Báo cáo nhân số học chi tiết";
  let customerName = file.name.replace(/\.docx$/i, "");
  let birthDate = "";
  const sections: CustomerReportSection[] = [];
  const pendingBlocks: CustomerReportBlock[] = [];
  let currentSection: CustomerReportSection | null = null;

  Array.from(body.children).forEach((element) => {
    if (element.localName === "tbl") {
      const table = parseTable(element);
      if (!table.rows.length) return;
      if (currentSection) currentSection.blocks.push(table);
      else pendingBlocks.push(table);
      return;
    }
    if (element.localName !== "p") return;

    const paragraph = parseParagraph(element);
    if (!paragraph.text) return;

    if (!sections.length && !currentSection && /^báo cáo/i.test(paragraph.text)) {
      reportTitle = paragraph.text;
      const namePart = paragraph.text.split(":").slice(1).join(":").trim();
      if (namePart) customerName = namePart;
      return;
    }

    const dateMatch = paragraph.text.match(/(?:ngày(?: tháng năm)? sinh|ngày sinh)\s*[:·-]?\s*(\d{1,2}[/-]\d{1,2}[/-]\d{4})/i);
    if (!birthDate && dateMatch) {
      birthDate = dateMatch[1].replace(/-/g, "/");
      return;
    }

    const sectionMatch = paragraph.text.match(/^\s*(\d+)[.)]\s*(.+)$/);
    if (sectionMatch) {
      currentSection = {
        number: Number(sectionMatch[1]),
        title: sectionMatch[2].trim(),
        blocks: sections.length === 0 ? pendingBlocks.splice(0) : [],
      };
      sections.push(currentSection);
      return;
    }

    const block: CustomerReportParagraph = {
      kind: paragraph.hasList
        ? "list"
        : paragraph.isHeading
          ? "subheading"
          : "paragraph",
      text: paragraph.text,
    };
    if (currentSection) currentSection.blocks.push(block);
    else pendingBlocks.push(block);
  });

  if (!sections.length && pendingBlocks.length) {
    sections.push({ number: 1, title: "Phân tích chuyên sâu", blocks: pendingBlocks });
  }
  if (!sections.length) throw new Error("DOCX chưa có nội dung phân tích phù hợp.");

  return {
    title: reportTitle,
    customerName: formatVietnameseName(customerName),
    birthDate,
    sections,
    metrics: extractMetrics(sections),
  };
}
