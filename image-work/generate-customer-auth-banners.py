"""Generate desktop and mobile customer-auth backgrounds through 9Router."""

import argparse
import io
import json
import os
import sys
from pathlib import Path
from urllib.request import Request, urlopen

from PIL import Image, ImageDraw, ImageOps


ROOT = Path(__file__).resolve().parents[1]
WORK = Path(__file__).resolve().parent
ASSETS = ROOT / "FOX Fashion" / "assets"
MODEL = os.environ.get("NINEROUTER_IMAGE_MODEL", "cx/gpt-image-2.5")
sys.stdout.reconfigure(encoding="utf-8")

SPECS = {
    "desktop": {
        "source_size": "2048x1152",
        "output_size": (1920, 1080),
        "limit": 1_048_576,
        "draft": WORK / "customer-auth-desktop-draft.jpg",
        "asset": ASSETS / "customer_auth_banner_desktop.jpg",
        "prompt": (
            "Use case: photorealistic-natural. Asset type: wide desktop background "
            "photograph for an activewear store's login and registration pages. "
            "A candid early morning run along a European canal promenade. Two "
            "young adult women, one in unbranded deep navy technical sportswear "
            "and one in muted plum running apparel, genuinely moving mid-stride "
            "toward the camera from the right side of the frame; relaxed confident "
            "faces, wind in hair, correct running form, visible activewear fabric "
            "and shoes. Warm clear daylight, pale stone buildings, subtle water, "
            "soft motion in the environment. Premium contemporary European sports "
            "editorial style, youthful and approachable. Wide 16:9 landscape "
            "composition: athletes in the right half, leading runner around "
            "65 percent across, left 45 percent visually calm and darker for a "
            "large white heading. Keep all faces, limbs and shoes inside the frame. "
            "No static pose, no studio backdrop, no text, letters, signs, logos, "
            "watermarks, famous brands, extra limbs or distorted anatomy."
        ),
    },
    "mobile": {
        "source_size": "1024x1536",
        "output_size": (750, 1000),
        "limit": 512_000,
        "draft": WORK / "customer-auth-mobile-draft.jpg",
        "asset": ASSETS / "customer_auth_banner_mobile.jpg",
        "prompt": (
            "Use case: photorealistic-natural. Asset type: portrait mobile "
            "background photograph for an activewear store's login and "
            "registration pages, companion to a wide European canal running "
            "campaign image. A young adult woman in unbranded deep navy "
            "technical top and running shorts moving mid-stride toward the "
            "camera on a sunlit Copenhagen canal promenade, with a friend in "
            "muted plum activewear just behind her. Natural effort and joy, "
            "wind moving hair, correct running form, vivid fabric and shoes. "
            "Pale stone buildings, water and soft morning light, contemporary "
            "European sports editorial photography. Portrait 3:4 composition "
            "with the lead runner centered and her face in the upper third; "
            "leave breathing room around head and body for responsive cover "
            "cropping and a form panel over the lower center. No static pose, "
            "no studio backdrop, no text, letters, signs, logos, watermarks, "
            "famous brands, extra limbs or distorted anatomy."
        ),
    },
}


def generate_image(spec):
    url = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
    headers = {"Content-Type": "application/json"}
    if os.environ.get("NINEROUTER_KEY"):
        headers["Authorization"] = "Bearer " + os.environ["NINEROUTER_KEY"]
    body = {
        "model": MODEL,
        "prompt": spec["prompt"],
        "size": spec["source_size"],
        "quality": "medium",
        "output_format": "jpeg",
    }
    request = Request(url, data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
    with urlopen(request, timeout=300) as response:
        content_type = response.headers.get("Content-Type", "")
        data = response.read()
    if not content_type.startswith("image/"):
        raise RuntimeError(f"9Router returned {content_type}: {data[:200]!r}")
    return ImageOps.exif_transpose(Image.open(io.BytesIO(data))).convert("RGB")


def encode_image(source, spec):
    target_width, target_height = spec["output_size"]
    if source.width < target_width or source.height < target_height:
        if spec is not SPECS["desktop"] or source.width < target_width * 0.85 or source.height < target_height * 0.85:
            raise RuntimeError(f"Generated image {source.size} is too small for {spec['output_size']}")
        print(f"RESAMPLING desktop from {source.size} to {spec['output_size']} ({target_width / source.width:.1%} width)", flush=True)
    image = ImageOps.fit(source, spec["output_size"], method=Image.Resampling.LANCZOS)
    for quality in (86, 84, 82, 80, 78, 76, 74):
        for subsampling in (0, 2):
            output = io.BytesIO()
            image.save(output, format="JPEG", quality=quality, optimize=True, progressive=True, subsampling=subsampling)
            if output.tell() < spec["limit"]:
                return output.getvalue(), quality, subsampling
    raise RuntimeError(f"Could not encode under {spec['limit']} bytes")


def generate(which, replace=False):
    spec = SPECS[which]
    if spec["draft"].exists() and not replace:
        print(f"SKIP {spec['draft']}: draft already exists", flush=True)
        return
    print(f"GENERATING {which} via {MODEL}", flush=True)
    source = generate_image(spec)
    print(f"SOURCE {which}: {source.width}x{source.height}", flush=True)
    data, quality, subsampling = encode_image(source, spec)
    spec["draft"].write_bytes(data)
    print(f"DRAFT {spec['draft']}: {len(data)} bytes, JPEG quality {quality}, subsampling {subsampling}", flush=True)


def repair_desktop():
    spec = SPECS["desktop"]
    with Image.open(spec["draft"]) as expanded:
        original_area = expanded.convert("RGB").crop((124, 69, 1796, 1010))
    data, quality, subsampling = encode_image(original_area, spec)
    spec["draft"].write_bytes(data)
    print(f"REPAIRED {spec['draft']}: {len(data)} bytes, quality {quality}, subsampling {subsampling}", flush=True)


def preview():
    desktop = Image.open(SPECS["desktop"]["draft"]).convert("RGB")
    mobile = Image.open(SPECS["mobile"]["draft"]).convert("RGB")
    sheet = Image.new("RGB", (1390, 590), "#f1eeea")
    sheet.paste(desktop.resize((960, 540), Image.Resampling.LANCZOS), (20, 20))
    sheet.paste(mobile.resize((375, 500), Image.Resampling.LANCZOS), (995, 20))
    ImageDraw.Draw(sheet).rectangle((19, 19, 980, 560), outline="#cfc8c3", width=2)
    ImageDraw.Draw(sheet).rectangle((994, 19, 1370, 520), outline="#cfc8c3", width=2)
    path = WORK / "customer-auth-banner-preview.jpg"
    sheet.save(path, "JPEG", quality=85, optimize=True)
    print(f"PREVIEW {path}", flush=True)


def validate(paths):
    settings_html = (ROOT / "FOX Fashion" / "config" / "settings.html").read_text(encoding="utf-8")
    settings_data = json.loads((ROOT / "FOX Fashion" / "config" / "settings_data.json").read_text(encoding="utf-8"))
    snippets = "".join((ROOT / "FOX Fashion" / "snippets" / name).read_text(encoding="utf-8") for name in ("customer.liquid", "account-hero.liquid"))
    for which, spec in SPECS.items():
        path = spec[paths]
        with Image.open(path) as image:
            assert image.format == "JPEG" and image.mode == "RGB" and image.size == spec["output_size"], path
            assert not image.getexif(), path
        assert path.stat().st_size < spec["limit"], path
        assert settings_html.count(f'name="{spec["asset"].name}"') == 1, path
        assert spec["asset"].name in snippets, path
        assert spec["asset"].name in settings_data["current"], path
        print(f"PASS {path}: {spec['output_size']}, {path.stat().st_size} bytes", flush=True)


def install():
    validate("draft")
    for spec in SPECS.values():
        spec["asset"].write_bytes(spec["draft"].read_bytes())
        print(f"INSTALLED {spec['asset']}", flush=True)
    validate("asset")


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--desktop", action="store_true")
    parser.add_argument("--mobile", action="store_true")
    parser.add_argument("--replace", action="store_true")
    parser.add_argument("--preview", action="store_true")
    parser.add_argument("--repair-desktop", action="store_true")
    parser.add_argument("--install", action="store_true")
    parser.add_argument("--validate", action="store_true")
    args = parser.parse_args()
    if args.desktop:
        generate("desktop", replace=args.replace)
    if args.mobile:
        generate("mobile", replace=args.replace)
    if args.preview:
        preview()
    if args.repair_desktop:
        repair_desktop()
    if args.install:
        install()
    if args.validate:
        validate("asset")
