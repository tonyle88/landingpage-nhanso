import os

file_path = "Pdf create/build_vietnamese_report_pdf.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# Find the start of def build():
build_start = content.find("def build():")
if build_start != -1:
    content = content[:build_start]

# Change constants at the top
content = content.replace('OUTPUT = os.path.join(PDF_FILES_DIR, "TRAN_GIA_KHANH_841_VietHoa_ClowCat.pdf")', 'OUTPUT = os.path.join(PDF_FILES_DIR, "NGO_THI_DUONG_788_VietHoa_ClowCat.pdf")')
content = content.replace('os.path.join(BASE_DIR, "Tran Gia Khanh.jpg")', 'os.path.join(BASE_DIR, "NGO THI DUONG.jpg")')
content = content.replace('customer_name = "Trần Gia Khánh"', 'customer_name = "Ngô Thị Dương"')
content = content.replace('customer_date = "13/07/1998"', 'customer_date = "20/08/1991"')

# Also update the grid logic (it's around line 324)
old_grid = """        rows = [
            [[("3", blue), ("3", blue)], [("6", blue)], [("X", red)]],
            [[("2", red), ("2", red)], [("5", blue), ("5", blue), ("5", blue), ("5", blue)], [("8", blue), ("8", blue)]],
            [[("1", red), ("1", red), ("1", red)], [("X", red)], [("7", blue), ("7", blue), ("7", blue)]],
        ]"""
new_grid = """        rows = [
            [[("3", blue)], [("6", blue), ("6", blue)], [("9", red), ("9", red), ("9", blue)]],
            [[("2", red), ("2", blue)], [("5", blue), ("5", blue)], [("8", red), ("8", blue)]],
            [[("1", red), ("1", red)], [("4", blue)], [("7", blue), ("7", blue)]],
        ]"""
content = content.replace(old_grid, new_grid)

# Update pyramid nodes
content = content.replace('nodes = ["8", "3", "2", "11/2", "5", "8", "4"]', 'nodes = ["8", "2", "2", "1", "4", "5", "1"]')
content = content.replace('labels = ["(2023)", "(2032)", "(2041)", "(2050)", "29T", "38T", "47T", "56T"]', 'labels = ["(2024)", "(2033)", "(2042)", "(2051)", "33T", "42T", "51T", "60T"]')
content = content.replace('challenge_items = ["5", "1", "4", "5"]', 'challenge_items = ["6", "0", "3", "6"]')


new_build = """def build():
    os.makedirs(PDF_FILES_DIR, exist_ok=True)
    prepare_cover_background()
    handwritten_map = find_handwritten_map()
    doc = SimpleDocTemplate(
        OUTPUT,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
    )
    story = []

    story.append(Spacer(1, 1))
    story.append(PageBreak())

    # SECTION 1
    story.append(SectionBand("01", "Bức Tranh Tính Cách (7 Chỉ Số Cốt Lõi)", "Ngô Thị Dương · 20/08/1991 · Chuyên gia đồng hành: Lê Chí Cường"))
    story.append(Spacer(1, 7 * mm))
    indicators = [
        ("Đường đời (Life Path)", "3", "Trở thành người truyền đạt và sáng tạo. Bạn mang sứ mệnh của một người truyền cảm hứng thông qua ngôn từ và sự sáng tạo."),
        ("Sứ mệnh (Destiny)", "8", "Bài học về sự điều hành, quyền lực và vật chất. Cuộc đời sẽ đặt bạn vào những tình huống để học cách làm chủ vật chất."),
        ("Linh hồn (Soul Urge)", "6", "Khao khát được yêu thương và chăm sóc gia đình. Sâu thẳm bên trong, bạn hạnh phúc nhất khi được bao bọc gia đình."),
        ("Nhân cách (Personality)", "11/2", "Một tâm hồn nhạy bén, đầy cảm hứng và trực giác. Thế giới nhìn nhận bạn như một người có trực giác rất cao."),
        ("Thái độ (Attitude)", "1", "Độc lập, quyết đoán và tự chủ trong phản ứng đầu tiên."),
        ("Ngày sinh", "2", "Khả năng lắng nghe, thấu cảm và nhạy bén bẩm sinh."),
        ("Trưởng thành (Maturity)", "11/2", "Sự thức tỉnh tâm linh và khả năng hòa giải giai đoạn chín muồi."),
    ]
    for row in indicators:
        story.append(indicator(*row))
        story.append(Spacer(1, 3.8 * mm))
    story.append(PageBreak())

    # SECTION 2
    story.append(SectionBand("02", "Giải Mã Nội Tâm Qua Biểu Đồ Ngày Sinh", "Lưới năng lượng và các mũi tên phẩm chất"))
    story.append(Spacer(1, 8 * mm))
    left = [
        P("<b>Lưới biểu đồ ngày sinh</b>", "H2"),
        BirthGrid(width=76 * mm),
    ]
    right = [
        P("<b>Biểu đồ theo map viết tay</b>", "H2"),
        P("Lưới bên trái được bê theo map viết tay của Ngô Thị Dương. Đây là một biểu đồ cực kỳ hiếm gặp khi không khuyết bất kỳ con số nào. Bạn đến với thế giới này với một bộ công cụ đầy đủ, không thiếu sót. Tuy nhiên, sự 'đặc quánh' của các con số tạo ra những dòng năng lượng vô cùng áp lực.", "BodySmall"),
    ]
    two_col = Table(
        [[card(left, width=82 * mm), Spacer(4 * mm, 1), card(right, width=84 * mm)]],
        colWidths=[82 * mm, 4 * mm, 84 * mm],
        hAlign="LEFT",
    )
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(two_col)
    story.append(Spacer(1, 8 * mm))
    story.append(
        checklist(
            [
                (True, "Mũi tên Cân bằng cảm xúc (2-5-8)", "Sự quá tải rung động: Với 5 con số 2 và 3 con số 8, bạn mang gánh nặng cảm xúc khổng lồ. Rất nhạy cảm, dễ tổn thương và hay kịch tính hóa vấn đề."),
                (False, "Mũi tên Trí tuệ (3-6-9)", "Bạn có óc sáng tạo và lý tưởng lớn. Nếu giúp đỡ người khác sai cách, bạn không những không giúp được họ mà còn vô tình làm tổn hao công đức."),
                (False, "Mũi tên Tâm linh (3-5-7)", "Với 2 con số 7, cuộc đời không thiếu những bài học thực tế đau đớn để chiêm nghiệm. Đặc biệt những bài học ngầm về gia đình hiện tại là sự sắp đặt để bạn gọt giũa cái tôi."),
            ]
        )
    )
    story.append(PageBreak())

    # SECTION 3 - HANDWRITTEN MAP
    if handwritten_map:
        story.append(SectionBand("03", "Map Viết Tay Cá Nhân", "Bản ghi chú trực quan trong buổi phân tích"))
        story.append(Spacer(1, 8 * mm))
        story.append(HandwrittenMapPage(handwritten_map))
        story.append(PageBreak())

    # SECTION 4 - KARMIC DEBT
    story.append(SectionBand("04", "Chỉ Số Nợ Nghiệp", "Những điểm cần chuyển hóa trong hành trình hiện tại"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        card(
            [
                P("<b>Không có nợ nghiệp (Ø)</b>", "H2"),
                P("Bạn là 'học sinh giỏi của kiếp trước'. Bạn bước vào kiếp này với hành trang trong sạch, không phải trả nợ cũ. Đây là đặc ân để bạn toàn tâm toàn ý tập trung hoàn thành sứ mệnh số 8 và số 3 mà không bị kéo chân bởi những oan khiên quá khứ.", "Body"),
            ]
        )
    )
    story.append(Spacer(1, 9 * mm))
    story.append(PageBreak())

    # SECTION 5 - LIFE CYCLES
    story.append(SectionBand("05", "Ba Chu Kỳ Cuộc Đời Lớn", "Nền hành trình lớn của Ngô Thị Dương"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        step_blocks(
            [
                ("Chu kỳ 1", "8", "Từ 0 đến 33 tuổi: Bạn được yêu cầu làm chủ thế giới vật chất, học sự độc lập, quyền lực và kiểm soát. Bạn có khả năng thu hút thành công tài chính nếu biết kiên trì."),
                ("Chu kỳ 2", "2", "Từ 34 đến 60 tuổi: Đòi hỏi sự kiên nhẫn, hợp tác và nhạy cảm. Đây là lúc cái 'Tôi' cần hạ xuống để nhường chỗ cho sự kết nối, hòa hợp và thấu hiểu cảm xúc người khác."),
                ("Chu kỳ 3", "2", "Từ 61 tuổi trở đi: Mang năng lượng bình yên và trực giác. Bạn tìm thấy niềm vui trong điều giản đơn, sống chậm lại và trở thành điểm tựa tinh thần cho người xung quanh."),
            ]
        )
    )
    story.append(Spacer(1, 9 * mm))
    story.append(
        card(
            [
                P("Lưu ý hiện tại", "Kicker"),
                P("Năm Cá Nhân Số 9 (2024-2025)", "H1"),
                P("Dương đang ở Năm cá nhân số 9 – năm cuối cùng của Chu kỳ 1. Đây là năm để bạn 'chốt sổ' quá khứ, dọn dẹp những tàn dư cũ (từ tư duy đến các mối quan hệ không còn phù hợp) để chuẩn bị cho một chu kỳ mới đầy ánh sáng.", "Body"),
            ],
            fill=colors.Color(217 / 255, 78 / 255, 31 / 255, 0.18),
        )
    )
    story.append(PageBreak())

    # SECTION 6 - PEAKS & CHALLENGES
    story.append(SectionBand("06", "Bốn Đỉnh Cao Và Thách Thức", "Các giai đoạn phát triển và chỉ số thách thức"))
    story.append(Spacer(1, 8 * mm))
    story.append(P("4 Đỉnh Cao & Chỉ Số Thách Thức", "H2"))
    story.append(
        step_blocks(
            [
                ("Đỉnh cao 1", "1", "Năm 2024, tuổi 33: Khởi đầu mới, độc lập. Thách thức 6 là gánh nặng trách nhiệm và sự áp đặt trong gia đình."),
                ("Đỉnh cao 2", "4", "Năm 2033, tuổi 42: Xây dựng nền tảng, kỷ luật. Thách thức 0 là thử thách tâm linh tổng thể, đòi hỏi sự thức tỉnh cao độ."),
                ("Đỉnh cao 3", "5", "Năm 2042, tuổi 51: Tự do, trải nghiệm, thay đổi. Thách thức 3 là kiểm soát lời nói và sự phân tán năng lượng."),
                ("Đỉnh cao 4", "1", "Năm 2051, tuổi 60: Tái khẳng định vị thế cá nhân. Thách thức 6 là sự cân bằng giữa cái tôi và sự phụng sự gia đình."),
            ]
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(PythagorasPyramid())
    story.append(PageBreak())

    # SECTION 7 - HEALING MESSAGE
    story.append(SectionBand("07", "Thông Điệp Chữa Lành", "Lộ trình cá nhân hóa dành cho Ngô Thị Dương"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        card(
            [
                P("Ngô Thị Dương thân mến, tôi viết những dòng này cho bạn không phải như một nhà toán học, mà như một người đồng hành trên con đường chữa lành linh hồn.", "Body"),
                P("Bạn mang năng lượng Đường đời 3 (ngôn từ) và Ngày sinh 2 (thấu hiểu). Đừng dùng khả năng ăn nói của số 3 để chỉ trích hay áp đặt. Thay vào đó, hãy dùng sự nhạy bén của số 2 để 'dự đoán trước nhân quả' trong lời nói của mình.", "Body"),
            ],
            fill=colors.Color(245 / 255, 193 / 255, 150 / 255, 0.10),
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(P("Lộ Trình Hành Động", "H2"))
    story.append(
        step_blocks(
            [
                ("01", "Yêu thương bản thân", "Hãy đặt mình lên hàng đầu, chăm sóc tâm hồn mình trước khi muốn bao bọc bất kỳ ai khác. Bạn không thể rót nước từ một chiếc bình rỗng."),
                ("02", "Gỡ bỏ lớp mặt nạ mạnh mẽ", "Sự mạnh mẽ thực sự nằm ở chỗ bạn dám thừa nhận mình đang yếu đuối. Hãy cho phép mình được khóc, được cần giúp đỡ."),
                ("03", "Nghệ thuật giao tiếp", "Trước khi thốt ra một lời gây tổn thương cho chồng, hãy dừng lại một nhịp. Hãy dùng sự dịu dàng có trí tuệ để phá vỡ vòng lặp mâu thuẫn."),
                ("04", "Thanh lọc (Năm số 9)", "Đừng sợ hãi sự xáo trộn, đó là lúc vũ trụ đang giúp bạn dọn dẹp để bước vào Đỉnh cao số 1 với một tâm thế tự do nhất."),
            ]
        )
    )
    story.append(Spacer(1, 12 * mm))
    story.append(card([P("“Yêu thương bản thân không phải là ích kỷ, đó là sự khởi đầu của mọi sự chữa lành.”", "Quote")], fill=colors.Color(217 / 255, 78 / 255, 31 / 255, 0.20)))
    story.append(Spacer(1, 11 * mm))
    story.append(
        kv_table(
            [
                ("Người đồng hành", "Lê Chí Cường"),
                ("Kênh liên hệ", "Zalo / Facebook: Clow Cat Patronus"),
            ],
            widths=(50 * mm, 120 * mm),
        )
    )

    doc.build(story, onFirstPage=cover_bg, onLaterPages=bg)

if __name__ == "__main__":
    build()
"""

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content + new_build)

print("Re-generated build function completely!")
