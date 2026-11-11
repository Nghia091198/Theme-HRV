(() => {
  const MIN_HEADINGS = 2;
  const TOC_DESKTOP_QUERY = '(min-width: 992px)';

  function FOXSlugify(text, used) {
    const base = String(text || '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'muc';
    let slug = base;
    let index = 2;
    while (used.has(slug) || document.getElementById(slug)) {
      slug = `${base}-${index}`;
      index += 1;
    }
    used.add(slug);
    return slug;
  }
  function FOXRenderTableOfContents(container) {
    if (!container || container.dataset.state === 'ready') return;
    const content = document.querySelector(container.dataset.target || '#fox-article-content');
    const headings = [...(content?.querySelectorAll('h1, h2, h3, h4, h5, h6') || [])].filter((heading) => heading.textContent.trim());
    if (headings.length < MIN_HEADINGS) {
      container.dataset.state = 'empty';
      return;
    }

    const used = new Set();
    headings.forEach((heading) => {
      if (!heading.id) heading.id = FOXSlugify(heading.textContent, used);
    });

    const details = document.createElement('details');
    details.className = 'fox-blog-toc__accordion';

    const summary = document.createElement('summary');
    summary.className = 'fox-blog-toc__summary';
    summary.innerHTML = '<svg class="icon-svg" aria-hidden="true" focusable="false"><use xlink:href="#ic-fox-blog-toc"></use></svg>';
    const title = document.createElement('span');
    title.textContent = container.dataset.title || 'Mục lục';
    const count = document.createElement('span');
    count.className = 'fox-blog-toc__count';
    count.textContent = `${headings.length} ${container.dataset.countLabel || ''}`.trim();
    summary.append(title, count);

    const list = document.createElement('ol');
    list.className = 'fox-blog-toc__list';

    const stack = [];
    const links = headings.map((heading) => {
      const level = Number(heading.tagName.slice(1));
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      item.append(link);
      while (stack.length && stack[stack.length - 1].level >= level) stack.pop();
      const parent = stack[stack.length - 1];
      if (parent) {
        if (!parent.sublist) {
          parent.sublist = document.createElement('ol');
          parent.sublist.className = 'fox-blog-toc__sublist';
          parent.item.append(parent.sublist);
        }
        parent.sublist.append(item);
      } else {
        list.append(item);
      }
      stack.push({ level, item, sublist: null });
      return link;
    });

    details.append(summary, list);
    container.classList.add('fox-blog-toc', 'fox-blog-toc--inline');
    container.replaceChildren(details);
    
    const desktop = window.matchMedia(TOC_DESKTOP_QUERY);
    details.open = desktop.matches;
    container.addEventListener('click', (event) => {
      if (event.target.closest('a') && !desktop.matches) details.open = false;
    });

    const anchorLinks = FOXMountTocAnchor(container, content, list, title.textContent, count.textContent);
    const allLinks = links.concat(anchorLinks);

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        allLinks.forEach((link) => {
          const active = link.getAttribute('href') === `#${entry.target.id}`;
          link.classList.toggle('is-active', active);
          if (active) link.setAttribute('aria-current', 'location');
          else link.removeAttribute('aria-current');
        });
      });
    }, { rootMargin: '0px 0px -70% 0px' });
    headings.forEach((heading) => observer.observe(heading));

    container.hidden = false;
    container.dataset.state = 'ready';
  }

  const TOC_DRAWER_ID = 'fox-toc-drawer';
  const TOC_DRAWER_DURATION = 360;
  const TOC_CLOSE_ICON = '<svg class="fox-quick-view__close-progress" width="90" height="90" viewBox="0 0 90 90" fill="none" aria-hidden="true" focusable="false"><circle class="fox-quick-view__close-track" cx="45" cy="45" r="43.5"></circle><circle class="fox-quick-view__close-value" cx="45" cy="45" r="43.5" pathLength="1"></circle></svg><svg class="fox-quick-view__close-icon" aria-hidden="true" focusable="false" width="10" height="10" viewBox="0 0 10 10" fill="none"><path fill="currentColor" d="M6.17839 5L9.75586 1.42253C10.0814 1.09701 10.0814 0.569661 9.75586 0.244141C9.43034 -0.0813802 8.90299 -0.0813802 8.57747 0.244141L5 3.82161L1.42253 0.244141C1.09701 -0.0813802 0.569661 -0.0813802 0.244141 0.244141C-0.0813802 0.569661 -0.0813802 1.09701 0.244141 1.42253L3.82161 5L0.244141 8.57747C-0.0813802 8.90299 -0.0813802 9.43034 0.244141 9.75586C0.406901 9.91862 0.620117 10 0.833333 10C1.04655 10 1.25977 9.91862 1.42253 9.75586L5 6.17839L8.57747 9.75586C8.74023 9.91862 8.95345 10 9.16667 10C9.37988 10 9.5931 9.91862 9.75586 9.75586C10.0814 9.43034 10.0814 8.90299 9.75586 8.57747L6.17839 5Z"></path></svg>';

  // Floating anchor (left edge) shown once the inline table of contents has scrolled away while the article is still
  // on screen; it opens the same list in a left drawer with the mini cart's motion (core-offcanvas).
  function FOXMountTocAnchor(container, content, list, titleText, countText) {
    const anchor = document.createElement('button');
    anchor.type = 'button';
    anchor.className = 'fox-toc-anchor';
    anchor.setAttribute('aria-controls', TOC_DRAWER_ID);
    anchor.setAttribute('aria-expanded', 'false');
    anchor.setAttribute('aria-label', `Mở ${titleText.toLowerCase()}`);
    anchor.hidden = true;
    anchor.innerHTML = '<svg class="icon-svg" aria-hidden="true" focusable="false"><use xlink:href="#ic-fox-blog-toc"></use></svg>';

    const drawer = document.createElement('div');
    drawer.id = TOC_DRAWER_ID;
    drawer.className = 'core-offcanvas fox-toc-drawer';
    drawer.dataset.position = 'left';
    drawer.dataset.state = 'ready';
    drawer.setAttribute('aria-hidden', 'true');
    drawer.innerHTML = `
      <button type="button" class="core-offcanvas__overlay fox-toc-drawer__overlay" data-action="close" aria-label="Đóng" tabindex="-1"></button>
      <div class="core-offcanvas__panel fox-toc-drawer__panel" role="dialog" aria-modal="true" aria-labelledby="${TOC_DRAWER_ID}-title" tabindex="-1">
        <div class="core-offcanvas__content fox-toc-drawer__content">
          <header class="fox-toc-drawer__head">
            <svg class="icon-svg" aria-hidden="true" focusable="false"><use xlink:href="#ic-fox-blog-toc"></use></svg>
            <h2 id="${TOC_DRAWER_ID}-title" class="fox-toc-drawer__title"></h2>
            <span class="fox-toc-drawer__count"></span>
            <button type="button" class="fox-quick-view__close fox-toc-drawer__close" data-action="close" aria-label="Đóng">${TOC_CLOSE_ICON}</button>
          </header>
        </div>
      </div>`;
    drawer.querySelector('.fox-toc-drawer__title').textContent = titleText;
    drawer.querySelector('.fox-toc-drawer__count').textContent = countText;
    const drawerList = list.cloneNode(true);
    drawerList.className = 'fox-blog-toc__list fox-toc-drawer__list';
    drawer.querySelector('.fox-toc-drawer__content').append(drawerList);
    const panel = drawer.querySelector('.fox-toc-drawer__panel');

    let closeTimer = 0;
    const isOpen = () => drawer.hasAttribute('data-open');
    const open = () => {
      if (isOpen()) return;
      window.clearTimeout(closeTimer);
      drawer.removeAttribute('data-closing');
      drawer.setAttribute('data-open', '');
      drawer.setAttribute('aria-hidden', 'false');
      anchor.setAttribute('aria-expanded', 'true');
      requestAnimationFrame(() => panel.focus({ preventScroll: true }));
    };
    const close = (returnFocus = true) => {
      if (!isOpen()) return;
      drawer.removeAttribute('data-open');
      drawer.setAttribute('data-closing', '');
      anchor.setAttribute('aria-expanded', 'false');
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => {
        drawer.removeAttribute('data-closing');
        drawer.setAttribute('aria-hidden', 'true');
        if (returnFocus && !anchor.hidden) anchor.focus({ preventScroll: true });
      }, TOC_DRAWER_DURATION);
    };

    anchor.addEventListener('click', open);
    drawer.addEventListener('click', (event) => {
      if (event.target.closest('[data-action="close"]')) {
        close();
        return;
      }
      const link = event.target.closest('a[href^="#"]');
      if (!link) return;
      event.preventDefault();
      const target = document.getElementById(link.getAttribute('href').slice(1));
      close(false);
      window.setTimeout(() => {
        target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        history.replaceState(null, '', link.getAttribute('href'));
      }, TOC_DRAWER_DURATION);
    });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) close();
    });

    document.body.append(anchor, drawer);

    let tocPassed = false;
    let inArticle = false;
    const sync = () => {
      anchor.hidden = !(tocPassed && inArticle);
    };
    new IntersectionObserver(([entry]) => {
      tocPassed = !entry.isIntersecting && entry.boundingClientRect.top < 0;
      sync();
    }).observe(container);
    new IntersectionObserver(([entry]) => {
      inArticle = entry.isIntersecting;
      sync();
    }).observe(content);

    return [...drawerList.querySelectorAll('a')];
  }

  window.FOX = window.FOX || {};
  window.FOX.renderTableOfContents = FOXRenderTableOfContents;

  FOXRenderTableOfContents(document.getElementById('table-of-contents'));
})();
