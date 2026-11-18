import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Default images for the fabric lab care tips (settings fabric_care_N_image.png), written to the theme assets:
// coloured tile with a filled laundry illustration, 160x160 PNG.
const S = 160;
const INK = "#5c3d50";
const ACC = "#ff7a45";
const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "FOX Fashion", "assets");

const tile = (a, b) => `<defs><linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient><radialGradient id="gl" cx="0.28" cy="0.22" r="0.75"><stop offset="0" stop-color="#fff" stop-opacity="0.65"/><stop offset="1" stop-color="#fff" stop-opacity="0"/></radialGradient></defs><rect width="${S}" height="${S}" fill="url(#bg)"/><rect width="${S}" height="${S}" fill="url(#gl)"/><ellipse cx="80" cy="134" rx="44" ry="6" fill="${INK}" opacity="0.12"/>`;

const ICONS = [
  { file: "fabric_care_1_image.png", bg: ["#e6f1fb", "#c9def3"], art: `
    <circle cx="60" cy="50" r="7" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="80" cy="38" r="5" fill="#fff" stroke="${INK}" stroke-width="3"/><circle cx="99" cy="50" r="6" fill="#fff" stroke="${INK}" stroke-width="3"/>
    <path d="M38 68 H122 L113 118 Q111 128 101 128 H59 Q49 128 47 118 Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <path d="M44 88 Q54 80 64 88 T84 88 T104 88 T117 87 L112 117 Q110 124 101 124 H59 Q50 124 48 117 Z" fill="#7fb5e6"/>
    <path d="M44 88 Q54 80 64 88 T84 88 T104 88 T117 87" fill="none" stroke="#3b82c4" stroke-width="4" stroke-linecap="round"/>` },
  { file: "fabric_care_2_image.png", bg: ["#fdece8", "#f6d3cb"], art: `
    <path d="M80 34 L128 118 H32 Z" fill="#fff" stroke="${INK}" stroke-width="6" stroke-linejoin="round"/>
    <path d="M80 62 L96 92 H64 Z" fill="${INK}" opacity="0.18"/>
    <path d="M44 44 L116 124 M116 44 L44 124" stroke="${ACC}" stroke-width="9" stroke-linecap="round"/>` },
  { file: "fabric_care_3_image.png", bg: ["#fef4de", "#f8e1b3"], art: `
    <circle cx="112" cy="46" r="16" fill="#f5b041"/>
    <path d="M90 56 a12 12 0 0 1 22 -6 a10 10 0 0 1 14 12 H90 Z" fill="#fff" stroke="${INK}" stroke-width="3.5" stroke-linejoin="round"/>
    <path d="M74 60 v-6 a6 6 0 1 1 6 -6" fill="none" stroke="${INK}" stroke-width="4" stroke-linecap="round"/>
    <path d="M74 60 L46 76 H102 Z" fill="none" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>
    <path d="M52 78 L66 72 Q74 80 82 72 L96 78 L106 94 L96 100 L94 94 V124 H54 V94 L52 100 L42 94 Z" fill="#ff9e7c" stroke="${INK}" stroke-width="4" stroke-linejoin="round"/>` },
  { file: "fabric_care_4_image.png", bg: ["#efeaf7", "#d9cfee"], art: `
    <path d="M70 68 Q72 52 86 52 H100 Q108 52 107 60 L105 68" fill="none" stroke="${INK}" stroke-width="5" stroke-linecap="round"/>
    <path d="M40 114 H118 Q124 114 122 106 L113 78 Q111 68 101 68 H66 Q48 70 41 94 Z" fill="#fff" stroke="${INK}" stroke-width="5" stroke-linejoin="round"/>
    <circle cx="66" cy="98" r="3.5" fill="${INK}"/><circle cx="80" cy="98" r="3.5" fill="${INK}"/><circle cx="94" cy="98" r="3.5" fill="${INK}"/>
    <path d="M38 40 L122 128" stroke="${ACC}" stroke-width="9" stroke-linecap="round"/>` },
];

const report = [];
for (const icon of ICONS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">${tile(...icon.bg)}${icon.art}</svg>`;
  const output = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(assetsDir, icon.file), output);
  report.push({ file: icon.file, bytes: output.length });
}

console.log(JSON.stringify({ assetsDir, report }, null, 2));
