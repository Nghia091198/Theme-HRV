import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Append "15. Trang nội dung [page]" after the last page group (docs/settings-structure.md §1, §3.1, §4).
// Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);
if (lines.some((line) => line.includes("<legend>15. Trang nội dung [page]</legend>"))) throw new Error("already added");

const legend = lines.findIndex((line) => line.includes("<legend>14. Trang hướng dẫn chọn size [page.size-guide]</legend>"));
if (legend < 1) throw new Error("group 14 not found");
let depth = 0;
let end = -1;
for (let i = legend - 1; i < lines.length; i += 1) {
  depth += (lines[i].match(/<fieldset\b/g) ?? []).length;
  depth -= (lines[i].match(/<\/fieldset>/g) ?? []).length;
  if (depth === 0) { end = i; break; }
}
if (end < 0) throw new Error("group 14 end not found");

const T = (n) => "\t".repeat(n);
const note = (text) => `<p style="font-size: 12px;">(${text})</p>`;
const row = (label, control, help) => `${T(7)}<tr><td><strong>${label}</strong>${help ? note(help) : ""}</td><td>${control}</td></tr>`;
const h3 = (title) => `${T(7)}<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const check = (name) => `<input type="checkbox" name="${name}" value="1" checked="checked"/>`;
const text = (name, value) => `<input class="min-width-360px" type="text" name="${name}" value="${value}"/>`;
const section = (title, rows) => [
  `${T(4)}<fieldset>`,
  `${T(5)}<legend>${title}</legend>`,
  `${T(5)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(6)}<table>`,
  ...rows,
  `${T(6)}</table>`,
  `${T(5)}</div>`,
  `${T(4)}</fieldset>`,
];

const group = [
  "",
  `${T(1)}<fieldset>`,
  `${T(2)}<legend>15. Trang nội dung [page]</legend>`,
  `${T(2)}<div class="col-sm-12">`,
  `${T(3)}<p>- Trang nội dung <strong>không chọn giao diện riêng</strong> (Website → Trang nội dung, phần giao diện để <strong>page</strong>) sẽ dùng mẫu này: tiêu đề, nội dung, thanh bên và cam kết mua sắm.</p>`,
  `${T(3)}<p>- Thanh bên và cam kết có <strong>settings riêng</strong> bên dưới, không ảnh hưởng trang blog / bài viết.</p>`,
  `${T(2)}</div>`,
  `${T(2)}<div class="col-sm-12 setnd">`,
  `${T(3)}<div class="col-sm-6">`,
  `${T(4)}<img src="" style="width:97%;max-width: 100%;">`,
  `${T(3)}</div>`,
  `${T(3)}<div class="col-sm-6">`,
  ...section("1. Thanh bên", [
    row("Hiển thị?", check("page_show_sidebar"), "tắt thì nội dung đọc ở cột giữa"),
    h3("Danh mục menu"),
    row("Chọn danh mục menu", `<select class="linklist" name="page_menu"></select>`, "mục con mở/đóng dạng accordion; bỏ trống để ẩn"),
    row("Tiêu đề", text("page_menu_title", "Danh mục")),
    h3("Bài mới"),
    row("Hiển thị?", check("page_show_recent")),
    row("Chọn blog", `<select class="blog" name="page_recent_blog"></select>`, "lấy 4 bài mới nhất của blog này"),
    row("Tiêu đề", text("page_recent_title", "Bài mới")),
  ]),
  ...section("2. Cam kết mua sắm", [
    row("Hiển thị?", check("page_policy_show"), "hiện cuối trang; nội dung 4 cam kết dùng chung, chỉnh tại \"2. Trang Nhóm sản phẩm → 6. Cam kết mua sắm\""),
  ]),
  `${T(3)}</div>`,
  `${T(2)}</div>`,
  `${T(1)}</fieldset>`,
];

lines.splice(end + 1, 0, ...group);
const report = { inserted_after_line: end + 1, new_lines: group.length };
if (process.argv.includes("--write")) {
  await writeFile(file, lines.join(eol), "utf8");
  report.written = true;
}
console.log(JSON.stringify(report));
