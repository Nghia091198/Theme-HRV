(() => {
  const COOKIE = 'googtrans';
  const CHOICE_COOKIE = 'fox_lang';
  const CHOICE_MAX_AGE = 60 * 60 * 24 * 365;
  const EXPIRED = 'Thu, 01 Jan 1970 00:00:00 GMT';
  const SCRIPT_URL = 'https://translate.google.com/translate_a/element.js?cb=foxGoogleTranslateInit';
  const COMBO_WAIT_MS = 6000;

  // The visitor's choice lives in the theme's own cookie: Google never writes it, so it cannot go stale.
  function FOXTranslateReadChoice() {
    const match = document.cookie.match(/(?:^|;\s*)fox_lang=([^;]+)/);
    return match ? decodeURIComponent(match[1]) : null;
  }

  function FOXTranslateSaveChoice(lang) {
    document.cookie = `${CHOICE_COOKIE}=${encodeURIComponent(lang)}; path=/; max-age=${CHOICE_MAX_AGE}; samesite=lax`;
  }

  // Google keeps googtrans copies per domain and per path, and the first one read wins: every copy (host, parent
  // domains, each path up to the current page) is cleared, then the single value matching the choice is written.
  function FOXTranslateSyncGoogle(source, lang) {
    const host = window.location.hostname;
    const parts = host.split('.');
    const domains = ['', `; domain=${host}`, `; domain=.${host}`];
    for (let index = 1; index < parts.length - 1; index += 1) domains.push(`; domain=.${parts.slice(index).join('.')}`);
    const paths = ['/'];
    window.location.pathname.split('/').filter(Boolean).reduce((path, segment) => {
      const next = `${path}/${segment}`;
      paths.push(next);
      return next;
    }, '');
    domains.forEach((domain) => {
      paths.forEach((path) => {
        document.cookie = `${COOKIE}=; expires=${EXPIRED}; path=${path}${domain}`;
      });
    });
    if (lang !== source) document.cookie = `${COOKIE}=/${source}/${lang}; path=/`;
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
      // The visitor's saved choice, else the default display language from settings (first visit).
      const current = FOXTranslateReadChoice() || this.dataset.default || this.#source;
      FOXTranslateSyncGoogle(this.#source, current);
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
      FOXTranslateSaveChoice(lang);
      FOXTranslateSyncGoogle(this.#source, lang);
      // Back to the source language: the saved choice keeps the default display language from coming back,
      // and a reload restores the original text.
      if (lang === this.#source) {
        window.location.reload();
        return;
      }
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
