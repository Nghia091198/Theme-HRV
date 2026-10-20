class SliderComponent extends HTMLElement {

  static get observedAttributes() {
    return [
      'data-preset',
      'data-autoplay',
      'data-autoplay-delay',
      'data-transition-duration',
      'data-loop',
      'data-marquee',
      'data-pagination',
      'data-navigation',
      'data-slides-mobile',
      'data-slides-tablet',
      'data-slides-desktop',
      'data-space-mobile',
      'data-space-tablet',
      'data-space-desktop',
      'data-free-mode',
      'data-pause-on-hover',
    ];
  }

  #swiper = null;
  #viewport = null;
  #slidesObserver = null;
  #refreshQueued = false;
  #initialized = false;

  connectedCallback() {
    if (this.#initialized) return;

    this.dataset.state = 'loading';
    this.#viewport = this.querySelector('[data-role="viewport"]');

    if (!this.#viewport) {
      this.#setError('Missing [data-role="viewport"].');
      return;
    }

    this.#watchSlides();
    this.#init();
  }

  disconnectedCallback() {
    this.destroy();
  }

  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue || !this.#initialized) return;
    this.#queueRefresh();
  }

  get swiper() {
    return this.#swiper;
  }

  get activeIndex() {
    return this.#swiper?.realIndex ?? Number(this.dataset.activeIndex || 0);
  }

  get itemCount() {
    return Number(this.dataset.slideCount || 0);
  }

  get isPlaying() {
    return this.dataset.playing === 'true';
  }

  next() {
    this.#swiper?.slideNext();
  }

  previous() {
    this.#swiper?.slidePrev();
  }

  goTo(index) {
    if (!Number.isInteger(index) || index < 0) return;
    this.#swiper?.slideToLoop?.(index);
    if (!this.#swiper?.slideToLoop) this.#swiper?.slideTo(index);
  }

  play() {
    if (!this.#swiper?.autoplay) return;
    this.#swiper.autoplay.start();
    this.#setPlaying(true);
    this.#emit('slider:play', { index: this.activeIndex });
  }

  pause() {
    if (!this.#swiper?.autoplay) return;
    this.#swiper.autoplay.stop();
    this.#setPlaying(false);
    this.#emit('slider:pause', { index: this.activeIndex });
  }

  refresh() {
    if (!this.isConnected) return;

    this.#destroySwiper();
    this.#init();
  }

  destroy() {
    const wasInitialized = this.#initialized;

    this.#slidesObserver?.disconnect();
    this.#slidesObserver = null;
    this.#destroySwiper();
    this.#viewport = null;
    this.#initialized = false;
    this.#refreshQueued = false;
    this.dataset.state = 'idle';
    this.dataset.playing = 'false';

    if (wasInitialized) {
      this.#emit('slider:destroy', {});
    }
  }

  #init() {
    const slides = this.#getSlides();
    const slideCount = slides.length;

    this.dataset.slideCount = String(slideCount);
    this.dataset.activeIndex = '0';
    this.#setPlaying(false);
    this.#syncControls(slideCount);

    if (slideCount === 0) {
      this.#initialized = true;
      this.dataset.state = 'disabled';
      this.#emitReady(null, null);
      return;
    }

    if (slideCount === 1) {
      slides[0].classList.add('swiper-slide-active');
      slides[0].setAttribute('aria-hidden', 'false');
      this.#initialized = true;
      this.dataset.state = 'ready';
      this.#emitReady(null, slides[0]);
      return;
    }

    if (typeof window.Swiper === 'undefined') {
      this.#setError('Swiper is not available.');
      return;
    }

    const config = this.#buildConfig();
    slides.forEach((slide) => {
      slide.classList.remove('swiper-slide-active');
      slide.removeAttribute('aria-hidden');
    });
    this.#swiper = new window.Swiper(this.#viewport, config);
    this.#bindSwiperEvents();
    this.#stripCloneMedia();
    this.#initialized = true;
    this.dataset.state = 'ready';
    this.dataset.activeIndex = String(this.#swiper.realIndex || 0);
    this.#setPlaying(Boolean(this.#swiper.autoplay?.running));
    this.#syncProgress();
    this.#emitReady(this.#swiper, this.#swiper.slides?.[this.#swiper.activeIndex] || slides[0]);
  }

  #buildConfig() {
    const preset = this.#presetDefaults();
    const dataset = this.dataset;
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    const slidesMobile = this.#slides(dataset.slidesMobile, preset.slidesMobile);
    const slidesTablet = this.#slides(dataset.slidesTablet, preset.slidesTablet);
    const slidesDesktop = this.#slides(dataset.slidesDesktop, preset.slidesDesktop);
    const usesAutoSlides = [slidesMobile, slidesTablet, slidesDesktop].includes('auto');
    const marquee = this.#boolean(dataset.marquee, false);
    const autoplay = marquee || this.#boolean(dataset.autoplay, preset.autoplay);

    return {
      speed: this.#number(dataset.transitionDuration, preset.transitionDuration),
      loop: marquee || this.#boolean(dataset.loop, preset.loop),
      slidesPerView: slidesMobile,
      slidesPerGroupAuto: usesAutoSlides,
      spaceBetween: this.#number(dataset.spaceMobile, preset.spaceMobile),
      autoplay: !reducedMotion && autoplay
        ? {
            delay: marquee ? 0 : this.#number(dataset.autoplayDelay, preset.autoplayDelay),
            disableOnInteraction: false,
            pauseOnMouseEnter: this.#boolean(dataset.pauseOnHover, preset.pauseOnHover),
            waitForTransition: true,
          }
        : false,
      freeMode: marquee ? false : this.#boolean(dataset.freeMode, preset.freeMode),
      pagination: this.#buildPagination(preset.pagination),
      navigation: this.#buildNavigation(preset.navigation),
      breakpoints: {
        768: {
          slidesPerView: slidesTablet,
          spaceBetween: this.#number(dataset.spaceTablet, preset.spaceTablet),
        },
        992: {
          slidesPerView: slidesDesktop,
          spaceBetween: this.#number(dataset.spaceDesktop, preset.spaceDesktop),
        },
      },
    };
  }

  #presetDefaults() {
    const presets = {
      hero: {
        autoplay: true,
        autoplayDelay: 3000,
        loop: true,
        navigation: true,
        pagination: true,
        slidesMobile: 1,
        slidesTablet: 1,
        slidesDesktop: 1,
        spaceMobile: 0,
        spaceTablet: 0,
        spaceDesktop: 0,
        transitionDuration: 600,
      },
      product: {
        autoplay: false,
        autoplayDelay: 3000,
        loop: false,
        navigation: true,
        pagination: false,
        slidesMobile: 2,
        slidesTablet: 3,
        slidesDesktop: 4,
        spaceMobile: 12,
        spaceTablet: 16,
        spaceDesktop: 24,
        transitionDuration: 400,
      },
      announcement: {
        autoplay: true,
        autoplayDelay: 3000,
        loop: true,
        navigation: true,
        pagination: false,
        slidesMobile: 1,
        slidesTablet: 1,
        slidesDesktop: 1,
        spaceMobile: 0,
        spaceTablet: 0,
        spaceDesktop: 0,
        transitionDuration: 400,
      },
      story: {
        autoplay: true,
        autoplayDelay: 2600,
        freeMode: true,
        loop: true,
        navigation: true,
        pagination: false,
        pauseOnHover: true,
        slidesMobile: 1,
        slidesTablet: 3,
        slidesDesktop: 5,
        spaceMobile: 15,
        spaceTablet: 24,
        spaceDesktop: 24,
        transitionDuration: 520,
      },
    };

    return presets[this.dataset.preset] || presets.product;
  }

  #buildPagination(fallback) {
    if (!this.#boolean(this.dataset.pagination, fallback)) return false;
    const element = this.querySelector('[data-role="pagination"]');
    return element ? { el: element, clickable: true } : false;
  }

  #buildNavigation(fallback) {
    if (!this.#boolean(this.dataset.navigation, fallback)) return false;
    const next = this.querySelector('[data-action="next"]');
    const previous = this.querySelector('[data-action="previous"]');
    return next && previous ? { nextEl: next, prevEl: previous } : false;
  }

  #bindSwiperEvents() {
    if (!this.#swiper) return;

    this.#swiper.on('slideChange', () => {
      const index = this.#swiper?.realIndex || 0;
      this.dataset.activeIndex = String(index);
      this.#syncProgress();
      this.#emit('slider:change', {
        index,
        previousIndex: this.#swiper?.previousIndex ?? null,
        slideCount: this.itemCount,
      });
    });
    this.#swiper.on('autoplayStart', () => this.#setPlaying(true));
    this.#swiper.on('autoplayStop', () => this.#setPlaying(false));
    this.#swiper.on('loopCreate', () => this.#stripCloneMedia());
    this.#swiper.on('slidesUpdated', () => {
      this.#stripCloneMedia();
      this.#syncProgress();
    });
    this.#swiper.on('resize', () => this.#syncProgress());
    this.#swiper.on('breakpoint', () => this.#syncProgress());
  }

  #stripCloneMedia() {
    this.#viewport
      ?.querySelectorAll('.swiper-slide-duplicate slide-youtube')
      .forEach((element) => {
        element.replaceChildren();
      });
  }

  #watchSlides() {
    const wrapper = this.#viewport?.querySelector('.swiper-wrapper');
    if (!wrapper) return;

    this.#slidesObserver?.disconnect();
    this.#slidesObserver = new MutationObserver(() => {
      if (this.#getSlides().length !== this.itemCount) this.#queueRefresh();
    });
    this.#slidesObserver.observe(wrapper, { childList: true });
  }

  #queueRefresh() {
    if (this.#refreshQueued) return;

    this.#refreshQueued = true;
    queueMicrotask(() => {
      this.#refreshQueued = false;
      this.refresh();
    });
  }

  #getSlides() {
    const wrapper = this.#viewport?.querySelector('.swiper-wrapper');
    if (!wrapper) return [];

    return Array.from(wrapper.children).filter(
      (element) =>
        element.classList.contains('swiper-slide') &&
        !element.classList.contains('swiper-slide-duplicate')
    );
  }

  #syncControls(slideCount) {
    const shouldHide = slideCount <= 1;
    const controls = this.querySelectorAll(
      '[data-role="navigation"], [data-role="pagination"], [data-action="next"], [data-action="previous"]'
    );

    controls.forEach((control) => {
      control.hidden = shouldHide;
      if (control.matches('button')) control.disabled = shouldHide;
    });

    this.#syncProgress(slideCount);
  }

  #syncProgress(slideCount = this.itemCount) {
    const progress = this.querySelector('[data-role="progress"]');
    if (!progress) return;

    const slidesPerView = this.#swiper?.params?.slidesPerView;
    const visibleSlides = slidesPerView === 'auto' && typeof this.#swiper?.slidesPerViewDynamic === 'function'
      ? this.#swiper.slidesPerViewDynamic()
      : Number(slidesPerView || 1);
    const pageTotal = Math.ceil(slideCount / Math.max(1, visibleSlides || 1));
    const total = Math.max(1, pageTotal, this.#swiper?.snapGrid?.length || 0);
    const rawIndex = Number(this.#swiper?.snapIndex);
    const snapIndex = Number.isFinite(rawIndex) ? Math.max(0, rawIndex) : 0;
    const current = Math.min(total, snapIndex + 1);
    progress.style.setProperty('--fox-slider-progress', String(current / total));
    progress.setAttribute('aria-valuemax', String(total));
    progress.setAttribute('aria-valuenow', String(current));
  }

  #destroySwiper() {
    this.#swiper?.destroy(true, true);
    this.#swiper = null;
  }

  #emitReady(swiper, slide) {
    this.#emit('slider:ready', {
      swiper,
      slide,
      slideCount: this.itemCount,
    });
  }

  #setError(message) {
    this.#initialized = false;
    this.dataset.state = 'error';
    this.#emit('slider:error', { message });
  }

  #setPlaying(isPlaying) {
    this.dataset.playing = String(isPlaying);
  }

  #emit(name, detail) {
    this.dispatchEvent(
      new CustomEvent(name, {
        bubbles: true,
        composed: true,
        detail,
      })
    );
  }

  #boolean(value, fallback) {
    if (value === undefined) return fallback;
    return value !== 'false';
  }

  #number(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) ? number : fallback;
  }

  #slides(value, fallback) {
    if (String(value).trim().toLowerCase() === 'auto') return 'auto';
    return this.#number(value, fallback);
  }
}

if (!customElements.get('slider-component')) {
  customElements.define('slider-component', SliderComponent);
}
