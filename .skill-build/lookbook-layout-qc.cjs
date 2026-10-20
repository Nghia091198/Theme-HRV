const fs = require('node:fs');
const assert = require('node:assert/strict');
const { chromium } = require('C:/Users/admin/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root = 'D:/Theme by claude/FOX Fashion/';
const source = fs.readFileSync(root + 'snippets/theme-home-lookbook.liquid', 'utf8');
const photo = 'data:image/jpeg;base64,' + fs.readFileSync(root + 'assets/iwto_1_image.jpg').toString('base64');
const css = fs.readFileSync(root + 'assets/fox-lookbook.css', 'utf8');
const panelTemplate = source.split('{%- capture lookbook_panel -%}')[1].split('{%- endcapture -%}')[0];
function panel(i) {
  return panelTemplate.replaceAll('{{ look_index }}', i)
    .replaceAll('{{ look_index | minus: 1 }}', i - 1)
    .replace('{% unless look_active %} hidden{% endunless %}', i === 1 ? '' : ' hidden')
    .replace(/\{\{ look_image \| asset_url \}\}/g, photo)
    .replace(/\{\{ lookbook_title \| escape \}\}/g, 'Khám phá phong cách của bạn')
    .replace(/\{\{ settings.fox_lookbook_eyebrow \| escape \}\}/g, 'Mua theo bộ')
    .replace(/\{\{ lookbook_slides \}\}/g, '<div class="product-loop"><div class="product-inner"><img style="width:100%;border-radius:14px" src="' + photo + '"><div class="proloop--detail"><h3>Áo chạy bộ thoáng khí</h3><p>490.000đ</p></div></div></div>')
    .replace(/\{%[\s\S]*?%\}/g, '').replace(/\{\{[\s\S]*?\}\}/g, '');
}
const tabs = [1, 2].map(i => `<button class="fox-lookbook__tab" role="tab" id="fox-lookbook-tab-${i}" aria-controls="fox-lookbook-panel-${i}" aria-selected="${i === 1}"><img src="${photo}" alt="Look ${i}"></button>`).join('');
(async () => {
  const browser = await chromium.launch({headless:true, executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
  try {
    const page = await browser.newPage();
    const errors = [];
    page.on('pageerror', e => errors.push(e.message));
    await page.setContent(`<style>*{box-sizing:border-box}body{margin:0;font-family:sans-serif;color:#1b2631}.container{width:94%;margin:auto}slider-component{display:block}${css}</style><section class="fox-lookbook"><div class="container"><fox-lookbook><div class="fox-lookbook__layout"><div class="fox-lookbook__tabs" role="tablist">${tabs}</div><div class="fox-lookbook__panels">${panel(1)}${panel(2)}</div></div></fox-lookbook></div></section>`);
    await page.addScriptTag({path:root+'assets/fox-lookbook.js'});
    for (const width of [1440, 1024, 768, 390, 320]) {
      await page.setViewportSize({width,height:1100});
      const r = await page.evaluate(() => {
        const p = document.querySelector('[role=tabpanel]:not([hidden])');
        const box = s => {const r=p.querySelector(s).getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,bottom:r.bottom}};
        return {media:box('.fox-lookbook__media'),header:box('.fox-lookbook__header'),sidebar:box('.fox-lookbook__sidebar'),products:box('.fox-lookbook__products'),overflow:document.documentElement.scrollWidth>innerWidth};
      });
      assert.equal(r.overflow,false,`Overflow at ${width}`);
      if(width>991){assert.ok(Math.abs(r.media.y-r.header.y)<1);assert.ok(r.sidebar.width<=400);assert.ok(r.header.x>r.media.x);}
      else {assert.ok(r.header.bottom<=r.media.y);assert.ok(r.products.y>=r.media.bottom);}
      console.log(width, JSON.stringify(r));
      if(width===1440 || width===390) await page.screenshot({path:`D:/Theme by claude/.skill-build/lookbook-layout-${width===1440?'desktop':'mobile'}.png`,fullPage:true});
    }
    await page.locator('[role=tab]').first().focus();
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.locator('#fox-lookbook-panel-2').isVisible(),true);
    await page.keyboard.press('Home');
    assert.equal(await page.locator('#fox-lookbook-panel-1').isVisible(),true);
    await page.locator('#fox-lookbook-tab-2').click();
    assert.equal(await page.locator('#fox-lookbook-panel-2').isVisible(),true);
    assert.deepEqual(errors,[]);
    JSON.parse(fs.readFileSync(root+'config/settings_data.json','utf8'));
    console.log('PASS layout, JSON, keyboard, mouse tabs, no runtime errors; product content is a fixture.');
  } finally {await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1});
