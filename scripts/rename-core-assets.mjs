import { copyFile, mkdir, readdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rename the theme's core-* asset files to shorter names and rewrite every reference (theme, docs, skills, scripts).
// Backup of every renamed / edited file in tmp/backup-rename-core. Dry run unless --write.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const assets = path.join(root, "FOX Fashion", "assets");
const backup = path.join(root, "tmp", "backup-rename-core");

const NAMES = [
  ["core-component-slider-media", "cpn-slider-media"],
  ["core-component-image-zoom", "cpn-image-zoom"],
  ["core-component-offcanvas", "cpn-offcanvas"],
  ["core-component-popover", "cpn-popover"],
  ["core-component-header", "cpn-header"],
  ["core-component-slider", "cpn-slider"],
  ["core-component-modal", "cpn-modal"],
  ["core-foundation-form-controls", "cpn-form-controls"],
  ["core-foundation-overlay", "cpn-overlay"],
  ["core-commerce-quick-view", "quick-view"],
  ["core-commerce-collection", "collection"],
  ["core-commerce-product", "product"],
  ["core-http", "http"],
  ["core-toast", "toast"],
];
const OLD_PATTERN = /core-(component|commerce|foundation)-[a-z-]+|core-(http|toast)\b/;

const SCAN = [
  path.join(root, "FOX Fashion"),
  path.join(root, "docs"),
  path.join(root, ".claude"),
  path.join(root, ".codex"),
  path.join(root, "scripts"),
  path.join(root, "haravan-content-manager", "scripts"),
  path.join(root, "AGENTS.md"),
  path.join(root, "CLAUDE.md"),
];
const TEXT = /\.(liquid|js|mjs|css|scss|html|json|md|txt|py)$/i;
const SKIP = /node_modules|[\\/]tmp[\\/]|\.backup$|[\\/]output[\\/]/;

const walk = async (target) => {
  const info = await stat(target).catch(() => null);
  if (!info) return [];
  if (info.isFile()) return TEXT.test(target) && !SKIP.test(target) ? [target] : [];
  const out = [];
  for (const name of await readdir(target)) out.push(...(await walk(path.join(target, name))));
  return out;
};

const renames = [];
for (const name of await readdir(assets)) {
  const pair = NAMES.find(([from]) => name.startsWith(`${from}.`));
  if (!pair) continue;
  const next = pair[1] + name.slice(pair[0].length);
  if ((await readdir(assets)).includes(next)) throw new Error(`target exists: ${next}`);
  renames.push([name, next]);
}

const edits = [];
for (const file of await walk(SCAN[0]).then(async (first) => [first, ...(await Promise.all(SCAN.slice(1).map(walk)))].flat())) {
  if (file === fileURLToPath(import.meta.url)) continue;
  const source = await readFile(file, "utf8");
  if (!OLD_PATTERN.test(source)) continue;
  let next = source;
  let count = 0;
  for (const [from, to] of NAMES) {
    const re = new RegExp(`${from.replace(/[-]/g, "\\-")}(?![a-z-])`, "g");
    next = next.replace(re, () => { count += 1; return to; });
  }
  next = next.replace(/core-(?:component|foundation)-([a-z][a-z-]*)/g, (_, name) => { count += 1; return `cpn-${name}`; });
  next = next.replace(/core-commerce-([a-z][a-z-]*)/g, (_, name) => { count += 1; return name; });
  const left = next.match(new RegExp(OLD_PATTERN.source, "g"));
  edits.push({ file, source, next, count, left: left ? [...new Set(left)] : [] });
}

const leftovers = edits.filter((e) => e.left.length).map((e) => ({ file: path.relative(root, e.file), left: e.left }));
const report = {
  renames,
  edited_files: edits.filter((e) => e.count).map((e) => ({ file: path.relative(root, e.file), replacements: e.count })),
  leftovers,
};

if (process.argv.includes("--write")) {
  if (leftovers.length) throw new Error("old names would remain, nothing written");
  for (const [from] of renames) {
    const target = path.join(backup, "FOX Fashion", "assets", from);
    await mkdir(path.dirname(target), { recursive: true });
    await copyFile(path.join(assets, from), target);
  }
  for (const edit of edits.filter((e) => e.count)) {
    const target = path.join(backup, path.relative(root, edit.file));
    await mkdir(path.dirname(target), { recursive: true });
    await writeFile(target, edit.source, "utf8");
    await writeFile(edit.file, edit.next, "utf8");
  }
  for (const [from, to] of renames) await rename(path.join(assets, from), path.join(assets, to));
  report.backup = backup;
  report.written = true;
}
console.log(JSON.stringify(report, null, 1));
