// ── TÌM TOÀN BỘ class BtnEffectController ── và THAY BẰNG:

class BtnEffectController {
  static #instance = null;
  static #SELECTOR = '[button-effect]';
  static #SPAN_MARKER = 'data-btn-effect-span';

  #controllers = new WeakMap();
  #observer = null;

  static init() {
    if (!this.#instance) this.#instance = new BtnEffectController();
    return this.#instance;
  }

  constructor() {
    this.#scan(document.body);
    this.#watch();
  }

  #watch() {
    this.#observer = new MutationObserver(mutations => {
      for (const m of mutations) {
        if (m.type === 'childList') {
          m.addedNodes.forEach(node => this.#handleAdded(node));
          m.removedNodes.forEach(node => this.#handleRemoved(node));
        }
        if (m.type === 'attributes') {
          const el = m.target;
          el.hasAttribute('button-effect') ? this.#attach(el) : this.#detach(el);
        }
      }
    });
    this.#observer.observe(document.body, {
      childList: true, subtree: true,
      attributes: true, attributeFilter: ['button-effect'],
    });
  }

  #handleAdded(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(BtnEffectController.#SELECTOR)) this.#attach(node);
    node.querySelectorAll?.(BtnEffectController.#SELECTOR).forEach(el => this.#attach(el));
  }

  #handleRemoved(node) {
    if (node.nodeType !== 1) return;
    if (node.matches(BtnEffectController.#SELECTOR)) this.#detach(node);
    node.querySelectorAll?.(BtnEffectController.#SELECTOR).forEach(el => this.#detach(el));
  }

  #scan(root) {
    root.querySelectorAll(BtnEffectController.#SELECTOR).forEach(el => this.#attach(el));
  }

  // ── THAY BẰNG ──
  #attach(el) {
    if (this.#controllers.has(el)) return;

    const abort = new AbortController();
    const sig   = abort.signal;
    const span  = this.#getSpan(el);

    el.addEventListener('mouseenter', e => {
      const rect = el.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      // 4 khoảng cách từ điểm chuột đến 4 góc — lấy max = bán kính cần fill
      const maxR = Math.max(
        Math.hypot(x,            y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x,            rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      );

      // span cố định 20×20px, scale lên maxR/10 (radius = 10px)
      span.style.left = `${x}px`;
      span.style.top  = `${y}px`;
      span.style.setProperty('--bf-scale', maxR / 10);
      el.classList.add('btn-effect--in');
      el.classList.remove('btn-effect--out');
    }, { signal: sig });

    el.addEventListener('mouseleave', e => {
      const rect = el.getBoundingClientRect();
      const x = Math.min(Math.max(e.clientX - rect.left, 0), rect.width);
      const y = Math.min(Math.max(e.clientY - rect.top, 0), rect.height);
      const maxR = Math.max(
        Math.hypot(x, y),
        Math.hypot(rect.width - x, y),
        Math.hypot(x, rect.height - y),
        Math.hypot(rect.width - x, rect.height - y)
      );

      span.style.left = `${x}px`;
      span.style.top = `${y}px`;
      span.style.setProperty('--bf-scale', maxR / 10);
      el.classList.remove('btn-effect--in');
      el.classList.add('btn-effect--out');
    }, { signal: sig });

    this.#controllers.set(el, abort);
  }

  #detach(el) {
    this.#controllers.get(el)?.abort();
    this.#controllers.delete(el);
  }

  #getSpan(el) {
    return (
      el.querySelector(`:scope > span[${BtnEffectController.#SPAN_MARKER}]`) ??
      this.#createSpan(el)
    );
  }

  #createSpan(el) {
    const span = document.createElement('span');
    span.setAttribute(BtnEffectController.#SPAN_MARKER, '');
    el.appendChild(span);
    return span;
  }
}
 
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => BtnEffectController.init());
} else {
  BtnEffectController.init();
}

class SlideContentReveal {
  static #instance = null;

  static #SELECTOR = 'slidecontent';
  static #ACTIVE   = 'swiper-slide-active';
  static #ITEMS    = '.slide-content__title, .slide-content__desc, .slide-content__btn';

  #observers = new WeakMap();
  #wasActive = new WeakMap();
  #domObserver = null;

  static init() {
    if (!this.#instance) this.#instance = new SlideContentReveal();
    return this.#instance;
  }

  constructor() {
    this.#scan(document.body);
    this.#watchDom();
  }

  reveal(el) { this.#reveal(el); }
  reset(el)  { el.classList.remove('is-revealed'); }

  #watchDom() {
    this.#domObserver = new MutationObserver(muts => {
      for (const m of muts) {
        m.addedNodes.forEach(n => this.#handleAdded(n));
        m.removedNodes.forEach(n => this.#handleRemoved(n));
      }
    });
    this.#domObserver.observe(document.body, { childList: true, subtree: true });
  }

  #handleAdded(node) {
    if (node.nodeType !== 1) return;
    if (node.matches?.(SlideContentReveal.#SELECTOR)) this.#attach(node);
    node.querySelectorAll?.(SlideContentReveal.#SELECTOR).forEach(el => this.#attach(el));
  }

  #handleRemoved(node) {
    if (node.nodeType !== 1) return;
    if (node.matches?.(SlideContentReveal.#SELECTOR)) this.#detach(node);
    node.querySelectorAll?.(SlideContentReveal.#SELECTOR).forEach(el => this.#detach(el));
  }

  #scan(root) {
    root.querySelectorAll(SlideContentReveal.#SELECTOR).forEach(el => this.#attach(el));
  }

  #attach(el) {
    if (this.#observers.has(el)) return;

    el.querySelectorAll(SlideContentReveal.#ITEMS)
      .forEach((it, i) => it.style.setProperty('--reveal-i', i+1));

    const slide = el.closest('.swiper-slide');

    if (!slide) {
      this.#reveal(el);
      this.#observers.set(el, null);
      return;
    }

    const active = slide.classList.contains(SlideContentReveal.#ACTIVE);
    this.#wasActive.set(el, active);
    if (active) this.#reveal(el);

    const obs = new MutationObserver(() => {
      const now = slide.classList.contains(SlideContentReveal.#ACTIVE);
      const was = this.#wasActive.get(el) === true;
      if (now && !was) this.#reveal(el);
      this.#wasActive.set(el, now);
    });
    obs.observe(slide, { attributes: true, attributeFilter: ['class'] });
    this.#observers.set(el, obs);
  }

  #detach(el) {
    this.#observers.get(el)?.disconnect();
    this.#observers.delete(el);
    this.#wasActive.delete(el);
  }

  #reveal(el) {
    el.classList.remove('is-revealed');
    void el.offsetWidth;
    el.classList.add('is-revealed');
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => SlideContentReveal.init());
} else {
  SlideContentReveal.init();
}

class ExpandDescriptionComponent extends HTMLElement {
  #abort   = null;
  #body    = null;
  #btn     = null;
  #label   = null;
  #maxH    = null;
  #isOpen  = false;
 
  static defaultMaxHeight = 220;
  static moreTxt          = 'Xem thêm';
  static lessTxt          = 'Rút gọn';
 
  connectedCallback() {
    this.#abort = new AbortController();
    const sig   = this.#abort.signal;
 
    this.#body  = this.querySelector('.js-ed-body');
    this.#btn   = this.querySelector('.js-ed-btn');
    this.#label = this.querySelector('.js-ed-btn-text');
 
    this.#maxH  = parseInt(this.dataset.maxHeight) || ExpandDescriptionComponent.defaultMaxHeight;
 
    if (!this.#body || !this.#btn || !this.#label) {
      console.warn('[ExpandDescriptionComponent] Thiếu .js-ed-body / .js-ed-btn / .js-ed-btn-text');
      return;
    }
 
    requestAnimationFrame(() => this.#setup(sig));
  }
 
  disconnectedCallback() {
    this.#abort?.abort();
    this.#abort = null;
  }
 
  open()   { if (!this.#isOpen) this.#toggle(); }
  close()  { if (this.#isOpen)  this.#toggle(); }
  toggle() { this.#toggle(); }
 
  get isOpen() { return this.#isOpen; }
 
  #setup(sig) {
    if (this.#body.scrollHeight <= this.#maxH) {
      this.#body.style.height = 'auto';
      this.#btn.hidden = true;
      return;
    }
 
    this.#body.style.height = this.#maxH + 'px';
    this.#label.textContent = ExpandDescriptionComponent.moreTxt;
 
    this.#btn.addEventListener('click', () => this.#toggle(), { signal: sig });
  }
 
  #toggle() {
    this.#isOpen = !this.#isOpen;
 
    this.#body.style.height = (this.#isOpen
      ? this.#body.scrollHeight
      : this.#maxH
    ) + 'px';
 
    this.classList.toggle('is-open', this.#isOpen);
    this.#label.textContent = this.#isOpen
      ? ExpandDescriptionComponent.lessTxt
      : ExpandDescriptionComponent.moreTxt;
 
    this.dispatchEvent(new CustomEvent('expand-change', {
      bubbles: true,
      composed: true,
      detail: { isOpen: this.#isOpen },
    }));
  }
}

class CountDownComponent extends HTMLElement {
  #timer   = null;
  #els     = {};
  #end     = 0;
 
  static #pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
 
  connectedCallback() {
    const box = this.querySelector('.box-countdown');
    if (!box) {
      console.warn('[CountDownComponent] Thiếu .box-countdown bên trong.');
      return;
    }
 
    this.#end = new Date(box.dataset.time).getTime();
    if (isNaN(this.#end)) {
      console.warn('[CountDownComponent] data-time không hợp lệ:', box.dataset.time);
      return;
    }
 
    this.#els = {
      days:    box.querySelector('.days'),
    hours:   box.querySelector('.hours'),
      minutes: box.querySelector('.minutes'),
      seconds: box.querySelector('.seconds'),
    };
 
    this.#tick();
    this.#timer = setInterval(() => this.#tick(), 1000);
  }
 
  disconnectedCallback() {
    this.#stop();
  }
 
  stop()  { this.#stop(); }
  start() {
    if (this.#timer) return;
    this.#tick();
    this.#timer = setInterval(() => this.#tick(), 1000);
  }
 
  get remaining() {
    const d = this.#end - Date.now();
    return d > 0 ? d : -1;
  }
 
  get isExpired() { return this.remaining === -1; }
 
  #tick() {
    const d = this.#end - Date.now();
 
    if (d < 0) {
      this.#setAll('00');
      this.#stop();
      this.classList.add('is-expired');
      this.dispatchEvent(new CustomEvent('countdown-expired', {
        bubbles: true, composed: true,
      }));
      return;
    }
 
    const pad = CountDownComponent.#pad;
    if (this.#els.days)    this.#els.days.textContent    = pad(d / 86400000);
    if (this.#els.hours)   this.#els.hours.textContent   = pad((d % 86400000) / 3600000);
    if (this.#els.minutes) this.#els.minutes.textContent = pad((d % 3600000)  / 60000);
    if (this.#els.seconds) this.#els.seconds.textContent = pad((d % 60000)    / 1000);
  }
 
  #stop() {
    clearInterval(this.#timer);
    this.#timer = null;
  }
 
  #setAll(val) {
    Object.values(this.#els).forEach(el => { if (el) el.textContent = val; });
  }
}

