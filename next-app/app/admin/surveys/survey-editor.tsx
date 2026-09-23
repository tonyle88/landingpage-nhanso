"use client";

import { useEffect, useState } from "react";
import { SURVEY_COPY_FIELDS, type SurveyCopy, type SurveyQuestion } from "@/lib/survey";
import { saveSurveyAction } from "./actions";
import styles from "./surveys.module.css";

export function SurveyEditor({
  survey,
  questions: initialQuestions,
  copy,
}: {
  survey: { id: string; title: string; intro: string; active: boolean };
  questions: SurveyQuestion[];
  copy: SurveyCopy;
}) {
  const [questions, setQuestions] = useState(initialQuestions);
  const [copyStatus, setCopyStatus] = useState<"idle" | "copied" | "error">("idle");
  const publicPath = `/khao-sat/${survey.id}`;
  const [publicUrl, setPublicUrl] = useState(publicPath);

  useEffect(() => setPublicUrl(`${window.location.origin}${publicPath}`), [publicPath]);

  function updateQuestion(id: string, prompt: string) {
    setQuestions((current) => current.map((question) => question.id === id ? { ...question, prompt } : question));
  }

  return (
    <div className={styles.editorWrap}>
      <div className={styles.shareBox}>
        <div><span>LINK GỬI KHÁCH HÀNG</span><code>{publicUrl}</code></div>
        <button type="button" onClick={async () => {
          try {
            await navigator.clipboard.writeText(publicUrl);
            setCopyStatus("copied");
          } catch {
            setCopyStatus("error");
          }
        }}>{copyStatus === "copied" ? "Đã sao chép" : copyStatus === "error" ? "Hãy chọn link để sao chép" : "Sao chép link"}</button>
        <a href={publicPath} target="_blank" rel="noreferrer">Xem trang ↗</a>
      </div>
      <form action={saveSurveyAction} className={styles.editorForm}>
        <input type="hidden" name="id" value={survey.id} />
        <input type="hidden" name="questions" value={JSON.stringify(questions)} />
        <label>Tiêu đề khảo sát
          <input name="title" defaultValue={survey.title} minLength={5} maxLength={160} required />
        </label>
        <label>Lời mở đầu
          <textarea name="intro" defaultValue={survey.intro} minLength={10} maxLength={1200} rows={4} required />
        </label>
        <div className={styles.copyHeading}>
          <h3>Chữ hiển thị trên trang khảo sát</h3>
          <p>Chỉnh cách xưng hô, lời hướng dẫn và trang cảm ơn. Số câu hỏi luôn được tính tự động.</p>
        </div>
        {["Đầu trang", "Trải nghiệm và đánh giá", "Câu hỏi và nút gửi", "Trang cảm ơn"].map((group, index) => (
          <details className={styles.copyGroup} key={group} open={index < 2}>
            <summary>{group}</summary>
            <div className={styles.copyGrid}>
              {SURVEY_COPY_FIELDS.filter((field) => field.group === group).map((field) => (
                <label key={field.key}>{field.label}
                  {field.maxLength > 180 ? (
                    <textarea name={`copy_${field.key}`} defaultValue={copy[field.key]} maxLength={field.maxLength} rows={2} required />
                  ) : (
                    <input name={`copy_${field.key}`} defaultValue={copy[field.key]} maxLength={field.maxLength} required />
                  )}
                </label>
              ))}
            </div>
          </details>
        ))}
        <div className={styles.questionHeading}>
          <div><h3>Câu hỏi khảo sát</h3><p>Thêm tối đa 10 câu. Các câu trả lời cũ vẫn giữ nguyên câu hỏi đã dùng lúc gửi.</p></div>
          <button type="button" disabled={questions.length >= 10} onClick={() => setQuestions((current) => [
            ...current,
            { id: crypto.randomUUID(), prompt: "" },
          ])}>+ Thêm câu hỏi</button>
        </div>
        {questions.map((question, index) => (
          <div className={styles.questionEditor} key={question.id}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <label>Nội dung câu hỏi
              <textarea value={question.prompt} onChange={(event) => updateQuestion(question.id, event.target.value)} minLength={5} maxLength={500} rows={3} required />
            </label>
            <button type="button" disabled={questions.length <= 1} onClick={() => setQuestions((current) => current.filter((item) => item.id !== question.id))}>Xóa</button>
          </div>
        ))}
        <label className={styles.activeToggle}><input type="checkbox" name="active" defaultChecked={survey.active} />Cho phép khách truy cập và gửi khảo sát</label>
        <button className={styles.saveButton} type="submit">Lưu nội dung khảo sát</button>
      </form>
    </div>
  );
}
