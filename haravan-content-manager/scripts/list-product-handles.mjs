import { chromium } from "playwright-core";

// Read-only: first product handles listed on /collections/all (sample data for settings defaults).
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
await page.goto("https://tyt-kid.myharavan.com/collections/all?sort_by=created-descending", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2000);
const handles = await page.evaluate(() => [...new Set([...document.querySelectorAll('.fox-collection__grid a[href*="/products/"]')].map((a) => new URL(a.href).pathname.split("/products/")[1]?.split("?")[0]).filter(Boolean))]);
const details = [];
for (const handle of handles.slice(0, 8)) {
  const data = await page.evaluate(async (h) => { const r = await fetch(`/products/${h}.js`); if (!r.ok) return { status: r.status }; const p = await r.json(); return { title: p.title, image: Boolean(p.featured_image || p.images?.[0]), available: p.available }; }, handle);
  details.push({ handle, ...data });
}
await browser.close();
console.log(JSON.stringify(details, null, 1));
