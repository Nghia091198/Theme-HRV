import { chromium } from "playwright-core";

// Screenshot of the shared content page (top with sidebar, bottom with policy), printed as base64 JPEG for review.
const BASE = "https://tyt-kid.myharavan.com";
const path = process.argv.find((a) => a.startsWith("--path="))?.slice(7) || "/pages/chinh-sach-doi-tra";
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.6 });
try {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(3000);
  const shot = await page.screenshot({ fullPage: true, type: "jpeg", quality: 45 });
  console.log(shot.toString("base64"));
} finally {
  await browser.close();
}
