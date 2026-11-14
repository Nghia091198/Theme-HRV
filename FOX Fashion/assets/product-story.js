class FoxProductStory extends HTMLElement {
  #abort = null;
  #cards = [];
  #modal = null;
  #modalSlider = null;
  #outerSlider = null;
  #progressItems = [];
  #productScrollbar = null;
  #productScrollbarThumb = null;
  #resumeTimer = null;
  #viewportObserver = null;
  #wasPlaying = false;
  #modalOpen = false;
  #reducedMotion = false;

  connectedCallback() {
    this.destroy();
    this.#abort = new AbortController();
    this.#cards = [...this.querySelectorAll('[data-story-card]')];
    this.#modal = this.querySelector('modal-component');
    this.#modalSlider = this.querySelector('[data-story-modal-slider]');
    this.#outerSlider = this.querySelector('.fox-product-story__slider');
    this.#progressItems = [...this.querySelectorAll('[data-story-progress-item]')];
    this.#productScrollbar = this.querySelector('[data-product-scrollbar]');
    this.#productScrollbarThumb = this.querySelector('[data-product-scrollbar-thumb]');
    this.#reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false;
    if (!this.#cards.length || !this.#modal || !this.#modalSlider || !this.#outerSlider) {
      this.dataset.state = 'error';
      return;
    }

    const { signal } = this.#abort;
    this.addEventListener('click', (event) => this.#onClick(event), { signal });
    this.addEventListener('pointerover', (event) => this.#onPointerOver(event), { signal });
    this.addEventListener('pointerout', (event) => this.#onPointerOut(event), { signal });
    this.addEventListener('focusin', (event) => this.#onFocusIn(event), { signal });
    this.addEventListener('focusout', (event) => this.#onFocusOut(event), { signal });
    this.addEventListener('slider:change', (event) => this.#onSliderChange(event), { signal });
    this.addEventListener('modal:opened', () => this.#onModalOpened(), { signal });
    this.addEventListener('modal:closed', () => this.#onModalClosed(), { signal });
    this.querySelectorAll('.fox-product-story__products').forEach((products) => {
      products.addEventListener('scroll', () => {
        if (products === this.#getActiveProducts()) this.#syncProductScrollbar(products);
      }, { signal, passive: true });
      this.#enableProductDrag(products, signal);
    });
    this.#hydrateProducts();
    this.#observeMedia();
    this.#bindDismissFollow(signal);
    this.dataset.state = 'ready';
  }

  // The backdrop close button follows the pointer (composited transform, one write per frame) and parks back in its
  // corner over the story surface, where the regular cursor is needed. Mouse devices only.
  #bindDismissFollow(signal) {
    const dismiss = this.querySelector('.fox-product-story__dismiss');
    const dialog = dismiss?.closest('dialog');
    if (!dismiss || !dialog || !window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let pointerX = 0;
    let pointerY = 0;
    const park = () => {
      cancelAnimationFrame(frame);
      frame = 0;
      dismiss.removeAttribute('data-follow');
      dismiss.style.removeProperty('transform');
    };

    dialog.addEventListener('pointermove', (event) => {
      if (event.pointerType !== 'mouse') return;
      if (event.target.closest('[data-role="surface"]')) {
        // Over the story: fade out where it is (like a custom cursor) instead of jumping back to the corner.
        if (dismiss.dataset.follow === 'true') dismiss.dataset.follow = 'idle';
        return;
      }
      pointerX = event.clientX;
      pointerY = event.clientY;
      dismiss.dataset.follow = 'true';
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const half = dismiss.offsetWidth / 2;
        dismiss.style.transform = `translate3d(${pointerX - half}px, ${pointerY - half}px, 0)`;
      });
    }, { signal, passive: true });
    dialog.addEventListener('pointerleave', park, { signal });
    this.addEventListener('modal:closed', park, { signal });
  }

  disconnectedCallback() { this.destroy(); }

  destroy() {
    this.#abort?.abort();
    this.#abort = null;
    this.#viewportObserver?.disconnect();
    this.#viewportObserver = null;
    clearTimeout(this.#resumeTimer);
    this.#pauseAll(true);
    this.#cards = [];
    this.#modal = null;
    this.#modalSlider = null;
    this.#outerSlider = null;
    this.#progressItems = [];
    this.#productScrollbar = null;
    this.#productScrollbarThumb = null;
    this.#modalOpen = false;
    this.dataset.state = 'idle';
  }

  #onClick(event) {
    const quickView = event.target.closest('[data-action="quickview"]');
    // Quick view owns the document-level click handler, so this event must keep bubbling.
    if (quickView && this.contains(quickView)) return;

    if (event.target.closest('[data-story-product-link], [data-story-product], product-card, add-to-cart')) {
      event.stopPropagation();
      return;
    }
    const trigger = event.target.closest('[data-action="open-story"]');
    if (!trigger || !this.contains(trigger) || this.dataset.state === 'opening' || this.dataset.state === 'closing') return;
    event.preventDefault();
    const card = trigger.closest('[data-story-card]');
    this.#openStory(Number(card?.dataset.storyIndex || 0), trigger);
  }

  #onPointerOver(event) {
    if (event.pointerType === 'touch' || this.dataset.hoverPreview === 'false' || this.#reducedMotion || this.#modalOpen) return;
    const card = event.target.closest('[data-story-card]');
    if (!card || card.contains(event.relatedTarget)) return;
    clearTimeout(this.#resumeTimer);
    this.#outerSlider.pause();
    this.#playCard(card);
  }

  #onPointerOut(event) {
    const card = event.target.closest('[data-story-card]');
    if (!card || card.contains(event.relatedTarget)) return;
    this.#stopCard(card, true);
    this.#queueResume();
  }

  #onFocusIn(event) {
    const card = event.target.closest('[data-story-card]');
    if (!card || this.#reducedMotion || this.dataset.hoverPreview === 'false') return;
    clearTimeout(this.#resumeTimer);
    this.#outerSlider.pause();
    this.#playCard(card);
  }

  #onFocusOut(event) {
    const card = event.target.closest('[data-story-card]');
    if (!card || card.contains(event.relatedTarget)) return;
    this.#stopCard(card, true);
    this.#queueResume();
  }

  async #openStory(index, trigger) {
    this.dataset.state = 'opening';
    this.#wasPlaying = this.#outerSlider.isPlaying;
    this.#outerSlider.pause();
    this.#pauseAll(false);
    this.#modalSlider.goTo(index);
    this.dataset.activeIndex = String(index);
    this.#syncProgress(index);
    this.dispatchEvent(new CustomEvent('product-story:open', { bubbles: true, detail: { index } }));
    const opened = await this.#modal.open(trigger);
    if (!opened) this.dataset.state = 'ready';
  }

  #onModalOpened() {
    this.#modalOpen = true;
    this.dataset.state = 'open';
    this.#playModal(Number(this.#modalSlider.activeIndex || 0));
    this.#syncActiveProductScrollbar();
  }

  #onModalClosed() {
    const index = Number(this.dataset.activeIndex || 0);
    this.#modalOpen = false;
    this.#pauseAll(true);
    this.dataset.state = 'ready';
    if (this.#wasPlaying && !this.#reducedMotion) this.#outerSlider.play();
    this.dispatchEvent(new CustomEvent('product-story:close', { bubbles: true, detail: { index } }));
  }

  #onSliderChange(event) {
    if (event.target !== this.#modalSlider) return;
    const index = Number(event.detail?.index || 0);
    this.dataset.activeIndex = String(index);
    this.#syncProgress(index);
    if (this.#modalOpen) this.#playModal(index);
    this.#syncActiveProductScrollbar(index);
    this.dispatchEvent(new CustomEvent('product-story:change', { bubbles: true, detail: { index } }));
  }

  #queueResume() {
    clearTimeout(this.#resumeTimer);
    this.#resumeTimer = setTimeout(() => {
      if (!this.#modalOpen && !this.#reducedMotion && !this.matches(':hover') && !this.contains(document.activeElement)) {
        this.#outerSlider.play();
      }
    }, 200);
  }

  #playCard(card) {
    this.#cards.forEach((item) => { if (item !== card) this.#stopCard(item, true); });
    const video = card.querySelector('video');
    if (!video) return;
    this.#loadVideo(video);
    video.play().then(() => { card.dataset.previewing = 'true'; }).catch(() => {});
  }

  #stopCard(card, reset) {
    const video = card?.querySelector('video');
    if (!video) return;
    video.pause();
    // Without a poster image the paused video is the cover: back to 0.1s (same as the #t=0.1 preload), past a
    // possible black first frame.
    const coverTime = card.querySelector('.fox-product-story__media > img') ? 0 : 0.1;
    if (reset) try { video.currentTime = coverTime; } catch (error) {}
    card.removeAttribute('data-previewing');
  }

  #playModal(index) {
    this.querySelectorAll('[data-story-modal-slide]').forEach((slide, slideIndex) => {
      const video = slide.querySelector('video');
      if (!video) return;
      if (slideIndex === index) {
        this.#loadVideo(video);
        video.play().catch(() => {});
      } else {
        video.pause();
        try { video.currentTime = 0; } catch (error) {}
      }
    });
  }

  #pauseAll(reset) {
    this.querySelectorAll('video').forEach((video) => {
      video.pause();
      const isCover = video.matches('.fox-product-story__media > video') && !video.parentElement.querySelector(':scope > img');
      if (reset) try { video.currentTime = isCover ? 0.1 : 0; } catch (error) {}
    });
    this.#cards.forEach((card) => card.removeAttribute('data-previewing'));
  }

  #loadVideo(video) {
    if (video.src || !video.dataset.videoSrc) return;
    video.src = video.dataset.videoSrc;
    video.load();
  }

  #syncProgress(activeIndex) {
    this.#progressItems.forEach((item, index) => {
      item.dataset.active = String(index === activeIndex);
      item.dataset.complete = String(index < activeIndex);
      const fill = item.firstElementChild;
      if (!fill || index !== activeIndex || this.#reducedMotion) return;
      fill.style.animation = 'none';
      void fill.offsetWidth;
      fill.style.removeProperty('animation');
    });
  }

  #syncActiveProductScrollbar(activeIndex = Number(this.dataset.activeIndex || 0)) {
    requestAnimationFrame(() => {
      this.#syncProductScrollbar(this.#getActiveProducts(activeIndex));
    });
  }

  #getActiveProducts(activeIndex = Number(this.dataset.activeIndex || 0)) {
    const activeSlide = this.#modalSlider?.querySelector('.swiper-slide-active');
    if (activeSlide) return activeSlide.querySelector('.fox-product-story__products');
    const slide = this.querySelector(`[data-story-modal-slide][data-story-index="${activeIndex}"]`);
    return slide?.querySelector('.fox-product-story__products') || null;
  }

  #enableProductDrag(products, signal) {
    let pointerId = null;
    let startX = 0;
    let startScrollLeft = 0;
    let moved = false;

    products.addEventListener('pointerdown', (event) => {
      // Interactive quickview controls must not enter the horizontal drag gesture.
      const startedOnQuickView = event.target.closest('[data-action="quickview"]');
      if (
        event.button !== 0
        || startedOnQuickView
        || products.scrollWidth <= products.clientWidth
      ) return;
      pointerId = event.pointerId;
      startX = event.clientX;
      startScrollLeft = products.scrollLeft;
      moved = false;
      products.dataset.dragging = 'true';
      products.setPointerCapture?.(pointerId);
    }, { signal });

    products.addEventListener('pointermove', (event) => {
      if (event.pointerId !== pointerId) return;
      const distance = startX - event.clientX;
      if (Math.abs(distance) > 3) moved = true;
      if (!moved) return;
      event.preventDefault();
      products.scrollLeft = startScrollLeft + distance;
    }, { signal });

    const finishDrag = (event) => {
      if (event.pointerId !== pointerId) return;
      if (products.hasPointerCapture?.(pointerId)) products.releasePointerCapture(pointerId);
      products.removeAttribute('data-dragging');
      pointerId = null;
    };
    products.addEventListener('pointerup', finishDrag, { signal });
    products.addEventListener('pointercancel', finishDrag, { signal });
    products.addEventListener('click', (event) => {
      // Let commerce handle quickview clicks even if a previous drag set moved.
      if (event.target.closest('[data-action="quickview"]')) {
        moved = false;
        return;
      }
      if (!moved) return;
      event.preventDefault();
      event.stopPropagation();
      moved = false;
    }, { signal, capture: true });
  }

  #syncProductScrollbar(products) {
    if (!products || !this.#productScrollbar || !this.#productScrollbarThumb) return;
    const overflow = Math.max(0, products.scrollWidth - products.clientWidth);
    const trackWidth = this.#productScrollbar.clientWidth;
    const thumbWidth = overflow > 0
      ? Math.max(28, trackWidth * (products.clientWidth / products.scrollWidth))
      : trackWidth;
    const position = overflow > 0 ? products.scrollLeft / overflow : 0;
    this.#productScrollbarThumb.style.width = `${thumbWidth}px`;
    this.#productScrollbarThumb.style.transform = `translateX(${Math.max(0, trackWidth - thumbWidth) * position}px)`;
    this.#productScrollbar.hidden = products.scrollWidth <= products.clientWidth + 1;
  }

  #observeMedia() {
    if (!('IntersectionObserver' in window)) return;
    // Start mobile previews only while a story is near the viewport.
    this.#viewportObserver = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          if (this.dataset.mobilePreview !== 'false' && !this.#reducedMotion && !this.#modalOpen && !window.matchMedia('(hover: hover)').matches) {
            this.#playCard(entry.target);
          }
        } else {
          this.#stopCard(entry.target, true);
        }
      });
    }, { rootMargin: '180px 0px', threshold: 0.65 });
    this.#cards.forEach((card) => this.#viewportObserver.observe(card));
  }

  async #hydrateProducts() {
    const targets = [...this.querySelectorAll('[data-story-product]')];
    await Promise.all(targets.map(async (target) => {
      const handle = window.FOX?.normalizeProductHandle?.(target.dataset.productHandle);
      if (!handle || typeof window.FOX?.loadProductFragment !== 'function') {
        target.dataset.state = 'error';
        return;
      }
      try {
        const fragment = await window.FOX.loadProductFragment(handle, 'product-loop-data'); 
        const product = fragment.querySelector('product-card');
        if (!product) throw new Error('missing-product-markup');
        product.classList.add('product-card--story');
        const storyProduct = product.cloneNode(true);
        target.replaceChildren(storyProduct);
        target.dataset.state = 'ready';
        this.#syncThumbnail(handle, product);
      } catch (error) {
        target.dataset.state = 'error';
        console.warn(`[FOX Product Story] Unable to load product "${handle}".`, error);
      }
    }));
    this.#syncActiveProductScrollbar();
  }

  #syncThumbnail(handle, product) {
    const image = product.querySelector('.proloop--image-front');
    if (!image?.src) return;
    this.querySelectorAll(`[data-story-product-link][data-product-handle="${CSS.escape(handle)}"]`).forEach((link) => {
      const thumbnail = document.createElement('img');
      thumbnail.src = image.src;
      thumbnail.alt = '';
      thumbnail.width = 44;
      thumbnail.height = 44;
      thumbnail.loading = 'lazy';
      link.replaceChildren(thumbnail);
    });
  }
}

if (!customElements.get('fox-product-story')) {
  customElements.define('fox-product-story', FoxProductStory);
}
