import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Insert "6. Thông báo đơn hàng gần đây" into "1. Thiết lập chung", right after "5. Popup đăng ký nhận tin" (same frame
// as its siblings; six repeated entries as <h3> groups). Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);
if (lines.some((l) => l.includes("<legend>6. Thông báo đơn hàng gần đây</legend>"))) throw new Error("already added");

const legend = lines.findIndex((l) => l.includes("<legend>5. Popup đăng ký nhận tin</legend>"));
if (legend < 1) throw new Error("5. Popup đăng ký nhận tin not found");
let depth = 0;
let end = -1;
for (let i = legend - 1; i < lines.length; i += 1) {
  depth += (lines[i].match(/<fieldset\b/g) ?? []).length;
  depth -= (lines[i].match(/<\/fieldset>/g) ?? []).length;
  if (depth === 0) { end = i; break; }
}
if (end < 0) throw new Error("end of group 5 not found");
const indent = lines[legend - 1].match(/^\t*/)[0];
const T = (n) => indent + "\t".repeat(n);
const help = (t) => (t ? `<p style="font-size: 12px;">(${t})</p>` : "");
const row = (label, control, note) => `${T(3)}<tr><td><strong>${label}</strong>${help(note)}</td><td>${control}</td></tr>`;
const h3 = (title) => `${T(3)}<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const note = (text) => `${T(3)}<tr><td colspan="2"><p style="font-size: 12px;">${text}</p></td></tr>`;
const text = (name, value = "") => `<input class="min-width-360px" type="text" name="${name}" value="${value}"/>`;
const check = (name, on = true) => `<input type="checkbox" name="${name}" value="1"${on ? ' checked="checked"' : ""}/>`;
const number = (name, value, min, max) => `<input type="number" name="${name}" value="${value}" min="${min}" max="${max}"/>`;

const samples = [
  ["Ngọc A.", "Hà Nội", "5 phút trước", "ao-bra-pilates-calm-support-fox-activewear-20260807-01"],
  ["Minh T.", "TP. Hồ Chí Minh", "12 phút trước", "quan-legging-nu-flow-sculpt-fox-activewear-20260807-01"],
  ["Hoàng N.", "Đà Nẵng", "25 phút trước", "activewear-campaign-20261030-01-jacket-motion-zip"],
  ["Thu H.", "Hải Phòng", "40 phút trước", "activewear-v4-20261030-01-pilates-flare-balance"],
  ["Quốc B.", "Cần Thơ", "1 giờ trước", "activewear-v4-20261030-01-running-tee-breeze"],
  ["Lan P.", "Nha Trang", "2 giờ trước", "quan-short-nam-sprint-5-fox-activewear-20260807-01"],
];
const entries = samples.flatMap(([name, place, time, handle], i) => {
  const n = i + 1;
  return [
    h3(`Thông báo ${n}`),
    row("Hiển thị?", check(`recent_order_${n}_show`)),
    row("Tên khách", text(`recent_order_${n}_name`, name), "nên rút gọn, ví dụ Ngọc A."),
    row("Nơi mua", text(`recent_order_${n}_place`, place)),
    row("Thời gian", text(`recent_order_${n}_time`, time), "ví dụ 5 phút trước"),
    row("Đường dẫn sản phẩm", text(`recent_order_${n}_handle`, handle), "phần sau /products/ trong link sản phẩm"),
  ];
});

const block = [
  `${T(0)}<fieldset>`,
  `${T(1)}<legend>6. Thông báo đơn hàng gần đây</legend>`,
  `${T(1)}<div style="border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;padding: 0 0 10px 20px;margin: -10px 0;">`,
  `${T(2)}<table>`,
  note("Thẻ nhỏ ở góc trái dưới (phía trên nút chọn ngôn ngữ), lần lượt hiện từng thông báo. Nên nhập theo đơn hàng thật gần đây; tên khách rút gọn để bảo vệ thông tin khách hàng. Không hiện ở trang giỏ hàng và tài khoản."),
  row("Hiển thị?", check("recent_orders_show")),
  row("Hiện sau", number("recent_orders_delay", 8, 0, 120), "giây kể từ khi mở trang"),
  row("Mỗi thông báo hiện trong", number("recent_orders_duration", 6, 3, 30), "giây"),
  row("Khoảng cách giữa 2 thông báo", number("recent_orders_gap", 12, 3, 120), "giây"),
  row("Hiển thị trên điện thoại?", check("recent_orders_mobile")),
  ...entries,
  `${T(2)}</table>`,
  `${T(1)}</div>`,
  `${T(0)}</fieldset>`,
];
lines.splice(end + 1, 0, ...block);
const report = { inserted_after_line: end + 1, lines: block.length, keys: block.join("").match(/name="[^"]+"/g).length };
if (process.argv.includes("--write")) {
  await writeFile(file, lines.join(eol), "utf8");
  report.written = true;
}
console.log(JSON.stringify(report));
