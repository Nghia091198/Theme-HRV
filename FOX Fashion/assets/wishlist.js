(() => {
  const STORAGE_KEY = 'fox-wishlist';
  const MAX_ITEMS = 100;
  const CHANGE_EVENT = 'wishlist:change';
  const CARD_VIEW = 'product-loop-data';
  const MISSING_PRODUCT_ERRORS = ['http-404', 'empty-response', 'missing-card'];
  const SHARE_PARAM = 'ids';
  const MAX_SHARED_IDS = 50;
  const ID_PATTERN = /^\d{1,20}$/;
  const STATUS_DURATION = 2400;

  function FOXWishlistHandle(value) {
    const normalize = window.FOX?.normalizeProductHandle;
    if (typeof normalize === 'function') return normalize(value);
    return String(value || '').trim().toLowerCase();
  }

  function FOXWishlistId(value) {
    const id = String(value || '').trim();
    return ID_PATTERN.test(id) ? id : '';
  }

  function FOXWishlistRead() {
    try {
      const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]');
      return Array.isArray(stored)
        ? stored.filter((entry) => entry && typeof entry.handle === 'string' && entry.handle !== '')
        : [];
    } catch (error) {
      return [];
    }
  }

  function FOXWishlistWrite(entries, detail) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, MAX_ITEMS)));
    } catch (error) {
      // Storage blocked or full (private mode): the wishlist only lives for this page view.
    }
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { ...detail, handles: entries.map((entry) => entry.handle) } }));
  }

  function FOXWishlistMoney(cents) {
    if (typeof window.ShopMoney === 'function') return window.ShopMoney(cents);
    return `${Math.round(cents / 100).toLocaleString('vi-VN')}₫`;
  }

  // Product data by id in one request (Haravan storefront search filter).
  async function FOXWishlistFetchProducts(ids) {
    if (!ids.length) return [];
    const query = `filter=(((id:product in ${ids.join(',')})))`;
    const response = await fetch(`/search.js?q=${encodeURIComponent(query)}&page=1&limit=${Math.min(ids.length, MAX_SHARED_IDS)}`, {
      credentials: 'same-origin',
      headers: { Accept: 'application/json' },
    });
    if (!response.ok) throw new Error(`http-${response.status}`);
    const data = await response.json();
    return Array.isArray(data?.products) ? data.products : [];
  }

  // Public API (also used by other components): newest first.
  const wishlist = {
    entries: () => FOXWishlistRead(),
    handles: () => FOXWishlistRead().map((entry) => entry.handle),
    count: () => FOXWishlistRead().length,
    has: (handle) => FOXWishlistRead().some((entry) => entry.handle === FOXWishlistHandle(handle)),
    add(handle, id) {
      const key = FOXWishlistHandle(handle);
      if (!key) return;
      const entries = FOXWishlistRead().filter((entry) => entry.handle !== key);
      FOXWishlistWrite([{ handle: key, id: FOXWishlistId(id), addedAt: Date.now() }, ...entries], { handle: key, added: true });
    },
    addMany(items) {
      const entries = FOXWishlistRead();
      const known = new Set(entries.map((entry) => entry.handle));
      const added = items
        .map((item) => ({ handle: FOXWishlistHandle(item.handle), id: FOXWishlistId(item.id), addedAt: Date.now() }))
        .filter((item) => item.handle && !known.has(item.handle) && known.add(item.handle));
      if (added.length) FOXWishlistWrite([...added, ...entries], { added: true, count: added.length });
      return added.length;
    },
    remove(handle) {
      const keys = (Array.isArray(handle) ? handle : [handle]).map(FOXWishlistHandle);
      FOXWishlistWrite(FOXWishlistRead().filter((entry) => !keys.includes(entry.handle)), { handle: keys[0], added: false });
    },
    toggle(handle, id) {
      const active = !this.has(handle);
      if (active) this.add(handle, id);
      else this.remove(handle);
      return active;
    },
    clear() {
      FOXWishlistWrite([], { cleared: true });
    },
    // Older entries were saved by handle only; ids are filled in from rendered cards.
    rememberIds(pairs) {
      const ids = new Map(pairs.filter((pair) => pair.id).map((pair) => [pair.handle, pair.id]));
      const entries = FOXWishlistRead();
      let changed = false;
      entries.forEach((entry) => {
        if (!entry.id && ids.has(entry.handle)) {
          entry.id = ids.get(entry.handle);
          changed = true;
        }
      });
      if (!changed) return;
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
      } catch (error) {
        // Ids are only an optimisation.
      }
    },
  };

  window.FOX = window.FOX || {};
  window.FOX.wishlist = wishlist;

  // Keep every tab in sync.
  window.addEventListener('storage', (event) => {
    if (event.key !== STORAGE_KEY) return;
    document.dispatchEvent(new CustomEvent(CHANGE_EVENT, { detail: { source: 'storage', handles: wishlist.handles() } }));
  });

  class WishlistButton extends HTMLElement {
    #abortController = null;
    #handle = '';

    connectedCallback() {
      if (this.#abortController) return;
      this.#handle = FOXWishlistHandle(this.dataset.handle);
      const trigger = this.querySelector('[data-role="trigger"]');
      if (!this.#handle || !trigger) {
        this.dataset.state = 'error';
        return;
      }
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      trigger.addEventListener('click', (event) => {
        event.preventDefault();
        event.stopPropagation();
        const active = wishlist.toggle(this.#handle, this.dataset.productId);
        this.classList.remove('is-bump');
        void this.offsetWidth;
        this.classList.add('is-bump');
        this.dispatchEvent(new CustomEvent(active ? 'wishlist:added' : 'wishlist:removed', { bubbles: true, detail: { handle: this.#handle } }));
      }, { signal });
      document.addEventListener(CHANGE_EVENT, () => this.#sync(), { signal });
      this.#sync();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
    }

    #sync() {
      const trigger = this.querySelector('[data-role="trigger"]');
      const active = wishlist.has(this.#handle);
      this.dataset.active = String(active);
      trigger?.setAttribute('aria-pressed', String(active));
      trigger?.setAttribute('aria-label', active ? trigger.dataset.labelRemove : trigger.dataset.labelAdd);
    }
  }

  // Header badge: hidden while the wishlist is empty.
  class WishlistCount extends HTMLElement {
    #abortController = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      document.addEventListener(CHANGE_EVENT, () => this.#render(), { signal: this.#abortController.signal });
      this.#render();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
    }

    #render() {
      const count = wishlist.count();
      this.textContent = String(count);
      this.hidden = count === 0;
      const link = this.closest('a');
      if (link && this.dataset.labelTemplate) link.setAttribute('aria-label', this.dataset.labelTemplate.replace('{count}', count));
    }
  }

  // Wishlist page (templates/page.wishlist.liquid, layout B). Own list from localStorage, or a shared list
  // from ?ids=<id>,<id> that stays read only until the visitor saves it.
  class WishlistPage extends HTMLElement {
    #abortController = null;
    #requestId = 0;
    #sharedIds = [];
    #products = [];
    #statusTimer = 0;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.#sharedIds = this.#readSharedIds();
      this.dataset.mode = this.#sharedIds.length ? 'shared' : 'own';
      this.#applyMode();
      this.addEventListener('click', (event) => this.#handleClick(event), { signal });
      document.addEventListener(CHANGE_EVENT, () => {
        if (this.dataset.mode === 'own') this.#sync();
      }, { signal });
      this.#render();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#requestId += 1;
      window.clearTimeout(this.#statusTimer);
    }

    #readSharedIds() {
      const raw = new URLSearchParams(window.location.search).get(SHARE_PARAM) || '';
      return [...new Set(raw.split(',').map(FOXWishlistId).filter(Boolean))].slice(0, MAX_SHARED_IDS);
    }

    #applyMode() {
      const shared = this.dataset.mode === 'shared';
      const title = this.querySelector('[data-role="title"]');
      if (title) title.textContent = shared ? this.dataset.titleShared : this.dataset.titleOwn;
      this.querySelector('.fox-wishlist__summary-own')?.toggleAttribute('hidden', shared);
      this.querySelector('.fox-wishlist__summary-shared')?.toggleAttribute('hidden', !shared);
    }

    async #render() {
      const requestId = ++this.#requestId;
      this.dataset.state = 'loading';
      this.setAttribute('aria-busy', 'true');

      let items = [];
      try {
        if (this.dataset.mode === 'shared') {
          const products = await FOXWishlistFetchProducts(this.#sharedIds);
          const byId = new Map(products.map((product) => [String(product.id), product]));
          items = this.#sharedIds.map((id) => byId.get(id)).filter(Boolean).map((product) => ({ handle: product.handle, id: String(product.id) }));
        } else {
          items = wishlist.entries().map((entry) => ({ handle: entry.handle, id: entry.id || '' }));
        }
      } catch (error) {
        console.warn('[WishlistPage] Shared list could not be loaded.', error.message);
      }
      if (requestId !== this.#requestId || !this.isConnected) return;

      this.#setCount(items.length);
      if (!items.length) {
        this.#setEmpty();
        return;
      }
      if (typeof window.FOX?.loadProductFragment !== 'function') {
        this.dataset.state = 'error';
        console.warn('[WishlistPage] Product fragment loader is not available.');
        return;
      }

      const results = await Promise.allSettled(items.map((item) => window.FOX.loadProductFragment(item.handle, CARD_VIEW)));
      if (requestId !== this.#requestId || !this.isConnected) return;

      const grid = this.querySelector('[data-role="grid"]');
      const template = this.querySelector('template[data-role="item-template"]');
      const fragment = document.createDocumentFragment();
      const missing = [];
      const pairs = [];
      results.forEach((result, index) => {
        const card = result.status === 'fulfilled' ? result.value.querySelector('product-card') : null;
        if (!card) {
          const reason = result.status === 'rejected' ? result.reason?.message : 'missing-card';
          if (MISSING_PRODUCT_ERRORS.includes(reason)) missing.push(items[index].handle);
          return;
        }
        const id = items[index].id || FOXWishlistId(card.querySelector('[data-product-id]')?.dataset.productId);
        pairs.push({ handle: items[index].handle, id });
        const item = template.content.firstElementChild.cloneNode(true);
        item.dataset.handle = items[index].handle;
        item.dataset.productId = id;
        const title = card.querySelector('.pro--title')?.textContent.trim();
        const remove = item.querySelector('[data-action="remove"]');
        if (title) remove?.setAttribute('aria-label', `Bỏ ${title} khỏi yêu thích`);
        if (this.dataset.mode === 'shared') remove?.remove();
        item.querySelector('[data-role="slot"]').replaceWith(document.importNode(card, true));
        fragment.append(item);
      });

      this.removeAttribute('aria-busy');
      grid?.replaceChildren(fragment);
      if (this.dataset.mode === 'own') {
        wishlist.rememberIds(pairs);
        if (missing.length) wishlist.remove(missing);
      }
      if (!grid?.children.length) {
        this.#setEmpty();
        return;
      }
      this.#setCount(grid.children.length);
      this.#toggleEmpty(false);
      this.dataset.state = 'ready';
      await this.#loadSummary(pairs.map((pair) => pair.id).filter(Boolean), requestId);
    }

    async #loadSummary(ids, requestId) {
      try {
        this.#products = await FOXWishlistFetchProducts(ids);
      } catch (error) {
        this.#products = [];
        console.warn('[WishlistPage] Summary data could not be loaded.', error.message);
      }
      if (requestId !== this.#requestId || !this.isConnected) return;
      this.#renderSummary();
    }

    // Removal (from a card heart, the item heart or another tab) drops items without reloading the grid.
    #sync() {
      const handles = wishlist.handles();
      const items = [...this.querySelectorAll('[data-role="item"]')];
      const rendered = new Set(items.map((item) => item.dataset.handle));
      if (handles.some((handle) => !rendered.has(handle))) {
        this.#render();
        return;
      }
      items.forEach((item) => {
        if (!handles.includes(item.dataset.handle)) item.remove();
      });
      const remainingIds = new Set(handles.length ? [...this.querySelectorAll('[data-role="item"]')].map((item) => item.dataset.productId) : []);
      this.#products = this.#products.filter((product) => remainingIds.has(String(product.id)));
      this.#setCount(handles.length);
      if (!handles.length) {
        this.#setEmpty();
        return;
      }
      this.#renderSummary();
    }

    // Same rule as the card add-to-cart button: every in-stock product, first available variant.
    #summaryData() {
      const available = this.#products.filter((product) => product.available);
      const onSale = this.#products.filter((product) => Number(product.compare_at_price) > Number(product.price));
      const addable = available
        .map((product) => ({ product, variant: (product.variants || []).find((variant) => variant.available !== false) }))
        .filter((entry) => entry.variant);
      const value = this.#products.reduce((sum, product) => sum + Number(product.price || 0), 0);
      const savings = this.#products.reduce((sum, product) => {
        const compare = Number(product.compare_at_price || 0);
        const price = Number(product.price || 0);
        return compare > price ? sum + compare - price : sum;
      }, 0);
      return { available, onSale, addable, value, savings, total: this.#products.length };
    }

    #renderSummary() {
      const summary = this.querySelector('[data-role="summary"]');
      if (!this.#products.length) {
        if (summary) summary.hidden = true;
        return;
      }
      const data = this.#summaryData();
      const set = (role, text) => this.querySelectorAll(`[data-role="${role}"]`).forEach((node) => { node.textContent = text; });
      set('stat-in', String(data.available.length));
      set('stat-out', String(data.total - data.available.length));
      set('stat-sale', String(data.onSale.length));
      set('stat-total', String(data.total));
      set('total-value', FOXWishlistMoney(data.value));
      set('add-all-label', data.addable.length ? `Thêm ${data.addable.length} sản phẩm vào giỏ` : 'Thêm vào giỏ');

      const save = this.querySelector('[data-role="total-save"]');
      if (save) {
        save.hidden = data.savings <= 0;
        save.textContent = data.savings > 0 ? `Tiết kiệm ${FOXWishlistMoney(data.savings)} so với giá gốc` : '';
      }
      this.querySelectorAll('[data-action="add-all"]').forEach((button) => {
        button.disabled = !data.addable.length;
      });

      if (summary) summary.hidden = false;
    }

    async #handleClick(event) {
      const action = event.target.closest('[data-action]');
      if (!action || !this.contains(action)) return;
      const type = action.dataset.action;

      if (type === 'remove') {
        const handle = action.closest('[data-role="item"]')?.dataset.handle;
        if (handle) wishlist.remove(handle);
        return;
      }
      if (type === 'clear') {
        if (window.confirm(this.dataset.confirmClear || 'Xóa tất cả sản phẩm yêu thích?')) wishlist.clear();
        return;
      }
      if (type === 'share') {
        await this.#share();
        return;
      }
      if (type === 'save-shared') {
        const added = wishlist.addMany(this.#products.map((product) => ({ handle: product.handle, id: product.id })));
        this.#status(added ? `Đã lưu ${added} sản phẩm vào yêu thích của bạn.` : 'Các sản phẩm này đã có trong yêu thích của bạn.');
        return;
      }
      if (type === 'add-all') await this.#addAll();
    }

    async #share() {
      const ids = [...this.querySelectorAll('[data-role="item"]')].map((item) => item.dataset.productId).filter(Boolean).slice(0, MAX_SHARED_IDS);
      if (!ids.length) return;
      const url = new URL(window.location.pathname, window.location.origin);
      url.searchParams.set(SHARE_PARAM, ids.join(','));
      const link = url.toString().replace(/%2C/g, ',');
      try {
        if (typeof navigator.share === 'function') {
          await navigator.share({ title: document.title, url: link });
          return;
        }
        await navigator.clipboard.writeText(link);
        this.#status('Đã sao chép link danh sách. Gửi link này để chia sẻ.');
      } catch (error) {
        if (error?.name !== 'AbortError') this.#status('Không chia sẻ được, hãy thử lại.');
      }
    }

    async #addAll() {
      const { addable } = this.#summaryData();
      if (!addable.length || typeof window.FOX?.cart?.addMany !== 'function') return;
      const buttons = [...this.querySelectorAll('[data-action="add-all"]')];
      buttons.forEach((button) => { button.disabled = true; });
      let added = 0;
      try {
        const result = await window.FOX.cart.addMany(addable.map((entry) => ({ variantId: entry.variant.id, quantity: 1 })));
        added = result?.added || 0;
      } catch (error) {
        console.warn('[WishlistPage] Could not add to cart.', error.message);
      }
      buttons.forEach((button) => { button.disabled = false; });
      this.#status(added ? `Đã thêm ${added} sản phẩm vào giỏ hàng.` : 'Chưa thêm được sản phẩm nào, hãy thử lại.');
    }

    #status(message) {
      const status = this.querySelector('[data-role="status"]');
      if (!status) return;
      status.textContent = message;
      window.clearTimeout(this.#statusTimer);
      this.#statusTimer = window.setTimeout(() => { status.textContent = ''; }, STATUS_DURATION * 2);
    }

    #setCount(count) {
      this.querySelectorAll('[data-role="count"]').forEach((node) => { node.textContent = String(count); });
    }

    #setEmpty() {
      this.querySelector('[data-role="grid"]')?.replaceChildren();
      const summary = this.querySelector('[data-role="summary"]');
      if (summary) summary.hidden = true;
      this.#products = [];
      this.#toggleEmpty(true);
      this.dataset.state = 'empty';
    }

    #toggleEmpty(empty) {
      const emptyState = this.querySelector('[data-role="empty"]');
      if (emptyState) emptyState.hidden = !empty;
    }
  }

  if (!customElements.get('wishlist-button')) customElements.define('wishlist-button', WishlistButton);
  if (!customElements.get('wishlist-count')) customElements.define('wishlist-count', WishlistCount);
  if (!customElements.get('wishlist-page')) customElements.define('wishlist-page', WishlistPage);
})();
