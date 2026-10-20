(() => {
  const tagName = 'fox-footer-menu';

  if (!('customElements' in window) || customElements.get(tagName)) return;

  class FoxFooterMenu extends HTMLElement {
    #controller = null;
    #details = null;
    #mediaQuery = null;
    #mobileOpen = false;
    #summary = null;

    connectedCallback() {
      this.disconnectedCallback();

      this.#details = this.querySelector(':scope > details');
      this.#summary = this.#details?.querySelector(':scope > summary');

      if (!this.#details || !this.#summary || typeof window.matchMedia !== 'function') {
        this.dataset.state = 'error';
        return;
      }

      this.#controller = new AbortController();
      this.#mediaQuery = window.matchMedia('(max-width: 767px)');
      this.#mobileOpen = this.hasAttribute('open-default-mobile') || this.#details.open;

      this.#details.addEventListener('toggle', this.#handleToggle, {
        signal: this.#controller.signal,
      });
      this.#summary.addEventListener('click', this.#handleSummaryClick, {
        signal: this.#controller.signal,
      });

      if (typeof this.#mediaQuery.addEventListener === 'function') {
        this.#mediaQuery.addEventListener('change', this.#handleMediaChange);
      } else {
        this.#mediaQuery.addListener(this.#handleMediaChange);
      }

      this.#syncMode();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#controller?.abort();

      if (this.#mediaQuery) {
        if (typeof this.#mediaQuery.removeEventListener === 'function') {
          this.#mediaQuery.removeEventListener('change', this.#handleMediaChange);
        } else {
          this.#mediaQuery.removeListener(this.#handleMediaChange);
        }
      }

      this.#summary?.removeAttribute('aria-disabled');
      this.#summary?.removeAttribute('aria-expanded');
      this.#summary?.removeAttribute('tabindex');
      this.removeAttribute('data-mode');
      this.removeAttribute('data-open');

      this.#controller = null;
      this.#details = null;
      this.#mediaQuery = null;
      this.#summary = null;
      this.dataset.state = 'idle';
    }

    #handleMediaChange = () => {
      this.setAttribute('resized', '');
      this.#syncMode();
    };

    #handleSummaryClick = (event) => {
      if (!this.#mediaQuery?.matches || this.hasAttribute('break')) {
        event.preventDefault();
      }
    };

    #handleToggle = () => {
      if (!this.#details || !this.#mediaQuery) return;

      if (!this.#mediaQuery.matches) {
        if (!this.#details.open) this.#syncMode();
        return;
      }

      this.#mobileOpen = this.#details.open;
      this.#syncState();
    };

    #syncMode() {
      if (!this.#details || !this.#mediaQuery || !this.#summary) return;

      const isMobile = this.#mediaQuery.matches;
      const forcedOpen = this.hasAttribute('break') || this.hasAttribute('open-default-mobile');

      this.dataset.mode = isMobile ? 'mobile' : 'desktop';

      if (isMobile) {
        this.#details.open = forcedOpen || this.#mobileOpen;
        this.#summary.removeAttribute('aria-disabled');
        this.#summary.removeAttribute('tabindex');
      } else {
        this.#details.open = true;
        this.#summary.setAttribute('aria-disabled', 'true');
        this.#summary.setAttribute('tabindex', '-1');
      }

      this.#syncState();
    }

    #syncState() {
      if (!this.#details || !this.#summary) return;

      const isOpen = this.#details.open;
      this.#summary.setAttribute('aria-expanded', String(isOpen));
      this.toggleAttribute('data-open', isOpen);
    }
  }

  customElements.define(tagName, FoxFooterMenu);
})(); 
