import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Move the cart page rules (/cart) out of mini-cart.css into cart-page.css, verbatim. Dry run unless --write.
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "assets");
const miniFile = path.join(assets, "mini-cart.css");
const pageFile = path.join(assets, "cart-page.css");
const source = await readFile(miniFile, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const start = lines.findIndex((line) => line.startsWith("/* Cart page (/cart): left glass zone"));
const tabletMedia = lines.findIndex((line, i) => i > start && line.startsWith("@media (min-width: 576px) and (max-width: 991px)"));
const end = lines.findIndex((line, i) => i > tabletMedia && line === "}");
const smallGlass = lines.findIndex((line, i) => i > end && line.trim() === ".fox-cart-page__glass { padding: 16px; border-radius: 18px; }");
if (start < 0 || tabletMedia < 0 || end < 0 || smallGlass < 0) throw new Error(`markers not found: ${[start, tabletMedia, end, smallGlass]}`);

const block = lines.slice(start, end + 1);
const pageCss = [
  "/* Cart page (templates/cart.liquid), loaded on the cart template only (head_styles.liquid). The line items reuse",
  "   the mini cart skin from mini-cart.css (.fox-mini-cart__*), which the cart template also loads. */",
  ...block,
  "",
  "@media (max-width: 480px) {",
  "  .fox-cart-page__glass { padding: 16px; border-radius: 18px; }",
  "}",
  "",
];
const remaining = lines.filter((_, i) => (i < start || i > end) && i !== smallGlass);

const countRules = (text) => (text.match(/\{/g) ?? []).length;
const before = countRules(source);
const after = countRules(remaining.join("\n")) + countRules(pageCss.join("\n"));
const leftovers = remaining.filter((line) => /fox-cart-page|fox-cart-(delivery|coupons?|invoice|summary|note|radio|check|field)|cart-(delivery|coupons|invoice)\b|fox-coupon/.test(line));
const report = { moved_lines: block.length + 1, braces_before: before, braces_after: after, leftovers };
if (after !== before + 1) throw new Error(`rule count changed ${before} -> ${after} (expected +1 for the new 480px media wrapper)`);
if (leftovers.length) throw new Error(`cart page rules left in mini-cart.css: ${leftovers.join(" | ")}`);

if (process.argv.includes("--write")) {
  await writeFile(pageFile, pageCss.join(eol), "utf8");
  await writeFile(miniFile, remaining.join(eol), "utf8");
  report.written = true;
}
console.log(JSON.stringify(report, null, 2));
