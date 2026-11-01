const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const PAGE_URL = 'https://tyt-kid.myharavan.com/?themeid=1001492566';
const CHROME_EXECUTABLE = 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const OUTPUT_DIR = path.resolve(__dirname, '..', 'output');
const isHeaded = process.argv.includes('--headed');
const HEADED_SLOW_MO_MS = 400;
const HEADED_KEEP_OPEN_MS = 20000;

async function collectSectionState(page) {
  return page.evaluate(() => {
    const host = document.querySelector('fox-product-story');
    if (!host) return { found: false };
    const cards = [...host.querySelectorAll('[data-story-card]')].map((card) => ({
      index: card.dataset.storyIndex,
      poster: card.querySelector('.fox-product-story__media img')?.getAttribute('src') || null,
      video: card.querySelector('video')?.dataset.videoSrc || null,
      thumbs: [...card.querySelectorAll('[data-story-product-link]')].map((link) => ({
        handle: link.dataset.productHandle,
        hasImage: Boolean(link.querySelector('img')),
      })),
      size: { width: card.offsetWidth, height: card.offsetHeight },
    }));
    const products = [...host.querySelectorAll('[data-story-product]')].map((item) => ({
      slide: item.closest('[data-story-modal-slide]')?.dataset.storyIndex,
      handle: item.dataset.productHandle,
      state: item.dataset.state,
      hasProductCard: Boolean(item.querySelector('product-card')),
      title: item.querySelector('.pro--title')?.textContent.trim() || null,
    }));
    return {
      found: true,
      hostState: host.dataset.state,
      customElementDefined: Boolean(customElements.get('fox-product-story')),
      foxApi: {
        loadProductFragment: typeof window.FOX?.loadProductFragment,
        normalizeProductHandle: typeof window.FOX?.normalizeProductHandle,
      },
      cardCount: cards.length,
      modalSlideCount: host.querySelectorAll('[data-story-modal-slide]').length,
      cards,
      products,
    };
  });
}

async function probeFragments(page, handles) {
  return page.evaluate(async (list) => Promise.all(list.map(async (handle) => {
    try {
      const response = await fetch(`/products/${handle}?view=product-loop-data`, { credentials: 'same-origin' });
      const text = await response.text();
      return { handle, status: response.status, length: text.length, hasProductCard: text.includes('<product-card') };
    } catch (error) {
      return { handle, error: String(error) };
    }
  })), handles);
}

async function run() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  const browser = await chromium.launch({
    headless: !isHeaded,
    slowMo: isHeaded ? HEADED_SLOW_MO_MS : 0,
    executablePath: CHROME_EXECUTABLE,
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    const consoleMessages = [];
    const pageErrors = [];
    const fragmentRequests = [];
    page.on('console', (message) => {
      if (['warning', 'error'].includes(message.type())) consoleMessages.push(`[${message.type()}] ${message.text()}`);
    });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    page.on('response', (response) => {
      const url = response.url();
      if (url.includes('view=product-loop-data') || url.includes('product-story')) {
        fragmentRequests.push({ url, status: response.status() });
      }
    });

    await page.goto(PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForLoadState('load', { timeout: 60000 }).catch(() => {});
    const section = page.locator('.fox-product-story').first();
    if (await section.count()) {
      await section.scrollIntoViewIfNeeded();
      await page.waitForTimeout(4000);
      await section.screenshot({ path: path.join(OUTPUT_DIR, 'product-story-section.png') });
    } else {
      await page.screenshot({ path: path.join(OUTPUT_DIR, 'product-story-page.png'), fullPage: true });
    }

    const state = await collectSectionState(page);
    const handles = state.found ? [...new Set(state.products.map((item) => item.handle))] : [];
    const fragments = await probeFragments(page, handles);
    const serverMarkup = await page.evaluate(async (url) => {
      const html = await (await fetch(url, { credentials: 'same-origin' })).text();
      const sliderStart = html.indexOf('fox-product-story__slider');
      const modalStart = html.indexOf('data-story-modal-slider');
      return {
        slider: sliderStart < 0 ? null : html.slice(sliderStart, sliderStart + 1500),
        modal: modalStart < 0 ? null : html.slice(modalStart, modalStart + 1500),
      };
    }, PAGE_URL);
    const deployedAssets = await page.evaluate(async () => Promise.all(
      [...document.querySelectorAll('script[src*="product-story.js"], link[href*="product-story.css"]')]
        .map(async (node) => {
          const url = node.src || node.href;
          return { url, text: await (await fetch(url)).text() };
        }),
    ));
    const assetComparison = deployedAssets.map(({ url, text }) => {
      const fileName = new URL(url, PAGE_URL).pathname.split('/').pop();
      const localText = fs.readFileSync(path.resolve(__dirname, '..', 'FOX Fashion', 'assets', fileName), 'utf8');
      const normalize = (value) => value.replace(/\r\n/g, '\n').trim();
      return { fileName, deployedLength: text.length, localLength: localText.length, identical: normalize(text) === normalize(localText) };
    });

    console.log(JSON.stringify({ url: page.url(), state, fragments, fragmentRequests, consoleMessages, pageErrors, serverMarkup, assetComparison }, null, 2));

    if (isHeaded) {
      await page.addStyleTag({ content: '.fox-product-story .swiper-slide { outline: 2px dashed red; min-height: 120px; }' });
      await page.locator('.fox-product-story').first().scrollIntoViewIfNeeded().catch(() => {});
      await page.waitForTimeout(HEADED_KEEP_OPEN_MS);
    }
  } finally {
    await browser.close();
  }
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
