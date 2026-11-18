import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Illustrated packshots (code-drawn SVG → 1600x1600 JPEG) for batch fox-batch-b1111f.
// Image order per product = order of its "Màu sắc" values, so each image maps to its colour variants.
const BATCH = "fox-batch-b1111f";
const SIZE = 1600;
const MAX_BYTES = 512_000;
const batchDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "output", BATCH);

const ITEMS = [
  { file: "p1-1-den.jpg", kind: "bra", color: "#232326" },
  { file: "p1-2-hong-phan.jpg", kind: "bra", color: "#dfa3ae" },
  { file: "p1-3-xanh-xo-thom.jpg", kind: "bra", color: "#97ae9a" },
  { file: "p2-1-than-chi.jpg", kind: "legging", color: "#3d4148" },
  { file: "p2-2-nau-mocha.jpg", kind: "legging", color: "#7b5b49" },
  { file: "p2-3-xanh-navy.jpg", kind: "legging", color: "#22324f" },
];

function mix(hex, target, amount) {
  const read = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
  const [a, b] = [read(hex), read(target)];
  return `#${a.map((v, i) => Math.round(v + (b[i] - v) * amount).toString(16).padStart(2, "0")).join("")}`;
}

function backdrop(shadowY, shadowW) {
  return `
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f6f0e8"/><stop offset="0.62" stop-color="#ece2d5"/><stop offset="1" stop-color="#e2d5c5"/></linearGradient>
    <radialGradient id="glow" cx="0.38" cy="0.3" r="0.7"><stop offset="0" stop-color="#ffffff" stop-opacity="0.75"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    <radialGradient id="shadow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#5a4636" stop-opacity="0.32"/><stop offset="1" stop-color="#5a4636" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
  <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
  <rect y="1180" width="${SIZE}" height="420" fill="#d9cab8" opacity="0.35"/>
  <ellipse cx="800" cy="${shadowY}" rx="${shadowW}" ry="46" fill="url(#shadow)"/>`;
}

function fabric(id, color) {
  return `
  <linearGradient id="${id}" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${mix(color, "#ffffff", 0.18)}"/>
    <stop offset="0.45" stop-color="${color}"/>
    <stop offset="1" stop-color="${mix(color, "#000000", 0.32)}"/>
  </linearGradient>`;
}

function bra(color) {
  const dark = mix(color, "#000000", 0.38);
  const stitch = mix(color, "#ffffff", 0.35);
  return `${backdrop(1150, 330)}
  <defs>${fabric("f", color)}${fabric("band", mix(color, "#000000", 0.12))}</defs>
  <g filter="none">
    <path d="M598 700 C 586 600 606 512 640 448 L 694 448 C 672 532 670 616 694 694 Z" fill="url(#f)"/>
    <path d="M1002 700 C 1014 600 994 512 960 448 L 906 448 C 928 532 930 616 906 694 Z" fill="url(#f)"/>
    <path d="M512 912 C 512 770 590 704 692 690 C 740 728 772 752 800 760 C 828 752 860 728 908 690 C 1010 704 1088 770 1088 912 Z" fill="url(#f)"/>
    <path d="M692 690 C 740 728 772 752 800 760 C 828 752 860 728 908 690" fill="none" stroke="${dark}" stroke-width="10" stroke-linecap="round" opacity="0.55"/>
    <ellipse cx="660" cy="800" rx="96" ry="58" fill="#ffffff" opacity="0.13" transform="rotate(-18 660 800)"/>
    <ellipse cx="940" cy="800" rx="96" ry="58" fill="#ffffff" opacity="0.08" transform="rotate(18 940 800)"/>
    <rect x="504" y="896" width="592" height="132" rx="34" fill="url(#band)"/>
    <path d="M530 922 H1070" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 12" opacity="0.7"/>
    <path d="M530 1002 H1070" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 12" opacity="0.7"/>
    <path d="M800 770 V 896" stroke="${dark}" stroke-width="5" opacity="0.35"/>
    <path d="M640 452 C 620 540 616 620 640 700" fill="none" stroke="${stitch}" stroke-width="3" stroke-dasharray="10 10" opacity="0.55"/>
    <path d="M960 452 C 980 540 984 620 960 700" fill="none" stroke="${stitch}" stroke-width="3" stroke-dasharray="10 10" opacity="0.55"/>
  </g>`;
}

function legging(color) {
  const dark = mix(color, "#000000", 0.4);
  const stitch = mix(color, "#ffffff", 0.3);
  return `${backdrop(1388, 300)}
  <defs>${fabric("f", color)}${fabric("band", mix(color, "#000000", 0.14))}</defs>
  <path d="M566 470 L 800 470 L 800 610 L 760 1356 L 634 1356 L 574 830 Z" fill="url(#f)"/>
  <path d="M800 470 L 1034 470 L 1026 830 L 966 1356 L 840 1356 L 800 610 Z" fill="url(#f)"/>
  <path d="M800 470 L 800 640" stroke="${dark}" stroke-width="6" opacity="0.4"/>
  <path d="M690 520 C 680 760 690 1060 698 1350" fill="none" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 12" opacity="0.55"/>
  <path d="M910 520 C 920 760 910 1060 902 1350" fill="none" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 12" opacity="0.55"/>
  <path d="M640 960 C 680 984 720 984 752 962" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
  <path d="M648 1000 C 684 1016 716 1016 746 1000" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity="0.25"/>
  <path d="M848 962 C 880 984 920 984 960 960" fill="none" stroke="${dark}" stroke-width="5" stroke-linecap="round" opacity="0.35"/>
  <path d="M854 1000 C 884 1016 916 1016 952 1000" fill="none" stroke="${dark}" stroke-width="4" stroke-linecap="round" opacity="0.25"/>
  <path d="M600 560 C 640 700 660 900 672 1200" fill="none" stroke="#ffffff" stroke-width="26" stroke-linecap="round" opacity="0.08"/>
  <path d="M634 1340 H 760 M840 1340 H 966" stroke="${stitch}" stroke-width="4" stroke-dasharray="12 10" opacity="0.6"/>
  <rect x="556" y="350" width="488" height="132" rx="26" fill="url(#band)"/>
  <path d="M576 376 H1024 M576 456 H1024" stroke="${stitch}" stroke-width="4" stroke-dasharray="14 12" opacity="0.7"/>
  <rect x="930" y="392" width="62" height="44" rx="8" fill="${dark}" opacity="0.35"/>`;
}

const report = [];
for (const item of ITEMS) {
  const body = item.kind === "bra" ? bra(item.color) : legging(item.color);
  const svg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">${body}</svg>`);
  let quality = 86;
  let output;
  do {
    output = await sharp(svg).resize(SIZE, SIZE).jpeg({ quality, progressive: true, chromaSubsampling: "4:2:0" }).toBuffer();
    quality -= 2;
  } while (output.length > MAX_BYTES && quality >= 76);
  await writeFile(path.join(batchDir, item.file), output);
  report.push({ file: item.file, bytes: output.length, quality: quality + 2 });
}

console.log(JSON.stringify(report, null, 2));
