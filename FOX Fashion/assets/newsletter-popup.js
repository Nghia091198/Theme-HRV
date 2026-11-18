(() => {
  const STORAGE_KEY = 'fox-newsletter-popup';
  const SESSION_SUBMIT = 'fox-newsletter-popup-submitting';
  const DAY = 86400000;
  const SUBSCRIBED_DAYS = 365;
  const MESSAGES = { sending: 'Đang gửi…' };

  const storage = {
    hiddenUntil() {
      try { return Number(localStorage.getItem(STORAGE_KEY)) || 0; } catch { return 0; }
    },
    hideFor(days) {
      try { localStorage.setItem(STORAGE_KEY, String(Date.now() + days * DAY)); } catch {}
    },
    takeSubmitFlag() {
      try {
        const flagged = sessionStorage.getItem(SESSION_SUBMIT) === '1';
        sessionStorage.removeItem(SESSION_SUBMIT);
        return flagged;
      } catch { return false; }
    },
    setSubmitFlag() {
      try { sessionStorage.setItem(SESSION_SUBMIT, '1'); } catch {}
    },
  };

  class NewsletterPopup extends HTMLElement {
    #abort = null;
    #timer = 0;
    #modal = null;
    #form = null;
    #subscribed = false;

    connectedCallback() {
      this.#modal = this.querySelector('modal-component');
      this.#form = this.querySelector('.fox-np__form');
      if (!this.#modal) return;
      this.#abort = new AbortController();
      const { signal } = this.#abort;

      this.#modal.addEventListener('modal:closed', () => this.#onClosed(), { signal });
      this.#form?.addEventListener('submit', (event) => this.#onSubmit(event), { signal });
      this.querySelector('[data-np-banner]')?.addEventListener('click', () => storage.hideFor(SUBSCRIBED_DAYS), { signal });

      if (this.querySelector('[data-np-posted]') && storage.takeSubmitFlag()) {
        this.#showSuccess();
        this.#open();
        return;
      }
      if (storage.hiddenUntil() > Date.now()) return;
      const delay = Math.max(0, Number(this.dataset.delay) || 0) * 1000;
      this.#timer = window.setTimeout(() => this.#open(), delay);
    }

    disconnectedCallback() {
      clearTimeout(this.#timer);
      this.#abort?.abort();
      this.#abort = null;
    }

    #open() {
      if (document.querySelector('dialog[open]')) {
        this.#timer = window.setTimeout(() => this.#open(), 4000);
        return;
      }
      this.dataset.state = 'open';
      if (!this.#subscribed) storage.hideFor(this.#days());
      this.#modal.open?.();
    }

    #days() {
      return Math.max(1, Number(this.dataset.days) || 1);
    }

    #onClosed() {
      this.dataset.state = 'closed';
      storage.hideFor(this.#subscribed ? SUBSCRIBED_DAYS : this.#days());
    }

    async #onSubmit(event) {
      const form = this.#form;
      const error = form.querySelector('[data-np-error]');
      const submit = form.querySelector('[data-np-submit]');
      if (!form.reportValidity()) {
        event.preventDefault();
        return;
      }
      event.preventDefault();
      if (error) error.hidden = true;
      const label = submit?.querySelector('[data-np-submit-label]');
      const text = label?.textContent;
      if (submit) submit.disabled = true;
      if (label) label.textContent = MESSAGES.sending;
      try {
        const response = await fetch(form.action, { method: 'POST', body: new FormData(form), credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        this.#showSuccess();
      } catch {
        storage.setSubmitFlag();
        HTMLFormElement.prototype.submit.call(form);
      } finally {
        if (submit) submit.disabled = false;
        if (label) label.textContent = text;
      }
    }

    #showSuccess() {
      this.#subscribed = true;
      storage.hideFor(SUBSCRIBED_DAYS);
      const formView = this.querySelector('[data-np-view="form"]');
      const successView = this.querySelector('[data-np-view="success"]');
      if (formView) formView.hidden = true;
      if (successView) successView.hidden = false;
      this.dataset.view = 'success';
      requestAnimationFrame(() => this.querySelector('[data-np-success-title]')?.focus());
    }
  }

  if (!customElements.get('newsletter-popup')) customElements.define('newsletter-popup', NewsletterPopup);
})();
