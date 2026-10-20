/** FOX Product Tabs - lazy collection loading and active-panel navigation. */
(() => {
  const ROOT_SELECTOR = '#fox-product-tabs';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

  function getActivePanel(root) {
    return [...root.querySelectorAll('[data-fox-product-tabs-panel]')]
      .find((panel) => !panel.hidden) || null;
  }

  function updateTabButtonClasses(root) {
    root.querySelectorAll('[role="tablist"] [role="tab"]').forEach((tab) => {
      const isActive = tab.getAttribute('aria-selected') === 'true';
      tab.classList.toggle('btn-primary', isActive);
      tab.classList.toggle('btn-secondary', !isActive);
    });
  }

  function updateNavButtons(root) {
    const panel = getActivePanel(root);
    const viewport = panel?.querySelector('[data-role="viewport"]');
    const previous = root.querySelector('[data-action="previous"]');
    const next = root.querySelector('[data-action="next"]');
    if (!previous || !next) return;

    const unavailable = !viewport || panel.dataset.state === 'loading';
    const maxScroll = viewport ? viewport.scrollWidth - viewport.clientWidth : 0;
    previous.disabled = unavailable || viewport.scrollLeft <= 1;
    next.disabled = unavailable || maxScroll <= 1 || viewport.scrollLeft >= maxScroll - 1;
  }

  async function loadPanel(root, panelId) {
    const panel = root.querySelector(`#${panelId}`);
    const tab = root.querySelector(`[role="tablist"] [data-target="${panelId}"]`);
    if (!panel || !tab || panel.dataset.loaded === 'true') return;

    const handle = tab.dataset.collection;
    const track = panel.querySelector('[data-role="track"]');
    if (!handle || !track) return;

    const fallback = track.querySelector('template[data-role="fallback"]');
    const fallbackHtml = fallback ? fallback.innerHTML : '';
    panel.dataset.state = 'loading';
    updateNavButtons(root);

    try {
      const response = await fetch(`/collections/${handle}?view=product-tab`, {
        signal: AbortSignal.timeout(10000),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      if (!html.trim()) throw new Error('Empty collection');

      track.innerHTML = html;
      panel.dataset.loaded = 'true';
      panel.dataset.state = 'ready';
    } catch (error) {
      console.warn('[fox-product-tabs] Failed to load collection:', handle, error);
      panel.dataset.state = 'error';
      track.innerHTML = fallbackHtml;
    }

    updateNavButtons(root);
  }

  function scrollActivePanel(root, direction) {
    const panel = getActivePanel(root);
    const viewport = panel?.querySelector('[data-role="viewport"]');
    if (!viewport) return;

    const slide = viewport.querySelector('.fox-product-tabs__slide');
    const track = viewport.querySelector('[data-role="track"]');
    const gap = track ? parseFloat(getComputedStyle(track).columnGap) || 0 : 0;
    const distance = slide ? slide.getBoundingClientRect().width + gap : viewport.clientWidth * .9;
    viewport.scrollBy({
      left: direction * distance,
      behavior: reducedMotion.matches ? 'auto' : 'smooth',
    });
  }

  function initialize(root) {
    if (root.dataset.foxProductTabsReady === 'true') return;

    const controller = new AbortController();
    const { signal } = controller;
    root.dataset.foxProductTabsReady = 'true';
    const tabBar = root.querySelector('[data-role="tab-bar"]');
    const tabCount = root.querySelectorAll('[role="tablist"] [role="tab"]').length;
    if (tabBar && tabCount <= 1) tabBar.hidden = true;

    root.addEventListener('tabs:change', (event) => {
      updateTabButtonClasses(root);
      loadPanel(root, event.detail.tabId);
      requestAnimationFrame(() => updateNavButtons(root));
    }, { signal });

    root.addEventListener('click', (event) => {
      const button = event.target.closest('[data-action="previous"], [data-action="next"]');
      if (!button || !root.contains(button)) return;
      scrollActivePanel(root, button.dataset.action === 'next' ? 1 : -1);
    }, { signal });

    root.querySelectorAll('[data-role="viewport"]').forEach((viewport) => {
      viewport.addEventListener('scroll', () => updateNavButtons(root), { passive: true, signal });
    });

    window.addEventListener('resize', () => updateNavButtons(root), { passive: true, signal });
    updateTabButtonClasses(root);
    updateNavButtons(root);
  }

  function initializeAll() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initialize);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeAll, { once: true });
  } else {
    initializeAll();
  }
})();
