import os

file_path = "Pdf create/build_vietnamese_report_pdf.py"
with open(file_path, "r", encoding="utf-8") as f:
    lines = f.readlines()

def replace_lines(start, end, new_lines_str):
    global lines
    new_lines = [line + "\n" for line in new_lines_str.split("\n")]
    lines[start-1:end] = new_lines

# 1. Chunk 1 (880-887)
replace_lines(880, 887, """        ("Đường đời (Life Path)", "3", "Trở thành người truyền đạt và sáng tạo. Bạn mang sứ mệnh của một người truyền cảm hứng thông qua ngôn từ và sự sáng tạo."),
        ("Sứ mệnh (Destiny)", "8", "Bài học về sự điều hành, quyền lực và vật chất. Cuộc đời sẽ đặt bạn vào những tình huống để học cách làm chủ vật chất."),
        ("Linh hồn (Soul Urge)", "6", "Khao khát được yêu thương và chăm sóc gia đình. Sâu thẳm bên trong, bạn hạnh phúc nhất khi được bao bọc gia đình."),
        ("Nhân cách (Personality)", "11/2", "Một tâm hồn nhạy bén, đầy cảm hứng và trực giác. Thế giới nhìn nhận bạn như một người có trực giác rất cao."),
        ("Thái độ (Attitude)", "1", "Độc lập, quyết đoán và tự chủ trong phản ứng đầu tiên."),
        ("Ngày sinh", "2", "Khả năng lắng nghe, thấu cảm và nhạy bén bẩm sinh."),
        ("Trưởng thành (Maturity)", "11/2", "Sự thức tỉnh tâm linh và khả năng hòa giải giai đoạn chín muồi."),""")

# 2. Chunk 2 (902)
replace_lines(902, 902, """        P("Lưới bên trái được bê theo map viết tay của Ngô Thị Dương. Những ô có tô vàng cho thấy năng lượng được nhấn mạnh trong buổi phân tích.", "BodySmall"),""")

# 3. Chunk 3 (915-919)
replace_lines(915, 919, """                (True, "Mũi tên Cân bằng cảm xúc (2-5-8)", "Sự quá tải rung động: Với việc sở hữu tới 5 con số 2 và 3 con số 8, bạn đang mang một gánh nặng cảm xúc khổng lồ. 5 con số 2 khiến bạn cực kỳ nhạy cảm, dễ bị tổn thương và hay kịch tính hóa vấn đề."),
                (False, "Mũi tên Trí tuệ (3-6-9)", "Bạn có óc sáng tạo và lý tưởng lớn. Nhưng Mentor nhắc bạn: 'Tình thương phải đi kèm trí tuệ'. Nếu giúp đỡ người khác sai cách, bạn vô tình làm tổn hao công đức của chính mình."),
                (False, "Mũi tên Tâm linh (3-5-7)", "Với 2 con số 7, cuộc đời bạn không thiếu những bài học thực tế đau đớn để chiêm nghiệm. Đặc biệt, những bài học ngầm về gia đình hiện tại là sự sắp đặt của vũ trụ để bạn gọt giũa cái tôi."),""")

# 4. Chunk 4 (936-939)
replace_lines(936, 939, """                P("<b>Không có nợ nghiệp (Ø)</b>", "H2"),
                P("Bạn là 'học sinh giỏi của kiếp trước'. Bạn bước vào kiếp này với hành trang trong sạch, không phải trả nợ cũ. Đây là đặc ân để bạn toàn tâm toàn ý tập trung hoàn thành sứ mệnh số 8 và số 3 mà không bị kéo chân bởi những oan khiên quá khứ.", "Body"),""")

# 5. Chunk 5 (956)
replace_lines(956, 956, """    story.append(SectionBand("05", "3 Chu Kỳ Cuộc Đời Lớn", "Nền hành trình lớn của Ngô Thị Dương"))""")

# 6. Chunk 6 (961-963)
replace_lines(961, 963, """                ("0-33 tuổi", "8", "Chu kỳ Tuổi trẻ mời gọi Dương đối mặt với thế giới vật chất, rèn luyện tư duy tài chính, quản trị và khát vọng thành công thực tế."),
                ("34-60 tuổi", "2", "Chu kỳ Trưởng thành đòi hỏi sự kiên nhẫn, hợp tác và nhạy cảm. Đây là lúc cái 'Tôi' cần được hạ xuống để nhường chỗ cho sự kết nối và hòa hợp."),
                ("61+ tuổi", "2", "Chu kỳ Thông tuệ tiếp tục mang năng lượng của sự bình yên và trực giác. Đây là lúc bạn tận hưởng thành quả từ sự thấu cảm và chia sẻ."),""")

# 7. Chunk 7 (986-989)
replace_lines(986, 989, """                ("Đỉnh cao 1", "1", "Năm 2024, tuổi 33: Khởi đầu mới, độc lập. Thách thức 6 là gánh nặng trách nhiệm và sự áp đặt trong gia đình."),
                ("Đỉnh cao 2", "4", "Năm 2033, tuổi 42: Xây dựng nền tảng, kỷ luật. Thách thức 0 là thử thách tâm linh tổng thể, đòi hỏi sự thức tỉnh cao độ."),
                ("Đỉnh cao 3", "5", "Năm 2042, tuổi 51: Tự do, trải nghiệm, thay đổi. Thách thức 3 là kiểm soát lời nói và sự phân tán năng lượng."),
                ("Đỉnh cao 4", "1", "Năm 2051, tuổi 60: Tái khẳng định vị thế cá nhân. Thách thức 6 là sự cân bằng giữa cái tôi và sự phụng sự gia đình."),""")

# 8. Chunk 8 (1002-1003)
replace_lines(1002, 1003, """                P("Ngô Thị Dương thân mến, tôi viết những dòng này cho bạn không phải như một nhà toán học, mà như một người đồng hành trên con đường chữa lành linh hồn.", "Body"),
                P("Yêu thương bản thân không phải là ích kỷ: Với 5 con số 2, bạn rất dễ hy sinh đến kiệt quệ rồi lại oán trách vì không nhận được sự đền đáp tương xứng. Hãy nhớ: Bạn không thể rót nước từ một chiếc bình rỗng. Hãy đặt mình lên hàng đầu, chăm sóc tâm hồn mình trước khi muốn bao bọc bất kỳ ai khác.", "Body"),""")

# 9. Chunk 9 (1013-1016)
replace_lines(1013, 1016, """                ("01", "Yêu thương bản thân", "Hãy đặt mình lên hàng đầu, chăm sóc tâm hồn mình trước khi muốn bao bọc bất kỳ ai khác."),
                ("02", "Gỡ bỏ lớp mặt nạ mạnh mẽ", "Sự mạnh mẽ thực sự nằm ở chỗ bạn dám thừa nhận mình đang yếu đuối. Hãy cho phép mình được khóc, được cần giúp đỡ."),
                ("03", "Nghệ thuật giao tiếp", "Hãy dùng sự nhạy bén của số 2 để 'dự đoán trước nhân quả' trong lời nói của mình. Hãy dùng sự dịu dàng có trí tuệ để phá vỡ vòng lặp mâu thuẫn."),
                ("04", "Thanh lọc (Năm số 9)", "Đừng sợ hãi sự xáo trộn, đó là lúc vũ trụ đang giúp bạn dọn dẹp để bước vào Đỉnh cao số 1 với một tâm thế tự do nhất."),""")

with open(file_path, "w", encoding="utf-8") as f:
    f.writelines(lines)

print("Finished fixing leftover texts.")
