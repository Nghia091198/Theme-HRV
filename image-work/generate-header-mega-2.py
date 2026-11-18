"""Generate and verify the eight sportswear mega-menu photographs via 9Router."""

import argparse
import io
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFont, ImageOps


ROOT = Path(__file__).resolve().parents[1]
STAGE = Path(__file__).with_name("header-mega-2-stage")
ASSETS = ROOT / "FOX Fashion" / "assets"
PREVIEW = Path(__file__).with_name("header-mega-2-preview.jpg")
MODEL = "cx/gpt-image-2.5"
SIZE = (800, 1000)
BYTE_LIMIT = 512_000
sys.stdout.reconfigure(encoding="utf-8")

STYLE = (
    "Use case: photorealistic-natural. Asset type: editorial sportswear photograph "
    "for a small circular desktop mega-menu tile and a square mobile tile. "
    "A cohesive series for a youthful European-inspired activewear label: "
    "candid movement, real athletic effort, contemporary European locations, "
    "soft directional daylight, tactile technical fabric, pale stone or warm "
    "sand environments with restrained navy, sage and muted plum accents. "
    "Portrait 4:5 composition. The main athlete, activity-defining gesture and "
    "sports prop must be clearly legible inside the central square of the frame "
    "and still readable when cropped to a small circle. Natural unposed facial "
    "expression, physically plausible anatomy and movement, unbranded apparel. "
    "No text, typography, letters, logos, watermarks, advertising graphics, "
    "famous brands, extra limbs, duplicated people, mannequin pose or plastic skin. "
)

SCENES = {
    1: ("Chạy bộ", "A young adult woman in slate-blue running top and dark shorts running mid-stride beside a Copenhagen canal at sunrise. One foot lifting from the cobblestone path, arms in a natural running rhythm, wind moving her hair, lively face. Canal rail and bicycles softly blurred behind her; clearly a real run, not a standing pose."),
    2: ("Tập gym", "A fit young adult woman in a muted plum sports bra and charcoal leggings performing a controlled dumbbell lunge in a bright Berlin loft gym. Bent front knee, planted foot, weights visible near her hips, focused expression and authentic exertion. Light stone walls and large steel windows, no other people."),
    3: ("Yoga & Pilates", "A young adult woman in sage activewear flowing into a deep side lunge stretch on a mat in a sunlit Parisian Pilates studio. One hand grounded, torso reaching with the other arm, honest balance and fluid motion. Pale plaster, tall windows, little equipment; active practice rather than a static portrait."),
    4: ("Bơi lội", "A young adult woman athlete in an unbranded navy performance one-piece pushing off the wall of a modern outdoor lap pool in Lisbon. Water splashing naturally around her shoulders, arms extended into the water, energetic athletic motion. Pool lanes and pale stone architecture visibly establish swimming."),
    5: ("Tennis", "A young adult woman in a cream technical tennis top and dark plum skirt stepping into a forehand on a red clay tennis court in southern France. Racket and bright ball both visible near the central body, dynamic footwork and wind in her hair. Candid sports editorial photograph, not posed."),
    6: ("Đạp xe", "A young adult man in a navy unbranded technical cycling top and dark cycling shorts pedaling a road bicycle along a tree-lined European river path. Captured during a real turn, hands on the handlebars, legs in motion, morning light and subtle background motion blur; bicycle frame clearly recognizable in the center."),
    7: ("Đi bộ", "Two young adult women in lightweight sage and charcoal sportswear power-walking uphill on a coastal trail near Barcelona, mid-conversation and laughing. Natural uneven stride, arms moving, one small daypack, wind in their hair. Mediterranean grass and stone path; authentic active outdoor moment."),
    8: ("Thường ngày", "A young adult woman in a navy zip athletic jacket and relaxed active leggings walking briskly down a bright Copenhagen street after a workout, carrying a rolled exercise mat and talking animatedly with a friend in muted plum sportswear. Candid forward movement, spontaneous smile, contemporary European city backdrop."),
}


def filename(number):
    return f"header_mega_2_category_{number}_image.png"


def request_image(prompt):
    url = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("NINEROUTER_KEY"):
        headers["Authorization"] = "Bearer " + os.environ["NINEROUTER_KEY"]
    payload = {
        "model": MODEL,
        "prompt": STYLE + prompt,
        "size": "1024x1536",
        "quality": "medium",
        "output_format": "png",
    }
    request = Request(url, data=json.dumps(payload).encode("utf-8"), headers=headers, method="POST")
    with urlopen(request, timeout=300) as response:
        content_type = response.headers.get("Content-Type", "")
        data = response.read()
    if not content_type.startswith("image/"):
        raise RuntimeError(f"9Router returned {content_type}: {data[:200]!r}")
    return Image.open(io.BytesIO(data)).convert("RGB")


def optimize_png(source):
    source = ImageOps.fit(source, SIZE, method=Image.Resampling.LANCZOS)
    for colors in (256, 192, 160, 128, 96):
        reduced = source.quantize(colors=colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.FLOYDSTEINBERG)
        stream = io.BytesIO()
        reduced.save(stream, format="PNG", optimize=True)
        if stream.tell() < BYTE_LIMIT:
            return stream.getvalue(), colors
    raise RuntimeError("Optimized PNG remains above 500 KB")


def generate(numbers, replace=False):
    STAGE.mkdir(exist_ok=True)
    for number in numbers:
        path = STAGE / filename(number)
        if path.exists() and not replace:
            print(f"SKIP {path.name}: staged image already exists", flush=True)
            continue
        print(f"GENERATING {number}: {SCENES[number][0]}", flush=True)
        source = request_image(SCENES[number][1])
        if source.width < SIZE[0] or source.height < SIZE[1]:
            raise RuntimeError(f"Generated source too small for {number}: {source.size}")
        data, colors = optimize_png(source)
        path.write_bytes(data)
        print(f"STAGED {path.name}: {SIZE[0]}x{SIZE[1]}, {len(data)} bytes, {colors} colors", flush=True)


def make_preview():
    margin, gap, tile_w, tile_h = 24, 20, 300, 400
    sheet = Image.new("RGB", (margin * 2 + tile_w * 4 + gap * 3, margin * 2 + tile_h * 2 + gap), "#f2eeec")
    draw = ImageDraw.Draw(sheet)
    font = ImageFont.truetype("C:/Windows/Fonts/arial.ttf", 20)
    for index, (number, (title, _)) in enumerate(SCENES.items()):
        x = margin + (index % 4) * (tile_w + gap)
        y = margin + (index // 4) * (tile_h + gap)
        with Image.open(STAGE / filename(number)) as original:
            image = original.convert("RGB")
            portrait = image.resize((240, 300), Image.Resampling.LANCZOS)
            sheet.paste(portrait, (x + 30, y + 10))
            center = image.crop((0, 100, 800, 900)).resize((90, 90), Image.Resampling.LANCZOS)
            mask = Image.new("L", (90, 90), 0)
            ImageDraw.Draw(mask).ellipse((0, 0, 89, 89), fill=255)
            sheet.paste(center, (x + 192, y + 302), mask)
        draw.text((x + 8, y + 335), f"{number}. {title}", font=font, fill="#26313a")
    sheet.save(PREVIEW, "JPEG", quality=86, optimize=True)
    print(f"PREVIEW {PREVIEW}", flush=True)


def install():
    for number in SCENES:
        source = STAGE / filename(number)
        with Image.open(source) as image:
            if image.format != "PNG" or image.size != SIZE or source.stat().st_size >= BYTE_LIMIT:
                raise RuntimeError(f"Invalid staged image: {source}")
    for number in SCENES:
        target = ASSETS / filename(number)
        target.write_bytes((STAGE / filename(number)).read_bytes())
        print(f"INSTALLED {target}", flush=True)


def validate():
    theme = ROOT / "FOX Fashion"
    settings = json.loads((theme / "config" / "settings_data.json").read_text(encoding="utf-8"))["current"]
    settings_html = (theme / "config" / "settings.html").read_text(encoding="utf-8")
    snippet = (theme / "snippets" / "component-header-mega-type-2.liquid").read_text(encoding="utf-8")
    assert "category_image_key | asset_url" in snippet
    assert "category_alt | default: category_title" in snippet
    for number in SCENES:
        name = filename(number)
        path = ASSETS / name
        with Image.open(path) as image:
            assert image.format == "PNG" and image.mode == "P" and image.size == SIZE, name
            assert not image.getexif(), name
        assert path.stat().st_size < BYTE_LIMIT, name
        assert settings_html.count(f'name="{name}"') == 1, name
        assert settings[f"header_mega_2_category_{number}_image.png"] == name, name
        assert settings[f"header_mega_2_category_{number}_title"] == SCENES[number][0], name
        assert settings[f"header_mega_2_category_{number}_alt"], name
        print(f"PASS {name}: {SIZE[0]}x{SIZE[1]}, {path.stat().st_size} bytes", flush=True)
    print("PASS PNG format, metadata, settings keys, titles, alt and Liquid load contract", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", type=int, choices=tuple(SCENES))
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.only:
        generate((args.only,), replace=args.replace)
    elif not args.preview and not args.install and not args.validate:
        generate(SCENES, replace=args.replace)
    if args.preview:
        make_preview()
    if args.install:
        install()
    if args.validate:
        validate()
