import { HaravanClient } from "../mcp/haravan-client.mjs";

// Read-only check through the Haravan Admin API (token handled by HaravanClient, never printed):
// list page templates / sidebar snippets on the live (main) theme, show what page.about-01.liquid includes, and which
// template the about-us page is assigned.
const client = new HaravanClient();
const report = {};
const tryGet = async (endpoint, query) => {
  try {
    const { data, status } = await client.get(endpoint, query);
    return { data, status };
  } catch (error) {
    return { error: { status: error?.status ?? null, message: String(error?.message ?? error) } };
  }
};
const themes = await tryGet("/web/themes.json");
report.themes_call = themes.error ?? { status: themes.status };
const list = themes.data?.themes ?? [];
report.themes = list.map((t) => ({ id: t.id, name: t.name, role: t.role }));
const main = list.find((t) => t.role === "main");
if (main) {
  const assets = await tryGet(`/web/themes/${main.id}/assets.json`);
  report.assets_call = assets.error ?? { status: assets.status };
  const keys = (assets.data?.assets ?? []).map((a) => a.key);
  report.page_templates = keys.filter((k) => /^templates\/page/.test(k));
  report.sidebar_snippets = keys.filter((k) => /sidebar/.test(k));
  if (keys.includes("templates/page.about-01.liquid")) {
    const asset = await tryGet(`/web/themes/${main.id}/assets.json`, { "asset[key]": "templates/page.about-01.liquid" });
    const value = asset.data?.asset?.value ?? "";
    report.about01_includes = [...value.matchAll(/include\s+'([^']+)'/g)].map((m) => m[1]);
    report.about01_first_lines = value.split("\n").slice(0, 6);
  }
}
const pages = await tryGet("/web/pages.json", { limit: 50 });
report.pages_call = pages.error ?? { status: pages.status };
report.pages = (pages.data?.pages ?? []).map((p) => ({ handle: p.handle, template_suffix: p.template_suffix ?? "" }));
console.log(JSON.stringify(report, null, 2));
