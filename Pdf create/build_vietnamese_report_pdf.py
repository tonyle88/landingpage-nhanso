import glob
import math
import os
import re

# Template note:
# Read `HUONG_DAN_TAO_PDF_MAU_CLOWCAT.md` before creating a new customer PDF.
# Standard workflow:
# 1. Put the source PDF and customer handwritten map image into `Pdf files/input`.
# 2. Update this report content/template for the customer.
# 3. Finished PDFs are always written to `Pdf files/output`.

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_JUSTIFY, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    Flowable,
    KeepTogether,
    Image,
    PageBreak,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(BASE_DIR)
PDF_FILES_DIR = os.path.join(ROOT_DIR, "Pdf files")
INPUT_DIR = os.path.join(PDF_FILES_DIR, "input")
OUTPUT_DIR = os.path.join(PDF_FILES_DIR, "output")

os.makedirs(INPUT_DIR, exist_ok=True)
os.makedirs(OUTPUT_DIR, exist_ok=True)


def latest_file(folder, patterns):
    paths = []
    for pattern in patterns:
        paths.extend(glob.glob(os.path.join(folder, pattern)))
    paths = [path for path in paths if os.path.isfile(path)]
    return max(paths, key=os.path.getmtime) if paths else None


def output_slug_from_input(path):
    if not path:
        return "CLOWCAT_OUTPUT"
    name = os.path.splitext(os.path.basename(path))[0]
    name = re.sub(r"[^0-9A-Za-zÀ-ỹ]+", "_", name, flags=re.UNICODE)
    name = re.sub(r"_+", "_", name).strip("_")
    return name.upper() or "CLOWCAT_OUTPUT"


INPUT_PDF = latest_file(INPUT_DIR, ("*.pdf", "*.PDF"))
INPUT_MAP = latest_file(INPUT_DIR, ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP"))
OUTPUT = os.path.join(OUTPUT_DIR, f"{output_slug_from_input(INPUT_PDF)}_VietHoa_ClowCat.pdf")

LOGO = os.path.join(BASE_DIR, "assets/images/logo.png")
HERO_BG = os.path.join(BASE_DIR, "assets/images/hero_bg.png")
COVER_BG_A4 = os.path.join(BASE_DIR, "assets/images/hero_bg_a4_cover.jpg")
INPUT_MAP_CANDIDATES = []
for pattern in ("*.jpg", "*.jpeg", "*.png", "*.webp", "*.JPG", "*.JPEG", "*.PNG", "*.WEBP"):
    INPUT_MAP_CANDIDATES.extend(glob.glob(os.path.join(INPUT_DIR, pattern)))
INPUT_MAP_CANDIDATES = sorted(INPUT_MAP_CANDIDATES, key=os.path.getmtime, reverse=True)
HANDWRITTEN_MAP_CANDIDATES = ([INPUT_MAP] if INPUT_MAP else []) + INPUT_MAP_CANDIDATES

TEAL_DARKEST = colors.HexColor("#091C20")
TEAL_DARK = colors.HexColor("#0D2B30")
TEAL = colors.HexColor("#1B4149")
TEAL_LIGHT = colors.HexColor("#2A5F6B")
ORANGE = colors.HexColor("#D94E1F")
ORANGE_BRIGHT = colors.HexColor("#E86A30")
SUNBURST = colors.HexColor("#F5C196")
SUNBURST_DARK = colors.HexColor("#E8A878")
GOLD = colors.HexColor("#D4A843")
WHITE = colors.white
INK = colors.HexColor("#F8F3EC")
MUTED = colors.HexColor("#C7D1D3")
LINE = colors.Color(1, 1, 1, 0.16)
CARD = colors.Color(1, 1, 1, 0.075)
CONTENT_W = 170 * mm


pdfmetrics.registerFont(TTFont("Arial", "/System/Library/Fonts/Supplemental/Arial.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Bold", "/System/Library/Fonts/Supplemental/Arial Bold.ttf"))
pdfmetrics.registerFont(TTFont("Arial-Italic", "/System/Library/Fonts/Supplemental/Arial Italic.ttf"))


def hex_color(value):
    return colors.HexColor(value)


styles = getSampleStyleSheet()
styles.add(
    ParagraphStyle(
        "Tiny",
        fontName="Arial",
        fontSize=7.5,
        leading=10,
        textColor=MUTED,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        "Kicker",
        fontName="Arial-Bold",
        fontSize=8.5,
        leading=11,
        textColor=SUNBURST,
        uppercase=True,
        tracking=1,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "CoverTitle",
        fontName="Arial-Bold",
        fontSize=30,
        leading=34,
        textColor=WHITE,
        alignment=TA_LEFT,
        spaceAfter=8,
    )
)
styles.add(
    ParagraphStyle(
        "CoverSub",
        fontName="Arial",
        fontSize=11.5,
        leading=17,
        textColor=INK,
        spaceAfter=12,
    )
)
styles.add(
    ParagraphStyle(
        "H1",
        fontName="Arial-Bold",
        fontSize=18,
        leading=23,
        textColor=WHITE,
        spaceBefore=8,
        spaceAfter=10,
    )
)
styles.add(
    ParagraphStyle(
        "H2",
        fontName="Arial-Bold",
        fontSize=13.4,
        leading=17,
        textColor=SUNBURST,
        spaceBefore=6,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "Body",
        fontName="Arial",
        fontSize=10.8,
        leading=16.2,
        textColor=INK,
        alignment=TA_JUSTIFY,
        spaceAfter=6,
    )
)
styles.add(
    ParagraphStyle(
        "BodySmall",
        fontName="Arial",
        fontSize=9.45,
        leading=14.1,
        textColor=INK,
        alignment=TA_JUSTIFY,
        spaceAfter=4,
    )
)
styles.add(
    ParagraphStyle(
        "BoldSmall",
        fontName="Arial-Bold",
        fontSize=9.45,
        leading=14.1,
        textColor=WHITE,
        spaceAfter=2,
    )
)
styles.add(
    ParagraphStyle(
        "Number",
        fontName="Arial-Bold",
        fontSize=22,
        leading=24,
        textColor=SUNBURST,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "NumberLong",
        fontName="Arial-Bold",
        fontSize=17,
        leading=19,
        textColor=SUNBURST,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "CenterSmall",
        fontName="Arial",
        fontSize=8.8,
        leading=12.4,
        textColor=INK,
        alignment=TA_CENTER,
    )
)
styles.add(
    ParagraphStyle(
        "Quote",
        fontName="Arial-Italic",
        fontSize=12.5,
        leading=18,
        textColor=WHITE,
        alignment=TA_CENTER,
        spaceAfter=2,
    )
)


class GradientCover(Flowable):
    def __init__(self, width, height):
        super().__init__()
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        steps = 84
        top = (245, 193, 150)
        mid = (217, 78, 31)
        bot = (13, 43, 48)
        for i in range(steps):
            t = i / (steps - 1)
            if t < 0.52:
                k = t / 0.52
                rgb = tuple((top[j] * (1 - k) + mid[j] * k) / 255 for j in range(3))
            else:
                k = (t - 0.52) / 0.48
                rgb = tuple((mid[j] * (1 - k) + bot[j] * k) / 255 for j in range(3))
            c.setFillColor(colors.Color(*rgb))
            c.rect(0, self.height * (1 - (i + 1) / steps), self.width, self.height / steps + 1, fill=1, stroke=0)


class RoundedBox(Flowable):
    def __init__(self, width, height, fill=CARD, stroke=LINE, radius=10, stroke_width=0.7):
        super().__init__()
        self.width = width
        self.height = height
        self.fill = fill
        self.stroke = stroke
        self.radius = radius
        self.stroke_width = stroke_width

    def draw(self):
        c = self.canv
        c.setFillColor(self.fill)
        c.setStrokeColor(self.stroke)
        c.setLineWidth(self.stroke_width)
        c.roundRect(0, 0, self.width, self.height, self.radius, fill=1, stroke=1)


class SectionBand(Flowable):
    def __init__(self, number, title, subtitle=None, width=CONTENT_W):
        super().__init__()
        self.number = number
        self.title = title
        self.subtitle = subtitle
        self.width = width
        self.height = 21 * mm if subtitle else 16 * mm

    def draw(self):
        c = self.canv
        c.setFillColor(colors.Color(1, 1, 1, 0.06))
        c.roundRect(0, 0, self.width, self.height, 9, fill=1, stroke=0)
        c.setFillColor(ORANGE)
        c.roundRect(0, 0, 22 * mm, self.height, 9, fill=1, stroke=0)
        c.setFillColor(WHITE)
        c.setFont("Arial-Bold", 16)
        c.drawCentredString(11 * mm, self.height / 2 - 5, self.number)
        c.setFillColor(WHITE)
        c.setFont("Arial-Bold", 13)
        c.drawString(28 * mm, self.height - 7.5 * mm, self.title)
        if self.subtitle:
            c.setFillColor(MUTED)
            c.setFont("Arial", 8.2)
            c.drawString(28 * mm, self.height - 12.7 * mm, self.subtitle)


class SwatchStrip(Flowable):
    def __init__(self, width=CONTENT_W):
        super().__init__()
        self.width = width
        self.height = 12 * mm

    def draw(self):
        c = self.canv
        swatches = [
            (SUNBURST, "Sunburst"),
            (ORANGE, "Flasher"),
            (TEAL, "Deep Teal"),
            (GOLD, "Gold"),
        ]
        gap = 2 * mm
        w = (self.width - gap * 3) / 4
        for i, (color, label) in enumerate(swatches):
            x = i * (w + gap)
            c.setFillColor(color)
            c.roundRect(x, 5 * mm, w, 7 * mm, 4, fill=1, stroke=0)
            c.setFillColor(MUTED)
            c.setFont("Arial", 6.5)
            c.drawString(x + 1.5 * mm, 1 * mm, label)


class BirthGrid(Flowable):
    def __init__(self, width=78 * mm):
        super().__init__()
        self.width = width
        self.height = 55 * mm

    def draw(self):
        c = self.canv
        cell = self.width / 3
        blue = colors.HexColor("#BFE7F2")
        gold = GOLD
        rows = [
            [[("3", blue)], [("6", blue)], [("9", blue)]],
            [[("2", blue), ("2", blue), ("2", blue), ("2", blue)], [("5", blue), ("5", blue)], [("8", blue)]],
            [[("1", blue), ("1", blue)], [("4", blue), ("4", blue)], [("7", blue), ("7", blue)]],
        ]

        def draw_segments(segments, cx, cy, present):
            font_name = "Arial-Bold" if present else "Arial"
            font_size = 15 if present else 12
            gap = 2.1 * mm if len(segments) > 1 else 0
            c.setFont(font_name, font_size)
            widths = [c.stringWidth(text, font_name, font_size) for text, _ in segments]
            total_w = sum(widths) + gap * (len(segments) - 1)
            x_cursor = cx - total_w / 2
            for (text, color), text_w in zip(segments, widths):
                c.setFillColor(color)
                c.drawString(x_cursor, cy, text)
                x_cursor += text_w + gap

        for r in range(3):
            for col in range(3):
                x = col * cell
                y = self.height - (r + 1) * cell * 0.68
                h = cell * 0.68
                segments = rows[r][col]
                present = bool(segments) and "(" not in segments[0][0]
                c.setFillColor(colors.Color(1, 1, 1, 0.11 if present else 0.045))
                c.setStrokeColor(colors.Color(1, 1, 1, 0.16))
                c.roundRect(x, y, cell - 1.4, h - 1.4, 7, fill=1, stroke=1)
                if segments:
                    draw_segments(segments, x + cell / 2, y + h / 2 - 4, present)
        c.setFillColor(MUTED)
        c.setFont("Arial", 6.4)
        c.drawString(0, 1 * mm, "Lưới được bê theo map viết tay; màu số bám theo ghi chú trong ảnh.")


def prepare_cover_background():
    os.makedirs(os.path.dirname(COVER_BG_A4), exist_ok=True)
    target_w, target_h = 1240, 1754
    target_ratio = target_w / target_h
    with PILImage.open(HERO_BG) as im:
        im = im.convert("RGB")
        src_w, src_h = im.size
        src_ratio = src_w / src_h
        if src_ratio > target_ratio:
            new_w = int(src_h * target_ratio)
            left = (src_w - new_w) // 2
            im = im.crop((left, 0, left + new_w, src_h))
        else:
            new_h = int(src_w / target_ratio)
            top = (src_h - new_h) // 2
            im = im.crop((0, top, src_w, top + new_h))
        im = im.resize((target_w, target_h), PILImage.Resampling.LANCZOS)
        im.save(COVER_BG_A4, quality=92)


def find_handwritten_map():
    for path in HANDWRITTEN_MAP_CANDIDATES:
        if os.path.exists(path):
            return path
    return None


def validate_input_files():
    missing = []
    if not INPUT_PDF:
        missing.append("- 1 file PDF nguon trong `Pdf files/input`")
    if not find_handwritten_map():
        missing.append("- 1 file anh map viet tay trong `Pdf files/input` (.jpg/.jpeg/.png/.webp)")
    if missing:
        raise FileNotFoundError(
            "Thieu file dau vao de tao PDF mau Clow Cat:\n"
            + "\n".join(missing)
            + "\nHay de dung 1 PDF va 1 anh map cua khach vao thu muc `Pdf files/input`."
        )


def bg(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(TEAL_DARKEST)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(217 / 255, 78 / 255, 31 / 255, 0.16))
    canvas.circle(w - 18 * mm, h - 20 * mm, 48 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.08))
    canvas.circle(18 * mm, 18 * mm, 58 * mm, fill=1, stroke=0)

    # Bottom brand block fills quiet lower areas without competing with content.
    is_closing_page = doc.page >= 7
    is_dense_forecast_page = doc.page == 6
    is_pyramid_page = doc.page == 5
    if is_closing_page:
        brand_y, logo_size, slogan_size = 16 * mm, 16 * mm, 7.6
    elif is_dense_forecast_page:
        brand_y, logo_size, slogan_size = 16 * mm, 16 * mm, 7.4
    elif is_pyramid_page:
        brand_y, logo_size, slogan_size = 15 * mm, 14 * mm, 7.0
    else:
        brand_y, logo_size, slogan_size = 33 * mm, 26 * mm, 9.4
    canvas.setFillAlpha(0.92)
    canvas.drawImage(LOGO, w / 2 - logo_size / 2, brand_y + 11 * mm, width=logo_size, height=logo_size, mask="auto")
    canvas.setFillAlpha(1)
    canvas.setFillColor(colors.Color(212 / 255, 168 / 255, 67 / 255, 0.86))
    canvas.setFont("Arial-Bold", slogan_size)
    canvas.drawCentredString(w / 2, brand_y + 4 * mm, "KHÁM PHÁ BẢN THÂN, BẬT PHÁ TIỀM NĂNG")

    canvas.setStrokeColor(colors.Color(1, 1, 1, 0.08))
    canvas.setLineWidth(0.5)
    canvas.line(18 * mm, 18 * mm, w - 18 * mm, 18 * mm)
    canvas.setFont("Arial", 7.2)
    canvas.setFillColor(MUTED)
    canvas.drawString(18 * mm, 10.5 * mm, "© 2026 Clow Cat Patronus · Được tạo ra với tình yêu và năng lượng tích cực")
    canvas.drawRightString(w - 18 * mm, 10.5 * mm, f"Trang {doc.page}")
    canvas.restoreState()


def cover_bg(canvas, doc):
    canvas.saveState()
    w, h = A4
    cover_x = 26 * mm
    cover_w = w - 52 * mm
    canvas.setFillColor(TEAL_DARKEST)
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.drawImage(COVER_BG_A4, 0, 0, width=w, height=h, mask="auto")

    # Cinematic overlays inspired by the landing-page hero.
    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.68))
    canvas.rect(0, 0, w, h, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.44))
    canvas.rect(0, 0, w, h * 0.34, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(217 / 255, 78 / 255, 31 / 255, 0.18))
    canvas.circle(w * 0.78, h * 0.72, 52 * mm, fill=1, stroke=0)
    canvas.setFillColor(colors.Color(45 / 255, 212 / 255, 191 / 255, 0.10))
    canvas.circle(w * 0.22, h * 0.34, 46 * mm, fill=1, stroke=0)

    # Brand badge.
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
    brand_font = 8.0
    canvas.setFont("Arial-Bold", brand_font)
    brand_text_y = brand_badge_y + (brand_badge_h - brand_font) / 2 + brand_font * 0.32
    canvas.drawCentredString(brand_badge_x + brand_badge_w / 2, brand_text_y, "CLOW CAT PATRONUS")

    # Hero title.
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

    customer_name = "Mai Phương Lam"
    customer_date = " · 22/05/2000"
    customer_font = 15.6
    customer_y = h - 135 * mm
    canvas.setFont("Arial-Bold", customer_font)
    name_w = canvas.stringWidth(customer_name, "Arial-Bold", customer_font)
    date_w = canvas.stringWidth(customer_date, "Arial-Bold", customer_font)
    customer_x = cx - (name_w + date_w) / 2
    canvas.setFillColor(colors.Color(0, 0, 0, 0.35))
    canvas.drawString(customer_x + 0.55 * mm, customer_y - 0.45 * mm, customer_name + customer_date)
    canvas.setFillColor(SUNBURST)
    canvas.drawString(customer_x, customer_y, customer_name)
    canvas.setFillColor(WHITE)
    canvas.drawString(customer_x + name_w, customer_y, customer_date)

    # Subtitle glass panel.
    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.48))
    canvas.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.26))
    canvas.roundRect(cover_x, h - 168 * mm, cover_w, 25 * mm, 13, fill=1, stroke=1)
    subtitle = Paragraph(
        "Tấm bản đồ giúp bạn hiểu rõ bản thân · tính cách · điểm mạnh<br/>và hành trình phát triển của chính mình.",
        ParagraphStyle("CoverCanvasSub", fontName="Arial-Italic", fontSize=13.8, leading=19.5, textColor=WHITE, alignment=TA_CENTER),
    )
    subtitle.wrapOn(canvas, cover_w - 12 * mm, 25 * mm)
    subtitle.drawOn(canvas, cover_x + 6 * mm, h - 162.5 * mm)

    # Stats row mirrors the landing hero rhythm.
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

        stat_circle_y = stat_y + 0.45 * mm
        canvas.setFillColor(colors.Color(accent.red, accent.green, accent.blue, 0.24))
        canvas.circle(x, stat_circle_y, 7.7 * mm, fill=1, stroke=0)
        canvas.setStrokeColor(colors.Color(accent.red, accent.green, accent.blue, 0.58))
        canvas.setLineWidth(0.75)
        canvas.circle(x, stat_circle_y, 7.7 * mm, fill=0, stroke=1)

        canvas.setFont("Arial-Bold", 26)
        canvas.setFillColor(colors.Color(0, 0, 0, 0.42))
        canvas.drawCentredString(x + 0.6 * mm, stat_circle_y - 1.85 * mm, num)
        canvas.setFillColor(accent)
        canvas.drawCentredString(x, stat_circle_y - 1.15 * mm, num)
        canvas.setFillColor(INK)
        canvas.setFont("Arial-Bold", 7.1 if len(label) > 18 else 7.9)
        canvas.drawCentredString(x, stat_y - 12.3 * mm, label)

    # Metadata table.
    table_x = cover_x
    table_y = 43 * mm
    canvas.setFillColor(colors.Color(1, 1, 1, 0.082))
    canvas.setStrokeColor(colors.Color(1, 1, 1, 0.24))
    canvas.roundRect(table_x, table_y, cover_w, 39 * mm, 10, fill=1, stroke=1)
    rows = [
        ("Chuyên gia đồng hành", "Lê Chí Cường"),
        ("Dịch vụ", "Định hướng bằng Nhân Số Học"),
        ("Gói dịch vụ tư vấn", "Phân Tích Toàn Diện (Gói Toàn Diện Nhất)"),
    ]
    for i, (label, value) in enumerate(rows):
        y = table_y + 29 * mm - i * 11 * mm
        canvas.setFillColor(colors.Color(1, 1, 1, 0.78))
        canvas.setFont("Arial-Bold", 9.4)
        canvas.drawString(table_x + 7 * mm, y, label)
        canvas.setFillColor(WHITE)
        canvas.setFont("Arial-Bold", 10.4)
        canvas.drawString(table_x + 62 * mm, y, value)
        if i < 2:
            canvas.setStrokeColor(colors.Color(1, 1, 1, 0.08))
            canvas.line(table_x + 6 * mm, y - 5 * mm, table_x + cover_w - 6 * mm, y - 5 * mm)

    canvas.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.58))
    canvas.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.16))
    canvas.roundRect(cover_x, 17.5 * mm, cover_w, 11 * mm, 8, fill=1, stroke=1)
    canvas.setFillColor(colors.Color(1, 1, 1, 0.78))
    canvas.setFont("Arial-Bold", 8.8)
    canvas.drawCentredString(cx, 21.1 * mm, "© 2026 Clow Cat Patronus · Được tạo ra với tình yêu và năng lượng tích cực")
    canvas.restoreState()


class HandwrittenMapPage(Flowable):
    def __init__(self, image_path, width=CONTENT_W, height=218 * mm):
        super().__init__()
        self.image_path = image_path
        self.width = width
        self.height = height

    def draw(self):
        c = self.canv
        c.setFillAlpha(1)
        c.setStrokeAlpha(1)
        c.setFillColor(colors.Color(1, 1, 1, 0.055))
        c.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.22))
        c.roundRect(0, 0, self.width, self.height, 14, fill=1, stroke=1)
        pad = 6 * mm
        inner_w = self.width - pad * 2
        inner_h = self.height - pad * 2
        with PILImage.open(self.image_path) as im:
            iw, ih = im.size
        scale = min(inner_w / iw, inner_h / ih)
        draw_w = iw * scale
        draw_h = ih * scale
        x = pad + (inner_w - draw_w) / 2
        y = pad + (inner_h - draw_h) / 2
        c.setFillAlpha(1)
        c.setStrokeAlpha(1)
        c.setFillColor(colors.HexColor("#F8F3EC"))
        c.roundRect(x - 2 * mm, y - 2 * mm, draw_w + 4 * mm, draw_h + 4 * mm, 9, fill=1, stroke=0)
        c.drawImage(self.image_path, x, y, width=draw_w, height=draw_h, preserveAspectRatio=True, mask="auto")


class PythagorasPyramid(Flowable):
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
        c.drawString(8 * mm, self.height - 14 * mm, "Các đỉnh liên kết từ nền ngày sinh; số màu vàng là chỉ số thách thức")

        radius = 6.8 * mm
        base_y = 16 * mm
        mid_y = 29 * mm
        upper_y = 37 * mm
        top_y = 58 * mm
        cx = self.width / 2
        nodes = {
            "base_month": ("5", "Tháng", "", cx - 48 * mm, base_y, False),
            "base_day": ("22/4", "Ngày", "", cx, base_y, False),
            "base_year": ("2", "Năm", "", cx + 48 * mm, base_y, False),
            "peak_1": ("9", "34T", "2034", cx - 24 * mm, mid_y, True),
            "peak_2": ("6", "43T", "2043", cx + 24 * mm, mid_y, True),
            "peak_3": ("6", "52T", "2052", cx, upper_y, True),
            "peak_4": ("7", "61T", "2061", cx, top_y, True),
        }

        def draw_arrow(x1, y1, x2, y2, color, width=0.9):
            angle = math.atan2(y2 - y1, x2 - x1)
            sx = x1 + math.cos(angle) * radius * 0.9
            sy = y1 + math.sin(angle) * radius * 0.9
            ex = x2 - math.cos(angle) * radius * 0.9
            ey = y2 - math.sin(angle) * radius * 0.9
            c.setStrokeColor(color)
            c.setLineWidth(width)
            c.line(sx, sy, ex, ey)
            head = 2.0 * mm
            a1 = angle + math.pi * 0.82
            a2 = angle - math.pi * 0.82
            c.line(ex, ey, ex + math.cos(a1) * head, ey + math.sin(a1) * head)
            c.line(ex, ey, ex + math.cos(a2) * head, ey + math.sin(a2) * head)

        link_color = colors.Color(245 / 255, 193 / 255, 150 / 255, 0.50)
        links = [
            ("base_month", "peak_1"),
            ("base_day", "peak_1"),
            ("base_day", "peak_2"),
            ("base_year", "peak_2"),
            ("peak_1", "peak_3"),
            ("peak_2", "peak_3"),
            ("peak_3", "peak_4"),
        ]
        for start, end in links:
            _, _, _, x1, y1, _ = nodes[start]
            _, _, _, x2, y2, _ = nodes[end]
            draw_arrow(x1, y1, x2, y2, link_color)

        c.setStrokeColor(colors.Color(45 / 255, 212 / 255, 191 / 255, 0.22))
        c.setLineWidth(0.55)
        c.bezier(
            nodes["base_month"][3] - 8 * mm,
            nodes["base_month"][4] + 1 * mm,
            nodes["base_month"][3] - 31 * mm,
            top_y,
            nodes["peak_4"][3] - 12 * mm,
            top_y + 10 * mm,
            nodes["peak_4"][3] - 3 * mm,
            top_y + 2 * mm,
        )
        c.bezier(
            nodes["base_year"][3] + 8 * mm,
            nodes["base_year"][4] + 1 * mm,
            nodes["base_year"][3] + 31 * mm,
            top_y,
            nodes["peak_4"][3] + 12 * mm,
            top_y + 10 * mm,
            nodes["peak_4"][3] + 3 * mm,
            top_y + 2 * mm,
        )

        challenge_items = [
            ("1", nodes["peak_1"][3] - 13 * mm, nodes["peak_1"][4] + 5 * mm),
            ("2", nodes["peak_2"][3] + 13 * mm, nodes["peak_2"][4] + 4 * mm),
            # Challenge 3 follows this template's rule: |Peak 1 energy - Peak 2 energy|.
            ("3", nodes["peak_3"][3] - 14 * mm, nodes["peak_3"][4] + 4 * mm),
            ("3", nodes["peak_4"][3] - 14 * mm, nodes["peak_4"][4] + 2 * mm),
        ]
        for value, x, y in challenge_items:
            c.setFillColor(colors.Color(217 / 255, 78 / 255, 31 / 255, 0.20))
            c.setStrokeColor(colors.Color(245 / 255, 193 / 255, 150 / 255, 0.55))
            c.circle(x, y, 4.0 * mm, fill=1, stroke=1)
            c.setFillColor(GOLD)
            c.setFont("Arial-Bold", 8.5)
            c.drawCentredString(x, y - 2.7, value)

        for key, (value, label, sublabel, x, node_y, is_peak) in nodes.items():
            c.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.86))
            c.setStrokeColor(colors.Color(1, 1, 1, 0.26))
            c.setLineWidth(1.0)
            c.circle(x, node_y, radius, fill=1, stroke=1)
            c.setFillColor(colors.HexColor("#99F6E4"))
            c.setFont("Arial-Bold", 8.8 if len(value) > 2 else 11.0)
            c.drawCentredString(x, node_y - 3.0, value)
            c.setFillColor(INK)
            c.setFont("Arial-Bold", 6.6)
            if is_peak:
                c.drawCentredString(x, node_y - radius - 3.6 * mm, label)
                c.setFillColor(MUTED)
                c.setFont("Arial", 5.8)
                c.drawCentredString(x, node_y - radius - 6.8 * mm, sublabel)
            else:
                c.drawCentredString(x, node_y - radius - 4.3 * mm, label)
                if sublabel:
                    c.setFillColor(MUTED)
                    c.setFont("Arial", 6.0)
                    c.drawCentredString(x, node_y - radius - 8.0 * mm, sublabel)

        legend_x = self.width - 61 * mm
        legend_y = self.height - 18 * mm
        c.setFillColor(colors.Color(153 / 255, 246 / 255, 228 / 255, 0.13))
        c.setStrokeColor(colors.Color(153 / 255, 246 / 255, 228 / 255, 0.34))
        c.roundRect(legend_x, legend_y, 53 * mm, 8.5 * mm, 4, fill=1, stroke=1)
        icon_y = legend_y + 4.25 * mm
        c.setFillColor(colors.Color(9 / 255, 28 / 255, 32 / 255, 0.82))
        c.setStrokeColor(colors.Color(1, 1, 1, 0.42))
        c.setLineWidth(0.9)
        c.circle(legend_x + 5.2 * mm, icon_y, 1.55 * mm, fill=1, stroke=1)
        c.setFillColor(colors.HexColor("#99F6E4"))
        c.setFont("Arial-Bold", 6.2)
        c.drawString(legend_x + 8.6 * mm, legend_y + 2.75 * mm, "Đỉnh cao")
        c.setFillColor(GOLD)
        c.circle(legend_x + 31.5 * mm, icon_y, 1.55 * mm, fill=1, stroke=0)
        c.setFillColor(GOLD)
        c.setFont("Arial-Bold", 6.2)
        c.drawString(legend_x + 35 * mm, legend_y + 2.75 * mm, "Thách thức")

        c.setFillColor(colors.Color(1, 1, 1, 0.38))
        c.setFont("Arial-Italic", 6.2)
        c.drawCentredString(self.width / 2, 1.8 * mm, "Các mũi tên thể hiện cách năng lượng nền hợp thành từng đỉnh cao.")


def P(text, style="Body"):
    return Paragraph(text, styles[style])


def kv_table(items, widths=(50 * mm, 120 * mm)):
    data = [[P(f"<b>{k}</b>", "BodySmall"), P(v, "BodySmall")] for k, v in items]
    table = Table(data, colWidths=list(widths), hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, 0.055)),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(1, 1, 1, 0.1)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
                ("TEXTCOLOR", (0, 0), (-1, -1), INK),
            ]
        )
    )
    return table


def card(content, width=CONTENT_W, pad=8, fill=CARD):
    inner = []
    for item in content:
        inner.append(item if not isinstance(item, str) else P(item, "Body"))
    table = Table([[inner]], colWidths=[width], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), fill),
                ("BOX", (0, 0), (-1, -1), 0.7, LINE),
                ("LEFTPADDING", (0, 0), (-1, -1), pad),
                ("RIGHTPADDING", (0, 0), (-1, -1), pad),
                ("TOPPADDING", (0, 0), (-1, -1), pad),
                ("BOTTOMPADDING", (0, 0), (-1, -1), pad),
            ]
        )
    )
    return table


def indicator(name, value, text):
    value_cell = [P(str(value), "NumberLong" if len(str(value)) > 3 else "Number")]
    body = [P(f"<b>{name}</b>", "BoldSmall"), P(text, "BodySmall")]
    table = Table([[value_cell, body]], colWidths=[26 * mm, 144 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, 0.065)),
                ("BACKGROUND", (0, 0), (0, 0), colors.Color(217 / 255, 78 / 255, 31 / 255, 0.30)),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
                ("TOPPADDING", (0, 0), (-1, -1), 5),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ]
        )
    )
    return table


def checklist(rows):
    data = []
    for checked, title, detail in rows:
        mark = "Có" if checked else "Bù"
        data.append([P(mark, "CenterSmall"), P(f"<b>{title}</b>. {detail}", "BodySmall")])
    table = Table(data, colWidths=[15 * mm, 155 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, 0.055)),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(1, 1, 1, 0.08)),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]
        )
    )
    return table


def step_blocks(rows):
    data = []
    for age, energy, text in rows:
        data.append([P(f"<b>{age}</b>", "CenterSmall"), P(f"<b>Năng lượng {energy}</b><br/>{text}", "BodySmall")])
    table = Table(data, colWidths=[30 * mm, 140 * mm], hAlign="LEFT")
    table.setStyle(
        TableStyle(
            [
                ("BACKGROUND", (0, 0), (-1, -1), colors.Color(1, 1, 1, 0.055)),
                ("BACKGROUND", (0, 0), (0, -1), colors.Color(245 / 255, 193 / 255, 150 / 255, 0.13)),
                ("BOX", (0, 0), (-1, -1), 0.6, LINE),
                ("INNERGRID", (0, 0), (-1, -1), 0.35, colors.Color(1, 1, 1, 0.08)),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("LEFTPADDING", (0, 0), (-1, -1), 7),
                ("RIGHTPADDING", (0, 0), (-1, -1), 7),
                ("TOPPADDING", (0, 0), (-1, -1), 7),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
            ]
        )
    )
    return table


def build():
    os.makedirs(INPUT_DIR, exist_ok=True)
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    validate_input_files()
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
    story.append(SectionBand("01", "Bức Tranh Tính Cách (7 Chỉ Số Cốt Lõi)", "Mai Phương Lam · 22/05/2000 · Chuyên gia đồng hành: Lê Chí Cường"))
    story.append(Spacer(1, 7 * mm))
    indicators = [
        ("Đường đời (Life Path)", "11/2", "Bạn mang năng lượng trực giác bậc thầy, dễ cảm được tầng sâu của con người và có khả năng truyền cảm hứng bằng sự thấu cảm."),
        ("Sứ mệnh (Destiny)", "3", "Sứ mệnh của bạn là sáng tạo, truyền thông và tự thể hiện. Khi tiếng nói được mở đúng cách, bạn có thể biến cảm xúc thành thông điệp có sức lan tỏa."),
        ("Linh hồn (Soul Urge)", "11/2", "Bên trong bạn khao khát kết nối tâm linh, hòa bình nội tại và những mối quan hệ có chiều sâu thật sự."),
        ("Nhân cách (Personality)", "19/1", "Bên ngoài bạn tạo cảm giác độc lập, tiên phong và mạnh mẽ. Đây cũng là bài học về việc dùng quyền lực cá nhân mà không cô lập bản thân."),
        ("Thái độ (Attitude)", "9", "Bạn tiếp cận cuộc sống bằng lòng vị tha, bao dung và xu hướng nhìn mọi chuyện trong một bức tranh lớn hơn."),
        ("Ngày sinh", "22/4", "Năng lượng ngày sinh 22/4 là nền của người kiến tạo hệ thống bền vững, giúp các tầm nhìn lớn có cơ hội bước xuống thực tế."),
        ("Trưởng thành (Maturity)", "14/5", "Giai đoạn chín muồi đưa bạn vào bài học tự do có kỷ luật: trải nghiệm nhiều, nhưng phải biết chọn điều xứng đáng để cam kết."),
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
        P("<b>Luận giải biểu đồ</b>", "H2"),
        P("Lưới bên trái được bê theo map viết tay của Mai Phương Lam. Map thể hiện các cụm 2, 4, 5, 7 khá rõ, đi cùng các điểm 3, 6, 8, 9 để tạo thành một trường năng lượng nhiều tầng. Khi đối chiếu với luận giải, bài học chính vẫn là đưa trực giác 11/2 và tiềm năng kiến tạo 22/4 vào kỷ luật, trách nhiệm và bản lĩnh thực tế.", "BodySmall"),
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
                (False, "Bài học số 4", "Thiếu hoặc yếu năng lượng tổ chức khiến các tầm nhìn lớn dễ bị dang dở nếu không có quy trình, deadline và nền móng cụ thể."),
                (False, "Bài học số 6", "Bạn cần học cách cân bằng nhu cầu cá nhân với trách nhiệm gia đình, cộng đồng và sự hiện diện chân thành trong các mối quan hệ."),
                (False, "Bài học số 8", "Bản lĩnh quyền lực, tài chính và vị thế cần được rèn bằng sự năng nổ, quyết tâm, chăm chỉ và thái độ làm chủ thịnh vượng."),
                (True, "Mũi tên 3-6-9 và 2-5-8", "Bạn có tư duy sắc bén và cảm xúc nhạy. Hãy dùng ngôn từ để xây dựng, đồng thời giữ năng lượng nội tại đủ vững để không bị cuốn trôi bởi sự nhạy cảm."),
                (True, "Hai số 7", "Sự xuất hiện của hai số 7 cho thấy nhu cầu chiêm nghiệm, riêng tư và học qua trải nghiệm thực tế rất mạnh. Thiền định và thiên nhiên là cách cân bằng tốt."),
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
                P("<b>Nợ nghiệp / bài học cải thiện: 19/1 và 14/5</b>", "H2"),
                P("Nợ nghiệp 19/1 xuất hiện tại Nhân cách, nhắc Lam học cách dùng quyền lực cá nhân đúng hướng. Bài học là lắng nghe, thừa nhận lỗi sai và đón nhận sự hỗ trợ, thay vì để sự độc lập hoặc kiểm soát cái tôi khiến mình bị cô lập.", "Body"),
                P("Nợ nghiệp 14/5 nằm ở chỉ số Trưởng thành, đưa bạn vào bài học về sự chừng mực và kỷ luật. Tự do không phải là phá bỏ mọi giới hạn, mà là khả năng giữ cam kết lâu dài với điều thật sự quan trọng.", "Body"),
            ]
        )
    )
    story.append(Spacer(1, 9 * mm))
    story.append(PageBreak())

    # SECTION 5 - LIFE CYCLES
    story.append(SectionBand("05", "Ba Chu Kỳ Cuộc Đời Lớn", "Nền hành trình lớn của Mai Phương Lam"))
    story.append(Spacer(1, 8 * mm))
    story.append(
        step_blocks(
            [
                ("Chu kỳ 1", "5", "Từ 0 đến 25 tuổi: Giai đoạn của tự do, thay đổi, trải nghiệm và thích nghi. Bạn học nhiều qua sự đa dạng của môi trường, con người và lựa chọn."),
                ("Chu kỳ 2", "22/4", "Từ 26 đến 52 tuổi: Giai đoạn hiện tại của người kiến tạo bậc thầy. Nhiệm vụ là biến tầm nhìn lớn thành cấu trúc, hệ thống và giá trị có ích cho cộng đồng."),
                ("Chu kỳ 3", "2", "Từ 53 tuổi trở đi: Giai đoạn của hòa giải, chữa lành và đồng hành. Bạn có thể trở thành người cố vấn tinh tế nhờ khả năng thấu hiểu sâu sắc người khác."),
            ]
        )
    )
    story.append(Spacer(1, 9 * mm))
    story.append(
        card(
            [
                P("Lưu ý hiện tại", "Kicker"),
                P("Năm Cá Nhân Số 1 (2026)", "H1"),
                P("Theo map viết tay, năm 2026 mang năng lượng cá nhân số 1. Đây là cú hích khởi đầu cho một chu kỳ mới: hãy chủ động mở đường, thiết lập trật tự và đặt nền cho 9 năm tiếp theo. Năm 2027 chuyển sang năng lượng số 2, phù hợp để hợp tác và tinh chỉnh kết nối.", "Body"),
            ],
            fill=colors.Color(217 / 255, 78 / 255, 31 / 255, 0.18),
        )
    )
    story.append(PageBreak())

    # SECTION 6 - PEAKS & CHALLENGES
    story.append(SectionBand("06", "Bốn Đỉnh Cao Và Thách Thức", "Các giai đoạn phát triển và chỉ số thách thức"))
    story.append(Spacer(1, 8 * mm))
    story.append(P("4 đỉnh cao & chỉ số thách thức", "H2"))
    story.append(
        step_blocks(
            [
                ("Đỉnh cao 1", "9", "Năm 2034, tuổi 34: Học cách lãnh đạo bằng sự phụng sự vô vị lợi. Thách thức 1 nhắc bạn không để cái tôi che mờ lý tưởng nhân văn."),
                ("Đỉnh cao 2", "6", "Năm 2043, tuổi 43: Kiến tạo hạnh phúc thông qua sự nuôi dưỡng và trách nhiệm. Thách thức 2 yêu cầu bạn làm chủ sự nhạy cảm để không trở nên yếu đuối."),
                ("Đỉnh cao 3", "6", "Năm 2052, tuổi 52: Gánh vác trách nhiệm lớn bằng sức mạnh sáng tạo. Thách thức 3 nhắc bạn giữ kỷ luật trong biểu đạt cảm xúc và lời nói."),
                ("Đỉnh cao 4", "7", "Năm 2061, tuổi 61: Lan tỏa trí tuệ thông qua chiêm nghiệm. Thách thức 3 yêu cầu chuyển hóa tri thức trừu tượng thành ngôn từ truyền cảm hứng."),
            ]
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(PythagorasPyramid())
    story.append(PageBreak())

    # SECTION 7 - HEALING MESSAGE
    story.append(SectionBand("07", "Thông Điệp Chữa Lành", "Lộ trình cá nhân hóa dành cho Mai Phương Lam"))
    story.append(Spacer(1, 8 * mm))
    story.append(P("Thông điệp chính", "H2"))
    story.append(
        card(
            [
                P("Lam thân mến, bản đồ của bạn mang dòng điện rất mạnh từ hai số chủ 11/2 và 22/4. Một bên là trực giác, cảm xúc và khả năng truyền cảm hứng; một bên là tiềm năng kiến tạo hệ thống lớn. Khi hai nguồn năng lượng này được đặt vào kỷ luật, bạn có thể trở thành người xây cầu giữa cảm hứng và thực tế.", "Body"),
                P("Điều cần chữa lành không phải là sự nhạy cảm, mà là cách bạn quản trị nó. Khi biết bảo vệ năng lượng, dùng lời nói để xây dựng và biến tầm nhìn thành hành động nhỏ đều đặn, bạn sẽ bớt mệt vì quá tải và bắt đầu vận hành đúng vai trò người kiến tạo.", "Body"),
            ],
            fill=colors.Color(245 / 255, 193 / 255, 150 / 255, 0.10),
        )
    )
    story.append(Spacer(1, 10 * mm))
    story.append(P("Lộ trình hành động", "H2"))
    story.append(
        step_blocks(
            [
                ("01", "Kỷ luật với tầm nhìn", "Mỗi ý tưởng lớn cần được chia thành việc nhỏ có lịch, người phụ trách và tiêu chuẩn hoàn thành rõ ràng. Đây là cách kích hoạt mặt sáng của 22/4."),
                ("02", "Sáng tạo có mục tiêu", "Sứ mệnh 3 cần được dùng để truyền lửa, kể chuyện và kết nối, nhưng nên đi cùng mục tiêu cụ thể để tránh phân tán năng lượng."),
                ("03", "Dẫn đầu bằng cảm hứng", "Năm cá nhân số 1 mở chu kỳ mới. Hãy chủ động bắt đầu, nhưng giữ sự liêm chính của 11/2: truyền cảm hứng, không thao túng cảm xúc người khác."),
                ("04", "Cân bằng tự do và trách nhiệm", "Bài học 14/5 nhắc bạn rằng tự do thật sự đến từ khả năng tự kỷ luật, giữ cam kết và chọn điều xứng đáng để theo đuổi lâu dài."),
            ]
        )
    )
    story.append(Spacer(1, 12 * mm))
    story.append(card([P("“Tôi kỷ luật với tầm nhìn. Tôi sáng tạo có mục tiêu. Tôi dẫn đầu bằng cảm hứng.”", "Quote")], fill=colors.Color(217 / 255, 78 / 255, 31 / 255, 0.20)))
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
