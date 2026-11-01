(() => {
  const root = window.FOX = window.FOX || {};
  const CACHE_PREFIX = 'fox-size-guide:';
  const CACHE_TTL_MS = 30 * 60 * 1000;
  const SYSTEM_STORAGE_KEY = 'fox-size-guide-system';
  const PAGE_VIEW = 'size-guide-data'; 
  const INPUT_DELAY = 150;
  const stylesheetRequests = new Map();

  /* ---------- Pure data helpers (exposed as FOX.sizeGuide for reuse/tests) ---------- */

  function FOXNormalizeKey(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function FOXHandleize(value) {
    return FOXNormalizeKey(value).replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  }

  function FOXParseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quoted = false;
    const source = String(text || '').replace(/^\uFEFF/, '');

    for (let index = 0; index < source.length; index += 1) {
      const char = source[index];
      if (quoted) {
        if (char === '"' && source[index + 1] === '"') {
          cell += '"';
          index += 1;
        } else if (char === '"') {
          quoted = false;
        } else {
          cell += char;
        }
      } else if (char === '"') {
        quoted = true;
      } else if (char === ',') {
        row.push(cell);
        cell = '';
      } else if (char === '\n' || char === '\r') {
        if (char === '\r' && source[index + 1] === '\n') index += 1;
        row.push(cell);
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += char;
      }
    }
    if (cell !== '' || row.length) {
      row.push(cell);
      rows.push(row);
    }
    return rows;
  }

  function FOXParseRange(value) {
    const text = String(value || '').trim().replace(/(\d),(\d)/g, '$1.$2');
    if (!text) return null;
    const range = text.match(/(\d+(?:\.\d+)?)\s*(?:-|–|—|~)\s*(\d+(?:\.\d+)?)/);
    if (range) {
      const first = Number(range[1]);
      const second = Number(range[2]);
      return { min: Math.min(first, second), max: Math.max(first, second) };
    }
    const single = text.match(/\d+(?:\.\d+)?/);
    return single ? { min: Number(single[0]), max: Number(single[0]) } : null;
  }

  function FOXIsSizeHeader(key) {
    return key.startsWith('size') || key.startsWith('kich thuoc');
  }

  function FOXSystemLabel(label, key) {
    const prefixLength = key.startsWith('size') ? 4 : 10;
    // A bare "Size" column keeps its own header as the chip label.
    return label.slice(prefixLength).trim() || label;
  }

  // Sheet layout: "Loại | <name>" opens a category, optional "Mã | <code>", then a header row whose
  // first cell starts with "Size". Columns named "Size…" are size systems; other columns are measurements.
  function FOXBuildCategories(rows) {
    const categories = [];
    let current = null;

    rows.forEach((cells) => {
      const first = String(cells[0] || '').trim();
      if (!first) return;
      const key = FOXNormalizeKey(first);

      if (key === 'loai') {
        const name = String(cells[1] || '').trim();
        current = name ? { name, code: FOXHandleize(name), systems: [], metrics: [], rows: [], hasHeader: false } : null;
        if (current) categories.push(current);
        return;
      }
      if (!current) return;

      if (key === 'ma') {
        const code = FOXHandleize(cells[1]);
        if (code) current.code = code;
        return;
      }

      if (FOXIsSizeHeader(key)) {
        current.systems = [];
        current.metrics = [];
        cells.forEach((cell, index) => {
          const label = String(cell || '').trim();
          if (!label) return;
          const cellKey = FOXNormalizeKey(label);
          if (FOXIsSizeHeader(cellKey)) {
            current.systems.push({ index, label: FOXSystemLabel(label, cellKey) });
          } else {
            current.metrics.push({ index, label });
          }
        });
        current.hasHeader = true;
        return;
      }

      if (!current.hasHeader) return;
      const sizes = current.systems.map((system) => String(cells[system.index] || '').trim());
      if (!sizes[0]) return;
      current.rows.push({ sizes, ranges: current.metrics.map((metric) => FOXParseRange(cells[metric.index])) });
    });

    return categories
      .filter((category) => category.hasHeader && category.rows.length && category.metrics.length)
      .map((category) => {
        category.metrics.forEach((metric, metricIndex) => {
          const ranges = category.rows.map((row) => row.ranges[metricIndex]).filter(Boolean);
          metric.min = ranges.length ? Math.min(...ranges.map((range) => range.min)) : null;
          metric.max = ranges.length ? Math.max(...ranges.map((range) => range.max)) : null;
          metric.span = metric.min === null ? 1 : (metric.max - metric.min) || 1;
        });
        return category;
      });
  }

  // values: one number (or null when empty) per category metric.
  function FOXRecommendSize(category, values) {
    const usedIndexes = values.map((value, index) => (value === null ? null : index)).filter((index) => index !== null);
    if (!category || !usedIndexes.length) return null;

    const scored = category.rows.map((row) => {
      let score = 0;
      let missing = 0;
      usedIndexes.forEach((index) => {
        const range = row.ranges[index];
        if (!range) {
          missing += 1;
          return;
        }
        const value = values[index];
        const span = category.metrics[index].span;
        if (value < range.min) score += (range.min - value) / span;
        else if (value > range.max) score += (value - range.max) / span;
      });
      return { row, score, missing };
    }).filter((item) => item.missing < usedIndexes.length);

    if (!scored.length) return null;
    const bestScore = Math.min(...scored.map((item) => item.score));
    const winners = scored.filter((item) => item.score === bestScore);
    // Overlapping ranges: recommend the larger size and mention the smaller one.
    const pick = winners[winners.length - 1];
    const between = winners.length > 1 ? winners[0].row : null;
    return { row: pick.row, exact: bestScore === 0, between };
  }

  function FOXResolveSheetCsvUrl(url) {
    if (!url) return '';
    try {
      const parsed = new URL(url, window.location.href);
      if (parsed.hostname !== 'docs.google.com') return parsed.href;
      if (parsed.pathname.endsWith('/pubhtml')) {
        parsed.pathname = parsed.pathname.replace(/\/pubhtml$/, '/pub');
        parsed.searchParams.set('output', 'csv');
        return parsed.href;
      }
      if (parsed.pathname.endsWith('/pub')) {
        parsed.searchParams.set('output', 'csv');
        return parsed.href;
      }
      const sheet = parsed.pathname.match(/\/spreadsheets\/d\/([^/]+)/);
      if (sheet && sheet[1] !== 'e') {
        const gid = parsed.searchParams.get('gid') || (parsed.hash.match(/gid=(\d+)/) || [])[1] || '0';
        return `https://docs.google.com/spreadsheets/d/${sheet[1]}/export?format=csv&gid=${gid}`;
      }
      return parsed.href;
    } catch (error) {
      return '';
    }
  }

  root.sizeGuide = Object.assign(root.sizeGuide || {}, {
    parseCsv: FOXParseCsv,
    buildCategories: FOXBuildCategories,
    recommend: FOXRecommendSize,
    resolveSheetUrl: FOXResolveSheetCsvUrl,
    handleize: FOXHandleize,
  });

  /* ---------- Browser helpers ---------- */

  // The modal skin is only needed after a trigger is used, so it stays out of the critical CSS.
  function FOXLoadSizeGuideStylesheet(url) {
    if (!url) return Promise.resolve();
    if (stylesheetRequests.has(url)) return stylesheetRequests.get(url);
    const request = new Promise((resolve, reject) => {
      const link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      link.dataset.foxStylesheet = 'size-guide';
      link.addEventListener('load', () => resolve(link), { once: true });
      link.addEventListener('error', () => {
        link.remove();
        stylesheetRequests.delete(url);
        reject(new Error('stylesheet-error'));
      }, { once: true });
      document.head.appendChild(link);
    });
    stylesheetRequests.set(url, request);
    return request;
  }

  function FOXReadCache(key) {
    try {
      const cached = JSON.parse(window.sessionStorage.getItem(CACHE_PREFIX + key) || 'null');
      return cached && Date.now() - cached.savedAt < CACHE_TTL_MS ? cached.value : null;
    } catch (error) {
      return null;
    }
  }

  function FOXWriteCache(key, value) {
    try {
      window.sessionStorage.setItem(CACHE_PREFIX + key, JSON.stringify({ savedAt: Date.now(), value }));
    } catch (error) {
      // Storage blocked: data is simply fetched again next time.
    }
  }

  async function FOXFetchText(url, cacheKey) {
    const cached = FOXReadCache(cacheKey);
    if (cached !== null) return cached;
    const response = await fetch(url, { credentials: url.startsWith('/') ? 'same-origin' : 'omit' });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const text = await response.text();
    FOXWriteCache(cacheKey, text);
    return text;
  }

  function FOXReadStoredSystem() {
    try {
      return window.localStorage.getItem(SYSTEM_STORAGE_KEY) || '';
    } catch (error) {
      return '';
    }
  }

  function FOXStoreSystem(label) {
    try {
      window.localStorage.setItem(SYSTEM_STORAGE_KEY, label);
    } catch (error) {
      // Preference is optional.
    }
  }

  function FOXFormatNumber(value) {
    return Number.isInteger(value) ? String(value) : String(value).replace('.', ',');
  }

  /* ---------- Component ---------- */

  class SizeGuide extends HTMLElement {
    #abortController = null;
    #modal = null;
    #categories = [];
    #category = null;
    #systemIndex = 0;
    #currentSize = '';
    #requestedCode = '';
    #tableLoaded = false;
    #tableSections = [];
    #tableCode = '';
    #finderLoaded = false;
    #inputTimer = 0;

    connectedCallback() {
      if (this.#abortController) return;
      // Modal mode: opened by [data-size-guide-open]. Inline mode (size guide page): no modal, loads at once.
      this.#modal = this.querySelector('modal-component');

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      if (this.#modal) document.addEventListener('click', (event) => this.#handleTrigger(event), { signal });
      this.querySelector('[data-role="table-category"]')?.addEventListener('change', (event) => this.#renderTableSection(event.target.value), { signal });
      this.querySelector('[data-role="category"]')?.addEventListener('change', (event) => this.#selectCategory(event.target.value), { signal });
      this.querySelector('[data-role="fields"]')?.addEventListener('input', () => this.#queueUpdate(), { signal });
      this.querySelector('[data-role="systems"]')?.addEventListener('click', (event) => this.#handleSystem(event), { signal });
      this.querySelector('[data-role="finder-form"]')?.addEventListener('submit', (event) => event.preventDefault(), { signal });
      this.dataset.state = 'ready';

      if (!this.#modal) {
        this.#requestedCode = new URLSearchParams(window.location.search).get('type') || '';
        this.#loadTable();
        this.#loadFinder();
      }
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      window.clearTimeout(this.#inputTimer);
      this.dataset.state = 'idle';
    }

    async open({ trigger = null, code = '', currentSize = '' } = {}) {
      this.#requestedCode = code;
      this.#currentSize = currentSize;
      try {
        await FOXLoadSizeGuideStylesheet(this.dataset.stylesheet);
      } catch (error) {
        this.#emit('size-guide:error', { source: 'stylesheet', message: error.message });
      }
      this.#emit('size-guide:open', { code, currentSize });
      await this.#modal.open(trigger);
      this.#loadTable();
      this.#loadFinder();
    }

    close() {
      return this.#modal?.close('api');
    }

    #handleTrigger(event) {
      const trigger = event.target.closest('[data-size-guide-open]');
      if (!trigger) return;
      event.preventDefault();
      const scope = trigger.closest('product-component') || document.querySelector('product-component[data-context="page"]');
      const sizeOption = scope?.querySelector('[data-size-guide-option]');
      this.open({
        trigger,
        code: trigger.dataset.sizeGuideCode || sizeOption?.dataset.sizeGuideCode || '',
        currentSize: sizeOption?.querySelector('.fox-product__swatch.is-active')?.dataset.optionValue || '',
      });
    }

    /* Table tab: page content split into sections (templates/page.size-guide-data.liquid). */
    async #loadTable() {
      const content = this.querySelector('[data-role="table-content"]');
      const status = this.querySelector('[data-role="table-status"]');
      if (!content || !this.dataset.pageUrl) return;

      if (!this.#tableLoaded) {
        try {
          const url = new URL(this.dataset.pageUrl, window.location.origin);
          url.searchParams.set('view', PAGE_VIEW);
          const html = await FOXFetchText(url.pathname + url.search, `page-sections-v2:${url.pathname}`);
          const doc = new DOMParser().parseFromString(html, 'text/html');
          this.#tableSections = Array.from(doc.querySelectorAll('template[data-size-guide-section]')).map((template) => {
            template.content.querySelectorAll('script, style, link').forEach((node) => node.remove());
            return {
              title: template.dataset.title || '',
              code: template.dataset.code || FOXHandleize(template.dataset.title),
              content: template.content,
            };
          });
          if (!this.#tableSections.length) throw new Error('empty-page');
          this.#renderTablePicker();
          this.#tableLoaded = true;
          content.hidden = false;
          if (status) status.hidden = true;
        } catch (error) {
          if (status) {
            status.textContent = error.message === 'empty-page'
              ? 'Chưa có bảng size.'
              : 'Không tải được bảng size. Vui lòng thử lại sau.';
          }
          this.#emit('size-guide:error', { source: 'page', message: error.message });
          return;
        }
      }

      const requested = this.#tableSections.find((section) => section.code === FOXHandleize(this.#requestedCode));
      if (requested) this.#renderTableSection(requested.code);
      else if (!this.#tableCode) this.#renderTableSection(this.#tableSections[0].code);
      else this.#highlightCurrentRow(content);
    }

    #renderTablePicker() {
      const picker = this.querySelector('[data-role="table-picker"]');
      const select = this.querySelector('[data-role="table-category"]');
      if (!picker || !select) return;
      picker.hidden = this.#tableSections.length < 2;
      select.replaceChildren(...this.#tableSections.map((section) => new Option(section.title, section.code)));
    }

    #renderTableSection(code) {
      const content = this.querySelector('[data-role="table-content"]');
      const section = this.#tableSections.find((item) => item.code === code);
      if (!content || !section) return;

      content.replaceChildren(document.importNode(section.content, true));
      content.querySelectorAll('table').forEach((table) => {
        const wrapper = document.createElement('div');
        wrapper.className = 'fox-size-guide__table-scroll';
        table.replaceWith(wrapper);
        wrapper.append(table);
      });
      this.#tableCode = section.code;
      const select = this.querySelector('[data-role="table-category"]');
      if (select) select.value = section.code;
      this.#highlightCurrentRow(content);
      this.#emit('size-guide:table', { code: section.code, title: section.title });
    }

    #highlightCurrentRow(content) {
      const current = FOXHandleize(this.#currentSize);
      content.querySelectorAll('tr').forEach((row) => {
        const firstCell = row.querySelector('th, td');
        const match = Boolean(current) && FOXHandleize(firstCell?.textContent) === current;
        row.classList.toggle('is-current', match);
        if (match) row.setAttribute('aria-current', 'true');
        else row.removeAttribute('aria-current');
      });
    }

    /* Finder tab: published Google Sheet (CSV). */
    async #loadFinder() {
      const form = this.querySelector('[data-role="finder-form"]');
      const status = this.querySelector('[data-role="finder-status"]');
      if (!form) return;

      if (!this.#finderLoaded) {
        const url = FOXResolveSheetCsvUrl(this.dataset.sheetUrl);
        try {
          if (!url) throw new Error('invalid-url');
          const csv = await FOXFetchText(url, `sheet:${url}`);
          this.#categories = FOXBuildCategories(FOXParseCsv(csv));
          if (!this.#categories.length) throw new Error('empty-sheet');
          this.#renderCategoryOptions();
          this.#finderLoaded = true;
          form.hidden = false;
          if (status) status.hidden = true;
        } catch (error) {
          if (status) {
            status.textContent = error.message === 'empty-sheet'
              ? 'Chưa có dữ liệu size phù hợp.'
              : 'Không tải được dữ liệu size. Vui lòng thử lại sau.';
          }
          this.#emit('size-guide:error', { source: 'sheet', message: error.message });
          return;
        }
      }

      const requested = this.#categories.find((category) => category.code === FOXHandleize(this.#requestedCode));
      if (requested) this.#selectCategory(requested.code);
      else if (!this.#category) this.#selectCategory(this.#categories[0].code);
    }

    #renderCategoryOptions() {
      const select = this.querySelector('[data-role="category"]');
      if (!select) return;
      select.replaceChildren(...this.#categories.map((category) => new Option(category.name, category.code)));
    }

    #selectCategory(code) {
      const category = this.#categories.find((item) => item.code === code);
      if (!category) return;
      this.#category = category;
      const select = this.querySelector('[data-role="category"]');
      if (select) select.value = category.code;

      const storedSystem = FOXReadStoredSystem();
      const storedIndex = category.systems.findIndex((system) => system.label === storedSystem);
      this.#systemIndex = storedIndex > -1 ? storedIndex : 0;
      this.#renderFields();
      this.#renderSystems();
      this.#updateResult();
    }

    #renderFields() {
      const container = this.querySelector('[data-role="fields"]');
      const template = this.querySelector('template[data-role="field-template"]');
      if (!container || !template) return;

      const fields = this.#category.metrics.map((metric, index) => {
        const fragment = template.content.cloneNode(true);
        const label = fragment.querySelector('[data-role="field-label"]');
        const input = fragment.querySelector('[data-role="field-input"]');
        const id = `${this.dataset.idPrefix || 'fox-size-guide'}-field-${index}`;
        label.textContent = metric.label;
        label.htmlFor = id;
        input.id = id;
        input.dataset.metricIndex = String(index);
        if (metric.min !== null) {
          input.placeholder = metric.min === metric.max
            ? `Ví dụ: ${FOXFormatNumber(metric.min)}`
            : `Ví dụ: ${FOXFormatNumber(metric.min)} – ${FOXFormatNumber(metric.max)}`;
        }
        return fragment;
      });
      container.replaceChildren(...fields);
    }

    #renderSystems() {
      const container = this.querySelector('[data-role="systems"]');
      const template = this.querySelector('template[data-role="system-template"]');
      if (!container || !template) return;

      const systems = this.#category.systems;
      container.hidden = systems.length < 2;
      if (systems.length < 2) {
        container.replaceChildren();
        return;
      }
      container.replaceChildren(...systems.map((system, index) => {
        const button = template.content.firstElementChild.cloneNode(true);
        button.textContent = system.label || `Hệ ${index + 1}`;
        button.dataset.systemIndex = String(index);
        button.setAttribute('aria-checked', index === this.#systemIndex ? 'true' : 'false');
        return button;
      }));
    }

    #handleSystem(event) {
      const button = event.target.closest('[data-role="system"]');
      if (!button) return;
      this.#systemIndex = Number(button.dataset.systemIndex) || 0;
      FOXStoreSystem(this.#category.systems[this.#systemIndex]?.label || '');
      this.querySelectorAll('[data-role="system"]').forEach((item) => {
        item.setAttribute('aria-checked', item === button ? 'true' : 'false');
      });
      this.#updateResult();
    }

    #queueUpdate() {
      window.clearTimeout(this.#inputTimer);
      this.#inputTimer = window.setTimeout(() => this.#updateResult(), INPUT_DELAY);
    }

    #updateResult() {
      if (!this.#category) return;
      const values = this.#category.metrics.map((metric, index) => {
        const input = this.querySelector(`[data-role="field-input"][data-metric-index="${index}"]`);
        const raw = String(input?.value || '').trim().replace(',', '.');
        const value = raw === '' ? null : Number(raw);
        return Number.isFinite(value) ? value : null;
      });

      const recommendation = FOXRecommendSize(this.#category, values);
      const result = this.querySelector('[data-role="result"]');
      const empty = this.querySelector('[data-role="result-empty"]');
      if (!result) return;

      result.hidden = !recommendation;
      if (empty) empty.hidden = Boolean(recommendation);
      if (!recommendation) return;

      const systems = this.#category.systems;
      const systemIndex = Math.min(this.#systemIndex, systems.length - 1);
      const size = recommendation.row.sizes[systemIndex] || recommendation.row.sizes[0];
      this.querySelector('[data-role="result-label"]').textContent = recommendation.exact ? 'Size phù hợp' : 'Size gần nhất';
      this.querySelector('[data-role="result-size"]').textContent = size;
      this.querySelector('[data-role="result-system"]').textContent = systems.length > 1 ? systems[systemIndex].label : '';

      const alt = this.querySelector('[data-role="result-alt"]');
      const others = systems
        .map((system, index) => ({ label: system.label, value: recommendation.row.sizes[index] }))
        .filter((item, index) => index !== systemIndex && item.value);
      alt.hidden = !others.length;
      alt.textContent = others.map((item) => `${item.label} ${item.value}`.trim()).join(' · ');

      const hint = this.querySelector('[data-role="result-hint"]');
      let hintText = '';
      if (recommendation.between) {
        const smaller = recommendation.between.sizes[systemIndex] || recommendation.between.sizes[0];
        hintText = `Bạn nằm giữa ${smaller} và ${size}. Chọn ${smaller} nếu thích mặc ôm hơn.`;
      } else if (!recommendation.exact) {
        hintText = 'Số đo nằm ngoài bảng size, đây là size gần nhất.';
      }
      hint.hidden = !hintText;
      hint.textContent = hintText;

      this.#emit('size-guide:result', { category: this.#category.code, size, exact: recommendation.exact });
    }

    #emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
    }
  }

  if (!customElements.get('size-guide')) {
    customElements.define('size-guide', SizeGuide);
  }
})();
