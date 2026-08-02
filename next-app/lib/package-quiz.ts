import type { PublicPackage } from "@/lib/packages";

export type QuizProfile = "year" | "core" | "deep" | "combo";

export type QuizOption = {
  id: string;
  label: string;
  description: string;
  weights: Record<QuizProfile, number>;
};

export type QuizQuestion = {
  id: string;
  eyebrow: string;
  question: string;
  hint: string;
  options: QuizOption[];
};

export type PackageRecommendation = {
  item: PublicPackage;
  score: number;
  profile: QuizProfile;
  reason: string;
};

const weights = (
  year = 0,
  core = 0,
  deep = 0,
  combo = 0,
): Record<QuizProfile, number> => ({ year, core, deep, combo });

export const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: "priority",
    eyebrow: "Nhu cầu hiện tại",
    question: "Điều bạn muốn được tháo gỡ nhất lúc này là gì?",
    hint: "Chọn điều gần nhất với tình trạng thật của bạn, không cần suy nghĩ quá lâu.",
    options: [
      {
        id: "next-year",
        label: "Biết hướng đi trong 6–12 tháng tới",
        description: "Tôi cần nhìn rõ cơ hội, thách thức và thời điểm nên hành động.",
        weights: weights(5, 1, 1, 0),
      },
      {
        id: "understand-self",
        label: "Hiểu tính cách và động lực bên trong",
        description: "Tôi muốn biết điểm mạnh, điểm nghẽn và cách phát triển phù hợp.",
        weights: weights(0, 5, 2, 1),
      },
      {
        id: "heal",
        label: "Gỡ rối cảm xúc hoặc các mối quan hệ",
        description: "Tôi cần nhiều góc nhìn để gọi tên điều đang mắc kẹt.",
        weights: weights(0, 1, 2, 5),
      },
      {
        id: "whole-map",
        label: "Có một bản đồ toàn diện cho hành trình dài",
        description: "Tôi muốn hiểu nhiều khía cạnh cuộc đời trong một lần phân tích.",
        weights: weights(1, 1, 5, 3),
      },
    ],
  },
  {
    id: "depth",
    eyebrow: "Mức độ phân tích",
    question: "Bạn muốn buổi tư vấn đi sâu đến đâu?",
    hint: "Mức độ càng sâu, lượng thông tin và phạm vi phân tích càng rộng.",
    options: [
      {
        id: "focused",
        label: "Gọn và tập trung vào hiện tại",
        description: "Một chủ đề rõ ràng cùng hướng hành động thực tế là đủ với tôi.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "three-core",
        label: "Ba chỉ số cốt lõi để hiểu mình",
        description: "Tôi muốn một bức chân dung vừa đủ, dễ tiếp nhận và ứng dụng.",
        weights: weights(1, 5, 1, 0),
      },
      {
        id: "full-numerology",
        label: "Đầy đủ chỉ số, chu kỳ và đỉnh cao",
        description: "Tôi sẵn sàng đi sâu để có bản đồ nhân số học dùng lâu dài.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "multi-method",
        label: "Kết hợp nhiều phương pháp",
        description: "Tôi muốn đối chiếu nhân số, chiêm tinh và thông điệp trực giác.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "outcome",
    eyebrow: "Kết quả mong muốn",
    question: "Sau buổi xem, điều gì sẽ khiến bạn cảm thấy đáng giá nhất?",
    hint: "Hãy chọn đầu ra bạn thực sự muốn mang về và sử dụng sau buổi tư vấn.",
    options: [
      {
        id: "action-plan",
        label: "Một kế hoạch hành động cho năm hiện tại",
        description: "Tôi muốn biết nên ưu tiên việc gì và tránh điều gì trong giai đoạn này.",
        weights: weights(5, 1, 1, 0),
      },
      {
        id: "self-portrait",
        label: "Bức chân dung rõ ràng về bản thân",
        description: "Tôi cần ngôn ngữ để hiểu và diễn đạt đúng con người mình.",
        weights: weights(0, 5, 2, 1),
      },
      {
        id: "long-report",
        label: "Bản phân tích sâu để xem lại lâu dài",
        description: "Tôi muốn có hệ thống thông tin đầy đủ cho nhiều giai đoạn cuộc sống.",
        weights: weights(0, 1, 5, 2),
      },
      {
        id: "healing-message",
        label: "Thông điệp chữa lành và góc nhìn mới",
        description: "Tôi muốn hiểu vấn đề qua nhiều lớp, không chỉ bằng con số.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "scope",
    eyebrow: "Phạm vi cần hỗ trợ",
    question: "Chủ đề bạn đang quan tâm thuộc nhóm nào?",
    hint: "Nếu có nhiều vấn đề cùng lúc, hãy chọn phương án cuối.",
    options: [
      {
        id: "timing",
        label: "Quyết định, thời điểm và hướng đi sắp tới",
        description: "Công việc, học tập hoặc một lựa chọn quan trọng đang cần câu trả lời.",
        weights: weights(5, 1, 1, 0),
      },
      {
        id: "identity",
        label: "Tính cách, năng lực và sự tự tin",
        description: "Tôi muốn hiểu cách mình vận hành và phát huy thế mạnh tự nhiên.",
        weights: weights(0, 5, 2, 1),
      },
      {
        id: "life-patterns",
        label: "Những bài học lặp lại trong cuộc sống",
        description: "Tôi muốn nhìn xuyên suốt các chu kỳ, thử thách và hướng trưởng thành.",
        weights: weights(1, 1, 5, 2),
      },
      {
        id: "many-areas",
        label: "Nhiều vấn đề đang đan xen với nhau",
        description: "Cảm xúc, mối quan hệ và định hướng đều cần được nhìn lại.",
        weights: weights(0, 1, 3, 5),
      },
    ],
  },
  {
    id: "readiness",
    eyebrow: "Cách bạn muốn bắt đầu",
    question: "Hình thức nào phù hợp với bạn nhất ở thời điểm này?",
    hint: "Không có lựa chọn tốt hơn tuyệt đối — chỉ có lựa chọn phù hợp hơn với hiện tại.",
    options: [
      {
        id: "small-step",
        label: "Bắt đầu bằng một chủ đề thật cụ thể",
        description: "Tôi muốn trải nghiệm trước với phạm vi gọn và dễ ứng dụng.",
        weights: weights(5, 2, 0, 0),
      },
      {
        id: "foundation",
        label: "Hiểu nền tảng trước rồi mới đi sâu",
        description: "Tôi muốn nắm phần cốt lõi của bản thân một cách rõ ràng.",
        weights: weights(1, 5, 1, 0),
      },
      {
        id: "invest-deep",
        label: "Đầu tư một lần cho phân tích toàn diện",
        description: "Tôi sẵn sàng tiếp nhận nhiều thông tin và làm việc sâu với bản thân.",
        weights: weights(0, 1, 5, 2),
      },
      {
        id: "guided-combo",
        label: "Được soi chiếu bằng nhiều công cụ",
        description: "Tôi muốn một trải nghiệm đặc biệt, có nhiều lớp quan sát bổ trợ nhau.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "timing",
    eyebrow: "Thời điểm cần hỗ trợ",
    question: "Bạn muốn câu trả lời tập trung vào khoảng thời gian nào?",
    hint: "Khoảng thời gian mong muốn giúp xác định gói theo năm hay bản đồ có giá trị dài hạn.",
    options: [
      {
        id: "this-year",
        label: "Từ hiện tại đến hết 12 tháng tới",
        description: "Tôi đang có quyết định gần và cần biết nhịp vận hành phù hợp.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "current-foundation",
        label: "Hiểu hiện tại qua tính cách nền tảng",
        description: "Tôi muốn biết vì sao mình phản ứng và lựa chọn như bây giờ.",
        weights: weights(1, 5, 1, 0),
      },
      {
        id: "long-journey",
        label: "Nhiều giai đoạn trong hành trình cuộc đời",
        description: "Tôi muốn thấy các chu kỳ, đỉnh cao và bài học dài hạn.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "right-now-healing",
        label: "Một nút thắt đang cần được soi chiếu ngay",
        description: "Tôi cần nhiều góc nhìn để hiểu rõ cảm xúc và hoàn cảnh hiện tại.",
        weights: weights(1, 0, 2, 5),
      },
    ],
  },
  {
    id: "familiarity",
    eyebrow: "Mức độ quen thuộc",
    question: "Bạn đã từng tìm hiểu nhân số học đến đâu?",
    hint: "Câu này giúp gợi ý lượng thông tin vừa đủ, tránh quá ít hoặc quá tải.",
    options: [
      {
        id: "newcomer",
        label: "Hoàn toàn mới",
        description: "Tôi muốn bắt đầu bằng nội dung dễ hiểu và có thể áp dụng ngay.",
        weights: weights(3, 4, 0, 0),
      },
      {
        id: "know-main-number",
        label: "Biết số chủ đạo nhưng chưa hiểu sâu",
        description: "Tôi muốn kết nối thêm các chỉ số cốt lõi để hiểu mình rõ hơn.",
        weights: weights(1, 5, 2, 0),
      },
      {
        id: "had-reading",
        label: "Đã từng xem và muốn có bản phân tích đầy đủ",
        description: "Tôi cần thông tin hệ thống hơn về chu kỳ, đỉnh cao và thử thách.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "explored-many",
        label: "Đã khám phá nhiều bộ môn huyền học",
        description: "Tôi muốn đối chiếu các hệ thống để có thêm chiều sâu.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "guidance-style",
    eyebrow: "Phong cách tư vấn",
    question: "Bạn muốn được dẫn dắt theo cách nào nhất?",
    hint: "Hãy chọn cách tiếp nhận khiến bạn cảm thấy dễ hiểu và có động lực hành động.",
    options: [
      {
        id: "direct-actions",
        label: "Đi thẳng vào thời điểm và việc cần làm",
        description: "Tôi ưu tiên câu trả lời ngắn gọn, thực tế và có mốc hành động.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "explain-core",
        label: "Giải thích rõ từng động lực cốt lõi",
        description: "Tôi muốn hiểu logic phía sau tính cách và lựa chọn của mình.",
        weights: weights(0, 5, 2, 0),
      },
      {
        id: "structured-roadmap",
        label: "Có cấu trúc và lộ trình tổng thể",
        description: "Tôi muốn các chỉ số được kết nối thành một bản đồ thống nhất.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "reflective-dialogue",
        label: "Đối thoại, soi chiếu và chữa lành",
        description: "Tôi muốn được lắng nghe và nhìn vấn đề qua nhiều lớp năng lượng.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "takeaway",
    eyebrow: "Tài liệu sau buổi xem",
    question: "Bạn cần lưu lại nội dung ở mức nào?",
    hint: "Một số gói tập trung vào buổi tư vấn; gói chuyên sâu phù hợp hơn khi cần bản đồ để xem lại.",
    options: [
      {
        id: "remember-actions",
        label: "Chỉ cần nhớ các bước hành động chính",
        description: "Tôi ưu tiên tính nhanh gọn hơn một bộ hồ sơ dài.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "core-notes",
        label: "Cần phần tóm tắt các chỉ số chính",
        description: "Tôi muốn lưu lại bức chân dung cốt lõi để tự quan sát thêm.",
        weights: weights(1, 5, 1, 0),
      },
      {
        id: "full-map-pdf",
        label: "Muốn có bản đồ hoặc PDF đầy đủ",
        description: "Tôi cần tài liệu hệ thống để xem lại trong nhiều giai đoạn.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "integrated-insights",
        label: "Muốn lưu các thông điệp từ nhiều phương pháp",
        description: "Tôi muốn tổng hợp con số, cảm xúc và góc nhìn bổ trợ trong một trải nghiệm.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "clarity",
    eyebrow: "Độ rõ của vấn đề",
    question: "Hiện tại bạn đã gọi tên được câu hỏi của mình chưa?",
    hint: "Câu hỏi càng rõ thì gói tập trung càng phù hợp; vấn đề mơ hồ thường cần phạm vi rộng hơn.",
    options: [
      {
        id: "clear-decision",
        label: "Rất rõ — tôi đang cần quyết định một việc",
        description: "Tôi chủ yếu cần thêm thông tin về thời điểm và xu hướng sắp tới.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "know-self-question",
        label: "Khá rõ — câu hỏi nằm ở chính bản thân tôi",
        description: "Tôi muốn hiểu điểm mạnh, động lực hoặc cách phản ứng của mình.",
        weights: weights(0, 5, 2, 0),
      },
      {
        id: "repeating-pattern",
        label: "Tôi nhận ra một mô thức lặp lại nhưng chưa hiểu gốc",
        description: "Tôi cần nhìn xuyên qua nhiều giai đoạn để nhận diện bài học.",
        weights: weights(0, 1, 5, 2),
      },
      {
        id: "hard-to-name",
        label: "Khó gọi tên — chỉ biết mình đang mắc kẹt",
        description: "Tôi cần được soi chiếu từ nhiều hướng để tìm đúng câu hỏi.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "life-areas",
    eyebrow: "Số lĩnh vực liên quan",
    question: "Có bao nhiêu khía cạnh cuộc sống đang liên quan đến nhu cầu này?",
    hint: "Hãy tính cả những phần có ảnh hưởng qua lại, chẳng hạn công việc kéo theo cảm xúc hoặc mối quan hệ.",
    options: [
      {
        id: "one-upcoming-area",
        label: "Một quyết định hoặc mục tiêu sắp tới",
        description: "Phạm vi của tôi rõ và chủ yếu liên quan đến thời điểm hành động.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "one-inner-area",
        label: "Một chủ đề về tính cách hoặc năng lực",
        description: "Tôi muốn tập trung vào nền tảng bên trong của chính mình.",
        weights: weights(0, 5, 2, 0),
      },
      {
        id: "several-life-areas",
        label: "Nhiều lĩnh vực xuyên suốt hành trình",
        description: "Công việc, tài chính, tình cảm và các giai đoạn đều có liên quan.",
        weights: weights(0, 1, 5, 2),
      },
      {
        id: "emotional-web",
        label: "Nhiều mối quan hệ và cảm xúc đan xen",
        description: "Tôi cần một góc nhìn linh hoạt để kết nối những phần tưởng như rời rạc.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
  {
    id: "after-session",
    eyebrow: "Cách ứng dụng kết quả",
    question: "Bạn dự định dùng kết quả sau buổi tư vấn như thế nào?",
    hint: "Cách sử dụng kết quả cũng quyết định lượng thông tin phù hợp với bạn.",
    options: [
      {
        id: "act-this-year",
        label: "Dùng để lên kế hoạch cho năm nay",
        description: "Tôi sẽ dựa vào đó để sắp xếp ưu tiên và chọn thời điểm hành động.",
        weights: weights(5, 1, 0, 0),
      },
      {
        id: "practice-awareness",
        label: "Quan sát và điều chỉnh cách mình vận hành",
        description: "Tôi muốn áp dụng những hiểu biết cốt lõi vào đời sống hằng ngày.",
        weights: weights(0, 5, 2, 0),
      },
      {
        id: "reference-long-term",
        label: "Dùng như tài liệu tham chiếu dài hạn",
        description: "Tôi sẽ xem lại khi bước vào các chu kỳ hoặc cột mốc mới.",
        weights: weights(0, 1, 5, 1),
      },
      {
        id: "continue-healing",
        label: "Tiếp tục hành trình soi chiếu và chữa lành",
        description: "Tôi muốn kết nối các thông điệp thành những bước thay đổi sâu hơn.",
        weights: weights(0, 1, 2, 5),
      },
    ],
  },
];

const PROFILE_REASON: Record<QuizProfile, string> = {
  year: "Bạn đang cần một câu trả lời tập trung cho giai đoạn hiện tại, kèm định hướng hành động rõ ràng trong 6–12 tháng tới.",
  core: "Bạn ưu tiên hiểu bản chất, động lực và thế mạnh cốt lõi trước khi mở rộng sang những lớp phân tích sâu hơn.",
  deep: "Bạn sẵn sàng nhìn toàn cảnh các chỉ số, chu kỳ và bài học để có một bản đồ cá nhân dùng lâu dài.",
  combo: "Nhu cầu của bạn trải rộng qua cảm xúc, mối quan hệ và định hướng; nhiều phương pháp bổ trợ sẽ cho góc nhìn đầy đặn hơn.",
};

function normalize(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .toLowerCase();
}

function packageAffinity(item: PublicPackage): Record<QuizProfile, number> {
  const text = normalize([item.code, item.name, ...item.features].join(" "));
  const affinity = weights(0.6, 0.6, item.featured ? 1 : 0.6, item.featured ? 0.8 : 0.4);

  if (/\byear\b|nam ca nhan|du doan nam/.test(text)) affinity.year += 8;
  if (/\bbig\s*3\b|\bbig3\b|3 chi so|ba chi so|tinh cach noi bat/.test(text)) affinity.core += 8;
  if (/\bbig\s*7\b|\bbig7\b|7 chi so|bay chi so|toan dien/.test(text)) affinity.deep += 8;
  if (/\bcombo\s*3\b|\bcombo3\b|3-in-1|3 in 1|dac biet|bai clow|chiem tinh/.test(text)) affinity.combo += 8;

  return affinity;
}

function dominantProfile(value: Record<QuizProfile, number>): QuizProfile {
  return (Object.entries(value) as Array<[QuizProfile, number]>)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || "core";
}

export function recommendPackages(
  packages: PublicPackage[],
  answers: Record<string, string>,
): PackageRecommendation[] {
  const preference = weights();

  QUIZ_QUESTIONS.forEach((question) => {
    const answer = question.options.find((option) => option.id === answers[question.id]);
    if (!answer) return;
    (Object.keys(preference) as QuizProfile[]).forEach((profile) => {
      preference[profile] += answer.weights[profile];
    });
  });

  return packages
    .filter((item) => item.enabled)
    .map((item) => {
      const affinity = packageAffinity(item);
      const profile = dominantProfile(affinity);
      const score = (Object.keys(preference) as QuizProfile[]).reduce(
        (sum, key) => sum + preference[key] * affinity[key],
        item.featured ? 1.5 : 0,
      );
      return { item, score, profile, reason: PROFILE_REASON[profile] };
    })
    .sort((a, b) => b.score - a.score || a.item.sortOrder - b.item.sortOrder);
}
