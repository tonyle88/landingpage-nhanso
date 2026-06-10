# Quy Trình Tạo PDF Mẫu Clow Cat Patronus

Mục tiêu: sau này chỉ cần người dùng gửi 2 file:

- File PDF nội dung phân tích.
- File ảnh map viết tay tên khách hàng, ví dụ `Tran Gia Khanh.jpg`.

Codex sẽ tạo lại PDF theo đúng mẫu Clow Cat hiện tại, lưu thành phẩm vào `Pdf files`, và kiểm tra preview trước khi gửi.

## Cấu Trúc Thư Mục

- `Pdf create`: chứa bộ tạo PDF, tài liệu hướng dẫn, ảnh nền/logo dùng riêng cho mẫu PDF, ảnh map mẫu và preview kiểm tra.
- `Pdf create/build_vietnamese_report_pdf.py`: file dựng PDF theo mẫu Clow Cat.
- `Pdf create/assets/images/logo.png`: logo dùng trong PDF.
- `Pdf create/assets/images/hero_bg.png`: ảnh nền bìa PDF.
- `Pdf create/assets/images/hero_bg_a4_cover.jpg`: ảnh nền bìa đã crop theo A4, không kéo méo.
- `Pdf create/previews`: nơi lưu ảnh preview khi kiểm tra bố cục.
- `Pdf create/reference/Bangmau.jpg`: bảng màu tham chiếu.
- `Pdf files`: nơi lưu toàn bộ PDF thành phẩm.

Tất cả PDF xuất ra phải nằm trong `Pdf files`, không để lẫn ở thư mục chính.

## Quy Trình Khi Người Dùng Gửi File

1. Nhận file PDF nội dung và ảnh map viết tay `.jpg`.
2. Đọc nội dung PDF, trích xuất:
   - Họ tên khách hàng.
   - Ngày sinh.
   - Chuyên gia đồng hành.
   - Gói dịch vụ.
   - 7 chỉ số cốt lõi.
   - Biểu đồ ngày sinh.
   - Mũi tên năng lượng, số thiếu, số lặp.
   - Chu kỳ/đỉnh cao và chỉ số thách thức.
   - Nợ nghiệp/bài học cải thiện.
   - Dự đoán năm cá nhân.
   - Thông điệp chữa lành và lộ trình hành động.
   - Thông tin liên hệ.
3. Đọc ảnh map viết tay để đối chiếu các phần có hình vẽ:
   - Lưới ngày sinh.
   - Kim tự tháp Pitago.
   - Các mốc tuổi/năm.
   - Chỉ số thách thức.
   - Khi lưới hiển thị trong PDF và ảnh map viết tay khác nhau, ưu tiên bê y nguyên lưới từ ảnh map viết tay của khách hàng vì đây là bản ghi chú đã được chốt trong buổi phân tích.
   - Không tự sửa lại phần luận giải số thiếu theo lưới hiển thị. Nếu luận giải riêng của Clow Cat nói số thiếu theo ngày sinh là `2,4,5,6` thì giữ nguyên, dù map viết tay có ghi thêm `22`, `55`, `77`, `888`.
4. Cập nhật nội dung trong `Pdf create/build_vietnamese_report_pdf.py`.
5. Chạy file tạo PDF.
6. Render preview tối thiểu các trang quan trọng.
7. Sửa cho đến khi không còn lỗi bố cục.
8. Gửi lại file trong `Pdf files`.

## Quy Tắc Xuất File

Tên file thành phẩm:

`Pdf files/[TEN_KHACH_HANG]_VietHoa_ClowCat.pdf`

Ví dụ:

`Pdf files/TRAN_GIA_KHANH_841_NEW_2_VietHoa_ClowCat.pdf`

Nếu người dùng gửi bản mới của cùng khách hàng, thêm hậu tố dễ hiểu như `_NEW`, `_NEW_2`, hoặc theo số hồ sơ để tránh ghi đè nhầm.

## Quy Tắc Thiết Kế Chung

- Giữ phong cách Clow Cat: huyền bí, Deep Teal, Flasher, Sunburst, Gold.
- Không đổi bìa sang kiểu báo cáo đơn điệu.
- Không kéo giãn ảnh nền; luôn crop giữ tỉ lệ.
- Không dùng lớp số trang trí phụ trên bìa gây rối mắt.
- Logo dùng `Pdf create/assets/images/logo.png`, phải rõ, không bị chìm.
- Gói dịch vụ tư vấn hiển thị là `Phân Tích Toàn Diện (Gói Toàn Diện Nhất)`.
- Chữ trong các trang ruột phải đủ lớn, dễ đọc.
- Nội dung văn bản chính dùng canh đều hai bên khi phù hợp.
- Các khung chính dùng cùng độ rộng chuẩn để mép trái/phải thẳng hàng.
- Không để logo/slogan dưới trang đè lên bảng, quote, ghi chú hoặc đoạn nội dung.
- Vùng trống lớn nên được lấp bằng logo/slogan hoặc biểu đồ, nhưng không được làm rối trang.

## Trang Bìa

Trang bìa phải giữ bố cục đã chốt:

- Hero nền số học full page.
- Logo trong badge đầu trang.
- Tên thương hiệu `Clow Cat Patronus`.
- Badge tên thương hiệu cạnh logo phải canh chữ vào đúng tâm khung viền, không lệch lên/xuống hoặc dạt mép.
- Tiêu đề:
  - `HỒ SƠ`
  - `NHÂN SỐ HỌC`
  - `TOÀN DIỆN`
- Dòng tên khách hàng và ngày sinh.
- Tên khách hàng trên bìa phải dùng màu accent sáng hơn ngày sinh, có bóng nhẹ để nổi rõ trên nền hero.
- Khung mô tả ngắn.
- Ba ô chỉ số chính.
- Chữ mô tả bên dưới 3 số chính phải dùng IN HOA: `CHỈ SỐ CỐT LÕI`, `CHU KỲ CÁ NHÂN`, `ĐỈNH CAO CUỘC ĐỜI`.
- Ba số chính phải nổi bật trên nền hero bằng màu accent sáng, có halo/viền nhẹ phía sau số để không bị chìm.
- Label bên dưới 3 số chính phải nằm thấp hơn halo/vòng số, có khoảng thở rõ; halo và số phải canh giữa theo trục ngang của từng card, nằm cân trong vùng trên của card, không sát mép trên và không chèn vào chữ.
- Bảng thông tin:
  - Chuyên gia đồng hành.
  - Dịch vụ.
  - Gói dịch vụ tư vấn.
- Footer bìa sáng và dễ đọc.

Các khung bìa phải cùng hệ lề trái/phải. Không để 3 ô chỉ số bị lệch so với khung mô tả hoặc bảng thông tin.
Các chữ quan trọng trên bìa phải đủ lớn và nổi bật: tên/ngày sinh dùng font đậm, 3 ô chỉ số dùng số lớn + label đậm, bảng thông tin dùng label/value rõ để xem trên mobile vẫn đọc được.

## Trang Map Viết Tay

- Chèn ảnh map viết tay thành một trang riêng sau `Biểu Đồ Ngày Sinh`.
- Giữ đúng tỉ lệ ảnh, không kéo méo.
- Ảnh cần rõ, sáng, có viền/trang nền sạch.
- Nếu ảnh có nội dung bị sát mép, dùng fit theo chiều cao/chiều rộng để không cắt mất chữ.

## Trang Kim Tự Tháp Pitago

Trang `Hành Trình 4 Đỉnh Cao` cần chèn biểu đồ `Kim Tự Tháp Pitago Cá Nhân` ở vùng trống dưới bảng chu kỳ.

Biểu đồ phải vẽ lại sạch theo phong cách PDF, không cắt thô từ ảnh map.

### Cấu Trúc Biểu Đồ

- Dạng tam giác nhiều tầng.
- Tầng nền là 3 số rút gọn từ ngày sinh:
  - `Tháng`
  - `Ngày`
  - `Năm`
- Tầng đỉnh gồm 4 đỉnh cao.
- Tất cả node trong kim tự tháp, gồm tầng nền và các đỉnh cao, dùng cùng format màu/khung: nền teal đậm, viền mờ sáng, số màu cyan.
- Các đỉnh liên kết với nhau bằng mũi tên.
- Đỉnh cuối trên cùng cũng phải có mũi tên đi lên rõ ràng.
- Các số thách thức đặt cạnh từng đỉnh cao bằng màu vàng/cam khác với màu node.
- Không đặt chỉ số thách thức ở tầng nền.
- Các mốc tuổi/năm đặt dưới từng đỉnh cao:
  - Dòng 1: tuổi, ví dụ `34T`.
  - Dòng 2: năm, ví dụ `2032`.
- Tầng nền chỉ ghi `Tháng`, `Ngày`, `Năm`.
- Dòng ghi chú dưới biểu đồ phải cách đủ xa nhãn `Tháng/Ngày/Năm`, không dính chữ.
- Dòng mô tả trên biểu đồ phải có khoảng thở với đỉnh cuối, không chạm vòng tròn.

### Chú Thích Biểu Đồ

Chú thích ở góc phải phải có đủ:

- Icon vòng tròn cùng format node cho `Đỉnh cao`.
- Icon chấm vàng cho `Thách thức`.
- Icon và chữ canh giữa cùng một hàng.
- Không để chữ lệch trục hoặc quá sát mép hộp chú thích.

### Công Thức Thách Thức Theo Mẫu Clow Cat

Rút gọn tháng, ngày, năm trước khi tính.

- Thách thức 1 = `|tháng - ngày|`.
- Thách thức 2 = `|ngày - năm|`.
- Thách thức 3 = `|năng lượng Đỉnh 1 - năng lượng Đỉnh 2|`.
- Thách thức 4 = `|tháng - năm|`.

Với số bậc thầy ở Đỉnh 1 như `11/2`, dùng năng lượng chính sau dấu `/` để tính thách thức 3.

Ví dụ:

- Đỉnh 1 = `11/2`.
- Đỉnh 2 = `4`.
- Thách thức 3 = `|2 - 4| = 2`.

## Trang Ruột Và Bảng

- Trang 2: các thẻ 7 chỉ số cùng độ rộng, thẳng mép.
- Trang 3: lưới ngày sinh hiển thị phải lấy theo ảnh map viết tay của khách hàng; kiểm tra kỹ số lặp như `22`, `55`, `888`, `77`, không tự thay bằng số thiếu nếu ảnh có ghi rõ.
- Trang 3: màu từng số trong lưới phải bám theo ảnh map viết tay; nếu trong cùng một ô có cả số đỏ và số xanh thì vẽ từng chữ số riêng, không tô cả ô một màu. Với mẫu hiện tại của Gia Khánh: `9999` là 2 đỏ + 2 xanh, `888` là 1 đỏ + 2 xanh, `11111` là 2 đỏ + 3 xanh, `77` là 1 đỏ + 1 xanh, `22` và `55` là xanh.
- Trang 3: phần luận giải số thiếu vẫn giữ theo cách luận giải riêng trong PDF/ghi chú của khách, không suy ngược từ lưới hiển thị để đổi nội dung.
- Trang 3: hai khung trên và bảng mũi tên cùng tổng mép ngoài.
- Trang map: ảnh rõ, không tối, không méo.
- Trang đỉnh cao: bảng chu kỳ và biểu đồ kim tự tháp không chạm nhau.
- Trang nợ nghiệp/dự đoán năm cá nhân: logo/slogan không chen vào nội dung.
- Trang cuối: quote, bảng liên hệ và brand block không đè nhau.

## Checklist QA Trước Khi Gửi

Render preview và kiểm tra tối thiểu:

- Trang 1: bìa không méo, logo rõ, khung đều, không có số trang trí thừa gây rối.
- Trang 2: 7 chỉ số đọc rõ, không tràn chữ.
- Trang 3: lưới ngày sinh đúng, bảng mũi tên thẳng hàng.
- Trang 4: map viết tay rõ và đúng tỉ lệ.
- Trang 5: kim tự tháp đúng dạng tam giác, có mũi tên, có thách thức đúng tầng, chú thích cân.
- Trang 5: các năm nằm dưới đỉnh cao, không nằm dưới tầng nền.
- Trang 5: dòng mô tả trên và dòng ghi chú dưới không dính vào node hoặc nhãn.
- Trang 6: brand block không đè nội dung.
- Trang 7: quote, liên hệ, logo/slogan cân và không chạm footer.

## Câu Nhắc Nhanh Cho Lần Sau

Người dùng chỉ cần nói:

> Tạo PDF theo mẫu Clow Cat từ file PDF này và ảnh map viết tay tên khách hàng.jpg.

Sau đó đính kèm:

- File PDF nội dung.
- File ảnh map viết tay `.jpg`.

Codex sẽ dùng hướng dẫn này và file `Pdf create/build_vietnamese_report_pdf.py` để tạo PDF mới.
