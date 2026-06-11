import os

file_path = "Pdf create/build_vietnamese_report_pdf.py"
with open(file_path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Constants
content = content.replace(
    'OUTPUT = os.path.join(PDF_FILES_DIR, "LE_HOANG_MY_836_VietHoa_ClowCat.pdf")',
    'OUTPUT = os.path.join(PDF_FILES_DIR, "NGO_THI_DUONG_788_VietHoa_ClowCat.pdf")'
)

content = content.replace(
    'os.path.join(BASE_DIR, "Le Hoang My.jpg"),',
    'os.path.join(BASE_DIR, "NGO THI DUONG.jpg"),\n    os.path.join(BASE_DIR, "Le Hoang My.jpg"),'
)

# 2. Update cover name & date
content = content.replace('customer_name = "Lê Hoàng Mỹ"', 'customer_name = "Ngô Thị Dương"')
content = content.replace('customer_date = "03/08/2003"', 'customer_date = "20/08/1991"')
content = content.replace('Lê Hoàng Mỹ · 03/08/2003', 'Ngô Thị Dương · 20/08/1991')

# 3. Update Core Indices
old_indices = """    core_indices = [
        ("Đường đời (Life Path)", "7", "Con đường của tri thức và sự trưởng thành thông qua trải nghiệm. Mỹ không bao giờ chấp nhận những giá trị hời hợt; bạn sinh ra để đào sâu, phân tích và tìm kiếm bản chất của mọi sự vật."),
        ("Sứ mệnh (Destiny)", "1", "Sinh ra để trở thành người dẫn đầu. Bạn mang trọng trách tiên phong, khai phá những con đường mới và truyền cảm hứng độc lập cho những người xung quanh."),
        ("Linh hồn (Soul Urge)", "4", "Sâu thẳm bên trong, bạn khao khát một nền tảng vững chắc, trật tự và sự an toàn. Bạn cảm thấy bình an nhất khi cuộc sống được tổ chức rõ ràng và có thể kiểm soát."),
        ("Nhân cách (Personality)", "6", "Thế giới nhìn nhận bạn như một người ấm áp, trách nhiệm và đầy tình thương. Bạn tỏa ra năng lượng của một người sẵn sàng che chở và chăm sóc cho người khác."),
        ("Thái độ (Attitude)", "2", "Khi đối mặt với một tình huống mới, phản xạ đầu tiên của bạn là tìm kiếm sự hòa hợp, nhượng bộ và tránh né xung đột tối đa."),
        ("Trưởng thành (Maturity)", "8", "Càng lớn tuổi, bạn càng được thôi thúc để làm chủ thế giới vật chất, tài chính và quyền lực. Bài học lớn nhất là cân bằng giữa tham vọng và đạo đức."),
        ("Ngày sinh (Birth Day)", "3", "Bạn sở hữu sự sáng tạo bẩm sinh, khả năng biểu đạt cảm xúc và niềm vui sống lan tỏa. Lời nói và nụ cười là vũ khí mạnh nhất của bạn."),
    ]"""

new_indices = """    core_indices = [
        ("Đường đời (Life Path)", "3", "Trở thành người truyền đạt và sáng tạo"),
        ("Sứ mệnh (Destiny)", "8", "Bài học về sự điều hành, quyền lực và vật chất"),
        ("Linh hồn (Soul Urge)", "6", "Khao khát được yêu thương và chăm sóc gia đình"),
        ("Nhân cách (Personality)", "11/2", "Một tâm hồn nhạy bén, đầy cảm hứng và trực giác"),
        ("Thái độ (Attitude)", "1", "Độc lập, quyết đoán và tự chủ trong phản ứng đầu tiên"),
        ("Trưởng thành (Maturity)", "11/2", "Sự thức tỉnh tâm linh và khả năng hòa giải giai đoạn chín muồi"),
        ("Ngày sinh (Birth Day)", "2", "Khả năng lắng nghe, thấu cảm và nhạy bén bẩm sinh"),
    ]"""
content = content.replace(old_indices, new_indices)

# 4. Update Core Indices Analysis
old_analysis = """        P("<b>• Chỉ số Đường đời 7 & Sứ mệnh 1:</b> Mỹ thân mến, đây là một sự kết hợp đầy mâu thuẫn nhưng cực kỳ mạnh mẽ. Số 7 kéo bạn vào thế giới của tư duy sâu sắc, thích chiêm nghiệm và đôi khi muốn tách biệt. Nhưng Sứ mệnh 1 lại ép bạn phải đứng lên, phải dẫn đầu và không được phép trốn tránh. Bạn thường xuyên cảm thấy sự giằng xé nội tâm: nửa muốn lùi lại quan sát, nửa lại bị thôi thúc phải nắm lấy quyền kiểm soát.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Chỉ số Linh hồn 4 & Nhân cách 6:</b> Sự mâu thuẫn tiếp tục lặp lại ở thế giới nội tâm và biểu hiện bên ngoài. Bạn tỏ ra là một người ấm áp, bao dung (số 6), khiến người khác muốn dựa dẫm. Nhưng sâu thẳm (số 4), bạn lại cực kỳ nguyên tắc, rập khuôn và khao khát một sự an toàn tuyệt đối. Sự lệch pha này khiến bạn dễ rơi vào trạng thái 'ôm rơm rặm bụng' – bề ngoài nhận giúp đỡ, nhưng bên trong lại bực bội vì mọi thứ không theo trật tự của mình.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Chỉ số Ngày sinh 3 & Thái độ 2:</b> Đây là điểm sáng bù đắp cho sự cứng nhắc của các chỉ số trên. Bạn có sự duyên dáng (số 3) và phản ứng nhún nhường (số 2) khi mới tiếp xúc. Nhưng Mentor cảnh báo: Đừng để vẻ ngoài 'dĩ hòa vi quý' này trở thành chiếc mặt nạ che đậy sự bảo thủ bên trong.", "Body"),"""

new_analysis = """        P("<b>• Chỉ số Đường đời 3:</b> Dương thân mến, con số 3 không phải là những gì bạn đã có sẵn khi sinh ra, mà là con người bạn phải trở thành trong kiếp sống này. Bạn mang sứ mệnh của một người truyền cảm hứng thông qua ngôn từ và sự sáng tạo. Ưu điểm lớn nhất của bạn là khiếu hài hước và khả năng giao tiếp. Tuy nhiên, tôi phải cảnh báo: Năng lượng số 3 rất dễ bị phân tán. Nếu bạn để suy nghĩ rời rạc, không có kỷ luật, bạn sẽ chỉ là một 'người nói nhiều' mà không tạo ra giá trị thực thụ.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Chỉ số Sứ mệnh 8:</b> Đây là con số của sự điều hành và quản lý tiền bạc. Cuộc đời sẽ đặt bạn vào những tình huống để học cách làm chủ vật chất. Hãy nhớ rằng, quyền lực phải đi đôi với luật nhân quả. Tư duy 'win-win' là chìa khóa duy nhất để bạn giữ được sự hưng thịnh bền vững.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Chỉ số Linh hồn 6:</b> Sâu thẳm bên trong, bạn hạnh phúc nhất khi được bao bọc gia đình. Nhưng hãy cẩn trọng, con số 6 của bạn rất dễ biến tình thương thành sự áp đặt tư duy. Đừng bắt người thân phải sống theo 'kịch bản tốt đẹp' mà bạn tự vẽ ra.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Chỉ số Nhân cách 11/2 & Ngày sinh 2:</b> Thế giới nhìn nhận bạn như một người có trực giác rất cao. Bạn có 'vũ khí' là sự lắng nghe và thấu hiểu những điều không lời. Đây là nền tảng để bạn kết nối sâu sắc với mọi người xung quanh.", "Body"),"""
content = content.replace(old_analysis, new_analysis)

# 5. Birth Grid
old_grid = """        rows = [
            [[("3", red), ("3", red), ("3", blue)], [("6", blue)], [("X", red)]],
            [[("2", red)], [("5", blue), ("5", blue)], [("8", red), ("8", blue)]],
            [[("1", blue)], [("4", blue)], [("7", blue), ("7", blue)]],
        ]"""
new_grid = """        rows = [
            [[("3", blue)], [("6", blue), ("6", blue)], [("9", red), ("9", red), ("9", blue)]],
            [[("2", red), ("2", blue)], [("5", blue), ("5", blue)], [("8", red), ("8", blue)]],
            [[("1", red), ("1", red)], [("4", blue)], [("7", blue), ("7", blue)]],
        ]"""
content = content.replace(old_grid, new_grid)

# 6. Birth Grid Analysis
old_grid_analysis = """        P("Lưới bên trái được bê theo map viết tay của Lê Hoàng Mỹ. Những ô có tô vàng cho thấy năng lượng được nhấn mạnh trong buổi phân tích, còn dấu X là vùng cần bù theo cách luận giải riêng của Clow Cat.", "BodySmall"),
    ]

    items = [
        (True, "Đường đời 7 · Người kiếm tìm chân lý", "Đào sâu, phân tích và tìm kiếm bản chất. Sở hữu trí tuệ sắc sảo, giỏi công nghệ và trực giác tâm linh nhạy bén."),
        (False, "Nợ nghiệp 16/7 & 19/1", "Mang theo những thử thách lớn về việc phá bỏ cái tôi kiêu ngạo (16/7) và học cách không lạm quyền, ích kỷ (19/1)."),
        (False, "Chỉ số Thái độ 2", "Phản ứng đầu tiên thường là dĩ hòa vi quý, nhường nhịn và tránh né xung đột, tạo cảm giác dễ chịu cho người đối diện."),
    ]"""

new_grid_analysis = """        P("Lưới bên trái được bê theo map viết tay của Ngô Thị Dương. Những ô có tô vàng cho thấy năng lượng được nhấn mạnh trong buổi phân tích, còn dấu X là vùng cần bù theo cách luận giải riêng của Clow Cat.", "BodySmall"),
    ]

    items = [
        (True, "Mũi tên Cân bằng cảm xúc (2-5-8)", "Sự quá tải rung động: Với việc sở hữu tới 5 con số 2 và 3 con số 8, bạn đang mang một gánh nặng cảm xúc khổng lồ. 5 con số 2 khiến bạn cực kỳ nhạy cảm, dễ bị tổn thương và hay kịch tính hóa vấn đề."),
        (False, "Mũi tên Trí tuệ (3-6-9)", "Bạn có óc sáng tạo và lý tưởng lớn. Nhưng Mentor nhắc bạn: 'Tình thương phải đi kèm trí tuệ'. Nếu giúp đỡ người khác sai cách, bạn vô tình làm tổn hao công đức của chính mình."),
        (False, "Mũi tên Tâm linh (3-5-7)", "Với 2 con số 7, cuộc đời bạn không thiếu những bài học thực tế đau đớn để chiêm nghiệm. Đặc biệt, những bài học ngầm về gia đình hiện tại là sự sắp đặt của vũ trụ để bạn gọt giũa cái tôi."),
    ]"""
content = content.replace(old_grid_analysis, new_grid_analysis)

# 7. Karmic Debt
old_karmic = """    story.extend([
        P("<b>• Kết quả:</b> Có Nợ nghiệp 16/7 và 19/1.", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Lời bình từ Mentor:</b> Mỹ mang trên vai một hành trang khá nặng từ kiếp trước. Nợ 16/7 đòi hỏi bạn phải trải qua sự sụp đổ của cái tôi kiêu ngạo để chạm đến sự tỉnh thức. Bạn sẽ thấy nhiều thứ mình cất công xây dựng bỗng chốc tan vỡ một cách khó hiểu. Nợ 19/1 nhắc nhở về sự lạm quyền và ích kỷ trong quá khứ; kiếp này bạn phải học cách tự lực cánh sinh mà không chà đạp lên người khác. Đừng oán trách nghịch cảnh, đó là lò luyện đan để linh hồn bạn thăng cấp.", "Body"),
    ])"""
new_karmic = """    story.extend([
        P("<b>• Kết quả:</b> Không có nợ nghiệp (Ø).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Lời bình từ Mentor:</b> Bạn là 'học sinh giỏi của kiếp trước'. Bạn bước vào kiếp này với hành trang trong sạch, không phải trả nợ cũ. Đây là đặc ân để bạn toàn tâm toàn ý tập trung hoàn thành sứ mệnh số 8 và số 3 mà không bị kéo chân bởi những oan khiên quá khứ.", "Body"),
    ])"""
content = content.replace(old_karmic, new_karmic)

# 8. Life Cycles
old_cycles = """    story.extend([
        P("Dưới đây là nội dung trích nguyên văn từ sách \"Chuyển hóa cuộc đời vươn tới thành công\" của Michelle Buchanan dành cho các chu kỳ của bạn:", "Body"),
        Spacer(1, 3 * mm),
        P("<b>Chu kỳ 1: Tuổi trẻ - Chỉ số 8 (Từ 0 đến 28 tuổi)</b>", "Body"),
        P("\"Đây là giai đoạn bạn được yêu cầu phải làm chủ thế giới vật chất. Trong chu kỳ này, bạn sẽ học các bài học về sự độc lập, quyền lực và kiểm soát. Bạn có khả năng thu hút sự thành công về tài chính và địa vị xã hội nếu bạn biết nỗ lực và kiên trì...\"", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Chu kỳ 2: Trưởng thành - Chỉ số 3 (Từ 29 đến 55 tuổi)</b>", "Body"),
        P("\"Giai đoạn này mang đến cơ hội để bạn tỏa sáng, thể hiện bản thân và phát huy tối đa sức sáng tạo. Bạn sẽ học cách giao tiếp hiệu quả, sống vui vẻ và truyền cảm hứng cho người khác...\"", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Chu kỳ 3: Thông tuệ - Chỉ số 2 (Từ 56 tuổi trở đi)</b>", "Body"),
        P("\"Giai đoạn cuối đời mang năng lượng của sự bình yên và trực giác. Đây là lúc bạn tận hưởng thành quả từ sự thấu cảm và chia sẻ. Bạn sẽ tìm thấy niềm vui trong những điều giản đơn, sống chậm lại và trở thành điểm tựa tinh thần...\"", "Body"),
        Spacer(1, 4 * mm),
        P("<b>Lưu ý hiện tại:</b> Mỹ đang ở Năm cá nhân số 1 (năm 2024-2025) – năm khởi đầu của một chu kỳ 9 năm mới. Kết hợp với việc đang ở cuối Chu kỳ 1 (số 8), đây là giai đoạn mang tính bước ngoặt. Bạn buộc phải rũ bỏ những nền tảng cũ kỹ để thiết lập một trật tự mới cho bản thân, đặc biệt là trong sự nghiệp và định hướng cá nhân.", "Body"),
    ])"""

new_cycles = """    story.extend([
        P("Dưới đây là nội dung trích nguyên văn từ sách \"Chuyển hóa cuộc đời vươn tới thành công\" của Michelle Buchanan dành cho các chu kỳ của bạn:", "Body"),
        Spacer(1, 3 * mm),
        P("<b>Chu kỳ 1: Tuổi trẻ - Chỉ số 8 (Từ 0 đến 33 tuổi)</b>", "Body"),
        P("\"Đây là giai đoạn bạn được yêu cầu phải làm chủ thế giới vật chất. Trong chu kỳ này, bạn sẽ học các bài học về sự độc lập, quyền lực và kiểm soát. Bạn có khả năng thu hút sự thành công về tài chính và địa vị xã hội nếu bạn biết nỗ lực và kiên trì...\"", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Chu kỳ 2: Trưởng thành - Chỉ số 2 (Từ 34 đến 60 tuổi)</b>", "Body"),
        P("\"Giai đoạn này đòi hỏi sự kiên nhẫn, hợp tác và nhạy cảm. Đây là lúc cái 'Tôi' cần được hạ xuống để nhường chỗ cho sự kết nối và hòa hợp. Bạn sẽ thấy mình đóng vai trò là người hòa giải, học cách lắng nghe và thấu hiểu...\"", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Chu kỳ 3: Thông tuệ - Chỉ số 2 (Từ 61 tuổi trở đi)</b>", "Body"),
        P("\"Giai đoạn cuối đời tiếp tục mang năng lượng của sự bình yên và trực giác. Đây là lúc bạn tận hưởng thành quả từ sự thấu cảm và chia sẻ. Bạn sẽ tìm thấy niềm vui trong những điều giản đơn, sống chậm lại và trở thành điểm tựa tinh thần...\"", "Body"),
        Spacer(1, 4 * mm),
        P("<b>Lưu ý hiện tại:</b> Dương đang ở Năm cá nhân số 9 (năm 2024-2025) – năm cuối cùng của Chu kỳ 1. Mentor hiểu vì sao bạn cảm thấy 'te tua' và mệt mỏi. Đây là năm để bạn 'chốt sổ' quá khứ, dọn dẹp những tàn dư cũ (từ tư duy đến các mối quan hệ không còn phù hợp) để chuẩn bị cho một chu kỳ mới đầy ánh sáng.", "Body"),
    ])"""
content = content.replace(old_cycles, new_cycles)

# 9. Pyramid Data
content = content.replace('nodes = ["8", "3", "2", "11/2", "5", "8", "4"]', 'nodes = ["8", "2", "2", "1", "4", "5", "1"]')
content = content.replace('labels = ["(2023)", "(2032)", "(2041)", "(2050)", "29T", "38T", "47T", "56T"]', 'labels = ["(2024)", "(2033)", "(2042)", "(2051)", "33T", "42T", "51T", "60T"]')
content = content.replace('challenge_items = ["5", "1", "4", "5"]', 'challenge_items = ["6", "0", "3", "6"]')

old_stages = """        P("<b>• Giai đoạn 1 (Năm 2023):</b> Đỉnh cao 11/2 (Thức tỉnh tâm linh, trực giác nhạy bén) – Thách thức 5 (Sự bất ổn, bốc đồng và khao khát tự do quá mức).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 2 (Năm 2032):</b> Đỉnh cao 5 (Sự thay đổi lớn, tự do, trải nghiệm mới) – Thách thức 1 (Bài học về sự độc lập, vượt qua sự tự ti hoặc thói độc đoán).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 3 (Năm 2041):</b> Đỉnh cao 8 (Quyền lực, tài chính, thành tựu vật chất) – Thách thức 4 (Sự cứng nhắc, thiếu kỷ luật hoặc những khó khăn về nền tảng vật chất).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 4 (Năm 2050):</b> Đỉnh cao 4 (Xây dựng nền tảng vững chắc, trật tự) – Thách thức 5 (Tiếp tục bài học về việc quản lý sự xáo trộn và cám dỗ).", "Body"),"""

new_stages = """        P("<b>• Giai đoạn 1 (Năm 2024):</b> Đỉnh cao 1 (Khởi đầu mới, độc lập) – Thách thức 6 (Gánh nặng trách nhiệm và sự áp đặt trong gia đình).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 2 (Năm 2033):</b> Đỉnh cao 4 (Xây dựng nền tảng, kỷ luật) – Thách thức 0 (Thử thách tâm linh tổng thể, đòi hỏi sự thức tỉnh cao độ).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 3 (Năm 2042):</b> Đỉnh cao 5 (Tự do, trải nghiệm, thay đổi) – Thách thức 3 (Kiểm soát lời nói và sự phân tán năng lượng).", "Body"),
        Spacer(1, 1.5 * mm),
        P("<b>• Giai đoạn 4 (Năm 2051):</b> Đỉnh cao 1 (Tái khẳng định vị thế cá nhân) – Thách thức 6 (Sự cân bằng giữa cái tôi và sự phụng sự gia đình).", "Body"),"""
content = content.replace(old_stages, new_stages)

# 10. Healing Message
content = content.replace("Lộ trình cá nhân hóa dành cho Lê Hoàng Mỹ", "Lộ trình cá nhân hóa dành cho Ngô Thị Dương")

old_healing = """        P("Lê Hoàng Mỹ thân mến, sự kết hợp giữa năng lượng tìm kiếm chân lý của số 7 và khát vọng thành công của số 8 mời gọi bạn trở thành một 'Chuyên gia thông tuệ có sức ảnh hưởng'.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>1. Hạ cái tôi 16/7 xuống để được hạnh phúc:</b> Bạn rất thông minh và sắc sảo, nhưng đừng dùng trí tuệ đó làm vũ khí sát thương người khác. Nợ nghiệp 16/7 sẽ liên tục giáng xuống những bài học đau đớn nếu bạn còn giữ thái độ ngạo mạn. Hãy học cách chấp nhận sự bất toàn của thế giới và của chính mình.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>2. Cân bằng giữa Tham vọng (8) và Nguyên tắc (4):</b> Bạn muốn có thành tựu lớn (Sứ mệnh 8) nhưng lại e dè sự mạo hiểm và khư khư giữ lấy vùng an toàn (Linh hồn 4). Sự mâu thuẫn này là gốc rễ của những cơn bực dọc vô cớ. Hãy rèn luyện sự linh hoạt, dám phá vỡ những quy tắc khô khan để đón nhận cơ hội mới.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>3. Hãy cẩn trọng với lời nói (Đỉnh cao 5 & Thách thức 5):</b> Trải qua những rạn nứt trong các mối quan hệ, bạn cần hiểu rằng tự do không có nghĩa là buông thả trong phát ngôn hay hành động. Hãy dùng trực giác của Nhân cách 11/2 để thấu hiểu người khác trước khi đưa ra phán xét.", "Body"),"""

new_healing = """        P("Ngô Thị Dương thân mến, tôi viết những dòng này cho bạn không phải như một nhà toán học, mà như một người đồng hành trên con đường chữa lành linh hồn.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Yêu thương bản thân không phải là ích kỷ:</b> Với 5 con số 2, bạn rất dễ hy sinh đến kiệt quệ rồi lại oán trách vì không nhận được sự đền đáp tương xứng. Hãy nhớ: Bạn không thể rót nước từ một chiếc bình rỗng. Hãy đặt mình lên hàng đầu, chăm sóc tâm hồn mình trước khi muốn bao bọc bất kỳ ai khác.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Gỡ bỏ lớp mặt nạ mạnh mẽ:</b> Bạn luôn cố gắng truyền thông với thế giới (và cả với chồng) rằng mình tuyệt đối ổn, tuyệt đối mạnh mẽ. Nhưng sự mạnh mẽ thực sự nằm ở chỗ bạn dám thừa nhận mình đang yếu đuối. Hãy cho phép mình được khóc, được cần giúp đỡ.", "Body"),
        Spacer(1, 2 * mm),
        P("<b>Nghệ thuật giao tiếp với chồng:</b> Bạn mang năng lượng Đường đời 3 (ngôn từ) và Ngày sinh 2 (thấu hiểu). Đừng dùng khả năng ăn nói của số 3 để chỉ trích hay áp đặt. Thay vào đó, hãy dùng sự nhạy bén của số 2 để 'dự đoán trước nhân quả' trong lời nói của mình. Hãy dùng sự dịu dàng có trí tuệ để phá vỡ vòng lặp mâu thuẫn.", "Body"),"""
content = content.replace(old_healing, new_healing)

with open(file_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated build_vietnamese_report_pdf.py for Ngo Thi Duong successfully!")
