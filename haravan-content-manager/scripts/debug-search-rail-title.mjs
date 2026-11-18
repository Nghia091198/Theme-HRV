import { chromium } from "playwright-core";

// Read-only: computed style of the search page rail title (expected like #fox-recently-viewed-heading at 1440px:
// 25px, weight 500) and of the header search panel rail title (must stay the panel's own style).
const BASE = "https://tyt-kid.myharavan.com";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const style = () => page.evaluate(() => {
  const read = (node) => node ? (({ fontSize, fontWeight, fontFamily, lineHeight, letterSpacing }) => ({ text: node.textContent.trim(), class: node.className, fontSize, fontWeight, fontFamily: fontFamily.split(",")[0], lineHeight, letterSpacing }))(getComputedStyle(node)) : null;
  return {
    page_rail: read(document.querySelector(".fox-search-page__recommend [data-role='rail-title']")),
    header_panel_rail: read(document.querySelector("search-panel [data-role='rail-title']")),
  };
});
const out = {};
try {
  for (const [name, url] of [["khong_ket_qua", `${BASE}/search?q=zzzzqx`], ["chua_tim", `${BASE}/search`]]) {
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2000);
    out[name] = await style();
  }
} catch (error) {
  out.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 2));
