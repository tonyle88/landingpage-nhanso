export type SelfDiscoveryToolSlug = "vakad" | "ngon-ngu-yeu-thuong" | "banh-xe-cuoc-doi";
export type VakadDimension = "V" | "A" | "K" | "Ad";
export type LoveLanguageCode = "A" | "B" | "C" | "D" | "E";
export type VakadQuestion = {
  id: string;
  question: string;
  options: ReadonlyArray<{ dimension: VakadDimension; text: string }>;
};
export type LoveLanguageQuestion = {
  id: string;
  options: ReadonlyArray<{ code: LoveLanguageCode; text: string }>;
};
export type WheelCategory = {
  id: string;
  shortLabel: string;
  label: string;
  color: string;
  action: string;
  questions: ReadonlyArray<string>;
};

export const VAKAD_SETTING_KEY = "quiz.tools.vakad";
export const LOVE_LANGUAGE_SETTING_KEY = "quiz.tools.love_languages";
export const LIFE_WHEEL_SETTING_KEY = "quiz.tools.life_wheel";

export const SELF_DISCOVERY_TOOLS = [
  {
    slug: "vakad",
    number: "01",
    title: "Bản đồ VAKAd",
    subtitle: "Nhận diện kênh tiếp nhận và xử lý thông tin nổi trội",
    meta: "15 câu · xếp hạng 4–3–2–1",
    accent: "#69dcd2",
  },
  {
    slug: "ngon-ngu-yeu-thuong",
    number: "02",
    title: "Ngôn ngữ yêu thương",
    subtitle: "Hiểu cách bạn cảm nhận và trao đi sự quan tâm",
    meta: "30 cặp lựa chọn",
    accent: "#f08ab8",
  },
  {
    slug: "banh-xe-cuoc-doi",
    number: "03",
    title: "Bánh xe cuộc đời",
    subtitle: "Nhìn mức độ cân bằng của tám vùng quan trọng",
    meta: "27 câu · thang điểm 1–10",
    accent: "#f0c96a",
  },
] as const satisfies ReadonlyArray<{
  slug: SelfDiscoveryToolSlug;
  number: string;
  title: string;
  subtitle: string;
  meta: string;
  accent: string;
}>;

export const VAKAD_DIMENSIONS: Record<VakadDimension, {
  shortLabel: string;
  label: string;
  description: string;
  suggestion: string;
  color: string;
}> = {
  V: {
    shortLabel: "Thị giác",
    label: "V · Thị giác",
    description: "Bạn thường nắm bắt tốt qua hình ảnh, bố cục, màu sắc và việc nhìn thấy bức tranh tổng thể.",
    suggestion: "Dùng sơ đồ, ghi chú màu, hình minh họa và hình dung kết quả trước khi bắt đầu.",
    color: "#61d9d0",
  },
  A: {
    shortLabel: "Thính giác",
    label: "A · Thính giác",
    description: "Bạn dễ tiếp nhận qua âm thanh, giọng nói, nhịp điệu và trao đổi thành lời.",
    suggestion: "Thảo luận, đọc thành tiếng, ghi âm ý chính và giải thích lại bằng lời của mình.",
    color: "#70b8ff",
  },
  K: {
    shortLabel: "Cảm giác",
    label: "K · Cảm giác – vận động",
    description: "Bạn nhạy với cảm xúc, trải nghiệm cơ thể và thường hiểu sâu khi được trực tiếp thực hành.",
    suggestion: "Học qua trải nghiệm, mô phỏng, di chuyển và kết nối kiến thức với cảm nhận thực tế.",
    color: "#f08ab8",
  },
  Ad: {
    shortLabel: "Phân tích",
    label: "Ad · Phân tích – đối thoại nội tâm",
    description: "Bạn ưu tiên logic, dữ kiện, cấu trúc và quá trình tự phân tích trong đầu.",
    suggestion: "Chia vấn đề thành bước nhỏ, dùng bảng so sánh, tiêu chí rõ ràng và thời gian suy ngẫm.",
    color: "#f0c96a",
  },
};

export const VAKAD_QUESTIONS: ReadonlyArray<{
  id: string;
  question: string;
  options: ReadonlyArray<{ dimension: VakadDimension; text: string }>;
}> = [
  { id: "vakad-1", question: "Bạn thường đưa ra quyết định quan trọng dựa trên điều gì?", options: [
    { dimension: "K", text: "Cảm nhận và trực giác của bản thân" },
    { dimension: "A", text: "Những điều người khác nói và cách họ diễn đạt" },
    { dimension: "V", text: "Điều bạn nhìn thấy và hình dung là tốt nhất cho mình" },
    { dimension: "Ad", text: "Thông tin, dẫn chứng và tiêu chí cụ thể" },
  ] },
  { id: "vakad-2", question: "Trong một cuộc tranh luận, điều gì tác động đến bạn nhiều nhất?", options: [
    { dimension: "A", text: "Giọng nói và cách nhấn nhá của người đối diện" },
    { dimension: "V", text: "Khả năng nhìn thấy và hiểu quan điểm của họ" },
    { dimension: "Ad", text: "Tính logic trong lập luận được đưa ra" },
    { dimension: "K", text: "Cảm xúc và năng lượng của người đối diện" },
  ] },
  { id: "vakad-3", question: "Điều nào ở bản thân khiến bạn hài lòng nhất?", options: [
    { dimension: "V", text: "Cách bạn ăn mặc và xuất hiện" },
    { dimension: "K", text: "Cách bạn chia sẻ cảm xúc" },
    { dimension: "Ad", text: "Cách bạn lựa chọn và sử dụng từ ngữ" },
    { dimension: "A", text: "Giọng nói của bạn" },
  ] },
  { id: "vakad-4", question: "Việc nào dưới đây thường dễ dàng nhất với bạn?", options: [
    { dimension: "A", text: "Điều chỉnh âm lượng và giai điệu để âm thanh hay hơn" },
    { dimension: "Ad", text: "Chọn lọc thông tin có giá trị nhất trong một chủ đề" },
    { dimension: "K", text: "Chọn vật dụng đem lại cảm giác thoải mái nhất" },
    { dimension: "V", text: "Phối màu và hình thức sao cho hài hòa, bắt mắt" },
  ] },
  { id: "vakad-5", question: "Bạn thường nhạy nhất với yếu tố nào xung quanh?", options: [
    { dimension: "A", text: "Âm thanh và tiếng động" },
    { dimension: "Ad", text: "Thông tin hoặc dữ kiện mới" },
    { dimension: "K", text: "Cảm giác của quần áo, vật dụng trên cơ thể" },
    { dimension: "V", text: "Màu sắc và vẻ ngoài của sự vật" },
  ] },
  { id: "vakad-6", question: "Trong một kỳ nghỉ bên bờ biển, trải nghiệm nào hấp dẫn bạn nhất?", options: [
    { dimension: "K", text: "Cát, nắng ấm và luồng gió mát trên da" },
    { dimension: "A", text: "Tiếng sóng, tiếng gió và âm thanh thiên nhiên" },
    { dimension: "Ad", text: "Một kỳ nghỉ hợp lý, được chuẩn bị thông minh và đúng ngân sách" },
    { dimension: "V", text: "Mặt trời sáng, biển xanh và toàn bộ phong cảnh" },
  ] },
  { id: "vakad-7", question: "Khi được giao một bài tập hoặc dự án, điều gì giúp bạn bắt đầu dễ nhất?", options: [
    { dimension: "V", text: "Nhìn thấy hình ảnh hoặc mẫu mô tả kết quả cần làm" },
    { dimension: "A", text: "Nghe hướng dẫn và gợi ý rõ ràng về công việc" },
    { dimension: "Ad", text: "Hiểu logic, yêu cầu và các bước cần thiết" },
    { dimension: "K", text: "Được thử làm và điều chỉnh theo trải nghiệm của mình" },
  ] },
  { id: "vakad-8", question: "Bạn theo dõi một bài thuyết trình dễ dàng nhất khi nào?", options: [
    { dimension: "K", text: "Bạn được tương tác trực tiếp với người trình bày" },
    { dimension: "V", text: "Có hình ảnh trình chiếu và bố cục chủ đề rõ ràng" },
    { dimension: "Ad", text: "Có số liệu thực tế và phần phân tích mạch lạc" },
    { dimension: "A", text: "Người nói có giọng rõ, giàu nhịp điệu và từ ngữ mạnh" },
  ] },
  { id: "vakad-9", question: "Khi mua một chiếc xe, yếu tố nào ảnh hưởng đến lựa chọn của bạn?", options: [
    { dimension: "Ad", text: "Giá, mức tiêu thụ, an toàn và thông số kỹ thuật" },
    { dimension: "K", text: "Độ êm của ghế và cảm giác khi lái thử" },
    { dimension: "V", text: "Màu sắc, thiết kế và hình ảnh bạn khi sử dụng xe" },
    { dimension: "A", text: "Âm thanh động cơ, dàn âm thanh và độ cách âm" },
  ] },
  { id: "vakad-10", question: "Khi xem một buổi biểu diễn âm nhạc trực tiếp, bạn thường chú ý điều gì?", options: [
    { dimension: "A", text: "Giai điệu và âm thanh của bài hát" },
    { dimension: "V", text: "Phần trình diễn, ánh sáng và hình ảnh sân khấu" },
    { dimension: "Ad", text: "Ý nghĩa và cấu trúc của lời bài hát" },
    { dimension: "K", text: "Cảm giác hòa vào đám đông và chuyển động theo nhạc" },
  ] },
  { id: "vakad-11", question: "Khi lo lắng, dấu hiệu nào thường xuất hiện đầu tiên?", options: [
    { dimension: "A", text: "Âm thanh xung quanh dường như khác lạ" },
    { dimension: "K", text: "Cảm giác trong cơ thể và cảm xúc thay đổi" },
    { dimension: "V", text: "Mọi thứ trước mắt trông khác thường" },
    { dimension: "Ad", text: "Suy nghĩ cho rằng mọi thứ trở nên thiếu hợp lý" },
  ] },
  { id: "vakad-12", question: "Trong một cuộc thảo luận, bạn thường bị ảnh hưởng bởi điều gì?", options: [
    { dimension: "Ad", text: "Lý lẽ và dữ kiện của người khác" },
    { dimension: "A", text: "Giọng điệu của người khác" },
    { dimension: "K", text: "Năng lượng và cảm xúc tỏa ra từ họ" },
    { dimension: "V", text: "Ngôn ngữ cơ thể và cách họ trình bày quan điểm" },
  ] },
  { id: "vakad-13", question: "Bạn thường đánh giá hiệu quả làm việc của mình dựa trên điều gì?", options: [
    { dimension: "Ad", text: "Bạn biết rõ cần làm gì để hoàn thành" },
    { dimension: "V", text: "Bạn nhìn thấy rõ tiến bộ và kết quả" },
    { dimension: "A", text: "Bạn nghe phản hồi và nhận ra mọi thứ đang diễn ra ra sao" },
    { dimension: "K", text: "Bạn cảm thấy hài lòng và phù hợp đến mức nào" },
  ] },
  { id: "vakad-14", question: "Một trong những điểm mạnh tự nhiên của bạn là gì?", options: [
    { dimension: "V", text: "Nhìn ra điều gì cần được thực hiện" },
    { dimension: "Ad", text: "Phân tích số liệu và dữ liệu thực tế" },
    { dimension: "A", text: "Nghe và nhận biết điều gì có vẻ đúng" },
    { dimension: "K", text: "Tin tưởng vào cảm nhận của mình" },
  ] },
  { id: "vakad-15", question: "Lựa chọn nào gần với sở thích của bạn nhất?", options: [
    { dimension: "A", text: "Chọn bản nhạc để nghe" },
    { dimension: "Ad", text: "Làm việc theo trình tự và logic" },
    { dimension: "K", text: "Chọn trang phục đem lại cảm giác thoải mái" },
    { dimension: "V", text: "Chọn trang phục có hình thức đẹp mắt" },
  ] },
];

export const LOVE_LANGUAGES: Record<LoveLanguageCode, {
  shortLabel: string;
  label: string;
  description: string;
  suggestion: string;
  color: string;
}> = {
  A: { shortLabel: "Lời nói", label: "Lời khẳng định", description: "Bạn cảm nhận sự quan tâm rõ nhất qua lời khen, ghi nhận, khích lệ và biết ơn chân thành.", suggestion: "Hãy nói cụ thể điều bạn trân trọng và đề nghị người thân phản hồi bằng lời rõ ràng.", color: "#f0c96a" },
  B: { shortLabel: "Thời gian", label: "Thời gian chất lượng", description: "Sự hiện diện trọn vẹn, lắng nghe và cùng trải nghiệm khiến bạn thấy mình được ưu tiên.", suggestion: "Tạo khoảng thời gian không bị điện thoại hay công việc chen ngang và cùng làm điều hai người quan tâm.", color: "#69dcd2" },
  C: { shortLabel: "Quà tặng", label: "Quà tặng ý nghĩa", description: "Một món quà được chọn kỹ là dấu hiệu hữu hình rằng người kia nhớ đến và thấu hiểu bạn.", suggestion: "Giá trị nằm ở ý nghĩa, không ở giá tiền; hãy chia sẻ câu chuyện hoặc dụng ý phía sau món quà.", color: "#ae8cff" },
  D: { shortLabel: "Giúp đỡ", label: "Hành động giúp đỡ", description: "Bạn tin vào tình cảm qua việc người kia chủ động chia sẻ trách nhiệm và biến lời nói thành hành động.", suggestion: "Trao đổi thẳng thắn việc nào thực sự giúp giảm tải, rồi thực hiện đúng lúc và nhất quán.", color: "#f28b68" },
  E: { shortLabel: "Tiếp xúc", label: "Tiếp xúc cơ thể", description: "Những cử chỉ chạm phù hợp, ôm và gần gũi giúp bạn cảm nhận kết nối và sự an toàn.", suggestion: "Luôn tôn trọng ranh giới và sự đồng thuận; hỏi nhau kiểu tiếp xúc nào mang lại cảm giác dễ chịu.", color: "#f08ab8" },
};

const lovePair = (id: number, a: LoveLanguageCode, aText: string, b: LoveLanguageCode, bText: string) => ({
  id: `love-${id}`,
  options: [{ code: a, text: aText }, { code: b, text: bText }] as const,
});

export const LOVE_LANGUAGE_QUESTIONS = [
  lovePair(1, "A", "Tôi nhận được lời nhắn yêu thương không vì một lý do đặc biệt.", "E", "Người yêu và tôi ôm nhau."),
  lovePair(2, "B", "Tôi có thời gian riêng tư, chỉ có hai chúng tôi.", "D", "Người yêu làm một việc thực tế để giúp đỡ tôi."),
  lovePair(3, "C", "Người yêu tặng một món quà nhỏ như dấu hiệu của tình cảm.", "B", "Tôi có khoảng thời gian thư thả, không bị gián đoạn với người yêu."),
  lovePair(4, "D", "Người yêu bất ngờ làm giúp một việc như đổ xăng hoặc giặt đồ.", "E", "Người yêu và tôi có những cử chỉ âu yếm."),
  lovePair(5, "E", "Người yêu choàng vai tôi khi chúng tôi ở nơi công cộng.", "C", "Người yêu làm tôi bất ngờ bằng một món quà."),
  lovePair(6, "B", "Tôi ở bên người yêu, ngay cả khi chúng tôi không làm gì đặc biệt.", "E", "Người yêu và tôi nắm tay nhau."),
  lovePair(7, "C", "Người yêu tặng quà như một dấu hiệu hữu hình của tình cảm.", "A", "Tôi nghe người yêu nói rằng họ yêu tôi."),
  lovePair(8, "E", "Tôi ngồi gần người yêu.", "A", "Tôi được người yêu dành lời khen một cách tự nhiên."),
  lovePair(9, "B", "Tôi được ở bên cạnh người yêu.", "C", "Tôi bất ngờ nhận được một món quà nhỏ từ người yêu."),
  lovePair(10, "A", "Tôi nghe người yêu nói rằng họ tự hào về tôi.", "D", "Người yêu giúp tôi hoàn thành một việc."),
  lovePair(11, "B", "Tôi cùng làm một hoạt động với người yêu.", "A", "Tôi nghe những lời hỗ trợ và khích lệ từ người yêu."),
  lovePair(12, "D", "Người yêu biến lời hứa thành một hành động cụ thể cho tôi.", "E", "Tôi cảm thấy gắn kết hơn khi chúng tôi ôm nhau."),
  lovePair(13, "A", "Tôi nghe người yêu dành lời khen cho mình.", "C", "Người yêu tặng một vật cho thấy họ thực sự nghĩ đến tôi."),
  lovePair(14, "B", "Tôi có thể dành thời gian ở cạnh người yêu.", "E", "Tôi được người yêu xoa lưng hoặc mát-xa."),
  lovePair(15, "A", "Người yêu phản hồi tích cực về điều tôi đã làm.", "D", "Người yêu làm giúp một việc dù việc đó không thú vị với họ."),
  lovePair(16, "E", "Người yêu và tôi thường xuyên hôn nhau.", "B", "Người yêu thực sự quan tâm đến điều tôi đang quan tâm."),
  lovePair(17, "D", "Người yêu cùng tôi thực hiện một dự án cần hoàn thành.", "C", "Người yêu tặng tôi một món quà thú vị."),
  lovePair(18, "A", "Người yêu khen vẻ ngoài của tôi.", "B", "Người yêu dành thời gian lắng nghe và hiểu cảm nhận của tôi."),
  lovePair(19, "E", "Chúng tôi có cử chỉ âu yếm phù hợp ở nơi công cộng.", "D", "Người yêu sẵn lòng mua giúp những thứ lặt vặt tôi cần."),
  lovePair(20, "D", "Người yêu chủ động làm hơn phần trách nhiệm thông thường.", "C", "Tôi nhận món quà được người yêu chọn với nhiều ý nghĩa."),
  lovePair(21, "B", "Người yêu không dùng điện thoại khi chúng tôi trò chuyện.", "D", "Người yêu không ngại phiền để giúp tôi giảm bớt áp lực."),
  lovePair(22, "C", "Tôi mong chờ một dịp đặc biệt và món quà mình ao ước.", "A", "Tôi nghe người yêu nói lời cảm ơn chân thành."),
  lovePair(23, "C", "Người yêu mang về cho tôi một món quà sau chuyến đi xa.", "D", "Người yêu làm giúp việc tôi chưa thể làm vì đang gặp khó khăn."),
  lovePair(24, "B", "Người yêu không chen ngang khi tôi đang nói.", "C", "Tặng quà là một phần quan trọng trong mối quan hệ của chúng tôi."),
  lovePair(25, "D", "Người yêu giúp đỡ khi biết tôi đang mệt.", "B", "Chúng tôi cùng đi đâu đó và dành trọn thời gian cho nhau."),
  lovePair(26, "E", "Người yêu và tôi gần gũi về thể chất.", "C", "Người yêu tặng một món quà nhỏ vào một ngày bình thường."),
  lovePair(27, "A", "Người yêu nói điều gì đó khích lệ tôi.", "B", "Tôi dành thời gian chia sẻ thói quen và sở thích với người yêu."),
  lovePair(28, "C", "Người yêu làm tôi bất ngờ bằng một dấu hiệu trân trọng.", "E", "Người yêu và tôi thường chạm nhau trong ngày."),
  lovePair(29, "D", "Người yêu giúp tôi ngay cả khi họ đang rất bận.", "A", "Người yêu diễn đạt bằng lời rằng họ yêu thương tôi ra sao."),
  lovePair(30, "E", "Người yêu và tôi ôm nhau sau một khoảng thời gian xa cách.", "A", "Tôi nghe người yêu nói tôi có ý nghĩa với họ như thế nào."),
] as const;

export const WHEEL_CATEGORIES = [
  { id: "career", shortLabel: "Sự nghiệp", label: "Sự nghiệp và tài chính", color: "#f0c96a", action: "Chọn một bước giúp tăng sự chủ động về công việc hoặc tài chính trong 30 ngày tới.", questions: [
    "Bạn hài lòng đến mức nào với thu nhập hiện tại?",
    "Công việc hiện tại mang lại cho bạn niềm vui, đam mê và sự hứng thú đến mức nào?",
    "Bạn đánh giá tiềm năng phát triển của công việc hiện tại ra sao?",
  ] },
  { id: "growth", shortLabel: "Phát triển", label: "Phát triển bản thân", color: "#69dcd2", action: "Duy trì một thói quen nhỏ có thể đo được: học, đọc, vận động hoặc rèn kỹ năng mỗi ngày.", questions: [
    "Bạn duy trì việc tập thể dục, đọc sách, học kỹ năng hoặc ngoại ngữ đều đặn đến mức nào?",
    "Bạn chủ động thay đổi thói quen xấu và niềm tin tiêu cực thành lựa chọn tích cực đến mức nào?",
    "Bạn cảm thấy bình an, thoải mái và dễ chịu trong đời sống cảm xúc đến mức nào?",
    "Bạn thường hoàn thành trọn vẹn điều mình đã quyết định đến mức nào?",
    "Bạn vững vàng trước nhận xét, sự ngăn cản hoặc lời chê bai của người khác đến mức nào?",
  ] },
  { id: "recreation", shortLabel: "Sở thích", label: "Sở thích và giải trí", color: "#ae8cff", action: "Đặt trước một khoảng thời gian hằng tuần cho hoạt động lành mạnh chỉ vì niềm vui.", questions: [
    "Bạn có hoạt động lành mạnh chỉ để vui thích và thực hiện đều mỗi tuần đến mức nào?",
    "Bạn cảm thấy tự do và thoải mái khi theo đuổi thú vui của mình đến mức nào?",
    "Bạn có sự kết nối với nhóm bạn cùng sở thích đến mức nào?",
  ] },
  { id: "relationships", shortLabel: "Quan hệ", label: "Các mối quan hệ", color: "#70b8ff", action: "Chủ động một cuộc trò chuyện không phán xét với người quan trọng trong tuần này.", questions: [
    "Mức độ chia sẻ, thấu cảm và kết nối giữa các thành viên trong gia đình của bạn ra sao?",
    "Bạn có những người bạn thân thiết để thoải mái tâm sự đến mức nào?",
    "Bạn thường giữ được cảm xúc lành mạnh sau khi một mối quan hệ kết thúc đến mức nào?",
    "Bạn cảm nhận mình được mọi người tôn trọng, tin tưởng và ghi nhận đến mức nào?",
    "Bạn thường mang lại cảm giác vui vẻ, dễ chịu cho người khác đến mức nào?",
  ] },
  { id: "romance", shortLabel: "Tình yêu", label: "Tình yêu và đời sống thân mật", color: "#f08ab8", action: "Trao đổi về nhu cầu gần gũi, ranh giới và sự đồng thuận bằng một cuộc trò chuyện an toàn.", questions: [
    "Bạn hài lòng đến mức nào với sự âu yếm, gần gũi và giao tiếp thân mật trong mối quan hệ?",
    "Bạn hài lòng đến mức nào với đời sống tình dục hiện tại?",
  ] },
  { id: "health", shortLabel: "Sức khỏe", label: "Sức khỏe", color: "#74d57b", action: "Ưu tiên một nền tảng: giấc ngủ, vận động, dinh dưỡng hoặc kiểm tra sức khỏe phù hợp.", questions: [
    "Bạn đánh giá sức khỏe tổng thể, giấc ngủ và mức độ thoải mái của cơ thể hiện tại ra sao?",
    "Bạn tỉnh táo, tập trung và giàu năng lượng trong ngày đến mức nào?",
    "Sức bền của bạn khi vận động hoặc vui chơi liên tục trong vài giờ ở mức nào?",
  ] },
  { id: "spirituality", shortLabel: "Niềm tin", label: "Tâm linh và niềm tin", color: "#f28b68", action: "Dành thời gian viết lại điều mang ý nghĩa, giá trị và phương hướng cho giai đoạn hiện tại.", questions: [
    "Bạn cảm nhận cuộc sống và các trải nghiệm của mình có ý nghĩa, mục đích đến mức nào?",
    "Bạn sẵn sàng học hỏi và chịu trách nhiệm để mình trở nên tốt hơn đến mức nào?",
    "Bạn tin vào phẩm chất, năng lực và khả năng đón nhận điều tốt đẹp của mình đến mức nào?",
  ] },
  { id: "contribution", shortLabel: "Đóng góp", label: "Cho đi và đóng góp", color: "#d7e66a", action: "Chọn một hành động đóng góp vừa sức và bền vững cho gia đình hoặc cộng đồng.", questions: [
    "Bạn đang hỗ trợ và chăm lo tốt cho những người thân mình có trách nhiệm đến mức nào?",
    "Bạn tham gia hoạt động cộng đồng, xã hội hoặc thiện nguyện đều đặn đến mức nào?",
    "Bạn duy trì thái độ tử tế, tôn trọng với người thân, đồng nghiệp và người phục vụ đến mức nào?",
  ] },
] as const;

export function isSelfDiscoveryToolSlug(value: string): value is SelfDiscoveryToolSlug {
  return SELF_DISCOVERY_TOOLS.some((tool) => tool.slug === value);
}

export function scoreVakad(
  rankings: Record<string, readonly VakadDimension[]>,
  questions: ReadonlyArray<VakadQuestion> = VAKAD_QUESTIONS,
) {
  const scores: Record<VakadDimension, number> = { V: 0, A: 0, K: 0, Ad: 0 };
  for (const question of questions) {
    const ranking = rankings[question.id] || [];
    ranking.forEach((dimension, index) => {
      if (dimension in scores) scores[dimension] += 4 - index;
    });
  }
  return scores;
}

export function scoreLoveLanguages(
  answers: Record<string, LoveLanguageCode>,
  questions: ReadonlyArray<LoveLanguageQuestion> = LOVE_LANGUAGE_QUESTIONS,
) {
  const scores: Record<LoveLanguageCode, number> = { A: 0, B: 0, C: 0, D: 0, E: 0 };
  for (const question of questions) {
    const code = answers[question.id];
    if (code in scores) scores[code] += 1;
  }
  return scores;
}

export function scoreLifeWheel(
  answers: Record<string, number>,
  categories: ReadonlyArray<WheelCategory> = WHEEL_CATEGORIES,
) {
  return Object.fromEntries(categories.map((category) => {
    const values = category.questions.map((_, index) => answers[`${category.id}-${index + 1}`]).filter(Number.isFinite);
    const average = values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
    return [category.id, Math.round(average * 10) / 10];
  })) as Record<string, number>;
}

function cleanText(value: unknown, maxLength: number) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, maxLength) : "";
}

function settingValue(value: unknown, field: string) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const source = (value as Record<string, unknown>)[field];
  return Array.isArray(source) ? source : null;
}

export function parseVakadQuestions(value: unknown): VakadQuestion[] | null {
  const source = settingValue(value, "questions") || (Array.isArray(value) ? value : null);
  if (!source || source.length !== VAKAD_QUESTIONS.length) return null;
  const dimensions: VakadDimension[] = ["V", "A", "K", "Ad"];
  const parsed: VakadQuestion[] = [];
  for (const [index, entry] of source.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const question = cleanText(item.question, 280);
    const options = Array.isArray(item.options) ? item.options : [];
    if (!question || options.length !== 4) return null;
    const seen = new Set<VakadDimension>();
    const parsedOptions: Array<{ dimension: VakadDimension; text: string }> = [];
    for (const option of options) {
      if (!option || typeof option !== "object" || Array.isArray(option)) return null;
      const record = option as Record<string, unknown>;
      const dimension = record.dimension as VakadDimension;
      const text = cleanText(record.text, 360);
      if (!dimensions.includes(dimension) || seen.has(dimension) || !text) return null;
      seen.add(dimension);
      parsedOptions.push({ dimension, text });
    }
    parsed.push({ id: `vakad-${index + 1}`, question, options: parsedOptions });
  }
  return parsed;
}

export function parseLoveLanguageQuestions(value: unknown): LoveLanguageQuestion[] | null {
  const source = settingValue(value, "questions") || (Array.isArray(value) ? value : null);
  if (!source || source.length !== LOVE_LANGUAGE_QUESTIONS.length) return null;
  const codes: LoveLanguageCode[] = ["A", "B", "C", "D", "E"];
  const parsed: LoveLanguageQuestion[] = [];
  for (const [index, entry] of source.entries()) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const options = Array.isArray((entry as Record<string, unknown>).options)
      ? (entry as Record<string, unknown>).options as unknown[]
      : [];
    if (options.length !== 2) return null;
    const parsedOptions: Array<{ code: LoveLanguageCode; text: string }> = [];
    for (const option of options) {
      if (!option || typeof option !== "object" || Array.isArray(option)) return null;
      const record = option as Record<string, unknown>;
      const code = record.code as LoveLanguageCode;
      const text = cleanText(record.text, 420);
      if (!codes.includes(code) || !text) return null;
      parsedOptions.push({ code, text });
    }
    if (parsedOptions[0].code === parsedOptions[1].code) return null;
    parsed.push({ id: `love-${index + 1}`, options: parsedOptions });
  }
  return parsed;
}

export function parseWheelCategories(value: unknown): WheelCategory[] | null {
  const source = settingValue(value, "categories") || (Array.isArray(value) ? value : null);
  if (!source || source.length !== WHEEL_CATEGORIES.length) return null;
  const defaults = new Map(WHEEL_CATEGORIES.map((category) => [category.id, category]));
  const parsed: WheelCategory[] = [];
  for (const entry of source) {
    if (!entry || typeof entry !== "object" || Array.isArray(entry)) return null;
    const item = entry as Record<string, unknown>;
    const id = cleanText(item.id, 40);
    const fallback = defaults.get(id as (typeof WHEEL_CATEGORIES)[number]["id"]);
    const label = cleanText(item.label, 120);
    const questions = Array.isArray(item.questions) ? item.questions.map((question) => cleanText(question, 500)) : [];
    if (!fallback || !label || questions.length !== fallback.questions.length || questions.some((question) => !question)) return null;
    parsed.push({ id, label, shortLabel: fallback.shortLabel, color: fallback.color, action: fallback.action, questions });
  }
  if (new Set(parsed.map((category) => category.id)).size !== WHEEL_CATEGORIES.length) return null;
  return parsed;
}
