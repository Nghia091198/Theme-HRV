class FoxLookbook extends HTMLElement {

  #abort = null;
  #tabs = [];
  #panels = [];

  connectedCallback() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    const { signal } = this.#abort;
    this.#tabs = [...this.querySelectorAll('[role="tab"]')];
    this.#panels = [...this.querySelectorAll('[role="tabpanel"]')];

    if (!this.#tabs.length || !this.#panels.length) {
      this.dataset.state = 'error';
      return;
    }

    this.#tabs.forEach((tab) => tab.addEventListener('click', () => this.#activateLook(tab), { signal }));
    this.addEventListener('click', (event) => this.#onClick(event), { signal });
    this.addEventListener('keydown', (event) => this.#onKeydown(event), { signal });
    this.addEventListener('slider:change', (event) => this.#onSliderChange(event), { signal });
    this.#panels.forEach((panel) => this.#hydratePanel(panel));
    this.#activateLook(this.#tabs.find((tab) => tab.getAttribute('aria-selected') === 'true') || this.#tabs[0], false);
    this.dataset.state = 'ready';
  }

  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
    this.dataset.state = 'idle';
  }

  #activateLook(tab, focus = true) {
    const panelId = tab.getAttribute('aria-controls');
    const panel = this.querySelector(`#${CSS.escape(panelId)}`);
    if (!panel) return;

    this.#tabs.forEach((item) => {
      const active = item === tab;
      item.setAttribute('aria-selected', String(active));
      item.setAttribute('tabindex', active ? '0' : '-1');
    });
    this.#panels.forEach((item) => { item.hidden = item !== panel; });
    this.#selectProduct(panel, 0, false);
    panel.querySelector('slider-component')?.swiper?.update?.();
    if (focus) tab.focus();
    this.dispatchEvent(new CustomEvent('lookbook:change', {
      bubbles: true,
      detail: { index: this.#tabs.indexOf(tab), panelId },
    }));
  }

  #onClick(event) {
    const pin = event.target.closest('[data-lookbook-pin]');
    if (!pin || !this.contains(pin)) return;
    // Keep hotspot selection inside the lookbook interaction boundary.
    event.stopPropagation();
    const panel = pin.closest('[role="tabpanel"]');
    this.#selectProduct(panel, Number(pin.dataset.productIndex || 0), true);
  }

  #onSliderChange(event) {
    const slider = event.target.closest('slider-component');
    const panel = slider?.closest('[role="tabpanel"]');
    if (!panel || panel.hidden) return;
    this.#syncProductState(panel, Number(event.detail?.index || 0));
  }

  #selectProduct(panel, index, moveSlider) {
    if (!panel) return;
    const slides = [...panel.querySelectorAll('[data-lookbook-product]')];
    if (!slides.length) return;
    const safeIndex = Math.max(0, Math.min(index, slides.length - 1));
    if (moveSlider) panel.querySelector('slider-component')?.goTo(safeIndex);
    this.#syncProductState(panel, safeIndex);
  }

  #syncProductState(panel, index) {
    const pins = [...panel.querySelectorAll('[data-lookbook-pin]')];
    const slides = [...panel.querySelectorAll('[data-lookbook-product]')];
    pins.forEach((pin, pinIndex) => pin.setAttribute('aria-current', String(pinIndex === index)));
    panel.dataset.activeIndex = String(index);
    const handle = this.#productHandle(slides[index]?.dataset.productHandle || '');
    this.dispatchEvent(new CustomEvent('lookbook:product-change', {
      bubbles: true,
      detail: {
        lookIndex: Number(panel.dataset.lookIndex || 0),
        productIndex: index,
        handle,
      },
    }));
  }

  async #hydratePanel(panel) {
    const slides = [...panel.querySelectorAll('[data-lookbook-product]')];
    await Promise.all(slides.map((slide) => this.#hydrateProduct(slide)));
    const primaryHandle = this.#productHandle(panel.dataset.lookHandle || '') || this.#productHandle(slides[0]?.dataset.productHandle || '');
    if (!primaryHandle) return;
    try {
      const fragment = await this.#loadProduct(primaryHandle);
      const image = fragment.querySelector('.proloop--image-front');
      if (!image?.src) return;
      const mainImage = panel.querySelector('[data-lookbook-image]');
      const tabImage = this.querySelector(`[aria-controls="${panel.id}"] [data-lookbook-thumbnail] img`);
      [mainImage, tabImage].forEach((target) => {
        if (!target) return;
        target.src = image.src;
        target.alt = target === mainImage ? image.alt : '';
      });
      panel.dataset.imageState = 'ready';
    } catch (error) {
      panel.dataset.imageState = 'fallback';
      console.warn('[FOX Lookbook] Unable to load the primary product image.', error);
    }
  }

  async #hydrateProduct(slide) {
    const handle = this.#productHandle(slide.dataset.productHandle || '');
    if (!handle) {
      slide.dataset.state = 'error';
      return;
    }
    slide.dataset.productHandle = handle;
    const fallback = slide.querySelector('.fox-lookbook__product-fallback');
    if (fallback) fallback.href = `/products/${encodeURIComponent(handle)}`;
    try {
      const fragment = await this.#loadProduct(handle);
      const product = fragment.querySelector('product-card');
      if (!product) {
        throw new Error('missing-product-markup');
      }
      slide.replaceChildren(product.cloneNode(true));
      slide.dataset.state = 'ready';
    } catch (error) {
      slide.dataset.state = 'error';
      console.warn(`[FOX Lookbook] Unable to load product "${handle}".`, error);
    }
  }

  async #loadProduct(handle) {
    if (typeof window.FOX?.loadProductFragment !== 'function') {
      throw new Error('product-fragment-loader-unavailable');
    }
    return window.FOX.loadProductFragment(handle, 'lookbook-card');
  }

  #productHandle(value) {
    return window.FOX?.normalizeProductHandle?.(value) || '';
  }

  #onKeydown(event) {
    const current = this.#tabs.indexOf(document.activeElement);
    if (current === -1) return;
    let next = -1;
    if (['ArrowDown', 'ArrowRight'].includes(event.key)) next = (current + 1) % this.#tabs.length;
    else if (['ArrowUp', 'ArrowLeft'].includes(event.key)) next = (current - 1 + this.#tabs.length) % this.#tabs.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = this.#tabs.length - 1;
    else return;
    event.preventDefault();
    this.#activateLook(this.#tabs[next]);
  }
}

if (!customElements.get('fox-lookbook')) {
  customElements.define('fox-lookbook', FoxLookbook);
}
