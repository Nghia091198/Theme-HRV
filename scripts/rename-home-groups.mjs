import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rename the direct sub-groups of "1. Trang chủ": drop the "FOX " prefix after the number (capitalise what remains)
// and name group 1 "Slider banner". Legend text only. Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const homeLegend = lines.findIndex((line) => line.includes("<legend>1. Trang chủ</legend>"));
if (homeLegend < 1) throw new Error("1. Trang chủ not found");
let depth = 0;
const children = [];
for (let i = homeLegend - 1; i < lines.length; i += 1) {
  const line = lines[i];
  const opens = (line.match(/<fieldset\b/g) ?? []).length;
  const closes = (line.match(/<\/fieldset>/g) ?? []).length;
  depth += opens;
  if (depth === 2 && opens) {
    const legendIndex = lines.findIndex((l, j) => j > i && l.includes("<legend>"));
    children.push(legendIndex);
  }
  depth -= closes;
  if (depth === 0) break;
}

const capitalise = (text) => text.charAt(0).toLocaleUpperCase("vi") + text.slice(1);
const changes = [];
for (const index of children) {
  const before = lines[index].match(/<legend>(.*?)<\/legend>/)[1];
  const match = before.match(/^(\d+)\.\s*(.*)$/);
  if (!match) continue;
  const [, number, rest] = match;
  let name = rest.replace(/^FOX\s+/i, "");
  if (number === "1") name = "Slider banner";
  const after = `${number}. ${capitalise(name)}`;
  if (after !== before) {
    lines[index] = lines[index].replace(`<legend>${before}</legend>`, `<legend>${after}</legend>`);
    changes.push({ before, after });
  }
}

const report = { home_subgroups: children.length, changes };
if (process.argv.includes("--write")) {
  await writeFile(file, lines.join(eol), "utf8");
  report.written = true;
}
console.log(JSON.stringify(report, null, 1));
