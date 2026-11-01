(() => {
  const DESKTOP = '(min-width: 768px)';

  // Search page (templates/search.liquid). Fetch, highlight and recent searches come from FOX.search
  // (search-panel.js), the same functions as the search panel; filters / sort / pagination are the collection engine.
  function FOXSearchPageInit(root) {
    if (root.dataset.state === 'ready') return;
    root.dataset.state = 'ready';
    const search = window.FOX?.search;
    const terms = root.dataset.terms || '';
    const input = root.querySelector('[data-role="input"]');
    const clear = root.querySelector('[data-action="clear"]');

    input?.addEventListener('input', () => {
      if (clear) clear.hidden = !input.value.trim();
    });
    clear?.addEventListener('click', () => {
      input.value = '';
      clear.hidden = true;
      input.focus();
    });

    FOXSearchPageFilters(root);
    if (!terms || !search) return;

    const highlight = () => search.highlight(root, terms);
    highlight();
    root.addEventListener('collection:updated', highlight);
    if (Number(root.dataset.total) > 0) search.remember(terms);
    FOXSearchPageCounts(root, search, terms);
  }

  // Exact totals per type for the tabs and the summary (same result views as the panel).
  async function FOXSearchPageCounts(root, search, terms) {
    const withArticles = root.dataset.articles === 'true';
    try {
      const [product, article] = await Promise.all([
        search.fetchView(terms, 'product', 'smart-product'),
        withArticles ? search.fetchView(terms, 'article', 'smart-article') : Promise.resolve({ total: 0 }),
      ]);
      const set = (role, value) => root.querySelectorAll(`[data-role="${role}"]`).forEach((node) => { node.textContent = String(value); });
      set('count-product', product.total);
      if (withArticles) set('count-article', article.total);

      const summary = root.querySelector('[data-role="summary"]');
      if (summary && product.total + article.total > 0) {
        summary.replaceChildren();
        const strong = document.createElement('strong');
        strong.textContent = withArticles ? `${product.total} sản phẩm · ${article.total} bài viết` : `${product.total} sản phẩm`;
        summary.append(strong, document.createTextNode(` cho “${terms}”`));
      }

      // Nothing in the current tab but results in the other one.
      const other = root.querySelector('[data-role="other-tab"]');
      const mode = root.dataset.mode;
      const otherTotal = mode === 'article' ? product.total : article.total;
      if (other && withArticles && otherTotal > 0) {
        const link = document.createElement('a');
        const otherType = mode === 'article' ? 'product' : 'article';
        link.href = `/search?q=${encodeURIComponent(terms)}&type=${otherType}`;
        link.textContent = otherType === 'article' ? `Xem ${otherTotal} bài viết phù hợp` : `Xem ${otherTotal} sản phẩm phù hợp`;
        other.replaceChildren(link);
        other.hidden = false;
      }
    } catch (error) {
      console.warn('[SearchPage] Counts could not be loaded.', error.message);
    }
  }

  // Desktop: filter groups (details) become a row of dropdown pills, one open at a time.
  // Mobile keeps the collection offcanvas with every group open.
  function FOXSearchPageFilters(root) {
    const bar = root.querySelector('.fox-search-page__filters');
    if (!bar) return;
    const groups = () => [...bar.querySelectorAll('details.fox-collection__filter-group')];
    const desktop = window.matchMedia(DESKTOP);
    const sync = () => groups().forEach((group) => { group.open = !desktop.matches; });
    sync();
    desktop.addEventListener('change', sync);

    bar.addEventListener('toggle', (event) => {
      if (!desktop.matches || !event.target.open) return;
      groups().forEach((group) => {
        if (group !== event.target) group.open = false;
      });
    }, true);
    document.addEventListener('click', (event) => {
      if (desktop.matches && !bar.contains(event.target)) groups().forEach((group) => { group.open = false; });
    });
    document.addEventListener('keydown', (event) => {
      if (event.key !== 'Escape' || !desktop.matches) return;
      const open = groups().find((group) => group.open);
      if (!open) return;
      open.open = false;
      open.querySelector('summary')?.focus();
    });
  }

  function FOXSearchPageInitAll() {
    document.querySelectorAll('[data-search-page]').forEach(FOXSearchPageInit);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', FOXSearchPageInitAll, { once: true });
  else FOXSearchPageInitAll();
})();
