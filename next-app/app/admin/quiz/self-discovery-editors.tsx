"use client";

import { useMemo, useState } from "react";
import type {
  LoveLanguageQuestion,
  VakadQuestion,
  WheelCategory,
} from "@/lib/self-discovery-tools";
import styles from "../admin.module.css";

type SaveAction = (form: FormData) => void | Promise<void>;
type EditableVakadQuestion = { id: string; question: string; options: Array<{ dimension: VakadQuestion["options"][number]["dimension"]; text: string }> };
type EditableLoveQuestion = { id: string; options: Array<{ code: LoveLanguageQuestion["options"][number]["code"]; text: string }> };
type EditableWheelCategory = Omit<WheelCategory, "questions"> & { questions: string[] };

function ToolSection({
  accent,
  children,
  description,
  href,
  number,
  title,
}: {
  accent: string;
  children: React.ReactNode;
  description: string;
  href: string;
  number: string;
  title: string;
}) {
  return (
    <section className={styles.toolEditorSection} id={`tool-${number}`} style={{ "--editor-accent": accent } as React.CSSProperties}>
      <header className={styles.toolEditorHeader}>
        <span>{number}</span>
        <div><h2>{title}</h2><p>{description}</p></div>
        <a href={href} rel="noreferrer" target="_blank">Xem công cụ ↗</a>
      </header>
      {children}
    </section>
  );
}

export function VakadEditor({ action, questions }: { action: SaveAction; questions: ReadonlyArray<VakadQuestion> }) {
  const [items, setItems] = useState<EditableVakadQuestion[]>(() => questions.map((question) => ({
    id: question.id,
    question: question.question,
    options: question.options.map((option) => ({ ...option })),
  })));
  const serialized = useMemo(() => JSON.stringify({ questions: items }), [items]);

  return (
    <ToolSection accent="#69dcd2" description="Sửa nội dung 15 câu và bốn lựa chọn. Mã V/A/K/Ad được khóa để giữ đúng công thức xếp hạng 4–3–2–1." href="/quiz/cong-cu/vakad" number="01" title="Bản đồ VAKAd">
      <form action={action} className={styles.quizEditor}>
        <input name="vakadQuestions" type="hidden" value={serialized} />
        <div className={styles.quizQuestionList}>
          {items.map((question, questionIndex) => (
            <details className={styles.quizQuestionCard} key={question.id} open={questionIndex === 0}>
              <summary><span className={styles.quizQuestionOrb}>{String(questionIndex + 1).padStart(2, "0")}</span><span><strong>{question.question}</strong><small>4 lựa chọn · mã chấm điểm được khóa</small></span></summary>
              <div className={styles.quizQuestionBody}>
                <div className={styles.quizQuestionFields}><label className={styles.quizWideField}>Câu hỏi<textarea rows={2} value={question.question} onChange={(event) => setItems((current) => current.map((item, index) => index === questionIndex ? { ...item, question: event.target.value } : item))} /></label></div>
                <div className={styles.lockedOptionGrid}>
                  {question.options.map((option, optionIndex) => <label key={option.dimension}><span className={styles.lockedCode}>{option.dimension}</span><textarea rows={3} value={option.text} onChange={(event) => setItems((current) => current.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((entry, entryIndex) => entryIndex === optionIndex ? { ...entry, text: event.target.value } : entry) } : item))} /></label>)}
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className={styles.quizSaveBar}><span>Lưu riêng phần VAKAd; mã chấm điểm không thay đổi.</span><button type="submit">Lưu câu hỏi VAKAd</button></div>
      </form>
    </ToolSection>
  );
}

export function LoveLanguageEditor({ action, questions }: { action: SaveAction; questions: ReadonlyArray<LoveLanguageQuestion> }) {
  const [items, setItems] = useState<EditableLoveQuestion[]>(() => questions.map((question) => ({ id: question.id, options: question.options.map((option) => ({ ...option })) })));
  const serialized = useMemo(() => JSON.stringify({ questions: items }), [items]);

  return (
    <ToolSection accent="#f08ab8" description="Sửa 30 cặp tình huống. Mã A–E được khóa để mỗi lựa chọn vẫn cộng đúng Ngôn ngữ yêu thương." href="/quiz/cong-cu/ngon-ngu-yeu-thuong" number="02" title="Ngôn ngữ yêu thương">
      <form action={action} className={styles.quizEditor}>
        <input name="loveQuestions" type="hidden" value={serialized} />
        <div className={styles.quizQuestionList}>
          {items.map((question, questionIndex) => (
            <details className={styles.quizQuestionCard} key={question.id} open={questionIndex === 0}>
              <summary><span className={styles.quizQuestionOrb}>{String(questionIndex + 1).padStart(2, "0")}</span><span><strong>{question.options[0].text}</strong><small>Hoặc · {question.options[1].text}</small></span></summary>
              <div className={styles.quizQuestionBody}>
                <div className={styles.lockedOptionGrid}>
                  {question.options.map((option, optionIndex) => <label key={`${question.id}-${option.code}`}><span className={styles.lockedCode}>{option.code}</span><textarea rows={4} value={option.text} onChange={(event) => setItems((current) => current.map((item, index) => index === questionIndex ? { ...item, options: item.options.map((entry, entryIndex) => entryIndex === optionIndex ? { ...entry, text: event.target.value } : entry) } : item))} /></label>)}
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className={styles.quizSaveBar}><span>Lưu riêng phần Ngôn ngữ yêu thương; mã A–E không thay đổi.</span><button type="submit">Lưu câu hỏi Ngôn ngữ yêu thương</button></div>
      </form>
    </ToolSection>
  );
}

export function LifeWheelEditor({ action, categories }: { action: SaveAction; categories: ReadonlyArray<WheelCategory> }) {
  const [items, setItems] = useState<EditableWheelCategory[]>(() => categories.map((category) => ({ ...category, questions: [...category.questions] })));
  const serialized = useMemo(() => JSON.stringify({ categories: items }), [items]);

  return (
    <ToolSection accent="#f0c96a" description="Sửa tên tám vùng và nội dung 27 câu. Số vùng, số câu và thang điểm 1–10 được giữ cố định để biểu đồ luôn chính xác." href="/quiz/cong-cu/banh-xe-cuoc-doi" number="03" title="Bánh xe cuộc đời">
      <form action={action} className={styles.quizEditor}>
        <input name="wheelCategories" type="hidden" value={serialized} />
        <div className={styles.quizQuestionList}>
          {items.map((category, categoryIndex) => (
            <details className={styles.quizQuestionCard} key={category.id} open={categoryIndex === 0}>
              <summary><span className={styles.quizQuestionOrb} style={{ background: category.color }}>{String(categoryIndex + 1).padStart(2, "0")}</span><span><strong>{category.label}</strong><small>{category.questions.length} câu · thang điểm 1–10</small></span></summary>
              <div className={styles.quizQuestionBody}>
                <div className={styles.quizQuestionFields}><label className={styles.quizWideField}>Tên vùng<input value={category.label} onChange={(event) => setItems((current) => current.map((item, index) => index === categoryIndex ? { ...item, label: event.target.value } : item))} /></label></div>
                <div className={styles.wheelAdminQuestions}>
                  {category.questions.map((question, questionIndex) => <label key={`${category.id}-${questionIndex}`}><span>{String(questionIndex + 1).padStart(2, "0")}</span><textarea rows={3} value={question} onChange={(event) => setItems((current) => current.map((item, index) => index === categoryIndex ? { ...item, questions: item.questions.map((entry, entryIndex) => entryIndex === questionIndex ? event.target.value : entry) } : item))} /></label>)}
                </div>
              </div>
            </details>
          ))}
        </div>
        <div className={styles.quizSaveBar}><span>Lưu riêng phần Bánh xe cuộc đời; cấu trúc biểu đồ được bảo vệ.</span><button type="submit">Lưu câu hỏi Bánh xe</button></div>
      </form>
    </ToolSection>
  );
}
