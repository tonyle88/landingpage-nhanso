import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../next-app/", import.meta.url);

test("adds the customer report tool to the authenticated admin", async () => {
  const [dashboard, icon, page] = await Promise.all([
    readFile(new URL("app/admin/page.tsx", root), "utf8"),
    readFile(new URL("app/admin/admin-nav-icon.tsx", root), "utf8"),
    readFile(new URL("app/admin/reports/page.tsx", root), "utf8"),
  ]);

  assert.match(dashboard, /href: "\/admin\/reports"/);
  assert.match(dashboard, /Xuất PDF report khách hàng/);
  assert.match(icon, /\| "reports"/);
  assert.match(page, /getAdminPrincipal/);
  assert.match(page, /redirect\("\/admin\/login\?reason=unauthorized"\)/);
  assert.match(page, /CustomerReportGenerator/);
});

test("reads DOCX and map files locally before printing A4 pages", async () => {
  const [component, parser, css] = await Promise.all([
    readFile(new URL("app/admin/reports/customer-report-generator.tsx", root), "utf8"),
    readFile(new URL("lib/client-docx-report.ts", root), "utf8"),
    readFile(new URL("app/admin/reports/customer-report.module.css", root), "utf8"),
  ]);

  assert.match(component, /accept="\.docx/);
  assert.match(component, /accept="image\/jpeg,image\/png"/);
  assert.match(component, /parseCustomerReportDocx/);
  assert.match(component, /readAsDataURL/);
  assert.match(component, /document\.body\.dataset\.customerReportPrint/);
  assert.match(component, /window\.print\(\)/);
  assert.match(component, /Xuất PDF report/);
  assert.match(component, /data-report-page/);
  assert.match(component, /<span>Hồ sơ<\/span>/);
  assert.match(component, /<strong>Nhân số học<\/strong>/);
  assert.match(component, /<em>Toàn diện<\/em>/);
  assert.match(component, /reportCoverBrand/);
  assert.match(component, /Bản phân tích chuyên sâu giúp nhận diện tính cách/);
  assert.match(component, /<strong>9<\/strong><span>Chỉ số cốt lõi<\/span>/);
  assert.match(component, /<strong>\{parsed\.sections\.length\}<\/strong><span>Chương phân tích<\/span>/);
  assert.match(component, /<strong>\{totalPages\}<\/strong><span>Trang hồ sơ<\/span>/);
  assert.match(component, /Ngày lập report/);
  assert.match(component, /generatedAt/);
  assert.match(component, /Được tạo ra với tình yêu và năng lượng tích cực/);
  assert.doesNotMatch(component, /fetch\(|XMLHttpRequest|FormData/);

  assert.match(parser, /word\/document\.xml/);
  assert.match(parser, /DecompressionStream\("deflate-raw"\)/);
  assert.match(parser, /DOMParser/);
  assert.match(parser, /extractMetrics/);
  assert.doesNotMatch(parser, /fetch\(|XMLHttpRequest|FormData/);

  assert.match(css, /@page \{ size: A4 portrait; margin: 0; \}/);
  assert.match(css, /width: 210mm/);
  assert.match(css, /height: 297mm/);
  assert.match(css, /break-after: page/);
  assert.match(css, /--report-teal: #42dfd1/);
  assert.match(css, /\.reportCoverBrand/);
  assert.match(css, /\.reportCoverTitle/);
  assert.match(css, /\.reportCoverStats/);
  assert.match(css, /\.reportCoverMeta > span/);
  assert.match(css, /\.reportParagraph,\s*\.reportListItem p \{[^}]*text-align: justify;/s);
  assert.match(css, /text-align-last: left;/);
  assert.match(css, /text-justify: inter-word;/);
  assert.match(component, /data-report-page lang="vi"/);
});
