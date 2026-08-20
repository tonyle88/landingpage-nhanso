import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import {
  LOVE_LANGUAGE_QUESTIONS,
  parseLoveLanguageQuestions,
  parseVakadQuestions,
  parseWheelCategories,
  scoreLifeWheel,
  scoreLoveLanguages,
  scoreVakad,
  VAKAD_QUESTIONS,
  WHEEL_CATEGORIES,
} from "../next-app/lib/self-discovery-tools.ts";

const clone = (value) => JSON.parse(JSON.stringify(value));

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

test("admin parsers accept editable text while preserving each scoring structure", () => {
  assert.equal(parseVakadQuestions({ questions: clone(VAKAD_QUESTIONS) })?.length, 15);
  assert.equal(parseLoveLanguageQuestions({ questions: clone(LOVE_LANGUAGE_QUESTIONS) })?.length, 30);
  assert.equal(parseWheelCategories({ categories: clone(WHEEL_CATEGORIES) })?.length, 8);
});

test("admin parsers reject changes that could corrupt formulas", () => {
  const vakad = clone(VAKAD_QUESTIONS);
  vakad[0].options[1].dimension = vakad[0].options[0].dimension;
  assert.equal(parseVakadQuestions({ questions: vakad }), null);

  const love = clone(LOVE_LANGUAGE_QUESTIONS);
  love[0].options[1].code = love[0].options[0].code;
  assert.equal(parseLoveLanguageQuestions({ questions: love }), null);

  const wheel = clone(WHEEL_CATEGORIES);
  wheel[0].questions.pop();
  assert.equal(parseWheelCategories({ categories: wheel }), null);
});

test("admin exposes three independent editors and save actions", () => {
  const page = readFileSync(new URL("../next-app/app/admin/quiz/page.tsx", import.meta.url), "utf8");
  const actions = readFileSync(new URL("../next-app/app/admin/quiz/actions.ts", import.meta.url), "utf8");
  for (const editor of ["VakadEditor", "LoveLanguageEditor", "LifeWheelEditor"]) assert.match(page, new RegExp(editor));
  for (const action of ["saveVakadQuestionsAction", "saveLoveLanguageQuestionsAction", "saveLifeWheelQuestionsAction"]) assert.match(actions, new RegExp(action));
});
