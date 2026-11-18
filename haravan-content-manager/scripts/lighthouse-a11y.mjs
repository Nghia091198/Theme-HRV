import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { writeFile } from "node:fs/promises";

// Lighthouse accessibility audit (mobile, like PageSpeed Insights) on the live store's main pages, using the local
// Chrome. Prints the score and every failing audit with its offending nodes; full JSON saved in output/.
const BASE = "https://tyt-kid.myharavan.com";
const only = process.argv.find((a) => a.startsWith("--page="))?.slice(7);
const PAGES = {
  home: "/",
  collection: "/collections/all",
  product: "/products/quan-ong-suong-tap-pilates-cap-cao-fox-aw-20261112-02",
  cart: "/cart",
  search: "/search?q=legging",
  page: "/pages/chinh-sach-doi-tra",
};
const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-sandbox"] });
const summary = {};
try {
  for (const [name, path] of Object.entries(PAGES)) {
    if (only && only !== name) continue;
    const result = await lighthouse(`${BASE}${path}`, { port: chrome.port, onlyCategories: ["accessibility"], output: "json", logLevel: "error" });
    const lhr = result.lhr;
    await writeFile(`output/lighthouse-a11y-${name}.json`, JSON.stringify(lhr), "utf8");
    const failing = Object.values(lhr.audits)
      .filter((a) => a.score !== null && a.score < 1 && a.scoreDisplayMode === "binary")
      .map((a) => ({
        id: a.id,
        title: a.title,
        nodes: (a.details?.items ?? []).slice(0, 6).map((item) => ({
          selector: item.node?.selector,
          snippet: (item.node?.snippet ?? "").slice(0, 160),
          explanation: (item.node?.explanation ?? "").split("\n").slice(0, 2).join(" | ").slice(0, 200),
        })),
        total_nodes: a.details?.items?.length ?? 0,
      }));
    summary[name] = { score: Math.round(lhr.categories.accessibility.score * 100), failing };
  }
} finally {
  await chrome.kill();
}
console.log(JSON.stringify(summary, null, 1));
