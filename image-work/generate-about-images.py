"""Generate editorial source photos for the About page via the local 9Router gateway."""

from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import time
from urllib.request import Request, urlopen


ROOT = Path(__file__).resolve().parent
URL = os.environ["NINEROUTER_URL"].rstrip("/") + "/v1/images/generations?response_format=binary"
KEY = os.environ["NINEROUTER_KEY"]

STYLE = (
    "Use case: photorealistic-natural. Premium contemporary editorial photograph for a "
    "Vietnamese women's activewear About Us page. Restrained plum, charcoal, warm taupe, "
    "soft ivory palette; gentle natural light, tactile fabric detail, realistic human anatomy. "
    "Clean sophisticated composition, genuine motion and diverse adult body types when people appear. "
    "No text, lettering, logo, labels, watermark, collage, split panels, or product packaging. "
    "This is an illustrative brand image, not a documentary claim about any actual workshop or customer. "
)

JOBS = [
    ("about_hero_side_1_image.jpg", "An adult Vietnamese woman in plum sports bra and charcoal leggings adjusting her jacket after Pilates in a calm sunlit studio; medium portrait, tasteful candid editorial.", "4:3"),
    ("about_hero_side_2_image.jpg", "Two adult Vietnamese women jogging together along a quiet tree-lined urban path in morning light, neutral technical activewear, joyful natural movement; medium-wide.", "4:3"),
    ("about_statement_image_1.jpg", "Macro tactile detail of recycled nylon knit in plum and taupe, softly folded, graceful diagonal light, no visible label; horizontal composition.", "16:9"),
    ("about_statement_image_2.jpg", "Hands carefully smoothing and checking the flat seams of a plum activewear garment on a clean worktable, intimate horizontal detail.", "16:9"),
    ("about_marquee_image_1.jpg", "Adult Vietnamese woman walking confidently out of a Pilates studio in layered plum and charcoal activewear, soft sunlit architecture, horizontal candid crop.", "16:9"),
    ("about_marquee_image_2.jpg", "Close dynamic view of adult Vietnamese woman stretching with resistance band in minimal studio, warm taupe and plum activewear, horizontal action crop.", "16:9"),
    ("about_workshop_1_image.jpg", "Conceptual close-up of recycled nylon yarn cones in muted plum and ivory next to a small swatch of technical knit, organized apparel workroom, editorial still life.", "5:4"),
    ("about_workshop_2_image.jpg", "Top-down conceptual apparel pattern making table with paper pattern pieces, measuring tape, pencil and neutral technical fabric; hands of an adult Vietnamese craftsperson, no writing or numbers visible.", "5:4"),
    ("about_workshop_3_image.jpg", "Conceptual activewear sample fitting: two adult Vietnamese women of different realistic body types checking fit of plum leggings and sports top in bright minimal studio, natural collaborative gesture.", "5:4"),
    ("about_workshop_4_image.jpg", "Macro conceptual craftsmanship photo of hands inspecting a neat flatlock seam on charcoal technical activewear fabric on clean worktable; tactile detail.", "5:4"),
    ("about_process_1_image.jpg", "Vertical editorial still life of recycled nylon yarn cones, delicate thread and soft plum technical knit, on warm neutral workbench, sustainable material concept.", "3:4"),
    ("about_process_2_image.jpg", "Vertical top-down editorial of adult Vietnamese pattern maker's hands positioning a paper pattern over charcoal technical fabric on a clean table, no readable writing.", "3:4"),
    ("about_process_3_image.jpg", "Vertical editorial detail of adult Vietnamese garment worker hands guiding plum technical fabric through a sewing machine, focusing on precise flat seams, no face or factory identity.", "3:4"),
    ("about_process_4_image.jpg", "Vertical candid editorial of adult Vietnamese woman in neutral plum activewear bending and stretching during a fit test in a bright minimal Pilates studio, full body, natural pose.", "3:4"),
    ("about_quote_image.jpg", "Very wide calm editorial scene of two adult Vietnamese women in charcoal and plum activewear resting after a run on the far right, soft dawn city park; deep muted plum shadow and uncluttered negative space on left for white quote text.", "wide"),
    ("about_duo_1_image.jpg", "Vertical premium activewear editorial: adult Vietnamese woman of realistic athletic build doing a Pilates lunge in a bright warm minimalist studio, wearing plum sports bra and matching high-waist leggings, full body, product clearly visible.", "9:10"),
    ("about_duo_2_image.jpg", "Vertical premium activewear editorial: adult Vietnamese woman jogging along a warm modern city street, wearing charcoal long-sleeve technical top and taupe 7/8 leggings, full body and outfit clearly visible.", "9:10"),
    ("about_value_1_image.jpg", "Editorial macro still life of soft recycled nylon activewear fabric in plum, charcoal and taupe, knit texture and elegant folds, material quality concept.", "4:3"),
    ("about_value_2_image.jpg", "Conceptual editorial image of adult Vietnamese craftsperson's hands inspecting precise seams and finished activewear garment on a clean sewing table, subtle warm light, no brand signage.", "4:3"),
    ("about_value_3_image.jpg", "Three adult Vietnamese women with naturally different body types standing confidently together in coordinated neutral plum and charcoal activewear in a sunlit studio, friendly and inclusive editorial.", "4:3"),
    ("about_cta_image.jpg", "Adult Vietnamese woman in understated plum activewear leaving a Pilates class with a rolled mat, warmly lit minimal studio doorway, confident candid editorial, subject centered-right and uncluttered composition.", "9:7"),
]


def generate(job):
    filename, scene, ratio = job
    target = ROOT / filename
    if target.exists():
        return filename, "exists", target.stat().st_size
    prompt = STYLE + f"Asset composition: {ratio} aspect ratio. Scene: {scene}"
    data = json.dumps({
        "model": "cx/gpt-image-2.5",
        "prompt": prompt,
        "size": {"4:3": "1600x1200", "16:9": "1600x900", "5:4": "1250x1000", "3:4": "900x1200", "wide": "1600x640", "9:10": "1080x1200", "9:7": "1260x980"}[ratio],
        "quality": "high",
        "output_format": "jpeg",
    }).encode("utf-8")
    for attempt in range(3):
        try:
            req = Request(URL, data=data, headers={"Authorization": f"Bearer {KEY}", "Content-Type": "application/json"}, method="POST")
            with urlopen(req, timeout=180) as response:
                image = response.read()
                if not response.headers.get("Content-Type", "").startswith("image/jpeg"):
                    raise RuntimeError("unexpected response type")
            if not image.startswith(b"\xff\xd8"):
                raise RuntimeError("unexpected image format")
            target.write_bytes(image)
            return filename, "generated", len(image)
        except Exception as exc:
            if attempt == 2:
                return filename, f"ERROR: {type(exc).__name__}: {exc}", 0
            time.sleep(2 * (attempt + 1))


if __name__ == "__main__":
    with ThreadPoolExecutor(max_workers=3) as pool:
        futures = [pool.submit(generate, job) for job in JOBS]
        for future in as_completed(futures):
            print(*future.result(), flush=True)

    from PIL import Image, ImageDraw, ImageOps

    names = ["about-hero-draft.jpg"] + [job[0] for job in JOBS]
    sheet = Image.new("RGB", (4 * 320, 6 * 260), "#faf9f6")
    draw = ImageDraw.Draw(sheet)
    for index, name in enumerate(names):
        with Image.open(ROOT / name) as source:
            thumb = ImageOps.fit(source.convert("RGB"), (300, 210), method=Image.Resampling.LANCZOS)
            x = (index % 4) * 320 + 10
            y = (index // 4) * 260 + 10
            sheet.paste(thumb, (x, y))
            draw.text((x, y + 215), name.replace("about_", ""), fill="#24212a")
            print(f"VALIDATE {name}: {source.format} {source.width}x{source.height} {source.mode}")
    sheet.save(ROOT / "about-contact-sheet.jpg", "JPEG", quality=84)

    from PIL import ImageOps

    assets = ROOT.parent / "FOX Fashion" / "assets"
    targets = {
        "about_hero_image.jpg": (1448, 1086),
        **{f"about_hero_side_{i}_image.jpg": (800, 600) for i in (1, 2)},
        **{f"about_statement_image_{i}.jpg": (240, 104) for i in (1, 2)},
        **{f"about_marquee_image_{i}.jpg": (340, 168) for i in (1, 2)},
        **{f"about_workshop_{i}_image.jpg": (1000, 800) for i in (1, 2, 3, 4)},
        **{f"about_process_{i}_image.jpg": (600, 800) for i in (1, 2, 3, 4)},
        "about_quote_image.jpg": (1600, 640),
        **{f"about_duo_{i}_image.jpg": (900, 1000) for i in (1, 2)},
        **{f"about_value_{i}_image.jpg": (800, 600) for i in (1, 2, 3)},
        "about_cta_image.jpg": (900, 700),
    }
    for name, dimensions in targets.items():
        source_name = "about-hero-draft.jpg" if name == "about_hero_image.jpg" else name
        with Image.open(ROOT / source_name) as source:
            if source.width < dimensions[0] or source.height < dimensions[1]:
                raise RuntimeError(f"Refusing to upscale {source_name}")
            centering = (0.5, 0.35) if name.startswith("about_marquee") else (0.5, 0.5)
            final = ImageOps.fit(source.convert("RGB"), dimensions, method=Image.Resampling.LANCZOS, centering=centering)
            output = assets / name
            if output.exists():
                raise RuntimeError(f"Refusing to overwrite {output}")
            final.save(output, "JPEG", quality=82, optimize=True, progressive=True)
            limit = 1048576 if name in {"about_hero_image.jpg", "about_quote_image.jpg"} else 512000
            if output.stat().st_size >= limit:
                raise RuntimeError(f"Image exceeds limit: {name}")
            print(f"FINAL {name}: {final.width}x{final.height}, {output.stat().st_size} bytes")
