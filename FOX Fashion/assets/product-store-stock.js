(() => {
  const INVENTORY_URL = '/inventory_location.js';

  // Store availability (snippets/product-store-stock.liquid). Stores are rendered by Liquid from shop.addresses;
  // this only asks Haravan which locations hold the variant and updates status, counts, order and preview.
  class StoreStock extends HTMLElement {
    #abortController = null;
    #requestController = null;
    #product = null;
    #modal = null;
    #province = '';

    connectedCallback() {
      if (this.#abortController) return;
      this.#product = this.closest('product-component');
      this.#modal = this.querySelector('modal-component');
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;

      this.#product?.addEventListener('product:ready', (event) => this.location(event.detail.variant), { signal });
      this.#product?.addEventListener('product:variant-change', (event) => this.location(event.detail.variant), { signal });
      this.#product?.addEventListener('product:variant-unavailable', () => this.location(null), { signal });
      this.addEventListener('click', (event) => {
        const tab = event.target.closest('[data-role="province-tab"]');
        if (tab && this.contains(tab)) {
          this.#province = tab.dataset.province || '';
          this.querySelectorAll('[data-role="province-tab"]').forEach((item) => item.setAttribute('aria-pressed', item === tab ? 'true' : 'false'));
          this.#filter();
          return;
        }
        const trigger = event.target.closest('[data-action="open-stores"]');
        if (trigger && typeof this.#modal?.open === 'function') this.#modal.open(trigger);
      }, { signal });
      this.querySelector('[data-role="in-stock-only"]')?.addEventListener('change', () => this.#filter(), { signal });

      this.location(this.#product?.selectedVariant || null);
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#requestController?.abort();
      this.#requestController = null;
    }

    // Called on load and on every swatch change (product:variant-change).
    async location(variant) {
      this.#requestController?.abort();
      if (!variant?.id) {
        this.#mark(new Set());
        return;
      }
      if (!variant.inventory_management) {
        this.#mark(null);
        return;
      }

      this.#requestController = new AbortController();
      this.dataset.state = 'loading';
      try {
        const response = await fetch(`${INVENTORY_URL}?variant_id=${encodeURIComponent(variant.id)}&quantity=1`, {
          credentials: 'same-origin',
          headers: { Accept: 'application/json' },
          signal: this.#requestController.signal,
        });
        if (!response.ok) throw new Error(`http-${response.status}`);
        const stock = await response.json();
        const ids = new Set((stock?.inventory_locations || []).map((location) => String(location.location_id)));
        this.#mark(ids);
      } catch (error) {
        if (error.name === 'AbortError') return;
        this.dataset.state = 'error';
        this.querySelector('[data-role="summary"]').textContent = 'Không kiểm tra được tồn kho lúc này.';
        console.warn('[StoreStock] inventory_location request failed.', error.message);
        this.dispatchEvent(new CustomEvent('store-stock:error', { bubbles: true, detail: { message: error.message } }));
      }
    }

    // availableIds: Set of in-stock location ids, or null when every store counts as in stock.
    #mark(availableIds) {
      const stores = [...this.querySelectorAll('[data-role="provinces"] [data-role="store"]')];
      let inStock = 0;
      stores.forEach((store) => {
        const available = availableIds === null || availableIds.has(String(store.dataset.locationId));
        store.dataset.status = available ? 'in' : 'out';
        store.querySelector('[data-role="badge"]').textContent = available ? 'Còn hàng' : 'Hết hàng';
        if (available) inStock += 1;
      });

      const summary = inStock
        ? `Còn hàng tại ${inStock}/${stores.length} cửa hàng`
        : 'Tạm hết hàng tại các cửa hàng';
      this.querySelector('[data-role="summary"]').textContent = summary;
      this.querySelector('[data-role="sheet-subtitle"]').textContent = summary;

      this.#sortProvinces();
      this.#renderPreview();
      this.#filter();
      this.dataset.state = 'ready';
      this.dispatchEvent(new CustomEvent('store-stock:update', { bubbles: true, detail: { inStock, total: stores.length } }));
    }

    // Provinces with more in-stock stores come first.
    #sortProvinces() {
      const container = this.querySelector('[data-role="provinces"]');
      if (!container) return;
      const provinces = [...container.querySelectorAll(':scope > [data-role="province"]')].map((province) => {
        const count = province.querySelectorAll('[data-role="store"][data-status="in"]').length;
        const total = province.querySelectorAll('[data-role="store"]').length;
        const label = province.querySelector('[data-role="province-count"]');
        if (label) label.textContent = `${count}/${total}`;
        return { province, count };
      });
      provinces.sort((a, b) => b.count - a.count).forEach(({ province }) => container.append(province));

      // Province tabs follow the same order ("Tất cả" stays first).
      const tabs = this.querySelector('[data-role="province-tabs"]');
      if (tabs) {
        provinces.forEach(({ province }) => {
          const tab = [...tabs.querySelectorAll('[data-role="province-tab"]')].find((item) => item.dataset.province === province.dataset.province);
          if (tab) tabs.append(tab);
        });
      }
    }

    #renderPreview() {
      const preview = this.querySelector('[data-role="preview"]');
      if (!preview) return;
      const limit = Math.max(1, parseInt(this.dataset.preview, 10) || 2);
      const stores = [...this.querySelectorAll('[data-role="provinces"] [data-role="store"]')];
      const ordered = [...stores.filter((store) => store.dataset.status === 'in'), ...stores.filter((store) => store.dataset.status !== 'in')];
      preview.replaceChildren(...ordered.slice(0, limit).map((store) => {
        const clone = store.cloneNode(true);
        clone.removeAttribute('data-role');
        clone.querySelector('.fox-store-stock__actions')?.remove();
        return clone;
      }));
    }

    #filter() {
      const inStockOnly = Boolean(this.querySelector('[data-role="in-stock-only"]')?.checked);
      let visible = 0;
      this.querySelectorAll('[data-role="provinces"] [data-role="store"]').forEach((store) => {
        const province = store.closest('[data-role="province"]')?.dataset.province || '';
        const matches = (!inStockOnly || store.dataset.status === 'in')
          && (!this.#province || province === this.#province);
        store.hidden = !matches;
        if (matches) visible += 1;
      });
      this.querySelectorAll('[data-role="district"], [data-role="province"]').forEach((group) => {
        group.hidden = !group.querySelector('[data-role="store"]:not([hidden])');
      });
      const empty = this.querySelector('[data-role="empty"]');
      if (empty) empty.hidden = visible > 0;
    }
  }

  if (!customElements.get('store-stock')) customElements.define('store-stock', StoreStock);
})();
