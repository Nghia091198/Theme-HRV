"""Compose the 1920px homepage reference screenshot and annotate visible settings."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFilter, ImageFont


ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "image-work"
OUTPUT = ROOT / "settings_image" / "page-home.jpg"

raw = Image.open(WORK / "page-home-raw.jpg").convert("RGB")
canvas = Image.new("RGB", (1920, raw.height), "white")
canvas.paste(raw, (0, 0))

# The product catalog pins to the viewport while the user scrolls. A full-page
# browser capture records the first transition frame and a long empty region.
# Use four actual viewport captures to show the successive catalog states.
catalog = ImageDraw.Draw(canvas)
catalog.rectangle((0, 1123, 1903, 4525), fill=(247, 248, 252))
catalog_frames = (
    (1, 170, 915, 1123),
    (2, 160, 910, 2050),
    (3, 160, 910, 2994),
    (4, 80, 640, 3859),
)
for number, top, bottom, target_y in catalog_frames:
    frame = Image.open(WORK / f"home-frame-{number:02d}.jpg").convert("RGB")
    crop = frame.crop((0, top, 1876, bottom))
    canvas.paste(crop, (0, target_y))

# The viewport captures contain floating support controls only below the crop.
# Cover the small floating language control present in the raw hero screenshot.
hero_patch = raw.crop((110, 993, 190, 1073))
mask = Image.new("L", hero_patch.size, 0)
mask_draw = ImageDraw.Draw(mask)
mask_draw.rounded_rectangle((8, 8, 72, 72), radius=20, fill=255)
mask = mask.filter(ImageFilter.GaussianBlur(10))
canvas.paste(hero_patch, (8, 993), mask)

sections = (
    (1, "Trình chiếu trang chủ", 38, 1123, "right"),
    (2, "Danh mục nhóm sản phẩm", 1123, 4526, "right"),
    (3, "FOX banner đa phương tiện", 4526, 5326, "right"),
    (4, "FOX chữ chạy", 5326, 5540, "right"),
    (5, "FOX bộ phối đồ", 5540, 6527, "right"),
    (6, "FOX câu chuyện sản phẩm", 6527, 7378, "right"),
    (8, "FOX tab sản phẩm", 7378, 8287, "right"),
    (9, "FOX ưu đãi đếm ngược", 8287, 8967, "right"),
    (10, "FOX hình ảnh phủ nội dung", 8967, 9532, "right"),
    (11, "Featured product X1", 9532, 10508, "right"),
    (13, "FOX so sánh hình ảnh", 10508, 11736, "right"),
    (14, "FOX câu chuyện mới nhất", 11736, 12449, "center"),
)

red = (205, 111, 111)
white = (255, 252, 252)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
draw = ImageDraw.Draw(canvas)
for number, title, top, bottom, side in sections:
    draw.rectangle((16, top, 1887, bottom - 1), outline=red, width=3)
    label = f"{number}. {title}"
    box = draw.textbbox((0, 0), label, font=font)
    label_width = box[2] - box[0] + 28
    label_height = 44
    left = 800 if side == "center" else 28 if side == "left" else 1875 - label_width
    label_top = top + 13
    draw.rectangle(
        (left, label_top, left + label_width, label_top + label_height),
        fill=white,
        outline=red,
        width=2,
    )
    draw.text((left + 14, label_top + 10), label, fill=red, font=font)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, "JPEG", quality=84, optimize=True, subsampling=0)
print(f"{OUTPUT} | {canvas.width}x{canvas.height} | {OUTPUT.stat().st_size} bytes")
