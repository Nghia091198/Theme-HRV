import { chromium } from "playwright-core";

// Read-only debug of the story modal close button (.fox-product-story__dismiss) on the live store: button box, svg box,
// the drawn path box, and computed styles, while it follows the pointer over the backdrop.
const URL = process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) || "https://tyt-kid.myharavan.com/";

const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = { url: URL };
try {
  await page.goto(URL, { waitUntil: "networkidle", timeout: 60000 });
  await page.evaluate(() => {
    document.querySelector(".fox-product-story")?.scrollIntoView({ block: "center" });
    document.querySelector('.fox-product-story__card [data-action="open-story"]')?.click();
  });
  await page.waitForSelector(".fox-product-story__modal[data-state='open']", { state: "attached", timeout: 20000 });
  await page.mouse.move(1250, 300, { steps: 6 });
  await page.waitForTimeout(400);
  if (process.argv.includes("--simulate")) {
    // Preview of the local fix: the svg gets the symbol's own coordinate system, so <use> scales to fill it.
    await page.evaluate(() => document.querySelector(".fox-product-story__dismiss svg")?.setAttribute("viewBox", "0 0 14 14"));
    report.mode = "simulate";
  }

  Object.assign(report, await page.evaluate(() => {
    const button = document.querySelector(".fox-product-story__dismiss");
    if (!button) return { error: "no dismiss button" };
    const svg = button.querySelector("svg");
    const use = svg?.querySelector("use");
    const box = (r) => ({ x: +r.x.toFixed(2), y: +r.y.toFixed(2), w: +r.width.toFixed(2), h: +r.height.toFixed(2), cx: +(r.x + r.width / 2).toFixed(2), cy: +(r.y + r.height / 2).toFixed(2) });
    const b = box(button.getBoundingClientRect());
    const s = box(svg.getBoundingClientRect());
    const u = use ? box(use.getBoundingClientRect()) : null;
    const pick = (node, props) => { const cs = getComputedStyle(node); return Object.fromEntries(props.map((p) => [p, cs.getPropertyValue(p)])); };
    return {
      follow: button.dataset.follow || "",
      button: b,
      svg: s,
      drawn_use: u,
      svg_offset_vs_button: [+(s.cx - b.cx).toFixed(2), +(s.cy - b.cy).toFixed(2)],
      drawn_offset_vs_button: u ? [+(u.cx - b.cx).toFixed(2), +(u.cy - b.cy).toFixed(2)] : null,
      svg_attrs: Object.fromEntries([...svg.attributes].map((a) => [a.name, a.value])),
      button_children: [...button.childNodes].map((c) => c.nodeType === 3 ? `#text(${JSON.stringify(c.textContent)})` : `${c.nodeName.toLowerCase()}.${c.getAttribute?.("class") || ""}`),
      button_style: pick(button, ["display", "place-items", "align-items", "justify-items", "width", "height", "padding", "border-width", "box-sizing", "line-height", "font-size", "transform", "scale"]),
      svg_style: pick(svg, ["display", "width", "height", "margin", "padding", "position", "top", "left", "transform", "translate", "vertical-align", "overflow", "align-self", "justify-self", "grid-area", "stroke-width"]),
    };
  }));
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
