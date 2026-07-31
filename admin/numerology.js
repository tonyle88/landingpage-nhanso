(function attachNumerologyCalculator(global) {
  'use strict';

  const PYTHAGOREAN_VALUES = {
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

  const MASTER_LABELS = { 11: '11/2', 22: '22/4', 33: '33/6' };
  const KARMIC_LABELS = { 13: '13/4', 14: '14/5', 16: '16/7', 19: '19/1' };
  const METRIC_LABELS = {
    lifePath: 'Chỉ số đường đời',
    birthday: 'Chỉ số ngày sinh',
    mission: 'Chỉ số sứ mệnh',
    soul: 'Chỉ số linh hồn',
    personality: 'Chỉ số nhân cách',
    attitude: 'Chỉ số thái độ',
    maturity: 'Chỉ số trưởng thành',
  };

  function sumDigits(value) {
    return String(Math.abs(Number(value) || 0))
      .split('')
      .reduce((sum, digit) => sum + Number(digit), 0);
  }

  function reduceNumber(value, keepMasterNumbers) {
    let number = Math.abs(Number(value) || 0);
    while (number > 9) {
      if (keepMasterNumbers && (number === 11 || number === 22 || number === 33)) return number;
      number = sumDigits(number);
    }
    return number;
  }

  function formatNumber(number) {
    return MASTER_LABELS[Number(number)] || String(number);
  }

  function resolveFinalNumber(value, keepMasterNumbers = true) {
    const raw = Math.abs(Number(value) || 0);
    const karmicDebt = KARMIC_LABELS[raw] || null;
    if (karmicDebt) {
      return {
        raw,
        value: reduceNumber(raw, false),
        display: karmicDebt,
        karmicDebt,
      };
    }

    const reduced = reduceNumber(raw, keepMasterNumbers);
    return {
      raw,
      value: reduced,
      display: formatNumber(reduced),
      karmicDebt: null,
    };
  }

  function normalizeVietnameseName(name) {
    return String(name || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'd')
      .toLowerCase()
      .replace(/[^a-z\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function isBasicVowel(char) {
    return Boolean(char) && 'aeiou'.includes(char);
  }

  function isSoulVowel(chars, index) {
    const char = chars[index];
    if (isBasicVowel(char)) return true;
    if (char !== 'y') return false;
    return !isBasicVowel(chars[index - 1]) && !isBasicVowel(chars[index + 1]);
  }

  function filterWordLetters(word, mode) {
    const chars = String(word || '').replace(/[^a-z]/g, '').split('');
    if (mode === 'all') return chars;
    return chars.filter((char, index) => {
      const vowel = isSoulVowel(chars, index);
      return mode === 'vowels' ? vowel : !vowel;
    });
  }

  function calculateWordNumber(word, mode) {
    const letters = filterWordLetters(word, mode);
    const raw = letters.reduce((sum, letter) => sum + (PYTHAGOREAN_VALUES[letter] || 0), 0);
    return {
      letters: letters.join('').toUpperCase(),
      raw,
      reduced: raw ? reduceNumber(raw, true) : 0,
    };
  }

  function calculateNameDetails(name) {
    const words = normalizeVietnameseName(name).split(/\s+/).filter(Boolean);
    const breakdown = words.map((word) => ({
      word: word.toUpperCase(),
      all: calculateWordNumber(word, 'all'),
      vowels: calculateWordNumber(word, 'vowels'),
      consonants: calculateWordNumber(word, 'consonants'),
    }));

    const calculateMetric = (part) => {
      const wordValues = breakdown.map((word) => word[part].reduced).filter(Boolean);
      const total = wordValues.reduce((sum, value) => sum + value, 0);
      return {
        ...resolveFinalNumber(total, true),
        parts: wordValues,
      };
    };

    return {
      normalizedName: words.join(' ').toUpperCase(),
      breakdown,
      mission: calculateMetric('all'),
      soul: calculateMetric('vowels'),
      personality: calculateMetric('consonants'),
    };
  }

  function createFormula(parts, result) {
    const expression = parts.join(' + ');
    const total = parts.reduce((sum, value) => sum + value, 0);
    if (parts.length === 1) {
      return String(total) === result.display ? expression : `${expression} → ${result.display}`;
    }
    return String(total) === result.display
      ? `${expression} = ${total}`
      : `${expression} = ${total} → ${result.display}`;
  }

  function calculate(fullName, isoDate) {
    const cleanName = String(fullName || '').trim().replace(/\s+/g, ' ');
    const match = String(isoDate || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (!cleanName || !normalizeVietnameseName(cleanName)) {
      throw new Error('Vui lòng nhập họ và tên hợp lệ.');
    }
    if (!match) throw new Error('Vui lòng chọn ngày sinh hợp lệ.');

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
      throw new Error('Ngày sinh không tồn tại.');
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (date > today) throw new Error('Ngày sinh không được ở tương lai.');

    const dayPart = reduceNumber(day, true);
    const monthPart = reduceNumber(month, true);
    const yearPart = reduceNumber(year, true);
    const lifePath = resolveFinalNumber(dayPart + monthPart + yearPart, true);
    lifePath.parts = [dayPart, monthPart, yearPart];

    const birthday = resolveFinalNumber(day, true);
    birthday.parts = [day];

    const nameDetails = calculateNameDetails(cleanName);
    const mission = nameDetails.mission;
    const soul = nameDetails.soul;
    const personality = nameDetails.personality;

    const attitude = resolveFinalNumber(dayPart + monthPart, true);
    attitude.parts = [dayPart, monthPart];

    const maturity = resolveFinalNumber(lifePath.value + mission.value, true);
    maturity.parts = [lifePath.value, mission.value];

    const dateDigits = `${String(day).padStart(2, '0')}${String(month).padStart(2, '0')}${year}`;
    const digitCounts = Object.fromEntries(
      Array.from({ length: 9 }, (_, index) => {
        const digit = String(index + 1);
        return [digit, [...dateDigits].filter((value) => value === digit).length];
      })
    );
    const missing = Object.entries(digitCounts)
      .filter(([, count]) => count === 0)
      .map(([digit]) => Number(digit));

    const metrics = { lifePath, birthday, mission, soul, personality, attitude, maturity };
    const debtMap = new Map();
    Object.entries(metrics).forEach(([key, metric]) => {
      if (!metric.karmicDebt) return;
      if (!debtMap.has(metric.karmicDebt)) debtMap.set(metric.karmicDebt, []);
      debtMap.get(metric.karmicDebt).push(METRIC_LABELS[key]);
    });
    const karmicDebts = [...debtMap.entries()].map(([display, sources]) => ({ display, sources }));

    Object.values(metrics).forEach((metric) => {
      metric.formula = createFormula(metric.parts, metric);
    });

    return {
      fullName: cleanName,
      normalizedName: nameDetails.normalizedName,
      isoDate,
      formattedDate: `${String(day).padStart(2, '0')}/${String(month).padStart(2, '0')}/${year}`,
      generatedAt: new Intl.DateTimeFormat('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date()),
      metrics,
      nameBreakdown: nameDetails.breakdown,
      digitCounts,
      missing,
      karmicDebts,
    };
  }

  global.ClowNumerology = Object.freeze({
    calculate,
    normalizeVietnameseName,
    reduceNumber,
    resolveFinalNumber,
  });
})(typeof globalThis !== 'undefined' ? globalThis : window);
