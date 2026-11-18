import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Tag balance of config/settings.html plus a look at the lines around the material story block.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const html = await readFile(file, "utf8");
const count = (re) => (html.match(re) ?? []).length;
const lines = html.split(/\r?\n/);
const last = lines.findIndex((line) => line.includes('name="fabric_story_6_product_4_handle"'));
const legend = lines.findIndex((line) => line.includes("7. Bộ sưu tập theo chất liệu"));
console.log(JSON.stringify({
  fieldset: { open: count(/<fieldset\b/g), close: count(/<\/fieldset>/g) },
  table: { open: count(/<table\b/g), close: count(/<\/table>/g) },
  div: { open: count(/<div\b/g), close: count(/<\/div>/g) },
  story_fieldsets: count(/<legend>Câu chuyện \d<\/legend>/g),
  head: lines.slice(legend, legend + 4).map((l) => l.trim()),
  tail: lines.slice(last, last + 8).map((l) => l.trim()),
}, null, 2));
