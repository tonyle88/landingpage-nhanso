import assert from "node:assert/strict";
import test from "node:test";
import {
  LOVE_LANGUAGE_QUESTIONS,
  scoreLifeWheel,
  scoreLoveLanguages,
  scoreVakad,
  VAKAD_QUESTIONS,
  WHEEL_CATEGORIES,
} from "../next-app/lib/self-discovery-tools.ts";

test("VAKAd applies one unique 4-3-2-1 ranking per question", () => {
  const rankings = Object.fromEntries(VAKAD_QUESTIONS.map((question) => [
    question.id,
    ["V", "A", "K", "Ad"],
  ]));
  const result = scoreVakad(rankings);
  assert.deepEqual(result, { V: 60, A: 45, K: 30, Ad: 15 });
  assert.equal(Object.values(result).reduce((sum, value) => sum + value, 0), 150);
});

test("love-language score counts exactly one code for all 30 pairs", () => {
  const answers = Object.fromEntries(LOVE_LANGUAGE_QUESTIONS.map((question) => [
    question.id,
    question.options[0].code,
  ]));
  const result = scoreLoveLanguages(answers);
  assert.equal(Object.values(result).reduce((sum, value) => sum + value, 0), 30);
});

test("life-wheel score averages questions inside each of eight categories", () => {
  const answers = Object.fromEntries(WHEEL_CATEGORIES.flatMap((category) =>
    category.questions.map((_, index) => [`${category.id}-${index + 1}`, index + 1]),
  ));
  const result = scoreLifeWheel(answers);
  for (const category of WHEEL_CATEGORIES) {
    const expected = category.questions.reduce((sum, _, index) => sum + index + 1, 0) / category.questions.length;
    assert.equal(result[category.id], Math.round(expected * 10) / 10);
  }
});
