import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reorganise the wishlist and size guide groups as "12. Trang yêu thích [page.wishlist]" and "13. Trang hướng dẫn
// chọn size [page.size-guide]", following "11. Trang FAQ [page.faq]": setup guide, one full-page preview image,
// settings column with <h3> groups. Setting rows copied verbatim; each group's single note row becomes guide text.
// Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
let lines = source.split(/\r?\n/);
const T = (n) => "\t".repeat(n);
const strong = (text) => `<strong>${text}</strong>`;

const groupBounds = (legendText) => {
  const legend = lines.findIndex((line) => line.includes(`<legend>${legendText}</legend>`));
  if (legend < 1 || lines[legend - 1].trim() !== "<fieldset>") throw new Error(`group not found: ${legendText}`);
  let depth = 0;
  for (let i = legend - 1; i < lines.length; i += 1) {
    depth += (lines[i].match(/<fieldset\b/g) ?? []).length;
    depth -= (lines[i].match(/<\/fieldset>/g) ?? []).length;
    if (depth === 0) return { start: legend - 1, end: i };
  }
  throw new Error(`group end not found: ${legendText}`);
};

const build = ({ legendText, title, guide, sections }) => {
  const { start, end } = groupBounds(legendText);
  const rows = new Map();
  let notes = 0;
  for (const line of lines.slice(start, end + 1)) {
    const row = line.match(/<tr>.*<\/tr>/)?.[0];
    if (!row) continue;
    const key = row.match(/name="([^"]+)"/)?.[1];
    if (key) rows.set(key, row);
    else notes += 1;
  }
  if (notes !== 1) throw new Error(`${legendText}: expected exactly 1 note row, found ${notes}`);
  const used = new Set();
  const take = (key) => {
    if (!rows.has(key)) throw new Error(`${legendText}: missing row ${key}`);
    used.add(key);
    return `${T(7)}${rows.get(key)}`;
  };
  const body = (items) => items.map((item) => (item.h3 ? `${T(7)}<tr><td colspan="2"><h3>${item.h3}</h3></td></tr>` : take(item)));
  const group = [
    `${T(1)}<fieldset>`,
    `${T(2)}<legend>${title}</legend>`,
    `${T(2)}<div class="col-sm-12">`,
    ...guide.map((text) => `${T(3)}<p>- ${text}</p>`),
    `${T(2)}</div>`,
    `${T(2)}<div class="col-sm-12 setnd">`,
    `${T(3)}<div class="col-sm-6">`,
    `${T(4)}<img src="" style="width:97%;max-width: 100%;">`,
    `${T(3)}</div>`,
    `${T(3)}<div class="col-sm-6">`,
    ...sections.flatMap(([legend, items]) => [
      `${T(4)}<fieldset>`,
      `${T(5)}<legend>${legend}</legend>`,
      `${T(5)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
      `${T(6)}<table>`,
      ...body(items),
      `${T(6)}</table>`,
      `${T(5)}</div>`,
      `${T(4)}</fieldset>`,
    ]),
    `${T(3)}</div>`,
    `${T(2)}</div>`,
    `${T(1)}</fieldset>`,
  ];
  const lost = [...rows.keys()].filter((key) => !used.has(key));
  if (lost.length) throw new Error(`${legendText}: settings would be lost: ${lost.join(", ")}`);
  lines = [...lines.slice(0, start), ...group, ...lines.slice(end + 1)];
  return { title, replaced: `${start + 1}-${end + 1}`, settings: used.size, new_lines: group.length };
};

const report = [
  build({
    legendText: "Yêu thích (lưu trên trình duyệt)",
    title: "12. Trang yêu thích [page.wishlist]",
    guide: [
      `Tạo mới một trang nội dung cho trang ${strong("Yêu thích")}, bạn truy cập vào mục ${strong("Website")} → ${strong("Trang nội dung")} → ${strong("Tạo trang.")}`,
      `Tại bước ${strong("Tạo trang")}, phần giao diện → bạn chọn ${strong("page.wishlist")} và nhấp ${strong("Lưu.")}`,
      `Đường dẫn của trang phải khớp ô ${strong("Đường dẫn trang yêu thích")} bên dưới (ví dụ /pages/yeu-thich). Danh sách lưu trên trình duyệt của khách, không cần đăng nhập.`,
    ],
    sections: [
      ["1. Cài đặt chung", ["wishlist_show", "header_wishlist_show", "wishlist_page_url"]],
      ["2. Trang yêu thích", [
        { h3: "Đầu trang" }, "wishlist_title", "wishlist_clear_label", "wishlist_confirm_clear",
        { h3: "Thẻ tóm tắt" }, "wishlist_summary_title", "wishlist_share_label",
        { h3: "Danh sách được chia sẻ" }, "wishlist_shared_title", "wishlist_save_shared_label", "wishlist_view_own_label",
        { h3: "Khi trống" }, "wishlist_empty_title", "wishlist_empty_text", "wishlist_empty_cta", "wishlist_empty_url",
      ]],
    ],
  }),
  build({
    legendText: "Trang hướng dẫn chọn size (template page.size-guide)",
    title: "13. Trang hướng dẫn chọn size [page.size-guide]",
    guide: [
      `Tạo mới một trang nội dung cho trang ${strong("Hướng dẫn chọn size")}, bạn truy cập vào mục ${strong("Website")} → ${strong("Trang nội dung")} → ${strong("Tạo trang.")}`,
      `Tại bước ${strong("Tạo trang")}, phần giao diện → bạn chọn ${strong("page.size-guide")} và nhấp ${strong("Lưu.")}`,
      `Dữ liệu bảng size và tìm size dùng chung mục ${strong("Trang sản phẩm → 6. Hướng dẫn chọn size")}. Có thể gán template này cho chính trang bảng size.`,
    ],
    sections: [
      ["1. Đầu trang", ["sgp_eyebrow", "sgp_title", "sgp_desc", "sgp_animate"]],
      ["2. Các bước", ["sgp_steps_show", ...[1, 2, 3].flatMap((n) => [{ h3: `Bước ${n}` }, `sgp_step_${n}_title`, `sgp_step_${n}_desc`])]],
      ["3. Mẹo chọn size", ["sgp_tips_show", "sgp_tip_link_label", ...[1, 2, 3].flatMap((n) => [{ h3: `Mẹo ${n}` }, `sgp_tip_${n}_title`, `sgp_tip_${n}_desc`, `sgp_tip_${n}_url`])]],
    ],
  }),
];

if (process.argv.includes("--write")) {
  await writeFile(file, lines.join(eol), "utf8");
  report.push({ written: true });
}
console.log(JSON.stringify(report, null, 2));
