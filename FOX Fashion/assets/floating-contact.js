(() => {
  const VISIBLE_AFTER_VIEWPORT = 0.6; 

  class FloatingContact extends HTMLElement {
    #abortController = null;
    #frame = 0;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;

      this.addEventListener('click', (event) => this.#handleClick(event), { signal });
      this.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && this.dataset.dockOpen === 'true') this.#setDockOpen(false, true);
      }, { signal });
      document.addEventListener('click', (event) => {
        if (this.dataset.dockOpen === 'true' && !event.target.closest('.fox-float__toggle, .fox-float__dock')) this.#setDockOpen(false, false);
      }, { signal });
      window.addEventListener('scroll', () => this.#scheduleUpdate(), { passive: true, signal });
      window.addEventListener('resize', () => this.#scheduleUpdate(), { passive: true, signal });
      this.#setDockOpen(false, false);
      this.#update();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      window.cancelAnimationFrame(this.#frame);
      this.#frame = 0;
      this.dataset.state = 'idle';
    }

    #handleClick(event) {
      const trigger = event.target.closest('[data-action]');
      if (!trigger || !this.contains(trigger)) return;

      if (trigger.dataset.action === 'toggle-dock') {
        event.preventDefault();
        this.#setDockOpen(this.dataset.dockOpen !== 'true', false);
        return;
      }

      if (trigger.dataset.action === 'back-to-top') {
        const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
        this.#emit('floating-contact:back-to-top');
        return;
      }

      if (trigger.dataset.action === 'open-sheet') {
        const modal = this.querySelector('modal-component');
        if (typeof modal?.open !== 'function') return;
        modal.open(trigger);
        this.#emit('floating-contact:open');
      }
    }

    // Grouped dock ("Gom icon?"): one toggle reveals the channel list; closed list is inert.
    #setDockOpen(open, restoreFocus) {
      const toggle = this.querySelector('[data-action="toggle-dock"]');
      const dock = this.querySelector('.fox-float__dock');
      if (!toggle || !dock) return;
      this.dataset.dockOpen = open ? 'true' : 'false';
      toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      toggle.setAttribute('aria-label', open ? toggle.dataset.labelClose : toggle.dataset.labelOpen);
      dock.inert = !open;
      if (restoreFocus) toggle.focus();
      this.#emit('floating-contact:dock', { open });
    }

    #scheduleUpdate() {
      if (this.#frame) return;
      this.#frame = window.requestAnimationFrame(() => {
        this.#frame = 0;
        this.#update();
      });
    }

    #update() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const scrollable = Math.max(document.documentElement.scrollHeight - window.innerHeight, 1);
      const progress = Math.min(Math.max(scrollTop / scrollable, 0), 1);
      const visible = scrollTop > window.innerHeight * VISIBLE_AFTER_VIEWPORT;

      this.style.setProperty('--fox-float-progress', progress.toFixed(3));
      if (this.dataset.visible !== String(visible)) {
        this.dataset.visible = String(visible);
        if (!visible && this.dataset.dockOpen === 'true') this.#setDockOpen(false, false);
        this.#emit('floating-contact:visibility', { visible });
      }
    }

    #emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
    }
  }

  if (!customElements.get('floating-contact')) {
    customElements.define('floating-contact', FloatingContact);
  }
})();
