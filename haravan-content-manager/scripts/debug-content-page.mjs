import { chromium } from "playwright-core";

// Read-only debug of a shared content page (templates/page.liquid): sidebar markup, policy section, loaded CSS.
const BASE = "https://tyt-kid.myharavan.com";
const SPECIAL = ["bang-size", "faq", "yeu-thich", "lien-he", "ve-chung-toi", "chat-lieu", "about", "contact"];
const browser = await chromium.launch({ channel: "chrome", headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const report = {};
try {
  await page.goto(BASE, { waitUntil: "domcontentloaded", timeout: 60000 });
  const links = await page.evaluate(() => [...new Set([...document.querySelectorAll('a[href*="/pages/"]')].map((a) => new URL(a.href).pathname))]);
  report.page_links = links;
  const target = process.argv.find((a) => a.startsWith("--path="))?.slice(7) || links.find((p) => !SPECIAL.some((s) => p.includes(s)));
  report.target = target;
  await page.goto(`${BASE}${target}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await page.waitForTimeout(2500);
  Object.assign(report, await page.evaluate(() => {
    const aside = document.querySelector(".fox-content-sidebar");
    const policy = document.querySelector(".fox-collection__policy");
    const css = [...document.styleSheets].map((s) => (s.href || "inline").split("/").pop().split("?")[0]);
    const box = (n) => { if (!n) return null; const r = n.getBoundingClientRect(); return [Math.round(r.x), Math.round(r.y), Math.round(r.width), Math.round(r.height)]; };
    return {
      body_class: document.body.className,
      wrapper_classes: document.querySelector(".fox-page")?.className ?? "(không có .fox-page — template khác?)",
      layout_columns: getComputedStyle(document.querySelector(".fox-article__layout") ?? document.body).gridTemplateColumns,
      layout_children: [...(document.querySelector(".fox-article__layout")?.children ?? [])].map((c) => `${c.tagName.toLowerCase()}.${[...c.classList].join(".")}`),
      layout_tail_html: (document.querySelector(".fox-article__layout")?.innerHTML ?? "").trim().slice(-400),
      aside: aside ? { class: aside.className, box: box(aside), children: aside.children.length, html: aside.innerHTML.trim().slice(0, 300) } : null,
      policy: policy ? { box: box(policy), display: getComputedStyle(policy).display, items: policy.querySelectorAll(".fox-collection__policy-item").length, first_item_style: (() => { const i = policy.querySelector(".fox-collection__policy-item"); if (!i) return null; const cs = getComputedStyle(i); return { display: cs.display, padding: cs.padding, background: cs.backgroundColor }; })() } : null,
      css_blog: css.some((h) => h.startsWith("blog")),
      css_policy: css.some((h) => h.startsWith("policy")),
      css_style_page: css.some((h) => h.startsWith("style-page")),
      css_files: css.filter((h) => !h.startsWith("inline")).slice(-12),
    };
  }));
} catch (error) {
  report.error = String(error?.message || error);
} finally {
  await browser.close();
}
console.log(JSON.stringify(report, null, 2));
