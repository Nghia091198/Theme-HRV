/** FOX image comparison progressive enhancement for the homepage media controls. */
(() => {
  'use strict';

  const ELEMENT_NAME = 'fox-image-compare';
  const REVEAL_DURATION = 900;
  const DRAG_STATE_DELAY = 120;
  const SPRING_STIFFNESS = 100;
  const SPRING_DAMPING = 10;
  const SPRING_MASS = 1;
  const SPRING_REST_DELTA = 0.001;
  const SPRING_REST_SPEED = 0.01;
  const SPRING_MAX_STEP = 1 / 120;
  const INTERACTION_KEYS = new Set([
    'ArrowLeft',
    'ArrowRight',
    'ArrowUp',
    'ArrowDown',
    'Home',
    'End',
    'PageUp',
    'PageDown',
  ]);

  const clampPosition = (value) => {
    const parsed = Number.parseFloat(value);
    if (!Number.isFinite(parsed)) return 50;
    return Math.min(100, Math.max(0, parsed));
  };

  const formatPosition = (value) => Number(value.toFixed(2)).toString();

  class FoxImageCompare extends HTMLElement {
    constructor() {
      super();
      this.abortController = null;
      this.intersectionObserver = null;
      this.animationFrame = 0;
      this.springFrame = 0;
      this.dragTimer = 0;
      this.motionQuery = null;
      this.initialized = false;
      this.hasRevealed = false;
      this.pointerActive = false;
      this.targetPosition = null;
      this.springPosition = null;
      this.springTarget = null;
      this.springVelocity = 0;
      this.springTimestamp = 0;
      this.range = null;
      this.images = [];
    }

    connectedCallback() {
      if (this.initialized) return;

      this.abortController = new AbortController();
      this.dataset.state = 'idle';

      if (!this.collectElements()) {
        this.fail('missing-required-element');
        return;
      }

      if (this.targetPosition === null) {
        const configuredPosition = this.dataset.defaultPosition
          || this.dataset.position
          || this.range.value;
        this.targetPosition = clampPosition(configuredPosition);
      }

      this.motionQuery = window.matchMedia
        ? window.matchMedia('(prefers-reduced-motion: reduce)')
        : null;

      this.bindEvents();

      const hasBrokenImage = this.images.some(
        (image) => image.complete && image.naturalWidth === 0,
      );
      if (hasBrokenImage) {
        this.fail('image-load-error');
        return;
      }

      this.initialized = true;
      this.setupInitialPosition();
      this.dataset.state = 'ready';
      this.setupReveal();
      this.emit('image-compare:ready', { position: this.position });
    }

    disconnectedCallback() {
      this.destroy();
    }

    get position() {
      return clampPosition(this.dataset.position);
    }

    setPosition(value) {
      const position = clampPosition(value);
      this.targetPosition = position;
      this.stopReveal();
      this.stopPositionSpring();
      this.hasRevealed = true;
      this.applyPosition(position, this.dataset.state === 'ready', 'api', true);
    }

    destroy() {
      this.abortController?.abort();
      this.abortController = null;
      this.stopReveal();
      this.stopPositionSpring();
      this.clearDragState();
      this.range = null;
      this.images = [];
      this.motionQuery = null;
      this.initialized = false;
      this.dataset.state = 'idle';
    }

    collectElements() {
      this.range = this.querySelector('[data-role="range"]');
      this.images = [
        this.querySelector('[data-role="left-image"]'),
        this.querySelector('[data-role="right-image"]'),
      ].filter(Boolean);

      return Boolean(
        this.range
        && this.images.length === 2
        && this.querySelector('[data-role="media"]')
        && this.querySelector('[data-role="left-panel"]')
        && this.querySelector('[data-role="right-panel"]')
        && this.querySelector('[data-role="divider"]'),
      );
    }

    bindEvents() {
      const { signal } = this.abortController;

      this.range.addEventListener('input', () => {
        this.beginUserInteraction();
        const position = clampPosition(this.range.value);
        this.targetPosition = position;
        this.startPositionSpring(position);
        this.emit('image-compare:change', { position, source: 'user' });
      }, { signal });

      this.range.addEventListener('pointerdown', () => {
        this.beginPointerInteraction();
      }, { signal });

      window.addEventListener('pointerup', () => {
        this.endPointerInteraction();
      }, { signal });

      window.addEventListener('pointercancel', () => {
        this.endPointerInteraction();
      }, { signal });

      this.range.addEventListener('lostpointercapture', () => {
        this.endPointerInteraction();
      }, { signal });

      this.range.addEventListener('keydown', (event) => {
        if (INTERACTION_KEYS.has(event.key)) this.beginUserInteraction();
      }, { signal });

      this.images.forEach((image) => {
        image.addEventListener('error', () => this.fail('image-load-error'), { signal });
      });

      if (this.motionQuery?.addEventListener) {
        this.motionQuery.addEventListener('change', (event) => {
          if (!event.matches) return;
          this.stopReveal();
          this.stopPositionSpring();
          this.clearDragState();
          this.hasRevealed = true;
          this.applyPosition(this.targetPosition, false, 'motion-preference', true);
        }, { signal });
      }
    }

    setupInitialPosition() {
      if (this.hasRevealed || this.motionQuery?.matches) {
        this.hasRevealed = true;
        this.applyPosition(this.targetPosition, false, 'initial', true);
        return;
      }

      this.applyPosition(0, false, 'initial');
    }

    setupReveal() {
      if (this.hasRevealed) return;

      if (typeof window.IntersectionObserver !== 'function') {
        this.hasRevealed = true;
        this.applyPosition(this.targetPosition, false, 'fallback');
        return;
      }

      this.intersectionObserver = new IntersectionObserver((entries) => {
        const isVisible = entries.some((entry) => entry.isIntersecting);
        if (!isVisible) return;
        this.startReveal();
      }, {
        threshold: 0.2,
        rootMargin: '0px 0px -8% 0px',
      });
      this.intersectionObserver.observe(this);
    }

    startReveal() {
      if (this.hasRevealed || this.dataset.state !== 'ready') return;

      this.hasRevealed = true;
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;

      const startPosition = this.position;
      const endPosition = this.targetPosition;
      if (startPosition === endPosition) return;

      const startTime = performance.now();
      const animate = (time) => {
        if (!this.isConnected || this.dataset.state !== 'ready') return;

        const progress = Math.min(1, (time - startTime) / REVEAL_DURATION);
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const position = startPosition + ((endPosition - startPosition) * easedProgress);
        this.applyPosition(position, false, 'reveal');

        if (progress < 1) {
          this.animationFrame = requestAnimationFrame(animate);
          return;
        }

        this.animationFrame = 0;
        this.applyPosition(endPosition, false, 'reveal');
      };

      this.animationFrame = requestAnimationFrame(animate);
    }

    beginUserInteraction() {
      this.stopReveal();
      this.hasRevealed = true;
    }

    beginPointerInteraction() {
      this.beginUserInteraction();
      this.clearDragState();
      this.pointerActive = true;
      this.dragTimer = window.setTimeout(() => {
        if (this.pointerActive) this.dataset.dragging = 'true';
        this.dragTimer = 0;
      }, DRAG_STATE_DELAY);
    }

    endPointerInteraction() {
      if (!this.pointerActive) return;

      this.pointerActive = false;
      if (this.dragTimer) {
        window.clearTimeout(this.dragTimer);
        this.dragTimer = 0;
      }
      delete this.dataset.dragging;
    }

    clearDragState() {
      this.pointerActive = false;
      delete this.dataset.dragging;

      if (this.dragTimer) {
        window.clearTimeout(this.dragTimer);
        this.dragTimer = 0;
      }
    }

    startPositionSpring(value) {
      const position = clampPosition(value);
      if (this.motionQuery?.matches) {
        this.stopPositionSpring();
        this.applyPosition(position, false, 'motion-preference');
        return;
      }

      this.springTarget = position;
      if (this.springPosition === null) this.springPosition = this.position;
      if (this.springFrame) return;

      this.springTimestamp = 0;
      this.springFrame = requestAnimationFrame((time) => this.updatePositionSpring(time));
    }

    updatePositionSpring(time) {
      if (!this.isConnected || this.dataset.state !== 'ready') {
        this.springFrame = 0;
        return;
      }

      const elapsed = this.springTimestamp
        ? Math.min((time - this.springTimestamp) / 1000, 0.064)
        : 1 / 60;
      const steps = Math.max(1, Math.ceil(elapsed / SPRING_MAX_STEP));
      const delta = elapsed / steps;

      for (let index = 0; index < steps; index += 1) {
        const displacement = this.springPosition - this.springTarget;
        const springForce = -SPRING_STIFFNESS * displacement;
        const dampingForce = -SPRING_DAMPING * this.springVelocity;
        const acceleration = (springForce + dampingForce) / SPRING_MASS;
        this.springVelocity += acceleration * delta;
        this.springPosition += this.springVelocity * delta;
      }

      this.springTimestamp = time;
      this.applyPosition(this.springPosition, false, 'spring');

      const isAtRest = (
        Math.abs(this.springVelocity) <= SPRING_REST_SPEED
        && Math.abs(this.springTarget - this.springPosition) <= SPRING_REST_DELTA
      );
      if (isAtRest) {
        const finalPosition = this.springTarget;
        this.springFrame = 0;
        this.springPosition = finalPosition;
        this.springVelocity = 0;
        this.springTimestamp = 0;
        this.applyPosition(finalPosition, false, 'spring');
        return;
      }

      this.springFrame = requestAnimationFrame((nextTime) => {
        this.updatePositionSpring(nextTime);
      });
    }

    stopPositionSpring() {
      if (this.springFrame) {
        cancelAnimationFrame(this.springFrame);
        this.springFrame = 0;
      }

      this.springPosition = null;
      this.springTarget = null;
      this.springVelocity = 0;
      this.springTimestamp = 0;
    }

    stopReveal() {
      this.intersectionObserver?.disconnect();
      this.intersectionObserver = null;

      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
        this.animationFrame = 0;
      }
    }

    applyPosition(value, shouldEmit, source, shouldSyncRange = false) {
      const position = clampPosition(value);
      const formattedPosition = formatPosition(position);

      this.style.setProperty('--fox-image-compare-position', `${formattedPosition}%`);
      this.dataset.position = formattedPosition;
      if (shouldSyncRange && this.range) this.range.value = formattedPosition;

      if (shouldEmit) {
        this.emit('image-compare:change', { position, source });
      }
    }

    fail(reason) {
      if (this.dataset.state === 'error') return;
      this.stopReveal();
      this.stopPositionSpring();
      this.clearDragState();
      this.dataset.state = 'error';
      console.warn(`[FoxImageCompare] ${reason}.`);
      this.emit('image-compare:error', { reason });
    }

    emit(name, detail) {
      this.dispatchEvent(new CustomEvent(name, {
        bubbles: true,
        detail,
      }));
    }
  }

  if (window.customElements && !customElements.get(ELEMENT_NAME)) {
    customElements.define(ELEMENT_NAME, FoxImageCompare);
  }
})();
