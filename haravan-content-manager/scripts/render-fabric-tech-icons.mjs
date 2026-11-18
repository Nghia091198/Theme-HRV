import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Default images for the fabric lab technology cards (settings fabric_tech_N_image.png), written to the theme assets:
// sand tile with the line icon in plum, 160x160 PNG.
const SIZE = 160;
const ICON_SCALE = 3.2;
const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "FOX Fashion", "assets");

const ICONS = [
  { file: "fabric_tech_1_image.png", paths: '<path d="M4 12h16M7 8l-3 4 3 4M17 8l3 4-3 4"/>' },
  { file: "fabric_tech_2_image.png", paths: '<path d="M12 3c3 4 6 7 6 10a6 6 0 0 1-12 0c0-3 3-6 6-10Z"/><path d="M9 14h6"/>' },
  { file: "fabric_tech_3_image.png", paths: '<path d="M3 8h11a3 3 0 1 0-3-3M3 12h15a3 3 0 1 1-3 3M3 16h8"/>' },
  { file: "fabric_tech_4_image.png", paths: '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>' },
];

const offset = (SIZE - 24 * ICON_SCALE) / 2;
const report = [];
for (const icon of ICONS) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">
    <defs>
      <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f8f4ef"/><stop offset="1" stop-color="#ece4da"/></linearGradient>
      <radialGradient id="glow" cx="0.3" cy="0.25" r="0.8"><stop offset="0" stop-color="#ffffff" stop-opacity="0.7"/><stop offset="1" stop-color="#ffffff" stop-opacity="0"/></radialGradient>
    </defs>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#bg)"/>
    <rect width="${SIZE}" height="${SIZE}" fill="url(#glow)"/>
    <g transform="translate(${offset} ${offset}) scale(${ICON_SCALE})" fill="none" stroke="#5c3d50" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">${icon.paths}</g>
  </svg>`;
  const output = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
  await writeFile(path.join(assetsDir, icon.file), output);
  report.push({ file: icon.file, bytes: output.length });
}

console.log(JSON.stringify({ assetsDir, report }, null, 2));
