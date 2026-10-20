(function () {
  class FeaturedProduct extends HTMLElement {
    #abortController = null;
    #request = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      this.#load();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#request = null;
    }

    async #load() {
      const handle = this.dataset.productHandle;
      const fragment = this.querySelector('[data-role="fragment"]');
      const signal = this.#abortController.signal;
      if (!handle || !fragment) return;
      try {
        this.#request = fetch(`/products/${encodeURIComponent(handle)}?view=featured-product`, {
          signal,
          headers: { 'X-Requested-With': 'XMLHttpRequest' },
        });
        const response = await this.#request;
        if (!response.ok) throw new Error(`http-${response.status}`);
        const html = (await response.text()).trim();
        if (!html) throw new Error('empty-response');
        const documentFragment = document.createRange().createContextualFragment(html);
        fragment.replaceChildren(documentFragment);
        this.dataset.state = 'ready';
        this.#refreshZoom();
      } catch (error) {
        if (error.name === 'AbortError') return;
        this.dataset.state = 'error';
        fragment.querySelector('[data-role="loading"]')?.setAttribute('hidden', 'hidden');
        fragment.querySelector('[data-role="error"]')?.removeAttribute('hidden');
        console.warn('[FOX FeaturedProduct] Unable to load product fragment.', error);
      }
    }

    #refreshZoom() {
      this.querySelectorAll('image-zoom').forEach((element) => {
        element.dataset.zoomScale = this.dataset.zoomScale || element.dataset.zoomScale || '2';
        element.dataset.zoomDisabled = this.dataset.zoomDisabled || 'false';
        element.refresh?.();
      });
      this.addEventListener('product:variant-change', () => {
        this.querySelectorAll('image-zoom').forEach((element) => element.refresh?.());
      }, { signal: this.#abortController.signal });
      this.addEventListener('slider:change', () => {
        this.querySelectorAll('image-zoom').forEach((element) => element.refresh?.());
      }, { signal: this.#abortController.signal });
    }
  }

  if (!customElements.get('fox-featured-product')) customElements.define('fox-featured-product', FeaturedProduct);
}());
