import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Print one settings block with line numbers (tabs shown as →). Read-only. Usage: --block=about | fabric
const BLOCKS = {
  cartnew: { from: "Giỏ hàng (mini cart", to: "Tìm kiếm (bảng kính dưới header)", back: 2 },
  searchall: { from: "Tìm kiếm (bảng kính dưới header)", to: "smartsearch_page_popular_label", back: 1 },
  policy: { from: 'name="collection_policy_show"', to: 'collection_policy_1_title', back: 30 },
  cartgroup: { from: "<legend>5. Minicart</legend>", to: "<legend>6.", back: 2 },
  search: { from: "Tìm kiếm (bảng kính dưới header)", to: "2. Tìm kiếm gần đây", back: 6 },
  cart: { from: "<h3>Miễn phí vận chuyển</h3>", to: "cart_empty_collection_3", back: 6 },
  about: { from: "1. Hero mở đầu", to: "6. Trích dẫn nổi bật", back: 8 },
  fabric: { from: "Trang công nghệ chất liệu (template page.fabric-lab)", to: "3. So sánh dòng vải", back: 1 },
};
const file = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "config", "settings.html");
const lines = (await readFile(file, "utf8")).split(/\r?\n/);
const startArg = Number(process.argv.find((a) => a.startsWith("--start="))?.slice(8));
const endArg = Number(process.argv.find((a) => a.startsWith("--end="))?.slice(6));
if (startArg && endArg) {
  for (let i = startArg - 1; i < Math.min(endArg, lines.length); i += 1) console.log(`${String(i + 1).padStart(5)}| ${lines[i].replace(/\t/g, "→")}`);
  process.exit(0);
}
const block = BLOCKS[process.argv.find((a) => a.startsWith("--block="))?.slice(8)];
if (!block) throw new Error("use --block=about or --block=fabric");
const first = lines.findIndex((line) => line.includes(block.from));
const start = Math.max(0, first - block.back);
const end = lines.findIndex((line, i) => i > first && line.includes(block.to));
for (let i = start; i <= end; i += 1) console.log(`${String(i + 1).padStart(5)}| ${lines[i].replace(/\t/g, "→")}`);
