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
  missing: number[];
  karmicDebts: Array<{ display: string; sources: string[] }>;
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

export function calculateNumerology(
  fullName: string,
  isoDate: string,
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

  const dateDigits =
    `${String(day).padStart(2, "0")}${String(month).padStart(2, "0")}${year}`;
  const digitCounts = Object.fromEntries(
    Array.from({ length: 9 }, (_, index) => {
      const digit = String(index + 1);
      return [digit, [...dateDigits].filter((value) => value === digit).length];
    }),
  );
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
    missing,
    karmicDebts: [...debtMap.entries()].map(([display, sources]) => ({
      display,
      sources,
    })),
  };
}
