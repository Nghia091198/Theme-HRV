import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

// Default "Ảnh đại diện" for the product story modal (fox_product_story_avatar.png, fabric_story_avatar.png):
// FOX ears mark (logo 5A) in brand colours on a transparent background; the theme frames it in a white circle.
// 144x144 PNG.
const S = 144;
const INK = "#1b2631";
const ACC = "#ff7a45";
const assetsDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "FOX Fashion", "assets");
const FILES = ["fox_product_story_avatar.png", "fabric_story_avatar.png"];

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
<defs><linearGradient id="ear" x1="1" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${ACC}"/><stop offset="1" stop-color="#ffc2a8"/></linearGradient></defs>
<g transform="translate(10 6) scale(1.24)">
<polygon points="10,62 24,6 46,46" fill="${INK}"/>
<polygon points="90,62 76,6 54,46" fill="url(#ear)"/>
<polygon points="24,6 27,36 38,40" fill="${ACC}"/>
<polyline points="34,60 50,84 66,60" fill="none" stroke="${INK}" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>
<circle cx="50" cy="86" r="5.5" fill="${ACC}"/>
</g></svg>`;

const output = await sharp(Buffer.from(svg)).png({ compressionLevel: 9 }).toBuffer();
for (const file of FILES) await writeFile(path.join(assetsDir, file), output);
console.log(JSON.stringify({ assetsDir, files: FILES, bytes: output.length }));
