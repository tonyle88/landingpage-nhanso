import os

# Source-of-truth layout skeleton for the Clow Cat PDF.
# Use this file as the fixed visual/form reference before filling customer data
# into `build_vietnamese_report_pdf.py`.

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import Flowable, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

from build_vietnamese_report_pdf import (
    BASE_DIR,
    CARD,
    CONTENT_W,
    COVER_BG_A4,
    GOLD,
    HERO_BG,
    INK,
    LINE,
    LOGO,
    MUTED,
    ORANGE,
    OUTPUT_DIR,
    PDF_FILES_DIR,
    SUNBURST,
    TEAL_DARKEST,
    WHITE,
    SectionBand,
    bg,
    card,
    prepare_cover_background,
    styles,
)


TEMPLATE_DIR = os.path.join(BASE_DIR, "templates")
TEMPLATE_OUTPUT = os.path.join(TEMPLATE_DIR, "CLOWCAT_KHUNG_SUON_TEMPLATE.pdf")
OUTPUT_COPY = os.path.join(OUTPUT_DIR, "CLOWCAT_KHUNG_SUON_TEMPLATE.pdf")

os.makedirs(TEMPLATE_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


placeholder_style = ParagraphStyle(
    "Placeholder",
    parent=styles["BodySmall"],
    textColor=colors.Color(1, 1, 1, 0.56),
    alignment=TA_CENTER,
)


def P(text, style="BodySmall"):
    return Paragraph(text, styles[style])


def placeholder(text):
    return Paragraph(text, placeholder_style)


def blank_cover_bg(canvas, doc):
    canvas.saveState()
    w, h = A4
    cover_x = 26 * mm
    cover_w = w - 52 * mm
    canvas.setFillColor(TEAL_DARKEST)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.drawImage(COVER_BG_A4, 0, 0, width=w, height=h, mask="auto")

    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.70))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.44))
    canvas.rect(0, 0, w, h * 0.34, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(217 / 255, 78 / 255, 31 / 255, 0.18))
    canvas.circle(w * 0.78, h * 0.72, 52 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(45 / 255, 212 / 255, 191 / 255, 0.10))
    canvas.circle(w * 0.22, h * 0.34, 46 * mm, fill=1, stroke=0)

    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.72))
    canvas.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.32))
    canvas.roundRect(24 * mm, h - 44 * mm, 24 * mm, 24 * mm, 8, fill=1, stroke=1)
    canvas.drawImage(LOGO, 26 * mm, h - 42 * mm, width=20 * mm, height=20 * mm, mask="auto")

    canvas.setFillColor(colors.Color(212 / 255, 168 / 255, 67 / 255, 0.13))
    canvas.setStrokeColor(colors.Color(212 / 255, 168 / 255, 67 / 255, 0.42))
    brand_badge_x = 52 * mm
    brand_badge_y = h - 37 * mm
    brand_badge_w = 64 * mm
    brand_badge_h = 12 * mm
    canvas.roundRect(brand_badge_x, brand_badge_y, brand_badge_w, brand_badge_h, 6, fill=1, stroke=1)
    canvas.setFillColor(SUNBURST)
    canvas.setFont("Arial-Bold", 8)
    canvas.drawCentredString(brand_badge_x + brand_badge_w / 2, brand_badge_y + 4.2 * mm, "CLOW CAT PATRONUS")

    cx = w / 2
    canvas.setFillColor(WHITE)
    canvas.setFont("Arial-Bold", 34)
    canvas.drawCentredString(cx, h - 88 * mm, "HỒ SƠ")
    canvas.setFillColor(SUNBURST)
    canvas.setFont("Arial-Bold", 38)
    canvas.drawCentredString(cx, h - 103 * mm, "NHÂN SỐ HỌC")
    canvas.setFillColor(colors.HexColor("#99F6E4"))
    canvas.setFont("Arial-Bold", 32)
    canvas.drawCentredString(cx, h - 118 * mm, "TOÀN DIỆN")
    canvas.setStrokeColor(colors.Color(45 / 255, 212 / 255, 191 / 255, 0.52))
    canvas.setLineWidth(0.6)
    canvas.line(54 * mm, h - 124 * mm, 156 * mm, h - 124 * mm)

    canvas.setFillColor(SUNBURST)
    canvas.setFont("Arial-Bold", 15.5)
    canvas.drawCentredString(cx, h - 135 * mm, "[TÊN KHÁCH HÀNG] · [NGÀY SINH]")

    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.48))
    canvas.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.26))
    canvas.roundRect(cover_x, h - 168 * mm, cover_w, 25 * mm, 13, fill=1, stroke=1)
    subtitle = Paragraph(
        "Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh<br/>và hành trình phát triển của chính mình.",
        ParagraphStyle("BlankCoverSub", fontName="Arial-Italic", fontSize=13.8, leading=19.5, textColor=WHITE, alignment=TA_CENTER),
    )
    subtitle.wrapOn(canvas, cover_w - 12 * mm, 25 * mm)
    subtitle.drawOn(canvas, cover_x + 6 * mm, h - 162.5 * mm)

    stat_y = h - 198 * mm
    stat_gap = 8 * mm
    stat_w = (cover_w - stat_gap * 2) / 3
    stats = [
        ("7", "CHỈ SỐ CỐT LÕI", colors.HexColor("#FFB06E")),
        ("3", "CHU KỲ CUỘC ĐỜI LỚN", colors.HexColor("#47FFE8")),
        ("4", "ĐỈNH CAO CUỘC ĐỜI", colors.HexColor("#FFE06A")),
    ]
    for i, (num, label, accent) in enumerate(stats):
        x0 = cover_x + i * (stat_w + stat_gap)
        x = x0 + stat_w / 2
        canvas.setFillColor(colors.Color(1, 1, 1, 0.105))
        canvas.setStrokeColor(colors.Color(1, 1, 1, 0.26))
        canvas.roundRect(x0, stat_y - 15 * mm, stat_w, 29 * mm, 10, fill=1, stroke=1)
        canvas.setFillColor(colors.Color(accent.red, accent.green, accent.blue, 0.24))
        canvas.circle(x, stat_y + 0.45 * mm, 7.7 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(colors.Color(accent.red, accent.green, accent.blue, 0.58))
        canvas.circle(x, stat_y + 0.45 * mm, 7.7 * mm, fill=0, stroke=1)
        canvas.setFont("Arial-Bold", 26)
        canvas.setFillColor(accent)
        canvas.drawCentredString(x, stat_y - 0.7 * mm, num)
        canvas.setFillColor(INK)
        canvas.setFont("Arial-Bold", 7.1 if len(label) > 18 else 7.9)
        canvas.drawCentredString(x, stat_y - 12.3 * mm, label)

    table_y = 43 * mm
    canvas.setFillColor(colors.Color(1, 1, 1, 0.082))
    canvas.setStrokeColor(colors.Color(1, 1, 1, 0.24))
    canvas.roundRect(cover_x, table_y, cover_w, 39 * mm, 10, fill=1, stroke=1)
    rows = [
        ("Chuyên gia đồng hành", "[TÊN CHUYÊN GIA]"),
        ("Dịch vụ", "Định hướng bằng Nhân Số Học"),
        ("Gói dịch vụ tư vấn", "Phân Tích Toàn Diện (Gói Toàn Diện Nhất)"),
    ]
    for i, (label, value) in enumerate(rows):
        y = table_y + 29 * mm - i * 11 * mm
        canvas.setFillColor(colors.Color(1, 1, 1, 0.78))
        canvas.setFont("Arial-Bold", 9.4)
        canvas.drawString(cover_x + 7 * mm, y, label)
        canvas.setFillColor(WHITE)
        canvas.setFont("Arial-Bold", 10.4)
        canvas.drawString(cover_x + 62 * mm, y, value)
        if i < 2:
            canvas.setStrokeColor(colors.Color(1, 1, 1, 0.08))
            canvas.line(cover_x + 6 * mm, y - 5 * mm, cover_x + cover_w - 6 * mm, y - 5 * mm)

    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.58))
    canvas.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.16))
    canvas.roundRect(cover_x, 17.5 * mm, cover_w, 11 * mm, 8, fill=1, stroke=1)
    canvas.setFillColor(colors.Color(1, 1, 1, 0.78))
    canvas.setFont("Arial-Bold", 8.8)
    canvas.drawCentredString(cx, 21.1 * mm, "© 2026 Clow Cat Patronus · Được tạo ra với tình yêu và năng lượng tích cực")
    canvas.restoreState()


class BlankBirthGrid(Flowable):
    def __init__(self, width=76 * mm):
        super().__init__()
        self.width = width
        self.height = 55 * mm

    def draw(self):
        c = self.canv
        cell = self.width / 3
        labels = [["3", "6", "9"], ["2", "5", "8"], ["1", "4", "7"]]
        for row in range(3):
            for col in range(3):
                x = col * cell
                y = self.height - (row + 1) * cell * 0.68
                h = cell * 0.68
                c.setFillColor(colors.Color(1, 1, 1, 0.055))
                c.setStrokeColor(colors.Color(1, 1, 1, 0.16))
                c.roundRect(x, y, cell - 1.4, h - 1.4, 7, fill=1, stroke=1)
                c.setFillColor(colors.Color(1, 1, 1, 0.48))
                c.setFont("Arial-Bold", 15)
                c.drawCentredString(x + cell / 2, y + h / 2 - 4, labels[row][col])
        c.setFillColor(MUTED)
        c.setFont("Arial", 6.4)
        c.drawString(0, 1 * mm, "Điền số và màu theo map viết tay của khách.")


class MapPlaceholder(Flowable):
    def __init__(self, width=CONTENT_W, height=218 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(colors.Color(1, 1, 1, 0.055))
        c.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.22))
        c.roundRect(0, 0, self.width, self.height, 14, fill=1, stroke=1)
        c.setFillColor(colors.Color(1, 1, 1, 0.20))
        c.setStrokeColor(colors.Color(1, 1, 1, 0.18))
        c.roundRect(8 * mm, 8 * mm, self.width - 16 * mm, self.height - 16 * mm, 10, fill=1, stroke=1)
        c.setFillColor(MUTED)
        c.setFont("Arial-Bold", 16)
        c.drawCentredString(self.width / 2, self.height / 2 + 5 * mm, "CHÈN MAP VIẾT TAY CÁ NHÂN")
        c.setFont("Arial", 9)
        c.drawCentredString(self.width / 2, self.height / 2 - 3 * mm, "Giữ đúng tỉ lệ ảnh, không kéo méo, không cắt mất chữ.")


class BlankPyramid(Flowable):
    def __init__(self, width=CONTENT_W, height=86 * mm):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillColor(colors.Color(1, 1, 1, 0.055))
        c.setStrokeColor(colors.Color(1, 1, 1, 0.16))
        c.roundRect(0, 0, self.width, self.height, 10, fill=1, stroke=1)
        c.setFillColor(SUNBURST)
        c.setFont("Arial-Bold", 11.5)
        c.drawString(8 * mm, self.height - 9 * mm, "Kim Tự Tháp Pitago Cá Nhân")
        c.setFillColor(MUTED)
        c.setFont("Arial", 7.5)
        c.drawString(8 * mm, self.height - 14 * mm, "Điền nền Tháng/Ngày/Năm, 4 đỉnh cao, tuổi/năm và chỉ số thách thức theo map.")

        cx = self.width / 2
        radius = 6.8 * mm
        points = [
            ("[T]", "THÁNG", cx - 48 * mm, 16 * mm, False),
            ("[N]", "NGÀY", cx, 16 * mm, False),
            ("[Y]", "NĂM", cx + 48 * mm, 16 * mm, False),
            ("[Đ1]", "[TUỔI/NĂM]", cx - 24 * mm, 29 * mm, True),
            ("[Đ2]", "[TUỔI/NĂM]", cx + 24 * mm, 29 * mm, True),
            ("[Đ3]", "[TUỔI/NĂM]", cx, 37 * mm, True),
            ("[Đ4]", "[TUỔI/NĂM]", cx, 58 * mm, True),
        ]
        links = [(0, 3), (1, 3), (1, 4), (2, 4), (3, 5), (4, 5), (5, 6)]
        c.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.42))
        c.setLineWidth(0.8)
        for a, b in links:
            _, _, x1, y1, _ = points[a]
            _, _, x2, y2, _ = points[b]
            c.line(x1, y1, x2, y2)
        for value, label, x, y, is_peak in points:
            c.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.86))
            c.setStrokeColor(colors.Color(1, 1, 1, 0.30))
            c.circle(x, y, radius, fill=1, stroke=1)
            c.setFillColor(colors.HexColor("#99F6E4") if not is_peak else SUNBURST)
            c.setFont("Arial-Bold", 7.5 if len(value) > 3 else 10)
            c.drawCentredString(x, y - 3, value)
            c.setFillColor(INK)
            c.setFont("Arial-Bold", 5.8)
            c.drawCentredString(x, y - radius - 4 * mm, label)
        for text, x, y in [
            ("[TT1]", cx - 37 * mm, 34 * mm),
            ("[TT2]", cx + 37 * mm, 34 * mm),
            ("[TT3]", cx - 15 * mm, 44 * mm),
            ("[TT4]", cx - 15 * mm, 63 * mm),
        ]:
            c.setFillColor(colors.Color(217 / 255, 78 / 255, 31 / 255, 0.20))
            c.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.55))
            c.circle(x, y, 4.0 * mm, fill=1, stroke=1)
            c.setFillColor(GOLD)
            c.setFont("Arial-Bold", 5.8)
            c.drawCentredString(x, y - 2, text)
        c.setFillColor(colors.Color(1, 1, 1, 0.38))
        c.setFont("Arial-Italic", 6.2)
        c.drawCentredString(self.width / 2, 1.8 * mm, "Ghi chú: các mũi tên thể hiện cách năng lượng nền hợp thành từng đỉnh cao.")


def placeholder_table(title, rows, col_widths=None):
    data = [[P(f"<b>{title}</b>", "H2")]]
    for row in rows:
        data.append([placeholder(row)])
    table = Table(data, colWidths=[CONTENT_W] if col_widths is None else col_widths, hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), CARD),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def build_template(output_path):
    prepare_cover_background()
    doc = SimpleDocTemplate(
        output_path,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=22 * mm,
    )
    story = [Spacer(1, 1), PageBreak()]

    story.append(SectionBand("01", "Bức Tranh Tính Cách (7 Chỉ Số Cốt Lõi)", "[TÊN KHÁCH] · [NGÀY SINH] · Chuyên gia đồng hành: Lê Chí Cường"))
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("Danh sách 7 chỉ số", [
        "Đường đời: [SỐ] · [luận giải ngắn]",
        "Sứ mệnh: [SỐ] · [luận giải ngắn]",
        "Linh hồn: [SỐ] · [luận giải ngắn]",
        "Nhân cách: [SỐ] · [luận giải ngắn]",
        "Thái độ: [SỐ] · [luận giải ngắn]",
        "Ngày sinh: [SỐ] · [luận giải ngắn]",
        "Trưởng thành: [SỐ] · [luận giải ngắn]",
    ]))
    story.append(PageBreak())

    story.append(SectionBand("02", "Giải Mã Nội Tâm Qua Biểu Đồ Ngày Sinh", "Lưới năng lượng và các mũi tên phẩm chất"))
    story.append(Spacer(1, 8 * mm))
    left = [P("<b>Lưới biểu đồ ngày sinh</b>", "H2"), BlankBirthGrid()]
    right = [P("<b>Luận giải biểu đồ</b>", "H2"), placeholder("[Điền mô tả lưới, số thiếu, số lặp, mũi tên có/bù theo ảnh map.]")]
    two_col = Table([[card(left, width=82 * mm), Spacer(4 * mm, 1), card(right, width=84 * mm)]], colWidths=[82 * mm, 4 * mm, 84 * mm])
    two_col.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 0)]))
    story.append(two_col)
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("Mũi tên / số thiếu / số nổi bật", [
        "[Có/Bù] [Mũi tên hoặc chỉ số] · [luận giải]",
        "[Có/Bù] [Mũi tên hoặc chỉ số] · [luận giải]",
        "[Có/Bù] [Mũi tên hoặc chỉ số] · [luận giải]",
    ]))
    story.append(PageBreak())

    story.append(SectionBand("03", "Map Viết Tay Cá Nhân", "Bản ghi chú trực quan trong buổi phân tích"))
    story.append(Spacer(1, 8 * mm))
    story.append(MapPlaceholder())
    story.append(PageBreak())

    story.append(SectionBand("04", "Chỉ Số Nợ Nghiệp", "Những điểm cần chuyển hóa trong hành trình hiện tại"))
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("Nợ nghiệp / bài học cải thiện", [
        "[Tên chỉ số hoặc Không có nợ nghiệp nổi bật]",
        "[Luận giải chính]",
        "[Gợi ý chuyển hóa]",
    ]))
    story.append(PageBreak())

    story.append(SectionBand("05", "Ba Chu Kỳ Cuộc Đời Lớn", "Nền hành trình lớn của [TÊN KHÁCH]"))
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("3 chu kỳ cuộc đời lớn", [
        "Chu kỳ 1: [SỐ] · [độ tuổi] · [luận giải]",
        "Chu kỳ 2: [SỐ] · [độ tuổi] · [luận giải]",
        "Chu kỳ 3: [SỐ] · [độ tuổi] · [luận giải]",
        "Năm cá nhân hiện tại: [SỐ/NĂM] · [gợi ý hành động]",
    ]))
    story.append(PageBreak())

    story.append(SectionBand("06", "Bốn Đỉnh Cao Và Thách Thức", "Các giai đoạn phát triển và chỉ số thách thức"))
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("4 đỉnh cao & chỉ số thách thức", [
        "Đỉnh cao 1: [SỐ] · [tuổi/năm] · Thách thức [SỐ]",
        "Đỉnh cao 2: [SỐ] · [tuổi/năm] · Thách thức [SỐ]",
        "Đỉnh cao 3: [SỐ] · [tuổi/năm] · Thách thức [SỐ]",
        "Đỉnh cao 4: [SỐ] · [tuổi/năm] · Thách thức [SỐ]",
    ]))
    story.append(Spacer(1, 10 * mm))
    story.append(BlankPyramid())
    story.append(PageBreak())

    story.append(SectionBand("07", "Thông Điệp Chữa Lành", "Lộ trình cá nhân hóa dành cho [TÊN KHÁCH]"))
    story.append(Spacer(1, 8 * mm))
    story.append(placeholder_table("Thông điệp chính", [
        "[Đoạn chữa lành 1]",
        "[Đoạn chữa lành 2]",
    ]))
    story.append(Spacer(1, 10 * mm))
    story.append(placeholder_table("Lộ trình hành động", [
        "01 · [Tên hành động] · [mô tả]",
        "02 · [Tên hành động] · [mô tả]",
        "03 · [Tên hành động] · [mô tả]",
        "04 · [Tên hành động] · [mô tả]",
    ]))
    story.append(Spacer(1, 9 * mm))
    story.append(card([placeholder("“[QUOTE KẾT LUẬN / CÂU CHỮA LÀNH]”")], fill=colors.Color(217 / 255, 78 / 255, 31 / 255, 0.20)))

    doc.build(story, onFirstPage=blank_cover_bg, onLaterPages=bg)


if __name__ == "__main__":
    build_template(TEMPLATE_OUTPUT)
    build_template(OUTPUT_COPY)
    print(f"Created: {TEMPLATE_OUTPUT}")
    print(f"Created: {OUTPUT_COPY}")
