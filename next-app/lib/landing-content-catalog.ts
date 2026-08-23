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
  field("pain", "tag", "Nhãn section Nỗi đau", "Bạn Đang Gặp Phải?", "#pain-points .section-tag"),
  field("pain", "title", "Tiêu đề section Nỗi đau", "Những Câu Hỏi Chưa Có Lời Giải", "#pain-points .section-title"),
  field("pain", "card_1", "Câu hỏi nỗi đau 1", "Mơ hồ về <strong>định hướng học tập, công việc</strong> hay tương lai?", "#pain-points .pain-card:nth-child(1) p", "html"),
  field("pain", "card_2", "Câu hỏi nỗi đau 2", "Bế tắc trong các <strong>mối quan hệ</strong> và cảm xúc?", "#pain-points .pain-card:nth-child(2) p", "html"),
  field("pain", "card_3", "Câu hỏi nỗi đau 3", "Cảm thấy bản thân có nhiều <strong>tiềm năng</strong> nhưng chưa biết cách phát huy?", "#pain-points .pain-card:nth-child(3) p", "html"),
  field("pain", "card_4", "Câu hỏi nỗi đau 4", "Đứng giữa những <strong>lựa chọn quan trọng</strong> nhưng không biết đâu là hướng đi phù hợp?", "#pain-points .pain-card:nth-child(4) p", "html"),
  field("pain", "conclusion_title", "Tiêu đề kết luận", "Nhân Số Học", "#pain-points .pain-conclusion-title"),
  field("pain", "conclusion_text", "Nội dung kết luận", "là tấm bản đồ giúp bạn hiểu rõ bản thân, tính cách, điểm mạnh, điểm yếu và hành trình phát triển của chính mình.", "#pain-points .pain-conclusion-text"),

  field("about", "tag", "Nhãn section Giới thiệu", "Về Chúng Tôi", "#about .section-tag"),
  field("about", "title", "Tiêu đề section Giới thiệu", "Những Người Đồng Hành", "#about .section-title"),
  field("benefits", "tag", "Nhãn section Lợi ích", "Những Gì Bạn Nhận Được", "#benefits .section-tag"),
  field("benefits", "title", "Tiêu đề section Lợi ích", "Sau Buổi Tư Vấn, Bạn Sẽ", "#benefits .section-title"),
  field("benefits", "card_1_title", "Tiêu đề lợi ích 1", "Hiểu Mình Hơn", "#benefits .benefit-card:nth-child(1) h3"),
  field("benefits", "card_1_text", "Mô tả lợi ích 1", "Khám phá tính cách, điểm mạnh và điểm yếu thực sự của bản thân qua lăng kính Nhân Số Học.", "#benefits .benefit-card:nth-child(1) p"),
  field("benefits", "card_2_title", "Tiêu đề lợi ích 2", "Gỡ Bỏ Rào Cản", "#benefits .benefit-card:nth-child(2) h3"),
  field("benefits", "card_2_text", "Mô tả lợi ích 2", "Nhận diện và giải phóng những rào cản nội tâm đang ngăn bạn phát triển và tiến về phía trước.", "#benefits .benefit-card:nth-child(2) p"),
  field("benefits", "card_3_title", "Tiêu đề lợi ích 3", "Định Hướng Rõ Ràng", "#benefits .benefit-card:nth-child(3) h3"),
  field("benefits", "card_3_text", "Mô tả lợi ích 3", "Có được lộ trình rõ ràng về học tập, công việc và các mối quan hệ quan trọng trong cuộc sống.", "#benefits .benefit-card:nth-child(3) p"),
  field("benefits", "card_4_title", "Tiêu đề lợi ích 4", "Tự Tin Quyết Định", "#benefits .benefit-card:nth-child(4) h3"),
  field("benefits", "card_4_text", "Mô tả lợi ích 4", "Tự tin đưa ra những quyết định quan trọng với sự hiểu biết sâu sắc về bản thân và con đường phía trước.", "#benefits .benefit-card:nth-child(4) p"),
  field("testimonials", "tag", "Nhãn section Cảm nhận", "Khách Hàng Nghĩ Gì?", "#testimonials .section-tag"),
  field("testimonials", "title_main", "Tiêu đề chính section Cảm nhận", "Những Hành Trình", "#testimonials .testimonial-title-main"),
  field("testimonials", "title_accent", "Tiêu đề nhấn section Cảm nhận", "Chữa Lành", "#testimonials .testimonial-title-accent"),
  field("packages", "tag", "Nhãn section Gói tư vấn", "Gói Tư Vấn", "#packages .section-tag"),
  field("packages", "title_1", "Dòng tiêu đề gói tư vấn 1", "Chọn Hình Thức", "#packages .section-title span:nth-child(1)"),
  field("packages", "title_2", "Dòng tiêu đề gói tư vấn 2", "Phù Hợp", "#packages .section-title span:nth-child(2)"),
  field("compare", "tag", "Nhãn section So sánh", "Chọn Gói Dễ Hơn", "#package-compare .section-tag"),
  field("compare", "title", "Tiêu đề section So sánh", "So Sánh Nhanh Các Gói Tư Vấn", "#package-compare .section-title"),
  field("methods", "tag", "Nhãn section Phương pháp", "GÓI TƯ VẤN LINH HOẠT 3 TRONG 1", "#methods .section-tag"),
  field("methods", "title", "Tiêu đề section Phương pháp", "Một Buổi Tư Vấn, <em>Ba Lăng Kính Soi Chiếu</em>", "#methods .section-title", "html"),
  field("methods", "description", "Mô tả section Phương pháp", "Chọn góc nhìn bạn muốn đào sâu hoặc kết hợp cả ba hệ quy chiếu để nhận được bức tranh rõ hơn về câu chuyện hiện tại của mình.", "#methods .section-desc"),
  field("process", "tag", "Nhãn section Hành trình", "Hành Trình", "#process .section-tag"),
  field("process", "title", "Tiêu đề section Hành trình", "Chỉ 3 Bước Đơn Giản", "#process .section-title"),
  field("contact", "tag", "Nhãn section Liên hệ", "Liên Hệ", "#contact .section-tag"),
  field("contact", "title", "Tiêu đề section Liên hệ", "Bắt Đầu Hành Trình<br>Khám Phá Bản Thân", "#contact .section-title", "html"),
];
