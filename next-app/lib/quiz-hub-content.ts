export const QUIZ_HUB_SETTING_KEY = "quiz.hub_content";

export type QuizHubContent = {
  kicker: string;
  titleBeforeAccent: string;
  titleAccent: string;
  intro: string;
  sectionKicker: string;
  sectionTitle: string;
  sectionDescription: string;
};

export const QUIZ_HUB_CONTENT: QuizHubContent = {
  kicker: "4 công cụ tự khám phá · miễn phí",
  titleBeforeAccent: "Chọn một cánh cửa để",
  titleAccent: "hiểu mình rõ hơn",
  intro: "Mỗi công cụ soi chiếu một khía cạnh khác nhau: nhu cầu tư vấn, cách tiếp nhận thông tin, cách cảm nhận tình yêu và mức cân bằng trong tám vùng cuộc sống. Chọn đúng khối bên dưới để bắt đầu bài riêng của bạn.",
  sectionKicker: "Kho công cụ hiểu mình",
  sectionTitle: "Bốn bài trắc nghiệm, bốn lớp thông tin riêng biệt",
  sectionDescription: "Mỗi khối mở một trang độc lập, có hướng dẫn, câu hỏi, biểu đồ và luận giải ngay trên trình duyệt. Không yêu cầu tên, email hoặc ngày sinh.",
};

function cleanText(value: unknown, maxLength: number) {
  if (typeof value !== "string") return "";
  return value.replace(/\s+/g, " ").trim().slice(0, maxLength);
}

export function parseQuizHubContent(value: unknown): QuizHubContent | null {
  const record = value && typeof value === "object" && !Array.isArray(value)
    ? value as Record<string, unknown>
    : null;
  const source = record?.content && typeof record.content === "object" && !Array.isArray(record.content)
    ? record.content as Record<string, unknown>
    : record;
  if (!source) return null;

  const parsed: QuizHubContent = {
    kicker: cleanText(source.kicker, 100),
    titleBeforeAccent: cleanText(source.titleBeforeAccent, 120),
    titleAccent: cleanText(source.titleAccent, 100),
    intro: cleanText(source.intro, 700),
    sectionKicker: cleanText(source.sectionKicker, 100),
    sectionTitle: cleanText(source.sectionTitle, 180),
    sectionDescription: cleanText(source.sectionDescription, 500),
  };

  return Object.values(parsed).every(Boolean) ? parsed : null;
}
