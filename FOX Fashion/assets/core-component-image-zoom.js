(function () {
  const root = window.FOX = window.FOX || {};

  class ImageZoom extends HTMLElement {
    #abortController = null;
    #pane = null;
    #lens = null;
    #source = null;
    #fadeTargets = [];
    #scope = null;
    #target = null;
    #raf = 0;
    #positionRaf = 0;
    #positionDebounce = 0;
    #fadeTimer = 0;
    #initialized = false;

    connectedCallback() {
      if (this.#initialized) return;
      this.#initialized = true;
      this.#bind();
    }

    disconnectedCallback() {
      this.destroy();
    }

    refresh() {
      this.#close();
      this.#bind(true);
    }

    destroy() {
      this.#close();
      this.#abortController?.abort();
      this.#abortController = null;
      this.#source = null;
      this.#fadeTargets = [];
      this.#scope = null;
      this.#target = null;
      this.#initialized = false;
      this.dataset.state = 'idle';
      this.dispatchEvent(new CustomEvent('image-zoom:destroy', { bubbles: true, composed: true, detail: { component: this } }));
    }

    #bind(rebind = false) {
      if (rebind) this.#abortController?.abort();
      this.#abortController = new AbortController();
      const source = this.querySelector('[data-role="zoom-source"]');
      const scope = this.closest('[data-zoom-scope]') || document;
      const target = scope.querySelector(this.dataset.zoomTarget || '') || document.querySelector(this.dataset.zoomTarget || '');
      const minWidth = Number(this.dataset.zoomMinWidth || 1024);
      const minSourceWidth = Number(this.dataset.zoomMinSourceWidth || 800);
      this.#source = source instanceof HTMLImageElement ? source : null;
      this.#scope = scope instanceof HTMLElement ? scope : null;
      this.#target = target instanceof HTMLElement ? target : null;
      this.#fadeTargets = this.#resolveFadeTargets();
      if (!this.#source || !target || this.dataset.zoomDisabled === 'true') {
        this.dataset.state = 'disabled';
        return;
      }
      const signal = this.#abortController.signal;
      this.addEventListener('pointerenter', () => {
        if (!this.#canZoom(minWidth, minSourceWidth)) return;
        this.#open(target);
      }, { signal });
      this.addEventListener('pointermove', (event) => this.#move(event), { signal });
      this.addEventListener('pointerleave', () => this.#close(), { signal });
      this.#source.addEventListener('load', () => {
        this.dataset.state = this.#canZoom(minWidth, minSourceWidth) ? 'ready' : 'disabled';
      }, { signal });
      window.addEventListener('scroll', () => this.#schedulePosition(), { passive: true, signal });
      window.addEventListener('resize', () => this.#schedulePosition(), { passive: true, signal });
      this.dataset.state = this.#canZoom(minWidth, minSourceWidth) ? 'ready' : 'disabled';
    }

    #resolveFadeTargets() {
      const scope = this.closest('[data-zoom-scope]') || document;
      return String(this.dataset.zoomFadeTarget || '').split(',').map((selector) => selector.trim()).filter(Boolean).flatMap((selector) => {
        try { return [...scope.querySelectorAll(selector)]; } catch (error) { return []; }
      });
    }

    #canZoom(minWidth, minSourceWidth) {
      const hasDeferredZoomSource = Boolean(this.#source?.dataset.zoomSrc);
      const displaySourceIsLargeEnough = this.#source?.complete && this.#source.naturalWidth >= minSourceWidth;
      return window.matchMedia('(pointer: fine)').matches && window.innerWidth >= minWidth && (hasDeferredZoomSource || displaySourceIsLargeEnough);
    }

    #open(target) {
      if (this.#pane || !this.#source) return;
      this.#pane = document.createElement('div');
      this.#pane.className = 'core-image-zoom__pane';
      this.#pane.setAttribute('aria-hidden', 'true');
      const image = document.createElement('img');
      const fallbackSrc = this.#source.currentSrc || this.#source.src;
      const zoomSrc = this.#source.dataset.zoomSrc;
      image.src = zoomSrc || fallbackSrc;
      if (zoomSrc) {
        image.addEventListener('error', () => {
          image.src = fallbackSrc;
        }, { once: true });
      }
      image.alt = '';
      this.#pane.appendChild(image);
      this.#lens = document.createElement('span');
      this.#lens.className = 'core-image-zoom__lens';
      this.#lens.setAttribute('aria-hidden', 'true');
      this.#lens.style.opacity = '1';
      this.appendChild(this.#lens);
      if (!this.#scope) return;
      this.#scope.appendChild(this.#pane);
      this.#schedulePosition();
      requestAnimationFrame(() => this.#pane?.classList.add('is-visible'));
      this.#fadeTargets.forEach((element) => element.dataset.zoomFaded = 'true');
      this.dataset.state = 'active';
      this.dispatchEvent(new CustomEvent('image-zoom:open', { bubbles: true, composed: true, detail: { component: this, source: image.src } }));
    }

    #positionPane() {
      if (!this.#pane || !this.#target) return;
      const targetRect = this.#target.getBoundingClientRect();
      const edge = 16;
      const size = Math.min(targetRect.width, Math.max(0, window.innerHeight - edge * 2));
      const top = Math.max(edge, Math.min(targetRect.top, window.innerHeight - size - edge));
      const left = Math.max(edge, Math.min(targetRect.left, window.innerWidth - size - edge));
      this.#pane.style.position = 'fixed';
      // Keep layout coordinates stable and move the fixed pane on the compositor.
      this.#pane.style.left = '0px';
      this.#pane.style.top = '0px';
      this.#pane.style.transform = `translate3d(${left}px, ${top}px, 0)`;
      this.#pane.style.width = `${size}px`;
      this.#pane.style.height = `${size}px`;
    }

    #schedulePosition() {
      clearTimeout(this.#positionDebounce);
      this.#positionDebounce = window.setTimeout(() => {
        this.#positionDebounce = 0;
        if (this.#positionRaf) return;
        this.#positionRaf = requestAnimationFrame(() => {
          this.#positionRaf = 0;
          this.#positionPane();
        });
      }, 12);
    }

    #move(event) {
      if (!this.#pane || !this.#source) return;
      if (this.#raf) cancelAnimationFrame(this.#raf);
      this.#raf = requestAnimationFrame(() => {
        const rect = this.getBoundingClientRect();
        const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width));
        const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height));
        const image = this.#pane.querySelector('img');
        const scale = Math.max(1.25, Number(this.dataset.zoomScale || 2));
        const lensWidth = this.#lens?.offsetWidth || rect.width / scale;
        const lensHeight = this.#lens?.offsetHeight || rect.height / scale;
        if (this.#lens) {
          const lensLeft = Math.max(0, Math.min(rect.width - lensWidth, event.clientX - rect.left - lensWidth / 2));
          const lensTop = Math.max(0, Math.min(rect.height - lensHeight, event.clientY - rect.top - lensHeight / 2));
          this.#lens.style.left = '0px';
          this.#lens.style.top = '0px';
          this.#lens.style.transform = `translate3d(${lensLeft}px, ${lensTop}px, 0)`;
        }
        image.style.width = `${scale * 100}%`;
        image.style.height = `${scale * 100}%`;
        const overflowX = this.#pane.clientWidth * (scale - 1);
        const overflowY = this.#pane.clientHeight * (scale - 1);
        image.style.transform = `translate3d(${-overflowX * x}px, ${-overflowY * y}px, 0)`;
        this.dispatchEvent(new CustomEvent('image-zoom:move', { bubbles: true, composed: true, detail: { component: this, x, y } }));
        this.#raf = 0;
      });
    }

    #close() {
      if (this.#raf) cancelAnimationFrame(this.#raf);
      if (this.#positionRaf) cancelAnimationFrame(this.#positionRaf);
      clearTimeout(this.#positionDebounce);
      clearTimeout(this.#fadeTimer);
      this.#raf = 0;
      this.#positionRaf = 0;
      const pane = this.#pane;
      if (pane) {
        pane.classList.remove('is-visible');
        this.#fadeTimer = window.setTimeout(() => pane.remove(), 180);
      }
      this.#pane = null;
      this.#lens?.remove();
      this.#lens = null;
      this.#fadeTargets.forEach((element) => delete element.dataset.zoomFaded);
      if (this.dataset.state === 'active') this.dataset.state = 'ready';
      this.dispatchEvent(new CustomEvent('image-zoom:close', { bubbles: true, composed: true, detail: { component: this } }));
    }
  }

  root.ImageZoom = ImageZoom;
  if (!customElements.get('image-zoom')) customElements.define('image-zoom', ImageZoom);
}());
