(() => {
  const SESSION_OFF = 'fox-recent-orders-off';
  const MAX_ROUNDS = 2;
  const RETRY_WHEN_BUSY = 4000;
  const LEAVE_MS = 320;

  const sessionOff = {
    get() { try { return sessionStorage.getItem(SESSION_OFF) === '1'; } catch { return false; } },
    set() { try { sessionStorage.setItem(SESSION_OFF, '1'); } catch {} },
  };

  const smallImage = (url) => {
    if (!url) return '';
    const clean = String(url).startsWith('//') ? `https:${url}` : String(url);
    return clean.replace(/(_(pico|icon|thumb|small|compact|medium|large|grande|master|\d+x\d+))?(\.(?:jpe?g|png|gif|webp))(\?.*)?$/i, '_compact$3$4');
  };

  const MINUTE = 60000;
  const HOUR = 60 * MINUTE;
  const DAY = 24 * HOUR;

  // Order time entered in settings: "dd/mm/yyyy hh:mm", "dd/mm/yyyy" or "yyyy-mm-dd hh:mm" (shop's local time).
  const parseOrderTime = (value) => {
    const text = String(value || '').trim();
    let match = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(?:\s+(\d{1,2}):(\d{2}))?$/);
    let parts = match ? [match[3], match[2], match[1], match[4], match[5]] : null;
    if (!parts) {
      match = text.match(/^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2}))?$/);
      parts = match ? [match[1], match[2], match[3], match[4], match[5]] : null;
    }
    if (!parts) return null;
    const [year, month, day, hour = 0, minute = 0] = parts.map((part) => Number(part || 0));
    const date = new Date(year, month - 1, day, hour, minute);
    return date.getMonth() === month - 1 && date.getDate() === day ? date.getTime() : null;
  };

  const relativeTime = (elapsed) => {
    if (elapsed < MINUTE) return 'Vừa xong';
    if (elapsed < HOUR) return `${Math.floor(elapsed / MINUTE)} phút trước`;
    if (elapsed < DAY) return `${Math.floor(elapsed / HOUR)} giờ trước`;
    if (elapsed < 2 * DAY) return 'Hôm qua';
    return `${Math.floor(elapsed / DAY)} ngày trước`;
  };

  class RecentOrders extends HTMLElement {
    #abort = null;
    #timer = 0;
    #items = [];
    #index = 0;
    #shown = 0;
    #hovered = false;
    #card = null;
    #products = new Map();

    connectedCallback() {
      if (sessionOff.get()) return;
      this.#items = [...this.querySelectorAll('[data-ro-item]')].map((node) => ({ ...node.dataset }));
      this.#card = this.querySelector('[data-ro-card]');
      if (!this.#items.length || !this.#card) return;
      this.#abort = new AbortController();
      const { signal } = this.#abort;

      this.querySelector('[data-ro-close]')?.addEventListener('click', () => this.#stop(true), { signal });
      this.#card.addEventListener('pointerenter', () => { this.#hovered = true; }, { signal });
      this.#card.addEventListener('pointerleave', () => { this.#hovered = false; }, { signal });
      this.#card.addEventListener('focusin', () => { this.#hovered = true; }, { signal });
      this.#card.addEventListener('focusout', () => { this.#hovered = false; }, { signal });

      this.#schedule(this.#seconds('delay', 8), () => this.#next());
    }

    disconnectedCallback() {
      clearTimeout(this.#timer);
      this.#abort?.abort();
      this.#abort = null;
    }

    #seconds(name, fallback) {
      const value = Number(this.dataset[name]);
      return (Number.isFinite(value) && value >= 0 ? value : fallback) * 1000;
    }

    #schedule(ms, fn) {
      clearTimeout(this.#timer);
      this.#timer = window.setTimeout(fn, ms);
    }

    async #next() {
      if (!this.#abort) return;
      if (this.#shown >= this.#items.length * MAX_ROUNDS) { this.#stop(false); return; }
      if (document.querySelector('dialog[open]') || document.hidden) {
        this.#schedule(RETRY_WHEN_BUSY, () => this.#next());
        return;
      }
      const item = this.#items[this.#index % this.#items.length];
      this.#index += 1;
      this.#shown += 1;
      const timeLabel = this.#timeLabel(item.time);
      if (timeLabel === false) { this.#schedule(0, () => this.#next()); return; }
      const product = await this.#product(item.handle);
      if (!this.#abort) return;
      if (!product) { this.#schedule(0, () => this.#next()); return; }
      this.#render(item, product, timeLabel);
      this.#show();
      this.#schedule(this.#seconds('duration', 6), () => this.#hideWhenFree());
    }

    // '' = no time line (empty or unreadable value); false = skip the entry for now: the order time has not come yet
    // (it shows by itself once that time passes) or the order is older than the limit.
    #timeLabel(value) {
      const orderedAt = parseOrderTime(value);
      if (orderedAt === null) return '';
      const elapsed = Date.now() - orderedAt;
      if (elapsed < 0) return false;
      const maxDays = Math.max(1, Number(this.dataset.maxDays) || 7);
      if (elapsed > maxDays * DAY) return false;
      return relativeTime(elapsed);
    }

    #hideWhenFree() {
      if (this.#hovered) { this.#schedule(1000, () => this.#hideWhenFree()); return; }
      this.#hide();
      this.#schedule(this.#seconds('gap', 12), () => this.#next());
    }

    async #product(handle) {
      if (this.#products.has(handle)) return this.#products.get(handle);
      let product = null;
      try {
        const response = await fetch(`/products/${encodeURIComponent(handle)}.js`, { headers: { Accept: 'application/json' } });
        if (response.ok) {
          const data = await response.json();
          product = { title: data.title, url: data.url || `/products/${handle}`, image: smallImage(data.featured_image || data.images?.[0]) };
        }
      } catch {}
      this.#products.set(handle, product);
      return product;
    }

    #render(item, product, timeLabel) {
      const set = (selector, text) => { const node = this.querySelector(selector); if (node) node.textContent = text; };
      set('[data-ro-name]', item.name || 'Một khách hàng');
      set('[data-ro-action]', item.place ? `ở ${item.place} vừa mua` : 'vừa mua');
      set('[data-ro-title]', product.title);
      set('[data-ro-time]', timeLabel);
      const time = this.querySelector('[data-ro-time]');
      if (time) time.hidden = !timeLabel;
      const link = this.querySelector('[data-ro-link]');
      if (link) link.href = product.url;
      const image = this.querySelector('[data-ro-image]');
      if (image && product.image) image.src = product.image;
    }

    #show() {
      this.#card.hidden = false;
      requestAnimationFrame(() => { this.dataset.state = 'visible'; });
    }

    #hide() {
      this.dataset.state = 'hiding';
      window.setTimeout(() => {
        if (this.dataset.state !== 'hiding') return;
        this.#card.hidden = true;
        this.dataset.state = 'idle';
      }, LEAVE_MS);
    }

    #stop(byUser) {
      clearTimeout(this.#timer);
      if (byUser) sessionOff.set();
      this.#hide();
      this.#abort?.abort();
      this.#abort = null;
    }
  }

  if (!customElements.get('recent-orders')) customElements.define('recent-orders', RecentOrders);
})();
