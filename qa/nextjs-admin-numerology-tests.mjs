import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import {
  calculateNumerology,
  normalizeVietnameseName,
  reduceNumerologyNumber,
} from "../next-app/lib/numerology.ts";

test("matches the handwritten Trần Minh Tú example", () => {
  const result = calculateNumerology("Trần Minh Tú", "1984-03-03");

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
  assert.match(calculator, /result\.nameDigitCounts/);
  assert.match(calculator, /Chỉ số thiếu vẫn chỉ xét ngày sinh/);
  assert.match(calculator, /window\.print\(\)/);
  assert.match(styles, /@media print/);
});
