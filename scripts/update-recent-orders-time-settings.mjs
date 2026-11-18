import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Recent orders: the six "Thời gian" fields become "Thời điểm đặt hàng" (date-time of the real order; the card works
// out "x phút trước" itself) and a "Ẩn đơn cũ hơn" row is added. Keys unchanged. Dry run unless --write.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config");
const htmlFile = path.join(root, "settings.html");
const dataFile = path.join(root, "settings_data.json");
const SAMPLES = ["18/11/2026 09:40", "18/11/2026 08:55", "17/11/2026 21:10", "17/11/2026 16:30", "16/11/2026 19:05", "15/11/2026 11:20"];

let html = await readFile(htmlFile, "utf8");
let data = await readFile(dataFile, "utf8");
const report = { rows: 0, data: 0 };

SAMPLES.forEach((sample, i) => {
  const n = i + 1;
  const rowRe = new RegExp(`<tr><td><strong>Thời gian</strong>.*?name="recent_order_${n}_time"[^>]*/></td></tr>`);
  const row = `<tr><td><strong>Thời điểm đặt hàng</strong><p style="font-size: 12px;">(dd/mm/yyyy hh:mm theo đơn thật; thẻ tự hiện "x phút trước")</p></td><td><input class="min-width-360px" type="text" name="recent_order_${n}_time" value="${sample}"/></td></tr>`;
  if (!rowRe.test(html)) throw new Error(`row recent_order_${n}_time not found`);
  html = html.replace(rowRe, row);
  report.rows += 1;
  const dataRe = new RegExp(`"recent_order_${n}_time": "[^"]*"`);
  if (!dataRe.test(data)) throw new Error(`data recent_order_${n}_time not found`);
  data = data.replace(dataRe, `"recent_order_${n}_time": "${sample}"`);
  report.data += 1;
});

if (!html.includes('name="recent_orders_max_days"')) {
  const gapRe = /(\s*)(<tr><td><strong>Khoảng cách giữa 2 thông báo<\/strong>.*?name="recent_orders_gap"[^>]*\/><\/td><\/tr>)/;
  const match = html.match(gapRe);
  if (!match) throw new Error("gap row not found");
  const maxRow = `<tr><td><strong>Ẩn đơn cũ hơn</strong><p style="font-size: 12px;">(ngày, tính từ thời điểm đặt hàng)</p></td><td><input type="number" name="recent_orders_max_days" value="7" min="1" max="60"/></td></tr>`;
  html = html.replace(gapRe, `$1$2$1${maxRow}`);
  data = data.replace('"recent_orders_gap": "12",', '"recent_orders_gap": "12",\n"recent_orders_max_days": "7",');
  report.max_days_added = true;
}
JSON.parse(data);

if (process.argv.includes("--write")) {
  await writeFile(htmlFile, html, "utf8");
  await writeFile(dataFile, data, "utf8");
  report.written = true;
}
console.log(JSON.stringify(report));
