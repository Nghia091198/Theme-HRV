"""Generate the four FOX fabric lab photographs through 9Router."""

import argparse
import base64
import io
import json
import os
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "FOX Fashion" / "assets"
PREVIEW = ROOT / "image-work" / "fabric-lab-preview.jpg"
MODEL = "cx/gpt-image-2.5"
STYLE = (
    "Photorealistic premium editorial photography for FOX, a Vietnamese women's activewear brand. "
    "Match a cohesive warm daylight art direction: pale limestone and sand backgrounds, "
    "muted plum #5C3D50 and deep navy #1B2631 garments, natural skin and tactile fabric texture. "
    "Realistic anatomy and garment construction, understated styling, no artificial gloss. "
    "No text, letters, logos, labels, watermark, recognizable brand, or extra people. "
)
JOBS = {
    "fabric_hero_image.jpg": {
        "request_size": "1536x1024",
        "output_size": (1000, 760),
        "prompt": (
            "Landscape close-up material study for a fabric technology hero. Layered folds of a plum "
            "technical legging fabric and deep navy breathable sports top on pale limestone, one "
            "gentle hand stretching a small edge of the plum fabric to reveal its fine knit and "
            "elasticity. Macro detail but still a calm complete composition; believable stitching, "
            "soft directional window light, no face and no printed claims."
        ),
    },
    "fabric_yoga_image.jpg": {
        "request_size": "1024x1536",
        "output_size": (900, 1100),
        "prompt": (
            "Vertical lifestyle photograph for a yoga outfit recommendation. One adult Vietnamese woman "
            "with natural athletic build in an unbranded muted plum sports bra and high-waisted plum "
            "leggings, holding a stable warrior two yoga pose on a mat in a bright minimal studio. "
            "Show her whole body, face, both hands and feet fully within the central 75 percent of the "
            "frame with generous margins for a 9:11 crop. Natural focused expression, soft sunlight, "
            "clear outfit silhouette, no other person."
        ),
    },
    "fabric_pilates_image.jpg": {
        "request_size": "1024x1536",
        "output_size": (900, 1100),
        "prompt": (
            "Vertical lifestyle photograph for a Pilates outfit recommendation, visibly distinct from "
            "yoga. One adult Vietnamese woman with natural athletic build in an unbranded deep navy "
            "fitted sleeveless top and warm taupe high-waisted leggings, doing a controlled Pilates "
            "reformer lunge in a light stone and timber studio. Show the reformer, her whole body, face, "
            "both hands and feet within the central 75 percent of the frame for a 9:11 crop. "
            "Precise plausible equipment, authentic motion, soft window daylight, no other person."
        ),
    },
    "fabric_care_image.jpg": {
        "request_size": "1536x1024",
        "output_size": (900, 700),
        "prompt": (
            "Landscape editorial still life about caring for activewear. A pair of clean plum leggings "
            "and a deep navy sports top neatly air-drying on a simple wooden rack beside a sunlit "
            "studio window, with a small folded cream cotton towel on a limestone bench. Show fabric "
            "shape and texture; quiet shade with warm diffused daylight, understated home setting, "
            "no washing machine, detergent packaging, tags or printed symbols."
        ),
    },
}


def request_image(prompt, size):
    url = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("NINEROUTER_KEY"):
        headers["Authorization"] = "Bearer " + os.environ["NINEROUTER_KEY"]
    body = json.dumps({
        "model": MODEL,
        "prompt": STYLE + prompt,
        "size": size,
        "quality": "high",
        "output_format": "jpeg",
    }).encode("utf-8")
    with urlopen(Request(url, data=body, headers=headers, method="POST"), timeout=300) as response:
        content_type = response.headers.get("Content-Type", "")
        data = response.read()
    if content_type.startswith("image/"):
        return data
    result = json.loads(data)
    item = result["data"][0]
    if item.get("b64_json"):
        return base64.b64decode(item["b64_json"])
    if item.get("url"):
        with urlopen(item["url"], timeout=120) as response:
            return response.read()
    raise RuntimeError(f"No image in response: {content_type}")


def generate(name):
    target = ASSETS / name
    if target.exists():
        raise FileExistsError(f"Refusing to overwrite {target}")
    spec = JOBS[name]
    raw = request_image(spec["prompt"], spec["request_size"])
    with Image.open(io.BytesIO(raw)) as source:
        source = ImageOps.exif_transpose(source).convert("RGB")
        width, height = spec["output_size"]
        if source.width < width or source.height < height:
            raise RuntimeError(f"Source for {name} is too small: {source.size}")
        final = ImageOps.fit(source, (width, height), Image.Resampling.LANCZOS)
        encoded = io.BytesIO()
        for quality in (84, 80, 76):
            encoded = io.BytesIO()
            final.save(encoded, "JPEG", quality=quality, optimize=True, progressive=True, subsampling=2)
            if encoded.tell() < 512_000:
                break
        if encoded.tell() >= 512_000:
            raise RuntimeError(f"Optimized image exceeds 500 KB: {name}")
    target.write_bytes(encoded.getvalue())
    print(f"CREATED {name}: {width}x{height}, {target.stat().st_size} bytes", flush=True)


def make_preview():
    canvas = Image.new("RGB", (1160, 950), "#f3eee8")
    draw = ImageDraw.Draw(canvas)
    for index, name in enumerate(JOBS):
        x = 20 + (index % 2) * 570
        y = 20 + (index // 2) * 465
        with Image.open(ASSETS / name) as source:
            thumb = ImageOps.contain(source.convert("RGB"), (540, 410), Image.Resampling.LANCZOS)
            canvas.paste(thumb, (x + (540 - thumb.width) // 2, y))
        draw.text((x, y + 420), name, fill="#1b2631")
    canvas.save(PREVIEW, "JPEG", quality=84, optimize=True)
    print(f"PREVIEW {PREVIEW}", flush=True)


def validate():
    for name, spec in JOBS.items():
        path = ASSETS / name
        with Image.open(path) as image:
            assert image.format == "JPEG", name
            assert image.size == spec["output_size"], name
            assert not image.getexif(), name
        assert path.stat().st_size < 512_000, name
        print(f"PASS {name}: {path.stat().st_size} bytes", flush=True)


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--only", choices=JOBS)
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.validate:
        validate()
    elif args.preview:
        make_preview()
    else:
        for filename in ([args.only] if args.only else JOBS):
            generate(filename)
