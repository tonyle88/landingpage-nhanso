export type SurveyQuestion = { id: string; prompt: string };
export type SurveyAnswer = SurveyQuestion & { answer: string };

export const DEFAULT_SURVEY_TITLE = "Lắng nghe trải nghiệm của bạn";
export const DEFAULT_SURVEY_INTRO = "Sau buổi xem thần số học, em có thể giúp anh trả lời vài câu hỏi để anh cải thiện nội dung và kỹ năng tư vấn không? Biết ơn em nhiều.";
export const DEFAULT_SURVEY_COPY = {
  headerCaption: "Lắng nghe để tốt hơn",
  eyebrow: "PHẢN HỒI SAU BUỔI TƯ VẤN",
  questionCountUnit: "câu hỏi",
  durationText: "Khoảng 3 phút",
  experienceTitle: "Trải nghiệm của em",
  experienceDescription: "Mỗi chia sẻ đều giúp anh hoàn thiện buổi tư vấn tiếp theo.",
  nameLabel: "Tên của em",
  namePlaceholder: "Em muốn được gọi là…",
  ratingLabel: "Em đánh giá tổng thể buổi tư vấn bao nhiêu sao?",
  ratingHint: "1 sao = cần cải thiện nhiều · 5 sao = rất hài lòng",
  starUnit: "sao",
  sharingTitle: "Điều em muốn chia sẻ",
  sharingDescription: "Cứ viết thật lòng, không có câu trả lời đúng hay sai.",
  answerPlaceholder: "Em chia sẻ suy nghĩ của mình ở đây…",
  privacyNote: "Phản hồi của em chỉ được dùng để cải thiện chất lượng tư vấn và được lưu trong hệ thống quản trị.",
  submitLabel: "Gửi đánh giá",
  bottomNote: "Clow Cat Patronus · Đồng hành cùng hành trình hiểu mình",
  thanksEyebrow: "ĐÃ GỬI ĐÁNH GIÁ",
  thanksTitle: "Biết ơn em đã chia sẻ.",
  thanksDescription: "Những điều em viết là món quà quý giá để anh tiếp tục hoàn thiện nội dung và cách đồng hành cùng mỗi người trên hành trình hiểu mình.",
  thanksBackLabel: "Trở về trang chủ",
};
export type SurveyCopy = { [K in keyof typeof DEFAULT_SURVEY_COPY]: string };

export const SURVEY_COPY_FIELDS = [
  { key: "headerCaption", label: "Dòng bên cạnh logo", group: "Đầu trang", maxLength: 100 },
  { key: "eyebrow", label: "Dòng trên tiêu đề khảo sát", group: "Đầu trang", maxLength: 100 },
  { key: "questionCountUnit", label: "Chữ sau số câu hỏi", group: "Đầu trang", maxLength: 60 },
  { key: "durationText", label: "Thời gian dự kiến", group: "Đầu trang", maxLength: 80 },
  { key: "experienceTitle", label: "Tiêu đề mục 01", group: "Trải nghiệm và đánh giá", maxLength: 120 },
  { key: "experienceDescription", label: "Mô tả mục 01", group: "Trải nghiệm và đánh giá", maxLength: 240 },
  { key: "nameLabel", label: "Nhãn ô tên", group: "Trải nghiệm và đánh giá", maxLength: 100 },
  { key: "namePlaceholder", label: "Gợi ý trong ô tên", group: "Trải nghiệm và đánh giá", maxLength: 120 },
  { key: "ratingLabel", label: "Câu hỏi đánh giá sao", group: "Trải nghiệm và đánh giá", maxLength: 160 },
  { key: "ratingHint", label: "Giải thích thang sao", group: "Trải nghiệm và đánh giá", maxLength: 180 },
  { key: "starUnit", label: "Chữ sau mỗi mức đánh giá (1 sao, 2 sao…)", group: "Trải nghiệm và đánh giá", maxLength: 30 },
  { key: "sharingTitle", label: "Tiêu đề mục 02", group: "Câu hỏi và nút gửi", maxLength: 120 },
  { key: "sharingDescription", label: "Mô tả mục 02", group: "Câu hỏi và nút gửi", maxLength: 240 },
  { key: "answerPlaceholder", label: "Gợi ý trong ô trả lời", group: "Câu hỏi và nút gửi", maxLength: 160 },
  { key: "privacyNote", label: "Ghi chú dưới câu hỏi", group: "Câu hỏi và nút gửi", maxLength: 300 },
  { key: "submitLabel", label: "Chữ trên nút gửi", group: "Câu hỏi và nút gửi", maxLength: 120 },
  { key: "bottomNote", label: "Dòng cuối trang", group: "Câu hỏi và nút gửi", maxLength: 160 },
  { key: "thanksEyebrow", label: "Dòng trên tiêu đề cảm ơn", group: "Trang cảm ơn", maxLength: 100 },
  { key: "thanksTitle", label: "Tiêu đề cảm ơn", group: "Trang cảm ơn", maxLength: 160 },
  { key: "thanksDescription", label: "Lời cảm ơn", group: "Trang cảm ơn", maxLength: 400 },
  { key: "thanksBackLabel", label: "Chữ trên nút về trang chủ", group: "Trang cảm ơn", maxLength: 100 },
] as const;

export function parseSurveyCopy(value: unknown): SurveyCopy | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = value as Record<string, unknown>;
  const copy = {} as SurveyCopy;
  for (const field of SURVEY_COPY_FIELDS) {
    const raw = source[field.key];
    if (typeof raw !== "string") return null;
    const text = raw.trim();
    if (!text || text.length > field.maxLength) return null;
    copy[field.key] = text;
  }
  return copy;
}

export function surveyCopyWithDefaults(value: unknown): SurveyCopy {
  if (!value || typeof value !== "object" || Array.isArray(value)) return { ...DEFAULT_SURVEY_COPY };
  const source = value as Record<string, unknown>;
  const copy = { ...DEFAULT_SURVEY_COPY } as SurveyCopy;
  for (const field of SURVEY_COPY_FIELDS) {
    const raw = source[field.key];
    if (typeof raw === "string" && raw.trim() && raw.trim().length <= field.maxLength) copy[field.key] = raw.trim();
  }
  return copy;
}
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
