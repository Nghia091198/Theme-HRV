"""Compose the homepage neo icon setting reference from two live desktop states."""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parent.parent
WORK = ROOT / "image-work"
OUTPUT = ROOT / "settings_image" / "neo-icons-home.jpg"

closed = Image.open(WORK / "neo-home-closed.jpg").convert("RGB")
opened = Image.open(WORK / "neo-home-open.jpg").convert("RGB")
canvas = Image.new("RGB", (1920, 1400), (255, 252, 252))
draw = ImageDraw.Draw(canvas)

red = (205, 111, 111)
ink = (104, 62, 62)
font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 22)
title_font = ImageFont.truetype("C:/Windows/Fonts/arialbd.ttf", 28)


def label(text, x, y):
    bounds = draw.textbbox((0, 0), text, font=font)
    width = bounds[2] - bounds[0] + 28
    draw.rectangle((x, y, x + width, y + 44), fill=(255, 252, 252), outline=red, width=2)
    draw.text((x + 14, y + 9), text, font=font, fill=red)
    return x + width


draw.text((28, 28), "2. Các neo icon — trang chủ", font=title_font, fill=ink)

# Closed state: bottom of a 1920 desktop viewport after scrolling. This holds
# the language bubble, back-to-top button and the grouped contact trigger.
closed_crop = closed.crop((0, 620, closed.width, closed.height))
canvas.paste(closed_crop, (8, 100))
draw.rectangle((8, 100, 8 + closed_crop.width - 1, 100 + closed_crop.height - 1), outline=red, width=2)

# Box the actual controls in the captured viewport and connect setting labels.
draw.rounded_rectangle((27, 479, 84, 541), radius=18, outline=red, width=3)
language_end = label("1. Ngôn ngữ", 105, 466)
draw.line((105, 493, 84, 511), fill=red, width=3)

draw.rounded_rectangle((1699, 412, 1902, 477), radius=22, outline=red, width=3)
group_end = label("3. Nhóm icons", 1467, 355)
draw.line((group_end - 38, 399, 1772, 412), fill=red, width=3)

draw.ellipse((1838, 480, 1901, 543), outline=red, width=3)
back_end = label("2. Nút Back to top", 1518, 498)
draw.line((back_end, 520, 1838, 512), fill=red, width=3)

# Open state is a second capture from the same desktop session. Keep the full
# contact card at native pixel scale so its channel names remain legible.
open_crop = opened.crop((1320, 360, 1920, 1080))
canvas.paste(open_crop, (1260, 625))
draw.rectangle((1260, 625, 1859, 1344), outline=red, width=2)
draw.rounded_rectangle((1431, 685, 1842, 1320), radius=26, outline=red, width=3)

open_end = label("3. Nhóm icons — dạng mở", 80, 715)
draw.text((94, 785), "Bảng Hỗ trợ hiển thị các kênh liên hệ.", font=font, fill=red)
draw.line((open_end + 22, 737, 1415, 737), fill=red, width=3)
draw.line((1415, 737, 1431, 735), fill=red, width=3)

OUTPUT.parent.mkdir(parents=True, exist_ok=True)
canvas.save(OUTPUT, "JPEG", quality=88, optimize=True, subsampling=0)
print(f"{OUTPUT} | {canvas.width}x{canvas.height} | {OUTPUT.stat().st_size} bytes")
