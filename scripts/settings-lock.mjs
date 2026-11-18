import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Structure lock for FOX Fashion/config/settings.html (rules: docs/settings-structure.md).
// Snapshot = top-level separators + fieldset tree (legends) + setting key order per fieldset.
//  - order of separators and level-1 groups: locked everywhere (error)
//  - inside level-1 groups: locked (error), except groups listed in FLEXIBLE (warnings only: home page sections change
//    between themes, but the group itself keeps its place)
// Usage: (default) check, exit 1 on errors | --update rewrite the lock after an intentional structure change.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SETTINGS = process.argv.find((a) => a.startsWith("--file="))?.slice(7) || path.join(root, "FOX Fashion", "config", "settings.html");
const LOCK = path.join(root, "docs", "settings-structure.lock.json");
const FLEXIBLE = ["1. Trang chủ"];

const snapshot = (text) => {
  const top = [];
  const stack = [];
  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim();
    if (/^<h3\b/i.test(line) && !stack.length && raw === line) {
      top.push({ separator: line.replace(/<[^>]+>/g, "").trim() });
      continue;
    }
    for (const token of line.match(/<fieldset\b[^>]*>|<\/fieldset>|<legend\b[^>]*>[\s\S]*?<\/legend>|name="[^"]+"/gi) ?? []) {
      if (/^<fieldset/i.test(token)) {
        const node = { legend: "", keys: [], children: [] };
        (stack.length ? stack[stack.length - 1].children : top).push(node);
        stack.push(node);
      } else if (/^<\/fieldset>/i.test(token)) {
        stack.pop();
      } else if (/^<legend/i.test(token)) {
        if (stack.length && !stack[stack.length - 1].legend) stack[stack.length - 1].legend = token.replace(/<[^>]+>/g, "").trim();
      } else if (stack.length) {
        stack[stack.length - 1].keys.push(token.slice(6, -1));
      }
    }
  }
  return top;
};

const label = (node) => node.separator ? `[phân vùng] ${node.separator}` : node.legend || "(fieldset không có legend)";
const diffTree = (locked, current, where, out) => {
  const a = locked.map(label);
  const b = current.map(label);
  if (a.join("\n") !== b.join("\n")) {
    out.push(`${where}: thứ tự / tên nhóm khác khoá\n    khoá:    ${a.join(" | ")}\n    hiện tại: ${b.join(" | ")}`);
    return;
  }
  locked.forEach((node, i) => {
    if (node.separator) return;
    const here = `${where} › ${node.legend}`;
    if (node.keys.join("|") !== current[i].keys.join("|")) {
      const removed = node.keys.filter((k) => !current[i].keys.includes(k));
      const added = current[i].keys.filter((k) => !node.keys.includes(k));
      out.push(`${here}: key khác khoá${removed.length ? `\n    mất: ${removed.join(", ")}` : ""}${added.length ? `\n    thêm: ${added.join(", ")}` : ""}${!removed.length && !added.length ? "\n    đổi thứ tự key" : ""}`);
    }
    diffTree(node.children, current[i].children, here, out);
  });
};

const current = snapshot(await readFile(SETTINGS, "utf8"));
if (process.argv.includes("--update")) {
  await writeFile(LOCK, `${JSON.stringify({ file: "FOX Fashion/config/settings.html", flexible: FLEXIBLE, tree: current }, null, 1)}\n`, "utf8");
  console.log(JSON.stringify({ updated: LOCK, level1: current.map(label) }, null, 1));
  process.exit(0);
}

const lock = JSON.parse(await readFile(LOCK, "utf8"));
const errors = [];
const warnings = [];
const lockedTop = lock.tree.map(label);
const currentTop = current.map(label);
if (lockedTop.join("\n") !== currentTop.join("\n")) {
  errors.push(`Thứ tự phân vùng / nhóm cấp 1 khác khoá\n    khoá:    ${lockedTop.join(" | ")}\n    hiện tại: ${currentTop.join(" | ")}`);
} else {
  lock.tree.forEach((node, i) => {
    if (node.separator) return;
    const bucket = (lock.flexible ?? FLEXIBLE).includes(node.legend) ? warnings : errors;
    if (node.keys.join("|") !== current[i].keys.join("|")) bucket.push(`${node.legend}: key cấp nhóm khác khoá`);
    diffTree(node.children, current[i].children, node.legend, bucket);
  });
}
console.log(JSON.stringify({ ok: !errors.length, errors, warnings }, null, 1));
process.exit(errors.length ? 1 : 0);
