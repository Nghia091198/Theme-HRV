import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Read-only audit of form-control CSS: autofill handling, focus rules that drop the outline without a replacement,
// and controls whose font-size is below 16px (iOS zooms the page when such a field is focused).
const assets = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "FOX Fashion", "assets");
const CONTROL = /(input|textarea|select|__input|__field|__control|__note|__email|-search\b|search__input|\[type=)/i;
const report = { autofill_rules: [], focus_without_replacement: [], small_font_controls: [] };

for (const name of await readdir(assets)) {
  if (!/\.(css|scss\.liquid)$/.test(name) || /\.min\.|swiper|flatpickr/i.test(name)) continue;
  const css = (await readFile(path.join(assets, name), "utf8")).replace(/\/\*[\s\S]*?\*\//g, "");
  // flatten @media blocks enough for a rule scan: each "selector { body }" with no nested braces
  let mediaMax = null;
  const tokens = css.split(/(@media[^{]+\{|\}|\{|;)/);
  void tokens;
  for (const match of css.matchAll(/(@media[^{]*\{)?\s*([^{}@]+)\{([^{}]*)\}/g)) {
    const selector = match[2].trim().replace(/\s+/g, " ");
    const body = match[3];
    const before = css.slice(0, match.index);
    const lastMedia = before.lastIndexOf("@media");
    mediaMax = lastMedia >= 0 && before.slice(lastMedia).split("{").length - before.slice(lastMedia).split("}").length > 0
      ? before.slice(lastMedia, before.indexOf("{", lastMedia)).trim()
      : null;
    if (/-webkit-autofill/.test(selector)) report.autofill_rules.push({ file: name, selector: selector.slice(0, 120) });
    if (/:focus/.test(selector) && /outline\s*:\s*(none|0)\b/.test(body) && !/box-shadow|border(-color)?\s*:|outline\s*:\s*\d+px\s+solid/.test(body)) {
      report.focus_without_replacement.push({ file: name, selector: selector.slice(0, 120) });
    }
    const size = body.match(/font-size\s*:\s*([\d.]+)(px|rem)/);
    if (size && CONTROL.test(selector) && !/label|placeholder|::|btn|button|count|hint|status|error|help|title/i.test(selector)) {
      const px = size[2] === "rem" ? Number(size[1]) * 10 : Number(size[1]);
      if (px < 16) report.small_font_controls.push({ file: name, px, media: mediaMax, selector: selector.slice(0, 110) });
    }
  }
}
console.log(JSON.stringify(report, null, 1));
