(() => {
  class FoxCursorEffect extends HTMLElement {
    #abortController = null;
    #observer = null;
    #boundZones = new WeakSet();
    #useElement = null;
    #activeZone = null;
    #hotspotX = 0;
    #hotspotY = 0;
    #homeParent = null;
    #homeNextSibling = null;
    #activeDialog = null;

    connectedCallback() {
      if (this.#abortController) return;

      if (!this.#canRun()) {
        this.hidden = true;
        return;
      }

      this.hidden = false;
      if (!this.#homeParent) {
        this.#homeParent = this.parentNode;
        this.#homeNextSibling = this.nextSibling;
      }
      this.#useElement = this.querySelector('use');
      this.#abortController = new AbortController();
      document.documentElement.classList.add('fox-cursor-enabled');

      this.#syncHotspot();
      this.#trackPointer();
      this.#trackModalLayer();
      this.#bindZones(document.body);
      this.#watchDom();
    }

    disconnectedCallback() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#observer?.disconnect();
      this.#observer = null;
      this.#boundZones = new WeakSet();
      this.#activeZone?.classList.remove('is-cursor-active', 'is-cursor-native');
      this.#activeZone = null;
      this.#useElement = null;
      document.documentElement.classList.remove('fox-cursor-enabled');
    }

    #canRun() {
      return (
        window.matchMedia('(prefers-reduced-motion: no-preference)').matches &&
        window.matchMedia('(hover: hover) and (pointer: fine)').matches &&
        !window.matchMedia('(max-width: 1024px)').matches
      );
    }

    #trackPointer() {
      window.addEventListener(
        'pointermove',
        (event) => this.#setPosition(event.clientX, event.clientY),
        {
          passive: true,
          signal: this.#abortController.signal,
        }
      );
      window.addEventListener(
        'resize',
        () => this.#syncHotspot(),
        { passive: true, signal: this.#abortController.signal }
      );
    }

    #trackModalLayer() {
      const { signal } = this.#abortController;

      const moveToModalLayer = (event) => {
        const dialog = event.target?.querySelector?.(':scope > dialog[data-role="dialog"], :scope > dialog');
        if (!(dialog instanceof HTMLDialogElement)) return;

        // Native top-layer dialogs require the cursor to move into the active dialog.
        queueMicrotask(() => {
          if (!dialog.open || !dialog.isConnected) return;
          this.#activeDialog = dialog;
          dialog.append(this);
        });
      };

      document.addEventListener('modal:open', moveToModalLayer, { signal });
      document.addEventListener('modal:resumed', moveToModalLayer, { signal });

      document.addEventListener('modal:close', (event) => {
        const dialog = event.target?.querySelector?.(':scope > dialog[data-role="dialog"], :scope > dialog');
        if (dialog !== this.#activeDialog || this.#activeZone !== dialog) return;

        this.#hide(dialog);
      }, { signal });

      document.addEventListener('modal:closed', (event) => {
        const dialog = event.target?.querySelector?.(':scope > dialog[data-role="dialog"], :scope > dialog');
        if (dialog !== this.#activeDialog) return;

        this.#activeDialog = null;
        this.#restoreHome();
      }, { signal });
    }

    #restoreHome() {
      if (!this.#homeParent?.isConnected) return;

      const reference = this.#homeNextSibling?.parentNode === this.#homeParent
        ? this.#homeNextSibling
        : null;
      this.#homeParent.insertBefore(this, reference);
    }

    #bindZones(root) {
      root.querySelectorAll('[cursor-zone]').forEach((element) => this.#attach(element));
    }

    #watchDom() {
      this.#observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
          mutation.addedNodes.forEach((node) => {
            if (node.nodeType !== Node.ELEMENT_NODE) return;
            if (node.matches('[cursor-zone]')) this.#attach(node);
            node.querySelectorAll?.('[cursor-zone]').forEach((element) => this.#attach(element));
          });
        });
      });
      this.#observer.observe(document.body, { childList: true, subtree: true });
    }

    #attach(element) {
      if (this.#boundZones.has(element)) return;

      const zone = element.hasAttribute('parent') ? element.parentElement : element;
      if (!zone) return;

      const icon = element.dataset.icon || '#ic-arrow-45top-r';
      this.#boundZones.add(element);
      zone.addEventListener(
        'pointerenter',
        (event) => {
          this.#show(zone, icon, event.clientX, event.clientY);
          const target = document.elementFromPoint(event.clientX, event.clientY);
          if (this.#getNativeControl(target, zone)) this.#suspend(zone);
        },
        { signal: this.#abortController.signal }
      );
      zone.addEventListener(
        'pointerleave',
        (event) => {
          if (!zone.contains(event.relatedTarget)) this.#hide(zone);
        },
        { signal: this.#abortController.signal }
      );
      zone.addEventListener(
        'pointerover',
        (event) => {
          const control = this.#getNativeControl(event.target, zone);
          if (!control || control.contains(event.relatedTarget)) return;
          this.#suspend(zone);
        },
        { signal: this.#abortController.signal }
      );
      zone.addEventListener(
        'pointerout',
        (event) => {
          const control = this.#getNativeControl(event.target, zone);
          if (!control || control.contains(event.relatedTarget)) return;
          if (!zone.contains(event.relatedTarget)) return;
          if (this.#getNativeControl(event.relatedTarget, zone)) return;
          this.#show(zone, icon, event.clientX, event.clientY);
        },
        { signal: this.#abortController.signal }
      );
    }

    #getNativeControl(target, zone) {
      if (!(target instanceof Element)) return null;
      const control = target.closest('[data-cursor-native]');
      return control && zone.contains(control) ? control : null;
    }

    #syncHotspot() {
      this.#hotspotX = this.offsetWidth / 2;
      this.#hotspotY = this.offsetHeight / 2;
    }

    #setPosition(clientX, clientY) {
      this.style.left = `${clientX - this.#hotspotX + 5}px`;
      this.style.top = `${clientY - this.#hotspotY + 5}px`;
    }

    #show(zone, icon, clientX, clientY) {
      this.#activeZone?.classList.remove('is-cursor-active', 'is-cursor-native');
      this.#activeZone = zone;
      this.#useElement?.setAttribute('href', icon);
      this.#setPosition(clientX, clientY);
      this.classList.add('is-active');
      zone.classList.remove('is-cursor-native');
      zone.classList.add('is-cursor-active');
    }

    #suspend(zone) {
      if (this.#activeZone !== zone) return;
      this.classList.remove('is-active');
      zone.classList.remove('is-cursor-active');
      zone.classList.add('is-cursor-native');
    }

    #hide(zone) {
      if (this.#activeZone !== zone) return;
      this.#activeZone = null;
      this.classList.remove('is-active');
      zone.classList.remove('is-cursor-active', 'is-cursor-native');
    }
  }

if (!customElements.get('fox-cursor')) {
    customElements.define('fox-cursor', FoxCursorEffect);
  }
})();
