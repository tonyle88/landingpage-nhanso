export const NUMEROLOGY_HISTORY_LIMIT = 50;
export const NUMEROLOGY_HISTORY_PAGE_SIZE = 20;
export const NUMEROLOGY_EXPORT_BUCKET = "numerology-exports";

export type NumerologyRecordListItem = {
  id: string;
  reportNumber: number;
  customerName: string;
  birthDate: string;
  pdfByteSize: number;
  imageByteSize: number;
  updatedAt: string;
};

export type NumerologyRecordRow = {
  id: string;
  report_number: number;
  customer_name: string;
  birth_date: string;
  pdf_byte_size: number;
  image_byte_size: number;
  updated_at: string;
};

export function toNumerologyRecordListItem(
  row: NumerologyRecordRow,
): NumerologyRecordListItem {
  return {
    id: row.id,
    reportNumber: row.report_number,
    customerName: row.customer_name,
    birthDate: row.birth_date,
    pdfByteSize: row.pdf_byte_size,
    imageByteSize: row.image_byte_size,
    updatedAt: row.updated_at,
  };
}

export function parseNumerologyHistoryPage(
  value: string | null,
  historyLimit = NUMEROLOGY_HISTORY_LIMIT,
) {
  const parsed = Number.parseInt(value || "1", 10);
  const maxPage = Math.ceil(
    historyLimit / NUMEROLOGY_HISTORY_PAGE_SIZE,
  );
  if (!Number.isFinite(parsed)) return 1;
  return Math.min(Math.max(parsed, 1), maxPage);
}
