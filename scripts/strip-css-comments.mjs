import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Remove comments from the theme's own CSS (assets/*.css, *.scss.liquid). Vendor / minified files keep theirs
// (licence headers). Strings, url(...) and Liquid tags are left alone. Backup in tmp/backup-css-comments before
// writing. Dry run unless --write.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "FOX Fashion", "assets");
const backup = path.join(root, "tmp", "backup-css-comments");
const VENDOR = /\.min\.css$|swiper|flatpickr|vendor|glightbox|photoswipe|lightgallery|aos\.css|animate\.css|bootstrap|fancybox/i;

const strip = (text, scss) => {
  let out = "";
  let i = 0;
  let quote = null;
  let inUrl = false;
  while (i < text.length) {
    const ch = text[i];
    const next = text[i + 1];
    if (quote) {
      out += ch;
      if (ch === "\\") { out += next ?? ""; i += 2; continue; }
      if (ch === quote) quote = null;
      i += 1;
      continue;
    }
    if (inUrl) {
      out += ch;
      if (ch === ")") inUrl = false;
      i += 1;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; out += ch; i += 1; continue; }
    if (text.startsWith("url(", i)) { inUrl = true; out += "url("; i += 4; continue; }
    if (ch === "{" && (next === "%" || next === "{")) {
      const close = next === "%" ? "%}" : "}}";
      const end = text.indexOf(close, i + 2);
      const stop = end < 0 ? text.length : end + 2;
      out += text.slice(i, stop);
      i = stop;
      continue;
    }
    if (ch === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2);
      i = end < 0 ? text.length : end + 2;
      continue;
    }
    if (scss && ch === "/" && next === "/" && (out === "" || /[\s;{}]$/.test(out))) {
      const end = text.indexOf("\n", i);
      i = end < 0 ? text.length : end;
      continue;
    }
    out += ch;
    i += 1;
  }
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  const lines = out.split(/\r?\n/).map((line) => line.replace(/[ \t]+$/, ""));
  const tidy = [];
  for (const line of lines) {
    if (line === "" && (tidy.length === 0 || tidy[tidy.length - 1] === "")) continue;
    tidy.push(line);
  }
  while (tidy.length && tidy[tidy.length - 1] === "") tidy.pop();
  return `${tidy.join(eol)}${eol}`;
};

const count = (text, ch) => text.split(ch).length - 1;
const report = { files: [], skipped_vendor: [], problems: [] };
const changes = [];
for (const name of (await readdir(assets)).sort()) {
  const scss = name.endsWith(".scss.liquid");
  if (!name.endsWith(".css") && !scss) continue;
  if (VENDOR.test(name)) { report.skipped_vendor.push(name); continue; }
  const source = await readFile(path.join(assets, name), "utf8");
  const result = strip(source, scss);
  if (result === source) continue;
  const before = count(source.replace(/\/\*[\s\S]*?\*\//g, ""), "{");
  const after = count(result, "{");
  if (before !== after || count(source.replace(/\/\*[\s\S]*?\*\//g, ""), "}") !== count(result, "}")) {
    report.problems.push({ file: name, braces_before: before, braces_after: after });
    continue;
  }
  const comments = (source.match(/\/\*[\s\S]*?\*\//g) ?? []).length;
  report.files.push({ file: name, comments_removed: comments, bytes_saved: source.length - result.length });
  changes.push({ name, source, result });
}
report.total_files = report.files.length;
report.total_bytes_saved = report.files.reduce((sum, f) => sum + f.bytes_saved, 0);

if (process.argv.includes("--write")) {
  if (report.problems.length) throw new Error("problems found, nothing written");
  await mkdir(backup, { recursive: true });
  for (const { name, source, result } of changes) {
    await copyFile(path.join(assets, name), path.join(backup, name));
    await writeFile(path.join(assets, name), result, "utf8");
    void source;
  }
  report.backup = backup;
  report.written = true;
}
console.log(JSON.stringify(report, null, 1));
