(() => {
  const COPIED_DURATION = 1800;

  // Share icons (snippets/component-share.liquid): copy link + native share; other icons are plain links.
  class ShareLinks extends HTMLElement {
    #abortController = null;
    #resetTimer = 0;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      const native = this.querySelector('[data-action="native-share"]');
      if (native && typeof navigator.share === 'function') native.hidden = false;
      this.addEventListener('click', (event) => this.#handleClick(event), { signal: this.#abortController.signal });
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      window.clearTimeout(this.#resetTimer);
    }

    async #handleClick(event) {
      const button = event.target.closest('[data-action]');
      if (!button || !this.contains(button)) return;
      const url = this.dataset.url || window.location.href;

      if (button.dataset.action === 'native-share') {
        try {
          await navigator.share({ title: this.dataset.title || document.title, url });
          this.#emit('share:native', { url });
        } catch (error) {
          // Dismissed by the user.
        }
        return;
      }

      if (button.dataset.action === 'copy-link') {
        const status = this.querySelector('[data-role="share-status"]');
        try {
          await navigator.clipboard.writeText(url);
          button.classList.add('is-copied');
          if (status) status.textContent = 'Đã sao chép liên kết.';
          this.#emit('share:copied', { url });
        } catch (error) {
          if (status) status.textContent = 'Không sao chép được, hãy sao chép từ thanh địa chỉ.';
        }
        window.clearTimeout(this.#resetTimer);
        this.#resetTimer = window.setTimeout(() => {
          button.classList.remove('is-copied');
          if (status) status.textContent = '';
        }, COPIED_DURATION);
      }
    }

    #emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, detail }));
    }
  }

  if (!customElements.get('share-links')) customElements.define('share-links', ShareLinks);
})();
