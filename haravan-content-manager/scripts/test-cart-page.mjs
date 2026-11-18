import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

// Behaviour test of the cart page components in the theme's real cart-root.js (cart-total, cart-delivery,
// cart-coupons, cart-invoice) with a recording FOX.cart stub. Clock fixed at 14/11/2026 14:30.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cartRoot = pathToFileURL(path.resolve(root, "..", "FOX Fashion", "assets", "cart-root.js")).href;
const harness = path.join(root, "output", "cart-page-test.html");
await writeFile(harness, `<!doctype html><meta charset="utf-8"><body>
<cart-total data-item-count="2"><aside data-role="cart-side"><strong data-role="side-total">1.190.000₫</strong>
<cart-delivery data-start="8" data-end="21" data-value="">
 <input type="radio" name="m" value="asap" data-role="mode" checked><input type="radio" name="m" value="schedule" data-role="mode">
 <div data-role="schedule" hidden><input type="date" data-role="date"><select data-role="slot"></select></div><p data-role="status"></p>
</cart-delivery>
<cart-delivery id="restored" data-start="8" data-end="21" data-value="16/11/2026 09:00 - 10:00">
 <input type="radio" name="r" value="asap" data-role="mode" checked><input type="radio" name="r" value="schedule" data-role="mode">
 <div data-role="schedule" hidden><input type="date" data-role="date"><select data-role="slot"></select></div><p data-role="status"></p>
</cart-delivery>
<cart-coupons><button data-coupon-copy="FOX50"><span data-role="copy-label">Sao chép</span></button></cart-coupons>
<cart-invoice data-saved="false">
 <input type="checkbox" data-role="invoice-toggle"><button type="button" data-role="invoice-edit" hidden>Sửa</button>
 <p data-role="invoice-summary" hidden></p><p data-role="invoice-status"></p>
 <modal-component>
  <input data-invoice="bill_order_company" required><input data-invoice="bill_order_tax_code" pattern="[0-9]{10}([0-9]{3})?|[0-9]{10}-[0-9]{3}" required>
  <input type="email" data-invoice="bill_email" required><input data-invoice="bill_order_address" required>
  <button data-role="invoice-confirm">Xác nhận</button>
 </modal-component>
</cart-invoice></aside></cart-total>
<script>
window.sent = []; window.modalOpened = 0;
customElements.define('modal-component', class extends HTMLElement {
  open() { window.modalOpened++; this.dataset.state = 'open'; }
  close(reason) { this.dataset.state = 'closed'; this.dispatchEvent(new CustomEvent('modal:closed', { bubbles: true, detail: { reason } })); }
});
window.FOX = { cart: { setAttributes: async (a) => { window.sent.push(a); return {}; }, formatMoney: (v) => new Intl.NumberFormat('vi-VN').format(v / 100) + '₫' } };
</script>
<script src="${cartRoot}"></script>`);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const context = await browser.newContext({ permissions: ["clipboard-read", "clipboard-write"] });
const page = await context.newPage();
await page.clock.install({ time: new Date(2026, 10, 14, 14, 30) });
await page.goto(pathToFileURL(harness).href);
const out = {};
const d = 'cart-delivery:not(#restored)';

await page.check(`${d} [data-role="mode"][value="schedule"]`);
out.today_slots = await page.evaluate((sel) => [...document.querySelectorAll(`${sel} [data-role="slot"] option`)].slice(1).map((o) => `${o.value}${o.disabled ? " (khoá)" : ""}`), d);
out.date_min_max = await page.evaluate((sel) => { const i = document.querySelector(`${sel} [data-role="date"]`); return [i.min, i.max, i.value]; }, d);
await page.selectOption(`${d} [data-role="slot"]`, "15:00 - 16:00");
await page.waitForTimeout(50);
out.saved_schedule = await page.evaluate(() => window.sent.at(-1));
await page.check(`${d} [data-role="mode"][value="asap"]`);
await page.waitForTimeout(50);
out.saved_asap = await page.evaluate(() => window.sent.at(-1));
out.restored = await page.evaluate(() => { const r = document.getElementById("restored"); return { mode: r.querySelector('[data-role="mode"]:checked').value, date: r.querySelector('[data-role="date"]').value, slot: r.querySelector('[data-role="slot"]').value, scheduleVisible: !r.querySelector('[data-role="schedule"]').hidden }; });

await page.click("[data-coupon-copy]");
await page.waitForTimeout(50);
out.coupon = await page.evaluate(async () => ({ label: document.querySelector('[data-role="copy-label"]').textContent, clipboard: await navigator.clipboard.readText() }));

await page.check('[data-role="invoice-toggle"]');
out.invoice_tick_opens_modal = await page.evaluate(() => window.modalOpened);
await page.evaluate(() => document.querySelector('modal-component').close('button'));
out.invoice_cancel_unticks = await page.evaluate(() => document.querySelector('[data-role="invoice-toggle"]').checked === false);

await page.check('[data-role="invoice-toggle"]');
await page.evaluate(() => document.querySelector('[data-role="invoice-confirm"]').click());
out.invoice_empty_blocked = await page.evaluate(() => window.sent.filter((a) => a.invoice).length === 0);
await page.evaluate(() => {
  const set = (name, value) => { document.querySelector(`[data-invoice="${name}"]`).value = value; };
  set('bill_order_company', 'Công ty TNHH FOX'); set('bill_order_tax_code', '12345'); set('bill_email', 'ketoan@fox.vn'); set('bill_order_address', '12 Lê Lợi, Q1, TP.HCM');
  document.querySelector('[data-role="invoice-confirm"]').click();
});
out.invoice_bad_tax_blocked = await page.evaluate(() => window.sent.filter((a) => a.invoice).length === 0);
await page.evaluate(() => {
  document.querySelector('[data-invoice="bill_order_tax_code"]').value = '0312345678';
  document.querySelector('[data-role="invoice-confirm"]').click();
});
await page.waitForTimeout(50);
out.invoice_saved = await page.evaluate(() => window.sent.at(-1));
out.invoice_after_save = await page.evaluate(() => ({
  checked: document.querySelector('[data-role="invoice-toggle"]').checked,
  modal: document.querySelector('modal-component').dataset.state,
  summary: document.querySelector('[data-role="invoice-summary"]').textContent,
  editVisible: !document.querySelector('[data-role="invoice-edit"]').hidden,
}));
await page.uncheck('[data-role="invoice-toggle"]');
await page.waitForTimeout(50);
out.invoice_off = await page.evaluate(() => window.sent.at(-1));

await page.evaluate(() => document.dispatchEvent(new CustomEvent("cart:changed", { detail: { itemCount: 3, totalPrice: 158900000 } })));
out.total_after_change = await page.evaluate(() => document.querySelector('[data-role="side-total"]').textContent);
await page.evaluate(() => document.dispatchEvent(new CustomEvent("cart:changed", { detail: { itemCount: 0, totalPrice: 0 } })));
out.side_hidden_when_empty = await page.evaluate(() => document.querySelector('[data-role="cart-side"]').hidden);

await browser.close();
console.log(JSON.stringify(out, null, 2));
