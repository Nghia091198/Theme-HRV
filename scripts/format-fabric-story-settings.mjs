import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Rebuild the "7. Bộ sưu tập theo chất liệu" settings (fabric_story_*) in the homepage product story format:
// shared table, then one nested fieldset per story ("Câu chuyện N"). Keys are unchanged.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const start = lines.findIndex((line) => line.includes('name="fabric_story_show"'));
const last = lines.findIndex((line) => line.includes('name="fabric_story_6_product_4_handle"'));
if (start < 0 || last < start) throw new Error("fabric_story block not found");
const closing = lines.findIndex((line, index) => index > last && line.includes("</table>"));
const between = lines.slice(last + 1, closing);
if (closing < 0 || between.some((line) => line.trim() !== "")) throw new Error(`Unexpected content after the block: ${between.join(" | ")}`);

const T = (n) => "\t".repeat(n);
const row = (depth, label, control, note) => [
  `${T(depth)}<tr>`,
  `${T(depth + 1)}<td><strong>${label}</strong>${note ? `<p style="font-size: 12px;">(${note})</p>` : ""}</td>`,
  `${T(depth + 1)}<td>${control}</td>`,
  `${T(depth)}</tr>`,
];
const check = (name, on) => `<input type="checkbox" name="${name}" value="1"${on ? ' checked="checked"' : ""}/>`;
const text = (name, value = "", wide = true) => `<input${wide ? ' class="min-width-360px"' : ""} type="text" name="${name}"${value ? ` value="${value}"` : ""}/>`;
const number = (name, min, max, value) => `<input type="number" name="${name}" min="${min}" max="${max}" value="${value}"/>`;
const color = (name, value) => `<input name="${name}" class="color" value="${value}"/>`;

const P = "fabric_story";
const out = [
  ...row(7, "Hiển thị?", check(`${P}_show`, true)),
  ...row(7, "Tiêu đề", text(`${P}_title`, "Bộ sưu tập theo chất liệu")),
  ...row(7, "Mô tả", `<textarea class="min-width-360px" name="${P}_desc">Xem từng chất liệu trong chuyển động thật và mua ngay sản phẩm trong story.</textarea>`),
  ...row(7, "Màu nền", color(`${P}_bg`, "#f3eee8")),
  ...row(7, "Màu chữ", color(`${P}_text`, "#1b2631")),
  ...row(7, "Khoảng cách trên máy tính", number(`${P}_padding_top`, 0, 200, 88)),
  ...row(7, "Khoảng cách dưới máy tính", number(`${P}_padding_bottom`, 0, 200, 88)),
  ...row(7, "Khoảng cách trên điện thoại", number(`${P}_padding_top_mobile`, 0, 160, 56)),
  ...row(7, "Khoảng cách dưới điện thoại", number(`${P}_padding_bottom_mobile`, 0, 160, 56)),
  ...row(7, "Tạm dừng khi rê chuột?", check(`${P}_pause_on_hover`, true)),
  ...row(7, "Xem trước video khi rê chuột?", check(`${P}_hover_preview`, true)),
  ...row(7, "Xem trước video trên điện thoại?", check(`${P}_mobile_preview`, true)),
  `${T(6)}</table>`,
  "",
];

for (let n = 1; n <= 6; n += 1) {
  const k = `${P}_${n}`;
  out.push(
    `${T(6)}<fieldset>`,
    `${T(7)}<legend>Câu chuyện ${n}</legend>`,
    `${T(7)}<table>`,
    ...row(8, "Hiển thị?", check(`${k}_show`, n <= 3), "cần ảnh bìa hoặc đường dẫn MP4"),
    `${T(8)}<tr>`,
    `${T(9)}<td><strong>Loại media</strong></td>`,
    `${T(9)}<td>`,
    `${T(10)}<select name="${k}_media_type">`,
    `${T(11)}<option value="type_image">Hình ảnh</option>`,
    `${T(11)}<option value="type_mp4" selected="selected">Link MP4</option>`,
    `${T(10)}</select>`,
    `${T(9)}</td>`,
    `${T(8)}</tr>`,
    ...row(8, "Hình ảnh", `<input type="file" name="${k}_poster.jpg"/>`, "tỉ lệ 9:16"),
    ...row(8, "Alt", text(`${k}_alt`)),
    ...row(8, "Đường dẫn MP4", text(`${k}_mp4_url`)),
    ...row(8, "Nhãn nút", text(`${k}_cta_label`, "Mua sản phẩm", false)),
    ...row(8, "Đường dẫn sản phẩm 1", text(`${k}_product_1_handle`), "ví dụ: /products/ten-san-pham hoặc link đầy đủ của sản phẩm"),
    ...row(8, "Đường dẫn sản phẩm 2", text(`${k}_product_2_handle`)),
    ...row(8, "Đường dẫn sản phẩm 3", text(`${k}_product_3_handle`)),
    ...row(8, "Đường dẫn sản phẩm 4", text(`${k}_product_4_handle`)),
    `${T(7)}</table>`,
    `${T(6)}</fieldset>`,
  );
}

// The original closing line was "</table></div></fieldset>": the shared table is already closed above.
const rest = lines[closing].replace("</table>", "");
lines.splice(start, closing - start + 1, ...out, rest);
await writeFile(file, lines.join(eol), "utf8");
console.log(JSON.stringify({ replaced_lines: closing - start + 1, new_lines: out.length + 1, closing_kept: rest.trim() }));
