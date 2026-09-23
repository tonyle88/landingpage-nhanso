export type SurveyQuestion = { id: string; prompt: string };
export type SurveyAnswer = SurveyQuestion & { answer: string };

export const DEFAULT_SURVEY_TITLE = "Lắng nghe trải nghiệm của bạn";
export const DEFAULT_SURVEY_INTRO = "Sau buổi xem thần số học, em có thể giúp anh trả lời vài câu hỏi để anh cải thiện nội dung và kỹ năng tư vấn không? Biết ơn em nhiều.";
export const DEFAULT_SURVEY_QUESTIONS: SurveyQuestion[] = [
  { id: "goc-nhin", prompt: "Đâu là thông điệp hoặc góc nhìn từ buổi tư vấn mà em cảm thấy giá trị và đúng với bản thân nhất?" },
  { id: "ro-rang", prompt: "Cách mình phân tích các chỉ số đã đủ rõ ràng, dễ hiểu và giúp em vạch ra hướng đi thực tế chưa?" },
  { id: "ky-vong", prompt: "Mức độ chi tiết và thời lượng của buổi tư vấn đã đáp ứng kỳ vọng ban đầu của em như thế nào?" },
];

export function parseSurveyQuestions(value: unknown): SurveyQuestion[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > 10) return null;
  const seen = new Set<string>();
  const questions: SurveyQuestion[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const { id, prompt } = item as Record<string, unknown>;
    if (typeof id !== "string" || !/^[a-zA-Z0-9_-]{1,64}$/.test(id) || seen.has(id)) return null;
    if (typeof prompt !== "string" || prompt.trim().length < 5 || prompt.trim().length > 500) return null;
    seen.add(id);
    questions.push({ id, prompt: prompt.trim() });
  }
  return questions;
}

export function parseSurveyAnswers(
  form: FormData,
  questions: SurveyQuestion[],
): SurveyAnswer[] | null {
  const answers: SurveyAnswer[] = [];
  for (const question of questions) {
    const raw = form.get(`answer_${question.id}`);
    if (typeof raw !== "string") return null;
    const answer = raw.trim();
    if (!answer || answer.length > 2000) return null;
    answers.push({ ...question, answer });
  }
  return answers;
}
