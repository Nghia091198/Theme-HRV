class FoxCountdown extends HTMLElement {
  #abortController = null;
  #timer = null;
  #deadline = null;
  #type = 'deadline';
  #values = {};

  connectedCallback() {
    this.destroy();

    this.#type = this.dataset.type === 'daily' ? 'daily' : 'deadline';
    this.#deadline = this.#parseDeadline();
    this.#values = {
      days: this.querySelector('[data-countdown-value="days"]'),
      hours: this.querySelector('[data-countdown-value="hours"]'),
      minutes: this.querySelector('[data-countdown-value="minutes"]'),
      seconds: this.querySelector('[data-countdown-value="seconds"]'),
    };

    if (!this.#deadline) {
      this.dataset.state = 'disabled';
      return;
    }

    this.#abortController = new AbortController();
    document.addEventListener('visibilitychange', () => this.#tick(), {
      signal: this.#abortController.signal,
    });

    this.dataset.state = 'running';
    this.dataset.type = this.#type;
    this.#tick();
    this.#timer = window.setInterval(() => this.#tick(), 1000);
  }

  disconnectedCallback() {
    this.destroy();
  }

  destroy() {
    if (this.#timer) {
      window.clearInterval(this.#timer);
      this.#timer = null;
    }

    this.#abortController?.abort();
    this.#abortController = null;
  }

  #parseDeadline() {
    if (this.#type === 'daily') {
      return this.#getNextDailyDeadline();
    }

    const day = this.#number(this.dataset.day);
    const month = this.#number(this.dataset.month);
    const year = this.#number(this.dataset.year);
    const time = this.#parseTime();

    if (!day || !month || !year || !time) return null;

    const deadline = new Date(year, month - 1, day, time.hours, time.minutes, time.seconds);

    if (
      deadline.getFullYear() !== year ||
      deadline.getMonth() !== month - 1 ||
      deadline.getDate() !== day
    ) {
      return null;
    }

    return deadline;
  }

  #tick() {
    if (!this.#deadline) return;

    const remaining = this.#deadline.getTime() - Date.now();

    if (remaining <= 0) {
      if (this.#type === 'daily') {
        const previousDeadline = this.#deadline;
        this.#deadline = this.#getNextDailyDeadline();
        this.#dispatchComplete(previousDeadline, true);
        this.#tick();
        return;
      }

      this.#complete();
      return;
    }

    const days = Math.floor(remaining / 86400000);
    const hours = Math.floor((remaining % 86400000) / 3600000);
    const minutes = Math.floor((remaining % 3600000) / 60000);
    const seconds = Math.floor((remaining % 60000) / 1000);

    this.#setValues(days, hours, minutes, seconds);
  }

  #setValues(days, hours, minutes, seconds) {
    this.#setValue('days', days);
    this.#setValue('hours', hours);
    this.#setValue('minutes', minutes);
    this.#setValue('seconds', seconds);
  }

  #setValue(key, value) {
    const element = this.#values[key];
    if (!element) return;

    element.textContent = String(Math.max(0, value)).padStart(2, '0');
  }

  #complete() {
    if (this.dataset.state === 'complete') return;

    this.#setValues(0, 0, 0, 0);
    this.destroy();
    this.dataset.state = 'complete';
    this.#dispatchComplete(this.#deadline, false);
  }

  #dispatchComplete(deadline, repeats) {
    this.dispatchEvent(
      new CustomEvent('countdown:complete', {
        bubbles: true,
        composed: true,
        detail: {
          deadline,
          repeats,
          type: this.#type,
        },
      })
    );
  }

  #getNextDailyDeadline() {
    const time = this.#parseTime();
    if (!time) return null;

    const now = new Date();
    const deadline = new Date(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      time.hours,
      time.minutes,
      time.seconds
    );

    if (deadline.getTime() <= now.getTime()) {
      deadline.setDate(deadline.getDate() + 1);
    }

    return deadline;
  }

  #parseTime() {
    const rawTime = (this.dataset.time || '00:00:00').trim();
    const match = rawTime.match(/^(\d{1,2}):(\d{2})(?::(\d{2}))?$/);
    if (!match) return null;

    const hours = this.#number(match[1]);
    const minutes = this.#number(match[2]);
    const seconds = this.#number(match[3], 0);

    if (
      hours === null ||
      minutes === null ||
      seconds === null ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59 ||
      seconds < 0 ||
      seconds > 59
    ) {
      return null;
    }

    return { hours, minutes, seconds };
  }

  #number(value, fallback = null) {
    const number = Number.parseInt(value, 10);
    return Number.isFinite(number) ? number : fallback;
  }
}

if (!customElements.get('fox-countdown')) {
  customElements.define('fox-countdown', FoxCountdown);
}
