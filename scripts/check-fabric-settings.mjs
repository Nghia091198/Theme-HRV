import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Audit of the "Trang công nghệ chất liệu" settings (fabric_*): JSON validity, key parity, Liquid callers, one control per row.
const theme = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion");
const html = await readFile(path.join(theme, "config", "settings.html"), "utf8");
const data = JSON.parse(await readFile(path.join(theme, "config", "settings_data.json"), "utf8"));
const current = data.current ?? data;

const htmlKeys = [...html.matchAll(/name="(fabric_[^"]+)"/g)].map((m) => m[1]);
const dataKeys = Object.keys(current).filter((key) => key.startsWith("fabric_"));
const rows = html.split(/\r?\n/).filter((line) => line.includes('name="fabric_'));
const multiControlRows = rows.filter((line) => (line.match(/<(input|select|textarea)\b/g) ?? []).length > 1);

const callers = ["templates/page.fabric-lab.liquid", "snippets/fabric-lab-look.liquid"];
const literal = new Set();
const patterns = new Set();
for (const file of callers) {
  const source = await readFile(path.join(theme, file), "utf8");
  for (const m of source.matchAll(/settings\.(fabric_[a-z0-9_]+)/g)) literal.add(m[1]);
  for (const m of source.matchAll(/capture \w+ -%\}(fabric_[^{%]*(?:\{\{[^}]+\}\}[^{%]*)*)\{%-? endcapture/g)) patterns.add(m[1]);
}
const htmlSet = new Set(htmlKeys);
const expand = (pattern) => {
  const variants = [pattern];
  const out = [];
  for (const look of ["yoga", "pilates"]) variants.push(pattern.replace(/\{\{\s*look_prefix\s*\}\}/g, `fabric_${look}_`));
  for (const v of variants) {
    if (/\{\{/.test(v.replace(/\{\{\s*\w+_index\s*\}\}/g, ""))) continue;
    for (let i = 1; i <= 4; i += 1) out.push(v.replace(/\{\{\s*\w+_index\s*\}\}/g, String(i)));
  }
  return [...new Set(out)];
};
const dynamicMissing = [];
for (const pattern of patterns) {
  const keys = expand(pattern.trim());
  if (keys.length && !keys.some((key) => htmlSet.has(key))) dynamicMissing.push(pattern.trim());
}

console.log(JSON.stringify({
  json_valid: true,
  settings_html_keys: htmlKeys.length,
  duplicate_names: htmlKeys.filter((key, i) => htmlKeys.indexOf(key) !== i),
  missing_in_settings_data: htmlKeys.filter((key) => !(key in current)),
  extra_in_settings_data: dataKeys.filter((key) => !htmlSet.has(key)),
  literal_keys_missing_in_html: [...literal].filter((key) => !htmlSet.has(key)),
  dynamic_patterns_without_match: dynamicMissing,
  rows_with_multiple_controls: multiControlRows.length,
  icon_keys_left: htmlKeys.filter((key) => key.endsWith("_icon")),
  alt_labels_not_Alt: rows.filter((line) => /_image_alt"/.test(line) && !line.includes("<strong>Alt</strong>")).length,
}, null, 2));
