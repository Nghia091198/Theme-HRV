import { chromium } from "playwright-core";

// Live check (headless session cart only): does /cart/update.js with an empty attribute value remove it?
const BASE = "https://tyt-kid.myharavan.com";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const report = {};
try {
  await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded", timeout: 60000 });
  const call = (body) => page.evaluate(async (body) => {
    await fetch("/cart/update.js", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body });
    const cart = await (await fetch("/cart.js")).json();
    return cart.attributes;
  }, body);
  report.after_set = await call(new URLSearchParams({ "attributes[Delivery Time]": "16/11/2026 09:00 - 10:00" }).toString());
  report.after_empty = await call(new URLSearchParams({ "attributes[Delivery Time]": "" }).toString());
  report.removed = !report.after_empty || !Object.prototype.hasOwnProperty.call(report.after_empty, "Delivery Time");
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
