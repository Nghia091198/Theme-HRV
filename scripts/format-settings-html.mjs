import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Canonical formatter for FOX Fashion/config/settings.html (rules: docs/settings-structure.md).
//  - one structural tag per line: <fieldset>, </fieldset>, <legend>…</legend>, <div …>, </div>, <table>, </table>
//  - one setting row per line: <tr>…</tr> (rows whose <textarea> value spans lines are kept as written)
//  - indent with tabs: open fieldset/div/table count + 1; top-level separators (<h3>) and stray closers at column 0
//  - blank lines only between top-level blocks, at most one, empty; no trailing whitespace; CRLF; final newline
// Safety: only whitespace may change (content compared with all whitespace removed), key and legend order unchanged,
// output is idempotent. Usage: --check (exit 1 if not formatted) | --write | default dry run report.
const DEFAULT_FILE = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const file = process.argv.find((a) => a.startsWith("--file="))?.slice(7) || DEFAULT_FILE;
if (!/[\\/]config[\\/]settings\.html$/.test(file)) {
  console.log(JSON.stringify({ skipped: file }));
  process.exit(0);
}

const STRUCT_OPEN = /^<(fieldset|div|table)\b[^>]*>/i;
const STRUCT_CLOSE = /^<\/(fieldset|div|table)>/i;
const LEGEND = /^<legend\b[^>]*>[\s\S]*?<\/legend>/i;

export const format = (source) => {
  const raw = source.split(/\r?\n/);
  const tokens = [];
  let i = 0;
  while (i < raw.length) {
    const trimmed = raw[i].trim();
    if (!trimmed) { tokens.push({ blank: true }); i += 1; continue; }
    if (trimmed.startsWith("<tr") && !trimmed.includes("</tr>")) {
      const block = [raw[i]];
      while (i + 1 < raw.length && !raw[i].includes("</tr>")) { i += 1; block.push(raw[i]); }
      i += 1;
      const joined = block.join("\n");
      const textareaSpans = /<textarea\b[^>]*>[^<]*\n[^<]*<\/textarea>/i.test(joined);
      if (textareaSpans) tokens.push({ verbatim: block.map((l) => l.trim()) });
      else tokens.push({ text: block.map((l) => l.trim()).filter(Boolean).reduce((acc, part) => (acc.endsWith(">") && part.startsWith("<") ? acc + part : `${acc} ${part}`)) });
      continue;
    }
    let rest = trimmed;
    while (rest) {
      let match = rest.match(STRUCT_CLOSE) || rest.match(LEGEND) || rest.match(STRUCT_OPEN);
      if (match) { tokens.push({ text: match[0] }); rest = rest.slice(match[0].length).trim(); continue; }
      if (rest.startsWith("<tr")) {
        const end = rest.indexOf("</tr>");
        if (end >= 0) { tokens.push({ text: rest.slice(0, end + 5) }); rest = rest.slice(end + 5).trim(); continue; }
      }
      const next = rest.slice(1).search(/<\/?(fieldset|div|table)\b|<legend\b|<tr\b/i);
      if (next < 0 || rest.startsWith("<tr")) { tokens.push({ text: rest }); rest = ""; }
      else { tokens.push({ text: rest.slice(0, next + 1).trim() }); rest = rest.slice(next + 1).trim(); }
    }
    i += 1;
  }

  const out = [];
  let depth = 0;
  const indent = (d, token) => (d === 0 && !/^<\/?fieldset\b/i.test(token) ? "" : "\t".repeat(d + 1));
  for (const token of tokens) {
    if (token.blank) {
      if (depth === 0 && out.length && out[out.length - 1] !== "") out.push("");
      continue;
    }
    if (token.verbatim) {
      token.verbatim.forEach((line, index) => out.push(`${"\t".repeat(depth + 1 + (index === 0 || line.startsWith("</tr") ? 0 : 1))}${line}`));
      continue;
    }
    const text = token.text;
    if (STRUCT_CLOSE.test(text)) {
      depth = Math.max(0, depth - 1);
      out.push(`${indent(depth, text)}${text}`);
      continue;
    }
    out.push(`${indent(depth, text)}${text}`);
    if (STRUCT_OPEN.test(text)) depth += 1;
  }
  while (out.length && out[out.length - 1] === "") out.pop();
  const spaced = [];
  out.forEach((line, index) => {
    spaced.push(line);
    const next = out[index + 1];
    if (line === "\t</fieldset>" && next !== undefined && next !== "") spaced.push("");
  });
  return `${spaced.join("\r\n")}\r\n`;
};

const signature = (text) => ({
  content: text.replace(/\s+/g, ""),
  keys: [...text.matchAll(/name="([^"]+)"/g)].map((m) => m[1]).join("|"),
  legends: [...text.matchAll(/<legend\b[^>]*>([\s\S]*?)<\/legend>/g)].map((m) => m[1].trim()).join("|"),
});

const source = await readFile(file, "utf8");
const formatted = format(source);
const before = signature(source);
const after = signature(formatted);
const problems = [];
if (before.content !== after.content) problems.push("content changed (non-whitespace)");
if (before.keys !== after.keys) problems.push("setting key order changed");
if (before.legends !== after.legends) problems.push("legend order changed");
if (format(formatted) !== formatted) problems.push("not idempotent");
if (problems.length) {
  console.error(JSON.stringify({ file, problems }, null, 2));
  process.exit(2);
}

const changed = formatted !== source;
const report = { file, changed, lines_before: source.split(/\r?\n/).length, lines_after: formatted.split(/\r?\n/).length };
if (process.argv.includes("--check")) {
  console.log(JSON.stringify(report));
  process.exit(changed ? 1 : 0);
}
if (process.argv.includes("--write") && changed) {
  await writeFile(file, formatted, "utf8");
  report.written = true;
}
const outArg = process.argv.find((a) => a.startsWith("--out="))?.slice(6);
if (outArg) {
  await writeFile(outArg, formatted, "utf8");
  report.preview_file = outArg;
}
console.log(JSON.stringify(report));
