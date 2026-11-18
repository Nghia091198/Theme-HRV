import { chromium } from "playwright-core";

// Read-only: compare pages rendered by templates/page.liquid through a missing alternate template vs "page".
const BASE = "https://tyt-kid.myharavan.com";
const PATHS = ["/pages/chinh-sach-doi-tra", "/pages/about-us", "/pages/cong-ty", "/pages/tuyen-dung"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage();
const out = [];
for (const path of PATHS) {
  try {
    const response = await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
    const html = await response.text();
    const layout = html.match(/<div class="fox-blog__layout fox-article__layout">([\s\S]*?)<\/div>\s*\n\s*\n?\s*(<section class="fox-collection__policy"|{%|<\/div>)/);
    out.push({
      path,
      template: (html.match(/template-([^"\s]+)/) ?? [])[1],
      has_page_wrapper: html.includes("fox-blog fox-article fox-page"),
      has_aside: html.includes('class="fox-content-sidebar"'),
      liquid_errors: [...html.matchAll(/Liquid (?:syntax )?error[^<\n]{0,160}/gi)].map((m) => m[0]).slice(0, 5),
      after_main: (html.split("</main>")[1] ?? "").trim().slice(0, 220),
    });
  } catch (error) {
    out.push({ path, error: String(error?.message || error) });
  }
}
await browser.close();
console.log(JSON.stringify(out, null, 1));
