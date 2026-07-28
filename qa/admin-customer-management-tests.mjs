import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const migration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607280006_admin_customer_directory.sql",
    root,
  ),
  "utf8",
);
const periodMigration = await readFile(
  new URL(
    "next-app/supabase/migrations/202607280007_filter_customer_directory_by_period.sql",
    root,
  ),
  "utf8",
);
const page = await readFile(
  new URL("next-app/app/admin/customers/page.tsx", root),
  "utf8",
);
const exportRoute = await readFile(
  new URL("next-app/app/admin/customers/export/route.ts", root),
  "utf8",
);
const reportPage = await readFile(
  new URL("next-app/app/admin/customers/report/page.tsx", root),
  "utf8",
);
const adminPage = await readFile(
  new URL("next-app/app/admin/page.tsx", root),
  "utf8",
);
const customerReport = await readFile(
  new URL("next-app/lib/admin/customer-report.ts", root),
  "utf8",
);
const adminStyles = await readFile(
  new URL("next-app/app/admin/admin.module.css", root),
  "utf8",
);

test("customer directory only aggregates confirmed bookings by normalized email", () => {
  assert.match(migration, /where b\.status = 'confirmed'/);
  assert.match(migration, /partition by lower\(btrim\(b\.email::text\)\)/);
  assert.match(migration, /count\(\*\) over/);
  assert.match(migration, /min\(coalesce\(b\.confirmed_at, b\.created_at\)\)/);
  assert.match(migration, /order by f\.effective_confirmed_at desc/);
});

test("customer directory RPC is restricted to operational readers", () => {
  assert.match(migration, /v_role not in \('owner', 'admin', 'auditor'\)/);
  assert.match(
    migration,
    /revoke all on function public\.admin_list_booking_customers/,
  );
  assert.match(migration, /grant execute[\s\S]*to authenticated/);
  assert.doesNotMatch(migration, /grant execute[\s\S]*to anon/);
  assert.match(page, /can\(principal\.role, "read_operations"\)/);
});

test("customer page supports search, pagination and requested summary fields", () => {
  assert.match(page, /name="q"/);
  assert.match(page, /Tên, email hoặc số điện thoại/);
  assert.match(page, /CUSTOMER_PAGE_SIZE/);
  assert.match(page, /p_offset: offset/);
  assert.match(page, /customer\.customer_name/);
  assert.match(page, /customer\.date_of_birth/);
  assert.match(page, /customer\.email/);
  assert.match(page, /customer\.latest_confirmed_at/);
  assert.match(page, /customer\.successful_bookings/);
  assert.match(page, /Trang trước/);
  assert.match(page, /Trang sau/);
  assert.match(adminPage, /href: "\/admin\/customers"/);
});

test("month and year filters use the Vietnam confirmation date throughout", () => {
  assert.match(
    periodMigration,
    /coalesce\(b\.confirmed_at, b\.created_at\)[\s\S]*at time zone 'Asia\/Ho_Chi_Minh'/,
  );
  assert.match(periodMigration, /extract\([\s\S]*year[\s\S]*= v_year/);
  assert.match(periodMigration, /extract\([\s\S]*month[\s\S]*= v_month/);
  assert.match(page, /name="month"/);
  assert.match(page, /name="year"/);
  assert.match(page, /p_year: selectedYear/);
  assert.match(page, /p_month: selectedMonth/);
  assert.match(customerReport, /parseCustomerPeriod/);
  assert.match(customerReport, /customerPeriodLabel/);
});

test("customer exports preserve the active search and protect PII responses", () => {
  assert.match(
    page,
    /customerExportHref\("\/admin\/customers\/export", \{[\s\S]*year: selectedYear,[\s\S]*month: selectedMonth/,
  );
  assert.match(
    page,
    /customerExportHref\("\/admin\/customers\/report", \{[\s\S]*year: selectedYear,[\s\S]*month: selectedMonth/,
  );
  assert.match(exportRoute, /can\(principal\.role, "read_operations"\)/);
  assert.match(exportRoute, /p_year: year/);
  assert.match(exportRoute, /p_month: month/);
  assert.match(exportRoute, /createXlsxWorkbook/);
  assert.match(
    exportRoute,
    /application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/,
  );
  assert.match(exportRoute, /Cache-Control": "private, no-store"/);
  assert.match(reportPage, /can\(principal\.role, "read_operations"\)/);
  assert.match(reportPage, /p_year: year/);
  assert.match(reportPage, /p_month: month/);
  assert.match(reportPage, /PrintReport/);
  assert.match(customerReport, /slice\(0, 100\)/);
});

test("customer directory has a responsive compact table", () => {
  assert.match(adminStyles, /\.customerTableHeader,[\s\S]*\.customerRow/);
  assert.match(adminStyles, /\.customerAvatar/);
  assert.match(
    adminStyles,
    /@media \(max-width: 760px\)[\s\S]*\.customerTableHeader \{ display: none; \}/,
  );
});
