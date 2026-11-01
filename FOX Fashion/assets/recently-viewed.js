(() => {
  const STORAGE_KEY = 'fox-recently-viewed'; 
  const MAX_STORED_ITEMS = 20;
  const MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
  const CARD_VIEW = 'product-loop-data';
  const MISSING_PRODUCT_ERRORS = ['http-404', 'empty-response', 'missing-card'];

  function FOXNormalizeHandle(value) {
    const normalize = window.FOX?.normalizeProductHandle;
    return typeof normalize === 'function' ? normalize(value) : '';
  }

  function FOXIsFreshEntry(entry, now) {
    return Boolean(entry)
      && typeof entry.handle === 'string'
      && entry.handle !== ''
      && Number.isFinite(entry.viewedAt)
      && now - entry.viewedAt < MAX_AGE_MS;
  }

  function FOXReadEntries() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      const now = Date.now();
      return Array.isArray(stored) ? stored.filter((entry) => FOXIsFreshEntry(entry, now)) : [];
    } catch (error) {
      return [];
    }
  }

  function FOXWriteEntries(entries) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_STORED_ITEMS)));
    } catch (error) {
      // Storage blocked or full (private mode): the section simply stays empty.
    }
  }

  // Earlier versions kept plain handles in sessionStorage; carry them over once.
  function FOXMigrateSessionHistory() {
    try {
      const legacy = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
      window.sessionStorage.removeItem(STORAGE_KEY);
      if (!Array.isArray(legacy) || !legacy.length) return;

      const entries = FOXReadEntries();
      const known = new Set(entries.map((entry) => entry.handle));
      const now = Date.now();
      legacy.forEach((handle) => {
        if (typeof handle !== 'string' || !handle || known.has(handle)) return;
        known.add(handle);
        entries.push({ handle, viewedAt: now });
      });
      FOXWriteEntries(entries);
    } catch (error) {
      // Nothing to migrate.
    }
  }

  function FOXReadRecentlyViewed() {
    return FOXReadEntries().map((entry) => entry.handle);
  }

  function FOXRecordRecentlyViewed(handle) {
    const entries = FOXReadEntries().filter((entry) => entry.handle !== handle);
    FOXWriteEntries([{ handle, viewedAt: Date.now() }, ...entries]);
  }

  function FOXForgetRecentlyViewed(handles) {
    FOXWriteEntries(FOXReadEntries().filter((entry) => !handles.includes(entry.handle)));
  }

  class RecentlyViewed extends HTMLElement {
    #requestId = 0;
    #initialized = false;

    connectedCallback() {
      if (this.#initialized) return;
      this.#initialized = true;

      if (typeof window.FOX?.loadProductFragment !== 'function') {
        this.#fail('Product fragment loader is not available.');
        return;
      }

      FOXMigrateSessionHistory();
      const currentHandle = FOXNormalizeHandle(this.dataset.currentHandle);
      if (currentHandle && this.dataset.record === 'true') {
        FOXRecordRecentlyViewed(currentHandle);
      }

      const handles = FOXReadRecentlyViewed().slice(0, this.#limit());
      if (!handles.length) {
        this.#setEmpty();
        return;
      }

      this.#render(handles);
    }

    disconnectedCallback() {
      this.#requestId += 1;
      this.#initialized = false;
      this.dataset.state = 'idle';
    }

    async #render(handles) {
      const track = this.querySelector('[data-role="track"]');
      if (!track) {
        this.#fail('Missing [data-role="track"].');
        return;
      }

      const requestId = ++this.#requestId;
      this.dataset.state = 'loading';
      this.setAttribute('aria-busy', 'true');

      const results = await Promise.allSettled(
        handles.map((handle) => window.FOX.loadProductFragment(handle, CARD_VIEW))
      );
      if (requestId !== this.#requestId || !this.isConnected) return;

      const slides = document.createDocumentFragment();
      const missingHandles = [];
      let count = 0;

      results.forEach((result, index) => {
        const card = result.status === 'fulfilled' ? result.value.querySelector('product-card') : null;
        if (!card) {
          const reason = result.status === 'rejected' ? result.reason?.message : 'missing-card';
          if (MISSING_PRODUCT_ERRORS.includes(reason)) missingHandles.push(handles[index]);
          return;
        }

        const slide = document.createElement('div');
        slide.className = 'swiper-slide fox-product-carousel__slide';
        slide.append(document.importNode(card, true));
        slides.append(slide);
        count += 1;
      });

      this.removeAttribute('aria-busy');
      this.#forget(missingHandles);

      if (!count) {
        this.#setEmpty();
        return;
      }

      track.replaceChildren(slides);
      this.hidden = false;
      this.dataset.state = 'ready';
      this.dataset.itemCount = String(count);
      this.#emit('recently-viewed:ready', { count });
    }

    #forget(handles) {
      if (!handles.length) return;
      FOXForgetRecentlyViewed(handles);
    }

    #limit() {
      const limit = parseInt(this.dataset.limit, 10);
      return Number.isInteger(limit) && limit > 0 ? limit : 8;
    }

    #setEmpty() {
      this.hidden = true;
      this.dataset.state = 'empty';
      this.dataset.itemCount = '0';
      this.#emit('recently-viewed:ready', { count: 0 });
    }

    #fail(message) {
      this.hidden = true;
      this.dataset.state = 'error';
      console.warn(`[RecentlyViewed] ${message}`);
      this.#emit('recently-viewed:error', { message });
    }

    #emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    }
  }

  if (!customElements.get('recently-viewed')) {
    customElements.define('recently-viewed', RecentlyViewed);
  }
})();
