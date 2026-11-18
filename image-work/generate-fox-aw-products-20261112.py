"""Generate the six FOX Activewear product photos via 9Router."""

import argparse
import base64
import io
import json
import os
import time
from pathlib import Path
from urllib.error import HTTPError
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageFilter, ImageOps


WORKSPACE = Path(__file__).resolve().parents[1]
OUTPUT = WORKSPACE / "haravan-content-manager" / "output" / "fox-aw-20261112-01a1"
PREVIEW = WORKSPACE / "image-work" / "fox-aw-products-20261112-preview.jpg"
MODEL = os.environ.get("FOX_IMAGE_MODEL", "cx/gpt-image-2.5")

BRAND_WORLD = (
    "BRAND WORLD: mood calm, confident, airy and premium-minimal; palette warm sand, soft stone grey, "
    "deep charcoal and one muted coral accent #FF7A45; locations a sunlit pilates studio with pale "
    "oak floor, linen curtains and frosted glass partitions, and a quiet riverside running path in "
    "Ho Chi Minh City at early morning; soft daylight from camera-left with gentle falloff; Vietnamese "
    "adult women aged 25-32 with natural athletic builds, minimal makeup and loosely tied dark hair; "
    "only activity-relevant props; full-frame 50mm or 85mm prime at eye level, 100mm macro for detail; "
    "natural colour, soft contrast, lifted shadows, no filter. "
)
EXCLUSIONS = (
    "Avoid: text, letters, logos, watermarks, brand marks, mannequins, floating garments, plastic or "
    "waxy skin, over-smoothed retouching, HDR look, oversaturated colours, CGI render look, distorted "
    "hands, extra fingers, duplicated limbs, warped faces, impossible seams, harsh flash, cluttered "
    "background, false fabric claims or visible care labels."
)

BRA_ANCHOR = (
    "The same adult Vietnamese woman, age 28, warm medium skin, oval face, dark brown eyes, "
    "black hair in a loose low bun, natural athletic build. The product is the same plain square-neck "
    "sports bra in matte fine-knit fabric with wide straps, a smooth underband and a clean unbranded back. "
)
LEGGING_ANCHOR = (
    "The same adult Vietnamese woman, age 30, warm medium skin, softly angular face, dark brown eyes, "
    "black hair in a low ponytail, natural athletic build. The product is the same plain high-waisted "
    "running legging in matte fine-knit fabric with a broad smooth waistband, one integrated side pocket, "
    "subtle practical seams and no branding. "
)

SHOTS = {
    "p1-hero.jpg": (
        BRA_ANCHOR +
        "Hero ecommerce square photograph. Bra colour is muted plum. She stands at ease, three-quarter "
        "angle with relaxed arms and a small natural smile, wearing plain charcoal leggings; show full "
        "bra front, straps and underband, head and both hands inside frame. Warm sand seamless paper "
        "backdrop with a true floor shadow. Soft window light from camera-left, late morning. Full-frame "
        "85mm at f/4, eye-level, bra visually prominent, body centered with breathing room. Visible skin "
        "texture, flyaway hairs and natural fabric folds."
    ),
    "p1-lifestyle.jpg": (
        BRA_ANCHOR +
        "On-model lifestyle square photograph. Bra colour is matte charcoal. She is in a sunlit Pilates "
        "studio, pausing to roll a sage exercise mat beside a pale oak bench after class; plain warm sand "
        "leggings, one clear water bottle placed on the floor. Show her head, torso, arms and hips with "
        "the square neckline, straps and underband unobscured. Soft daylight from camera-left, warm "
        "late morning. Full-frame 50mm at f/2.8, candid three-quarter view. Natural pores, a few "
        "flyaway hairs, realistic garment tension and imperfect movement."
    ),
    "p1-detail.jpg": (
        BRA_ANCHOR +
        "On-model detail square photograph. Bra colour is warm sand cream. Crop from her lower face "
        "to waist while she adjusts one wide strap with a natural hand; keep the square neckline, "
        "smooth underband and both visible bra edges within frame. Same sunlit Pilates studio, linen "
        "curtain softly blurred behind. Soft window light from camera-left. 100mm macro at f/5.6, "
        "eye-level close-up. Show fine matte knit, believable seams, skin pores and slight fabric folds."
    ),
    "p2-hero.jpg": (
        LEGGING_ANCHOR +
        "Hero ecommerce square full-body photograph. Legging colour is matte charcoal, 7/8 length. "
        "She stands relaxed in a natural weight shift, one hand loosely beside the side pocket, "
        "wearing a plain warm sand sleeveless top and neutral running shoes. Show waist, pocket, both "
        "legs and shoes fully inside frame; legging fills most of the frame. Warm sand seamless paper "
        "backdrop and true floor shadow. Soft window light from camera-left. Full-frame 85mm at f/4, "
        "eye-level. Real skin texture and fabric creases at knees and hips."
    ),
    "p2-lifestyle.jpg": (
        LEGGING_ANCHOR +
        "On-model lifestyle square photograph. Legging colour is muted olive, 7/8 length. She jogs at "
        "an easy pace on a quiet riverside running path in Ho Chi Minh City at early morning, wearing "
        "the same plain sand sleeveless top and practical running shoes; a simple sports watch on one "
        "wrist. Capture the waist, side pocket and both legs unobscured, head and shoes inside frame. "
        "Low warm morning sun from camera-left, gentle ground shadow. Full-frame 50mm at f/2.8, "
        "eye-level candid movement. Flyaway hair, natural skin texture and believable fabric folds."
    ),
    "p2-detail.jpg": (
        LEGGING_ANCHOR +
        "On-model detail square photograph. Legging colour is deep mocha brown. Crop from lower "
        "ribcage to mid-thigh while she slips a small unbranded phone into the integrated side pocket "
        "with one natural hand; show the broad waistband, pocket opening and legging fabric clearly. "
        "Same early-morning riverside path softly blurred behind. Gentle daylight from camera-left. "
        "100mm macro at f/5.6, three-quarter view. Real stitching, matte knit, skin texture and "
        "natural compression folds."
    ),
}


def request_image(prompt):
    url = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("NINEROUTER_KEY"):
        headers["Authorization"] = "Bearer " + os.environ["NINEROUTER_KEY"]
    body = json.dumps({
        "model": MODEL,
        "prompt": BRAND_WORLD + prompt + " " + EXCLUSIONS,
        "size": "2048x2048",
        "quality": "high",
        "output_format": "jpeg",
    }).encode("utf-8")
    for attempt in range(3):
        try:
            with urlopen(Request(url, data=body, headers=headers, method="POST"), timeout=360) as response:
                content_type = response.headers.get("Content-Type", "")
                data = response.read()
            if content_type.startswith("image/"):
                return data
            item = json.loads(data)["data"][0]
            if item.get("b64_json"):
                return base64.b64decode(item["b64_json"])
            if item.get("url"):
                with urlopen(item["url"], timeout=120) as response:
                    return response.read()
            raise RuntimeError(f"No image in response: {content_type}")
        except HTTPError as error:
            if error.code < 500 or attempt == 2:
                raise
            time.sleep(2 * (attempt + 1))
    raise RuntimeError("Image generation failed")


def generate(name):
    OUTPUT.mkdir(parents=True, exist_ok=True)
    target = OUTPUT / name
    if target.exists():
        raise FileExistsError(f"Refusing to replace {target}")
    raw = request_image(SHOTS[name])
    with Image.open(io.BytesIO(raw)) as source:
        source = ImageOps.exif_transpose(source).convert("RGB")
        if source.width < 1200 or source.height < 1200:
            raise RuntimeError(f"Generated source too small for modest resampling: {name} {source.size}")
        image = ImageOps.fit(source, (1600, 1600), Image.Resampling.LANCZOS)
        image = image.filter(ImageFilter.UnsharpMask(radius=0.6, percent=70, threshold=3))
        for quality in (84, 82, 80, 78, 76):
            encoded = io.BytesIO()
            image.save(encoded, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=2)
            if encoded.tell() < 512_000:
                break
        else:
            raise RuntimeError(f"Image exceeds 512000 bytes at quality 76: {name}")
    target.write_bytes(encoded.getvalue())
    print(f"CREATED {name} source={source.width}x{source.height} final=1600x1600 bytes={target.stat().st_size}", flush=True)


def preview():
    canvas = Image.new("RGB", (1600, 1130), "#f3eee8")
    draw = ImageDraw.Draw(canvas)
    for index, name in enumerate(SHOTS):
        x = 20 + (index % 3) * 530
        y = 20 + (index // 3) * 550
        with Image.open(OUTPUT / name) as original:
            thumb = original.resize((500, 500), Image.Resampling.LANCZOS)
            canvas.paste(thumb, (x, y))
        draw.text((x, y + 510), name, fill="#1b2631")
    canvas.save(PREVIEW, "JPEG", quality=84, optimize=True)
    print(f"PREVIEW {PREVIEW}", flush=True)


def validate():
    for name in SHOTS:
        path = OUTPUT / name
        with Image.open(path) as image:
            assert image.format == "JPEG", name
            assert image.size == (1600, 1600), name
            assert not image.getexif(), name
        assert path.stat().st_size < 512_000, name
        print(f"PASS {name}: {path.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=SHOTS)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.validate:
        validate()
    elif args.preview:
        preview()
    else:
        for name in ([args.only] if args.only else SHOTS):
            generate(name)
