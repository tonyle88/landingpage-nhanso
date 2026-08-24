export type LandingContentCatalogItem = {
  key: string;
  description: string;
  value: {
    value: string;
    selector: string;
    type: "text" | "html";
    enabled: boolean;
  };
};

const field = (
  group: string,
  name: string,
  description: string,
  value: string,
  selector: string,
  type: "text" | "html" = "text",
): LandingContentCatalogItem => ({
  key: `landing.content.${group}.${name}`,
  description,
  value: { value, selector, type, enabled: true },
});

// Danh mục chuẩn giúp Admin luôn hiển thị các trường cốt lõi, kể cả trước lần lưu đầu tiên.
export const landingContentCatalog: LandingContentCatalogItem[] = [
  field("hero", "badge", "Nhãn nổi bật phía trên tiêu đề lớn", "Hơn 800 ca tư vấn thực tế", ".hero-badge"),
  field("hero", "title_1", "Tiêu đề lớn · dòng 1", "NHÂN SỐ HỌC", ".hero-title .title-line:nth-child(1)"),
  field("hero", "title_2", "Tiêu đề lớn · dòng 2 (màu nhấn)", "KHAI PHÁ", ".hero-title .title-line:nth-child(2)"),
  field("hero", "title_3", "Tiêu đề lớn · dòng 3", "TIỀM NĂNG", ".hero-title .title-line:nth-child(3)"),
  field("hero", "subtitle", "Mô tả ngay dưới tiêu đề lớn", "Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh và hành trình phát triển của chính mình", ".hero-subtitle"),
  field("hero", "stat_1_number", "Số liệu nổi bật 1 · con số", "3+", ".hero-stats .stat-item:nth-child(1) .stat-number"),
  field("hero", "stat_1_label", "Số liệu nổi bật 1 · chú thích", "Năm kinh nghiệm", ".hero-stats .stat-item:nth-child(1) .stat-label"),
  field("hero", "stat_2_number", "Số liệu nổi bật 2 · con số", "800+", ".hero-stats .stat-item:nth-child(3) .stat-number"),
  field("hero", "stat_2_label", "Số liệu nổi bật 2 · chú thích", "Ca tư vấn", ".hero-stats .stat-item:nth-child(3) .stat-label"),
  field("hero", "stat_3_number", "Số liệu nổi bật 3 · con số", "100%", ".hero-stats .stat-item:nth-child(5) .stat-number"),
  field("hero", "stat_3_label", "Số liệu nổi bật 3 · chú thích", "Cá nhân hoá", ".hero-stats .stat-item:nth-child(5) .stat-label"),
  field("hero", "cta_primary", "Nút chính", "Đặt Lịch Tư Vấn", "#hero-cta-primary span"),
  field("hero", "cta_secondary", "Nút phụ", "Tìm Hiểu Thêm", "#hero-cta-secondary"),

  field("pain", "tag", "Nhãn nhỏ phía trên tiêu đề", "Bạn Đang Gặp Phải?", "#pain-points .section-tag"),
  field("pain", "title", "Tiêu đề lớn của phần câu hỏi", "Những Câu Hỏi Chưa Có Lời Giải", "#pain-points .section-title"),
  field("pain", "card_1", "Thẻ 1 · Định hướng học tập, công việc", "Mơ hồ về <strong>định hướng học tập, công việc</strong> hay tương lai?", "#pain-points .pain-card:nth-child(1) p", "html"),
  field("pain", "card_2", "Thẻ 2 · Mối quan hệ và cảm xúc", "Bế tắc trong các <strong>mối quan hệ</strong> và cảm xúc?", "#pain-points .pain-card:nth-child(2) p", "html"),
  field("pain", "card_3", "Thẻ 3 · Tiềm năng chưa khai phá", "Cảm thấy bản thân có nhiều <strong>tiềm năng</strong> nhưng chưa biết cách phát huy?", "#pain-points .pain-card:nth-child(3) p", "html"),
  field("pain", "card_4", "Thẻ 4 · Lựa chọn quan trọng", "Đứng giữa những <strong>lựa chọn quan trọng</strong> nhưng không biết đâu là hướng đi phù hợp?", "#pain-points .pain-card:nth-child(4) p", "html"),
  field("pain", "conclusion_title", "Đoạn kết · chữ nhấn", "Nhân Số Học", "#pain-points .pain-conclusion-title"),
  field("pain", "conclusion_text", "Đoạn kết · phần mô tả", "là tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh, điểm yếu và hành trình phát triển của chính mình.", "#pain-points .pain-conclusion-text"),

  field("mini_report", "tag", "Nhãn nhỏ phía trên tiêu đề", "Tra Cứu Thử Miễn Phí", "#mini-report .section-tag"),
  field("mini_report", "title", "Tiêu đề công cụ xem nhanh", "Nhận bản xem nhanh nhân số của bạn", "#mini-report .mini-report-title"),
  field("mini_report", "description", "Mô tả bên trái biểu mẫu", "Nhập tên và ngày sinh để xem số chủ đạo, năm cá nhân và một vài gợi ý ban đầu trước khi đặt lịch tư vấn sâu.", "#mini-report .mini-report-desc"),
  field("mini_report", "point_1", "Quyền lợi nhanh 1", "Kết quả hiển thị tức thì", "#mini-report .mini-report-points > span:nth-child(1) .mini-report-point-label"),
  field("mini_report", "point_2", "Quyền lợi nhanh 2", "Không cần thanh toán", "#mini-report .mini-report-points > span:nth-child(2) .mini-report-point-label"),
  field("mini_report", "point_3", "Quyền lợi nhanh 3", "Gợi ý bước tiếp theo rõ ràng", "#mini-report .mini-report-points > span:nth-child(3) .mini-report-point-label"),
  field("mini_report", "button", "Nút xem phân tích sơ bộ", "Xem phân tích sơ bộ", "#mini-report-submit span"),

  field("about", "tag", "Nhãn nhỏ phía trên tiêu đề", "Về Chúng Tôi", "#about .section-tag"),
  field("about", "title", "Tiêu đề giới thiệu", "Những Người Đồng Hành", "#about .section-title"),
  field("about", "mentor_1_name", "Người hướng dẫn 1 · họ tên", "Phan Thái Bảo", "#about .mentor-block:nth-child(1) .mentor-name"),
  field("about", "mentor_1_description", "Người hướng dẫn 1 · giới thiệu", "Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của những lá bài Clow huyền bí.", "#about .mentor-block:nth-child(1) .mentor-desc"),
  field("about", "mentor_2_name", "Người hướng dẫn 2 · họ tên", "Lê Chí Cường", "#about .mentor-block:nth-child(2) .mentor-name"),
  field("about", "mentor_2_description", "Người hướng dẫn 2 · giới thiệu", "Người đồng hành cùng hàng ngàn tâm hồn trên hành trình khám phá bản thân qua ngôn ngữ của nhân số học.", "#about .mentor-block:nth-child(2) .mentor-desc"),

  field("benefits", "tag", "Nhãn nhỏ phía trên tiêu đề", "Những Gì Bạn Nhận Được", "#benefits .section-tag"),
  field("benefits", "title", "Tiêu đề phần lợi ích", "Sau Buổi Tư Vấn, Bạn Sẽ", "#benefits .section-title"),
  field("benefits", "card_1_title", "Lợi ích 1 · tiêu đề", "Hiểu Mình Hơn", "#benefits .benefit-card:nth-child(1) h3"),
  field("benefits", "card_1_text", "Lợi ích 1 · mô tả", "Khám phá tính cách, điểm mạnh và điểm yếu thực sự của bản thân qua lăng kính Nhân Số Học.", "#benefits .benefit-card:nth-child(1) p"),
  field("benefits", "card_2_title", "Lợi ích 2 · tiêu đề", "Gỡ Bỏ Rào Cản", "#benefits .benefit-card:nth-child(2) h3"),
  field("benefits", "card_2_text", "Lợi ích 2 · mô tả", "Nhận diện và giải phóng những rào cản nội tâm đang ngăn bạn phát triển và tiến về phía trước.", "#benefits .benefit-card:nth-child(2) p"),
  field("benefits", "card_3_title", "Lợi ích 3 · tiêu đề", "Định Hướng Rõ Ràng", "#benefits .benefit-card:nth-child(3) h3"),
  field("benefits", "card_3_text", "Lợi ích 3 · mô tả", "Có được lộ trình rõ ràng về học tập, công việc và các mối quan hệ quan trọng trong cuộc sống.", "#benefits .benefit-card:nth-child(3) p"),
  field("benefits", "card_4_title", "Lợi ích 4 · tiêu đề", "Tự Tin Quyết Định", "#benefits .benefit-card:nth-child(4) h3"),
  field("benefits", "card_4_text", "Lợi ích 4 · mô tả", "Tự tin đưa ra những quyết định quan trọng với sự hiểu biết sâu sắc về bản thân và con đường phía trước.", "#benefits .benefit-card:nth-child(4) p"),

  field("testimonials", "tag", "Nhãn nhỏ phía trên tiêu đề", "Khách Hàng Nghĩ Gì?", "#testimonials .section-tag"),
  field("testimonials", "title_main", "Tiêu đề · dòng chính", "Những Hành Trình", "#testimonials .testimonial-title-main"),
  field("testimonials", "title_accent", "Tiêu đề · dòng màu nhấn", "Chữa Lành", "#testimonials .testimonial-title-accent"),

  field("packages", "tag", "Nhãn nhỏ phía trên tiêu đề bảng giá", "Gói Tư Vấn", "#packages .section-tag"),
  field("packages", "title_1", "Tiêu đề bảng giá · dòng 1", "Chọn Hình Thức", "#packages .section-title span:nth-child(1)"),
  field("packages", "title_2", "Tiêu đề bảng giá · dòng 2", "Phù Hợp", "#packages .section-title span:nth-child(2)"),
  field("compare", "tag", "Nhãn nhỏ phía trên bảng so sánh", "Chọn Gói Dễ Hơn", "#package-compare .section-tag"),
  field("compare", "title", "Tiêu đề bảng so sánh gói", "So Sánh Nhanh Các Gói Tư Vấn", "#package-compare .section-title"),

  field("methods", "tag", "Nhãn nhỏ phía trên tiêu đề", "GÓI TƯ VẤN LINH HOẠT 3 TRONG 1", "#methods .section-tag"),
  field("methods", "title", "Tiêu đề phần 3 trong 1", "Một Buổi Tư Vấn, <em>Ba Lăng Kính Soi Chiếu</em>", "#methods .section-title", "html"),
  field("methods", "description", "Mô tả dưới tiêu đề", "Chọn góc nhìn bạn muốn đào sâu hoặc kết hợp cả ba hệ quy chiếu để nhận được bức tranh rõ hơn về câu chuyện hiện tại của mình.", "#methods .section-desc"),
  field("methods", "card_1_title", "Thẻ phương pháp 1 · tiêu đề", "Bài Clow", "#methods .method-card:nth-child(1) .method-title"),
  field("methods", "card_1_description", "Thẻ phương pháp 1 · mô tả", "Lắng nghe thông điệp từ từng lá bài để nhìn rõ điều đang mắc kẹt.", "#methods .method-card:nth-child(1) .method-desc"),
  field("methods", "card_2_title", "Thẻ phương pháp 2 · tiêu đề", "Chiêm tinh", "#methods .method-card:nth-child(2) .method-title"),
  field("methods", "card_2_description", "Thẻ phương pháp 2 · mô tả", "Quan sát nhịp vận hành, xu hướng tính cách và thời điểm chuyển mình.", "#methods .method-card:nth-child(2) .method-desc"),
  field("methods", "card_3_title", "Thẻ phương pháp 3 · tiêu đề", "Nhân số", "#methods .method-card:nth-child(3) .method-title"),
  field("methods", "card_3_description", "Thẻ phương pháp 3 · mô tả", "Giải mã con số chủ đạo, bài học linh hồn và kiểu phát triển phù hợp.", "#methods .method-card:nth-child(3) .method-desc"),

  field("process", "tag", "Nhãn nhỏ phía trên tiêu đề", "Hành Trình", "#process .section-tag"),
  field("process", "title", "Tiêu đề phần quy trình", "Chỉ 3 Bước Đơn Giản", "#process .section-title"),
  field("process", "step_1_title", "Bước 1 · tiêu đề", "Đặt Lịch", "#process .process-step:nth-child(1) h3"),
  field("process", "step_1_text", "Bước 1 · mô tả", "Chọn thời gian phù hợp với lịch trình của bạn. Linh hoạt theo nguyện vọng cá nhân.", "#process .process-step:nth-child(1) p"),
  field("process", "step_2_title", "Bước 2 · tiêu đề", "Chia Sẻ", "#process .process-step:nth-child(2) h3"),
  field("process", "step_2_text", "Bước 2 · mô tả", "Chia sẻ những điều đang khiến bạn trăn trở, những câu hỏi chưa có lời giải.", "#process .process-step:nth-child(2) p"),
  field("process", "step_3_title", "Bước 3 · tiêu đề", "Nhận Định Hướng", "#process .process-step:nth-child(3) h3"),
  field("process", "step_3_text", "Bước 3 · mô tả", "Nhận thông điệp chữa lành và lộ trình cá nhân hoá để tự tin bước tiếp.", "#process .process-step:nth-child(3) p"),

  field("faq", "tag", "Nhãn nhỏ phía trên tiêu đề", "Giải Đáp Trước Khi Đặt Lịch", "#faq .section-tag"),
  field("faq", "title", "Tiêu đề phần câu hỏi thường gặp", "Những Câu Hỏi Thường Gặp", "#faq .section-title"),
  field("faq", "question_1", "Câu hỏi 1", "Tôi chưa biết chọn gói nào thì sao?", "#faq .faq-item:nth-child(1) summary"),
  field("faq", "answer_1", "Trả lời câu hỏi 1", "Bạn có thể gửi điều đang trăn trở trong form đặt lịch. Tụi mình sẽ hỗ trợ chọn gói phù hợp trước khi xác nhận lịch.", "#faq .faq-item:nth-child(1) p"),
  field("faq", "question_2", "Câu hỏi 2", "Buổi tư vấn diễn ra như thế nào?", "#faq .faq-item:nth-child(2) summary"),
  field("faq", "answer_2", "Trả lời câu hỏi 2", "Buổi tư vấn là cuộc trò chuyện 1:1, đi từ ngày sinh, họ tên, các chỉ số cốt lõi đến câu chuyện thực tế của bạn.", "#faq .faq-item:nth-child(2) p"),
  field("faq", "question_3", "Câu hỏi 3", "Sau buổi tư vấn có nhận file không?", "#faq .faq-item:nth-child(3) summary"),
  field("faq", "answer_3", "Trả lời câu hỏi 3", "Gói Toàn Diện có PDF tóm tắt đầy đủ. Các gói khác vẫn có phần ghi chú định hướng theo nội dung đã tư vấn.", "#faq .faq-item:nth-child(3) p"),
  field("faq", "question_4", "Câu hỏi 4", "Thông tin cá nhân của tôi có được bảo mật không?", "#faq .faq-item:nth-child(4) summary"),
  field("faq", "answer_4", "Trả lời câu hỏi 4", "Có. Thông tin ngày sinh, số điện thoại và nội dung chia sẻ chỉ dùng để chuẩn bị và thực hiện buổi tư vấn.", "#faq .faq-item:nth-child(4) p"),
  field("faq", "question_5", "Câu hỏi 5", "Online và offline khác nhau gì?", "#faq .faq-item:nth-child(5) summary"),
  field("faq", "answer_5", "Trả lời câu hỏi 5", "Online phù hợp nếu bạn muốn linh hoạt thời gian và địa điểm. Offline phù hợp khi bạn muốn gặp trực tiếp tại TP.HCM.", "#faq .faq-item:nth-child(5) p"),
  field("faq", "question_6", "Câu hỏi 6", "Có thể đổi lịch không?", "#faq .faq-item:nth-child(6) summary"),
  field("faq", "answer_6", "Trả lời câu hỏi 6", "Có thể đổi lịch nếu bạn báo trước để tụi mình sắp xếp lại khung giờ phù hợp.", "#faq .faq-item:nth-child(6) p"),

  field("contact", "tag", "Nhãn nhỏ phía trên tiêu đề", "Liên Hệ", "#contact .section-tag"),
  field("contact", "title", "Tiêu đề phần liên hệ & đặt lịch", "Bắt Đầu Hành Trình<br>Khám Phá Bản Thân", "#contact .section-title", "html"),
  field("contact", "channel_title", "Kênh liên hệ · tiêu đề", "Zalo / Facebook", "#contact .contact-item:nth-child(2) strong"),
  field("contact", "channel_text", "Kênh liên hệ · mô tả", "Nhắn tin để đặt lịch nhanh nhất", "#contact .contact-item:nth-child(2) p"),
  field("contact", "hours_title", "Giờ làm việc · tiêu đề", "Giờ làm việc", "#contact .contact-item:nth-child(3) strong"),
  field("contact", "hours_text", "Giờ làm việc · nội dung", "Thứ 2 – Chủ Nhật: 8:00 – 21:00", "#contact .contact-item:nth-child(3) p"),
];
