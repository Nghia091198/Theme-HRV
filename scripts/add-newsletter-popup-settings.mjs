import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Insert "5. Popup đăng ký nhận tin" into "1. Thiết lập chung", right after "4. Mạng xã hội" (same frame style as its
// siblings). Dry run unless --write.
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const source = await readFile(file, "utf8");
const eol = source.includes("\r\n") ? "\r\n" : "\n";
const lines = source.split(/\r?\n/);
if (lines.some((l) => l.includes("<legend>5. Popup đăng ký nhận tin</legend>"))) throw new Error("already added");

const legend = lines.findIndex((l) => l.includes("<legend>4. Mạng xã hội</legend>"));
if (legend < 1) throw new Error("4. Mạng xã hội not found");
let depth = 0;
let end = -1;
for (let i = legend - 1; i < lines.length; i += 1) {
  depth += (lines[i].match(/<fieldset\b/g) ?? []).length;
  depth -= (lines[i].match(/<\/fieldset>/g) ?? []).length;
  if (depth === 0) { end = i; break; }
}
if (end < 0) throw new Error("end of 4. Mạng xã hội not found");
const indent = lines[legend - 1].match(/^\t*/)[0];
const T = (n) => indent + "\t".repeat(n);
const help = (t) => (t ? `<p style="font-size: 12px;">(${t})</p>` : "");
const row = (label, control, note) => `${T(3)}<tr><td><strong>${label}</strong>${help(note)}</td><td>${control}</td></tr>`;
const h3 = (title) => `${T(3)}<tr><td colspan="2"><h3>${title}</h3></td></tr>`;
const text = (name, value = "") => `<input class="min-width-360px" type="text" name="${name}" value="${value}"/>`;
const area = (name, value) => `<textarea class="min-width-360px" name="${name}" rows="3">${value}</textarea>`;

const block = [
  `${T(0)}<fieldset>`,
  `${T(1)}<legend>5. Popup đăng ký nhận tin</legend>`,
  `${T(1)}<div style="border-left: 1px solid #eeeeee;border-bottom: 1px solid #eeeeee;padding: 0 0 10px 20px;margin: -10px 0;">`,
  `${T(2)}<table>`,
  row("Hiển thị?", `<input type="checkbox" name="newsletter_popup_show" value="1" checked="checked"/>`),
  row("Chế độ", `<select name="newsletter_popup_mode"><option value="form" selected="selected">Form đăng ký nhận tin</option><option value="banner">Banner</option></select>`),
  row("Hiện ở", `<select name="newsletter_popup_scope"><option value="home" selected="selected">Trang chủ</option><option value="all">Mọi trang</option></select>`),
  row("Hiện sau", `<input type="number" name="newsletter_popup_delay" value="5" min="0" max="120"/>`, "giây kể từ khi mở trang"),
  row("Hiện lại sau", `<input type="number" name="newsletter_popup_days" value="3" min="0" max="365"/>`, "ngày, khi khách đóng popup; 0 = mỗi lần mở trang"),
  h3("Banner"),
  row("Hình ảnh máy tính", `<input type="file" name="newsletter_popup_banner.jpg"/>`, "1200 x 800px"),
  row("Hình ảnh điện thoại", `<input type="file" name="newsletter_popup_banner_mobile.jpg"/>`, "720 x 960px"),
  row("Alt", text("newsletter_popup_banner_alt", "Ưu đãi thành viên FOX")),
  row("Đường dẫn", text("newsletter_popup_banner_url", "/collections/all")),
  h3("Form đăng ký nhận tin"),
  row("Hình ảnh", `<input type="file" name="newsletter_popup_form_image.jpg"/>`, "800 x 1000px"),
  row("Nhãn trên ảnh", text("newsletter_popup_badge", "Tặng 50.000₫"), "bỏ trống để ẩn"),
  row("Nhãn nhỏ", text("newsletter_popup_eyebrow", "Gia nhập FOX Club")),
  row("Tiêu đề", text("newsletter_popup_title", "Nhận 50.000₫ cho đơn đầu tiên")),
  row("Mô tả", area("newsletter_popup_desc", "Đăng ký email để nhận mã ưu đãi, thông tin bộ sưu tập mới và lịch flash sale sớm nhất.")),
  row("Gợi ý ô email", text("newsletter_popup_placeholder", "Email của bạn…")),
  row("Nhãn nút", text("newsletter_popup_button", "Nhận mã")),
  row("Ghi chú đồng ý", text("newsletter_popup_consent", "Bằng việc đăng ký, bạn đồng ý nhận email từ FOX. Có thể huỷ bất cứ lúc nào.")),
  row("Nhãn từ chối", text("newsletter_popup_decline", "Không, cảm ơn")),
  h3("Sau khi đăng ký"),
  row("Tiêu đề", text("newsletter_popup_success_title", "Cảm ơn bạn đã đăng ký!")),
  row("Mã ưu đãi", text("newsletter_popup_code", ""), "mã khuyến mãi đã tạo trên Haravan; bỏ trống để ẩn"),
  row("Mô tả", text("newsletter_popup_success_desc", "Dùng mã ở trang thanh toán cho đơn đầu tiên.")),
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
