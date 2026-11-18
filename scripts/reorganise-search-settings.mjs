import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reorganise "Tìm kiếm (bảng kính dưới header)" as "10. Tìm kiếm", following "6. Trang giỏ hàng & Minicart":
// numbered level-1 group after "9.", preview column + settings column, "1." one table with <h3> groups, "2." bordered
// box with nested 2.x groups. Rows are copied verbatim (keys, values, labels). Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

if (lines.some((line) => line.includes("<legend>10. Tìm kiếm</legend>"))) throw new Error("already reorganised");
const legend = lines.findIndex((line) => line.includes("<legend>Tìm kiếm (bảng kính dưới header)</legend>"));
if (legend < 1 || lines[legend - 1].trim() !== "<fieldset>") throw new Error("search group not found");
const start = legend - 1;
const end = lines.findIndex((line, i) => i > legend && line.trim() === "</fieldset>" && lines[i - 1].trim() === "</div>");
if (end < 0) throw new Error("search group end not found");

const rows = new Map();
for (const line of lines.slice(start, end + 1)) {
  const row = line.match(/<tr>.*<\/tr>/)?.[0];
  const key = row?.match(/name="([^"]+)"/)?.[1];
  if (key) rows.set(key, row);
}
const used = new Set();
const T = (n) => "\t".repeat(n);
const take = (depth, key) => {
  const row = rows.get(key);
  if (!row) throw new Error(`missing row ${key}`);
  used.add(key);
  return `${T(depth)}${row}`;
};
const h3 = (depth, title) => `${T(depth)}<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const note = (depth, text) => `${T(depth)}<tr><td colspan="2"><p style="font-size: 12px;">${text}</p></td></tr>`;
const nested = (title, body) => [
  `${T(6)}<fieldset>`,
  `${T(7)}<legend>${title}</legend>`,
  `${T(7)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(8)}<table>`,
  ...body,
  `${T(8)}</table>`,
  `${T(7)}</div>`,
  `${T(6)}</fieldset>`,
];

const group = [
  `${T(1)}<fieldset>`,
  `${T(2)}<legend>10. Tìm kiếm</legend>`,
  `${T(2)}<div class="col-sm-12 setnd">`,
  `${T(3)}<div class="col-sm-6">`,
  `${T(4)}<h3>Bảng tìm kiếm</h3>`,
  `${T(4)}<div style="border:1px solid #eeeeee;padding:10px 10px 10px 10px;margin-top:-10px">`,
  `${T(5)}<img src="" style="width:97%;">`,
  `${T(4)}</div>`,
  `${T(4)}<h3 style="margin-top: 15px;">Trang tìm kiếm</h3>`,
  `${T(4)}<div style="border:1px solid #eeeeee;padding:10px 10px 10px 10px;margin-top:-10px">`,
  `${T(5)}<img src="" style="width:97%;">`,
  `${T(4)}</div>`,
  `${T(3)}</div>`,
  `${T(3)}<div class="col-sm-6">`,
  `${T(4)}<fieldset>`,
  `${T(5)}<legend>1. Bảng tìm kiếm đầu trang</legend>`,
  `${T(5)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(6)}<table>`,
  h3(7, "Cài đặt chung"),
  ...["smartsearch_title", "smartsearch_placeholder", "smartsearch_type", "smartsearch_result_rows", "smartsearch_result_limit", "smartsearch_article_limit", "smartsearch_empty_text"].map((k) => take(7, k)),
  h3(7, "Tìm kiếm gần đây"),
  ...["smartsearch_recent_show", "smartsearch_recent_title"].map((k) => take(7, k)),
  h3(7, "Thường được tìm kiếm"),
  ...["smartsearch_suggest_show", "smartsearch_suggest_title", "smartsearch_suggest_menu"].map((k) => take(7, k)),
  h3(7, "Sản phẩm đề xuất"),
  note(7, "Dùng chung cho bảng tìm kiếm và trang tìm kiếm (lúc chưa tìm và khi không có kết quả)."),
  ...["smartsearch_product_show", "smartsearch_product_title", "smartsearch_empty_recommend_title", "smartsearch_product_collection", "smartsearch_product_limit"].map((k) => take(7, k)),
  `${T(6)}</table>`,
  `${T(5)}</div>`,
  `${T(4)}</fieldset>`,
  `${T(4)}<fieldset>`,
  `${T(5)}<legend>2. Trang tìm kiếm</legend>`,
  `${T(5)}<div style="border:1px solid #eeeeee;padding:10px 10px 10px 10px;margin-top:-10px">`,
  ...nested("2.1. Bộ lọc sản phẩm", [take(9, "smartsearch_page_filter_show")]),
  ...nested("2.2. Dòng tìm nhiều", [take(9, "smartsearch_page_popular_label")]),
  `${T(5)}</div>`,
  `${T(4)}</fieldset>`,
  `${T(3)}</div>`,
  `${T(2)}</div>`,
  `${T(1)}</fieldset>`,
  `${T(1)}`,
];

const lost = [...rows.keys()].filter((key) => !used.has(key));
if (lost.length) throw new Error(`settings would be lost: ${lost.join(", ")}`);

const faqLegend = lines.findIndex((line) => line.includes("<legend>Trang FAQ (template page.faq)</legend>"));
const insertAt = lines.slice(0, faqLegend).findLastIndex((line) => line.trim() === "<fieldset>");
if (faqLegend < 0 || insertAt < 0 || insertAt > start) throw new Error("insert point (before Trang FAQ) not found");

const out = [...lines];
out.splice(start, end - start + 1);
out.splice(insertAt, 0, ...group);

const report = { removed_lines: `${start + 1}-${end + 1}`, inserted_before_line: insertAt + 1, settings: used.size, new_lines: group.length };
if (process.argv.includes("--write")) {
  await writeFile(file, out.join(eol), "utf8");
  report.written = true;
} else {
  report.preview = group.slice(14, 26).map((line) => line.replace(/\t/g, "→"));
}
console.log(JSON.stringify(report, null, 2));
