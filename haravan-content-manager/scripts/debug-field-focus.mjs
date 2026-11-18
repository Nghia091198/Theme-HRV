import { chromium } from "playwright-core";

// Read-only: for every visible text-like field on key live pages, check that focusing it changes something visible
// on the field or its wrappers (outline, box-shadow, border colour, background). Desktop and touch-size viewports.
const BASE = "https://tyt-kid.myharavan.com";
const PAGES = ["/", "/search", "/pages/lien-he", "/pages/faq", "/cart", "/products/quan-ong-suong-tap-pilates-cap-cao-fox-aw-20261112-02"];
const FIELD = 'input:not([type=hidden]):not([type=checkbox]):not([type=radio]):not([type=submit]):not([type=button]), textarea, select';
const browser = await chromium.launch({ channel: "chrome", headless: true });
const out = [];
for (const [label, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
  const context = await browser.newContext({ viewport, isMobile: label === "mobile", hasTouch: label === "mobile" });
  const page = await context.newPage();
  for (const path of PAGES) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
      await page.waitForTimeout(1800);
      const results = await page.evaluate(async (selector) => {
        const props = ["outlineStyle", "outlineWidth", "boxShadow", "borderTopColor", "borderBottomColor", "backgroundColor"];
        const snap = (el) => { const chain = []; let n = el; for (let i = 0; i < 4 && n; i += 1, n = n.parentElement) { const cs = getComputedStyle(n); chain.push(props.map((p) => cs[p]).join("|")); } return chain; };
        const visible = [...document.querySelectorAll(selector)].filter((el) => { const r = el.getBoundingClientRect(); const cs = getComputedStyle(el); return r.width > 20 && r.height > 14 && cs.visibility !== "hidden" && cs.display !== "none" && !el.closest("[hidden], dialog:not([open])"); });
        const report = [];
        for (const el of visible) {
          const before = snap(el);
          el.focus();
          await new Promise((r) => setTimeout(r, 260));
          const after = snap(el);
          const changed = before.some((v, i) => v !== after[i]);
          const fontSize = parseFloat(getComputedStyle(el).fontSize);
          report.push({ field: `${el.tagName.toLowerCase()}${el.name ? `[name=${el.name}]` : ""}.${[...el.classList].slice(0, 2).join(".")}`, focus_visible_change: changed, font_px: fontSize });
          el.blur();
        }
        return report;
      }, FIELD);
      results.forEach((r) => out.push({ viewport: label, path, ...r }));
    } catch (error) {
      out.push({ viewport: label, path, error: String(error?.message || error).slice(0, 120) });
    }
  }
  await context.close();
}
await browser.close();
const problems = out.filter((r) => r.error || !r.focus_visible_change || (r.viewport === "mobile" && r.font_px < 16));
console.log(JSON.stringify({ checked: out.length, problems }, null, 1));
