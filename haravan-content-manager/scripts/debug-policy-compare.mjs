import { chromium } from "playwright-core";

// Read-only: computed style of the policy section on a collection page (reference) vs the shared content page.
const BASE = "https://tyt-kid.myharavan.com";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const read = () => page.evaluate(() => {
  const pick = (node, props) => node ? Object.fromEntries(props.map((p) => [p, getComputedStyle(node).getPropertyValue(p)])) : null;
  const section = document.querySelector(".fox-collection__policy");
  return {
    section: pick(section, ["display", "grid-template-columns", "gap", "padding", "margin-top", "background-color", "border-top", "border-radius", "color"]),
    item: pick(section?.querySelector(".fox-collection__policy-item"), ["display", "gap", "padding", "background-color", "border", "border-radius", "box-shadow"]),
    icon: pick(section?.querySelector(".fox-collection__policy-icon"), ["width", "height", "background-color", "border-radius", "color"]),
    title: pick(section?.querySelector(".fox-collection__policy-item strong, .fox-collection__policy-title"), ["font-size", "font-weight", "color"]),
    ancestors: (() => { const out = []; let n = section?.parentElement; while (n && out.length < 4) { out.push(`${n.tagName.toLowerCase()}.${[...n.classList].join(".")}`); n = n.parentElement; } return out; })(),
    vars_on_section: section ? ["--fox-collection-line", "--fox-collection-surface", "--fox-policy-bg", "--fox-collection-ink"].map((v) => `${v}=${getComputedStyle(section).getPropertyValue(v).trim() || "(trống)"}`) : null,
  };
});
const out = {};
try {
  await page.goto(`${BASE}/collections/all`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  out.collection = await read();
  await page.goto(`${BASE}/pages/chinh-sach-doi-tra`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  out.content_page = await read();
} catch (error) {
  out.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(out, null, 1));
