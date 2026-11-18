import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read-only QC of the theme: rule violations, unused setting keys, unreferenced files, risky patterns.
const theme = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion");
const DIRS = ["layout", "templates", "snippets", "assets", "config"];
const files = [];
for (const dir of DIRS) {
  for (const name of await readdir(path.join(theme, dir))) {
    const rel = `${dir}/${name}`;
    const isText = /\.(liquid|js|css|scss\.liquid|html|json|svg)$/.test(name);
    files.push({ rel, dir, name, text: isText ? await readFile(path.join(theme, rel), "utf8") : "" });
  }
}
const liquid = files.filter((f) => f.name.endsWith(".liquid") && !f.name.endsWith(".scss.liquid"));
const js = files.filter((f) => f.dir === "assets" && f.name.endsWith(".js") && !/\.min\.js$|vendor|jquery|swiper|flatpickr/i.test(f.name));
const css = files.filter((f) => f.dir === "assets" && /\.(css|scss\.liquid)$/.test(f.name) && !/\.min\.css$|vendor|swiper|flatpickr/i.test(f.name));
const all = files.filter((f) => f.text);
const hits = (list, re) => list.flatMap((f) => [...f.text.matchAll(re)].map((m) => ({ file: f.rel, line: f.text.slice(0, m.index).split("\n").length, match: m[0].slice(0, 110) })));
const count = (list, re) => Object.fromEntries(list.map((f) => [f.rel, (f.text.match(re) ?? []).length]).filter(([, n]) => n));

// 1. Rule violations
const rules = {
  liquid_forbidden_tags: hits(liquid, /\{%-?\s*(liquid|echo|render|schema)\b/g),
  checkbox_compare_false: hits(liquid, /settings[.\[][^%}]*?(?:!=|==)\s*false/g),
  settings_file_key_reads: hits(liquid, /settings\['[^']+\.(?:jpg|png|jpeg|gif)'\]/g),
  raw_img_tags: count(liquid.filter((f) => f.name !== "render-img.liquid"), /<img\b/g),
  inline_event_handlers: hits(liquid, /\son(click|change|load|submit|input)=/g),
  js_var: count(js, /(^|[;{}\s])var\s+[\w$]/g),
  js_console_log: hits(js, /console\.log\(/g),
  js_new_swiper_outside_core: hits(js.filter((f) => !/slider/i.test(f.name)), /new Swiper\(/g),
  legacy_js_swiper_slider: hits(all, /js-swiper-slider/g),
  tyt_identifiers: hits(all.filter((f) => f.dir !== "config"), /\b(tyt|TYT|Tyt)[A-Za-z_-]/g).slice(0, 40),
  css_important: count(css, /!important/g),
  css_id_selectors: hits(css, /(^|[\s,}])#[a-zA-Z][\w-]*\s*[{,:]/g).slice(0, 30),
};

// 2. Unused setting keys
const settingsHtml = files.find((f) => f.rel === "config/settings.html").text;
const keys = [...new Set([...settingsHtml.matchAll(/name="([^"]+)"/g)].map((m) => m[1]))];
const code = [...liquid, ...js, ...css].map((f) => f.text).join("\n");
const dynamic = [...code.matchAll(/capture\s+\w+\s*-?%\}([^{%]*(?:\{\{[^}]*\}\}[^{%]*)+)\{%-?\s*endcapture/g)]
  .map((m) => m[1].trim())
  .filter((p) => /[a-z]/.test(p.replace(/\{\{[^}]*\}\}/g, "")))
  .map((p) => new RegExp(`^${p.split(/\{\{[^}]*\}\}/).map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join(".+")}$`));
const isUsed = (key) =>
  code.includes(`settings.${key}`) || code.includes(`settings['${key}']`) || code.includes(`settings["${key}"]`) ||
  code.includes(`'${key}'`) || code.includes(`"${key}"`) || dynamic.some((re) => re.test(key));
const unusedKeys = keys.filter((k) => !isUsed(k));

// 3. Unreferenced files
const referenced = (name) => {
  const base = name.replace(/\.liquid$/, "");
  return all.some((f) => f.name !== name && (f.text.includes(name) || f.text.includes(`'${base}'`) || f.text.includes(`"${base}"`)));
};
const settingsUploads = new Set(keys.filter((k) => /\.(png|jpg|jpeg|gif)$/.test(k)));
const unreferencedAssets = files.filter((f) => f.dir === "assets" && !settingsUploads.has(f.name) && !referenced(f.name)).map((f) => f.rel);
const unreferencedSnippets = files.filter((f) => f.dir === "snippets" && !referenced(f.name)).map((f) => f.rel);
const viewRefs = [...new Set([...code.matchAll(/view=([\w-]+)/g)].map((m) => m[1]))];
const altTemplates = files.filter((f) => f.dir === "templates" && /\.[\w-]+\.liquid$/.test(f.name.replace(/^[^.]+/, "")))
  .map((f) => ({ file: f.rel, suffix: f.name.replace(/\.liquid$/, "").split(".").slice(1).join("."), view_referenced: viewRefs.includes(f.name.replace(/\.liquid$/, "").split(".").slice(1).join(".")) }));

// 4. Risky patterns
const risky = {
  template_contains: hits(liquid, /template contains '[^']+'/g).length,
  dynamic_include: hits(liquid, /include\s+[a-z_][\w.]*\s/g).slice(0, 20),
  inner_html_writes: hits(js, /\.innerHTML\s*=|insertAdjacentHTML\(/g).slice(0, 30),
};

console.log(JSON.stringify({ rules, unused_setting_keys: { total_keys: keys.length, unused: unusedKeys }, unreferenced: { assets: unreferencedAssets, snippets: unreferencedSnippets, alt_templates: altTemplates }, risky }, null, 1));
