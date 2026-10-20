/**
 * FOX Scroll Viewport
 *
 * Attribute-driven scroll and viewport effects for shared Haravan sections.
 * Markup and preset contracts are documented in docs/fox-scroll-viewport.md.
 */
(() => {
  'use strict';

  const ROOT_SELECTOR = '[data-fox-scroll-viewport]';
  const instances = new WeakMap();
  const activeInstances = new Set();

  const PRESETS = Object.freeze({
    collections: {
      effects: ['translate', 'tilt', 'fade', 'header', 'clip'],
      breakpoint: 1024,
      type: 'progress',
    },
    shrink: {
      effects: ['clip', 'scale', 'translate'],
      breakpoint: 0,
      type: 'progress',
    },
    'section-shrink': {
      effects: ['clip', 'scale', 'translate'],
      breakpoint: 767,
      type: 'progress',
      range: 'viewport',
    },
    'hero-stack': {
      effects: ['translate', 'scale', 'parallax'],
      breakpoint: 0,
      type: 'progress',
    },
    'media-text-horizontal': {
      effects: ['translate'],
      breakpoint: 767,
      type: 'progress',
    },
    'morph-footer': {
      effects: ['translate', 'fade'],
      breakpoint: 1024,
      type: 'progress',
      range: 'viewport',
    },
    'media-text-reveal': {
      effects: ['clip', 'scale', 'fade', 'translate'],
      breakpoint: 0,
      type: 'progress',
    },
    'hero-media-sequence': {
      effects: ['clip', 'scale', 'fade', 'translate'],
      breakpoint: 0,
      type: 'progress',
    },
    reveal: {
      effects: ['reveal'],
      breakpoint: 0,
      type: 'intersection',
    },
    counter: {
      effects: ['counter'],
      breakpoint: 0,
      type: 'intersection',
    },
    'lookbook-reveal': {
      effects: ['reveal'],
      breakpoint: 0,
      type: 'intersection',
    },
  });

  const clamp = (value, min = 0, max = 1) => Math.min(max, Math.max(min, value));

  const numberValue = (value, fallback) => {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : fallback;
  };

  const segment = (progress, start, end) => {
    if (end <= start) return progress >= end ? 1 : 0;
    return clamp((progress - start) / (end - start));
  };

  const interpolateUnitValue = (fromValue, toValue, progress) => {
    const pattern = /^(-?\d*\.?\d+)([a-z%]*)$/i;
    const fromMatch = String(fromValue).trim().match(pattern);
    const toMatch = String(toValue).trim().match(pattern);
    if (!fromMatch || !toMatch || fromMatch[2] !== toMatch[2]) {
      return progress < 1 ? fromValue : toValue;
    }
    const from = Number.parseFloat(fromMatch[1]);
    const to = Number.parseFloat(toMatch[1]);
    return `${from + (to - from) * progress}${fromMatch[2]}`;
  };

  class ScrollViewportController {
    constructor(root) {
      this.root = root;
      this.presetName = root.dataset.foxScrollViewport || '';
      this.preset = PRESETS[this.presetName] || null;
      this.abortController = null;
      this.runtimeAbortController = null;
      this.resizeObserver = null;
      this.mutationObserver = null;
      this.intersectionObserver = null;
      this.mediaQuery = null;
      this.ownedStyles = new Map();
      this.animations = new Set();
      this.counterFrames = new Set();
      this.counterOriginalText = new Map();
      this.refs = {};
      this.effects = new Set();
      this.frameId = 0;
      this.refreshFrame = 0;
      this.focusTimer = 0;
      this.focusToken = 0;
      this.lastProgress = -1;
      this.lastMetrics = '';
      this.hasAnnouncedReady = false;
      this.hasResizeFallback = false;
      this.destroyed = false;
    }

    connect() {
      if (this.destroyed) return;
      this.abortController = new AbortController();
      const { signal } = this.abortController;

      this.root.dataset.foxScrollState = 'idle';
      this.root.addEventListener('focusin', (event) => this.onFocusIn(event), {
        capture: true,
        signal,
      });

      this.mutationObserver = new MutationObserver((records) => {
        const hasStructuralChange = records.some((record) => {
          const target = record.target instanceof Element
            ? record.target
            : record.target.parentElement;
          const counter = target?.closest('[data-fox-scroll-counter]');
          return !counter;
        });
        if (hasStructuralChange) this.queueRefresh();
      });
      this.mutationObserver.observe(this.root, { childList: true, subtree: true });

      this.refresh();
    }

    resolveRefs() {
      const find = (selector) => this.root.querySelector(selector);
      const findAll = (selector) => [...this.root.querySelectorAll(selector)];

      this.refs = {
        window: find('[data-fox-scroll-window]'),
        inner: find('[data-fox-scroll-inner]'),
        items: findAll('[data-fox-scroll-item]'),
        tiltItems: findAll('[data-fox-scroll-tilt]'),
        media: findAll('[data-fox-scroll-media]'),
        mediaEffects: findAll('[data-fox-scroll-media-effect]'),
        content: find('[data-fox-scroll-content]'),
        header: find('[data-fox-scroll-header]'),
        background: find('[data-fox-scroll-background]'),
        fade: find('[data-fox-scroll-fade]'),
        focusTargets: findAll('[data-fox-scroll-focus]'),
        translateTargets: findAll('[data-fox-scroll-translate]'),
        shiftTargets: findAll('[data-fox-scroll-shift]'),
        sticky: find('[data-fox-scroll-sticky]'),
        logo: find('[data-fox-scroll-logo]'),
        revealTargets: findAll('[data-fox-scroll-reveal]'),
        counters: findAll('[data-fox-scroll-counter]'),
        lookbookTargets: findAll('[data-fox-scroll-lookbook]'),
        heroFirst: find('[data-fox-scroll-hero="first"]'),
        heroSecond: find('[data-fox-scroll-hero="second"]'),
        heroFirstContent: find('[data-fox-scroll-hero="first-content"]'),
        heroSecondContent: find('[data-fox-scroll-hero="second-content"]'),
        heroItems: findAll('[data-fox-scroll-hero="item"]'),
      };
    }

    resolveEffects() {
      const explicit = (this.root.dataset.foxScrollEffects || '')
        .split(/\s+/)
        .map((effect) => effect.trim())
        .filter(Boolean);
      this.effects = new Set(explicit.length ? explicit : this.preset.effects);
    }

    createMediaQuery() {
      const breakpoint = Math.max(
        0,
        numberValue(this.root.dataset.foxScrollBreakpoint, this.preset.breakpoint),
      );
      const minWidth = breakpoint > 0 ? `(min-width: ${breakpoint + 1}px) and ` : '';
      const query = `${minWidth}(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)`;

      if (this.mediaQuery?.media === query) return;
      this.mediaQuery = window.matchMedia(query);
      this.mediaQuery.addEventListener('change', () => this.queueRefresh(), {
        signal: this.abortController.signal,
      });
    }

    refresh() {
      if (this.destroyed) return;
      this.stopRuntime();
      this.resetOwnedStyles();
      this.resolveRefs();

      if (!this.preset) {
        this.setState('error');
        this.emit('error', { reason: 'unknown-preset', preset: this.presetName });
        return;
      }

      this.resolveEffects();
      this.createMediaQuery();
      this.observeLayout();

      if (!this.mediaQuery.matches) {
        this.setState('disabled');
        this.emitRefresh(false, 'capability');
        return;
      }
      if (
        this.preset.type === 'intersection'
        && typeof window.IntersectionObserver !== 'function'
      ) {
        this.setState('disabled');
        this.emitRefresh(false, 'intersection-observer-unavailable');
        return;
      }

      const validation = this.validatePreset();
      if (!validation.valid) {
        this.setState(validation.error ? 'error' : 'disabled');
        if (validation.error) {
          this.emit('error', { reason: validation.reason, preset: this.presetName });
        }
        this.emitRefresh(false, validation.reason);
        return;
      }

      this.setRootMetrics();
      this.setState('ready');
      this.runtimeAbortController = new AbortController();

      if (this.preset.type === 'intersection') {
        this.initIntersectionPreset();
      } else {
        window.addEventListener('scroll', () => this.queueProgress(), {
          passive: true,
          signal: this.runtimeAbortController.signal,
        });
        this.queueProgress(true);
      }

      this.emitRefresh(true, 'ready');
    }

    validatePreset() {
      const horizontal = ['collections', 'hero-stack', 'media-text-horizontal'];
      if (horizontal.includes(this.presetName)) {
        if (!this.refs.window || !this.refs.inner) {
          return { valid: false, error: true, reason: 'missing-horizontal-hook' };
        }
        const viewportWidth = this.refs.window.clientWidth;
        const innerWidth = this.refs.inner.scrollWidth;
        if (viewportWidth <= 0 || innerWidth <= viewportWidth + 1) {
          return { valid: false, error: false, reason: 'no-overflow' };
        }
      }

      if (this.presetName === 'shrink' && !this.refs.inner) {
        return { valid: false, error: true, reason: 'missing-inner-hook' };
      }
      if (this.presetName === 'section-shrink' && !this.refs.media.length) {
        return { valid: false, error: true, reason: 'missing-media-hook' };
      }
      if (this.presetName === 'morph-footer' && !this.refs.logo) {
        return { valid: false, error: true, reason: 'missing-logo-hook' };
      }
      if (this.presetName === 'media-text-reveal' && !this.refs.media.length) {
        return { valid: false, error: true, reason: 'missing-media-hook' };
      }
      if (
        this.presetName === 'hero-media-sequence'
        && !this.refs.heroFirst
        && !this.refs.heroSecond
        && !this.refs.heroItems.length
      ) {
        return { valid: false, error: true, reason: 'missing-hero-layer-hook' };
      }
      if (this.presetName === 'reveal' && !this.refs.revealTargets.length) {
        return { valid: false, error: false, reason: 'empty' };
      }
      if (this.presetName === 'counter' && !this.refs.counters.length) {
        return { valid: false, error: false, reason: 'empty' };
      }
      if (this.presetName === 'lookbook-reveal' && !this.refs.lookbookTargets.length) {
        return { valid: false, error: false, reason: 'empty' };
      }

      return { valid: true, error: false, reason: '' };
    }

    setRootMetrics() {
      const itemCount = this.refs.items.length || this.refs.heroItems.length;
      this.setStyle(this.root, '--fox-scroll-item-count', String(itemCount));
      this.setStyle(
        this.root,
        '--fox-scroll-direction',
        getComputedStyle(this.root).direction === 'rtl' ? '1' : '-1',
      );
      if (this.refs.content) {
        this.setStyle(
          this.root,
          '--fox-scroll-content-height',
          `${this.refs.content.getBoundingClientRect().height}px`,
        );
      }
      if (this.refs.window && this.refs.inner) {
        const overflow = Math.max(
          0,
          this.refs.inner.scrollWidth - this.refs.window.clientWidth,
        );
        this.setStyle(this.root, '--fox-scroll-overflow', `${overflow}px`);
      }
    }

    setState(state) {
      this.root.dataset.foxScrollState = state;
    }

    emit(eventName, detail = {}) {
      this.root.dispatchEvent(new CustomEvent(`scroll-viewport:${eventName}`, {
        bubbles: true,
        detail: {
          preset: this.presetName,
          root: this.root,
          ...detail,
        },
      }));
    }

    emitRefresh(active, reason) {
      const detail = {
        active,
        reason,
        itemCount: this.refs.items?.length || this.refs.heroItems?.length || 0,
      };
      if (!this.hasAnnouncedReady && active) {
        this.hasAnnouncedReady = true;
        this.emit('ready', detail);
        return;
      }
      this.emit('refresh', detail);
    }

    setStyle(element, property, value) {
      if (!element) return;
      if (!this.ownedStyles.has(element)) this.ownedStyles.set(element, new Map());
      const properties = this.ownedStyles.get(element);
      if (!properties.has(property)) {
        properties.set(property, {
          value: element.style.getPropertyValue(property),
          priority: element.style.getPropertyPriority(property),
        });
      }
      element.style.setProperty(property, value);
    }

    resetOwnedStyles() {
      this.ownedStyles.forEach((properties, element) => {
        properties.forEach((original, property) => {
          if (original.value) {
            element.style.setProperty(property, original.value, original.priority);
          } else {
            element.style.removeProperty(property);
          }
        });
      });
      this.ownedStyles.clear();
      this.lastProgress = -1;
    }

    observeLayout() {
      this.resizeObserver?.disconnect();
      if (typeof window.ResizeObserver !== 'function') {
        if (!this.hasResizeFallback) {
          this.hasResizeFallback = true;
          window.addEventListener('resize', () => this.queueRefresh(), {
            passive: true,
            signal: this.abortController.signal,
          });
        }
        return;
      }
      this.resizeObserver = new ResizeObserver(() => {
        const signature = [
          this.root.clientWidth,
          this.root.clientHeight,
          this.refs.window?.clientWidth || 0,
          this.refs.inner?.scrollWidth || 0,
          this.refs.content?.clientHeight || 0,
        ].join(':');
        if (signature === this.lastMetrics) return;
        this.lastMetrics = signature;
        this.queueRefresh();
      });

      [
        this.root,
        this.refs.window,
        this.refs.inner,
        this.refs.content,
      ].filter(Boolean).forEach((element) => this.resizeObserver.observe(element));
    }

    queueRefresh() {
      if (this.destroyed || this.refreshFrame) return;
      this.refreshFrame = requestAnimationFrame(() => {
        this.refreshFrame = 0;
        this.refresh();
      });
    }

    queueProgress(immediate = false) {
      if (this.destroyed || this.frameId) return;
      const update = () => {
        this.frameId = 0;
        const progress = this.getProgress();
        this.applyProgress(progress);
        if (Math.abs(progress - this.lastProgress) > 0.001) {
          this.lastProgress = progress;
          this.emit('change', { progress });
        }
      };
      if (immediate) {
        update();
        return;
      }
      this.frameId = requestAnimationFrame(update);
    }

    getBounds() {
      const rect = this.root.getBoundingClientRect();
      const top = window.scrollY + rect.top;
      const bottom = window.scrollY + rect.bottom;
      const range = this.root.dataset.foxScrollRange || this.preset.range;
      if (range === 'viewport') {
        return [top - window.innerHeight, bottom - window.innerHeight];
      }
      return [top, bottom - window.innerHeight];
    }

    getProgress() {
      const [start, end] = this.getBounds();
      return clamp((window.scrollY - start) / Math.max(1, end - start));
    }

    applyProgress(progress) {
      this.setStyle(this.root, '--fox-scroll-progress', String(progress));
      switch (this.presetName) {
        case 'collections':
          this.applyCollections(progress);
          break;
        case 'shrink':
          this.applyShrink(progress);
          break;
        case 'section-shrink':
          this.applySectionShrink(progress);
          break;
        case 'hero-stack':
          this.applyHeroStack(progress);
          break;
        case 'media-text-horizontal':
          this.applyMediaTextHorizontal(progress);
          break;
        case 'morph-footer':
          this.applyMorphFooter(progress);
          break;
        case 'media-text-reveal':
          this.applyMediaTextReveal(progress);
          break;
        case 'hero-media-sequence':
          this.applyHeroMediaSequence(progress);
          break;
        default:
          break;
      }
    }

    applyHorizontalTranslate(progress) {
      const viewportWidth = this.refs.window?.clientWidth || 0;
      const innerWidth = this.refs.inner?.scrollWidth || 0;
      const overflow = Math.max(0, innerWidth - viewportWidth);
      const rtl = getComputedStyle(this.root).direction === 'rtl';
      const x = overflow * progress * (rtl ? 1 : -1);
      this.setStyle(this.refs.inner, 'transform', `translate3d(${x}px, 0, 0)`);
      this.setStyle(this.root, '--fox-scroll-overflow', `${overflow}px`);
    }

    applyCollections(progress) {
      if (this.effects.has('translate')) this.applyHorizontalTranslate(progress);

      const items = this.refs.tiltItems.length ? this.refs.tiltItems : this.refs.items;
      if (this.effects.has('tilt') && items.length) {
        const max = numberValue(this.root.dataset.foxScrollTiltMax, 7);
        const span = numberValue(this.root.dataset.foxScrollTiltSpan, 0.5);
        items.forEach((item, index) => {
          const start = index / items.length;
          const end = start + span / items.length;
          const local = 1 - segment(progress, start, end);
          const angle = max * local;
          const scale = 1 / Math.cos(angle * Math.PI / 180);
          this.setStyle(item, '--fox-scroll-tilt', `${angle}deg`);
          this.setStyle(item, '--fox-scroll-tilt-scale', String(scale));
        });
      }

      if (this.effects.has('fade') && this.refs.fade) {
        const start = clamp(numberValue(this.root.dataset.foxScrollFadeStart, 0.9));
        const opacity = 1 - segment(progress, start, 1);
        this.setStyle(this.refs.fade, '--fox-scroll-fade-opacity', String(opacity));
      }

      if (this.effects.has('header') && this.refs.header) {
        const [start] = this.getBounds();
        const distance = Math.max(
          1,
          numberValue(this.root.dataset.foxScrollHeaderDistance, 200),
        );
        const headerProgress = clamp((window.scrollY - start) / distance);
        const scaleMin = clamp(
          numberValue(this.root.dataset.foxScrollHeaderScaleMin, 0.82),
          0,
          1,
        );
        this.setStyle(
          this.refs.header,
          '--fox-scroll-header-progress',
          String(headerProgress),
        );
        this.setStyle(
          this.refs.header,
          '--fox-scroll-header-scale',
          String(1 - (1 - scaleMin) * headerProgress),
        );
      }

      if (this.effects.has('clip') && this.refs.background && this.refs.content) {
        const clipStart = clamp(numberValue(this.root.dataset.foxScrollClipStart, 0.05));
        const contentHeight = this.refs.content.getBoundingClientRect().height;
        const radius = 'var(--radius-md, 8px)';
        const clipPath = progress <= clipStart
          ? 'inset(0 0 0 0 round 0px)'
          : `inset(calc(50vh - ${contentHeight / 2}px) 30px calc(50vh - ${contentHeight / 2}px) 3rem round ${radius})`;
        this.setStyle(this.refs.background, '--fox-scroll-clip-path', clipPath);
        this.setStyle(this.root, '--fox-scroll-content-height', `${contentHeight}px`);
      }
    }

    applyShrink(progress) {
      const appliedProgress = this.root.hasAttribute('data-fox-scroll-expand')
        ? 1 - progress
        : progress;
      if (this.effects.has('clip')) {
        const styles = getComputedStyle(this.root);
        const defaultClipX = numberValue(
          styles.getPropertyValue('--fox-scroll-clip-x'),
          24,
        );
        const containerMax = Math.max(
          0,
          numberValue(this.root.dataset.foxScrollContainerMax, 0),
        );
        const containerGutter = Math.max(
          0,
          numberValue(this.root.dataset.foxScrollContainerGutter, defaultClipX),
        );
        const rootWidth = this.root.getBoundingClientRect().width
          || document.documentElement.clientWidth;
        const clipX = containerMax > 0
          ? Math.max(
            containerGutter,
            ((rootWidth - containerMax) / 2) + containerGutter,
          )
          : defaultClipX;
        const radius = numberValue(
          styles.getPropertyValue('--fox-scroll-shrink-radius'),
          numberValue(styles.getPropertyValue('--radius-lg'), 24),
        );
        const offset = clipX * (1 - appliedProgress);
        const currentRadius = radius * (1 - appliedProgress);
        this.setStyle(
          this.refs.inner,
          '--fox-scroll-shrink-clip-path',
          `inset(0 ${offset}px 0 ${offset}px round ${currentRadius}px)`,
        );
      }
      if (this.effects.has('scale')) {
        const mediaProgress = this.root.hasAttribute('data-fox-scroll-expand')
          ? progress
          : appliedProgress;
        const scaleMax = Math.max(
          1,
          numberValue(this.root.dataset.foxScrollMediaScaleMax, 1.12),
        );
        const translateMax = numberValue(this.root.dataset.foxScrollMediaTranslate, 4);
        const scale = 1 + (scaleMax - 1) * mediaProgress;
        const y = (0.5 - mediaProgress) * translateMax;
        const targets = this.refs.mediaEffects.length
          ? this.refs.mediaEffects
          : this.refs.media;

        targets.forEach((media) => {
          this.setStyle(media, '--fox-scroll-media-scale', String(scale));
          this.setStyle(media, '--fox-scroll-media-y', `${y}%`);
        });
      }
      if (!this.effects.has('translate')) return;
      this.refs.translateTargets.forEach((element) => {
        const values = (element.dataset.foxScrollTranslate || '0px,0px').split(',');
        const from = values[0]?.trim() || '0px';
        const to = values[1]?.trim() || '0px';
        const x = interpolateUnitValue(from, to, appliedProgress);
        this.setStyle(element, 'transform', `translate3d(${x}, 0, 0)`);
      });
    }

    applySectionShrink(progress) {
      this.setStyle(this.root, '--fox-scroll-section-progress', String(progress));
      const styles = getComputedStyle(this.root);
      const clipX = numberValue(styles.getPropertyValue('--fox-scroll-clip-x'), 24);
      const radius = numberValue(styles.getPropertyValue('--radius-lg'), 24);
      const offset = clipX * (1 - progress);
      this.setStyle(
        this.root,
        '--fox-scroll-section-clip-path',
        `inset(0 ${offset}px 0 ${offset}px round ${radius}px)`,
      );
      const scaleMax = Math.max(
        1,
        numberValue(this.root.dataset.foxScrollScaleMax, 1.3),
      );
      const scale = scaleMax - (scaleMax - 1) * progress;
      if (this.effects.has('scale')) {
        this.refs.media.forEach((media) => {
          this.setStyle(media, '--fox-scroll-media-scale', String(scale));
        });
      }
      if (this.effects.has('translate')) {
        this.refs.shiftTargets.forEach((element) => {
          const direction = element.dataset.foxScrollShift === 'end' ? -1 : 1;
          this.setStyle(
            element,
            '--fox-scroll-shift',
            `${direction * offset}px`,
          );
        });
      }
    }

    applyHeroStack(progress) {
      if (this.effects.has('translate')) this.applyHorizontalTranslate(progress);
      if (this.effects.has('scale') && this.refs.items[0]) {
        const scaleProgress = segment(progress, 0, 0.3);
        this.setStyle(
          this.refs.items[0],
          '--fox-scroll-item-scale',
          String(0.5 + 0.5 * scaleProgress),
        );
      }
      if (!this.effects.has('parallax') || !this.refs.items.length) return;

      const step = 1 / Math.max(1, this.refs.items.length - 1);
      const rtl = getComputedStyle(this.root).direction === 'rtl' ? -1 : 1;
      this.refs.items.forEach((item, index) => {
        const media = item.querySelector('[data-fox-scroll-media]');
        if (!media) return;
        const start = index === 0 ? 0 : step * (index - 1);
        const end = index === 0
          ? step
          : (index === this.refs.items.length - 1 ? step * index : step * (index + 0.5));
        const base = index === 0 ? 10 : 30;
        const local = segment(progress, start, end);
        const x = (-base + base * local) * rtl;
        this.setStyle(media, 'transform', `translate3d(${x}%, 0, 0)`);
      });
    }

    applyMediaTextHorizontal(progress) {
      if (this.effects.has('translate')) this.applyHorizontalTranslate(progress);
    }

    applyMorphFooter(progress) {
      const logoProgress = segment(progress, 0.1, 1);
      if (this.effects.has('fade')) {
        this.setStyle(this.refs.logo, '--fox-scroll-logo-opacity', String(logoProgress));
      }
      if (this.effects.has('translate')) {
        this.setStyle(
          this.refs.logo,
          '--fox-scroll-logo-x',
          `${(1 - logoProgress) * -100}%`,
        );
      }
    }

    applyMediaTextReveal(progress) {
      const mediaProgress = segment(progress, 0, 0.4);
      const contentProgress = segment(progress, 0.4, 0.5);
      this.refs.media.forEach((media) => {
        if (this.effects.has('clip')) {
          const radius = numberValue(
            getComputedStyle(media).getPropertyValue('--fox-scroll-media-radius'),
            35,
          );
          const remaining = 1 - mediaProgress;
          const inset = `calc(${50 * remaining}% - ${radius * remaining}px)`;
          this.setStyle(media, '--fox-scroll-media-clip-progress', String(mediaProgress));
          this.setStyle(
            media,
            '--fox-scroll-media-clip-path',
            `inset(${inset} ${inset} round ${radius * remaining}px)`,
          );
        }
        if (this.effects.has('scale')) {
          this.setStyle(
            media,
            '--fox-scroll-media-scale',
            String(0.5 + 0.5 * mediaProgress),
          );
        }
      });
      if (this.refs.content) {
        if (this.effects.has('fade')) {
          this.setStyle(
            this.refs.content,
            '--fox-scroll-content-opacity',
            String(contentProgress),
          );
        }
        if (this.effects.has('translate')) {
          this.setStyle(
            this.refs.content,
            '--fox-scroll-content-y',
            `${255 * (1 - contentProgress)}px`,
          );
        }
      }
    }

    applyHeroMediaSequence(progress) {
      const firstIn = segment(progress, 0, 0.12);
      const firstOut = segment(progress, 0.5, 0.8);
      const itemIn = segment(progress, 0, 0.15);
      const itemOut = segment(progress, 0.15, 0.33);
      const secondClip = segment(progress, 0.12, 0.5);
      const secondContent = segment(progress, 0.5, 0.8);
      const firstScale = 1 + 0.15 * segment(progress, 0, 0.5);

      if (this.refs.heroFirst) {
        this.setStyle(
          this.refs.heroFirst,
          '--fox-scroll-hero-media-scale',
          String(firstScale),
        );
      }
      if (this.refs.heroFirstContent) {
        this.setStyle(
          this.refs.heroFirstContent,
          '--fox-scroll-hero-content-opacity',
          String(firstIn * (1 - firstOut)),
        );
        this.setStyle(
          this.refs.heroFirstContent,
          '--fox-scroll-hero-content-y',
          `${200 * (1 - firstIn)}px`,
        );
      }

      this.refs.heroItems.forEach((item, index) => {
        const delay = index * 0.015;
        const localIn = segment(progress, delay, 0.15 + delay);
        const localOut = segment(progress, 0.15 + delay, 0.33 + delay);
        const positionProgress = clamp(localIn);
        const scale = localIn < 1
          ? 0.5 + 0.5 * localIn
          : Math.max(0.5, 1 - 0.5 * localOut);
        this.setStyle(
          item,
          '--fox-scroll-hero-item-opacity',
          String(itemIn * (1 - itemOut)),
        );
        this.setStyle(
          item,
          '--fox-scroll-hero-item-progress',
          String(positionProgress),
        );
        this.setStyle(item, '--fox-scroll-hero-item-scale', String(scale));
        const styles = getComputedStyle(item);
        const startX = numberValue(styles.getPropertyValue('--fox-scroll-start-x'), 0);
        const startY = numberValue(styles.getPropertyValue('--fox-scroll-start-y'), 0);
        const endX = numberValue(styles.getPropertyValue('--fox-scroll-end-x'), 0);
        const endY = numberValue(styles.getPropertyValue('--fox-scroll-end-y'), 0);
        const rootRect = this.root.getBoundingClientRect();
        const fromX = -rootRect.width * startX / 100;
        const fromY = -rootRect.height * startY / 100;
        const toX = rootRect.width * (endX - startX) / 100;
        const toY = rootRect.height * (endY - startY) / 100;
        const x = fromX + (toX - fromX) * positionProgress;
        const y = fromY + (toY - fromY) * positionProgress;
        this.setStyle(
          item,
          '--fox-scroll-hero-item-transform',
          `translate3d(${x}px, ${y}px, 0) scale(${scale})`,
        );
      });

      if (this.refs.heroSecond) {
        this.setStyle(
          this.refs.heroSecond,
          '--fox-scroll-hero-clip-progress',
          String(secondClip),
        );
        this.setStyle(
          this.refs.heroSecond,
          '--fox-scroll-hero-clip-path',
          `inset(${100 * (1 - secondClip)}% round ${100 * (1 - secondClip)}px)`,
        );
      }
      if (this.refs.heroSecondContent) {
        this.setStyle(
          this.refs.heroSecondContent,
          '--fox-scroll-hero-content-opacity',
          String(secondContent),
        );
        this.setStyle(
          this.refs.heroSecondContent,
          '--fox-scroll-hero-content-y',
          `${200 * (1 - secondContent)}px`,
        );
      }
    }

    initIntersectionPreset() {
      if (this.presetName === 'reveal') this.initReveal();
      if (this.presetName === 'counter') this.initCounters();
      if (this.presetName === 'lookbook-reveal') this.initLookbookReveal();
    }

    createIntersectionObserver(callback, options = {}) {
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = new IntersectionObserver(callback, {
        threshold: options.threshold ?? 0.1,
        rootMargin: options.rootMargin || '0px',
      });
      return this.intersectionObserver;
    }

    initReveal() {
      const once = this.root.dataset.foxScrollOnce !== 'false';
      const distance = numberValue(this.root.dataset.foxScrollDistance, 16);
      const duration = numberValue(this.root.dataset.foxScrollDuration, 480);
      const stagger = numberValue(this.root.dataset.foxScrollStagger, 90);

      const observer = this.createIntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) {
            if (!once) entry.target.removeAttribute('data-fox-scroll-revealed');
            return;
          }
          if (once && entry.target.dataset.foxScrollRevealed === 'true') {
            observer.unobserve(entry.target);
            return;
          }
          const index = this.refs.revealTargets.indexOf(entry.target);
          this.animateRevealTarget(entry.target, {
            distance,
            duration,
            delay: Math.max(0, index) * stagger,
          });
          if (once) observer.unobserve(entry.target);
        });
      });
      this.refs.revealTargets.forEach((target) => observer.observe(target));
    }

    animateRevealTarget(target, options) {
      if (typeof target.animate !== 'function') {
        target.dataset.foxScrollRevealed = 'true';
        return;
      }
      const direction = target.dataset.foxScrollReveal || 'left';
      const axis = ['top', 'bottom'].includes(direction) ? 'Y' : 'X';
      const negative = ['top', 'left'].includes(direction) ? -1 : 1;
      const transform = `translate${axis}(${negative * options.distance}px)`;
      const animation = target.animate(
        [
          { opacity: 0, transform },
          { opacity: 1, transform: 'translate3d(0, 0, 0)' },
        ],
        {
          duration: options.duration,
          delay: options.delay,
          easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
          fill: 'none',
        },
      );
      this.trackAnimation(animation);
      animation.finished
        .then(() => {
          if (!this.destroyed) target.dataset.foxScrollRevealed = 'true';
        })
        .catch(() => {});
    }

    initCounters() {
      const observer = this.createIntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.unobserve(entry.target);
          this.startCounter(entry.target);
        });
      });

      this.refs.counters.forEach((counter) => {
        if (!this.counterOriginalText.has(counter)) {
          this.counterOriginalText.set(counter, counter.textContent);
        }
        observer.observe(counter);
      });
    }

    startCounter(counter) {
      const target = numberValue(
        counter.dataset.foxScrollCounter,
        numberValue(counter.textContent.replace(/[^\d.-]/g, ''), 0),
      );
      const start = numberValue(counter.dataset.foxScrollCounterStart, 0);
      const duration = Math.max(
        1,
        numberValue(counter.dataset.foxScrollDuration, 1200),
      );
      const decimals = Math.max(
        0,
        Math.floor(numberValue(counter.dataset.foxScrollDecimals, 0)),
      );
      const prefix = counter.dataset.foxScrollPrefix || '';
      const suffix = counter.dataset.foxScrollSuffix || '';
      const startTime = performance.now();

      const update = (time) => {
        const progress = clamp((time - startTime) / duration);
        const eased = 1 - Math.pow(1 - progress, 3);
        const value = start + (target - start) * eased;
        counter.textContent = `${prefix}${value.toLocaleString(undefined, {
          minimumFractionDigits: decimals,
          maximumFractionDigits: decimals,
        })}${suffix}`;
        if (progress < 1 && !this.destroyed) {
          schedule();
        } else {
          counter.dataset.foxScrollRevealed = 'true';
        }
      };

      const schedule = () => {
        const frame = requestAnimationFrame((time) => {
          this.counterFrames.delete(frame);
          update(time);
        });
        this.counterFrames.add(frame);
      };
      schedule();
    }

    initLookbookReveal() {
      const observer = this.createIntersectionObserver((entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          observer.disconnect();
          this.refs.lookbookTargets.forEach((target, index) => {
            if (target.closest('[role="tabpanel"][hidden]')) {
              target.dataset.foxScrollRevealed = 'true';
              return;
            }
            const role = target.dataset.foxScrollLookbook;
            let from = { opacity: 0, transform: 'translateY(30px)' };
            if (role === 'tab') from = { opacity: 0, transform: 'translateX(-30px)' };
            if (role === 'pin') from = { opacity: 0, transform: 'scale(0.3)' };
            if (role === 'image') {
              from = {
                opacity: 1,
                clipPath: 'inset(0 100% 0 0 round var(--radius-lg, 24px))',
              };
            }
            if (typeof target.animate !== 'function') {
              target.dataset.foxScrollRevealed = 'true';
              return;
            }
            const animation = target.animate(
              [
                from,
                {
                  opacity: 1,
                  transform: 'translate3d(0, 0, 0) scale(1)',
                  clipPath: 'inset(0 0 0 0 round var(--radius-lg, 24px))',
                },
              ],
              {
                duration: role === 'pin' ? 500 : 400,
                delay: index * 120,
                easing: 'cubic-bezier(0.22, 1, 0.36, 1)',
                fill: 'none',
              },
            );
            this.trackAnimation(animation);
            animation.finished
              .then(() => {
                if (!this.destroyed) target.dataset.foxScrollRevealed = 'true';
              })
              .catch(() => {});
          });
        });
      }, { threshold: 0.08 });
      observer.observe(this.root);
    }

    trackAnimation(animation) {
      this.animations.add(animation);
      const remove = () => this.animations.delete(animation);
      animation.finished.then(remove).catch(remove);
    }

    onFocusIn(event) {
      if (this.root.dataset.foxScrollState !== 'ready') return;
      if (!['collections', 'hero-stack', 'media-text-horizontal'].includes(this.presetName)) {
        return;
      }
      const focusTarget = event.target.closest('[data-fox-scroll-focus]');
      if (!focusTarget || !this.root.contains(focusTarget)) return;
      const item = focusTarget.closest('[data-fox-scroll-item]');
      if (!item) return;
      this.focusToken += 1;
      clearTimeout(this.focusTimer);
      this.scrollFocusedItem(item, 0, this.focusToken);
    }

    scrollFocusedItem(item, attempt, token) {
      if (token !== this.focusToken || !this.refs.window || !this.refs.inner) return;
      if (!item.contains(document.activeElement)) return;

      const viewportRect = this.refs.window.getBoundingClientRect();
      const itemRect = item.getBoundingClientRect();
      const overscan = Math.max(
        0,
        numberValue(this.root.dataset.foxScrollFocusOverscan, 24),
      );
      const leftLimit = viewportRect.left;
      const rightLimit = viewportRect.right - overscan;
      if (itemRect.left >= leftLimit && itemRect.right <= rightLimit) return;

      const overflow = Math.max(
        0,
        this.refs.inner.scrollWidth - this.refs.window.clientWidth,
      );
      if (!overflow) return;

      const delta = itemRect.left < leftLimit
        ? leftLimit - itemRect.left
        : rightLimit - itemRect.right;
      const rtl = getComputedStyle(this.root).direction === 'rtl';
      const targetProgress = clamp(
        this.getProgress() + (delta * (rtl ? 1 : -1)) / overflow,
      );
      const [start, end] = this.getBounds();
      const targetY = Math.round(start + targetProgress * Math.max(1, end - start));
      window.scrollTo({ top: targetY, behavior: 'smooth' });

      if (attempt < 2) {
        this.focusTimer = window.setTimeout(() => {
          this.scrollFocusedItem(item, attempt + 1, token);
        }, 360);
      }
    }

    stopRuntime() {
      this.runtimeAbortController?.abort();
      this.runtimeAbortController = null;
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;
      if (this.frameId) cancelAnimationFrame(this.frameId);
      this.frameId = 0;
      clearTimeout(this.focusTimer);
      this.focusTimer = 0;
      this.focusToken += 1;
      this.animations.forEach((animation) => animation.cancel());
      this.animations.clear();
      this.counterFrames.forEach((frame) => cancelAnimationFrame(frame));
      this.counterFrames.clear();
    }

    destroy() {
      if (this.destroyed) return;
      this.destroyed = true;
      this.stopRuntime();
      this.abortController?.abort();
      this.resizeObserver?.disconnect();
      this.mutationObserver?.disconnect();
      if (this.refreshFrame) cancelAnimationFrame(this.refreshFrame);
      this.resetOwnedStyles();
      this.counterOriginalText.forEach((text, element) => {
        element.textContent = text;
      });
      this.root.querySelectorAll('[data-fox-scroll-revealed]').forEach((element) => {
        element.removeAttribute('data-fox-scroll-revealed');
      });
      this.root.removeAttribute('data-fox-scroll-state');
      this.emit('destroy');
    }
  }

  const rootsWithin = (node) => {
    if (!(node instanceof Element)) return [];
    const roots = [...node.querySelectorAll(ROOT_SELECTOR)];
    if (node.matches(ROOT_SELECTOR)) roots.unshift(node);
    return roots;
  };

  const mount = (root) => {
    if (instances.has(root)) return;
    const instance = new ScrollViewportController(root);
    instances.set(root, instance);
    activeInstances.add(instance);
    instance.connect();
  };

  const unmount = (root) => {
    const instance = instances.get(root);
    if (!instance) return;
    instance.destroy();
    activeInstances.delete(instance);
    instances.delete(root);
  };

  const boot = () => {
    document.querySelectorAll(ROOT_SELECTOR).forEach(mount);

    const observer = new MutationObserver((records) => {
      records.forEach((record) => {
        record.addedNodes.forEach((node) => rootsWithin(node).forEach(mount));
        record.removedNodes.forEach((node) => rootsWithin(node).forEach(unmount));
      });
    });
    observer.observe(document.body, { childList: true, subtree: true });

    window.addEventListener('pagehide', () => {
      observer.disconnect();
      [...activeInstances].forEach((instance) => instance.destroy());
      activeInstances.clear();
    }, { once: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot, { once: true });
  } else {
    boot();
  }
})();
