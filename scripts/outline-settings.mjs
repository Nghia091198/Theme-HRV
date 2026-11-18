import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Outline of config/settings.html: every <legend> with its line number and tab depth. Read-only.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const lines = (await readFile(file, "utf8")).split(/\r?\n/);
lines.forEach((line, i) => {
  const match = line.match(/<legend>(.*?)<\/legend>/);
  if (!match) return;
  const depth = (line.match(/^\t*/)?.[0].length ?? 0);
  console.log(`${String(i + 1).padStart(5)} ${"  ".repeat(depth)}${match[1]}`);
});
