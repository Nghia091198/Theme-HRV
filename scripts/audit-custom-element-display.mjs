import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Custom elements used in Liquid markup vs CSS: which tags never get an explicit display (they default to inline).
const theme = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion");
const read = async (dir, test) => {
  const out = [];
  for (const name of await readdir(path.join(theme, dir))) if (test(name)) out.push({ name: `${dir}/${name}`, text: await readFile(path.join(theme, dir, name), "utf8") });
  return out;
};
const liquid = [...(await read("templates", (n) => n.endsWith(".liquid"))), ...(await read("snippets", (n) => n.endsWith(".liquid"))), ...(await read("layout", (n) => n.endsWith(".liquid")))];
const css = (await read("assets", (n) => /\.(css|scss\.liquid)$/.test(n) && !n.includes(".min."))).map((f) => f.text).join("\n");

const tags = new Map();
for (const file of liquid) {
  for (const match of file.text.matchAll(/<([a-z][a-z0-9]*-[a-z0-9-]+)[\s>]/g)) {
    const tag = match[1];
    if (!tags.has(tag)) tags.set(tag, new Set());
    tags.get(tag).add(file.name);
  }
}
const result = [];
for (const [tag, files] of tags) {
  const ruleRe = new RegExp(`(^|[\\s,}>+~(])${tag}(?![\\w-])[^{}]*\\{([^}]*)\\}`, "g");
  let hasDisplay = false;
  for (const m of css.matchAll(ruleRe)) if (/(^|;|\s)display\s*:/.test(m[2])) hasDisplay = true;
  result.push({ tag, display_declared: hasDisplay, used_in: [...files].slice(0, 3) });
}
result.sort((a, b) => Number(a.display_declared) - Number(b.display_declared) || a.tag.localeCompare(b.tag));
console.log(JSON.stringify(result, null, 1));
