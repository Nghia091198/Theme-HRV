(() => {
  const ROOT_SELECTOR = '[data-collection-root]';
  const REQUEST_TIMEOUT = 10000;
  const FILTER_PARAMS = {
    color: 'tag1',
    material: 'tag2',
    size: 'variant',
    price: 'price',
    fit: 'tag3',
  };

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function getControls(root) {
    return [...root.querySelectorAll('input[type="checkbox"][data-filter][data-filter-value]')];
  }

  function setControlState(control, active) {
    control.checked = active;
  }

  function getActiveValues(root) {
    return unique(getControls(root)
      .filter((control) => control.checked)
      .map((control) => control.dataset.filterValue));
  }

  function hasNamedFilterParams(params) {
    return Object.values(FILTER_PARAMS).some((param) => params.has(param));
  }

  function getBaseQuery(root) {
    return root.dataset.baseQuery || '';
  }

  function getGroupOperator(group) {
    switch (group) {
      case 'color':
      case 'material':
      case 'size':
      case 'price':
      case 'fit':
      case 'vendor':
        return '||';
      default:
        return '&&';
    }
  }

  function buildQuery(root) {
    const groups = new Map();
    getControls(root)
      .filter((control) => control.checked)
      .forEach((control) => {
        const group = control.dataset.filterGroup || 'other';
        groups.set(group, [...(groups.get(group) || []), control.dataset.filterValue]);
      });
    const filters = [...groups.entries()]
      .map(([group, values]) => {
        const groupValues = unique(values);
        return groupValues.length > 1
          ? `(${groupValues.join(getGroupOperator(group))})`
          : groupValues[0];
      });
    return `filter=${unique([getBaseQuery(root), ...filters]).join('&&')}`;
  }

  function shouldUseSearch(root) {
    return getActiveValues(root).length > 0 || (Number(root.dataset.sortCount || 1) > 1 && getSort(root) !== 'manual');
  }

  function getSort(root) {
    return root.querySelector('[data-sort]')?.dataset.sortValue || 'manual';
  }

  function getSortFromParam(value) {
    switch (value) {
      case 'created-descending':
      case '(updated_at:product=desc)':
        return 'created-descending';
      case 'price-ascending':
      case '(price:product=asc)':
        return 'price-ascending';
      case 'price-descending':
      case '(price:product=desc)':
        return 'price-descending';
      default:
        return 'manual';
    }
  }

  function getSearchSort(sort) {
    switch (sort) {
      case 'created-descending': return '(updated_at:product=desc)';
      case 'price-ascending': return '(price:product=asc)';
      case 'price-descending': return '(price:product=desc)';
      default: return '';
    }
  }

  function setSort(root, value) {
    const sort = root.querySelector('[data-sort]');
    if (!sort) return;
    const selected = getSortFromParam(value);
    const option = sort.querySelector(`[data-sort-option="${selected}"]`);
    sort.dataset.sortValue = selected;
    const label = sort.querySelector('[data-sort-label]');
    if (label && option) label.textContent = option.textContent;
    sort.querySelectorAll('[data-sort-option]').forEach((link) => {
      if (link === option) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    });
  }

  function closeSort(root) {
    const sort = root.querySelector('[data-sort]');
    if (!sort?.open || sort.dataset.closing === 'true') return;
    sort.dataset.closing = 'true';
    const options = sort.querySelector('[data-role="sort-options"]');
    if (options) options.inert = true;
    window.clearTimeout(root._foxCollectionSortTimer);
    root._foxCollectionSortTimer = window.setTimeout(() => {
      sort.open = false;
      if (options) {
        options.inert = false;
        options.removeAttribute('data-hover-active');
      }
      delete sort.dataset.closing;
      delete sort.dataset.openedByHover;
      root._foxCollectionSortTimer = null;
    }, window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 320);
  }

  function openSort(root) {
    const sort = root.querySelector('[data-sort]');
    if (!sort) return;
    window.clearTimeout(root._foxCollectionSortTimer);
    root._foxCollectionSortTimer = null;
    delete sort.dataset.closing;
    const options = sort.querySelector('[data-role="sort-options"]');
    if (options) options.inert = false;
    sort.dataset.openedByHover = 'true';
    sort.open = true;
  }

  function moveSortIndicator(options, link) {
    const item = link.closest('li');
    if (!item) return;
    const listRect = options.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    options.style.setProperty('--fox-sort-hover-y', `${itemRect.top - listRect.top}px`);
    options.style.setProperty('--fox-sort-hover-height', `${itemRect.height}px`);
    options.setAttribute('data-hover-active', '');
  }

  function readState(root) {
    return { values: getActiveValues(root), sort: getSort(root) };
  }

  function applyState(root, state) {
    const values = new Set(state.values || []);
    getControls(root).forEach((control) => {
      setControlState(control, values.has(control.dataset.filterValue));
    });
    setSort(root, state.sort || 'manual');
    renderActiveFilters(root);
  }

  function getPage(url) {
    const page = Number(new URL(url, window.location.href).searchParams.get('page') || 1);
    return Number.isFinite(page) && page > 0 ? page : 1;
  }

  function buildRequestUrl(root, sourceUrl) {
    const useSearch = shouldUseSearch(root);
    const template = useSearch ? root.dataset.searchTemplate : root.dataset.productsTemplate;
    const requestUrl = new URL(template || window.location.href, window.location.href);
    const source = sourceUrl ? new URL(sourceUrl, window.location.href) : null;
    const sort = getSort(root);

    requestUrl.searchParams.set('view', 'data');
    requestUrl.searchParams.set('page', String(source ? getPage(source) : 1));
    const sortParam = useSearch ? 'sortby' : 'sort_by';
    const otherSortParam = useSearch ? 'sort_by' : 'sortby';
    requestUrl.searchParams.delete(otherSortParam);
    if (sort && sort !== 'manual') requestUrl.searchParams.set(sortParam, useSearch ? getSearchSort(sort) : sort);
    else requestUrl.searchParams.delete(sortParam);

    if (useSearch) requestUrl.searchParams.set(root.dataset.queryParam || 'q', buildQuery(root));
    else requestUrl.searchParams.delete(root.dataset.queryParam || 'q');

    return requestUrl;
  }

  function getCanonicalUrl(root, sourceUrl) {
    const canonical = new URL(root.dataset.collectionUrl || window.location.pathname, window.location.href);
    const source = sourceUrl ? new URL(sourceUrl, window.location.href) : null;
    const sort = getSort(root);

    if (source?.searchParams.get('page')) canonical.searchParams.set('page', source.searchParams.get('page'));
    if (sort && sort !== 'manual') canonical.searchParams.set('sort_by', sort);
    else {
      canonical.searchParams.delete('sort_by');
      canonical.searchParams.delete('sortby');
    }
    canonical.searchParams.delete(root.dataset.queryParam || 'q');
    if (root.dataset.pushFilterParams === 'true') {
      const selected = new Map();
      getControls(root).filter((control) => control.checked).forEach((control) => {
        const param = FILTER_PARAMS[control.dataset.filterGroup];
        const value = control.dataset.filterParamValue;
        if (!param || !value) return;
        selected.set(param, [...(selected.get(param) || []), value]);
      });
      Object.values(FILTER_PARAMS).forEach((param) => {
        const values = unique(selected.get(param) || []);
        if (values.length) canonical.searchParams.set(param, values.join(','));
      });
    }

    return canonical;
  }

  function getResultsContent(root) {
    return root.querySelector('[data-role="results-content"]');
  }

  function syncPaginationMode(root) {
    const loadMore = root.dataset.paginationMode === 'load-more';
    root.querySelectorAll('[data-pagination-load-more]').forEach((control) => {
      control.hidden = !loadMore;
    });
  }

  function setStatus(root, message) {
    const status = root.querySelector('[data-role="status"]');
    if (status) status.textContent = message || '';
  }

  function renderActiveFilters(root) {
    root.querySelectorAll('[data-role="active-filters"]').forEach((container) => {
      container.replaceChildren();
      const active = getControls(root).filter((control) => control.checked);
      active.forEach((control) => {
        const label = control.dataset.filterLabel || control.closest('label')?.textContent.trim() || '';
        const chip = document.createElement('button');
        chip.type = 'button';
        chip.className = 'fox-collection__active-chip';
        chip.dataset.filterRemove = control.dataset.filterValue;
        chip.setAttribute('aria-label', `Bỏ lọc ${label}`);
        chip.textContent = `${label} ×`;
        container.append(chip);
      });
    });
    const hasActiveFilters = getActiveValues(root).length > 0;
    root.querySelectorAll('[data-filter-reset]').forEach((clear) => {
      clear.hidden = !hasActiveFilters;
    });
  }

  function syncResultSummary(root, content) {
    if (!content) return;
    const total = Number(content.dataset.resultCount);
    const page = Number(content.dataset.resultPage || 1);
    const visible = content.querySelectorAll('[data-role="product-grid"] > product-card').length;
    if (!Number.isFinite(total) || !Number.isFinite(page) || !Number.isFinite(visible)) return;
    const count = root.querySelector('[data-role="result-count"]');
    const range = root.querySelector('[data-role="result-range"]');
    const start = total > 0 && visible > 0 ? (page - 1) * Number(root.dataset.pageSize || 12) + 1 : 0;
    const end = start ? Math.min(start + visible - 1, total) : 0;
    if (count) count.textContent = String(total);
    if (range) range.textContent = `${start}–${end}`;
  }

  function setView(root, view) {
    const next = view === 'list' ? 'list' : 'grid';
    root.dataset.view = next;
    root.querySelectorAll('[data-view-toggle]').forEach((button) => {
      button.setAttribute('aria-pressed', String(button.dataset.viewToggle === next));
    });
  }

  function syncFromUrl(root) {
    const params = new URL(window.location.href).searchParams;
    const saved = window.history.state?.foxCollection;
    const namedFilters = hasNamedFilterParams(params);
    const selected = new Map(Object.values(FILTER_PARAMS).map((param) => [
      param,
      new Set((params.get(param) || '').split(',').filter(Boolean)),
    ]));
    const legacyQuery = params.get(root.dataset.queryParam || 'q') || '';
    const values = root.dataset.pushFilterParams === 'true'
      ? getControls(root).filter((control) => {
        if (namedFilters) {
          const param = FILTER_PARAMS[control.dataset.filterGroup];
          return selected.get(param)?.has(control.dataset.filterParamValue);
        }
        return legacyQuery.startsWith('filter=') && legacyQuery.includes(control.dataset.filterValue);
      }).map((control) => control.dataset.filterValue)
      : saved?.values || [];
    const sort = getSortFromParam(params.get('sort_by') || params.get('sortby') || saved?.sort || 'manual');
    applyState(root, { values, sort });
  }

  function setLoading(root, loading) {
    const results = root.querySelector('[data-role="results"]');
    const skeleton = root.querySelector('[data-role="loading"]');
    if (loading) root.dataset.state = 'loading';
    else if (root.dataset.state === 'loading') root.dataset.state = 'ready';
    if (results) results.setAttribute('aria-busy', String(loading));
    if (skeleton) skeleton.hidden = !loading;
  }

  function replaceResults(root, nextContent, append) {
    const currentContent = getResultsContent(root);
    if (!currentContent || !nextContent) throw new Error('Collection result fragment is missing.');

    if (!append) {
      currentContent.replaceWith(nextContent);
      syncResultSummary(root, nextContent);
      syncPaginationMode(root);
      return;
    }

    const currentGrid = currentContent.querySelector('[data-role="product-grid"]');
    const nextGrid = nextContent.querySelector('[data-role="product-grid"]');
    if (!currentGrid || !nextGrid) throw new Error('Collection product grid is missing.');
    nextGrid.querySelectorAll(':scope > *').forEach((item) => currentGrid.append(item));
    currentContent.querySelector('[data-role="pagination"]')?.remove();
    const nextPagination = nextContent.querySelector('[data-role="pagination"]');
    if (nextPagination) currentContent.append(nextPagination);
    syncResultSummary(root, nextContent);
    syncPaginationMode(root);
  }

  async function request(root, sourceUrl, options = {}) {
    const controller = new AbortController();
    const previousController = root._foxCollectionRequest;
    previousController?.abort();
    root._foxCollectionRequest = controller;
    let timedOut = false;
    const timeout = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, REQUEST_TIMEOUT);
    const append = options.append === true;
    const requestUrl = buildRequestUrl(root, sourceUrl);

    setLoading(root, true);
    setStatus(root, 'Đang tải sản phẩm…');

    try {
      const response = await fetch(requestUrl.toString(), {
        signal: controller.signal,
        credentials: 'same-origin',
        headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const fragment = new DOMParser().parseFromString(html, 'text/html');
      const nextContent = fragment.querySelector('[data-role="results-content"]');
      if (!nextContent) throw new Error('Empty collection response.');
      if (root._foxCollectionRequest !== controller) return;

      replaceResults(root, nextContent, append);
      root.dataset.query = buildQuery(root);
      root.dataset.state = 'ready';
      root._foxCollectionConfirmedState = readState(root);
      if (!options.skipHistory) {
        window.history.pushState(
          { ...window.history.state, foxCollection: root._foxCollectionConfirmedState },
          '',
          getCanonicalUrl(root, sourceUrl),
        );
      }
      setStatus(root, '');
      root.dispatchEvent(new CustomEvent('collection:updated', {
        bubbles: true,
        detail: { url: requestUrl.toString(), query: root.dataset.query, append },
      }));
    } catch (error) {
      if (root._foxCollectionRequest === controller && (error.name !== 'AbortError' || timedOut)) {
        if (!options.skipHistory) applyState(root, root._foxCollectionConfirmedState);
        root.dataset.state = 'error';
        setStatus(root, 'Không thể tải sản phẩm. Vui lòng thử lại.');
        console.warn('[core-commerce-collection] Request failed.', error);
      }
    } finally {
      window.clearTimeout(timeout);
      if (root._foxCollectionRequest === controller) {
        root._foxCollectionRequest = null;
        setLoading(root, false);
      }
    }
  }

  function toggleFilter(root, open) {
    const filters = root.querySelector('[data-role="filters"]');
    const media = root._foxCollectionMobile;
    if (!filters || (!media?.matches && open)) return;
    const wasOpen = root.dataset.filterOpen === 'true';
    if (open === wasOpen) return;
    root.dataset.filterOpen = String(open);
    const toggle = root.querySelector('[data-filter-toggle]');
    if (toggle) toggle.setAttribute('aria-expanded', String(open));
    const overlay = root.querySelector('[data-filter-overlay]');
    if (overlay) overlay.hidden = !open;
    filters.inert = !open;
    if (open) {
      root._foxCollectionReturnFocus = document.activeElement;
      filters.setAttribute('role', 'dialog');
      filters.setAttribute('aria-modal', 'true');
      window.FOX?.isOverlay?.(true, root, { lock: true, visual: false });
      filters.querySelector('[data-filter-close]')?.focus();
    } else {
      filters.removeAttribute('role');
      filters.removeAttribute('aria-modal');
      window.FOX?.isOverlay?.(false, root);
      root._foxCollectionReturnFocus?.focus();
      root._foxCollectionReturnFocus = null;
    }
  }

  function handleKeydown(root, event) {
    const sort = root.querySelector('[data-sort]');
    if (event.key === 'Escape' && sort?.open) {
      closeSort(root);
      sort.querySelector('summary')?.focus();
      event.preventDefault();
      return;
    }
    if (root.dataset.filterOpen !== 'true') return;
    if (event.key === 'Escape') {
      event.preventDefault();
      toggleFilter(root, false);
      return;
    }
    if (event.key !== 'Tab') return;
    const filters = root.querySelector('[data-role="filters"]');
    const focusable = [...filters.querySelectorAll('button:not([disabled]), summary, a[href], input:not([disabled]), select:not([disabled])')]
      .filter((element) => element.getClientRects().length);
    if (!focusable.length) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function handleClick(root, event) {
    const sortSummary = event.target.closest('[data-sort] > summary');
    if (sortSummary && root.contains(sortSummary) && sortSummary.parentElement.open) {
      event.preventDefault();
      if (sortSummary.parentElement.dataset.openedByHover === 'true') {
        delete sortSummary.parentElement.dataset.openedByHover;
        return;
      }
      closeSort(root);
      return;
    }
    const sortOption = event.target.closest('[data-sort-option]');
    if (sortOption && root.contains(sortOption)) {
      event.preventDefault();
      const previous = getSort(root);
      setSort(root, sortOption.dataset.sortOption);
      closeSort(root);
      if (getSort(root) !== previous) request(root);
      return;
    }
    const view = event.target.closest('[data-view-toggle]');
    if (view && root.contains(view)) {
      setView(root, view.dataset.viewToggle);
      return;
    }
    const chip = event.target.closest('[data-filter-remove]');
    if (chip && root.contains(chip)) {
      getControls(root)
        .filter((control) => control.dataset.filterValue === chip.dataset.filterRemove)
        .forEach((control) => setControlState(control, false));
      renderActiveFilters(root);
      request(root);
      return;
    }

    if (event.target.closest('[data-filter-reset]')) {
      getControls(root).forEach((control) => setControlState(control, false));
      renderActiveFilters(root);
      request(root);
      return;
    }

    if (event.target.closest('[data-filter-toggle]')) {
      toggleFilter(root, true);
      return;
    }

    if (event.target.closest('[data-filter-close]')) {
      toggleFilter(root, false);
      return;
    }

    const loadMore = event.target.closest('[data-pagination-load-more]');
    if (loadMore && root.contains(loadMore)) {
      event.preventDefault();
      request(root, loadMore.dataset.paginationUrl, { append: true, skipHistory: true });
      return;
    }

    const paginationLink = event.target.closest('[data-role="pagination"] a');
    if (paginationLink && root.contains(paginationLink)) {
      event.preventDefault();
      request(root, paginationLink.href);
    }
  }

  function handleChange(root, event) {
    if (event.target.matches('input[type="checkbox"][data-filter][data-filter-value]')) {
      const filter = event.target;
      getControls(root)
        .filter((control) => control.dataset.filterValue === filter.dataset.filterValue)
        .forEach((control) => setControlState(control, filter.checked));
      renderActiveFilters(root);
      request(root);
      return;
    }
  }

  function initialize(root) {
    if (root.dataset.collectionReady === 'true') return;
    root.dataset.collectionReady = 'true';
    root._foxCollectionRequest = null;
    const controller = new AbortController();
    const { signal } = controller;
    const mobile = window.matchMedia('(max-width: 767px)');
    root._foxCollectionMobile = mobile;
    const filters = root.querySelector('[data-role="filters"]');
    if (filters) filters.inert = mobile.matches;
    const toggle = root.querySelector('[data-filter-toggle]');
    if (toggle) toggle.hidden = false;
    const views = root.querySelector('.fox-collection__views');
    if (views) views.hidden = false;
    setView(root, 'grid');

    const sort = root.querySelector('[data-sort]');
    if (sort) {
      const hoverQuery = window.matchMedia('(hover: hover) and (pointer: fine)');
      const options = sort.querySelector('[data-role="sort-options"]');
      if (options) {
        options.addEventListener('pointerover', (event) => {
          const link = event.target.closest?.('[data-sort-option]');
          if (link && options.contains(link)) moveSortIndicator(options, link);
        }, { signal });
        options.addEventListener('pointerleave', () => {
          if (!options.contains(document.activeElement)) options.removeAttribute('data-hover-active');
        }, { signal });
        options.addEventListener('focusin', (event) => {
          const link = event.target.closest?.('[data-sort-option]');
          if (link && options.contains(link)) moveSortIndicator(options, link);
        }, { signal });
        options.addEventListener('focusout', (event) => {
          if (!options.contains(event.relatedTarget)) options.removeAttribute('data-hover-active');
        }, { signal });
      }
      sort.addEventListener('pointerenter', () => {
        if (hoverQuery.matches) openSort(root);
      }, { signal });
      sort.addEventListener('pointerleave', () => {
        if (hoverQuery.matches) closeSort(root);
      }, { signal });
      sort.addEventListener('focusout', (event) => {
        if (!sort.contains(event.relatedTarget)) closeSort(root);
      }, { signal });
    }

    root.addEventListener('click', (event) => handleClick(root, event), { signal });
    root.addEventListener('change', (event) => handleChange(root, event), { signal });
    root.addEventListener('keydown', (event) => handleKeydown(root, event), { signal });
    document.addEventListener('click', (event) => {
      const sort = root.querySelector('[data-sort]');
      if (sort?.open && !sort.contains(event.target)) closeSort(root);
    }, { signal });
    mobile.addEventListener('change', () => {
      if (root.dataset.filterOpen === 'true') toggleFilter(root, false);
      if (filters) filters.inert = mobile.matches;
    }, { signal });
    window.addEventListener('popstate', () => {
      syncFromUrl(root);
      request(root, window.location.href, { skipHistory: true });
    }, { signal });
    window.addEventListener('pagehide', () => {
      if (root.dataset.filterOpen === 'true') toggleFilter(root, false);
      root._foxCollectionRequest?.abort();
      window.clearTimeout(root._foxCollectionSortTimer);
      controller.abort();
    }, { once: true, signal });

    const initialParams = new URL(window.location.href).searchParams;
    const legacyFilter = (initialParams.get(root.dataset.queryParam || 'q') || '').startsWith('filter=');
    const hasFilterParams = root.dataset.pushFilterParams === 'true' && (hasNamedFilterParams(initialParams) || legacyFilter);
    syncFromUrl(root);
    root._foxCollectionConfirmedState = readState(root);
    window.history.replaceState(
      { ...window.history.state, foxCollection: root._foxCollectionConfirmedState },
      '',
      hasFilterParams && legacyFilter ? getCanonicalUrl(root, window.location.href) : window.location.href,
    );
    syncPaginationMode(root);
    if (hasFilterParams || initialParams.get('sortby') || (Number(root.dataset.sortCount || 1) > 1 && initialParams.get('sort_by'))) {
      request(root, window.location.href, { skipHistory: true });
    }
  }

  function initializeAll() {
    document.querySelectorAll(ROOT_SELECTOR).forEach(initialize);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initializeAll, { once: true });
  else initializeAll();
})();
