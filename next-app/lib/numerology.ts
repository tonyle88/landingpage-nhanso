export type NumerologyMetricKey =
  | "lifePath"
  | "birthday"
  | "mission"
  | "soul"
  | "personality"
  | "attitude"
  | "maturity";

export type NumerologyMetric = {
  raw: number;
  value: number;
  display: string;
  karmicDebt: string | null;
  parts: number[];
  formula: string;
};

export type NamePart = {
  letters: string;
  raw: number;
  reduced: number;
};

export type NumerologyResult = {
  fullName: string;
  normalizedName: string;
  isoDate: string;
  formattedDate: string;
  metrics: Record<NumerologyMetricKey, NumerologyMetric>;
  nameBreakdown: Array<{
    word: string;
    all: NamePart;
    vowels: NamePart;
    consonants: NamePart;
  }>;
  digitCounts: Record<string, number>;
  nameDigitCounts: Record<string, number>;
  missing: number[];
  karmicDebts: Array<{ display: string; sources: string[] }>;
  pyramid: {
    base: {
      month: number;
      day: number;
      year: number;
    };
    peaks: Array<{
      value: number;
      display: string;
      formula: string;
      challenge: number;
      challengeFormula: string;
      milestoneAge: number;
      milestoneYear: number;
    }>;
    firstMilestoneFormula: string;
  };
  annualCycle: {
    worldYear: {
      year: number;
      value: number;
      formula: string;
    };
    currentPersonalYear: {
      year: number;
      value: number;
      formula: string;
      operatingFrom: string;
      operatingTo: string;
      durationMonths: number;
    };
    nextPersonalYear: {
      year: number;
      value: number;
      formula: string;
      operatingFrom: string;
      operatingTo: string;
      durationMonths: number;
    };
    cycle: Array<{
      year: number;
      value: number;
      isCurrent: boolean;
    }>;
  };
};

const PYTHAGOREAN_VALUES: Record<string, number> = {
  a: 1, j: 1, s: 1,
  b: 2, k: 2, t: 2,
  c: 3, l: 3, u: 3,
  d: 4, m: 4, v: 4,
  e: 5, n: 5, w: 5,
  f: 6, o: 6, x: 6,
  g: 7, p: 7, y: 7,
  h: 8, q: 8, z: 8,
  i: 9, r: 9,
};

const MASTER_LABELS: Record<number, string> = {
  11: "11/2",
  22: "22/4",
  33: "33/6",
};
const KARMIC_LABELS: Record<number, string> = {
  13: "13/4",
  14: "14/5",
  16: "16/7",
  19: "19/1",
};
const PERSONAL_YEAR_OPERATING_PERIODS: Record<
  number,
  {
    startMonth: number;
    endMonth: number;
    endDay: number;
    durationMonths: number;
  }
> = {
  1: { startMonth: 10, endMonth: 10, endDay: 31, durationMonths: 13 },
  2: { startMonth: 11, endMonth: 8, endDay: 31, durationMonths: 10 },
  3: { startMonth: 9, endMonth: 9, endDay: 30, durationMonths: 13 },
  4: { startMonth: 10, endMonth: 10, endDay: 31, durationMonths: 13 },
  5: { startMonth: 11, endMonth: 8, endDay: 31, durationMonths: 10 },
  6: { startMonth: 9, endMonth: 9, endDay: 30, durationMonths: 13 },
  7: { startMonth: 10, endMonth: 7, endDay: 31, durationMonths: 10 },
  8: { startMonth: 8, endMonth: 8, endDay: 31, durationMonths: 13 },
  9: { startMonth: 9, endMonth: 9, endDay: 30, durationMonths: 13 },
};

export const NUMEROLOGY_METRIC_LABELS: Record<NumerologyMetricKey, string> = {
  lifePath: "Chỉ số đường đời",
  birthday: "Chỉ số ngày sinh",
  mission: "Chỉ số sứ mệnh",
  soul: "Chỉ số linh hồn",
  personality: "Chỉ số nhân cách",
  attitude: "Chỉ số thái độ",
  maturity: "Chỉ số trưởng thành",
};

function sumDigits(value: number) {
  return String(Math.abs(Number(value) || 0))
    .split("")
    .reduce((sum, digit) => sum + Number(digit), 0);
}

export function reduceNumerologyNumber(
  value: number,
  keepMasterNumbers: boolean,
) {
  let number = Math.abs(Number(value) || 0);
  while (number > 9) {
    if (
      keepMasterNumbers
      && (number === 11 || number === 22 || number === 33)
    ) {
      return number;
    }
    number = sumDigits(number);
  }
  return number;
}

function resolveFinalNumber(
  value: number,
  keepMasterNumbers = true,
): Omit<NumerologyMetric, "parts" | "formula"> {
  const raw = Math.abs(Number(value) || 0);
  const karmicDebt = KARMIC_LABELS[raw] || null;
  if (karmicDebt) {
    return {
      raw,
      value: reduceNumerologyNumber(raw, false),
      display: karmicDebt,
      karmicDebt,
    };
  }

  const reduced = reduceNumerologyNumber(raw, keepMasterNumbers);
  return {
    raw,
    value: reduced,
    display: MASTER_LABELS[reduced] || String(reduced),
    karmicDebt: null,
  };
}

export function normalizeVietnameseName(name: string) {
  return String(name || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function isBasicVowel(char?: string) {
  return Boolean(char) && "aeiou".includes(char as string);
}

function isSoulVowel(chars: string[], index: number) {
  const char = chars[index];
  if (isBasicVowel(char)) return true;
  if (char !== "y") return false;
  return !isBasicVowel(chars[index - 1]) && !isBasicVowel(chars[index + 1]);
}

function calculateWordNumber(
  word: string,
  mode: "all" | "vowels" | "consonants",
): NamePart {
  const chars = word.replace(/[^a-z]/g, "").split("");
  const letters = mode === "all"
    ? chars
    : chars.filter((_, index) => (
      mode === "vowels"
        ? isSoulVowel(chars, index)
        : !isSoulVowel(chars, index)
    ));
  const raw = letters.reduce(
    (sum, letter) => sum + (PYTHAGOREAN_VALUES[letter] || 0),
    0,
  );
  return {
    letters: letters.join("").toUpperCase(),
    raw,
    reduced: raw ? reduceNumerologyNumber(raw, true) : 0,
  };
}

function createFormula(parts: number[], display: string) {
  const expression = parts.join(" + ");
  const total = parts.reduce((sum, value) => sum + value, 0);
  if (parts.length === 1) {
    return String(total) === display ? expression : `${expression} → ${display}`;
  }
  return String(total) === display
    ? `${expression} = ${total}`
    : `${expression} = ${total} → ${display}`;
}

function completeMetric(
  value: number,
  parts: number[],
): NumerologyMetric {
  const metric = resolveFinalNumber(value, true);
  return {
    ...metric,
    parts,
    formula: createFormula(parts, metric.display),
  };
}

function pyramidFormula(left: number, right: number) {
  const raw = left + right;
  const value = reduceNumerologyNumber(raw, false);
  const display = MASTER_LABELS[raw] || String(value);
  return {
    value,
    display,
    formula: raw === value
      ? `${left} + ${right} = ${display}`
      : `${left} + ${right} = ${raw} → ${display}`,
  };
}

function challengeFormula(left: number, right: number) {
  const value = Math.abs(left - right);
  return {
    value,
    formula: `|${left} - ${right}| = ${value}`,
  };
}

function calculateWorldYear(year: number) {
  const parts = String(year).split("").map(Number);
  const raw = parts.reduce((sum, value) => sum + value, 0);
  const value = reduceNumerologyNumber(raw, false);
  return {
    year,
    value,
    formula: raw === value
      ? `${parts.join(" + ")} = ${value}`
      : `${parts.join(" + ")} = ${raw} → ${value}`,
  };
}

function formatOperatingDate(day: number, month: number, year: number) {
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function calculatePersonalYear(
  calendarYear: number,
  dayValue: number,
  monthValue: number,
) {
  const worldYear = calculateWorldYear(calendarYear);
  const raw = dayValue + monthValue + worldYear.value;
  const value = reduceNumerologyNumber(raw, false);
  const operatingPeriod = PERSONAL_YEAR_OPERATING_PERIODS[value];
  return {
    year: calendarYear,
    value,
    formula: raw === value
      ? `${dayValue} + ${monthValue} + ${worldYear.value} = ${value}`
      : `${dayValue} + ${monthValue} + ${worldYear.value} = ${raw} → ${value}`,
    operatingFrom: formatOperatingDate(
      1,
      operatingPeriod.startMonth,
      calendarYear - 1,
    ),
    operatingTo: formatOperatingDate(
      operatingPeriod.endDay,
      operatingPeriod.endMonth,
      calendarYear,
    ),
    durationMonths: operatingPeriod.durationMonths,
  };
}

export function calculateNumerology(
  fullName: string,
  isoDate: string,
  referenceYear = new Date().getFullYear(),
): NumerologyResult {
  const cleanName = String(fullName || "").trim().replace(/\s+/g, " ");
  const normalizedName = normalizeVietnameseName(cleanName);
  if (!cleanName || !normalizedName) {
    throw new Error("Vui lòng nhập họ và tên hợp lệ.");
  }

  const match = isoDate.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) throw new Error("Vui lòng chọn ngày sinh hợp lệ.");
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(`${isoDate}T00:00:00`);
  if (
    Number.isNaN(date.getTime())
    || date.getFullYear() !== year
    || date.getMonth() + 1 !== month
    || date.getDate() !== day
  ) {
    throw new Error("Ngày sinh không tồn tại.");
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (date > today) throw new Error("Ngày sinh không được ở tương lai.");
  if (!Number.isInteger(referenceYear) || referenceYear < 1) {
    throw new Error("Năm tham chiếu không hợp lệ.");
  }

  const dayPart = reduceNumerologyNumber(day, true);
  const monthPart = reduceNumerologyNumber(month, true);
  const yearPart = reduceNumerologyNumber(year, true);
  const words = normalizedName.split(/\s+/).filter(Boolean);
  const nameBreakdown = words.map((word) => ({
    word: word.toUpperCase(),
    all: calculateWordNumber(word, "all"),
    vowels: calculateWordNumber(word, "vowels"),
    consonants: calculateWordNumber(word, "consonants"),
  }));

  const nameMetric = (
    part: "all" | "vowels" | "consonants",
  ): NumerologyMetric => {
    const parts = nameBreakdown.map((word) => word[part].reduced).filter(Boolean);
    return completeMetric(
      parts.reduce((sum, value) => sum + value, 0),
      parts,
    );
  };

  const lifePath = completeMetric(
    dayPart + monthPart + yearPart,
    [dayPart, monthPart, yearPart],
  );
  const birthday = completeMetric(day, [day]);
  const mission = nameMetric("all");
  const soul = nameMetric("vowels");
  const personality = nameMetric("consonants");
  const attitude = completeMetric(
    dayPart + monthPart,
    [dayPart, monthPart],
  );
  const maturity = completeMetric(
    lifePath.value + mission.value,
    [lifePath.value, mission.value],
  );
  const metrics = {
    lifePath,
    birthday,
    mission,
    soul,
    personality,
    attitude,
    maturity,
  };

  const pyramidBase = {
    month: reduceNumerologyNumber(month, false),
    day: reduceNumerologyNumber(day, false),
    year: reduceNumerologyNumber(year, false),
  };
  const peak1 = pyramidFormula(pyramidBase.month, pyramidBase.day);
  const peak2 = pyramidFormula(pyramidBase.day, pyramidBase.year);
  const peak3 = pyramidFormula(peak1.value, peak2.value);
  const peak4 = pyramidFormula(pyramidBase.month, pyramidBase.year);
  const challenge1 = challengeFormula(pyramidBase.day, pyramidBase.month);
  const challenge2 = challengeFormula(pyramidBase.year, pyramidBase.day);
  const challenge3 = challengeFormula(peak1.value, peak2.value);
  const challenge4 = challengeFormula(pyramidBase.year, pyramidBase.month);
  const lifePathBase = reduceNumerologyNumber(lifePath.value, false);
  const firstMilestoneAge = 36 - lifePathBase;
  const pyramidPeaks = [peak1, peak2, peak3, peak4];
  const pyramidChallenges = [
    challenge1,
    challenge2,
    challenge3,
    challenge4,
  ];

  const worldYear = calculateWorldYear(referenceYear);
  const currentPersonalYear = calculatePersonalYear(
    referenceYear,
    pyramidBase.day,
    pyramidBase.month,
  );
  const nextPersonalYear = calculatePersonalYear(
    referenceYear + 1,
    pyramidBase.day,
    pyramidBase.month,
  );
  const cycleStartYear = referenceYear - (currentPersonalYear.value - 1);
  const annualCycle = Array.from({ length: 9 }, (_, index) => {
    const cycleYear = cycleStartYear + index;
    return {
      year: cycleYear,
      value: calculatePersonalYear(
        cycleYear,
        pyramidBase.day,
        pyramidBase.month,
      ).value,
      isCurrent: cycleYear === referenceYear,
    };
  });

  const dateDigits =
    `${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${year}`;
  const digitCounts = Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => {
      const digit = String(index + 1);
      return [digit, [...dateDigits].filter((value) => value === digit).length];
    }),
  );
  const nameDigitCounts: Record<string, number> = Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => [String(index + 1), 0]),
  );
  for (const letter of normalizedName.replace(/\s/g, "")) {
    const value = PYTHAGOREAN_VALUES[letter];
    if (value) nameDigitCounts[String(value)] += 1;
  }
  const missing = Object.entries(digitCounts)
    .filter(([, count]) => count === 0)
    .map(([digit]) => Number(digit));

  const debtMap = new Map<string, string[]>();
  (Object.entries(metrics) as Array<[NumerologyMetricKey, NumerologyMetric]>)
    .forEach(([key, metric]) => {
      if (!metric.karmicDebt) return;
      const sources = debtMap.get(metric.karmicDebt) || [];
      sources.push(NUMEROLOGY_METRIC_LABELS[key]);
      debtMap.set(metric.karmicDebt, sources);
    });

  return {
    fullName: cleanName,
    normalizedName: normalizedName.toUpperCase(),
    isoDate,
    formattedDate:
      `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`,
    metrics,
    nameBreakdown,
    digitCounts,
    nameDigitCounts,
    missing,
    karmicDebts: [...debtMap.entries()].map(([display, sources]) => ({
      display,
      sources,
    })),
    pyramid: {
      base: pyramidBase,
      peaks: pyramidPeaks.map((peak, index) => ({
        ...peak,
        challenge: pyramidChallenges[index].value,
        challengeFormula: pyramidChallenges[index].formula,
        milestoneAge: firstMilestoneAge + index * 9,
        milestoneYear: year + firstMilestoneAge + index * 9,
      })),
      firstMilestoneFormula:
        `36 - ${lifePathBase} = ${firstMilestoneAge} tuổi`,
    },
    annualCycle: {
      worldYear,
      currentPersonalYear,
      nextPersonalYear,
      cycle: annualCycle,
    },
  };
}
