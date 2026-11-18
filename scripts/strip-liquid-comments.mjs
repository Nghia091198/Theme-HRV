import { copyFile, mkdir, readdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Remove comments from the theme's Liquid files (layout/, templates/, snippets/): {% comment %}…{% endcomment %}
// blocks (any whitespace-control form) and HTML <!-- … --> (conditional <!--[if …]> kept). A comment alone on its
// line(s) takes the line with it. Checks: other Liquid tags unchanged, no comment tag left. Backup in
// tmp/backup-liquid-comments. Dry run unless --write.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const theme = path.join(root, "FOX Fashion");
const backup = path.join(root, "tmp", "backup-liquid-comments");
const DIRS = ["layout", "templates", "snippets"];
const COMMENT = /\{%-?\s*comment\s*-?%\}[\s\S]*?\{%-?\s*endcomment\s*-?%\}|<!--(?!\[if)[\s\S]*?-->/g;

const strip = (text) => {
  const eol = text.includes("\r\n") ? "\r\n" : "\n";
  let out = "";
  let last = 0;
  for (const match of text.matchAll(COMMENT)) {
    let start = match.index;
    let end = start + match[0].length;
    const lineStart = text.lastIndexOf("\n", start - 1) + 1;
    const nextBreak = text.indexOf("\n", end);
    const lineEnd = nextBreak < 0 ? text.length : nextBreak;
    const before = text.slice(lineStart, start);
    const after = text.slice(end, lineEnd).replace(/\r$/, "");
    if (!before.trim() && !after.trim() && lineStart >= last) {
      start = lineStart;
      end = nextBreak < 0 ? text.length : nextBreak + 1;
    }
    out += text.slice(last, start);
    last = end;
  }
  out += text.slice(last);
  return out.replace(/\r?\n/g, eol);
};

const liquidTags = (text) => (text.replace(COMMENT, "").match(/\{%-?\s*[a-z]+/g) ?? []).length;
const report = { files: [], problems: [] };
const changes = [];
for (const dir of DIRS) {
  for (const name of (await readdir(path.join(theme, dir))).sort()) {
    if (!name.endsWith(".liquid") || name.endsWith(".scss.liquid")) continue;
    const file = path.join(theme, dir, name);
    const source = await readFile(file, "utf8");
    const comments = (source.match(COMMENT) ?? []).length;
    if (!comments) continue;
    const result = strip(source);
    const left = /\{%-?\s*(end)?comment\b/.test(result);
    if (left || liquidTags(source) !== liquidTags(result)) {
      report.problems.push({ file: `${dir}/${name}`, comment_tag_left: left, tags_before: liquidTags(source), tags_after: liquidTags(result) });
      continue;
    }
    report.files.push({ file: `${dir}/${name}`, comments, bytes_saved: source.length - result.length });
    changes.push({ dir, name, file, result });
  }
}
report.total_files = report.files.length;
report.total_comments = report.files.reduce((sum, f) => sum + f.comments, 0);
report.total_bytes_saved = report.files.reduce((sum, f) => sum + f.bytes_saved, 0);

if (process.argv.includes("--write")) {
  if (report.problems.length) throw new Error("problems found, nothing written");
  for (const { dir, name, file, result } of changes) {
    const target = path.join(backup, dir, name);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(file, target);
    await writeFile(file, result, "utf8");
  }
  report.backup = backup;
  report.written = true;
} else {
  report.files = report.files.slice(0, 25);
}
console.log(JSON.stringify(report, null, 1));
