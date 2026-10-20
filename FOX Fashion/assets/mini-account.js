// Shared account popover behavior is isolated from the header component.
// Positioning keeps the panel aligned directly below the header on narrow screens.
(function () {
  class FoxMiniAccount extends HTMLElement {
    connectedCallback() {
      if (this.abort) this.abort.abort();
      this.abort = new AbortController();
      const { signal } = this.abort;
      this.trigger = this.querySelector('[data-account-trigger]');
      this.panel = this.querySelector('[data-account-panel]');
      this.overlay = this.querySelector('[data-account-overlay]');
      this.querySelectorAll('[data-account-close]').forEach((control) => control.remove());
      this.prepareFloatingFields();
      this.prepareRecoveryTrigger();
      this.preparePasswordToggles();
      if (!this.trigger || !this.panel) return;
      this.trigger.addEventListener('click', (event) => { event.preventDefault(); this.toggle(); }, { signal });
      this.overlay?.addEventListener('click', () => this.close(), { signal });
      this.addEventListener('click', (event) => {
        if (event.target.closest('[data-account-close]')) this.close();
        const viewTrigger = event.target.closest('[data-account-view-trigger]');
        if (viewTrigger) this.showView(viewTrigger.dataset.accountViewTrigger);
      }, { signal });
      document.addEventListener('pointerdown', (event) => { if (this.opened && !this.contains(event.target)) this.close(); }, { signal });
      document.addEventListener('keydown', (event) => { if (!this.opened) return; if (event.key === 'Escape') this.close(); if (event.key === 'Tab') this.trapFocus(event); }, { signal });
      window.addEventListener('resize', () => this.position(), { signal });
      window.addEventListener('scroll', () => this.position(), { capture: true, passive: true, signal });
    }
    toggle() { this.opened ? this.close() : this.open(); }
    open() { this.opened = true; this.panel.hidden = false; this.overlay.hidden = false; window.FOXSetOverlay?.(true, this, { visual: true, lock: true }); this.panel.setAttribute('data-open', ''); this.panel.setAttribute('aria-hidden', 'false'); this.trigger.setAttribute('aria-expanded', 'true'); this.position(); this.showView(this.panel.querySelector('[data-account-view]:not([hidden])')?.dataset.accountView || 'login'); this.emit('account:open'); requestAnimationFrame(() => { this.panel.querySelector('input, a, button')?.focus(); this.emit('account:opened'); }); }
    close() { if (!this.opened) return; this.opened = false; this.panel.removeAttribute('data-open'); this.panel.setAttribute('aria-hidden', 'true'); this.trigger.setAttribute('aria-expanded', 'false'); this.overlay.hidden = true; this.panel.hidden = true; window.FOXSetOverlay?.(false, this); this.trigger.focus(); this.emit('account:close'); this.emit('account:closed'); }
    showView(name) { this.panel.querySelectorAll('[data-account-view]').forEach((view) => { view.hidden = view.dataset.accountView !== name; }); this.emit('account:view-change', { view: name }); }
    // Keep the reusable hook idempotent for server-rendered and enhanced fields.
    prepareFloatingFields() { this.querySelectorAll('form label[for]').forEach((label) => { const input = this.querySelector(`#${CSS.escape(label.htmlFor)}`); if (!input || input.parentElement?.classList.contains('fox-floating-field')) return; const field = document.createElement('div'); field.className = 'fox-floating-field fox-mini-account__field'; label.before(field); input.setAttribute('placeholder', ' '); field.append(input, label); }); }
    prepareRecoveryTrigger() { this.querySelectorAll('[data-account-view-trigger="recover"]').forEach((trigger) => { trigger.classList.add('fox-mini-account__recover-trigger'); if (trigger.querySelector('span')) return; const label = trigger.textContent.trim(); if (!label) return; trigger.textContent = ''; const prefix = document.createElement('span'); prefix.textContent = 'Bạn đã quên mật khẩu?'; const link = document.createElement('span'); link.className = 'fox-mini-account__recover-link'; link.textContent = label; trigger.append(prefix, document.createTextNode(' '), link); }); }
    preparePasswordToggles() {
      this.querySelectorAll('.fox-floating-field input[type="password"]').forEach((input) => {
        if (input.parentElement.querySelector('[data-password-toggle]')) return;
        const button = document.createElement('button');
        button.type = 'button';
        button.className = 'fox-mini-account__password-toggle';
        button.dataset.passwordToggle = input.id;
        button.dataset.labelShow = 'Hiện mật khẩu';
        button.dataset.labelHide = 'Ẩn mật khẩu';
        button.setAttribute('aria-label', button.dataset.labelShow);
        const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        icon.setAttribute('class', 'customer-field__icon icon-eye-show');
        icon.setAttribute('viewBox', '0 0 24 24');
        icon.setAttribute('width', '20');
        icon.setAttribute('height', '20');
        icon.setAttribute('aria-hidden', 'true');
        const use = document.createElementNS('http://www.w3.org/2000/svg', 'use');
        use.setAttributeNS('http://www.w3.org/1999/xlink', 'xlink:href', '#ic-eye-show');
        icon.append(use);
        button.append(icon);
        input.parentElement.append(button);
      });
      this.querySelectorAll('[data-password-toggle]').forEach((button) => { button.addEventListener('click', () => { const input = this.querySelector(`#${CSS.escape(button.dataset.passwordToggle)}`); if (!input) return; const visible = input.type === 'text'; input.type = visible ? 'password' : 'text'; button.setAttribute('aria-label', visible ? button.dataset.labelShow : button.dataset.labelHide); }, { signal: this.abort.signal }); });
    }
    position() { if (!this.opened) return; const rect = this.trigger.getBoundingClientRect(); const headerRect = document.querySelector('header')?.getBoundingClientRect() || this.closest('.fox-header')?.getBoundingClientRect(); const panelRect = this.panel.getBoundingClientRect(); const previousTop = this.panel.style.top; this.panel.style.top = '0px'; const containingOffset = this.panel.getBoundingClientRect().top; this.panel.style.top = previousTop; const gap = 7; const edge = Math.min(50, Math.max(25, (window.innerWidth - panelRect.width) / 2 + 10)); const top = Math.max(rect.bottom, headerRect?.bottom || 0) + gap; const y = top + panelRect.height <= window.innerHeight - edge ? top : Math.max(edge, rect.top - panelRect.height - gap); const x = Math.max(edge, window.innerWidth - panelRect.width - edge); this.panel.style.top = `${Math.round(y - containingOffset)}px`; this.panel.style.left = `${Math.round(x)}px`; }
    trapFocus(event) { const items = [...this.panel.querySelectorAll('a[href],button:not([disabled]),input:not([disabled])')]; if (!items.length) return; const first = items[0]; const last = items[items.length - 1]; if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); } }
    emit(name, detail) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, detail: detail || {} })); }
    disconnectedCallback() { this.abort?.abort(); }
  }
  if (!customElements.get('mini-account')) customElements.define('mini-account', FoxMiniAccount);
}());
