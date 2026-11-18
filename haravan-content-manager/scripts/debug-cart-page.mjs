import { chromium } from "playwright-core";

// Read-only debug of the live /cart page: horizontal overflow culprits and the invoice modal layout.
// Adds one product to this headless session's own cart first (nothing is ordered).
const BASE = "https://tyt-kid.myharavan.com";
const PRODUCT = `${BASE}/products/quan-ong-suong-tap-pilates-cap-cao-fox-aw-20261112-02`;
const report = {};
const browser = await chromium.launch({ channel: "chrome", headless: true });
setTimeout(() => { report.error = "watchdog"; console.log(JSON.stringify(report, null, 2)); process.exit(0); }, 150000).unref();

try {
  for (const [name, viewport] of [["desktop", { width: 1440, height: 900 }], ["mobile", { width: 390, height: 844 }]]) {
    const context = await browser.newContext({ viewport });
    const page = await context.newPage();
    await page.goto(PRODUCT, { waitUntil: "domcontentloaded", timeout: 60000 });
    const variantId = await page.evaluate(() => document.querySelector('.fox-product__purchase add-to-cart[data-mode="cart"]')?.dataset.variantId);
    await page.evaluate(async (id) => { await fetch("/cart/add.js", { method: "POST", headers: { "Content-Type": "application/x-www-form-urlencoded" }, body: `id=${id}&quantity=1` }); }, variantId);
    await page.goto(`${BASE}/cart`, { waitUntil: "domcontentloaded", timeout: 60000 });
    await page.waitForTimeout(2500);
    if (process.argv.includes("--simulate")) {
      await page.addStyleTag({ content: `
        .fox-cart-page__layout { grid-template-columns: minmax(0, 1fr); }
        .fox-cart-page__layout > *, cart-coupons, .fox-cart-coupons__slider { min-width: 0; }
        .fox-cart-page__side, .fox-cart-page__main-col { grid-template-columns: minmax(0, 1fr); }
        @media (min-width: 992px) { .fox-cart-page__layout { grid-template-columns: minmax(0, 1fr) minmax(340px, 400px); } }` });
      await page.waitForTimeout(500);
      report.mode = "simulate";
    }

    const overflow = await page.evaluate(() => {
      const vw = document.documentElement.clientWidth;
      const describe = (n) => `${n.tagName.toLowerCase()}${n.id ? "#" + n.id : ""}${n.classList.length ? "." + [...n.classList].slice(0, 3).join(".") : ""}`;
      const wide = [...document.querySelectorAll("body *")].filter((n) => {
        const r = n.getBoundingClientRect();
        return r.width > 0 && r.right > vw + 1 && getComputedStyle(n).position !== "fixed";
      });
      const deepest = wide.filter((n) => !wide.some((m) => m !== n && n.contains(m)));
      return {
        viewport: vw,
        page_scroll_width: document.documentElement.scrollWidth,
        overflowing: document.documentElement.scrollWidth > vw,
        culprits: deepest.slice(0, 8).map((n) => ({ el: describe(n), right: Math.round(n.getBoundingClientRect().right), width: Math.round(n.getBoundingClientRect().width), parents: (() => { const out = []; let p = n.parentElement; while (p && out.length < 4) { out.push(describe(p)); p = p.parentElement; } return out; })() })),
        layout: (() => { const l = document.querySelector(".fox-cart-page__layout"); if (!l) return null; const cs = getComputedStyle(l); return { width: Math.round(l.getBoundingClientRect().width), columns: cs.gridTemplateColumns }; })(),
      };
    });

    let modal = null;
    const toggle = page.locator('[data-role="invoice-toggle"]');
    if (await toggle.count()) {
      await toggle.check({ force: true });
      await page.waitForTimeout(800);
      modal = await page.evaluate(() => {
        const dialog = document.querySelector(".fox-cart-invoice__modal dialog");
        if (!dialog) return { error: "no dialog" };
        const r = (n) => { if (!n) return null; const b = n.getBoundingClientRect(); return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.width), h: Math.round(b.height) }; };
        const cs = getComputedStyle(dialog);
        return {
          open: dialog.open,
          dialog: r(dialog),
          dialog_style: { position: cs.position, display: cs.display, margin: cs.margin, background: cs.backgroundColor, width: cs.width, maxWidth: cs.maxWidth, padding: cs.padding, inset: cs.inset, transform: cs.transform },
          panel: r(dialog.querySelector(".fox-cart-invoice__dialog")),
          form_columns: getComputedStyle(dialog.querySelector(".fox-cart-invoice__form")).gridTemplateColumns,
          fields: [...dialog.querySelectorAll(".fox-cart-field")].map(r),
          has_close_button: Boolean(dialog.querySelector('[data-action="close"]:not(.btn)')),
          modal_classes: dialog.closest("modal-component")?.className,
        };
      });
    }
    report[name] = { overflow, modal };
    await context.close();
  }
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
