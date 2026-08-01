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
});

