import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const { parseSurveyQuestions, parseSurveyAnswers, parseSurveyCopy, surveyCopyWithDefaults, DEFAULT_SURVEY_COPY, DEFAULT_SURVEY_QUESTIONS } = await import(
  new URL("next-app/lib/survey.ts", root)
);

test("survey accepts edited questions and keeps stable answer snapshots", () => {
  const questions = parseSurveyQuestions([
    { id: "first", prompt: "Điều gì có ích nhất với em?" },
    { id: "second", prompt: "Em muốn thay đổi điều gì?" },
  ]);
  assert.ok(questions);
  const form = new FormData();
  form.set("answer_first", "  Hiểu rõ thế mạnh của mình  ");
  form.set("answer_second", "Có thêm ví dụ thực tế");
  assert.deepEqual(parseSurveyAnswers(form, questions), [
    { id: "first", prompt: "Điều gì có ích nhất với em?", answer: "Hiểu rõ thế mạnh của mình" },
    { id: "second", prompt: "Em muốn thay đổi điều gì?", answer: "Có thêm ví dụ thực tế" },
  ]);
});

test("survey rejects duplicate ids, empty answers, excess questions and oversized responses", () => {
  assert.equal(parseSurveyQuestions([{ id: "same", prompt: "Câu hỏi hợp lệ?" }, { id: "same", prompt: "Câu hỏi khác?" }]), null);
  assert.equal(parseSurveyQuestions(Array.from({ length: 11 }, (_, index) => ({ id: `q${index}`, prompt: "Câu hỏi hợp lệ?" }))), null);
  assert.equal(parseSurveyQuestions([{ id: "bad/path", prompt: "Câu hỏi hợp lệ?" }]), null);
  const form = new FormData();
  form.set("answer_goc-nhin", " ");
  assert.equal(parseSurveyAnswers(form, DEFAULT_SURVEY_QUESTIONS), null);
  form.set("answer_goc-nhin", "x".repeat(2001));
  assert.equal(parseSurveyAnswers(form, DEFAULT_SURVEY_QUESTIONS), null);
});

test("survey display text is editable while missing legacy values keep defaults", () => {
  const copy = { ...DEFAULT_SURVEY_COPY, experienceTitle: "Trải nghiệm của bạn", ratingLabel: "Bạn hài lòng với buổi tư vấn ở mức nào?" };
  assert.deepEqual(parseSurveyCopy(copy), copy);
  assert.equal(surveyCopyWithDefaults({ experienceTitle: "Trải nghiệm của bạn" }).ratingLabel, DEFAULT_SURVEY_COPY.ratingLabel);
  assert.equal(parseSurveyCopy({ ...copy, ratingLabel: " " }), null);
  assert.equal(parseSurveyCopy({ ...copy, ratingLabel: "x".repeat(161) }), null);
});

test("unlisted survey links are resolved on the server and responses stay private", async () => {
  const sql = await readFile(new URL("next-app/supabase/migrations/202609230001_service_surveys.sql", root), "utf8");
  assert.match(sql, /revoke all on public\.service_surveys, public\.service_survey_responses, public\.service_survey_rate_limits from public, anon, authenticated/);
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all)(?: \([^)]*\))? on public\.service_surveys to anon/);
  assert.doesNotMatch(sql, /grant (?:select|insert|update|delete|all) on public\.service_survey_responses to anon/);
  assert.match(sql, /service_survey_responses_content_manager_read/);
  assert.match(sql, /rating between 1 and 5/);
  assert.match(sql, /consume_service_survey_rate_limit/);
  assert.match(sql, /return v_count <= 5/);
  const page = await readFile(new URL("next-app/app/khao-sat/[id]/page.tsx", root), "utf8");
  assert.match(page, /createServiceServerClient/);
  assert.match(page, /\.eq\("active", true\)/);
});
