(() => {
  const TRANSITION_MS = 360;

  function FOXExpandConfig() {
    return window.FOX?.config?.expandContent || {};
  }

  // "Xem thêm / Thu gọn" block (snippets/component-expand-content.liquid).
  // Height limit: data-max-height > preset (window.FOX.config.expandContent.presets) > defaultHeight.
  // Re-measures on resize (ResizeObserver: tab shown, images loaded, viewport change) and on tabs:change.
  class ExpandContent extends HTMLElement {
    #abortController = null;
    #resizeObserver = null;
    #frame = 0;
    #timer = 0;
    #expanded = false;
    #viewport = null;
    #content = null;
    #toggle = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#viewport = this.querySelector('[data-role="viewport"]');
      this.#content = this.querySelector('[data-role="content"]');
      this.#toggle = this.querySelector('[data-role="toggle"]');
      if (!this.#viewport || !this.#content || !this.#toggle) {
        this.dataset.state = 'error';
        return;
      }

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.#toggle.addEventListener('click', () => this.toggle(), { signal });
      document.addEventListener('tabs:change', (event) => {
        if (event.target instanceof Node && event.target.contains(this)) this.refresh();
      }, { signal });

      if ('ResizeObserver' in window) {
        this.#resizeObserver = new ResizeObserver(() => this.refresh());
        this.#resizeObserver.observe(this.#content);
        this.#resizeObserver.observe(this);
      }
      this.refresh();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#resizeObserver?.disconnect();
      this.#resizeObserver = null;
      window.cancelAnimationFrame(this.#frame);
      window.clearTimeout(this.#timer);
    }

    get limit() {
      const config = FOXExpandConfig();
      const own = parseInt(this.dataset.maxHeight, 10);
      if (own > 0) return own;
      const preset = parseInt(config.presets?.[this.dataset.preset], 10);
      if (preset > 0) return preset;
      return parseInt(config.defaultHeight, 10) || 360;
    }

    // Public: call after the content changes (also runs automatically on resize and tab change).
    refresh() {
      window.cancelAnimationFrame(this.#frame);
      this.#frame = window.requestAnimationFrame(() => this.#measure());
    }

    toggle(force) {
      const expand = typeof force === 'boolean' ? force : !this.#expanded;
      if (expand === this.#expanded || this.dataset.state === 'full') return;
      if (expand) this.#expand();
      else this.#collapse();
    }

    #measure() {
      if (!this.isConnected || this.offsetWidth === 0) return;
      const limit = this.limit;
      const tolerance = parseInt(FOXExpandConfig().tolerance, 10) || 0;
      const height = this.#content.scrollHeight;

      if (height <= limit + tolerance) {
        this.#expanded = false;
        this.#viewport.style.maxHeight = '';
        this.#toggle.hidden = true;
        this.dataset.state = 'full';
        return;
      }

      this.#toggle.hidden = false;
      if (this.#expanded) {
        this.dataset.state = 'expanded';
        return;
      }
      this.#viewport.style.maxHeight = `${limit}px`;
      this.dataset.state = 'collapsed';
      this.#syncToggle();
    }

    #expand() {
      this.#expanded = true;
      this.#viewport.style.maxHeight = `${this.#content.scrollHeight}px`;
      this.dataset.state = 'expanded';
      this.#syncToggle();
      window.clearTimeout(this.#timer);
      // Drop the limit after the transition so later content changes are never clipped.
      this.#timer = window.setTimeout(() => {
        if (this.#expanded) this.#viewport.style.maxHeight = 'none';
      }, TRANSITION_MS);
      this.dispatchEvent(new CustomEvent('expand-content:toggle', { bubbles: true, detail: { expanded: true } }));
    }

    #collapse() {
      this.#expanded = false;
      window.clearTimeout(this.#timer);
      this.#viewport.style.maxHeight = `${this.#content.scrollHeight}px`;
      void this.#viewport.offsetHeight;
      this.#viewport.style.maxHeight = `${this.limit}px`;
      this.dataset.state = 'collapsed';
      this.#syncToggle();
      const top = this.getBoundingClientRect().top;
      if (top < 0) {
        const offset = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--fox-header-height'), 10) || 80;
        window.scrollBy({ top: top - offset, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
      }
      this.dispatchEvent(new CustomEvent('expand-content:toggle', { bubbles: true, detail: { expanded: false } }));
    }

    #syncToggle() {
      const config = FOXExpandConfig();
      const label = this.querySelector('[data-role="toggle-label"]');
      if (label) label.textContent = this.#expanded ? (config.labelLess || 'Thu gọn') : (config.labelMore || 'Xem thêm');
      this.#toggle.setAttribute('aria-expanded', String(this.#expanded));
    }
  }

  window.FOX = window.FOX || {};
  window.FOX.expandContent = {
    // Re-measure every block inside root (e.g. after replacing collection content with AJAX).
    refresh(root = document) {
      root.querySelectorAll('expand-content').forEach((block) => block.refresh?.());
    },
  };

  if (!customElements.get('expand-content')) customElements.define('expand-content', ExpandContent);
})();
