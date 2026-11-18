import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Avatar setting for the product story modal (homepage + fabric lab): "Ảnh đại diện" row right after "Mô tả".
// Default images: haravan-content-manager/scripts/render-story-avatar.mjs.
const theme = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion");
const settingsFile = path.join(theme, "config", "settings.html");
const PREFIXES = ["fox_product_story", "fabric_story"];

const source = await readFile(settingsFile, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);
const report = [];

for (const prefix of PREFIXES) {
  const key = `${prefix}_avatar.png`;
  if (lines.some((line) => line.includes(`name="${key}"`))) {
    report.push({ prefix, status: "already present" });
    continue;
  }
  const descIndex = lines.findIndex((line) => line.includes(`name="${prefix}_desc"`));
  if (descIndex < 0) throw new Error(`${prefix}_desc not found`);
  const rowEnd = lines.findIndex((line, index) => index >= descIndex && line.includes("</tr>"));
  const rowStart = lines.slice(0, descIndex + 1).findLastIndex((line) => line.includes("<tr>"));
  const indent = lines[rowStart].match(/^\s*/)[0];
  const cellIndent = lines[descIndex].match(/^\s*/)[0];
  const label = '<td><strong>Ảnh đại diện</strong><p style="font-size: 12px;">(hiện cạnh tên shop trong story, 112x112px)</p></td>';
  const control = `<td><input type="file" name="${key}"/></td>`;
  const row = rowStart === descIndex
    ? [`${indent}<tr>${label}${control}</tr>`]
    : [`${indent}<tr>`, `${cellIndent}${label}`, `${cellIndent}${control}`, `${indent}</tr>`];
  lines.splice(rowEnd + 1, 0, ...row);
  report.push({ prefix, inserted_after_line: rowEnd + 1, format: rowStart === descIndex ? "single line" : "multi line" });
}

await writeFile(settingsFile, lines.join(eol), "utf8");
console.log(JSON.stringify(report, null, 2));
