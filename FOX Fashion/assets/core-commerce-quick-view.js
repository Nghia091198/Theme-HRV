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
    #resizeObserver = null;
    #scrollbar = null;
    #scrollbarThumb = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#modal = this.querySelector('modal-component');
      this.#content = this.querySelector('[data-role="content"]');
      this.#loading = this.querySelector('[data-role="loading"]');
      this.#error = this.querySelector('[data-role="error"]');
      this.#scrollbar = this.querySelector('[data-role="scrollbar"]');
      this.#scrollbarThumb = this.querySelector('[data-role="scrollbar-thumb"]');
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
      this.#content.addEventListener('scroll', () => this.#updateScrollbar(), {
        passive: true,
        signal: this.#abortController.signal,
      });
      if ('ResizeObserver' in window) {
        this.#resizeObserver = new ResizeObserver(() => this.#updateScrollbar());
        this.#resizeObserver.observe(this.#content);
      }
      this.dataset.state = 'idle';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#requestController?.abort();
      this.#resizeObserver?.disconnect();
      this.#abortController = null;
      this.#requestController = null;
      this.#resizeObserver = null;
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

        await this.#modal.open(trigger);
        requestAnimationFrame(() => this.#updateScrollbar());
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

    #updateScrollbar() {
      if (!this.#scrollbar || !this.#scrollbarThumb || !this.#content) return;
      const { clientHeight, scrollHeight, scrollTop } = this.#content;
      const scrollRange = scrollHeight - clientHeight;
      this.#scrollbar.hidden = scrollRange <= 1;
      if (scrollRange <= 1) return;

      const thumbSize = Math.max(0.12, clientHeight / scrollHeight);
      const trackHeight = this.#scrollbar.clientHeight;
      const thumbHeight = trackHeight * thumbSize;
      const thumbOffset = (scrollTop / scrollRange) * Math.max(0, trackHeight - thumbHeight);
      this.#scrollbar.style.setProperty('--fox-quick-view-scroll-thumb-size', `${thumbSize * 100}%`);
      this.#scrollbar.style.setProperty('--fox-quick-view-scroll-thumb-offset', `${thumbOffset}px`);
    }
  }

  if (!customElements.get('quick-view-component')) {
    customElements.define('quick-view-component', QuickViewComponent);
  }
}());
