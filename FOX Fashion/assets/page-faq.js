(() => {
  const SEARCH_DELAY = 150; 

  function FOXNormalizeText(value) {
    return String(value || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .trim();
  }

  class FaqSearch extends HTMLElement {
    #abortController = null;
    #observer = null;
    #searchTimer = null;
    #items = [];
    #groups = [];
    #navLinks = [];

    connectedCallback() {
      if (this.#abortController) return;

      this.#groups = [...this.querySelectorAll('[data-role="group"]')];
      this.#navLinks = [...this.querySelectorAll('[data-role="nav-link"]')];
      this.#items = [...this.querySelectorAll('[data-role="item"]')].map((element) => ({
        element,
        group: element.closest('[data-role="group"]'),
        text: FOXNormalizeText(element.textContent),
      }));

      if (!this.#items.length) {
        this.dataset.state = 'disabled';
        return;
      }

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      const input = this.querySelector('[data-role="search"]');
      input?.addEventListener('input', () => this.#queueSearch(input.value), { signal });
      this.querySelector('[data-role="search-form"]')?.addEventListener('submit', (event) => {
        event.preventDefault();
        this.#search(input?.value);
      }, { signal });

      this.#watchGroups();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#observer?.disconnect();
      this.#observer = null;
      window.clearTimeout(this.#searchTimer);
      this.#searchTimer = null;
      this.dataset.state = 'idle';
    }

    #queueSearch(value) {
      window.clearTimeout(this.#searchTimer);
      this.#searchTimer = window.setTimeout(() => this.#search(value), SEARCH_DELAY);
    }

    #search(value) {
      const query = FOXNormalizeText(value);
      const visibleGroups = new Set();
      let count = 0;

      this.#items.forEach((item) => {
        const match = !query || item.text.includes(query);
        item.element.hidden = !match;
        if (!match) return;
        count += 1;
        visibleGroups.add(item.group);
      });

      this.#groups.forEach((group) => {
        group.hidden = !visibleGroups.has(group);
      });

      const empty = this.querySelector('[data-role="empty"]');
      if (empty) empty.hidden = count > 0;

      const status = this.querySelector('[data-role="status"]');
      if (status) status.textContent = query ? `${count} câu hỏi phù hợp` : '';

      this.dataset.query = query ? 'true' : 'false';
      this.dispatchEvent(new CustomEvent('faq:search', { bubbles: true, detail: { query, count } }));
    }

    #watchGroups() {
      if (!this.#navLinks.length || typeof IntersectionObserver === 'undefined') return;

      this.#observer = new IntersectionObserver((entries) => {
        const visible = entries.find((entry) => entry.isIntersecting);
        if (visible) this.#setCurrent(visible.target.id);
      }, { rootMargin: '-30% 0px -60% 0px' });

      this.#groups.forEach((group) => this.#observer.observe(group));
    }

    #setCurrent(id) {
      this.#navLinks.forEach((link) => {
        if (link.getAttribute('href') === `#${id}`) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }
  }

  if (!customElements.get('faq-search')) {
    customElements.define('faq-search', FaqSearch);
  }
})();
