import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Reformat "8. Trang Về chúng tôi [page.about]" sections 2–10 in the style of section 1 (formatted by hand): one tag
// per line with tab indent, full border box, <h3 style="margin-left: -10px;"> per repeated item, short labels.
// Control cells (<td><input…></td>) are copied verbatim from the current rows: keys, defaults and controls unchanged.
// Dry run by default; --write saves.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);

const start = lines.findIndex((line) => line.includes("<legend>2. Tuyên ngôn thương hiệu</legend>"));
const ctaImage = lines.findIndex((line) => line.includes('name="about_cta_image.jpg"'));
const end = lines.findIndex((line, i) => i > ctaImage && line.includes("</fieldset>"));
if (start < 0 || ctaImage < 0 || end < 0) throw new Error("about block not found");

const controls = new Map();
for (const line of lines.slice(start, end + 1)) {
  const key = line.match(/name="(about_[^"]+)"/)?.[1];
  const cell = line.match(/<\/td>(<td>.*<\/td>)<\/tr>/)?.[1];
  if (key && cell) controls.set(key, cell);
}

const T = (n) => "\t".repeat(n);
const used = new Set();
const row = (key, label, note) => {
  const cell = controls.get(key);
  if (!cell) throw new Error(`missing control for ${key}`);
  used.add(key);
  return `${T(6)}<tr><td><strong>${label}</strong>${note ? `<p style="font-size: 12px;">(${note})</p>` : ""}</td>${cell}</tr>`;
};
const group = (title) => `${T(6)}<tr><td colspan="2"><h3 style="margin-left: -10px;">${title}</h3></td></tr>`;
const section = (legend, rows) => [
  `${T(3)}<fieldset>`,
  `${T(3)}<legend>${legend}</legend>`,
  `${T(4)}<div style="border:1px solid #eeeeee;padding:0 10px 10px 10px;margin-top:-10px">`,
  `${T(5)}<table>`,
  ...rows,
  `${T(5)}</table>`,
  `${T(4)}</div>`,
  `${T(3)}</fieldset>`,
];
const range = (count, build) => Array.from({ length: count }, (_, i) => build(i + 1)).flat();

const out = [
  ...section("2. Tuyên ngôn thương hiệu", [
    row("about_statement_show", "Hiển thị?"),
    row("about_statement_label", "Tiêu đề phụ"),
    group("Nội dung 1"),
    row("about_statement_text_1", "Nội dung"),
    row("about_statement_image_1.jpg", "Hình ảnh", "240x104px, ảnh viên thuốc sau nội dung"),
    group("Nội dung 2"),
    row("about_statement_text_2", "Nội dung"),
    row("about_statement_image_2.jpg", "Hình ảnh", "240x104px, ảnh viên thuốc sau nội dung"),
    group("Nội dung 3"),
    row("about_statement_text_3", "Nội dung", "hiển thị màu nhạt"),
  ]),
  ...section("3. Dải chữ chuyển động", [
    row("about_marquee_show", "Hiển thị?"),
    group("Nội dung 1"),
    row("about_marquee_text_1", "Nội dung"),
    row("about_marquee_image_1.jpg", "Hình ảnh", "340x168px"),
    group("Nội dung 2"),
    row("about_marquee_text_2", "Nội dung", "chữ viền"),
    row("about_marquee_image_2.jpg", "Hình ảnh", "340x168px"),
    group("Nội dung 3"),
    row("about_marquee_text_3", "Nội dung"),
  ]),
  ...section("4. Hậu trường xưởng may", [
    row("about_workshop_show", "Hiển thị?"),
    row("about_workshop_title", "Tiêu đề"),
    row("about_workshop_desc", "Mô tả"),
    ...range(4, (n) => [
      group(`Hình ảnh ${n}`),
      row(`about_workshop_${n}_image.jpg`, "Hình ảnh", "1000x800px"),
      row(`about_workshop_${n}_caption`, "Chú thích"),
    ]),
  ]),
  ...section("5. Hành trình sản phẩm", [
    row("about_process_show", "Hiển thị?"),
    row("about_process_title", "Tiêu đề"),
    row("about_process_desc", "Mô tả"),
    ...range(4, (n) => [
      group(`Bước ${n}`),
      row(`about_process_${n}_image.jpg`, "Hình ảnh", "600x800px"),
      row(`about_process_${n}_title`, "Tiêu đề"),
      row(`about_process_${n}_desc`, "Mô tả"),
    ]),
  ]),
  ...section("6. Trích dẫn nổi bật", [
    row("about_quote_show", "Hiển thị?"),
    row("about_quote_image.jpg", "Hình ảnh", "1600x640px"),
    row("about_quote_text", "Nội dung"),
    row("about_quote_author", "Tác giả"),
  ]),
  ...section("7. Hai phong cách", [
    row("about_duo_show", "Hiển thị?"),
    row("about_duo_title", "Tiêu đề"),
    row("about_duo_desc", "Mô tả"),
    ...range(2, (n) => [
      group(`Phong cách ${n}`),
      row(`about_duo_${n}_image.jpg`, "Hình ảnh", "900x1000px"),
      row(`about_duo_${n}_label`, "Tiêu đề phụ"),
      row(`about_duo_${n}_title`, "Tiêu đề"),
      row(`about_duo_${n}_desc`, "Mô tả"),
      row(`about_duo_${n}_url`, "Đường dẫn"),
    ]),
  ]),
  ...section("8. Giá trị cốt lõi", [
    row("about_values_show", "Hiển thị?"),
    row("about_values_title", "Tiêu đề"),
    row("about_values_desc", "Mô tả"),
    ...range(3, (n) => [
      group(`Giá trị ${n}`),
      row(`about_value_${n}_image.jpg`, "Hình ảnh", "800x600px"),
      row(`about_value_${n}_title`, "Tiêu đề"),
      row(`about_value_${n}_desc`, "Mô tả"),
      row(`about_value_${n}_tag`, "Nhãn"),
    ]),
  ]),
  ...section("9. Cộng đồng", [
    row("about_community_show", "Hiển thị?"),
    row("about_community_title", "Tiêu đề"),
    row("about_community_desc", "Mô tả"),
    group("CTA"),
    row("about_community_btn_title", "Tiêu đề nút", "bỏ trống để ẩn"),
    row("about_community_btn_url", "Đường dẫn"),
    ...range(9, (n) => [
      group(`Ảnh ${n}`),
      row(`about_community_${n}_image.jpg`, "Hình ảnh", n === 1 ? "600x600px, ảnh 1 hiển thị lớn" : "600x600px"),
      row(`about_community_${n}_handle`, "Tài khoản", "ví dụ: @tenban"),
    ]),
  ]),
  ...section("10. Lời mời khép trang", [
    row("about_cta_show", "Hiển thị?"),
    row("about_cta_image.jpg", "Hình ảnh", "900x700px"),
    row("about_cta_title", "Tiêu đề"),
    row("about_cta_desc", "Mô tả"),
    group("CTA 1"),
    row("about_cta_btn_title", "Tiêu đề nút", "bỏ trống để ẩn"),
    row("about_cta_btn_url", "Đường dẫn"),
    group("CTA 2"),
    row("about_cta_btn2_title", "Tiêu đề nút 2", "bỏ trống để ẩn"),
    row("about_cta_btn2_url", "Đường dẫn 2"),
  ]),
];

const unused = [...controls.keys()].filter((key) => !used.has(key));
if (unused.length) throw new Error(`settings not placed (would be lost): ${unused.join(", ")}`);

const report = { replace_lines: `${start + 1}-${end + 1}`, old_count: end - start + 1, new_count: out.length, keys: used.size };
if (process.argv.includes("--write")) {
  lines.splice(start, end - start + 1, ...out);
  await writeFile(file, lines.join(eol), "utf8");
  report.written = true;
} else {
  report.preview = out.slice(0, 22).map((line) => line.replace(/\t/g, "→"));
}
console.log(JSON.stringify(report, null, 2));
