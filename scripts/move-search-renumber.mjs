import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Move the search group right below the cart group and renumber the page groups by exact legend text (indentation
// is not reliable: some product-page sub-groups sit at level-1 depth). Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
let lines = source.split(/\r?\n/);

const legendLine = (text) => {
  const found = lines.map((line, i) => (line.includes(`<legend>${text}</legend>`) ? i : -1)).filter((i) => i >= 0);
  if (found.length !== 1) throw new Error(`legend "${text}" found ${found.length} times`);
  return found[0];
};
const bounds = (text) => {
  const legend = legendLine(text);
  if (lines[legend - 1].trim() !== "<fieldset>") throw new Error(`no <fieldset> before "${text}"`);
  let depth = 0;
  for (let i = legend - 1; i < lines.length; i += 1) {
    depth += (lines[i].match(/<fieldset\b/g) ?? []).length;
    depth -= (lines[i].match(/<\/fieldset>/g) ?? []).length;
    if (depth === 0) return { start: legend - 1, end: i };
  }
  throw new Error(`end not found for "${text}"`);
};

const search = bounds("10. Tìm kiếm");
let block = lines.slice(search.start, search.end + 1);
const trailing = lines[search.end + 1]?.trim() === "" ? 1 : 0;
lines.splice(search.start, search.end - search.start + 1 + trailing);
const cart = bounds("6. Trang giỏ hàng &amp; Minicart");
lines.splice(cart.end + 1, 0, "\t", ...block);

const renumber = [
  ["6. Trang giỏ hàng &amp; Minicart", "7. Trang giỏ hàng &amp; Minicart"],
  ["10. Tìm kiếm", "8. Tìm kiếm"],
  ["7. Trang liên hệ [page.contact]", "9. Trang liên hệ [page.contact]"],
  ["8. Trang Về chúng tôi [page.about]", "10. Trang Về chúng tôi [page.about]"],
  ["9. Trang công nghệ chất liệu [page.fabric-lab]", "11. Trang công nghệ chất liệu [page.fabric-lab]"],
  ["11. Trang FAQ [page.faq]", "12. Trang FAQ [page.faq]"],
  ["12. Trang yêu thích [page.wishlist]", "13. Trang yêu thích [page.wishlist]"],
  ["13. Trang hướng dẫn chọn size [page.size-guide]", "14. Trang hướng dẫn chọn size [page.size-guide]"],
];
const targets = renumber.map(([from]) => legendLine(from));
renumber.forEach(([from, to], index) => {
  lines[targets[index]] = lines[targets[index]].replace(`<legend>${from}</legend>`, `<legend>${to}</legend>`);
});

const order = lines
  .map((line) => line.match(/^\t{0,2}<legend>(\d+\. (?:Trang|Tìm kiếm)[^<]*)<\/legend>/)?.[1])
  .filter(Boolean);
const report = { moved_search_lines: block.length, page_groups_in_order: order };
if (process.argv.includes("--write")) {
  await writeFile(file, lines.join(eol), "utf8");
  report.written = true;
}
console.log(JSON.stringify(report, null, 2));
