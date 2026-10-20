// Native dialog behavior stays independent from Bootstrap modal callers during migration.
(function () {
  const root = window.FOX = window.FOX || {};
  const FOCUSABLE_SELECTOR = [
    '[autofocus]',
    'button:not([disabled])',
    '[href]',
    'input:not([disabled]):not([type="hidden"])',
    'select:not([disabled])',
    'textarea:not([disabled])',
    '[tabindex]:not([tabindex="-1"])',
  ].join(',');

  root.activeModal = root.activeModal || null;
  root.modalQueue = root.modalQueue || Promise.resolve();

  function FOXQueueModalOperation(operation) {
    const result = root.modalQueue.then(operation, operation);
    root.modalQueue = result.catch(() => {});
    return result;
  }

  function FOXGetMotionDuration(element) {
    const style = getComputedStyle(element);
    const parseTimes = (value) => value.split(',').map((time) => {
      const normalized = time.trim();
      return normalized.endsWith('ms') ? parseFloat(normalized) : parseFloat(normalized) * 1000;
    });
    const maximum = (durations, delays) => durations.reduce((max, duration, index) => {
      const delay = delays[index % delays.length] || 0;
      return Math.max(max, duration + delay);
    }, 0);

    return Math.max(
      maximum(parseTimes(style.transitionDuration), parseTimes(style.transitionDelay)),
      maximum(parseTimes(style.animationDuration), parseTimes(style.animationDelay))
    );
  }

  function FOXWaitForMotion(element) {
    const duration = FOXGetMotionDuration(element);
    if (!duration) return new Promise((resolve) => requestAnimationFrame(() => resolve()));

    return new Promise((resolve) => {
      let timer = null;
      const finish = (event) => {
        if (event && event.target !== element) return;
        element.removeEventListener('animationend', finish);
        element.removeEventListener('transitionend', finish);
        clearTimeout(timer);
        resolve();
      };

      element.addEventListener('animationend', finish);
      element.addEventListener('transitionend', finish);
      timer = setTimeout(finish, duration + 50);
    });
  }

  class ModalComponent extends HTMLElement {
    #abortController = null;
    #dialog = null;
    #initialized = false;
    #parentModal = null;
    #pointerStartedOnBackdrop = false;
    #trigger = null;

    connectedCallback() {
      if (this.#initialized) return;

      this.#dialog = this.querySelector(':scope > dialog[data-role="dialog"], :scope > dialog');
      if (!(this.#dialog instanceof HTMLDialogElement) || typeof this.#dialog.showModal !== 'function') {
        this.dataset.state = 'error';
        console.warn('[ModalComponent] A native dialog child is required.');
        return;
      }

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.addEventListener('click', (event) => this.#handleClick(event), { signal });
      this.#dialog.addEventListener('pointerdown', (event) => {
        this.#pointerStartedOnBackdrop = event.target === this.#dialog;
      }, { signal });
      this.#dialog.addEventListener('cancel', (event) => this.#handleCancel(event), { signal });

      this.dataset.state = this.#dialog.open ? 'open' : 'closed';
      this.#initialized = true;
      this.#validateAccessibleName();
    }

    disconnectedCallback() {
      this.destroy();
    }

    get isOpen() {
      return this.dataset.state === 'opening' || this.dataset.state === 'open';
    }

    open(trigger) {
      return FOXQueueModalOperation(() => this.#openImmediately(trigger));
    }

    close(reason) {
      return FOXQueueModalOperation(() => this.#closeImmediately(reason || 'api'));
    }

    toggle(trigger) {
      return this.isOpen ? this.close('toggle') : this.open(trigger);
    }

    destroy() {
      this.#abortController?.abort();
      this.#abortController = null;

      if (this.#dialog?.open) {
        this.#dialog.close('disconnected');
      }
      const restoredParent = this.#restoreParentModal();
      if (root.activeModal === this) root.activeModal = restoredParent;
      if (typeof window.FOXSetOverlay === 'function') {
        window.FOXSetOverlay(Boolean(restoredParent), restoredParent || this);
      }

      this.#dialog = null;
      this.#trigger = null;
      this.#initialized = false;
      this.dataset.state = 'closed';
    }

    async #openImmediately(trigger) {
      if (!this.#initialized || !this.#dialog) return false;
      if (this.dataset.state === 'open' || this.dataset.state === 'opening') return true;

      const activeModal = root.activeModal;
      if (activeModal && activeModal !== this) {
        // Stacked modals keep their parent dialog open for restoration on close.
        if (this.dataset.modalStack === 'true') {
          this.#parentModal = activeModal;
          activeModal.dataset.modalSuspended = 'true';
          activeModal.#emit('modal:suspended', 'stacked');
        } else {
          await activeModal.#closeImmediately('replaced');
        }
      }

      this.#trigger = trigger instanceof HTMLElement ? trigger : document.activeElement;
      this.dataset.state = 'opening';
      this.#emit('modal:open', 'api');

      try {
        if (!this.#dialog.open) this.#dialog.showModal();
      } catch (error) {
        this.dataset.state = 'closed';
        this.#restoreParentModal();
        console.warn('[ModalComponent] Unable to open the dialog.', error);
        return false;
      }

      root.activeModal = this;
      if (typeof window.FOXSetOverlay === 'function') window.FOXSetOverlay(true, this);
      await FOXWaitForMotion(this.#dialog);

      if (this.dataset.state !== 'opening') return false;
      this.dataset.state = 'open';
      this.#focusInitialElement();
      this.#emit('modal:opened', 'api');
      return true;
    }

    async #closeImmediately(reason) {
      if (!this.#initialized || !this.#dialog) return false;
      if (this.dataset.state === 'closed' && !this.#dialog.open) return true;
      if (this.dataset.state === 'closing') return true;

      const closeReason = reason || 'api';
      this.dataset.state = 'closing';
      this.#emit('modal:close', closeReason);
      const dialog = this.#dialog;
      await FOXWaitForMotion(dialog);

      if (!this.#initialized || this.#dialog !== dialog) return false;
      if (dialog.open) {
        dialog.close(closeReason);
      }

      this.#finishClose(closeReason);
      return true;
    }

    #finishClose(reason) {
      if (this.dataset.state === 'closed') return;

      this.dataset.state = 'closed';
      if (root.activeModal === this) {
        const restoredParent = this.#restoreParentModal();
        root.activeModal = restoredParent;
        if (typeof window.FOXSetOverlay === 'function') {
          window.FOXSetOverlay(Boolean(restoredParent), restoredParent || this);
        }
      }

      const trigger = this.#trigger;
      this.#trigger = null;
      if (trigger instanceof HTMLElement && trigger.isConnected) trigger.focus({ preventScroll: true });
      this.#emit('modal:closed', reason || 'native');
    }

    #restoreParentModal() {
      const parentModal = this.#parentModal;
      this.#parentModal = null;
      if (!parentModal) return null;

      parentModal.removeAttribute('data-modal-suspended');
      if (!parentModal.isOpen) return null;
      parentModal.#emit('modal:resumed', 'stacked');
      return parentModal;
    }

    #handleClick(event) {
      const closeButton = event.target.closest('[data-action="close"]');
      if (closeButton && this.contains(closeButton)) {
        event.preventDefault();
        this.close('button');
        return;
      }

      if (event.target !== this.#dialog || !this.#pointerStartedOnBackdrop) return;
      this.#pointerStartedOnBackdrop = false;
      document.dispatchEvent(new CustomEvent('overlay:click', {
        detail: { modal: this },
      }));
      if (this.dataset.closeOnOverlay !== 'false') this.close('overlay');
    }

    #handleCancel(event) {
      event.preventDefault();
      if (this.dataset.closeOnEscape === 'false') return;
      this.close('escape');
    }

    #focusInitialElement() {
      const autofocus = this.#dialog.querySelector('[autofocus]');
      const focusTarget = autofocus || this.#dialog.querySelector(FOCUSABLE_SELECTOR) || this.#dialog;
      if (focusTarget === this.#dialog && !this.#dialog.hasAttribute('tabindex')) {
        this.#dialog.setAttribute('tabindex', '-1');
      }
      focusTarget.focus({ preventScroll: true });
    }

    #validateAccessibleName() {
      const labelledBy = this.#dialog.getAttribute('aria-labelledby');
      const hasLabelledByTarget = labelledBy && labelledBy.split(/\s+/).every((id) => document.getElementById(id));
      if (!this.#dialog.getAttribute('aria-label') && !hasLabelledByTarget) {
        console.warn('[ModalComponent] Dialog requires aria-label or a valid aria-labelledby.');
      }
    }

    #emit(type, reason) {
      this.dispatchEvent(new CustomEvent(type, {
        bubbles: true,
        detail: { modal: this, trigger: this.#trigger, reason },
      }));
    }
  }

  if (!customElements.get('modal-component')) {
    customElements.define('modal-component', ModalComponent);
  }
}());
