import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { writeFile } from "node:fs/promises";

// Lighthouse performance + best-practices (mobile, like PageSpeed Insights) for one live page, with the detail items
// of the audits that matter. Full JSON saved in output/. Usage: --page=/ (path)
const BASE = "https://tyt-kid.myharavan.com";
const path = process.argv.find((a) => a.startsWith("--page="))?.slice(7) || "/";
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
let lhr;
try {
  const result = await lighthouse(`${BASE}${path}`, { port: chrome.port, onlyCategories: ["performance", "best-practices"], output: "json", logLevel: "error" });
  lhr = result.lhr;
} finally {
  await chrome.kill();
}
await writeFile(`output/lighthouse-perf-${path.replace(/\W+/g, "_") || "home"}.json`, JSON.stringify(lhr), "utf8");

const short = (url) => String(url ?? "").replace(/^https?:\/\/[^/]+/, "").split("?")[0].slice(-90);
const kb = (bytes) => Math.round((bytes ?? 0) / 1024);
const items = (id, map, limit = 10) => (lhr.audits[id]?.details?.items ?? []).slice(0, limit).map(map);
const report = {
  scores: Object.fromEntries(Object.entries(lhr.categories).map(([k, v]) => [k, Math.round(v.score * 100)])),
  metrics: Object.fromEntries(["first-contentful-paint", "largest-contentful-paint", "total-blocking-time", "cumulative-layout-shift", "speed-index"].map((id) => [id, lhr.audits[id]?.displayValue])),
  heaviest_requests: items("total-byte-weight", (i) => ({ url: short(i.url), kb: kb(i.totalBytes) }), 15),
  render_blocking: items("render-blocking-resources", (i) => ({ url: short(i.url), kb: kb(i.totalBytes), wasted_ms: Math.round(i.wastedMs ?? 0) }), 25),
  unused_js: items("unused-javascript", (i) => ({ url: short(i.url), kb: kb(i.totalBytes), unused_kb: kb(i.wastedBytes) }), 15),
  unused_css: items("unused-css-rules", (i) => ({ url: short(i.url), kb: kb(i.totalBytes), unused_kb: kb(i.wastedBytes) }), 10),
  image_delivery: items("image-delivery-insight", (i) => ({ url: short(i.url), kb: kb(i.totalBytes), saving_kb: kb(i.wastedBytes) }), 15).concat(
    items("uses-responsive-images", (i) => ({ url: short(i.url), kb: kb(i.totalBytes), saving_kb: kb(i.wastedBytes), audit: "responsive" }), 15)),
  low_resolution_images: items("image-size-responsive", (i) => ({ url: short(i.url), displayed: i.displayedSize, actual: i.actualSize, expected: i.expectedSize }), 10),
  bootup_js: items("bootup-time", (i) => ({ url: short(i.url), total_ms: Math.round(i.total), script_ms: Math.round(i.scripting) }), 10),
  console_errors: items("errors-in-console", (i) => ({ source: i.source, url: short(i.sourceLocation?.url ?? i.url), text: String(i.description ?? "").slice(0, 200) }), 15),
  issues: items("inspector-issues", (i) => ({ issue: i.issueType ?? i.description, sub: (i.subItems?.items ?? []).slice(0, 3).map((s) => short(s.url ?? s.cookieName ?? "")) }), 10),
  font_display: items("font-display", (i) => ({ url: short(i.url), wasted_ms: Math.round(i.wastedMs ?? 0) }), 5),
  forced_reflow: items("forced-reflow-insight", (i) => ({ source: short(i.source?.url ?? i.url), ms: Math.round(i.reflowTime ?? i.duration ?? 0) }), 10),
};
console.log(JSON.stringify(report, null, 1));
