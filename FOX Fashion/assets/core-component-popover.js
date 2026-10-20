class FoxPopover extends HTMLElement {
  static cache = new Map();

  #abort = null;
  #requestController = null;
  #panel = null;
  #content = null;
  #activeTrigger = null;
  #popper = null;

  connectedCallback() {
    this.#abort?.abort();
    this.#abort = new AbortController();
    const { signal } = this.#abort;

    this.#panel = this.querySelector('[data-popover-panel]');
    this.#content = this.#panel?.querySelector('[data-popover-content]') || null;
    if (!this.#panel || !this.#content) {
      this.dataset.state = 'error';
      return;
    }

    this.addEventListener('click', (event) => {
      const trigger = event.target.closest('[data-popover-trigger]');
      if (trigger && this.contains(trigger)) {
        event.preventDefault();
        this.toggle(trigger);
        return;
      }
      if (event.target.closest('[data-popover-close]')) this.close({ restoreFocus: true });
    }, { signal });

    document.addEventListener('pointerdown', (event) => {
      if (!this.#activeTrigger || this.contains(event.target)) return;
      this.close({ restoreFocus: false });
    }, { signal });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.#activeTrigger) this.close({ restoreFocus: true });
    }, { signal });

    window.addEventListener('resize', () => this.reposition(), { passive: true, signal });
    window.addEventListener('scroll', () => this.reposition(), { passive: true, capture: true, signal });
    this.dataset.state = 'ready';
  }

  disconnectedCallback() {
    this.close({ restoreFocus: false });
    this.#requestController?.abort();
    this.#abort?.abort();
    this.#abort = null;
    this.dataset.state = 'idle';
  }

  async open(trigger) {
    if (!trigger || !this.#panel || !this.#content) return;
    if (this.#activeTrigger && this.#activeTrigger !== trigger) this.close({ restoreFocus: false });

    this.#activeTrigger = trigger;
    trigger.setAttribute('aria-expanded', 'true');
    this.#panel.hidden = false;
    this.#panel.dataset.state = 'loading';
    this.#position(trigger);
    this.#emit('popover:opening', { trigger });

    const sourceUrl = trigger.dataset.popoverUrl || '';
    const directUrl = trigger.dataset.productUrl || sourceUrl;
    try {
      const handle = FoxPopover.productHandle(sourceUrl);
      if (!handle) throw new Error('invalid-product-url');
      const html = await this.#load(handle);
      if (this.#activeTrigger !== trigger) return;
      this.#content.innerHTML = html;
      this.#panel.dataset.state = 'open';
      this.#panel.setAttribute('aria-busy', 'false');
      this.reposition();
      this.#content.querySelectorAll('img').forEach((image) => {
        if (!image.complete) image.addEventListener('load', () => this.reposition(), { once: true });
      });
      this.#emit('popover:opened', { trigger, handle });
    } catch (error) {
      if (error.name === 'AbortError' && !this.#activeTrigger) return;
      FoxPopover.cache.delete(FoxPopover.productHandle(sourceUrl));
      this.#content.innerHTML = `<div data-popover-error><p>Không thể tải sản phẩm.</p><a href="${FoxPopover.safeUrl(directUrl)}">Xem sản phẩm</a></div>`;
      this.#panel.dataset.state = 'error';
      this.#panel.setAttribute('aria-busy', 'false');
      this.reposition();
      this.#emit('popover:error', { trigger, reason: error.message });
    }
  }

  close({ restoreFocus = false } = {}) {
    const trigger = this.#activeTrigger;
    this.#requestController?.abort();
    this.#requestController = null;
    this.#destroyPosition();
    if (trigger) trigger.setAttribute('aria-expanded', 'false');
    if (this.#panel) {
      this.#panel.dataset.state = 'idle';
      this.#panel.hidden = true;
      this.#panel.setAttribute('aria-busy', 'false');
    }
    this.#activeTrigger = null;
    if (restoreFocus && trigger?.isConnected) trigger.focus();
    if (trigger) this.#emit('popover:closed', { trigger });
  }

  toggle(trigger) {
    if (this.#activeTrigger === trigger) this.close({ restoreFocus: true });
    else this.open(trigger);
  }

  reposition() {
    if (!this.#activeTrigger || !this.#panel) return;
    if (this.#popper?.scheduleUpdate) this.#popper.scheduleUpdate();
    else this.#fallbackPosition(this.#activeTrigger);
  }

  async #load(handle) {
    if (FoxPopover.cache.has(handle)) return FoxPopover.cache.get(handle);
    this.#requestController?.abort();
    this.#requestController = new AbortController();
    this.#panel.setAttribute('aria-busy', 'true');
    this.#content.innerHTML = '<div data-popover-loading>Đang tải sản phẩm...</div>';

    const timeout = window.setTimeout(() => this.#requestController?.abort(), 10000);
    const request = fetch(`/products/${encodeURIComponent(handle)}?view=lookbook-card`, {
      signal: this.#requestController.signal,
      headers: { 'X-Requested-With': 'XMLHttpRequest' },
    }).then(async (response) => {
      if (!response.ok) throw new Error(`http-${response.status}`);
      const html = (await response.text()).trim();
      if (!html) throw new Error('empty-response');
      return html;
    }).finally(() => window.clearTimeout(timeout));

    FoxPopover.cache.set(handle, request);
    return request;
  }

  #position(trigger) {
    this.#destroyPosition();
    if (typeof window.Popper === 'function') {
      this.#panel.style.position = '';
      this.#popper = new window.Popper(trigger, this.#panel, {
        placement: this.dataset.placement || 'auto',
        positionFixed: true,
        eventsEnabled: true,
        modifiers: {
          offset: { offset: '0,12' },
          flip: { boundariesElement: 'viewport', padding: 12 },
          preventOverflow: { boundariesElement: 'viewport', padding: 12 },
          arrow: { element: '[data-popover-arrow]' },
        },
      });
      return;
    }
    this.#fallbackPosition(trigger);
  }

  #fallbackPosition(trigger) {
    const anchor = trigger.getBoundingClientRect();
    const panel = this.#panel.getBoundingClientRect();
    const gap = 12;
    const padding = 12;
    const spaceBelow = window.innerHeight - anchor.bottom;
    const useTop = spaceBelow < panel.height + gap && anchor.top > spaceBelow;
    const top = useTop ? anchor.top - panel.height - gap : anchor.bottom + gap;
    const left = anchor.left + anchor.width / 2 - panel.width / 2;
    this.#panel.style.position = 'fixed';
    this.#panel.style.top = `${Math.max(padding, Math.min(top, window.innerHeight - panel.height - padding))}px`;
    this.#panel.style.left = `${Math.max(padding, Math.min(left, window.innerWidth - panel.width - padding))}px`;
    this.#panel.setAttribute('x-placement', useTop ? 'top' : 'bottom');
  }

  #destroyPosition() {
    this.#popper?.destroy?.();
    this.#popper = null;
    if (this.#panel) {
      this.#panel.style.top = '';
      this.#panel.style.left = '';
      this.#panel.style.transform = '';
      this.#panel.removeAttribute('x-placement');
    }
  }

  #emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
  }

  static productHandle(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      const parts = url.pathname.split('/').filter(Boolean);
      const productIndex = parts.indexOf('products');
      if (productIndex === -1 || !parts[productIndex + 1]) return '';
      const handle = decodeURIComponent(parts[productIndex + 1]);
      return /^[a-zA-Z0-9_-]+$/.test(handle) ? handle : '';
    } catch (error) {
      return '';
    }
  }

  static safeUrl(value) {
    try {
      const url = new URL(value, window.location.origin);
      return url.protocol === 'http:' || url.protocol === 'https:' ? url.href : '#';
    } catch (error) {
      return '#';
    }
  }
}

if (!customElements.get('fox-popover')) customElements.define('fox-popover', FoxPopover);
