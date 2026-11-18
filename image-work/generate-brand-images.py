"""Generate and optimize the eight FOX brand page photographs via 9Router."""

import argparse
import base64
import io
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps


ASSET_DIR = Path(__file__).resolve().parents[1] / "FOX Fashion" / "assets"
MODEL = "cx/gpt-image-2.5"
PREVIEW_PATH = Path(__file__).with_name("brand-preview.jpg")

ART_DIRECTION = (
    "Use case: photorealistic-natural. A cohesive editorial image for a youthful "
    "European-inspired women's activewear brand: real photography, candid energy, "
    "warm daylight, clean sand or pale stone backgrounds, restrained navy #1B2631 "
    "and plum #5C3D50 accents. Premium but approachable, tactile materials, "
    "natural skin texture. No text, letters, logos, watermarks, or famous brands. "
    "No extra fingers, distorted anatomy, duplicated garments, or artificial plastic sheen. "
)

IMAGES = {
    "brand_image_1.jpg": {
        "size": "1536x1024",
        "output": (1200, 900),
        "prompt": "Landscape 4:3 lead editorial photograph. Adult woman in her 20s wearing an unbranded muted plum sports bra and high-waisted matching leggings, moving naturally through a light Pilates stretch in a contemporary Copenhagen-style studio with pale limestone floor and tall windows. Entire full body visible, perfectly centered, occupying only the central 55 percent of image width and 75 percent of image height, with generous floor and wall margins above hands and below feet. Authentic motion, no posing for camera. Her outfit is the focal point. Keep her fully safe within a tall center crop for desktop as well as the entire wide image for mobile.",
    },
    "brand_image_2.jpg": {
        "size": "1024x1024",
        "output": (800, 800),
        "prompt": "Square extreme macro editorial photograph of premium sage green activewear fabric stretched gently across a smooth curve, showing a fine knit texture, subtle elasticity, and soft natural folds. Warm side light from a European atelier window, pale sand backdrop, precise fabric detail, no people, no labels.",
    },
    "brand_image_3.jpg": {
        "size": "1024x1024",
        "output": (800, 800),
        "prompt": "Square premium studio product photograph of one unbranded women's sports bra in soft plum, neatly arranged flat on a warm off-white plaster surface. Contemporary European activewear editorial styling, clean silhouette, true stitching and straps, soft directional daylight, slight shadow, no model, no text or label, product fully visible with breathing room.",
    },
    "brand_image_4.jpg": {
        "size": "1024x1024",
        "output": (800, 800),
        "prompt": "Square close-up editorial photograph of the curved seam and meticulous flatlock stitching on a navy women's legging, fabric held naturally in a gentle fold. The construction and textile quality are clearly visible; precise real stitching, warm pale stone surface in background, European fashion atelier mood, subtle side light, no hands, no labels or writing.",
    },
    "brand_image_5.jpg": {
        "size": "1024x1024",
        "output": (800, 800),
        "prompt": "Square fashion editorial photograph focused on unbranded sage high-waisted women's leggings worn by an adult woman walking through a bright minimal Parisian studio. Frame from mid torso to shoes, show authentic natural stride and full legging silhouette, pale stone and sand background, soft daylight, youthful energy, no text, no logos, keep waist and shoes inside frame.",
    },
    "brand_app_1_image.jpg": {
        "size": "1024x1536",
        "output": (800, 1000),
        "prompt": "Portrait 4:5 premium product packaging photograph. Two blank unbranded thick paper hang tags, one navy and one warm sand, tied with fine cotton cord to a neatly folded plum activewear garment. Resting on light limestone with a subtle sunny shadow. Contemporary European boutique styling, tactile paper grain, elegant restrained composition, tags clearly visible and fully inside frame. Absolutely no writing, symbols or logos on the tags.",
    },
    "brand_app_2_image.jpg": {
        "size": "1024x1536",
        "output": (800, 1000),
        "prompt": "Portrait 4:5 premium editorial photograph of a single matte navy reusable shopping bag with cotton handles, standing on pale stone beside a warm sand wall in a bright European boutique. A folded sage activewear garment peeks subtly from the top. Clean modern silhouette, soft daylight and refined shadow, bag completely inside frame. Bag is blank with no lettering, symbol or logo.",
    },
    "brand_app_3_image.jpg": {
        "size": "1024x1536",
        "output": (800, 1000),
        "prompt": "Portrait 4:5 macro product photograph of a plain small woven cream fabric care label stitched into the inside seam of a premium plum activewear legging. Show real cloth fibers, precise stitching and soft natural folds with bright European atelier daylight; tactile, clean and understated. Keep the label and seam fully within frame. Label must be blank, absolutely no words, numbers, symbols or logos.",
    },
}


def generate(name, spec, replace=False):
    url = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("NINEROUTER_KEY"):
        headers["Authorization"] = "Bearer " + os.environ["NINEROUTER_KEY"]
    payload = {
        "model": MODEL,
        "prompt": ART_DIRECTION + spec["prompt"],
        "size": spec["size"],
        "quality": "medium",
        "output_format": "jpeg",
    }
    request = Request(url, data=json.dumps(payload).encode(), headers=headers, method="POST")
    with urlopen(request, timeout=300) as response:
        content_type = response.headers.get("Content-Type", "")
        data = response.read()
    if "image/" not in content_type:
        try:
            result = json.loads(data)
            item = result["data"][0]
            if item.get("b64_json"):
                data = base64.b64decode(item["b64_json"])
            elif item.get("url"):
                with urlopen(item["url"], timeout=120) as response:
                    data = response.read()
            else:
                raise RuntimeError("Image response did not contain image data")
        except Exception as exc:
            raise RuntimeError(f"Unexpected image response ({content_type}): {data[:250]!r}") from exc

    with Image.open(io.BytesIO(data)) as source:
        source = ImageOps.exif_transpose(source).convert("RGB")
        target_w, target_h = spec["output"]
        if source.width < target_w or source.height < target_h:
            raise RuntimeError(f"Generated source for {name} is too small: {source.size}")
        image = ImageOps.fit(source, spec["output"], method=Image.Resampling.LANCZOS, centering=(0.5, 0.5))
        output = io.BytesIO()
        image.save(output, format="JPEG", quality=83, optimize=True, progressive=True, subsampling=0)
        if len(output.getvalue()) >= 512_000:
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=78, optimize=True, progressive=True, subsampling=2)
        if len(output.getvalue()) >= 512_000:
            raise RuntimeError(f"Optimized {name} exceeds 500 KB")

    path = ASSET_DIR / name
    if path.exists() and not replace:
        raise FileExistsError(f"Refusing to replace existing asset: {path}")
    path.write_bytes(output.getvalue())
    print(f"{name}: {target_w}x{target_h}, {len(output.getvalue())} bytes, JPEG", flush=True)


def make_preview():
    margin, gap, tile_w, tile_h = 24, 16, 300, 390
    sheet = Image.new("RGB", (margin * 2 + tile_w * 4 + gap * 3,
                              margin * 2 + tile_h * 2 + gap), "#f3eee8")
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(IMAGES):
        x = margin + (index % 4) * (tile_w + gap)
        y = margin + (index // 4) * (tile_h + gap)
        draw.rounded_rectangle((x, y, x + tile_w, y + tile_h), radius=12, fill="#ffffff")
        with Image.open(ASSET_DIR / name) as original:
            thumb = ImageOps.contain(original.convert("RGB"), (tile_w - 16, tile_h - 50))
            sheet.paste(thumb, (x + (tile_w - thumb.width) // 2,
                                y + (tile_h - 50 - thumb.height) // 2))
        draw.text((x + 12, y + tile_h - 34), name, fill="#1b2631")
    sheet.save(PREVIEW_PATH, format="JPEG", quality=85, optimize=True)
    print(f"Preview: {PREVIEW_PATH}", flush=True)


def validate_assets():
    root = ASSET_DIR.parent
    settings_html = (root / "config" / "settings.html").read_text(encoding="utf-8")
    settings_data = (root / "config" / "settings_data.json").read_text(encoding="utf-8")
    json.loads(settings_data)
    template = (root / "templates" / "page.brand.liquid").read_text(encoding="utf-8")
    assert "w: '1200', h: '900'" in template
    assert "(1200x900px, ảnh 1 hiển thị lớn)" in settings_html
    assert "include 'render-img'" in template
    for name, spec in IMAGES.items():
        path = ASSET_DIR / name
        with Image.open(path) as image:
            assert image.format == "JPEG", name
            assert image.size == spec["output"], name
            assert not image.getexif(), name
        assert path.stat().st_size < 512_000, name
        assert settings_html.count(f'name="{name}"') == 1, name
        assert f'"{name}"' in settings_data, name
        print(f"PASS {name}: {spec['output'][0]}x{spec['output'][1]}, {path.stat().st_size} bytes", flush=True)
    print("PASS settings keys, template dimensions, JSON syntax, JPEG format and byte limits", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=IMAGES)
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.validate:
        validate_assets()
        raise SystemExit(0)
    if args.preview:
        make_preview()
        raise SystemExit(0)
    names = [args.only] if args.only else [name for name in IMAGES if not (ASSET_DIR / name).exists()]
    for image_name in names:
        generate(image_name, IMAGES[image_name], replace=args.replace)
