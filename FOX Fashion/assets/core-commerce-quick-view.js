(function () {
  class QuickViewComponent extends HTMLElement {
    #abortController = null;
    #cache = new Map();
    #content = null;
    #error = null;
    #lastHandle = '';
    #loading = null;
    #modal = null;
    #requestController = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#modal = this.querySelector('modal-component');
      this.#content = this.querySelector('[data-role="content"]');
      this.#loading = this.querySelector('[data-role="loading"]');
      this.#error = this.querySelector('[data-role="error"]');
      if (!this.#modal || !this.#content || !this.#loading || !this.#error) {
        this.dataset.state = 'error';
        console.warn('[QuickViewComponent] Missing required modal hooks.');
        return;
      }

      this.#abortController = new AbortController();
      document.addEventListener('click', (event) => this.#handleDocumentClick(event), {
        signal: this.#abortController.signal,
      });
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-action="retry"]')) this.open(this.#lastHandle);
      }, { signal: this.#abortController.signal });
      this.dataset.state = 'idle';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#requestController?.abort();
      this.#abortController = null;
      this.#requestController = null;
    }

    async open(handle, trigger) {
      if (!handle || !this.#modal) return false;
      this.#lastHandle = handle;
      this.#requestController?.abort();
      this.#requestController = new AbortController();
      this.#setState('loading');
      this.#updateProductLink(handle);

      try {
        const html = await this.#load(handle, this.#requestController.signal);
        this.#content.innerHTML = html;
        this.#setState('ready');

        const opened = await this.#modal.open(trigger);
        if (!opened) return false;
        this.#refreshGallery();
        this.dispatchEvent(new CustomEvent('quickview:opened', {
          bubbles: true,
          detail: { handle },
        }));
        return true;
      } catch (error) {
        if (error.name === 'AbortError') return false;
        this.#setState('error');
        await this.#modal.open(trigger);
        this.dispatchEvent(new CustomEvent('quickview:error', {
          bubbles: true,
          detail: { handle, message: error.message },
        }));
        return false;
      }
    }

    #handleDocumentClick(event) {
      const trigger = event.target.closest('[data-action="quickview"]');
      if (!trigger) return;
      const handle = trigger.dataset.productHandle || trigger.dataset.handle;
      if (!handle) return;
      event.preventDefault();
      this.open(handle, trigger);
    }

    async #load(handle, signal) {
      if (this.#cache.has(handle)) return this.#cache.get(handle);
      const request = fetch(`/products/${encodeURIComponent(handle)}?view=quick-view`, {
        cache: 'no-store',
        credentials: 'same-origin',
        signal,
      }).then(async (response) => {
        if (!response.ok) throw new Error(`Quickview request failed with ${response.status}.`);
        const html = await response.text();
        if (!html.includes('<product-component')) throw new Error('Quickview fragment is invalid.');
        return html;
      });
      this.#cache.set(handle, request);
      try {
        return await request;
      } catch (error) {
        this.#cache.delete(handle);
        throw error;
      }
    }

    #setState(state) {
      this.dataset.state = state;
      this.#loading.hidden = state !== 'loading';
      this.#content.hidden = state !== 'ready';
      this.#error.hidden = state !== 'error';
      this.#modal?.setAttribute('aria-busy', state === 'loading' ? 'true' : 'false');
    }

    #updateProductLink(handle) {
      const link = this.#error.querySelector('[data-role="product-link"]');
      if (link) link.href = `/products/${encodeURIComponent(handle)}`;
    }

    #refreshGallery() {
      const product = this.#content.querySelector('product-component');
      const activeIndex = Number(product?.dataset.activeMediaIndex || 0);
      const sliders = this.#content.querySelectorAll(
        'slider-component[data-role="gallery-main"], slider-component[data-role="gallery-thumbnails"]'
      );
      sliders.forEach((slider) => {
        if (slider.dataset.state !== 'ready' || slider.itemCount <= 1) return;
        slider.refresh();
        if (activeIndex > 0) slider.goTo(activeIndex);
      });
    }
  }

  if (!customElements.get('quick-view-component')) {
    customElements.define('quick-view-component', QuickViewComponent);
  }
}());
