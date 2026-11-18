(() => {
  const focusableSelector = 'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  let megaRequest = null;

  const normalizeTitle = (value) => (value || '').trim().toLocaleLowerCase();

  class HeaderComponent extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.header = this.querySelector('[data-role="header"]');
      this.spacer = this.nextElementSibling?.classList.contains('fox-header-spacer') ? this.nextElementSibling : null;
      this.isHome = this.dataset.templateHome === 'true';
      this.ticking = false;
      this.overlayTimer = null;
      this.addEventListener('click', (event) => this.onClick(event), { signal: this.controller.signal });
      this.addEventListener('pointerover', (event) => this.onMenuIndicatorEnter(event), { signal: this.controller.signal });
      this.addEventListener('pointerout', (event) => this.onMenuIndicatorLeave(event), { signal: this.controller.signal });
      this.addEventListener('pointerover', (event) => this.onDesktopMenuEnter(event), { signal: this.controller.signal });
      this.addEventListener('pointerout', (event) => this.onDesktopMenuLeave(event), { signal: this.controller.signal });
      this.addEventListener('pointerenter', (event) => this.onMegaIntent(event), { capture: true, signal: this.controller.signal });
      this.addEventListener('focusin', (event) => { this.onMegaIntent(event); this.onMenuIndicatorEnter(event); this.onDesktopMenuEnter(event); }, { signal: this.controller.signal });
      this.addEventListener('focusout', (event) => { this.onMenuIndicatorLeave(event); this.onDesktopMenuLeave(event); }, { signal: this.controller.signal });
      document.addEventListener('click', (event) => this.onDocumentClick(event), { signal: this.controller.signal });
      document.addEventListener('keydown', (event) => this.onKeydown(event), { signal: this.controller.signal });
      window.addEventListener('scroll', () => this.requestStickyUpdate(), { passive: true, signal: this.controller.signal });
      this.resizeObserver = new ResizeObserver(() => {
        this.syncHeight();
        this.syncOpenMegaGeometry();
      });
      if (this.header) this.resizeObserver.observe(this.header);
      this.syncHeight();
      this.updateSticky();
      this.warnDuplicateMegaTitles();
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.resizeObserver?.disconnect();
      clearTimeout(this.overlayTimer);
      this.hideMenuOverlay();
      this.controller = null;
    }

    syncHeight() {
      if (!this.header) return;
      const height = this.header.offsetHeight;
      document.documentElement.style.setProperty('--fox-header-height', `${height}px`);
      if (this.spacer) this.spacer.style.height = !this.isHome && this.hasAttribute('data-fixed') ? `${height}px` : '0px';
    }

    requestStickyUpdate() {
      if (this.ticking) return;
      this.ticking = true;
      requestAnimationFrame(() => {
        this.updateSticky();
        this.ticking = false;
      });
    }

    updateSticky() {
      if (this.dataset.sticky !== 'true') return;
      const threshold = this.header?.offsetHeight || 0;
      const wasFixed = this.hasAttribute('data-fixed');
      const fixed = wasFixed ? window.scrollY > 0 : window.scrollY > threshold;
      if (fixed === wasFixed) return;

      this.toggleAttribute('data-fixed', fixed);
      this.dataset.state = fixed ? 'fixed' : 'ready';
      this.syncHeight();
    }

    onClick(event) {
      const cartButton = event.target.closest('[data-action="open-cart"]');
      if (cartButton) {
        event.preventDefault();
        document.querySelector('mini-cart')?.open?.();
        return;
      }
      const toggle = event.target.closest('[data-action="toggle-submenu"]');
      if (!toggle) return;
      event.preventDefault();
      if (window.matchMedia('(min-width: 992px)').matches) return;
      const item = toggle.closest('.fox-menu__item, .fox-submenu__item');
      if (!item) return;
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      this.closeSiblings(item);
      toggle.setAttribute('aria-expanded', String(!expanded));
      item.toggleAttribute('data-open', !expanded);
      if (!expanded && item.matches('.fox-menu__item--mega')) this.loadMega(item);
    }

    onMegaIntent(event) {
      const item = event.target.closest?.('.fox-menu__item--mega');
      if (!item || !this.contains(item)) return;
      this.syncMegaGeometry(item);
      this.loadMega(item);
    }

    syncMegaGeometry(item) {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      const slot = item.querySelector('[data-role="mega-slot"]');
      const inner = item.closest('.fox-header__inner');
      const menu = item.closest('.fox-menu');
      if (!slot || !inner || !menu) return;

      const innerRect = inner.getBoundingClientRect();
      const menuRect = menu.getBoundingClientRect();
      slot.style.setProperty('--fox-mega-left', `${innerRect.left - menuRect.left}px`);
      slot.style.setProperty('--fox-mega-width', `${innerRect.width}px`);
      slot.querySelector('slider-component')?.swiper?.update?.();
    }

    syncOpenMegaGeometry() {
      this.querySelectorAll('.fox-menu__item--mega').forEach((item) => this.syncMegaGeometry(item));
    }

    onMenuIndicatorEnter(event) {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      const row = event.target.closest?.('.fox-menu__row');
      const list = row?.parentElement?.parentElement;
      if (!row || !list?.matches('.fox-menu, .fox-submenu') || list.classList.contains('fox-menu--mobile')) return;

      const listRect = list.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      const isRoot = list.classList.contains('fox-menu');
      const horizontalExpansion = isRoot ? 8 : 4;
      const verticalInset = isRoot ? 14 : 1;
      list.style.setProperty('--fox-menu-hover-x', `${rowRect.left - listRect.left - horizontalExpansion}px`);
      list.style.setProperty('--fox-menu-hover-y', `${rowRect.top - listRect.top + verticalInset}px`);
      list.style.setProperty('--fox-menu-hover-width', `${rowRect.width + horizontalExpansion * 2}px`);
      list.style.setProperty('--fox-menu-hover-height', `${rowRect.height - verticalInset * 2}px`);
      list.setAttribute('data-hover-active', '');
    }

    onMenuIndicatorLeave(event) {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      const list = event.target.closest?.('.fox-menu, .fox-submenu');
      if (!list || list.contains(event.relatedTarget)) return;
      list.removeAttribute('data-hover-active');
    }

    onDesktopMenuEnter(event) {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      const item = event.target.closest?.('.fox-header__nav > .fox-menu > .fox-menu__item--parent, .fox-header__nav > .fox-menu > .fox-menu__item--mega');
      if (!item || !this.contains(item)) return;
      // Pointer navigation must not leave a previously focused dropdown visible.
      const focusedItem = document.activeElement?.closest?.('.fox-header__nav > .fox-menu > .fox-menu__item');
      if (focusedItem && focusedItem !== item) document.activeElement.blur();
      this.closeSiblings(item);
      clearTimeout(this.overlayTimer);
      this.overlayTimer = null;
      if (typeof window.is_overplay === 'function') {
        window.is_overplay(true, this, { visual: true, lock: false });
      }
    }

    onDesktopMenuLeave(event) {
      if (!window.matchMedia('(min-width: 992px)').matches) return;
      const item = event.target.closest?.('.fox-header__nav > .fox-menu > .fox-menu__item--parent, .fox-header__nav > .fox-menu > .fox-menu__item--mega');
      if (!item || item.contains(event.relatedTarget)) return;
      clearTimeout(this.overlayTimer);
      this.overlayTimer = setTimeout(() => this.hideMenuOverlay(), 80);
    }

    hideMenuOverlay() {
      if (typeof window.is_overplay === 'function') window.is_overplay(false, this);
    }

    onDocumentClick(event) {
      if (this.contains(event.target)) return;
      this.closeAll();
      this.hideMenuOverlay();
    }

    onKeydown(event) {
      if (event.key !== 'Escape') return;
      const openItem = this.querySelector('[data-open]');
      if (!openItem) return;
      const toggle = openItem.querySelector('[data-action="toggle-submenu"]');
      this.closeAll();
      this.hideMenuOverlay();
      toggle?.focus();
    }

    closeSiblings(item) {
      const parent = item.parentElement;
      parent?.querySelectorAll(':scope > [data-open]').forEach((sibling) => {
        if (sibling === item) return;
        sibling.removeAttribute('data-open');
        sibling.querySelector(':scope > .fox-menu__row [data-action="toggle-submenu"]')?.setAttribute('aria-expanded', 'false');
      });
    }

    closeAll() {
      this.querySelectorAll('[data-open]').forEach((item) => item.removeAttribute('data-open'));
      this.querySelectorAll('[data-action="toggle-submenu"][aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
    }

    async getMegaDocument() {
      if (!megaRequest) {
        megaRequest = fetch(this.dataset.megaUrl, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
          .then((response) => {
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.text();
          })
          .then((html) => new DOMParser().parseFromString(html, 'text/html'))
          .catch((error) => {
            megaRequest = null;
            throw error;
          });
      }
      return megaRequest;
    }

    async loadMega(item) {
      const slot = item.querySelector('[data-role="mega-slot"]');
      if (!slot || slot.dataset.state === 'ready' || slot.dataset.state === 'loading') return;
      slot.dataset.state = 'loading';
      slot.setAttribute('aria-busy', 'true');
      try {
        const doc = await this.getMegaDocument();
        const title = normalizeTitle(item.dataset.menuTitle);
        const template = Array.from(doc.querySelectorAll('template[data-mega-title]')).find((node) => normalizeTitle(node.dataset.megaTitle) === title);
        if (!template) throw new Error(`Không tìm thấy mega menu: ${item.dataset.menuTitle}`);
        slot.replaceChildren(template.content.cloneNode(true));
        slot.dataset.state = 'ready';
        slot.dispatchEvent(new CustomEvent('header:mega-ready', { bubbles: true, detail: { title: item.dataset.menuTitle } }));
      } catch (error) {
        slot.dataset.state = 'error';
        const message = document.createElement('p');
        message.className = 'fox-menu__error';
        message.setAttribute('role', 'alert');
        message.textContent = 'Không thể tải nội dung menu. Vui lòng dùng liên kết danh mục.';
        slot.replaceChildren(message);
        console.warn('[FOX Header] Mega menu load failed.', error);
      } finally {
        slot.removeAttribute('aria-busy');
      }
    }

    warnDuplicateMegaTitles() {
      const titles = Array.from(this.querySelectorAll('.fox-menu__item--mega')).map((item) => normalizeTitle(item.dataset.menuTitle));
      if (new Set(titles).size !== titles.length) console.warn('[FOX Header] Duplicate mega menu titles detected; first match wins.');
    }
  }

  class MenuDrawer extends HTMLElement {
    connectedCallback() {
      if (this.controller) return;
      this.controller = new AbortController();
      this.panel = this.querySelector('.fox-menu-drawer__panel');
      this.content = this.querySelector('[data-role="mobile-content"]');
      this.titleElement = this.querySelector('[data-role="drawer-title"]');
      this.subheader = this.querySelector('[data-role="drawer-subheader"]');
      this.rootBrand = this.querySelector('[data-role="drawer-root-brand"]');
      this.backButton = this.querySelector('[data-action="back-panel"]');
      this.panelStack = [];
      this.panelTriggers = new Map();
      document.addEventListener('click', (event) => this.onDocumentClick(event), { signal: this.controller.signal });
      document.addEventListener('keydown', (event) => this.onKeydown(event), { signal: this.controller.signal });
      this.addEventListener('click', (event) => this.onClick(event), { signal: this.controller.signal });
    }

    disconnectedCallback() {
      this.controller?.abort();
      this.requestController?.abort();
      clearTimeout(this.closeTimer);
      if (this.closeTransitionHandler) this.panel?.removeEventListener('transitionend', this.closeTransitionHandler);
      this.closeTimer = null;
      this.closeTransitionHandler = null;
      this.controller = null;
    }

    onDocumentClick(event) {
      const openButton = event.target.closest('[data-action="open-menu"]');
      if (!openButton) return;
      event.preventDefault();
      this.open(openButton);
    }

    onClick(event) {
      if (event.target.closest('[data-action="close-menu"]')) { this.close(); return; }
      const panelOpener = event.target.closest('[data-action="open-panel"]');
      if (panelOpener && this.dataset.style === 'drilldown') {
        event.preventDefault();
        this.openPanel(panelOpener);
        return;
      }
      if (event.target.closest('[data-action="back-panel"]') && this.dataset.style === 'drilldown') {
        event.preventDefault();
        this.backPanel();
        return;
      }
      const toggle = event.target.closest('[data-action="toggle-submenu"]');
      if (!toggle) return;
      event.preventDefault();
      const item = toggle.closest('.fox-menu__item, .fox-submenu__item');
      const expanded = toggle.getAttribute('aria-expanded') === 'true';
      toggle.setAttribute('aria-expanded', String(!expanded));
      item?.toggleAttribute('data-open', !expanded);
      if (!expanded && item?.matches('.fox-menu__item--mega')) this.loadMobileMega(item);
    }

    onKeydown(event) {
      if (!this.hasAttribute('data-open')) return;
      if (event.key === 'Escape') {
        if (this.dataset.style === 'drilldown' && this.panelStack.length > 1) this.backPanel();
        else this.close();
        return;
      }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(this.querySelectorAll(focusableSelector)).filter((node) => node.offsetParent !== null);
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }

    async load() {
      if (this.dataset.state === 'ready' || this.dataset.state === 'loading') return;
      this.dataset.state = 'loading';
      this.content.setAttribute('aria-busy', 'true');
      this.content.textContent = 'Đang tải menu…';
      this.requestController = new AbortController();
      try {
        const response = await fetch(this.dataset.menuUrl, { signal: this.requestController.signal, headers: { 'X-Requested-With': 'XMLHttpRequest' } });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const doc = new DOMParser().parseFromString(await response.text(), 'text/html');
        this.content.replaceChildren(...Array.from(doc.body.childNodes).map((node) => node.cloneNode(true)));
        this.dataset.state = 'ready';
        if (this.dataset.style === 'drilldown') this.initDrilldown();
      } catch (error) {
        if (error.name === 'AbortError') return;
        this.dataset.state = 'error';
        this.content.textContent = 'Không thể tải menu. Vui lòng thử lại.';
        console.warn('[FOX Header] Mobile menu load failed.', error);
      } finally { this.content.removeAttribute('aria-busy'); }
    }

    async loadMobileMega(item) {
      const slot = item.querySelector('[data-role="mega-slot"]');
      if (!slot || slot.dataset.state === 'ready' || slot.dataset.state === 'loading') return;
      slot.dataset.state = 'loading';
      slot.setAttribute('aria-busy', 'true');
      try {
        const url = document.querySelector('header-component')?.dataset.megaUrl || '/?view=header-mega';
        if (!megaRequest) {
          megaRequest = fetch(url, { headers: { 'X-Requested-With': 'XMLHttpRequest' } })
            .then((response) => { if (!response.ok) throw new Error(`HTTP ${response.status}`); return response.text(); })
            .then((html) => new DOMParser().parseFromString(html, 'text/html'))
            .catch((error) => { megaRequest = null; throw error; });
        }
        const doc = await megaRequest;
        const title = normalizeTitle(item.dataset.menuTitle);
        const template = Array.from(doc.querySelectorAll('template[data-mega-title]')).find((node) => normalizeTitle(node.dataset.megaTitle) === title);
        if (!template) throw new Error(`Không tìm thấy mega menu: ${item.dataset.menuTitle}`);
        slot.replaceChildren(template.content.cloneNode(true));
        slot.dataset.state = 'ready';
      } catch (error) {
        slot.dataset.state = 'error';
        slot.textContent = 'Không thể tải nội dung menu.';
        console.warn('[FOX Header] Mobile mega menu load failed.', error);
      } finally { slot.removeAttribute('aria-busy'); }
    }

    // Open the shell before async content resolves so motion starts immediately.
    // A short motion lock prevents repeated clicks from restarting the transition.
    async open(trigger) {
      if (this.hasAttribute('data-open')) return;
      if (this.motionLock) return;
      this.motionLock = setTimeout(() => { this.motionLock = null; }, 90);
      this.lastTrigger = trigger;
      clearTimeout(this.closeTimer);
      if (this.closeTransitionHandler) this.panel?.removeEventListener('transitionend', this.closeTransitionHandler);
      this.closeTransitionHandler = null;
      this.removeAttribute('data-closing');
      this.setAttribute('data-open', '');
      this.setAttribute('aria-hidden', 'false');
      trigger.setAttribute('aria-expanded', 'true');
      document.documentElement.classList.add('fox-menu-lock');
      this.dispatchEvent(new CustomEvent('drawer:open', { bubbles: true }));
      await this.load();
      if (!this.hasAttribute('data-open')) return;
      if (this.dataset.style === 'drilldown') this.resetDrilldown();
      requestAnimationFrame(() => {
        if (!this.hasAttribute('data-open')) return;
        this.panel?.focus();
        this.dispatchEvent(new CustomEvent('drawer:opened', { bubbles: true }));
      });
    }

    close() {
      if (!this.hasAttribute('data-open')) return;
      if (this.motionLock) return;
      this.motionLock = setTimeout(() => { this.motionLock = null; }, 90);
      this.removeAttribute('data-open');
      this.setAttribute('data-closing', '');
      document.documentElement.classList.remove('fox-menu-lock');
      this.lastTrigger?.setAttribute('aria-expanded', 'false');
      this.dispatchEvent(new CustomEvent('drawer:close', { bubbles: true }));
      clearTimeout(this.closeTimer);
      if (this.closeTransitionHandler) this.panel?.removeEventListener('transitionend', this.closeTransitionHandler);
      // Hide the shell before resetting panels so the root panel cannot flash during teardown.
      const finishClose = () => {
        if (!this.hasAttribute('data-closing')) return;
        if (this.closeTransitionHandler) this.panel?.removeEventListener('transitionend', this.closeTransitionHandler);
        this.removeAttribute('data-closing');
        this.setAttribute('aria-hidden', 'true');
        if (this.dataset.style === 'drilldown') this.resetDrilldown();
        this.lastTrigger?.focus();
        clearTimeout(this.closeTimer);
        this.closeTimer = null;
        this.closeTransitionHandler = null;
        this.dispatchEvent(new CustomEvent('drawer:closed', { bubbles: true }));
      };
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches || !this.panel) {
        finishClose();
        return;
      }
      this.closeTransitionHandler = (event) => {
        if (event.target === this.panel && event.propertyName === 'transform') finishClose();
      };
      this.panel.addEventListener('transitionend', this.closeTransitionHandler);
      this.closeTimer = setTimeout(finishClose, 420);
    }

    initDrilldown() {
      // Liquid provides the panel graph; the component only applies active state and focus.
      this.drilldown = this.content.querySelector('[data-role="drilldown"]');
      if (!this.drilldown) return;
      this.drilldown.querySelectorAll('[data-panel-id]').forEach((panel) => {
        panel.toggleAttribute('inert', panel.dataset.level !== '0');
      });
      this.resetDrilldown();
    }

    resetDrilldown() {
      if (!this.drilldown) return;
      const rootId = this.drilldown.dataset.rootPanel;
      const rootPanel = this.drilldown.querySelector(`#${CSS.escape(rootId)}`);
      if (!rootPanel) return;
      this.drilldown.querySelectorAll('[data-panel-id]').forEach((panel) => {
        const isRoot = panel === rootPanel;
        panel.dataset.state = isRoot ? 'active' : 'hidden';
        panel.setAttribute('aria-hidden', String(!isRoot));
        panel.toggleAttribute('inert', !isRoot);
      });
      this.drilldown.querySelectorAll('[data-action="open-panel"][aria-expanded="true"]').forEach((button) => button.setAttribute('aria-expanded', 'false'));
      this.panelStack = [rootId];
      this.panelTriggers.clear();
      this.dataset.activePanel = rootId;
      this.dataset.level = '0';
      delete this.dataset.direction;
      this.syncDrilldownHeader(rootPanel);
    }

    openPanel(trigger) {
      const targetId = trigger.dataset.targetPanel;
      const target = targetId ? this.drilldown?.querySelector(`#${CSS.escape(targetId)}`) : null;
      const current = this.getActivePanel();
      if (!target || !current || target === current) return;
      current.dataset.state = 'previous';
      current.setAttribute('aria-hidden', 'true');
      current.setAttribute('inert', '');
      target.dataset.state = 'active';
      target.setAttribute('aria-hidden', 'false');
      target.removeAttribute('inert');
      trigger.setAttribute('aria-expanded', 'true');
      this.panelTriggers.set(targetId, trigger);
      this.panelStack.push(targetId);
      this.dataset.activePanel = targetId;
      this.dataset.level = target.dataset.level || String(this.panelStack.length - 1);
      this.dataset.direction = 'forward';
      this.syncDrilldownHeader(target);
      requestAnimationFrame(() => {
        target.querySelectorAll('slider-component').forEach((slider) => slider.swiper?.update?.());
        this.backButton?.focus();
      });
    }

    backPanel() {
      if (this.panelStack.length < 2) return;
      const currentId = this.panelStack.pop();
      const parentId = this.panelStack[this.panelStack.length - 1];
      const current = this.drilldown?.querySelector(`#${CSS.escape(currentId)}`);
      const parent = this.drilldown?.querySelector(`#${CSS.escape(parentId)}`);
      if (!current || !parent) return;
      current.dataset.state = 'next';
      current.setAttribute('aria-hidden', 'true');
      current.setAttribute('inert', '');
      parent.dataset.state = 'active';
      parent.setAttribute('aria-hidden', 'false');
      parent.removeAttribute('inert');
      const trigger = this.panelTriggers.get(currentId);
      trigger?.setAttribute('aria-expanded', 'false');
      this.panelTriggers.delete(currentId);
      this.dataset.activePanel = parentId;
      this.dataset.level = parent.dataset.level || String(this.panelStack.length - 1);
      this.dataset.direction = 'back';
      this.syncDrilldownHeader(parent);
      requestAnimationFrame(() => trigger?.focus());
    }

    getActivePanel() {
      const activeId = this.panelStack[this.panelStack.length - 1];
      return activeId ? this.drilldown?.querySelector(`#${CSS.escape(activeId)}`) : null;
    }

    syncDrilldownHeader(panel) {
      const isRoot = panel?.dataset.level === '0';
      this.subheader?.setAttribute('aria-hidden', String(isRoot));
      if (this.titleElement) {
        this.titleElement.textContent = isRoot ? '' : panel?.dataset.title || '';
        this.titleElement.hidden = isRoot;
      }
      if (this.rootBrand) this.rootBrand.hidden = false;
      if (this.subheader) this.subheader.hidden = isRoot;
    }
  }

  if (!customElements.get('header-component')) customElements.define('header-component', HeaderComponent);
  if (!customElements.get('menu-drawer')) customElements.define('menu-drawer', MenuDrawer);
})();
