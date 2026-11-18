import { chromium } from "playwright-core";

// Read-only debug: what covers the 1px add-to-cart progress bar on the live store while a request runs.
const URL = process.argv.find((arg) => arg.startsWith("--url="))?.slice(6) || "https://tyt-kid.myharavan.com/products/quan-ong-suong-tap-pilates-cap-cao-fox-aw-20261112-02";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = { url: URL, samples: [] };
setTimeout(() => { report.error = "watchdog 120s"; console.log(JSON.stringify(report, null, 2)); process.exit(0); }, 120000).unref();
try {
  await page.goto(URL, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForSelector('.fox-product__purchase add-to-cart[data-mode="cart"] button:not([disabled])', { timeout: 30000 });
  await page.waitForTimeout(1500);
  report.product = URL;
  await page.route("**/cart/add.js", async (route) => { await new Promise((r) => setTimeout(r, 1500)); await route.continue(); });
  await page.evaluate(() => document.querySelector('.fox-product__purchase add-to-cart[data-mode="cart"] button')?.click());
  for (const wait of [150, 600]) {
    await page.waitForTimeout(wait);
    report.samples.push(await page.evaluate(() => {
      const bar = document.querySelector(".fox-cart-progress");
      const header = document.querySelector("header, .fox-header, header-component");
      const describe = (node) => node ? `${node.tagName.toLowerCase()}${node.id ? "#" + node.id : ""}.${[...node.classList].slice(0, 3).join(".")}` : null;
      const cs = (node, props) => node ? Object.fromEntries(props.map((p) => [p, getComputedStyle(node).getPropertyValue(p)])) : null;
      const span = bar?.querySelector("span")?.getBoundingClientRect();
      return {
        bar_exists: Boolean(bar),
        bar_parent: describe(bar?.parentElement),
        bar_state: bar?.dataset.state,
        bar_rect: bar ? JSON.parse(JSON.stringify(bar.getBoundingClientRect())) : null,
        bar_fill_width: span ? Math.round(span.width) : null,
        bar_style: cs(bar, ["position", "top", "z-index", "opacity", "display", "height"]),
        top_element_at_y0: describe(document.elementFromPoint(720, 0)),
        top_element_at_y0_chain: (() => { const out = []; let n = document.elementFromPoint(720, 0); while (n && out.length < 5) { out.push(describe(n)); n = n.parentElement; } return out; })(),
        header: describe(header),
        header_style: cs(header, ["position", "top", "z-index", "transform", "isolation"]),
        header_in_top_layer: Boolean(header?.matches?.(":popover-open, :modal")),
        open_top_layer: [...document.querySelectorAll("dialog[open], [popover]")].map(describe),
        body_style: cs(document.body, ["transform", "filter", "contain", "position", "isolation", "z-index"]),
        html_style: cs(document.documentElement, ["transform", "filter", "contain"]),
      };
    }));
  }
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
