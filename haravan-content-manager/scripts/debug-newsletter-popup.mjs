import { chromium } from "playwright-core";

// Read-only check of the newsletter popup on the live store (the form is never submitted: it would create a real
// customer): opens on the home page after the delay; once shown it does not come back on reload even if it was not
// closed; it never appears on other pages.
const BASE = "https://tyt-kid.myharavan.com";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const out = {};
for (const [label, options] of [["desktop", { viewport: { width: 1440, height: 900 } }], ["mobile", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }]]) {
  const context = await browser.newContext(options);
  const page = await context.newPage();
  const result = {};
  try {
    await page.goto(`${BASE}/collections/all`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(7000);
    result.on_collection_page = await page.locator("newsletter-popup").count();

    await page.goto(`${BASE}/`, { waitUntil: "domcontentloaded", timeout: 60000 });
    result.present_on_home = await page.locator("newsletter-popup").count();
    if (result.present_on_home) {
      await page.waitForSelector("newsletter-popup dialog[open]", { timeout: 15000 });
      result.opened = true;
      result.hidden_for_days_after_show = await page.evaluate(() => Math.round((Number(localStorage.getItem("fox-newsletter-popup")) - Date.now()) / 86400000));
      result.layout = await page.evaluate(() => {
        const box = (s) => { const n = document.querySelector(s); if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.width), Math.round(r.height)]; };
        const img = document.querySelector(".fox-np__media-img, .fox-np__banner-img");
        const style = (node) => { if (!node) return null; const cs = getComputedStyle(node); return { bg: cs.backgroundColor, color: cs.color, radius: cs.borderRadius, border: cs.borderTopColor, weight: cs.fontWeight, height: Math.round(node.getBoundingClientRect().height) }; };
        const reference = [...document.querySelectorAll(".btn.btn-secondary")].find((node) => !node.closest("newsletter-popup") && node.getBoundingClientRect().width > 0);
        return { panel: box(".fox-np__panel") || box(".fox-np__banner"), image_loaded: Boolean(img?.complete && img.naturalWidth), input_font_px: parseFloat(getComputedStyle(document.querySelector(".fox-np__input") ?? document.body).fontSize), submit: style(document.querySelector(".fox-np__submit")), theme_btn_secondary: style(reference), has_effect_span: Boolean(document.querySelector(".fox-np__submit [data-btn-effect-span]")), removed_parts_present: Boolean(document.querySelector(".fox-np__consent, .fox-np__decline, .fox-np__code")) };
      });
      await page.reload({ waitUntil: "domcontentloaded" });
      await page.waitForTimeout(8000);
      result.reopened_after_reload_without_closing = await page.evaluate(() => Boolean(document.querySelector("newsletter-popup dialog[open]")));
    }
  } catch (error) {
    result.error = String(error?.message || error).slice(0, 160);
  }
  out[label] = result;
  await context.close();
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
