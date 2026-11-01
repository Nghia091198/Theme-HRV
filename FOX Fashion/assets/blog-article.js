(() => {
  const MIN_HEADINGS = 2;

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

  // Table of contents: Liquid renders only <div id="table-of-contents" data-target data-title data-count-label>.
  // This builds the collapsible glass block from the target's <h2>s and appends it into that element.
  function FOXRenderTableOfContents(container) {
    if (!container || container.dataset.state === 'ready') return;
    const content = document.querySelector(container.dataset.target || '#fox-article-content');
    const headings = [...(content?.querySelectorAll('h2') || [])].filter((heading) => heading.textContent.trim());
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
    const links = headings.map((heading) => {
      const item = document.createElement('li');
      const link = document.createElement('a');
      link.href = `#${heading.id}`;
      link.textContent = heading.textContent.trim();
      item.append(link);
      list.append(item);
      return link;
    });

    details.append(summary, list);
    container.classList.add('fox-blog-toc', 'fox-blog-toc--inline');
    container.replaceChildren(details);
    container.addEventListener('click', (event) => {
      if (event.target.closest('a')) details.open = false;
    });

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        links.forEach((link) => {
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

  window.FOX = window.FOX || {};
  window.FOX.renderTableOfContents = FOXRenderTableOfContents;

  FOXRenderTableOfContents(document.getElementById('table-of-contents'));
})();
