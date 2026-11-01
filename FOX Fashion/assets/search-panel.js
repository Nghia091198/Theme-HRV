(() => {
  const RECENT_KEY = 'fox-search-recent';
  const RECENT_LIMIT = 6;
  const OPEN_CLASS = 'fox-search-open';
  const CLOSE_MS = 320;
  const FLOAT_GAP = 10;

  function FOXSearchNormalize(value) {
    return String(value || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/đ/g, 'd').replace(/\s+/g, ' ').trim();
  }

  function FOXSearchReadRecent() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(RECENT_KEY) || '[]');
      return Array.isArray(stored) ? stored.filter((term) => typeof term === 'string' && term.trim()) : [];
    } catch (error) {
      return [];
    }
  }

  function FOXSearchWriteRecent(terms) {
    try {
      window.localStorage.setItem(RECENT_KEY, JSON.stringify(terms));
    } catch (error) {
      // Storage blocked (private mode): recent searches only live for this page view.
    }
  }

  // Wrap every diacritic-insensitive match of the query in <mark>, on text nodes only.
  function FOXSearchHighlight(root, query) {
    const needle = FOXSearchNormalize(query);
    if (!needle) return;
    root.querySelectorAll('[data-role="highlight"], .pro--title a').forEach((element) => {
      const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
      const nodes = [];
      while (walker.nextNode()) nodes.push(walker.currentNode);
      nodes.forEach((node) => {
        const text = node.nodeValue;
        const folded = [...text].map((char) => FOXSearchNormalize(char) || ' ').join('');
        const index = folded.indexOf(needle);
        if (index < 0 || folded.length !== text.length) return;
        const mark = document.createElement('mark');
        mark.textContent = text.slice(index, index + needle.length);
        const after = node.splitText(index);
        after.nodeValue = after.nodeValue.slice(needle.length);
        node.parentNode.insertBefore(mark, after);
      });
    });
  }

  // Shared with the search page (search-page.js): one fetch / highlight / recent-search implementation.
  async function FOXSearchFetchView(query, type, view, signal) {
    const url = `/search?q=${encodeURIComponent(query)}&type=${type}&view=${view}`;
    const response = await fetch(url, { signal, credentials: 'same-origin', headers: { Accept: 'text/html' } });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
    const node = doc.querySelector('[data-role="smart-result"]');
    if (!node) throw new Error('missing-result');
    return { html: node.innerHTML, total: parseInt(node.dataset.total, 10) || 0 };
  }

  // Callers decide when a search counts (it returned results); duplicates ignore case and accents.
  function FOXSearchRemember(query, limit = RECENT_LIMIT) {
    const term = String(query || '').replace(/\s+/g, ' ').trim();
    if (term.length < 2) return;
    const key = FOXSearchNormalize(term);
    FOXSearchWriteRecent([term, ...FOXSearchReadRecent().filter((item) => FOXSearchNormalize(item) !== key)].slice(0, limit));
  }

  window.FOX = window.FOX || {};
  window.FOX.search = {
    normalize: FOXSearchNormalize,
    highlight: FOXSearchHighlight,
    fetchView: FOXSearchFetchView,
    remember: FOXSearchRemember,
    readRecent: FOXSearchReadRecent,
  };

  // Search panel (snippets/mini-search.liquid): drops under the header, live results while typing (debounced).
  class SearchPanel extends HTMLElement {
    #abortController = null;
    #requestController = null;
    #debounceTimer = 0;
    #closeTimer = 0;
    #cache = new Map();
    #lastQuery = '';
    #lastTotal = 0;
    #returnFocus = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      const input = this.#input();

      document.addEventListener('click', (event) => {
        const trigger = event.target.closest('.js-open-search');
        if (!trigger) return;
        event.preventDefault();
        if (this.dataset.state === 'open') this.close();
        else this.open(trigger);
      }, { signal });
      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.dataset.state === 'open') this.close();
      }, { signal });
      window.addEventListener('resize', () => {
        if (this.dataset.state === 'open') this.#place();
      }, { signal, passive: true });
      // Another overlay (cart, account…) taking over closes the search panel.
      document.addEventListener('overlay:show', (event) => {
        if (this.dataset.state === 'open' && event.detail?.owner !== this) this.close({ releaseOverlay: false });
      }, { signal });

      input?.addEventListener('input', () => this.#onInput(), { signal });
      this.querySelector('[data-role="form"]')?.addEventListener('submit', (event) => this.#onSubmit(event), { signal });
      this.addEventListener('click', (event) => this.#onClick(event), { signal });
      this.addEventListener('keydown', (event) => this.#onTabKey(event), { signal });
      this.#renderRecent();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#requestController?.abort();
      window.clearTimeout(this.#debounceTimer);
      window.clearTimeout(this.#closeTimer);
    }

    open(trigger) {
      if (this.dataset.state === 'open') return;
      window.clearTimeout(this.#closeTimer);
      this.#returnFocus = trigger || document.activeElement;
      this.hidden = false;
      this.#renderRecent();
      this.#lockPage(true);
      this.#place();
      window.requestAnimationFrame(() => {
        this.dataset.state = 'open';
        this.#input()?.focus({ preventScroll: true });
      });
      document.querySelectorAll('.js-open-search').forEach((button) => button.setAttribute('aria-expanded', 'true'));
    }

    // Under the header. Home header on desktop is a floating pill (.fox-header__inner): the panel floats too,
    // same left/right edges, 10px below it and 10px above the screen bottom (data-floating, search-panel.css).
    // Measured after the scroll lock, which changes the viewport width.
    #place() {
      const home = document.querySelector('.fox-header--home');
      const pill = home?.querySelector('.fox-header__inner');
      const floating = Boolean(pill) && window.matchMedia('(min-width: 992px)').matches;
      if (floating) {
        const rect = pill.getBoundingClientRect();
        this.style.setProperty('--fox-search-top', `${Math.round(rect.bottom + FLOAT_GAP)}px`);
        this.style.setProperty('--fox-search-left', `${Math.round(rect.left)}px`);
        this.style.setProperty('--fox-search-right', `${Math.round(window.innerWidth - rect.right)}px`);
        this.dataset.floating = 'true';
        return;
      }
      const header = document.querySelector('.fox-header__bar');
      const top = header ? Math.max(0, header.getBoundingClientRect().bottom) : 0;
      this.style.setProperty('--fox-search-top', `${Math.round(top)}px`);
      delete this.dataset.floating;
    }

    // releaseOverlay: false when another overlay already took the page lock over.
    close({ releaseOverlay = true } = {}) {
      if (this.dataset.state !== 'open') return;
      this.dataset.state = 'closing';
      document.querySelectorAll('.js-open-search').forEach((button) => button.setAttribute('aria-expanded', 'false'));
      const finish = () => {
        this.hidden = true;
        this.dataset.state = 'closed';
        if (releaseOverlay) {
          this.#lockPage(false);
          this.#returnFocus?.focus?.({ preventScroll: true });
        }
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
      else this.#closeTimer = window.setTimeout(finish, CLOSE_MS);
    }

    // Shared overlay service (core-foundation-overlay.js): scroll lock and the scrollbar-gutter handling.
    #lockPage(locked) {
      if (typeof window.FOX?.isOverlay === 'function') {
        window.FOX.isOverlay(locked, this, { lock: true });
        return;
      }
      document.documentElement.classList.toggle(OPEN_CLASS, locked);
    }

    #input() {
      return this.querySelector('[data-role="input"]');
    }

    #onInput() {
      const query = this.#input().value.trim();
      this.querySelector('[data-action="clear"]').hidden = !query;
      window.clearTimeout(this.#debounceTimer);
      if (query.length < (parseInt(this.dataset.minChars, 10) || 2)) {
        this.#requestController?.abort();
        this.#showInitial();
        return;
      }
      this.#debounceTimer = window.setTimeout(() => this.#search(query), parseInt(this.dataset.debounce, 10) || 300);
    }

    async #search(query) {
      const key = FOXSearchNormalize(query);
      this.#requestController?.abort();
      if (this.#cache.has(key)) {
        this.#render(query, this.#cache.get(key));
        return;
      }
      const controller = new AbortController();
      this.#requestController = controller;
      this.dataset.loading = 'true';
      this.#status('Đang tìm…');
      try {
        const views = [FOXSearchFetchView(query, 'product', 'smart-product', controller.signal)];
        if (this.dataset.articles === 'true') views.push(FOXSearchFetchView(query, 'article', 'smart-article', controller.signal));
        const [product, article = null] = await Promise.all(views);
        const result = { product, article };
        this.#cache.set(key, result);
        if (this.#requestController !== controller) return;
        this.#render(query, result);
      } catch (error) {
        if (error.name === 'AbortError') return;
        this.#status('Không tải được kết quả, hãy thử lại.');
        console.warn('[SearchPanel] Search request failed.', error.message);
      } finally {
        if (this.#requestController === controller) {
          this.#requestController = null;
          delete this.dataset.loading;
        }
      }
    }

    #render(query, result) {
      if (FOXSearchNormalize(this.#input().value) !== FOXSearchNormalize(query)) return;
      const productTotal = result.product?.total || 0;
      const articleTotal = result.article?.total || 0;
      this.#lastQuery = query;
      this.#lastTotal = productTotal + articleTotal;
      this.#status('');

      if (!this.#lastTotal) {
        this.querySelector('[data-role="empty-query"]').textContent = query;
        this.#setView('empty');
        this.#renderSuggest([]);
        this.#status(`Không có kết quả cho ${query}.`);
        return;
      }

      const productPanel = this.querySelector('[data-panel="product"]');
      const articlePanel = this.querySelector('[data-panel="article"]');
      productPanel.innerHTML = result.product?.html || '';
      if (articlePanel) articlePanel.innerHTML = result.article?.html || '';
      const suggestions = [...productPanel.querySelectorAll('[data-role="smart-suggest"] a')];
      this.#renderSuggest(suggestions);
      productPanel.querySelector('[data-role="smart-suggest"]')?.remove();

      this.querySelector('[data-role="count-product"]').textContent = String(productTotal);
      const articleCount = this.querySelector('[data-role="count-article"]');
      if (articleCount) articleCount.textContent = String(articleTotal);
      this.#selectTab(productTotal || !articleTotal ? 'product' : 'article');
      FOXSearchHighlight(this.querySelector('[data-role="results"]'), query);
      this.#setView('results');
      this.#status(`${productTotal} sản phẩm${this.dataset.articles === 'true' ? `, ${articleTotal} bài viết` : ''}.`);
    }

    #renderSuggest(links) {
      const block = this.querySelector('[data-role="suggest-block"]');
      const list = this.querySelector('[data-role="suggest-list"]');
      if (!block || !list) return;
      list.replaceChildren(...links.map((link) => {
        const item = document.createElement('li');
        item.append(link);
        return item;
      }));
      FOXSearchHighlight(list, this.#input().value.trim());
      block.hidden = !links.length;
    }

    #showInitial() {
      this.#lastQuery = '';
      this.#lastTotal = 0;
      this.#renderSuggest([]);
      this.#status('');
      this.#setView('initial');
    }

    // initial: recommend · results: tabs · empty: message + recommend (title switches)
    #setView(view) {
      this.dataset.view = view;
      this.querySelector('[data-role="results"]').hidden = view !== 'results';
      this.querySelector('[data-role="empty"]').hidden = view !== 'empty';
      const recommend = this.querySelector('[data-role="recommend"]');
      if (recommend) {
        recommend.hidden = view === 'results';
        const title = recommend.querySelector('[data-role="rail-title"]');
        if (title) title.textContent = view === 'empty' ? this.dataset.titleEmpty : this.dataset.titleInitial;
      }
    }

    #selectTab(name) {
      this.querySelectorAll('[data-tab]').forEach((tab) => {
        const active = tab.dataset.tab === name;
        tab.setAttribute('aria-selected', String(active));
        tab.tabIndex = active ? 0 : -1;
      });
      this.querySelectorAll('[data-panel]').forEach((panel) => {
        panel.hidden = panel.dataset.panel !== name;
      });
    }

    #onTabKey(event) {
      const tab = event.target.closest('[data-tab]');
      if (!tab || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return;
      const tabs = [...this.querySelectorAll('[data-tab]')];
      const next = tabs[(tabs.indexOf(tab) + (event.key === 'ArrowRight' ? 1 : -1) + tabs.length) % tabs.length];
      event.preventDefault();
      this.#selectTab(next.dataset.tab);
      next.focus();
    }

    #onSubmit(event) {
      const query = this.#input().value.trim();
      if (!query) {
        event.preventDefault();
        return;
      }
      this.#rememberIfFound(query);
    }

    #onClick(event) {
      const action = event.target.closest('[data-action]');
      if (action && this.contains(action)) {
        const type = action.dataset.action;
        if (type === 'close') {
          this.close();
          return;
        }
        if (type === 'clear') {
          this.#input().value = '';
          this.#onInput();
          this.#input().focus();
          return;
        }
        if (type === 'recent-clear') {
          FOXSearchWriteRecent([]);
          this.#renderRecent();
          return;
        }
        if (type === 'recent-remove') {
          const term = action.closest('[data-term]')?.dataset.term;
          FOXSearchWriteRecent(FOXSearchReadRecent().filter((item) => FOXSearchNormalize(item) !== FOXSearchNormalize(term)));
          this.#renderRecent();
          return;
        }
        if (type === 'recent-run') {
          const term = action.closest('[data-term]')?.dataset.term || '';
          this.#input().value = term;
          this.querySelector('[data-action="clear"]').hidden = !term;
          window.clearTimeout(this.#debounceTimer);
          this.#search(term);
          return;
        }
      }
      const tab = event.target.closest('[data-tab]');
      if (tab) {
        this.#selectTab(tab.dataset.tab);
        return;
      }
      // Leaving through a result, suggestion or "Xem thêm" counts as a successful search.
      const link = event.target.closest('a[href]');
      if (link && link.closest('[data-role="results"], [data-role="suggest-list"]')) this.#rememberIfFound(this.#lastQuery);
    }

    // Saved only when this exact query returned results.
    #rememberIfFound(query) {
      if (this.dataset.recent !== 'true' || !query || query.length < 2) return;
      if (FOXSearchNormalize(query) !== FOXSearchNormalize(this.#lastQuery) || this.#lastTotal <= 0) return;
      FOXSearchRemember(query, parseInt(this.dataset.recentLimit, 10) || RECENT_LIMIT);
      this.#renderRecent();
    }

    #renderRecent() {
      const block = this.querySelector('[data-role="recent-block"]');
      const list = this.querySelector('[data-role="recent-list"]');
      const template = this.querySelector('template[data-role="recent-template"]');
      if (!block || !list || !template) return;
      const terms = this.dataset.recent === 'true' ? FOXSearchReadRecent() : [];
      list.replaceChildren(...terms.map((term) => {
        const item = template.content.firstElementChild.cloneNode(true);
        item.dataset.term = term;
        item.querySelector('[data-role="recent-label"]').textContent = term;
        item.querySelector('[data-action="recent-remove"]').setAttribute('aria-label', `Xoá “${term}” khỏi tìm kiếm gần đây`);
        return item;
      }));
      block.hidden = !terms.length;
    }

    #status(message) {
      const status = this.querySelector('[data-role="status"]');
      if (status) status.textContent = message;
    }
  }

  if (!customElements.get('search-panel')) customElements.define('search-panel', SearchPanel);
})();
