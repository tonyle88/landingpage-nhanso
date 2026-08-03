import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateNumerology,
  formatVietnameseName,
  normalizeVietnameseName,
  reduceNumerologyNumber,
} from "../next-app/lib/numerology.ts";

test("matches the handwritten Trần Minh Tú example", () => {
  const result = calculateNumerology("Trần Minh Tú", "1984-03-03", 2026);

  assert.equal(result.metrics.lifePath.display, "1");
  assert.equal(result.metrics.birthday.display, "3");
  assert.equal(result.metrics.mission.display, "3");
  assert.equal(result.metrics.soul.display, "13/4");
  assert.equal(result.metrics.personality.display, "8");
  assert.equal(result.metrics.attitude.display, "6");
  assert.equal(result.metrics.maturity.display, "4");
  assert.equal(result.metrics.lifePath.formula, "3 + 3 + 22 = 28 → 1");
  assert.equal(result.metrics.mission.formula, "8 + 8 + 5 = 21 → 3");
  assert.equal(result.metrics.soul.formula, "1 + 9 + 3 = 13 → 13/4");
  assert.equal(result.metrics.personality.formula, "7 + 8 + 2 = 17 → 8");
  assert.deepEqual(result.nameDigitCounts, {
    1: 1,
    2: 2,
    3: 1,
    4: 1,
    5: 2,
    6: 0,
    7: 0,
    8: 1,
    9: 2,
  });
  assert.deepEqual(result.missing, [2, 5, 6, 7]);
  assert.deepEqual(result.karmicDebts, [
    { display: "13/4", sources: ["Chỉ số linh hồn"] },
  ]);
  assert.deepEqual(result.pyramid.base, { month: 3, day: 3, year: 4 });
  assert.deepEqual(
    result.pyramid.peaks.map((peak) => peak.value),
    [6, 7, 4, 7],
  );
  assert.deepEqual(
    result.pyramid.peaks.map((peak) => peak.display),
    ["6", "7", "4", "7"],
  );
  assert.deepEqual(
    result.pyramid.peaks.map((peak) => peak.challenge),
    [0, 1, 1, 1],
  );
  assert.equal(result.pyramid.peaks[2].challengeFormula, "|6 - 7| = 1");
  assert.deepEqual(
    result.pyramid.peaks.map((peak) => peak.milestoneAge),
    [35, 44, 53, 62],
  );
  assert.deepEqual(
    result.pyramid.peaks.map((peak) => peak.milestoneYear),
    [2019, 2028, 2037, 2046],
  );
  assert.equal(result.pyramid.firstMilestoneFormula, "36 - 1 = 35 tuổi");
  assert.deepEqual(result.annualCycle.worldYear, {
    year: 2026,
    value: 1,
    formula: "2 + 0 + 2 + 6 = 10 → 1",
  });
  assert.deepEqual(result.annualCycle.currentPersonalYear, {
    year: 2026,
    value: 7,
    formula: "3 + 3 + 1 = 7",
    operatingFrom: "01/10/2025",
    operatingTo: "31/07/2026",
    durationMonths: 10,
  });
  assert.deepEqual(result.annualCycle.nextPersonalYear, {
    year: 2027,
    value: 8,
    formula: "3 + 3 + 2 = 8",
    operatingFrom: "01/08/2026",
    operatingTo: "31/08/2027",
    durationMonths: 13,
  });
  assert.deepEqual(
    result.annualCycle.cycle.map(({ year, value, isCurrent }) => ({
      year,
      value,
      isCurrent,
    })),
    [
      { year: 2020, value: 1, isCurrent: false },
      { year: 2021, value: 2, isCurrent: false },
      { year: 2022, value: 3, isCurrent: false },
      { year: 2023, value: 4, isCurrent: false },
      { year: 2024, value: 5, isCurrent: false },
      { year: 2025, value: 6, isCurrent: false },
      { year: 2026, value: 7, isCurrent: true },
      { year: 2027, value: 8, isCurrent: false },
      { year: 2028, value: 9, isCurrent: false },
    ],
  );
});

test("supports master numbers, Vietnamese names and date validation", () => {
  assert.equal(reduceNumerologyNumber(22, true), 22);
  assert.equal(reduceNumerologyNumber(22, false), 4);
  assert.equal(normalizeVietnameseName("Đặng Mỹ Ý"), "dang my y");
  assert.throws(
    () => calculateNumerology("Khách tương lai", "2999-01-01"),
    /tương lai/,
  );
});

test("formats customer names consistently for screen and exports", () => {
  assert.equal(formatVietnameseName("LÊ THỊ KIM HIỀN"), "Lê Thị Kim Hiền");
  assert.equal(formatVietnameseName("  lê   thị kim hiền  "), "Lê Thị Kim Hiền");
  assert.equal(formatVietnameseName("LÊ-thỊ  KIM hiỀN"), "Lê-Thị Kim Hiền");
  assert.equal(
    calculateNumerology("lÊ tHị kIM hIỀn", "1990-06-28").fullName,
    "Lê Thị Kim Hiền",
  );
});

test("keeps master peak labels but uses their single-digit value downstream", () => {
  const result = calculateNumerology("Khách kiểm thử", "1990-02-09");

  assert.equal(result.pyramid.peaks[0].display, "11/2");
  assert.equal(result.pyramid.peaks[0].value, 2);
  assert.equal(result.pyramid.peaks[0].formula, "2 + 9 = 11 → 11/2");
  assert.equal(result.pyramid.peaks[2].formula, "2 + 1 = 3");
  assert.equal(result.pyramid.peaks[2].challengeFormula, "|2 - 1| = 1");
});

test("labels PY (2026) = 1 and applies the custom operating period", () => {
  const result = calculateNumerology("Khách năm một", "1990-01-08", 2026);

  assert.equal(result.annualCycle.currentPersonalYear.value, 1);
  assert.equal(result.annualCycle.currentPersonalYear.formula, "8 + 1 + 1 = 10 → 1");
  assert.equal(
    result.annualCycle.currentPersonalYear.operatingFrom,
    "01/10/2025",
  );
  assert.equal(
    result.annualCycle.currentPersonalYear.operatingTo,
    "31/10/2026",
  );
  assert.equal(result.annualCycle.currentPersonalYear.durationMonths, 13);
});

test("applies the researched transition period for every personal year", () => {
  const expected = {
    1: ["01/10/2025", "31/10/2026", 13],
    2: ["01/11/2025", "31/08/2026", 10],
    3: ["01/09/2025", "30/09/2026", 13],
    4: ["01/10/2025", "31/10/2026", 13],
    5: ["01/11/2025", "31/08/2026", 10],
    6: ["01/09/2025", "30/09/2026", 13],
    7: ["01/10/2025", "31/07/2026", 10],
    8: ["01/08/2025", "31/08/2026", 13],
    9: ["01/09/2025", "30/09/2026", 13],
  };
  const birthDaysByPersonalYear = {
    1: 8,
    2: 9,
    3: 1,
    4: 2,
    5: 3,
    6: 4,
    7: 5,
    8: 6,
    9: 7,
  };

  for (const [personalYear, birthDay] of Object.entries(
    birthDaysByPersonalYear,
  )) {
    const result = calculateNumerology(
      "Khách kiểm thử",
      `1990-01-${String(birthDay).padStart(2, "0")}`,
      2026,
    );
    assert.equal(
      result.annualCycle.currentPersonalYear.value,
      Number(personalYear),
    );
    assert.deepEqual(
      [
        result.annualCycle.currentPersonalYear.operatingFrom,
        result.annualCycle.currentPersonalYear.operatingTo,
        result.annualCycle.currentPersonalYear.durationMonths,
      ],
      expected[personalYear],
    );
  }
});

test("is integrated only into the Next.js admin", async () => {
  const [dashboard, calculator, styles] = await Promise.all([
    readFile(new URL("../next-app/app/admin/page.tsx", import.meta.url), "utf8"),
    readFile(
      new URL(
        "../next-app/app/admin/numerology/numerology-calculator.tsx",
        import.meta.url,
      ),
      "utf8",
    ),
    readFile(
      new URL("../next-app/app/admin/admin.module.css", import.meta.url),
      "utf8",
    ),
  ]);

  assert.match(dashboard, /href: "\/admin\/numerology"/);
  assert.match(calculator, /calculateNumerology/);
  assert.match(calculator, /Kim tự tháp Pitago/);
  assert.match(calculator, /numerologyPyramidMilestone/);
  assert.match(calculator, /result\.nameDigitCounts/);
  assert.match(calculator, /Chỉ số thiếu vẫn chỉ xét ngày sinh/);
  assert.match(calculator, /<abbr title="Ngày sinh">NS<\/abbr>/);
  assert.match(calculator, /<abbr title="Họ tên">HT<\/abbr>/);
  assert.match(calculator, /Năm thế giới &amp; năm cá nhân/);
  assert.match(calculator, /Biểu đồ chu kỳ hình sin/);
  assert.match(
    calculator,
    /CYCLE_POINT_Y = \[48, 79, 143, 160, 107, 58, 178, 130, 48\]/,
  );
  assert.match(calculator, /Shared by the live chart, full PDF, customer PDF and A4 JPG/);
  assert.match(calculator, /numerologySineCurrentPoint/);
  assert.match(calculator, /window\.print\(\)/);
  assert.match(calculator, /PDF khách · 1 trang A4/);
  assert.match(calculator, /printPdf\("summary"\)/);
  assert.match(calculator, /JPG khách · khổ A4/);
  assert.match(calculator, /exportCustomerJpg/);
  assert.match(calculator, /renderCustomerSummaryAsJpeg/);
  assert.match(calculator, /ensureCustomerJpgFonts/);
  assert.match(calculator, /NumerologyExportScript/);
  assert.match(calculator, /result\.fullName, logicalWidth \/ 2/);
  assert.match(calculator, /Ngày sinh ·/);
  assert.match(calculator, /drawCanvasPanel\(context, 12, topY, 340, 242\)/);
  assert.match(calculator, /x \+ cellWidth \/ 2/);
  assert.match(calculator, /drawCanvasArrow/);
  assert.match(calculator, /"#0d3034"/);
  assert.match(calculator, /"#ef6a2e"/);
  assert.match(calculator, /challengeNodes/);
  assert.match(calculator, /createRadialGradient/);
  assert.match(calculator, /"#071f23"/);
  assert.match(calculator, /"#f2b27e"/);
  assert.match(calculator, /image\/jpeg/);
  assert.doesNotMatch(calculator, /foreignObject/);
  assert.doesNotMatch(calculator, /drawImage/);
  assert.match(calculator, /numerologyCustomerSummary/);
  assert.match(calculator, /Hồ sơ nhân số học số \{reportNumber\}/);
  assert.match(calculator, /9 nhóm chỉ số/);
  assert.match(calculator, /4 đỉnh cao &amp; thử thách/);
  assert.match(calculator, /numerologySummaryPeakCycles/);
  assert.match(calculator, /result\.pyramid\.peaks\.map/);
  assert.match(styles, /body\[data-numerology-print="summary"\]/);
  assert.match(styles, /body\[data-numerology-image="summary"\]/);
  assert.match(styles, /Export theme inspired by the Clow Cat Patronus Vietnamese report/);
  assert.match(styles, /radial-gradient\(circle at 94% 5%/);
  assert.match(styles, /@page \{ size: A4; margin: 0; \}/);
  assert.match(styles, /\.numerologySummaryPeakCycleGrid/);
  assert.match(styles, /@page customer-summary/);
  assert.match(styles, /height: 297mm/);
  assert.match(styles, /padding: 6mm/);
  assert.match(styles, /@media print/);
});

test("archives optimized PDF and A4 JPG files for configurable recent history", async () => {
  const [
    page,
    calculator,
    listRoute,
    downloadRoute,
    recordsConfig,
    recordsServerConfig,
    migration,
    styles,
  ] = await Promise.all([
    readFile(new URL("../next-app/app/admin/numerology/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/admin/numerology/numerology-calculator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/[id]/download/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/lib/admin/numerology-records.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/lib/admin/numerology-records.server.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/supabase/migrations/202608020001_numerology_recent_archive.sql", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/admin/admin.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(recordsConfig, /NUMEROLOGY_HISTORY_LIMIT = 50/);
  assert.match(recordsConfig, /NUMEROLOGY_HISTORY_PAGE_SIZE = 20/);
  assert.match(recordsServerConfig, /process\.env\.NUMEROLOGY_HISTORY_LIMIT/);
  assert.match(recordsServerConfig, /admin\.numerology_history_limit/);
  assert.match(recordsServerConfig, /Math\.min\(Math\.max\(Math\.round\(parsed\), 20\), 1000\)/);
  assert.match(migration, /'admin\.numerology_history_limit'/);
  assert.match(migration, /'\{"limit": 50\}'::jsonb/);
  assert.match(migration, /'numerology-exports'/);
  assert.match(migration, /false,/);
  assert.match(migration, /create table if not exists public\.numerology_records/);
  assert.match(migration, /numerology_records_admin_read/);
  assert.match(page, /initialRecords/);
  assert.match(page, /historyLimit=\{historyLimit\}/);
  assert.match(calculator, /Khách hàng tra gần đây/);
  assert.match(calculator, /loadHistoryPage/);
  assert.match(calculator, /createOptimizedArchiveFiles/);
  assert.match(calculator, /createPdfFromJpegPages/);
  assert.match(calculator, /renderCustomerDetailAsJpeg/);
  assert.match(calculator, /method: "POST"/);
  assert.match(calculator, /20 người mỗi trang/);
  assert.match(calculator, /download\?type=pdf/);
  assert.match(calculator, /download\?type=jpg/);
  assert.match(listRoute, /jpeg\(\{/);
  assert.match(listRoute, /quality: 84/);
  assert.match(listRoute, /chromaSubsampling: "4:4:4"/);
  assert.match(listRoute, /range\(historyLimit, historyLimit \+ 999\)/);
  assert.match(listRoute, /can\(principal\.role, "manage_content"\)/);
  assert.match(downloadRoute, /Cache-Control": "private, no-store"/);
  assert.match(downloadRoute, /getAdminPrincipal/);
  assert.match(styles, /\.numerologyHistoryList/);
  assert.match(styles, /grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
});

test("assigns a durable manual or automatic number to every numerology export", async () => {
  const [calculator, listRoute, numberRoute, recordsConfig, migration] = await Promise.all([
    readFile(new URL("../next-app/app/admin/numerology/numerology-calculator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/report-number/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/lib/admin/numerology-records.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/supabase/migrations/202608030001_numerology_report_numbers.sql", import.meta.url), "utf8"),
  ]);

  assert.match(calculator, /Số hồ sơ \(không bắt buộc\)/);
  assert.match(calculator, /Để trống để cấp tự động/);
  assert.match(calculator, /resolveReportNumber/);
  assert.match(calculator, /report-number/);
  assert.match(calculator, /HỒ SƠ NHÂN SỐ HỌC SỐ \$\{reportNumber\}/);
  assert.match(calculator, /Hồ sơ nhân số học số \{reportNumber\}/);
  assert.match(calculator, /renderCustomerSummaryAsJpeg\(result, generatedAt, reportNumber\)/);
  assert.match(calculator, /renderCustomerDetailAsJpeg\(result, generatedAt, reportNumber\)/);
  assert.match(calculator, /form\.set\("reportNumber", String\(nextReportNumber\)\)/);
  assert.match(listRoute, /report_number: reportNumber/);
  assert.match(listRoute, /Số hồ sơ \$\{reportNumber\} đã được sử dụng/);
  assert.match(numberRoute, /requestedNumber/);
  assert.match(numberRoute, /reserve_numerology_report_number/);
  assert.match(recordsConfig, /reportNumber: number/);
  assert.match(migration, /create sequence if not exists public\.numerology_report_number_seq/);
  assert.match(migration, /add column if not exists report_number bigint/);
  assert.match(migration, /create unique index if not exists numerology_records_report_number_key/);
  assert.match(migration, /create or replace function public\.reserve_numerology_report_number/);
});

test("isolates numerology archives per signed-in user and exposes a guarded limit control", async () => {
  const [
    page,
    calculator,
    listRoute,
    numberRoute,
    downloadRoute,
    settingsRoute,
    migration,
    styles,
  ] = await Promise.all([
    readFile(new URL("../next-app/app/admin/numerology/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/admin/numerology/numerology-calculator.tsx", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/report-number/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/[id]/download/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/api/admin/numerology-records/settings/route.ts", import.meta.url), "utf8"),
    readFile(new URL("../next-app/supabase/migrations/202608030002_numerology_per_user_vaults.sql", import.meta.url), "utf8"),
    readFile(new URL("../next-app/app/admin/admin.module.css", import.meta.url), "utf8"),
  ]);

  assert.match(page, /\.eq\("created_by", principal\.userId\)/);
  assert.match(page, /canConfigureHistory=\{can\(principal\.role, "manage_operations"\)\}/);
  assert.match(listRoute, /\.eq\("created_by", principal\.userId\)/);
  assert.match(listRoute, /users\/\$\{principal\.userId\}\/records\/\$\{id\}/);
  assert.match(listRoute, /onConflict: "created_by,normalized_name,birth_date"/);
  assert.match(numberRoute, /\.eq\("created_by", principal\.userId\)/);
  assert.match(downloadRoute, /\.eq\("created_by", principal\.userId\)/);
  assert.match(settingsRoute, /can\(principal\.role, "manage_operations"\)/);
  assert.match(settingsRoute, /limit < 20 \|\| limit > 1000/);
  assert.match(settingsRoute, /admin_save_site_setting/);
  assert.match(calculator, /Giới hạn mỗi tài khoản/);
  assert.match(calculator, /api\/admin\/numerology-records\/settings/);
  assert.match(calculator, /áp dụng riêng cho từng user/);
  assert.match(styles, /\.numerologyHistoryControls/);
  assert.match(migration, /created_by = auth\.uid\(\)/);
  assert.match(migration, /numerology_records_owner_customer_key/);
  assert.match(migration, /numerology_records_owner_report_number_key/);
  assert.match(migration, /users\/.*created_by.*\/records\//s);
});
