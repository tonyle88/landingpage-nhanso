"use client";

import { useMemo, useState } from "react";
import type { QuizOption, QuizProfile, QuizQuestion } from "@/lib/package-quiz";
import { QUIZ_MAX_QUESTIONS, QUIZ_MIN_QUESTIONS } from "@/lib/quiz-question-schema";
import styles from "../admin.module.css";

const profileLabels: Record<QuizProfile, string> = {
  year: "Dự đoán năm cá nhân",
  core: "Phân tích chỉ số cốt lõi",
  deep: "Phân tích toàn diện",
  combo: "Tư vấn kết hợp chuyên sâu",
};

const palette = [
  "#f4c75b", "#ff914d", "#75bfff", "#ee6bb6", "#65d9d0", "#c58aff",
  "#dbe95c", "#73db78", "#ff786d", "#5fd8f2", "#8f91ff", "#ff9fbd",
];

type EditableOption = QuizOption & { profile: QuizProfile };
type EditableQuestion = Omit<QuizQuestion, "options"> & {
  color: string;
  options: EditableOption[];
};

function strongestProfile(weights: QuizOption["weights"]): QuizProfile {
  return (Object.entries(weights) as Array<[QuizProfile, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "core";
}

function weightsFor(profile: QuizProfile): QuizOption["weights"] {
  return {
    year: profile === "year" ? 5 : 0,
    core: profile === "core" ? 5 : 0,
    deep: profile === "deep" ? 5 : 0,
    combo: profile === "combo" ? 5 : 0,
  };
}

function editableQuestions(questions: QuizQuestion[]): EditableQuestion[] {
  return questions.map((question, index) => ({
    ...question,
    color: question.color || palette[index % palette.length],
    options: question.options.map((option) => ({
      ...option,
      profile: strongestProfile(option.weights),
    })),
  }));
}

function newId(prefix: string) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

export function QuizEditor({
  action,
  questions,
}: {
  action: (form: FormData) => void | Promise<void>;
  questions: QuizQuestion[];
}) {
  const [items, setItems] = useState(() => editableQuestions(questions));
  const serialized = useMemo(() => JSON.stringify({ questions: items }), [items]);

  function updateQuestion(index: number, patch: Partial<EditableQuestion>) {
    setItems((current) => current.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  }

  function updateOption(questionIndex: number, optionIndex: number, patch: Partial<EditableOption>) {
    setItems((current) => current.map((question, currentQuestionIndex) => {
      if (currentQuestionIndex !== questionIndex) return question;
      return {
        ...question,
        options: question.options.map((option, currentOptionIndex) => (
          currentOptionIndex === optionIndex ? { ...option, ...patch } : option
        )),
      };
    }));
  }

  function addQuestion() {
    if (items.length >= QUIZ_MAX_QUESTIONS) return;
    const index = items.length;
    setItems((current) => [...current, {
      id: newId("question"),
      eyebrow: "Chủ đề mới",
      question: "Nhập câu hỏi cụ thể dành cho khách hàng",
      hint: "Thêm một gợi ý ngắn giúp khách chọn theo đúng tình huống thực tế.",
      color: palette[index % palette.length],
      options: [
        { id: newId("answer"), label: "Phương án thứ nhất", description: "Mô tả tình huống cụ thể của phương án này.", profile: "core", weights: weightsFor("core") },
        { id: newId("answer"), label: "Phương án thứ hai", description: "Mô tả tình huống cụ thể của phương án này.", profile: "deep", weights: weightsFor("deep") },
      ],
    }]);
  }

  function removeQuestion(index: number) {
    if (items.length <= QUIZ_MIN_QUESTIONS) return;
    setItems((current) => current.filter((_, itemIndex) => itemIndex !== index));
  }

  function moveQuestion(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    setItems((current) => {
      const next = [...current];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  }

  function addOption(questionIndex: number) {
    const question = items[questionIndex];
    if (!question || question.options.length >= 6) return;
    updateQuestion(questionIndex, {
      options: [...question.options, {
        id: newId("answer"),
        label: "Phương án mới",
        description: "Mô tả tình huống giúp khách hiểu rõ lựa chọn này.",
        profile: "core",
        weights: weightsFor("core"),
      }],
    });
  }

  function removeOption(questionIndex: number, optionIndex: number) {
    const question = items[questionIndex];
    if (!question || question.options.length <= 2) return;
    updateQuestion(questionIndex, {
      options: question.options.filter((_, index) => index !== optionIndex),
    });
  }

  return (
    <form action={action} className={styles.quizEditor}>
      <input name="questions" type="hidden" value={serialized} />
      <div className={styles.quizEditorToolbar}>
        <div>
          <strong>{items.length} câu hỏi</strong>
          <span>Nên duy trì 10–15 câu để kết quả đủ chính xác.</span>
        </div>
        <button disabled={items.length >= QUIZ_MAX_QUESTIONS} onClick={addQuestion} type="button">
          + Thêm câu hỏi
        </button>
      </div>

      <div className={styles.quizQuestionList}>
        {items.map((question, questionIndex) => (
          <details className={styles.quizQuestionCard} key={question.id} open={questionIndex === 0}>
            <summary>
              <span className={styles.quizQuestionOrb} style={{ background: question.color }}>
                {String(questionIndex + 1).padStart(2, "0")}
              </span>
              <span><strong>{question.question}</strong><small>{question.eyebrow} · {question.options.length} lựa chọn</small></span>
            </summary>
            <div className={styles.quizQuestionBody}>
              <div className={styles.quizQuestionActions}>
                <button disabled={questionIndex === 0} onClick={() => moveQuestion(questionIndex, -1)} type="button">↑ Đưa lên</button>
                <button disabled={questionIndex === items.length - 1} onClick={() => moveQuestion(questionIndex, 1)} type="button">↓ Đưa xuống</button>
                <button className={styles.quizRemoveButton} disabled={items.length <= QUIZ_MIN_QUESTIONS} onClick={() => removeQuestion(questionIndex)} type="button">Xoá câu</button>
              </div>
              <div className={styles.quizQuestionFields}>
                <label>Chủ đề ngắn<input onChange={(event) => updateQuestion(questionIndex, { eyebrow: event.target.value })} value={question.eyebrow} /></label>
                <label>Màu năng lượng<input aria-label={`Màu câu ${questionIndex + 1}`} onChange={(event) => updateQuestion(questionIndex, { color: event.target.value })} type="color" value={question.color} /></label>
                <label className={styles.quizWideField}>Câu hỏi<textarea onChange={(event) => updateQuestion(questionIndex, { question: event.target.value })} rows={2} value={question.question} /></label>
                <label className={styles.quizWideField}>Gợi ý cho khách<textarea onChange={(event) => updateQuestion(questionIndex, { hint: event.target.value })} rows={2} value={question.hint} /></label>
              </div>

              <div className={styles.quizOptionList}>
                {question.options.map((option, optionIndex) => (
                  <article className={styles.quizOptionEditor} key={option.id}>
                    <span>{String(optionIndex + 1).padStart(2, "0")}</span>
                    <label>Tiêu đề đáp án<input onChange={(event) => updateOption(questionIndex, optionIndex, { label: event.target.value })} value={option.label} /></label>
                    <label>Mô tả tình huống<textarea onChange={(event) => updateOption(questionIndex, optionIndex, { description: event.target.value })} rows={2} value={option.description} /></label>
                    <label>Gợi ý nhóm dịch vụ
                      <select
                        onChange={(event) => {
                          const profile = event.target.value as QuizProfile;
                          updateOption(questionIndex, optionIndex, { profile, weights: weightsFor(profile) });
                        }}
                        value={option.profile}
                      >
                        {(Object.entries(profileLabels) as Array<[QuizProfile, string]>).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                    </label>
                    <button disabled={question.options.length <= 2} onClick={() => removeOption(questionIndex, optionIndex)} type="button">Xoá đáp án</button>
                  </article>
                ))}
              </div>
              <button className={styles.quizAddOption} disabled={question.options.length >= 6} onClick={() => addOption(questionIndex)} type="button">+ Thêm đáp án</button>
            </div>
          </details>
        ))}
      </div>

      <div className={styles.quizSaveBar}>
        <span>Mọi thay đổi chỉ xuất hiện trên Quiz sau khi bạn bấm lưu.</span>
        <button type="submit">Lưu toàn bộ Quiz</button>
      </div>
    </form>
  );
}
