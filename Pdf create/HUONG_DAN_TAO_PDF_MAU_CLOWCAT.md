# Quy Trình Tạo PDF Mẫu Clow Cat Patronus

Mục tiêu: khi cần tạo PDF mới, người dùng chỉ cần chép 2 file vào thư mục `Pdf files/input`:

- 1 file PDF nội dung phân tích.
- 1 file ảnh map viết tay của khách hàng, định dạng `.jpg`, `.jpeg`, `.png` hoặc `.webp`.

Sau khi xử lý xong, PDF thành phẩm bắt buộc lưu vào `Pdf files/output`.

## Tóm Tắt Siêu Nhanh

Mỗi lần tạo PDF mới:

1. Xóa hoặc dọn file cũ trong `Pdf files/input`.
2. Chép vào `Pdf files/input` đúng 2 file:
   - 1 file PDF nguồn.
   - 1 ảnh map viết tay của khách.
   - Nên đặt PDF và ảnh cùng tên khách, ví dụ `Bui Le Thao Vy.pdf` + `Bui Le Thao Vy.jpg`.
3. AI đọc file hướng dẫn này.
4. AI cập nhật nội dung khách mới trong `Pdf create/build_vietnamese_report_pdf.py`.
5. Chạy script.
6. Kiểm tra preview.
7. Lấy PDF thành phẩm trong `Pdf files/output`.

Nếu thiếu PDF hoặc ảnh map trong `input`, script phải báo lỗi ngay, không được tự lấy file khách cũ.

Luôn dùng `Pdf create/build_clowcat_blank_template_pdf.py` làm khung sườn chuẩn trước, rồi chỉ fill dữ liệu khách vào `Pdf create/build_vietnamese_report_pdf.py`. Không dựng layout lại từ đầu.

## Khung Sườn PDF Trắng

Để làm nhanh hơn, dự án có thêm file dựng khung sườn:

- `Pdf create/build_clowcat_blank_template_pdf.py`
- File PDF khung xuất ra:
  - `Pdf create/templates/CLOWCAT_KHUNG_SUON_TEMPLATE.pdf`
  - `Pdf files/output/CLOWCAT_KHUNG_SUON_TEMPLATE.pdf`

Khung sườn này giữ sẵn toàn bộ layout Clow Cat, gồm bìa, 7 chỉ số, biểu đồ ngày sinh, map viết tay, nợ nghiệp, 3 chu kỳ cuộc đời lớn, 4 đỉnh cao/kim tự tháp và thông điệp chữa lành. Nội dung bên trong để dạng `[placeholder]`.

Quy tắc dùng:

1. Không dùng khung sườn trắng làm file gửi khách cuối.
2. Dùng `build_clowcat_blank_template_pdf.py` làm form gốc/source of truth để nhìn cấu trúc và fill dữ liệu nhanh vào `build_vietnamese_report_pdf.py`.
3. Khi đổi design, sửa cả file tạo PDF thật và file khung sườn để hai bên đồng bộ.
4. Ba số bìa trong khung sườn vẫn cố định là `7 - 3 - 4`.

## Mang Sang Dự Án Khác

Copy nguyên bộ này sang project mới:

- `Pdf create/build_vietnamese_report_pdf.py`
- `Pdf create/build_clowcat_blank_template_pdf.py`
- `Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md`
- `Pdf create/templates/CLOWCAT_KHUNG_SUON_TEMPLATE.pdf`
- `Pdf create/assets/images/logo.png`
- `Pdf create/assets/images/hero_bg.png`
- `Pdf create/assets/images/hero_bg_a4_cover.jpg`
- `Pdf files/input`
- `Pdf files/output`

Sau khi copy:

1. Đổi logo/background trong `Pdf create/assets/images` nếu dự án mới dùng brand khác.
2. Giữ nguyên luồng `input -> build script -> output`.
3. Không hardcode đường dẫn ngoài project.
4. Nếu chạy trên Windows/Linux, kiểm tra lại phần font trong script vì hiện template dùng font Arial của macOS.
5. Với khách mới, chỉ cập nhật nội dung trong script, không đổi cấu trúc thư mục.

## Cấu Trúc Thư Mục Chuẩn

- `Pdf files/input`: nơi người dùng đặt file PDF gốc và ảnh map viết tay.
- `Pdf files/output`: nơi lưu PDF thành phẩm.
- `Pdf create/build_vietnamese_report_pdf.py`: template/script dựng PDF Clow Cat.
- `Pdf create/HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md`: file hướng dẫn này.
- `Pdf create/assets/images/logo.png`: logo chính dùng trong PDF.
- `Pdf create/assets/images/hero_bg.png`: ảnh nền hero gốc.
- `Pdf create/assets/images/hero_bg_a4_cover.jpg`: ảnh nền bìa đã crop theo A4, không kéo méo.
- `Pdf create/previews`: nơi lưu ảnh preview để kiểm tra bố cục.

Không lưu PDF thành phẩm ở `Pdf files` trực tiếp nữa. Tất cả bản xuất cuối phải nằm trong `Pdf files/output`.

## Luồng Làm Việc Chuẩn

1. Dọn hoặc kiểm tra `Pdf files/input`.
   - Lý tưởng nhất: trong `input` chỉ có 1 file PDF và 1 file ảnh map của khách hiện tại.
   - Nếu có nhiều file, script sẽ chọn PDF mới nhất, rồi ưu tiên ảnh map có cùng tên file với PDF.
   - Nếu không có ảnh cùng tên, script mới dùng ảnh map mới nhất. AI vẫn phải kiểm tra lại tên input/output trước khi báo xong.

2. Đọc PDF nguồn trong `Pdf files/input`.
   - Trích xuất tên khách hàng.
   - Ngày sinh.
   - Chuyên gia đồng hành.
   - Gói dịch vụ.
   - 7 chỉ số cốt lõi.
   - Biểu đồ ngày sinh, số thiếu, số lặp, mũi tên.
   - Nợ nghiệp/bài học cải thiện.
   - 3 chu kỳ cuộc đời lớn.
   - 4 đỉnh cao và chỉ số thách thức.
   - Dự đoán năm cá nhân nếu có.
   - Thông điệp chữa lành, lộ trình hành động, thông tin liên hệ.

3. Mở ảnh map viết tay trong `Pdf files/input` để đối chiếu.
   - Lưới ngày sinh hiển thị trong PDF thiết kế phải bê theo ảnh map viết tay.
   - Kim tự tháp Pitago phải bê theo ảnh map viết tay.
   - Mốc tuổi/năm và chỉ số thách thức phải bê theo ảnh map viết tay nếu PDF nguồn và ảnh có khác nhau.
   - Không tự sửa phần luận giải riêng của Clow Cat chỉ vì lưới hiển thị có vẻ khác công thức phổ thông.

4. Cập nhật `Pdf create/build_vietnamese_report_pdf.py`.
   - Script đã tự nhìn vào `Pdf files/input` để lấy PDF nguồn và ảnh map.
   - Quy tắc chọn file: PDF mới nhất, ảnh map cùng tên PDF nếu có, nếu không thì ảnh map mới nhất.
   - Script đã tự xuất file sang `Pdf files/output`.
   - AI chỉ cần cập nhật nội dung, số liệu, lưới, kim tự tháp và wording theo khách hiện tại.
   - Không đổi lại output về `Pdf files` trực tiếp.

5. Chạy script tạo PDF.
   - Chạy từ thư mục gốc project hoặc trực tiếp file Python đều được.
   - Thành phẩm phải xuất hiện trong `Pdf files/output`.

6. Render preview và QA trước khi báo xong.
   - Tạo ảnh preview cho toàn bộ trang hoặc tối thiểu các trang quan trọng.
   - Nếu thấy lệch khung, chữ nhỏ, logo đè, map méo hoặc kim tự tháp sai, phải sửa và xuất lại.

## Cấu Hình Input/Output Trong Script

Đầu file `build_vietnamese_report_pdf.py` đã có cấu hình chuẩn:

```python
PDF_FILES_DIR = os.path.join(ROOT_DIR, "Pdf files")
INPUT_DIR = os.path.join(PDF_FILES_DIR, "input")
OUTPUT_DIR = os.path.join(PDF_FILES_DIR, "output")
INPUT_PDF = latest_file(INPUT_DIR, ("*.pdf", "*.PDF"))
INPUT_MAP = latest_file(INPUT_DIR, ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP"))
OUTPUT = os.path.join(OUTPUT_DIR, f"{output_slug_from_input(INPUT_PDF)}_VietHoa_ClowCat.pdf")
```

Quy tắc:

- Không hardcode đường dẫn output ra ngoài `Pdf files/output`.
- Không bắt người dùng chép ảnh map vào `Pdf create`.
- Nếu cần đổi tên file xuất, chỉ đổi phần slug/tên nhưng vẫn giữ thư mục `OUTPUT_DIR`.
- Nếu `input` có nhiều ảnh, script ưu tiên ảnh mới nhất; AI vẫn cần kiểm tra đúng tên khách.

## Quy Tắc Bìa Đã Chốt

Trang bìa giữ đúng phong cách Clow Cat:

- Nền hero số học full page, crop giữ tỉ lệ, không kéo méo.
- Logo dùng `Pdf create/assets/images/logo.png`, rõ và không bị chìm.
- Badge thương hiệu `CLOW CAT PATRONUS` cạnh logo phải canh giữa trong khung.
- Tiêu đề:
  - `HỒ SƠ`
  - `NHÂN SỐ HỌC`
  - `TOÀN DIỆN`
- Tên khách hàng nổi bật hơn ngày sinh, dùng màu accent sáng và có bóng nhẹ.
- Mô tả ngắn nằm trong khung riêng, không đụng cụm 3 số.
- Ba ô chỉ số chính:
  - Số cố định `7` với label `CHỈ SỐ CỐT LÕI`.
  - Số cố định `3` với label `CHU KỲ CUỘC ĐỜI LỚN`.
  - Số cố định `4` với label `ĐỈNH CAO CUỘC ĐỜI`.
- Tuyệt đối không đổi 3 số bìa `7 - 3 - 4` theo chỉ số khách hàng; đây là cấu trúc cố định của mẫu bìa Clow Cat.
- Chữ dưới 3 số phải IN HOA.
- Ba số chính phải nằm giữa card, có halo/viền nhẹ, màu nổi bật.
- Label dưới số phải cách halo đủ thoáng, không chèn vào vòng tròn.
- Bảng thông tin gồm:
  - Chuyên gia đồng hành.
  - Dịch vụ.
  - Gói dịch vụ tư vấn.
- Gói dịch vụ tư vấn mặc định: `Phân Tích Toàn Diện (Gói Toàn Diện Nhất)`.
- Footer bìa sáng, dễ đọc.

## Thứ Tự Trang Chuẩn

1. Trang bìa.
2. Bản đồ 7 chỉ số cốt lõi.
3. Biểu đồ ngày sinh.
4. Map viết tay cá nhân.
5. Nợ nghiệp & bài học cải thiện.
6. 3 Chu Kỳ Cuộc Đời Lớn.
7. Hành Trình 4 Đỉnh Cao + Kim Tự Tháp Pitago Cá Nhân.
8. Thông điệp chữa lành.

Nếu nội dung quá dài, được phát sinh trang mới, nhưng phải giữ thứ tự: `3 Chu Kỳ Cuộc Đời Lớn` đứng trước `Hành Trình 4 Đỉnh Cao`.

## Quy Tắc Lưới Ngày Sinh

Lưới trên trang `Biểu Đồ Ngày Sinh` phải ưu tiên ảnh map viết tay.

- Nếu ảnh map có `22`, `55`, `777`, `888`, phải hiển thị đúng số lượng đó.
- Nếu ảnh map có dấu `X`, hiển thị `X`.
- Nếu trong cùng một ô có số màu đỏ và số màu xanh, phải vẽ từng ký tự riêng màu, không tô cả cụm một màu.
- Màu đỏ/cam dùng cho số bẩm sinh hoặc dấu X theo map.
- Màu xanh dùng cho số bổ sung từ tên theo map.
- Nếu PDF nguồn luận giải số thiếu theo cách riêng khác với lưới hiển thị, giữ nguyên luận giải của Clow Cat, không tự sửa lại.

Ví dụ cách khai báo màu trong script:

```python
rows = [
    [[("3", red), ("3", blue)], [("6", blue)], [("X", red)]],
    [[("2", red), ("2", red)], [("5", blue), ("5", blue)], [("8", blue), ("8", blue)]],
    [[("1", red), ("1", red), ("1", red)], [("X", red)], [("7", blue), ("7", blue), ("7", blue)]],
]
```

## Quy Tắc Kim Tự Tháp Pitago

Biểu đồ phải vẽ lại sạch theo phong cách PDF, không cắt thô từ ảnh map.

- Dạng tam giác nhiều tầng.
- Tầng nền là 3 số rút gọn từ `Tháng`, `Ngày`, `Năm`.
- Tầng nền chỉ ghi `Tháng`, `Ngày`, `Năm`, không đặt chỉ số thách thức ở tầng nền.
- 4 đỉnh cao phải nối với nhau bằng mũi tên.
- Đỉnh cuối trên cùng cũng có mũi tên đi lên rõ.
- Mỗi đỉnh cao có:
  - Số đỉnh cao.
  - Tuổi, ví dụ `32T`.
  - Năm, ví dụ `2032`.
- Tuổi/năm đặt dưới từng đỉnh cao, không đặt dưới tầng nền.
- Chỉ số thách thức đặt cạnh từng đỉnh cao, màu vàng/cam khác màu node.
- Chú thích phải có:
  - Icon vòng tròn cùng format node cho `Đỉnh cao`.
  - Icon chấm vàng cho `Thách thức`.
  - Icon và chữ canh giữa cùng hàng.
- Dòng mô tả trên biểu đồ không được dính đỉnh cao trên cùng.
- Dòng ghi chú dưới biểu đồ phải cách nhãn `Tháng/Ngày/Năm`.

### Công Thức Thách Thức Theo Mẫu Clow Cat

Rút gọn tháng, ngày, năm trước khi tính.

- Thách thức 1 = `|tháng - ngày|`.
- Thách thức 2 = `|ngày - năm|`.
- Thách thức 3 = `|năng lượng Đỉnh 1 - năng lượng Đỉnh 2|`.
- Thách thức 4 = `|tháng - năm|`.

Với số bậc thầy ở Đỉnh 1 như `11/2`, dùng năng lượng sau dấu `/` để tính thách thức 3.

## Quy Tắc Trang Ruột

- Các khung chính phải cùng hệ lề trái/phải, không lệch mép.
- Chữ nội dung đủ lớn, đọc rõ trên desktop và mobile.
- Đoạn văn dài canh đều hai bên khi phù hợp.
- Bảng không để chữ tràn hoặc sát viền.
- Logo/slogan dưới trang chỉ dùng để lấp khoảng trống, không được đè nội dung.
- Map viết tay giữ đúng tỉ lệ, không kéo méo, không cắt mất chữ.
- Nếu nội dung dài, ưu tiên thoáng và phát sinh trang mới thay vì nhồi.

## Checklist QA Trước Khi Gửi

Render preview và kiểm tra:

- Trang 1: bìa không méo, logo rõ, tên khách nổi bật, 3 ô số cân giữa, label là `CHU KỲ CUỘC ĐỜI LỚN`.
- Trang 2: 7 chỉ số đúng, không còn sót tên/ngày sinh khách cũ.
- Trang 3: lưới ngày sinh đúng theo ảnh map, màu từng số đúng.
- Trang 4: map viết tay rõ, đúng tỉ lệ.
- Trang 5: nợ nghiệp/bài học không đè logo/slogan.
- Trang 6: 3 chu kỳ cuộc đời lớn nằm trước phần đỉnh cao.
- Trang 7: 4 đỉnh cao và kim tự tháp đúng số, đúng năm, đúng thách thức, chú thích cân.
- Trang 8: quote, liên hệ, logo/slogan không đè nhau.
- Toàn file: không còn tên khách cũ, ngày sinh cũ hoặc số liệu cũ.
- Output nằm trong `Pdf files/output`.

## Câu Nhắc Nhanh Cho Lần Sau

Người dùng chỉ cần nói:

> Tạo PDF theo mẫu Clow Cat từ file trong `Pdf files/input`.

Sau đó đảm bảo trong `Pdf files/input` có:

- 1 file PDF nguồn.
- 1 file ảnh map viết tay tên khách hàng.

AI đọc file hướng dẫn này, cập nhật `build_vietnamese_report_pdf.py`, chạy script, render preview và trả lại file PDF trong `Pdf files/output`.
