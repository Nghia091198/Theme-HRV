import { chromium } from "playwright-core";

// Read-only debug of the story modal product chip on the live store: geometry of card / quick view wrapper / button /
// icon, computed styles, and every stylesheet rule that matches the wrapper and the button.
const URL = process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) || "https://tyt-kid.myharavan.com/";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = { url: URL };
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  // The story row is a running marquee (never "stable" for Playwright), so open the first story through the DOM.
  await page.evaluate(() => {
    document.querySelector(".fox-product-story")?.scrollIntoView({ block: "center" });
    document.querySelector('.fox-product-story__card [data-action="open-story"]')?.click();
  });
  await page.waitForSelector('.fox-product-story__modal .fox-product-story__product[data-state="ready"] .btn-quickview', { timeout: 20000 });
  if (process.argv.includes("--simulate")) {
    // Preview of the local fix on the live page: no injected label (product-story.js) + the new grid-area rule.
    await page.evaluate(() => {
      document.querySelectorAll(".fox-product-story__quickview-label").forEach((label) => label.remove());
      const style = document.createElement("style");
      style.textContent = '.fox-product-story .product-card--story .proloop--quickview :is(.btn-quickview, [data-action="quickview"]) > * { grid-area: 1 / 1; }';
      document.head.append(style);
    });
    report.mode = "simulate";
  }
  await page.waitForTimeout(800);

  Object.assign(report, await page.evaluate(() => {
    const button = [...document.querySelectorAll('.fox-product-story__modal .fox-product-story__product[data-state="ready"] .btn-quickview')]
      .find((node) => node.getBoundingClientRect().width > 0);
    if (!button) return { error: "no visible quick view button" };
    const wrapper = button.closest(".proloop--quickview");
    const card = button.closest(".product-inner");
    const icon = button.querySelector("svg");
    const rect = (node) => { const r = node.getBoundingClientRect(); return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), cy: +(r.y + r.height / 2).toFixed(1), cx: +(r.x + r.width / 2).toFixed(1) }; };
    const pick = (node, props) => { const cs = getComputedStyle(node); return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])); };
    const props = ["display", "position", "top", "right", "bottom", "left", "width", "height", "min-width", "min-height", "padding", "margin", "transform", "translate", "scale", "align-items", "justify-content", "place-items", "flex", "line-height", "font-size", "border-width", "box-sizing", "vertical-align", "opacity", "transition"];
    const matchedRules = (node) => {
      const out = [];
      for (const sheet of document.styleSheets) {
        let rules;
        try { rules = sheet.cssRules; } catch { continue; }
        const walk = (list, media) => {
          for (const rule of list) {
            if (rule.cssRules && !rule.selectorText) { walk(rule.cssRules, rule.conditionText || media); continue; }
            if (!rule.selectorText) continue;
            let hit = false;
            try { hit = node.matches(rule.selectorText); } catch { hit = false; }
            if (hit) out.push({ file: (sheet.href || "inline").split("/").pop().split("?")[0], media: media || "", selector: rule.selectorText, css: rule.style.cssText });
          }
        };
        walk(rules, "");
      }
      return out;
    };
    return {
      card: rect(card),
      wrapper: rect(wrapper),
      button: rect(button),
      icon: rect(icon),
      button_center_offset_vs_card: +(rect(button).cy - rect(card).cy).toFixed(1),
      icon_center_offset_vs_button: [+(rect(icon).cx - rect(button).cx).toFixed(1), +(rect(icon).cy - rect(button).cy).toFixed(1)],
      wrapper_parent: wrapper.parentElement.className,
      wrapper_children: [...wrapper.children].map((c) => `${c.tagName.toLowerCase()}.${c.className}`),
      button_children: [...button.childNodes].map((c) => c.nodeType === 3 ? `#text(${JSON.stringify(c.textContent)})` : `${c.nodeName.toLowerCase()}.${c.getAttribute?.("class") || ""}`),
      wrapper_style: pick(wrapper, props),
      button_style: pick(button, props),
      icon_style: pick(icon, ["display", "width", "height", "position", "top", "left", "transform", "vertical-align", "margin"]),
      wrapper_rules: matchedRules(wrapper),
      button_rules: matchedRules(button),
    };
  }));
  await page.screenshot({ path: "output/debug-story-eye.png" });
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
