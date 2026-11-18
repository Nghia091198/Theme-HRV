import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Line endings, BOM and indentation of the theme settings files. Read-only.
const config = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config");
for (const name of ["settings.html", "settings_data.json"]) {
  const buffer = await readFile(path.join(config, name));
  const text = buffer.toString("utf8");
  const crlf = (text.match(/\r\n/g) ?? []).length;
  const lf = (text.match(/(?<!\r)\n/g) ?? []).length;
  const lines = text.split(/\r?\n/);
  console.log(JSON.stringify({
    file: name,
    bom: buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf,
    crlf,
    lf,
    tab_indented: lines.filter((l) => /^\t/.test(l)).length,
    space_indented: lines.filter((l) => /^ {2,}/.test(l)).length,
    trailing_whitespace: lines.filter((l) => /[ \t]+$/.test(l)).length,
    final_newline: /\n$/.test(text),
  }));
}
