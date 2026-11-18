import { copyFile, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Remove the brand page (template page.brand): template, CSS, its head_styles branch, the settings group and the
// brand_* values. Backs everything up to tmp/backup-page-brand first. Dry run unless --write.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const theme = path.join(root, "FOX Fashion");
const backup = path.join(root, "tmp", "backup-page-brand");
const files = {
  template: path.join(theme, "templates", "page.brand.liquid"),
  css: path.join(theme, "assets", "page-brand.css"),
  settings: path.join(theme, "config", "settings.html"),
  data: path.join(theme, "config", "settings_data.json"),
  head: path.join(theme, "snippets", "head_styles.liquid"),
};
const write = process.argv.includes("--write");
const report = {};

// settings.html: the whole group from its <fieldset> to the matching </fieldset>.
const settingsSource = await readFile(files.settings, "utf8");
const settingsEol = settingsSource.includes("\r\n") ? "\r\n" : "\n";
const settingsLines = settingsSource.split(/\r?\n/);
const legend = settingsLines.findIndex((line) => line.includes("<legend>Trang thương hiệu (template page.brand)</legend>"));
if (legend < 1 || settingsLines[legend - 1].trim() !== "<fieldset>") throw new Error("brand settings group not found");
const groupStart = legend - 1;
let depth = 0;
let groupEnd = -1;
for (let i = groupStart; i < settingsLines.length; i += 1) {
  depth += (settingsLines[i].match(/<fieldset\b/g) ?? []).length;
  depth -= (settingsLines[i].match(/<\/fieldset>/g) ?? []).length;
  if (depth === 0) { groupEnd = i; break; }
}
if (groupEnd < 0) throw new Error("brand settings group end not found");
const groupKeys = settingsLines.slice(groupStart, groupEnd + 1).flatMap((line) => [...line.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
if (groupKeys.some((key) => !key.startsWith("brand_"))) throw new Error("non-brand key inside the group");
const nextSettings = [...settingsLines];
nextSettings.splice(groupStart, groupEnd - groupStart + 1);
report.settings = { lines: `${groupStart + 1}-${groupEnd + 1}`, keys: groupKeys.length };

// settings_data.json: drop exactly the group's keys line by line (keeps the file's own formatting), then re-validate.
const dataSource = await readFile(files.data, "utf8");
const dataEol = dataSource.includes("\r\n") ? "\r\n" : "\n";
const data = JSON.parse(dataSource);
const current = data.current ?? data;
const dataKeys = Object.keys(current).filter((key) => key.startsWith("brand_"));
const unknown = dataKeys.filter((key) => !groupKeys.includes(key));
if (unknown.length) throw new Error(`brand_* values without a setting: ${unknown.join(", ")}`);
const dataLines = dataSource.split(/\r?\n/);
const keptData = dataLines.filter((line) => !/^\s*"brand_[^"]*":/.test(line));
const nextData = keptData.join(dataEol);
const parsed = JSON.parse(nextData);
const left = Object.keys(parsed.current ?? parsed).filter((key) => key.startsWith("brand_"));
if (left.length || dataLines.length - keptData.length !== dataKeys.length) throw new Error("settings_data.json line removal mismatch");
report.settings_data = { keys_removed: dataKeys.length, json_valid: true };

// head_styles.liquid: the page.brand branch (condition + its include line).
const headSource = await readFile(files.head, "utf8");
const headEol = headSource.includes("\r\n") ? "\r\n" : "\n";
const headLines = headSource.split(/\r?\n/);
const branch = headLines.findIndex((line) => line.includes("template contains 'page.brand'"));
if (branch < 0 || !headLines[branch + 1]?.includes("page-brand.css")) throw new Error("head_styles page.brand branch not found");
headLines.splice(branch, 2);
report.head_styles = { removed_lines: `${branch + 1}-${branch + 2}` };

if (write) {
  await mkdir(backup, { recursive: true });
  for (const [name, file] of Object.entries(files)) await copyFile(file, path.join(backup, path.basename(file)));
  await writeFile(files.settings, nextSettings.join(settingsEol), "utf8");
  await writeFile(files.data, nextData, "utf8");
  await writeFile(files.head, headLines.join(headEol), "utf8");
  await rm(files.template);
  await rm(files.css);
  report.backup = backup;
  report.deleted = ["templates/page.brand.liquid", "assets/page-brand.css"];
  report.written = true;
}
console.log(JSON.stringify(report, null, 2));
