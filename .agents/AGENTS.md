# Workspace Rules

## 1. Suy Nghĩ Trước Khi Code
* Không tự suy đoán. Không giấu sự mơ hồ. Đưa các điểm đánh đổi ra ánh sáng.
* Trước khi triển khai:
    * Nêu rõ các giả định của bạn một cách tường minh. Nếu chưa chắc chắn, hãy hỏi.
    * Nếu có nhiều cách hiểu khác nhau, hãy trình bày ra — không tự ý chọn trong im lặng.
    * Nếu có cách tiếp cận đơn giản hơn, hãy đề xuất. Hãy phản biện khi thấy chính đáng.
    * Nếu có điều gì chưa rõ, hãy dừng lại. Chỉ rõ điểm gây bối rối và đặt câu hỏi.

## 2. Ưu Tiên Sự Đơn Giản
* Viết lượng code tối thiểu để giải quyết vấn đề. Không suy đoán lung tung.
* Không thêm tính năng vượt quá những gì được yêu cầu.
* Không trừu tượng hóa (abstraction) đối với các đoạn code chỉ dùng một lần.
* Không thêm sự "linh hoạt" hay "khả năng cấu hình" nếu không được yêu cầu.
* Không xử lý lỗi cho các tình huống không thể xảy ra.
* Nếu bạn viết 200 dòng nhưng có thể rút gọn thành 50 dòng, hãy viết lại.
* Tự hỏi bản thân: "Liệu một kỹ sư cấp cao (senior) có bảo cái này quá phức tạp không?" Nếu có, hãy đơn giản hóa nó.

## 3. Chỉnh Sửa Đúng Trọng Tâm (Surgical Changes)
* Chỉ chạm vào những gì cần thiết. Chỉ dọn dẹp bãi chiến trường do chính mình bày ra.
* Khi chỉnh sửa code hiện có:
    * Không "cải tiến" các đoạn code lân cận, comment hoặc định dạng xung quanh.
    * Không cấu trúc lại (refactor) những thứ không bị lỗi.
    * Tuân thủ phong cách (style) code hiện tại, ngay cả khi bạn có cách làm khác tốt hơn.
    * Nếu phát hiện đoạn code thừa (dead code) không liên quan, hãy nhắc đến nó — đừng tự ý xóa.
* Khi các thay đổi của bạn tạo ra code thừa:
    * Xóa bỏ các lệnh import/biến/hàm bị dư thừa DO CHÍNH thay đổi của bạn tạo ra.
    * Không xóa code thừa đã có từ trước trừ khi được yêu cầu.
* Tiêu chí kiểm tra: Mọi dòng code bị thay đổi đều phải truy xuất được lý do trực tiếp từ yêu cầu của người dùng.

## 4. Thực Thi Theo Mục Tiêu (Goal-Driven Execution)
* Xác định tiêu chí thành công. Lặp lại cho đến khi được xác minh.
* Chuyển đổi các tác vụ thành các mục tiêu có thể xác minh:
    * "Thêm validation" → "Viết các test case cho input không hợp lệ, sau đó code cho test pass"
    * "Sửa bug" → "Viết một test case tái hiện lại bug đó, sau đó code cho test pass"
    * "Refactor X" → "Đảm bảo các test case đều pass cả trước và sau khi refactor"
* Đối với các tác vụ gồm nhiều bước, hãy nêu một kế hoạch ngắn gọn:
    1. [Bước thực hiện] → xác minh: [kiểm tra]
    2. [Bước thực hiện] → xác minh: [kiểm tra]
