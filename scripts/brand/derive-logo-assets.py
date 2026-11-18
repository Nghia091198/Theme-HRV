"""Derive the circle variants and .ico files of a logo kit (docs/brand-logo-guide.md, section 3).

Usage: python scripts/brand/derive-logo-assets.py <kit-dir> [--ink "#1B2631"] [--accent "#FF7A45"]

Reads (by file-name suffix, so any theme prefix works):
  01-bieu-tuong/*-mau-1024.png, *-trang-1024.png, *-trang-1-mau-1024.png   transparent marks
  06-mang-xa-hoi/*avatar-1080.png                                          glass avatar (square)
  05-favicon/favicon-16.png, -32.png, -48.png, -512.png                    per-size favicons
Writes:
  05-favicon/favicon.ico, favicon-tron.ico (16/32/48/64)
  07-dang-tron/{prefix}-tron-kinh|trang|muc|nhan-{1024,512,256}.png
Requires Pillow >= 10.1 (ICO append_images).
"""
import argparse
import glob
import os
import sys

from PIL import Image, ImageDraw

MARK_WIDTH = 0.48  # mark width / circle diameter, as in the FOX avatar


def one(pattern):
    found = sorted(glob.glob(pattern))
    if "-1-mau-" not in pattern:
        found = [f for f in found if "-1-mau-" not in os.path.basename(f)]
    if not found:
        sys.exit(f"missing: {pattern}")
    return found[0]


def hex_rgba(value):
    value = value.lstrip("#")
    return tuple(int(value[i:i + 2], 16) for i in (0, 2, 4)) + (255,)


def circle_mask(size, scale=4):
    big = Image.new("L", (size * scale, size * scale), 0)
    ImageDraw.Draw(big).ellipse((0, 0, size * scale - 1, size * scale - 1), fill=255)
    return big.resize((size, size), Image.LANCZOS)


def round_crop(image):
    out = image.copy()
    out.putalpha(Image.composite(out.getchannel("A"), Image.new("L", out.size, 0), circle_mask(out.width)))
    return out


def flat_circle(background, mark_file, size=1024):
    mark = Image.open(mark_file).convert("RGBA")
    mark = mark.crop(mark.getbbox())
    width = round(size * MARK_WIDTH)
    height = round(mark.height * width / mark.width)
    mark = mark.resize((width, height), Image.LANCZOS)
    canvas = Image.new("RGBA", (size, size), background)
    canvas.alpha_composite(mark, ((size - width) // 2, (size - height) // 2))
    return round_crop(canvas)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("kit")
    parser.add_argument("--ink", default="#1B2631")
    parser.add_argument("--accent", default="#FF7A45")
    args = parser.parse_args()
    kit = args.kit

    colour = one(os.path.join(kit, "01-bieu-tuong", "*-mau-1024.png"))
    white = one(os.path.join(kit, "01-bieu-tuong", "*-trang-1024.png"))
    white_solid = one(os.path.join(kit, "01-bieu-tuong", "*-trang-1-mau-1024.png"))
    avatar = one(os.path.join(kit, "06-mang-xa-hoi", "*avatar-1080.png"))
    prefix = os.path.basename(colour).split("-")[0]

    out_dir = os.path.join(kit, "07-dang-tron")
    os.makedirs(out_dir, exist_ok=True)
    glass = round_crop(Image.open(avatar).convert("RGBA").resize((1024, 1024), Image.LANCZOS))
    variants = {
        "kinh": glass,
        "trang": flat_circle((255, 255, 255, 255), colour),
        "muc": flat_circle(hex_rgba(args.ink), white),
        "nhan": flat_circle(hex_rgba(args.accent), white_solid),
    }
    for name, image in variants.items():
        for size in (1024, 512, 256):
            image.resize((size, size), Image.LANCZOS).save(os.path.join(out_dir, f"{prefix}-tron-{name}-{size}.png"), optimize=True)

    favicon_dir = os.path.join(kit, "05-favicon")
    own = [Image.open(os.path.join(favicon_dir, f"favicon-{s}.png")).convert("RGBA") for s in (48, 32, 16)]
    f64 = Image.open(os.path.join(favicon_dir, "favicon-512.png")).convert("RGBA").resize((64, 64), Image.LANCZOS)
    f64.save(os.path.join(favicon_dir, "favicon.ico"), format="ICO", sizes=[(64, 64), (48, 48), (32, 32), (16, 16)], append_images=own)
    round_sizes = [glass.resize((s, s), Image.LANCZOS) for s in (64, 48, 32, 16)]
    round_sizes[0].save(os.path.join(favicon_dir, "favicon-tron.ico"), format="ICO", sizes=[(s, s) for s in (64, 48, 32, 16)], append_images=round_sizes[1:])

    print(f"ok: {out_dir} (4 variants x 3 sizes), {favicon_dir}/favicon.ico, favicon-tron.ico")


if __name__ == "__main__":
    main()
