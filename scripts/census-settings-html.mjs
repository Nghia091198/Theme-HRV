import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Census of config/settings.html: first/last lines, tag kinds, multi-line rows, indentation styles. Read-only.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const text = await readFile(file, "utf8");
const lines = text.split(/\r?\n/);
const tags = {};
for (const m of text.matchAll(/<\/?([a-zA-Z][a-zA-Z0-9]*)\b/g)) tags[m[1].toLowerCase()] = (tags[m[1].toLowerCase()] ?? 0) + 1;
const lineKinds = {};
for (const line of lines) {
  const t = line.trim();
  const kind = !t ? "blank" : t.startsWith("<tr") && t.endsWith("</tr>") ? "row-one-line" : t.startsWith("<tr") ? "row-open-multiline" : (t.match(/^<\/?[a-zA-Z0-9]+/) ?? ["text"])[0];
  lineKinds[kind] = (lineKinds[kind] ?? 0) + 1;
}
console.log(JSON.stringify({
  total_lines: lines.length,
  first_lines: lines.slice(0, 6),
  last_lines: lines.slice(-6),
  tag_counts: tags,
  line_kinds: lineKinds,
  space_indented_lines: lines.filter((l) => /^ +\S/.test(l)).length,
  mixed_indent_lines: lines.filter((l) => /^\t+ +\S|^ +\t/.test(l)).length,
  lines_with_multiple_structural_tags: lines.filter((l) => (l.match(/<\/?(fieldset|legend|table|div)\b/g) ?? []).length > 1).length,
}, null, 1));
