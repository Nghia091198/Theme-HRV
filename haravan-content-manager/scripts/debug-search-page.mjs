import { chromium } from "playwright-core";

// Read-only check of /search (no keyword): popular chips vs the head's bottom edge, and the divider vs the rail content.
const URL = "https://tyt-kid.myharavan.com/search";
const FIX = `
.fox-search-page__hero-inner { padding-bottom: 2.6rem; }
.fox-search-page__tabs { padding-bottom: 0; }
.fox-search-page__recommend { padding-top: 0; border-top: 0; }
.fox-search-page__recommend::before { display: block; height: 1px; margin-bottom: 2.4rem; background: rgb(27 38 49 / 12%); content: ''; }`;

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const measure = () => page.evaluate(() => {
  const r = (s) => document.querySelector(s)?.getBoundingClientRect();
  const hero = r(".fox-search-page__hero");
  const chips = r(".fox-search-page__popular");
  const section = document.querySelector(".fox-search-page__recommend");
  const before = section ? getComputedStyle(section, "::before") : null;
  const sectionRect = section?.getBoundingClientRect();
  const padL = section ? parseFloat(getComputedStyle(section).paddingLeft) : 0;
  const padR = section ? parseFloat(getComputedStyle(section).paddingRight) : 0;
  const borderTop = section ? getComputedStyle(section).borderTopWidth : null;
  const title = r(".fox-search-page__recommend h2, .fox-search-page__recommend .fox-search__rail-title, .fox-search-page__recommend [class*='title']");
  const card = r(".fox-search-page__recommend product-card");
  const lineLeft = before && before.content !== "none" ? sectionRect.left + padL : sectionRect?.left;
  const lineRight = before && before.content !== "none" ? sectionRect.right - padR : sectionRect?.right;
  return {
    eyebrow: document.querySelector(".fox-search-page__eyebrow")?.textContent.trim(),
    chips_gap_to_hero_bottom: chips && hero ? Math.round(hero.bottom - chips.bottom) : null,
    divider: { left: Math.round(lineLeft), right: Math.round(lineRight), border_top: borderTop },
    title_left: title ? Math.round(title.left) : null,
    first_card_left: card ? Math.round(card.left) : null,
  };
});
const out = {};
try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  out.before = await measure();
  await page.addStyleTag({ content: FIX });
  await page.waitForTimeout(300);
  out.after = await measure();
} catch (error) {
  out.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 2));
