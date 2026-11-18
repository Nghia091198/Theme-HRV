import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reorganise "Trang FAQ (template page.faq)" as "11. Trang FAQ [page.faq]", following "9. Trang công nghệ chất liệu
// [page.fabric-lab]": setup guide, one full-page preview image + settings column, <h3> groups. Rows copied verbatim.
// Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

if (lines.some((line) => line.includes("[page.faq]</legend>"))) throw new Error("already reorganised");
const legend = lines.findIndex((line) => line.includes("<legend>Trang FAQ (template page.faq)</legend>"));
if (legend < 1 || lines[legend - 1].trim() !== "<fieldset>") throw new Error("FAQ group not found");
const start = legend - 1;
const end = lines.findIndex((line, i) => i > legend && line.trim() === "</fieldset>" && lines[i - 1].trim() === "</div>");
if (end < 0) throw new Error("FAQ group end not found");

const rows = new Map();
for (const line of lines.slice(start, end + 1)) {
  const row = line.match(/<tr>.*<\/tr>/)?.[0];
  const key = row?.match(/name="([^"]+)"/)?.[1];
  if (key) rows.set(key, row);
}
const used = new Set();
const T = (n) => "\t".repeat(n);
const take = (key) => {
  const row = rows.get(key);
  if (!row) throw new Error(`missing row ${key}`);
  used.add(key);
  return `${T(7)}${row}`;
};
const h3 = (title) => `${T(7)}<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const section = (title, body) => [
  `${T(4)}<fieldset>`,
  `${T(5)}<legend>${title}</legend>`,
  `${T(5)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(6)}<table>`,
  ...body,
  `${T(6)}</table>`,
  `${T(5)}</div>`,
  `${T(4)}</fieldset>`,
];

const group = [
  `${T(1)}<fieldset>`,
  `${T(2)}<legend>11. Trang FAQ [page.faq]</legend>`,
  `${T(2)}<div class="col-sm-12">`,
  `${T(3)}<p>- Tạo mới một trang nội dung cho trang <strong>Câu hỏi thường gặp</strong>, bạn truy cập vào mục <strong>Website</strong> → <strong>Trang nội dung</strong> → <strong>Tạo trang.</strong></p>`,
  `${T(3)}<p>- Tại bước <strong>Tạo trang</strong>, phần giao diện → bạn chọn <strong>page.faq</strong> và nhấp <strong>Lưu.</strong></p>`,
  `${T(3)}<p>- Câu hỏi lấy từ <strong>Website</strong> → <strong>Blog</strong>: tạo blog có đường dẫn khớp ô <strong>Handle blog câu hỏi</strong> bên dưới; mỗi bài viết là một câu hỏi, tag đầu tiên của bài là chủ đề.</p>`,
  `${T(2)}</div>`,
  `${T(2)}<div class="col-sm-12 setnd">`,
  `${T(3)}<div class="col-sm-6">`,
  `${T(4)}<img src="" style="width:97%;max-width: 100%;">`,
  `${T(3)}</div>`,
  `${T(3)}<div class="col-sm-6">`,
  ...section("1. Nội dung chung", [
    h3("Đầu trang"),
    take("faq_title"),
    take("faq_desc"),
    take("faq_search_placeholder"),
    h3("Nguồn câu hỏi"),
    take("faq_blog_handle"),
    h3("Hỗ trợ cột trái"),
    take("faq_help_title"),
    take("faq_help_desc"),
  ]),
  ...section("2. Liên hệ hỗ trợ", [
    take("faq_contact_show"),
    take("faq_contact_title"),
    take("faq_contact_desc"),
    ...[1, 2, 3].flatMap((n) => [h3(`Kênh ${n}`), take(`faq_contact_${n}_title`), take(`faq_contact_${n}_desc`), take(`faq_contact_${n}_url`)]),
  ]),
  `${T(3)}</div>`,
  `${T(2)}</div>`,
  `${T(1)}</fieldset>`,
  `${T(1)}`,
];

const lost = [...rows.keys()].filter((key) => !used.has(key));
if (lost.length) throw new Error(`settings would be lost: ${lost.join(", ")}`);

const out = [...lines];
out.splice(start, end - start + 1, ...group);
const report = { replaced_lines: `${start + 1}-${end + 1}`, settings: used.size, new_lines: group.length };
if (process.argv.includes("--write")) {
  await writeFile(file, out.join(eol), "utf8");
  report.written = true;
} else {
  report.preview = group.slice(0, 14).map((line) => line.replace(/\t/g, "→"));
}
console.log(JSON.stringify(report, null, 2));
