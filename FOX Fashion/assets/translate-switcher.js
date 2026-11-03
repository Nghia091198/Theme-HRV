(() => {
  const COOKIE = 'googtrans';
  const SCRIPT_URL = 'https://translate.google.com/translate_a/element.js?cb=foxGoogleTranslateInit';
  const COMBO_WAIT_MS = 6000;

  // Target language of the googtrans cookie ("/vi/en" → "en"), or null when the visitor never chose one.
  function FOXTranslateReadLang() {
    const match = document.cookie.match(/(?:^|;\s*)googtrans=\/[^/]*\/([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  // Google reads the cookie on the host and on the root domain: both are written / cleared.
  function FOXTranslateWriteCookie(value) {
    const host = window.location.hostname;
    const root = host.split('.').slice(-2).join('.');
    const expires = value ? '' : '; expires=Thu, 01 Jan 1970 00:00:00 GMT';
    [`; domain=${host}`, `; domain=.${root}`, ''].forEach((domain) => {
      document.cookie = `${COOKIE}=${value}${expires}; path=/${domain}`;
    });
  }

  // Language switcher (snippets/translate-switcher.liquid): free Google Translate element, kept hidden.
  class TranslateSwitcher extends HTMLElement {
    #abortController = null;
    #source = 'vi';
    #loading = null;

    connectedCallback() {
      if (this.#abortController) return;
      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.#source = this.dataset.source || 'vi';

      this.querySelector('[data-action="toggle"]')?.addEventListener('click', () => this.#setOpen(!this.#isOpen()), { signal });
      this.addEventListener('click', (event) => {
        const option = event.target.closest('[data-lang]');
        if (option) this.translate(option.dataset.lang);
      }, { signal });
      document.addEventListener('click', (event) => {
        if (this.#isOpen() && !this.contains(event.target)) this.#setOpen(false);
      }, { signal });
      document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape' || !this.#isOpen()) return;
        this.#setOpen(false);
        this.querySelector('[data-action="toggle"]')?.focus();
      }, { signal });

      window.doTranslate = (pair) => this.translate(String(pair || '').split('|').pop());
      // First visit (no cookie): show the default display language from settings. A visitor's own choice wins after.
      const fallback = this.dataset.default || this.#source;
      let current = FOXTranslateReadLang();
      if (!current) {
        current = fallback;
        if (current !== this.#source) FOXTranslateWriteCookie(`/${this.#source}/${current}`);
      }
      this.#mark(current);
      if (current !== this.#source) this.#loadEngine();
      this.dataset.state = 'ready';
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
    }

    translate(lang) {
      if (!lang) return;
      this.#setOpen(false);
      // Back to the source language: "/vi/vi" (no translation) still records the choice, so the default display
      // language is not applied again on the next visit. Reload restores the original text.
      if (lang === this.#source) {
        FOXTranslateWriteCookie(`/${this.#source}/${this.#source}`);
        window.location.reload();
        return;
      }
      FOXTranslateWriteCookie(`/${this.#source}/${lang}`);
      this.#mark(lang);
      this.#loadEngine().then(() => this.#applyCombo(lang));
    }

    #isOpen() {
      return this.dataset.open === 'true';
    }

    #setOpen(open) {
      const menu = this.querySelector('[data-role="menu"]');
      if (!menu) return;
      this.dataset.open = String(open);
      menu.hidden = !open;
      this.querySelector('[data-action="toggle"]')?.setAttribute('aria-expanded', String(open));
      if (open) this.querySelector('[aria-checked="true"]')?.focus({ preventScroll: true });
    }

    // Bubble shows the current flag; the current option gets the check.
    #mark(lang) {
      this.querySelectorAll('[data-lang]').forEach((option) => {
        option.setAttribute('aria-checked', String(option.dataset.lang === lang));
      });
      const flag = this.querySelector(`[data-lang="${CSS.escape(lang)}"] .fox-translate__flag`);
      const current = this.querySelector('[data-role="current"]');
      if (flag && current) current.replaceChildren(flag.cloneNode(true));
    }

    #loadEngine() {
      if (this.#loading) return this.#loading;
      this.#loading = new Promise((resolve, reject) => {
        window.foxGoogleTranslateInit = () => {
          new window.google.translate.TranslateElement({
            pageLanguage: this.#source,
            includedLanguages: (this.dataset.languages || '').replace(/\s/g, ''),
            autoDisplay: false,
          }, 'fox-translate-element');
          resolve();
        };
        const script = document.createElement('script');
        script.src = SCRIPT_URL;
        script.async = true;
        script.onerror = () => reject(new Error('google-translate-unavailable'));
        document.head.append(script);
      });
      this.#loading.catch((error) => console.warn('[TranslateSwitcher]', error.message));
      return this.#loading;
    }

    // The hidden Google <select> appears shortly after init; switching it translates without reloading.
    #applyCombo(lang) {
      const started = Date.now();
      const tick = () => {
        const combo = document.querySelector('.goog-te-combo');
        if (combo) {
          combo.value = lang;
          combo.dispatchEvent(new Event('change'));
          return;
        }
        if (Date.now() - started < COMBO_WAIT_MS) window.setTimeout(tick, 150);
      };
      tick();
    }
  }

  if (!customElements.get('translate-switcher')) customElements.define('translate-switcher', TranslateSwitcher);
})();
