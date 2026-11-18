import { chromium } from "playwright-core";

// Read-only: which cart icon and empty-cart collection markup the live store serves.
const URL = process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) || "https://tyt-kid.myharavan.com/";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const report = { url: URL };
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  Object.assign(report, await page.evaluate(() => ({
    header_cart_icon: document.querySelector('.fox-header-action[data-action="open-cart"] use')?.getAttribute("xlink:href"),
    empty_cart_icon: document.querySelector(".fox-mini-cart__empty-icon use")?.getAttribute("xlink:href") ?? "(cart not empty or not rendered)",
    has_symbol_ic_fox_cart: Boolean(document.getElementById("ic-fox-cart")),
    empty_collections_html: document.querySelector(".fox-mini-cart__collection-track")?.innerHTML.trim().slice(0, 400) ?? null,
    recommendation_rendered: Boolean(document.querySelector(".fox-mini-cart__recommendations")),
  })));
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
