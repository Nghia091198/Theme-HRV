import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

// Behaviour test of the theme's real recent-orders.js with stubbed /products/<handle>.js responses and short timings.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const script = pathToFileURL(path.resolve(root, "..", "FOX Fashion", "assets", "recent-orders.js")).href;
const harness = path.join(root, "output", "recent-orders-test.html");
await writeFile(harness, `<!doctype html><meta charset="utf-8"><body>
<recent-orders data-delay="0" data-duration="1" data-gap="1" data-max-days="7" data-state="idle">
  <ul data-ro-source hidden>
    <li data-ro-item data-handle="bra" data-name="Ngọc A." data-place="Hà Nội" data-time="18/11/2026 09:40"></li>
    <li data-ro-item data-handle="missing" data-name="X" data-place="Y" data-time="18/11/2026 09:00"></li>
    <li data-ro-item data-handle="legging" data-name="Minh T." data-place="" data-time=""></li>
    <li data-ro-item data-handle="bra" data-name="Cũ" data-place="" data-time="01/11/2026 10:00"></li>
    <li data-ro-item data-handle="legging" data-name="Bốn giờ" data-place="" data-time="2026-11-18 06:00"></li>
    <li data-ro-item data-handle="bra" data-name="Hôm qua" data-place="" data-time="17/11/2026 08:00"></li>
    <li data-ro-item data-handle="legging" data-name="Tương lai" data-place="" data-time="19/11/2026 10:00"></li>
    <li data-ro-item data-handle="bra" data-name="Sai" data-place="" data-time="5 phút trước"></li>
  </ul>
  <div class="fox-ro__card" data-ro-card hidden>
    <a data-ro-link href="#"><img data-ro-image alt=""><span><strong data-ro-name></strong> <span data-ro-action></span></span><span data-ro-title></span><span data-ro-time></span></a>
    <button data-ro-close>x</button>
  </div>
</recent-orders>
<dialog id="d">popup</dialog>
<script>
window.log = [];
const products = { bra: { title: "Áo bra Calm", url: "/products/bra", featured_image: "//cdn.x/bra_master.jpg?v=1" }, legging: { title: "Legging Flow", url: "/products/legging", images: ["https://cdn.x/legging.png"] } };
window.fetch = async (url) => { const h = decodeURIComponent(String(url).split("/products/")[1].replace(".js", "")); window.log.push("fetch:" + h); return products[h] ? { ok: true, json: async () => products[h] } : { ok: false, status: 404 }; };
new MutationObserver(() => { const el = document.querySelector("recent-orders"); if (el.dataset.state === "visible") { const t = document.querySelector("[data-ro-time]"); window.log.push("show:" + document.querySelector("[data-ro-name]").textContent + "|" + (t.hidden ? "(không có thời gian)" : t.textContent)); } }).observe(document.querySelector("recent-orders"), { attributes: true, attributeFilter: ["data-state"] });
</script>
<script src="${script}"></script>`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const nowArg = process.argv.find((a) => a.startsWith("--now="))?.slice(6);
const now = nowArg ? new Date(nowArg) : new Date(2026, 10, 18, 10, 0);
await page.clock.setFixedTime(now);
await page.goto(pathToFileURL(harness).href);
await page.waitForTimeout(12500);
const firstCycle = await page.evaluate(() => window.log.filter((l) => l.startsWith("show")));
await browser.close();
console.log(JSON.stringify({ now: now.toLocaleString("vi-VN"), firstCycle }, null, 1));
