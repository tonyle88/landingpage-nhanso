import type { QuizOption, QuizProfile, QuizQuestion } from "@/lib/package-quiz";

export const QUIZ_SETTING_KEY = "quiz.questions";
export const QUIZ_MIN_QUESTIONS = 10;
export const QUIZ_MAX_QUESTIONS = 15;

const profiles: QuizProfile[] = ["year", "core", "deep", "combo"];

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

function parseWeights(value: unknown): QuizOption["weights"] | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  const parsed = {} as QuizOption["weights"];
  for (const profile of profiles) {
    const score = Number(record[profile]);
    if (!Number.isFinite(score) || score < 0 || score > 10) return null;
    parsed[profile] = score;
  }
  return parsed;
}

export function parseQuizQuestions(value: unknown): QuizQuestion[] | null {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const source = Array.isArray(value) ? value : record?.questions;
  if (!Array.isArray(source) || source.length < QUIZ_MIN_QUESTIONS || source.length > QUIZ_MAX_QUESTIONS) {
    return null;
  }

  const questionIds = new Set<string>();
  const questions: QuizQuestion[] = [];
  for (const entry of source) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const id = cleanText(item.id, 60).toLowerCase();
    const eyebrow = cleanText(item.eyebrow, 100);
    const question = cleanText(item.question, 260);
    const hint = cleanText(item.hint, 420);
    const color = cleanText(item.color, 9);
    if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(id) || questionIds.has(id) || !eyebrow || !question || !hint) {
      return null;
    }
    if (color && !/^#[0-9a-f]{6}$/i.test(color)) return null;
    if (!Array.isArray(item.options) || item.options.length < 2 || item.options.length > 6) return null;

    const optionIds = new Set<string>();
    const options: QuizOption[] = [];
    for (const optionEntry of item.options) {
      if (!optionEntry || typeof optionEntry !== "object" || Array.isArray(optionEntry)) return null;
      const option = optionEntry as Record<string, unknown>;
      const optionId = cleanText(option.id, 60).toLowerCase();
      const label = cleanText(option.label, 220);
      const description = cleanText(option.description, 420);
      const weights = parseWeights(option.weights);
      if (!/^[a-z0-9][a-z0-9-]{1,59}$/.test(optionId) || optionIds.has(optionId) || !label || !description || !weights) {
        return null;
      }
      optionIds.add(optionId);
      options.push({ id: optionId, label, description, weights });
    }

    questionIds.add(id);
    questions.push({ id, eyebrow, question, hint, options, ...(color ? { color } : {}) });
  }
  return questions;
}
