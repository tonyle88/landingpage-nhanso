import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateNumerology,
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
    /CYCLE_POINT_Y = \[48, 79, 143, 166, 107, 48, 178, 130, 82\]/,
  );
  assert.match(calculator, /numerologySineCurrentPoint/);
  assert.match(calculator, /window\.print\(\)/);
  assert.match(calculator, /PDF khách · 1 trang A4/);
  assert.match(calculator, /printPdf\("summary"\)/);
  assert.match(calculator, /numerologyCustomerSummary/);
  assert.match(calculator, /Hồ sơ nhân số học tóm tắt/);
  assert.match(calculator, /9 nhóm chỉ số/);
  assert.match(styles, /body\[data-numerology-print="summary"\]/);
  assert.match(styles, /@page customer-summary/);
  assert.match(styles, /height: 285mm/);
  assert.match(styles, /@media print/);
});
