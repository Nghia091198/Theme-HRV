import { chromium } from "playwright-core";

// Small JPEG (base64) of one element on a live page, for review. --path=/pages/x --el=sidebar|policy
const BASE = "https://tyt-kid.myharavan.com";
const path = process.argv.find((a) => a.startsWith("--path="))?.slice(7) || "/pages/chinh-sach-doi-tra";
const el = process.argv.find((a) => a.startsWith("--el="))?.slice(5) || "sidebar";
const selector = el === "policy" ? ".fox-collection__policy" : ".fox-content-sidebar";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.45 });
try {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  const node = page.locator(selector).first();
  await node.scrollIntoViewIfNeeded();
  const box = await node.boundingBox();
  const clip = { x: Math.max(0, box.x - 20), y: Math.max(0, box.y - 20), width: Math.min(1440, box.width + 40), height: Math.min(760, box.height + 40) };
  const shot = await page.screenshot({ clip, type: "jpeg", quality: 40 });
  console.log(shot.toString("base64"));
} finally {
  await browser.close();
}
