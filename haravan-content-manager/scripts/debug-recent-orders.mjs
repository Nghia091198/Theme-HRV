import { chromium } from "playwright-core";

// Read-only check of the recent orders card on a live collection page: appears after the delay, content (design A,
// no "verified" badge), small image, link, position above the language switcher without overlap, close → off for
// the session.
const URL = "https://tyt-kid.myharavan.com/collections/all";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
for (const [label, options] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const r = {};
  try {
    await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
    r.present = await page.locator("recent-orders").count();
    if (r.present) {
      await page.waitForSelector('recent-orders[data-state="visible"]', { timeout: 20000 });
      await page.waitForTimeout(600);
      Object.assign(r, await page.evaluate(() => {
        const rect = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height), bottom: Math.round(b.bottom) }; };
        const card = document.querySelector(".fox-ro__card");
        const translate = document.querySelector(".fox-translate__toggle");
        const c = rect(card);
        const t = rect(translate);
        const img = document.querySelector("[data-ro-image]");
        return {
          text: card.innerText.replace(/\s+/g, " ").trim(),
          link: document.querySelector("[data-ro-link]").getAttribute("href"),
          image: img.currentSrc.split("/").pop().slice(0, 70),
          image_loaded: img.complete && img.naturalWidth > 1,
          card: c,
          translate: t,
          overlaps_translate: Boolean(c && t && c.bottom > t.y && c.x < t.x + t.w),
          verified_badge: /xác thực/i.test(card.innerText),
        };
      }));
      await page.click("[data-ro-close]");
      await page.waitForTimeout(500);
      r.session_off = await page.evaluate(() => sessionStorage.getItem("fox-recent-orders-off"));
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(11000);
      r.shown_after_reload = await page.evaluate(() => document.querySelector("recent-orders")?.dataset.state === "visible");
    }
  } catch (error) {
    r.error = String(error?.message || error).slice(0, 160);
  }
  out[label] = r;
  await context.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
