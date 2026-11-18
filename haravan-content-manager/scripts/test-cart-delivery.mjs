import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { chromium } from "playwright-core";

// Behaviour test of <cart-delivery> in the theme's real cart-root.js with a recording FOX.cart stub.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const cartRoot = pathToFileURL(path.resolve(root, "..", "FOX Fashion", "assets", "cart-root.js")).href;
const harness = path.join(root, "output", "cart-delivery-test.html");
const block = (id, value, asapChecked = false) => `
<cart-delivery id="${id}" data-start="8" data-end="21" data-value="${value}">
 <input type="radio" name="${id}" value="asap" data-role="mode"${asapChecked ? " checked" : ""}><input type="radio" name="${id}" value="schedule" data-role="mode">
 <div data-role="schedule" hidden><input type="date" data-role="date"><select data-role="slot"></select></div><p data-role="status"></p>
</cart-delivery>`;
await writeFile(harness, `<!doctype html><meta charset="utf-8"><body>
${block("fresh", "")}
${block("asap", "Giao khi có hàng")}
${block("future", "16/11/2026 09:00 - 10:00")}
${block("passed", "14/11/2026 09:00 - 10:00")}
<script>
window.sent = [];
window.FOX = { cart: { setAttributes: async (a) => { window.sent.push(a['Delivery Time']); return {}; }, formatMoney: (v) => String(v) } };
</script>
<script src="${cartRoot}"></script>`);

const state = (page, id) => page.evaluate((id) => {
  const r = document.getElementById(id);
  return { checked: r.querySelector('[data-role="mode"]:checked')?.value ?? "(không tích)", date: r.querySelector('[data-role="date"]').value, slot: r.querySelector('[data-role="slot"]').value };
}, id);

const browser = await chromium.launch({ channel: "chrome", headless: true });
const out = {};

const page = await browser.newPage();
await page.clock.install({ time: new Date(2026, 10, 14, 14, 30) });
await page.goto(pathToFileURL(harness).href);
await page.waitForTimeout(100);
out["1_mac_dinh_chua_luu"] = await state(page, "fresh");
out["2_gio_cu_con_chu_Giao_khi_co_hang"] = { ...(await state(page, "asap")), status: await page.evaluate(() => document.querySelector('#asap [data-role="status"]').textContent), gui: await page.evaluate(() => window.sent.slice()) };
out["3_da_luu_16/11_09h"] = await state(page, "future");
out["4_da_luu_14/11_09h_nay_da_qua"] = { ...(await state(page, "passed")), luu_lai: await page.evaluate(() => window.sent.slice()) };

await page.evaluate(() => { window.sent = []; });
await page.check('#fresh [data-role="mode"][value="schedule"]');
await page.waitForTimeout(50);
out["5_bat_chon_thoi_gian_luc_14h30"] = { ...(await state(page, "fresh")), luu: await page.evaluate(() => window.sent.slice()) };

await page.fill('#fresh [data-role="date"]', "2026-11-16");
await page.dispatchEvent('#fresh [data-role="date"]', "change");
await page.waitForTimeout(50);
out["6_doi_ngay_16/11"] = { ...(await state(page, "fresh")), luu: await page.evaluate(() => window.sent.slice()) };

await page.selectOption('#fresh [data-role="slot"]', "18:00 - 19:00");
await page.waitForTimeout(50);
out["7_chon_khung_18h"] = { luu: await page.evaluate(() => window.sent.at(-1)) };

await page.check('#fresh [data-role="mode"][value="asap"]');
await page.waitForTimeout(50);
out["7b_chon_Giao_khi_co_hang"] = { gui: JSON.stringify(await page.evaluate(() => window.sent.at(-1))), status: await page.evaluate(() => document.querySelector('#fresh [data-role="status"]').textContent) };

const late = await browser.newPage();
await late.clock.install({ time: new Date(2026, 10, 14, 21, 30) });
await late.goto(pathToFileURL(harness).href);
await late.evaluate(() => { window.sent = []; });
await late.check('#fresh [data-role="mode"][value="schedule"]');
await late.waitForTimeout(50);
out["8_bat_chon_thoi_gian_luc_21h30"] = { ...(await state(late, "fresh")), luu: await late.evaluate(() => window.sent.slice()) };

await browser.close();
console.log(JSON.stringify(out, null, 2));
