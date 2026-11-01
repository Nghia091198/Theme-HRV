(() => {
  const DEFAULT_VARIANT_TITLE = 'Default Title';

  // Display-only companion of product-component (snippets/product-sticky-buy.liquid sits inside it):
  // option selects, quantity buttons and <add-to-cart> are handled by core-commerce-product.js.
  class StickyBuy extends HTMLElement {
    #abortController = null;
    #observer = null;
    #product = null;
    #purchase = null;
    #bar = null;
    #sheet = null;
    #openToggle = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#product = this.closest('product-component');
      this.#purchase = this.#product?.querySelector('[data-role="purchase"]');
      this.#bar = this.querySelector('[data-role="sticky-bar"]');
      this.#sheet = this.querySelector('modal-component');
      if (!this.#product || !this.#purchase || !this.#bar) {
        this.dataset.state = 'error';
        console.warn('[StickyBuy] Must be placed inside product-component with a [data-role="purchase"] block.');
        return;
      }

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.#product.addEventListener('product:variant-change', (event) => this.#syncVariant(event.detail.variant), { signal });
      this.#product.addEventListener('product:variant-unavailable', () => this.#syncVariant(null), { signal });
      this.#product.addEventListener('input', (event) => {
        if (event.target.matches('[data-role="quantity"]')) this.#syncQuantity();
      }, { signal });
      this.addEventListener('click', (event) => this.#handleClick(event), { signal });
      this.addEventListener('keydown', (event) => this.#handleKeydown(event), { signal });
      document.addEventListener('click', (event) => {
        if (this.#openToggle && !this.#openToggle.closest('.fox-sticky-buy__option')?.contains(event.target)) this.#closeMenu(false);
      }, { signal });
      document.addEventListener('cart:added', () => this.#sheet?.close?.('cart-added'), { signal });
      window.addEventListener('resize', () => this.#syncOffset(), { passive: true, signal });

      this.#observer = new IntersectionObserver(([entry]) => {
        // Show only once the original purchase block has scrolled above the viewport.
        const passed = !entry.isIntersecting && entry.boundingClientRect.bottom < 0;
        this.#setVisible(passed && !this.#purchase.hidden);
      });
      this.#observer.observe(this.#purchase);

      this.#syncVariant(this.#product.selectedVariant);
      this.#syncQuantity();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#observer?.disconnect();
      this.#observer = null;
      this.#openToggle = null;
      document.documentElement.style.removeProperty('--fox-sticky-buy-offset');
      this.dataset.state = 'idle';
    }

    #handleClick(event) {
      const toggle = event.target.closest('[data-action="toggle-option"]');
      if (toggle && this.contains(toggle)) {
        event.preventDefault();
        this.#toggleMenu(toggle);
        return;
      }

      // Value buttons are [data-option-value]: product-component selects the variant; we only close the menu.
      const item = event.target.closest('[data-role="option-menu"] [data-option-value]');
      if (item && this.contains(item)) {
        this.#closeMenu(true);
        return;
      }

      const trigger = event.target.closest('[data-action="open-sheet"]');
      if (!trigger || !this.contains(trigger) || typeof this.#sheet?.open !== 'function') return;
      event.preventDefault();
      this.#sheet.open(trigger);
      this.#emit('sticky-buy:open');
    }

    #toggleMenu(toggle) {
      const menu = document.getElementById(toggle.getAttribute('aria-controls'));
      if (!menu) return;
      const wasOpen = toggle.getAttribute('aria-expanded') === 'true';
      this.#closeMenu(false);
      if (wasOpen) return;

      toggle.setAttribute('aria-expanded', 'true');
      menu.hidden = false;
      this.#openToggle = toggle;
      const active = menu.querySelector('[data-option-value].is-active:not(:disabled)')
        || menu.querySelector('[data-option-value]:not(:disabled)');
      active?.focus();
    }

    #closeMenu(restoreFocus) {
      const toggle = this.#openToggle;
      if (!toggle) return;
      const menu = document.getElementById(toggle.getAttribute('aria-controls'));
      toggle.setAttribute('aria-expanded', 'false');
      if (menu) menu.hidden = true;
      this.#openToggle = null;
      if (restoreFocus) toggle.focus();
    }

    #handleKeydown(event) {
      if (!this.#openToggle) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        this.#closeMenu(true);
        return;
      }
      if (!['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(event.key)) return;

      const menu = document.getElementById(this.#openToggle.getAttribute('aria-controls'));
      const items = [...(menu?.querySelectorAll('[data-option-value]:not(:disabled)') || [])];
      if (!items.length) return;
      event.preventDefault();
      const current = items.indexOf(document.activeElement);
      let next = 0;
      if (event.key === 'End') next = items.length - 1;
      else if (event.key === 'ArrowDown') next = current < 0 ? 0 : (current + 1) % items.length;
      else if (event.key === 'ArrowUp') next = current <= 0 ? items.length - 1 : current - 1;
      items[next].focus();
    }

    #setVisible(visible) {
      if (this.dataset.visible === String(visible)) return;
      if (!visible) this.#closeMenu(false);
      this.dataset.visible = String(visible);
      this.#bar.inert = !visible;
      this.#syncOffset();
      this.#emit('sticky-buy:visibility', { visible });
    }

    // Floating widgets (contact dock, back to top, chat button) lift above the bar.
    #syncOffset() {
      const visible = this.dataset.visible === 'true';
      const height = visible ? this.#bar.getBoundingClientRect().height : 0;
      const gap = visible ? 8 : 0;
      document.documentElement.style.setProperty('--fox-sticky-buy-offset', `${Math.round(height + gap)}px`);
    }

    #syncVariant(variant) {
      const mainPrice = this.#product.querySelector('[data-role="price"]');
      const mainCompare = this.#product.querySelector('[data-role="compare-price"]');
      this.querySelectorAll('[data-role="sticky-price"]').forEach((price) => {
        price.textContent = mainPrice?.textContent || '';
      });
      this.querySelectorAll('[data-role="sticky-compare"]').forEach((compare) => {
        compare.textContent = mainCompare?.textContent || '';
        compare.hidden = Boolean(mainCompare?.hidden) || !mainCompare?.textContent;
      });

      const label = this.querySelector('[data-role="sticky-variant"]');
      if (label) {
        const options = Array.isArray(variant?.options)
          ? variant.options
          : [variant?.option1, variant?.option2, variant?.option3].filter(Boolean);
        label.textContent = !variant
          ? 'Chọn phân loại'
          : options.filter((value) => value && value !== DEFAULT_VARIANT_TITLE).join(' · ');
      }
    }

    #syncQuantity() {
      const quantity = Math.max(1, parseInt(this.#product.querySelector('[data-role="quantity"]')?.value, 10) || 1);
      this.querySelectorAll('[data-role="sticky-quantity"]').forEach((output) => {
        output.textContent = String(quantity);
      });
      this.querySelectorAll('[data-role="sticky-minus"]').forEach((button) => {
        button.disabled = quantity <= 1;
      });
    }

    #emit(type, detail = {}) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
    }
  }

  if (!customElements.get('sticky-buy')) {
    customElements.define('sticky-buy', StickyBuy);
  }
})();
