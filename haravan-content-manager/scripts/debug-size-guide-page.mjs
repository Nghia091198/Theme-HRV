import { chromium } from "playwright-core";

// Read-only: find the live size guide page, then measure the right-hand glass panel (size guide widget).
const BASE = "https://tyt-kid.myharavan.com";
const CANDIDATES = ["/pages/bang-size", "/pages/huong-dan-chon-size", "/pages/size-guide", "/pages/chon-size"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1536, height: 900 } });
const report = {};
try {
  for (const url of CANDIDATES) {
    const response = await page.goto(`${BASE}${url}`, { waitUntil: "domcontentloaded", timeout: 45000 });
    const isGuide = await page.evaluate(() => document.body.innerHTML.includes("Tìm size vừa vặn") || Boolean(document.querySelector('[class*="sgp"], [class*="size-guide-page"]')));
    report[url] = { status: response?.status(), size_guide: isGuide };
    if (isGuide) { report.url = url; break; }
  }
  if (report.url) {
    await page.waitForTimeout(2500);
    if (process.argv.includes("--simulate")) {
      await page.addStyleTag({ content: "size-guide, .fox-size-guide__tabs { display: block; }" });
      await page.waitForTimeout(300);
      report.mode = "simulate";
    }
    report.card = await page.evaluate(() => {
      const card = document.querySelector("size-guide.fox-size-guide__card");
      const rects = [...card.getClientRects()].map((r) => [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]);
      const box = card.getBoundingClientRect();
      return { display: getComputedStyle(card).display, painted_boxes: rects.length, boxes: rects.slice(0, 4), bounding: [Math.round(box.x), Math.round(box.y), Math.round(box.width), Math.round(box.height)] };
    });
    await page.locator("size-guide.fox-size-guide__card").screenshot({ path: "output/size-guide-card.png" });
  }
  if (report.url && !process.argv.includes("--chain")) report.skip_chain = true;
  if (report.url && process.argv.includes("--chain")) {
    report.panel = await page.evaluate(() => {
      const describe = (n) => `${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}.${[...n.classList].join(".")}`;
      const tab = [...document.querySelectorAll("button, [role='tab']")].find((n) => n.textContent.trim() === "Bảng size");
      const chain = [];
      let node = tab;
      while (node && node !== document.body && chain.length < 9) {
        const r = node.getBoundingClientRect();
        const cs = getComputedStyle(node);
        const before = getComputedStyle(node, "::before");
        chain.push({
          el: describe(node),
          box: [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)],
          background: cs.backgroundImage !== "none" ? cs.backgroundImage.slice(0, 120) : cs.backgroundColor,
          position: cs.position, overflow: cs.overflow, display: cs.display, isolation: cs.isolation, zIndex: cs.zIndex,
          before: before.content !== "none" ? { bg: (before.backgroundImage !== "none" ? before.backgroundImage.slice(0, 80) : before.backgroundColor), inset: before.inset, width: before.width, height: before.height, position: before.position } : null,
        });
        node = node.parentElement;
      }
      return chain;
    });
  }
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
