import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Move "5. Minicart" out of the header group into a new top-level group "Giỏ hàng (mini cart & trang giỏ)" (organised
// like "Tìm kiếm": numbered sub-groups) and add the cart page settings. Minicart rows are copied verbatim.
// Dry run by default; --write saves.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

if (lines.some((line) => line.includes("Giỏ hàng (mini cart &amp; trang giỏ)"))) throw new Error("already restructured");
const legend = lines.findIndex((line) => line.includes("<legend>5. Minicart</legend>"));
if (legend < 1 || !/^\s*<fieldset>\s*$/.test(lines[legend - 1])) throw new Error("5. Minicart fieldset not found");
const start = legend - 1;
const indent = lines[start].match(/^\s*/)[0];
const end = lines.findIndex((line, i) => i > legend && line === `${indent}</fieldset>`);
const tableOpen = lines.findIndex((line, i) => i > legend && line.trim() === "<table>");
const tableClose = lines.findIndex((line, i) => i > tableOpen && line.trim() === "</table>");
if (end < 0 || tableOpen < 0 || tableClose < 0 || tableClose > end) throw new Error("Minicart table bounds not found");
const minicartRows = lines.slice(tableOpen + 1, tableClose).map((line) => line.trim()).filter(Boolean);
const minicartKeys = minicartRows.flatMap((row) => [...row.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));

const T = (n) => "\t".repeat(n);
const note = (text) => (text ? `<p style="font-size: 12px;">(${text})</p>` : "");
const row = (label, control, help) => `<tr><td><strong>${label}</strong>${note(help)}</td><td>${control}</td></tr>`;
const check = (name, on) => `<input type="checkbox" name="${name}" value="1"${on ? ' checked="checked"' : ""}/>`;
const text = (name, value = "") => `<input class="min-width-360px" type="text" name="${name}" value="${value}"/>`;
const number = (name, value, min, max) => `<input type="number" name="${name}" value="${value}" min="${min}" max="${max}"/>`;
const group = (title) => `<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const section = (title, rows) => [
  `${T(1)}<fieldset>`,
  `${T(2)}<legend>${title}</legend>`,
  `${T(2)}<div style="border-left:1px solid #eeeeee;border-bottom:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(3)}<table>`,
  ...rows.map((r) => `${T(4)}${r}`),
  `${T(3)}</table>`,
  `${T(2)}</div>`,
  `${T(1)}</fieldset>`,
];

const coupons = Array.from({ length: 5 }, (_, i) => {
  const n = i + 1;
  return [
    group(`Mã ${n}`),
    row("Hiển thị?", check(`cart_page_coupon_${n}_show`, false)),
    row("Mã", text(`cart_page_coupon_${n}_code`), "mã khuyến mãi đã tạo trên Haravan; khách bấm để sao chép"),
    row("Tiêu đề", text(`cart_page_coupon_${n}_title`), "ví dụ: Giảm 50.000₫"),
    row("Mô tả", text(`cart_page_coupon_${n}_desc`), "ví dụ: Cho đơn từ 500.000₫"),
  ];
}).flat();

const group5 = [
  `<fieldset>`,
  `<legend>Giỏ hàng (mini cart &amp; trang giỏ)</legend>`,
  `<div class="col-sm-12">`,
  ...section("1. Mini cart", minicartRows),
  ...section("2. Trang giỏ · Thời gian giao hàng", [
    row("Hiển thị?", check("cart_page_delivery_show", true)),
    row("Tiêu đề", text("cart_page_delivery_title", "Thời gian giao hàng")),
    row("Giờ bắt đầu nhận giao", number("cart_page_delivery_start", 8, 0, 23), "giờ, ví dụ 8 = 08:00"),
    row("Giờ kết thúc nhận giao", number("cart_page_delivery_end", 21, 1, 24), "giờ, khung cuối kết thúc lúc này"),
    row("Lời khuyên", text("cart_page_delivery_tip", "Nên chọn giờ hành chính (8:00 – 17:00) để đơn được giao đúng hẹn."), "hiện dạng cảnh báo khi khách chọn thời gian"),
  ]),
  ...section("3. Trang giỏ · Khuyến mãi dành cho bạn", [
    row("Hiển thị?", check("cart_page_coupons_show", true)),
    row("Tiêu đề", text("cart_page_coupons_title", "Khuyến mãi dành cho bạn")),
    ...coupons,
  ]),
  ...section("4. Trang giỏ · Ghi chú &amp; xuất hoá đơn", [
    row("Tiêu đề ghi chú", text("cart_page_note_title", "Ghi chú đơn hàng")),
    row("Placeholder ghi chú", text("cart_page_note_placeholder", "Ví dụ: giao giờ hành chính, gói quà…")),
    row("Hiển thị xuất hoá đơn?", check("cart_page_invoice_show", true)),
  ]),
  ...section("5. Trang giỏ · Có thể bạn sẽ thích", [
    row("Hiển thị?", check("cart_page_recommend_show", true)),
    row("Tiêu đề", text("cart_page_recommend_title", "Có thể bạn sẽ thích")),
    row("Nhóm sản phẩm", `<select class="collection" name="cart_page_recommend_collection"></select>`),
    row("Số sản phẩm", number("cart_page_recommend_limit", 8, 2, 16), "bỏ qua sản phẩm đã có trong giỏ"),
  ]),
  `</div>`,
  `</fieldset>`,
  ``,
];

const search = lines.findIndex((line) => line.includes("<legend>Tìm kiếm (bảng kính dưới header)</legend>"));
if (search < 1 || lines[search - 1].trim() !== "<fieldset>") throw new Error("Tìm kiếm group not found");

const out = [...lines];
out.splice(search - 1, 0, ...group5);
out.splice(start, end - start + 1);

const newKeys = group5.flatMap((line) => [...line.matchAll(/name="([^"]+)"/g)].map((m) => m[1]));
const lost = minicartKeys.filter((key) => !newKeys.includes(key));
if (lost.length) throw new Error(`minicart settings would be lost: ${lost.join(", ")}`);

const report = { minicart_lines: `${start + 1}-${end + 1}`, minicart_keys: minicartKeys.length, new_group_lines: group5.length, new_keys: newKeys.filter((k) => !minicartKeys.includes(k)) };
if (process.argv.includes("--write")) {
  await writeFile(file, out.join(eol), "utf8");
  report.written = true;
} else {
  report.preview = group5.slice(0, 14);
}
console.log(JSON.stringify(report, null, 2));
