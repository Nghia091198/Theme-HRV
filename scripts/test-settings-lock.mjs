import { execFileSync } from "node:child_process";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Negative tests for settings-lock.mjs on copies in tmp/ (the real settings.html is never touched).
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const original = await readFile(path.join(root, "FOX Fashion", "config", "settings.html"), "utf8");
const run = async (name, mutate) => {
  const copy = path.join(root, "tmp", `lock-test-${name}.html`);
  await writeFile(copy, mutate(original), "utf8");
  try {
    const out = execFileSync("node", [path.join(root, "scripts", "settings-lock.mjs"), `--file=${copy}`], { encoding: "utf8" });
    return { name, exit: 0, result: JSON.parse(out) };
  } catch (error) {
    return { name, exit: error.status, result: JSON.parse(error.stdout) };
  }
};
const swapLegends = (text, a, b) => text.replace(`<legend>${a}</legend>`, "@@A@@").replace(`<legend>${b}</legend>`, `<legend>${a}</legend>`).replace("@@A@@", `<legend>${b}</legend>`);
const results = [
  await run("move-group", (t) => swapLegends(t, "9. Trang liên hệ [page.contact]", "10. Trang Về chúng tôi [page.about]")),
  await run("drop-cart-key", (t) => t.replace(/[^\n]*name="cart_page_invoice_show"[^\n]*\n/, "")),
  await run("home-change", (t) => t.replace('name="fox_product_story_title"', 'name="fox_product_story_heading"')),
];
console.log(JSON.stringify(results.map(({ name, exit, result }) => ({ name, exit, errors: result.errors.length, warnings: result.warnings.length, first: (result.errors[0] || result.warnings[0] || "").split("\n")[0] })), null, 1));
