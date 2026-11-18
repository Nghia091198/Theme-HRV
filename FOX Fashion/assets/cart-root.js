(() => {
    const FOX = (window.FOX = window.FOX || {});

    const CART_EVENTS = {
        changed: 'cart:changed',
    };

    const CART_ROUTES = {
        checkout: '/checkout',
    };

    const MESSAGES = {
        quantityFailed: 'Không thể cập nhật số lượng',
        removeFailed: 'Không thể xóa sản phẩm',
        variantFailed: 'Không thể cập nhật sản phẩm',
        variantSoldOut: 'Phân loại này hiện không còn hàng',
    };

    const FOCUSABLE =
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const QUANTITY_DELAY = 300;
    const CLOSE_DURATION = 360;
    const LOCK_CLASS = 'fox-mini-cart-lock';
    const SCROLL_TRACK = '.fox-mini-cart__collection-track';
    const DRAG_THRESHOLD = 5;

    const cart = FOX.cart;
    if (!cart) {
        console.warn('[cart-root] Thiếu FOX.cart — nạp cart.js trước cart-root.js.');
        return;
    }

    class CartRoot extends HTMLElement {
        #abort = null;
        #timers = new Map();
        #queuedQuantity = null;
        #pendingLine = null;
        #mutationPromise = null;
        #navigationPending = false;

        connectedCallback() {
            this.#removeLegacyVariantElements();
            this.#abort = new AbortController();
            const { signal } = this.#abort;
            this.addEventListener('click', (e) => this.#onClick(e), { signal });
            this.addEventListener('change', (e) => this.#onChange(e), { signal });
            this.addEventListener('input', (e) => this.#onInput(e), { signal });
            this.addEventListener('wheel', (e) => this.#onTrackWheel(e), { signal, passive: false });
            this.addEventListener('pointerdown', (e) => this.#onTrackPointerDown(e), { signal });
            this.addEventListener('dragstart', (e) => {
                if (e.target.closest?.(SCROLL_TRACK)) e.preventDefault();
            }, { signal });
            this.#initSlider();
        }

        #onTrackWheel(event) {
            const track = event.target.closest?.(SCROLL_TRACK);
            if (!track || Math.abs(event.deltaX) > Math.abs(event.deltaY)) return;
            const max = track.scrollWidth - track.clientWidth;
            if (max <= 0) return;
            const next = Math.min(max, Math.max(0, track.scrollLeft + event.deltaY));
            if (next === track.scrollLeft) return;
            event.preventDefault();
            track.scrollLeft = next;
        }

        #onTrackPointerDown(event) {
            if (event.pointerType !== 'mouse' || event.button !== 0) return;
            const track = event.target.closest?.(SCROLL_TRACK);
            if (!track || track.scrollWidth <= track.clientWidth) return;

            const startX = event.clientX;
            const startLeft = track.scrollLeft;
            let dragged = false;
            const move = (moveEvent) => {
                const distance = moveEvent.clientX - startX;
                if (!dragged && Math.abs(distance) < DRAG_THRESHOLD) return;
                dragged = true;
                track.dataset.dragging = 'true';
                track.scrollLeft = startLeft - distance;
            };
            const end = () => {
                window.removeEventListener('pointermove', move);
                window.removeEventListener('pointerup', end);
                window.removeEventListener('pointercancel', end);
                delete track.dataset.dragging;
                if (dragged) {
                    const swallow = (clickEvent) => {
                        clickEvent.preventDefault();
                        clickEvent.stopPropagation();
                    };
                    track.addEventListener('click', swallow, { capture: true, once: true });
                    setTimeout(() => track.removeEventListener('click', swallow, { capture: true }), 0);
                }
            };
            window.addEventListener('pointermove', move);
            window.addEventListener('pointerup', end);
            window.addEventListener('pointercancel', end);
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
            this.#timers.forEach((id) => clearTimeout(id));
            this.#timers.clear();
            this.#queuedQuantity = null;
            this.#pendingLine = null;
        }

        afterRender() {
            this.#removeLegacyVariantElements();
            this.#initSlider();
        }

        #removeLegacyVariantElements() {
            this.querySelectorAll('.fox-mini-cart__item-variant').forEach((element) => element.remove());
        }

        #initSlider() {
            const slider = this.querySelector('.fox-mini-cart__recommendation-slider');
            if (slider) requestAnimationFrame(() => slider.refresh?.());
        }

        #item(element) {
            return element.closest('[data-role="item"]');
        }

        #line(item) {
            return Number(item?.dataset.line) || null;
        }

        #onClick(event) {
            if (event.target.closest('[data-action="close"]')) {
                event.preventDefault();
                this.closest('mini-cart')?.close();
                return;
            }

            if (event.target.closest('[data-role="checkout"]')) {
                event.preventDefault();
                this.#navigateAfterSave(CART_ROUTES.checkout);
                return;
            }

            const link = event.target.closest('a[href]');
            if (link && (this.#queuedQuantity || this.#mutationPromise) &&
                !event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey &&
                link.target !== '_blank') {
                event.preventDefault();
                this.#navigateAfterSave(link.href);
                return;
            }

            const step = event.target.closest(
                '[data-action="increase"], [data-action="decrease"]'
            );
            if (step) {
                const item = this.#item(step);
                const input = item?.querySelector('[data-role="quantity"]');
                if (!item || !input) return;

                const max = Number(item.dataset.max) || Infinity;
                const current = Number.parseInt(input.value, 10) || 1;
                const next =
                    step.dataset.action === 'increase'
                        ? Math.min(max, current + 1)
                        : Math.max(1, current - 1);

                if (next === current) return;
                input.value = next;
                this.#queueQuantity(item, next);
                return;
            }

            const remove = event.target.closest('[data-action="remove"]');
            if (remove) {
                event.preventDefault();
                const item = this.#item(remove);
                if (item) this.#remove(item);
            }
        }

        #onInput(event) {
            const input = event.target.closest?.('[data-role="quantity"]');
            if (!input) return;
            const item = this.#item(input);
            const max = Number(item?.dataset.max) || Infinity;
            const value = Number.parseInt(input.value, 10);
            if (!item || !Number.isFinite(value) || value < 1) return;
            const quantity = Math.min(max, value);
            if (quantity !== value) input.value = quantity;
            this.#queueQuantity(item, quantity);
        }

        #onChange(event) {
            const select = event.target.closest?.('[data-role="variant-option"]');
            if (select) {
                this.#swapVariant(this.#item(select));
                return;
            }

            const input = event.target.closest?.('[data-role="quantity"]');
            if (input) {
                const item = this.#item(input);
                const value = Number.parseInt(input.value, 10);
                if (item && (!Number.isFinite(value) || value < 1)) {
                    input.value = item.dataset.quantity || 1;
                    this.#queueQuantity(item, Number(input.value));
                }
            }
        }

        #syncQuantityDisplay() {
            cart.preview(this.querySelector('[data-role="cart-view"]'));
        }

        #syncControls(line = null, sending = false) {
            this.querySelectorAll('[data-role="item"]').forEach((item) => {
                const quantityLocked = sending || (line !== null && this.#line(item) !== line);
                item.querySelectorAll('.fox-mini-cart__quantity button, [data-role="quantity"]')
                    .forEach((control) => { control.disabled = quantityLocked; });
                item.querySelectorAll('[data-action="remove"], [data-role="variant-option"]')
                    .forEach((control) => { control.disabled = sending || line !== null; });
            });
        }

        #queueQuantity(item, quantity) {
            const line = this.#line(item);
            if (!line) return;
            if (this.#pendingLine !== null && this.#pendingLine !== line) {
                item.querySelector('[data-role="quantity"]').value = item.dataset.quantity;
                return;
            }
            if (this.#mutationPromise) {
                item.querySelector('[data-role="quantity"]').value = item.dataset.quantity;
                return;
            }

            clearTimeout(this.#timers.get(line));
            this.#syncQuantityDisplay();
            if (quantity === Number(item.dataset.quantity)) {
                this.#timers.delete(line);
                this.#queuedQuantity = null;
                this.#pendingLine = null;
                this.#syncControls();
                return;
            }
            this.#queuedQuantity = { item, line, quantity };
            this.#pendingLine = line;
            this.#syncControls(line);
            this.#timers.set(
                line,
                setTimeout(() => this.#flushQuantity(), QUANTITY_DELAY)
            );
        }

        async #flushQuantity() {
            if (this.#mutationPromise) return this.#mutationPromise;
            const queued = this.#queuedQuantity;
            if (!queued) return true;

            clearTimeout(this.#timers.get(queued.line));
            this.#timers.delete(queued.line);
            this.#queuedQuantity = null;
            return this.#startMutation(
                queued.item,
                queued.line,
                () => cart.setQuantity(queued.line, queued.quantity),
                MESSAGES.quantityFailed
            );
        }

        #startMutation(item, line, action, fallbackMessage) {
            if (this.#mutationPromise) return this.#mutationPromise;
            this.#pendingLine = line;
            this.#syncControls(line, true);
            const request = this.#run(item, action, fallbackMessage);
            this.#mutationPromise = request;
            request.finally(() => {
                if (this.#mutationPromise !== request) return;
                this.#mutationPromise = null;
                this.#pendingLine = null;
                this.#syncControls();
            });
            return request;
        }

        async #navigateAfterSave(url) {
            if (this.#navigationPending) return;
            this.#navigationPending = true;
            const button = this.querySelector('[data-role="checkout"]');
            if (button) button.disabled = true;
            try {
                if (await this.#flushQuantity()) window.location.assign(url);
            } finally {
                this.#navigationPending = false;
                const currentButton = this.querySelector('[data-role="checkout"]');
                if (currentButton) currentButton.disabled = false;
            }
        }

        #remove(item) {
            const line = this.#line(item);
            if (!line || this.#pendingLine !== null) return;
            clearTimeout(this.#timers.get(line));
            this.#timers.delete(line);
            item.dataset.state = 'removing';
            this.#startMutation(item, line, () => cart.remove(line), MESSAGES.removeFailed);
        }

        #swapVariant(item) {
            if (!item || this.#pendingLine !== null) return;
            const from = this.#line(item);
            const map = this.#variantMap(item);
            if (!from || !map) return;

            const values = Array.from(
                item.querySelectorAll('[data-role="variant-option"]')
            ).map((field) => field.value);

            const match = map.find(
                (variant) =>
                    variant.a !== false &&
                    variant.o.length === values.length &&
                    variant.o.every((value, index) => value === values[index])
            );

            if (!match) {
                item.querySelectorAll('[data-role="variant-option"]').forEach((field) => {
                    field.value = field.dataset.selectedValue;
                });
                FOX.toast.error(MESSAGES.variantSoldOut);
                return;
            }
            if (match.id === Number(item.dataset.variantId)) return;

            clearTimeout(this.#timers.get(from));
            this.#timers.delete(from);
            const quantity = Number.parseInt(item.querySelector('[data-role="quantity"]')?.value, 10) || 1;
            this.#startMutation(
                item,
                from,
                () => cart.swapVariant(from, match.id, quantity),
                MESSAGES.variantFailed
            );
        }

        #variantMap(item) {
            const productId = item.dataset.productId;
            if (!productId) return null;
            const node = this.querySelector(
                `[data-role="variant-map"][data-product-id="${productId}"]`
            );
            if (!node) return null;
            try {
                return JSON.parse(node.textContent);
            } catch {
                return null;
            }
        }

        async #run(item, action, fallbackMessage) {
            item.dataset.state = item.dataset.state === 'removing' ? 'removing' : 'updating';
            try {
                await action();
                return true;
            } catch (error) {
                FOX.toast.error(error.message || fallbackMessage);
                item.dataset.state = 'idle';
                await cart.refresh().catch(() => {});
                return false;
            }
        }
    }

    if (!customElements.get('cart-root')) customElements.define('cart-root', CartRoot);

    class MiniCart extends HTMLElement {
        #abort = null;
        #panel = null;
        #lastTrigger = null;
        #closeTimer = null;

        connectedCallback() {
            this.#panel = this.querySelector('[data-role="panel"]');
            if (!this.#panel) {
                console.warn('[mini-cart] Thiếu [data-role="panel"].');
                return;
            }
            this.#abort = new AbortController();
            const { signal } = this.#abort;

            document.addEventListener('keydown', (e) => this.#onKeydown(e), { signal });
            this.addEventListener(
                'click',
                (event) => {
                    if (event.target.closest('[data-action="close"]')) {
                        event.preventDefault();
                        this.close();
                    }
                },
                { signal }
            );
            document.addEventListener(
                CART_EVENTS.changed,
                ({ detail }) => {
                    this.dataset.itemCount = String(detail.itemCount);
                    this.syncState();
                },
                { signal }
            );

            this.syncState();
        }

        syncState() {
            const view = this.querySelector('[data-role="cart-view"]');
            const count = Number(view?.dataset.itemCount ?? this.dataset.itemCount) || 0;
            this.dataset.state = count > 0 ? 'ready' : 'empty';
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
            clearTimeout(this.#closeTimer);
            document.documentElement.classList.remove(LOCK_CLASS);
        }

        get isOpen() {
            return this.hasAttribute('data-open');
        }

        open(trigger = null) {
            if (this.isOpen) return;
            this.syncState();
            this.#lastTrigger = trigger || document.activeElement;
            clearTimeout(this.#closeTimer);
            this.removeAttribute('data-closing');
            this.setAttribute('data-open', '');
            this.setAttribute('aria-hidden', 'false');
            this.#lastTrigger?.setAttribute?.('aria-expanded', 'true');
            document.documentElement.classList.add(LOCK_CLASS);
            requestAnimationFrame(() => this.#panel?.focus());
        }

        close() {
            if (!this.isOpen) return;
            this.removeAttribute('data-open');
            this.setAttribute('data-closing', '');
            this.#lastTrigger?.setAttribute?.('aria-expanded', 'false');
            document.documentElement.classList.remove(LOCK_CLASS);

            const finish = () => {
                if (this.isOpen) return;
                this.removeAttribute('data-closing');
                this.setAttribute('aria-hidden', 'true');
                if (this.#lastTrigger?.isConnected) this.#lastTrigger.focus();
            };

            clearTimeout(this.#closeTimer);
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
            else this.#closeTimer = setTimeout(finish, CLOSE_DURATION);
        }

        #onKeydown(event) {
            if (!this.isOpen) return;

            if (event.key === 'Escape') {
                event.preventDefault();
                this.close();
                return;
            }
            if (event.key !== 'Tab') return;

            const elements = Array.from(this.querySelectorAll(FOCUSABLE)).filter(
                (element) => element.offsetParent !== null
            );
            if (!elements.length) return;

            const first = elements[0];
            const last = elements[elements.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault();
                last.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault();
                first.focus();
            }
        }
    }

    if (!customElements.get('mini-cart')) customElements.define('mini-cart', MiniCart);

    const DELIVERY_ATTRIBUTE = 'Delivery Time';
    const DELIVERY_LEGACY_ASAP = 'Giao khi có hàng';
    const DELIVERY_PATTERN = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:00 - \d{2}:00)$/;
    const DELIVERY_DAYS_AHEAD = 30;
    const COPY_RESET = 1800;
    const INVOICE_FIELDS = ['bill_order_company', 'bill_order_tax_code', 'bill_email', 'bill_order_address'];
    const CART_PAGE_MESSAGES = {
        saving: 'Đang lưu…',
        deliveryAsap: 'Đơn hàng sẽ được giao ngay khi có hàng.',
        deliverySaved: (value) => `Đã lưu thời gian giao: ${value}.`,
        deliveryFailed: 'Không lưu được thời gian giao, vui lòng thử lại.',
        deliveryNoSlot: 'Hôm nay đã hết khung giờ giao, vui lòng chọn ngày khác.',
        slotPlaceholder: 'Chọn khung giờ',
        copied: 'Đã sao chép',
        copy: 'Sao chép',
        invoiceSaved: 'Đã lưu thông tin xuất hoá đơn.',
        invoiceOff: 'Đã tắt xuất hoá đơn cho đơn hàng này.',
        invoiceFailed: 'Không lưu được thông tin xuất hoá đơn, vui lòng thử lại.',
    };

    const pad = (value) => String(value).padStart(2, '0');
    const isoDate = (date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;

    class CartTotal extends HTMLElement {
        #abort = null;

        connectedCallback() {
            this.#abort = new AbortController();
            document.addEventListener(CART_EVENTS.changed, ({ detail }) => this.#sync(detail), {
                signal: this.#abort.signal,
            });
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
        }

        #sync({ itemCount, totalPrice }) {
            this.dataset.itemCount = String(itemCount);
            const side = this.querySelector('[data-role="cart-side"]');
            if (side) side.hidden = itemCount === 0;
            const note = this.querySelector('[data-role="cart-side-note"]');
            if (note) note.hidden = itemCount === 0;
            const formatted = cart.formatMoney?.(totalPrice);
            if (!formatted) return;
            this.querySelectorAll('[data-role="side-total"]').forEach((node) => { node.textContent = formatted; });
        }
    }

    class CartDelivery extends HTMLElement {
        #abort = null;
        #schedule = null;
        #date = null;
        #slot = null;
        #status = null;
        #saved = '';

        connectedCallback() {
            this.#schedule = this.querySelector('[data-role="schedule"]');
            this.#date = this.querySelector('[data-role="date"]');
            this.#slot = this.querySelector('[data-role="slot"]');
            this.#status = this.querySelector('[data-role="status"]');
            if (!this.#schedule || !this.#date || !this.#slot) return;

            this.#abort = new AbortController();
            this.addEventListener('change', (event) => this.#onChange(event), { signal: this.#abort.signal });

            const today = new Date();
            const last = new Date(today);
            last.setDate(today.getDate() + DELIVERY_DAYS_AHEAD);
            this.#date.min = isoDate(today);
            this.#date.max = isoDate(last);
            this.#restore(this.dataset.value || '');
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
        }

        #restore(value) {
            this.#saved = value;
            if (value === DELIVERY_LEGACY_ASAP) {
                this.#save('', { silent: true });
                return;
            }
            const match = value.match(DELIVERY_PATTERN);
            if (!match) return;
            const [, day, month, year, slot] = match;
            const date = `${year}-${month}-${day}`;
            if (date < this.#date.min) return;
            this.querySelector('[data-role="mode"][value="schedule"]').checked = true;
            this.#schedule.hidden = false;
            this.#date.value = date;
            const chosen = this.#renderSlots(slot);
            if (chosen && chosen !== slot) this.#saveSchedule();
        }

        #slots(date) {
            const start = Number(this.dataset.start) || 8;
            const end = Number(this.dataset.end) || 21;
            const now = new Date();
            const today = date === isoDate(now);
            const slots = [];
            for (let hour = start; hour < Math.min(end, 24); hour += 1) {
                slots.push({ value: `${pad(hour)}:00 - ${pad(hour + 1)}:00`, disabled: today && hour <= now.getHours() });
            }
            return slots;
        }

        #renderSlots(selected = '') {
            const slots = this.#slots(this.#date.value);
            const open = slots.filter((slot) => !slot.disabled);
            const chosen = open.some((slot) => slot.value === selected) ? selected : (open[0]?.value || '');
            const placeholder = new Option(CART_PAGE_MESSAGES.slotPlaceholder, '');
            placeholder.disabled = true;
            const options = slots.map((slot) => {
                const option = new Option(slot.value, slot.value, false, slot.value === chosen);
                option.disabled = slot.disabled;
                return option;
            });
            this.#slot.replaceChildren(placeholder, ...options);
            if (!chosen) placeholder.selected = true;
            this.#slot.disabled = !open.length;
            if (!open.length) this.#setStatus(CART_PAGE_MESSAGES.deliveryNoSlot);
            return chosen;
        }

        #saveSchedule() {
            if (!this.#slot.value || !this.#date.value) return;
            const [year, month, day] = this.#date.value.split('-');
            this.#save(`${day}/${month}/${year} ${this.#slot.value}`);
        }

        #onChange(event) {
            const target = event.target;
            if (target.matches('[data-role="mode"]')) {
                const schedule = target.value === 'schedule';
                this.#schedule.hidden = !schedule;
                if (!schedule) {
                    this.#save('');
                    return;
                }
                if (!this.#date.value) this.#date.value = this.#date.min;
                this.#setStatus('');
                let chosen = this.#renderSlots(this.#slot.value);
                if (!chosen && this.#date.value === this.#date.min) {
                    const next = new Date(`${this.#date.min}T00:00:00`);
                    next.setDate(next.getDate() + 1);
                    this.#date.value = isoDate(next);
                    this.#setStatus('');
                    chosen = this.#renderSlots();
                }
                if (chosen) this.#saveSchedule();
                return;
            }
            if (target === this.#date) {
                if (!this.#date.value || this.#date.value < this.#date.min) this.#date.value = this.#date.min;
                if (this.#date.value > this.#date.max) this.#date.value = this.#date.max;
                this.#setStatus('');
                if (this.#renderSlots(this.#slot.value)) this.#saveSchedule();
                return;
            }
            if (target === this.#slot) this.#saveSchedule();
        }

        async #save(value, { silent = false } = {}) {
            const message = value ? CART_PAGE_MESSAGES.deliverySaved(value) : CART_PAGE_MESSAGES.deliveryAsap;
            if (value === this.#saved) {
                if (!silent) this.#setStatus(message);
                return;
            }
            if (!silent) this.#setStatus(CART_PAGE_MESSAGES.saving);
            try {
                await cart.setAttributes({ [DELIVERY_ATTRIBUTE]: value });
                this.#saved = value;
                if (!silent) this.#setStatus(message);
            } catch {
                if (!silent) this.#setStatus(CART_PAGE_MESSAGES.deliveryFailed);
            }
        }

        #setStatus(message) {
            if (this.#status) this.#status.textContent = message;
        }
    }

    class CartCoupons extends HTMLElement {
        #abort = null;

        connectedCallback() {
            this.#abort = new AbortController();
            this.addEventListener('click', (event) => {
                const button = event.target.closest('[data-coupon-copy]');
                if (button) this.#copy(button);
            }, { signal: this.#abort.signal });
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
        }

        async #copy(button) {
            const code = button.dataset.couponCopy;
            try {
                await navigator.clipboard.writeText(code);
            } catch {
                const field = document.createElement('textarea');
                field.value = code;
                field.setAttribute('readonly', '');
                field.style.cssText = 'position:fixed;opacity:0;pointer-events:none';
                document.body.append(field);
                field.select();
                document.execCommand('copy');
                field.remove();
            }
            const label = button.querySelector('[data-role="copy-label"]');
            button.dataset.copied = 'true';
            if (label) label.textContent = CART_PAGE_MESSAGES.copied;
            clearTimeout(Number(button.dataset.copyTimer));
            button.dataset.copyTimer = String(setTimeout(() => {
                delete button.dataset.copied;
                if (label) label.textContent = CART_PAGE_MESSAGES.copy;
            }, COPY_RESET));
        }
    }

    class CartInvoice extends HTMLElement {
        #abort = null;
        #toggle = null;
        #status = null;
        #summary = null;
        #edit = null;
        #modal = null;
        #confirmButton = null;

        connectedCallback() {
            this.#toggle = this.querySelector('[data-role="invoice-toggle"]');
            this.#status = this.querySelector('[data-role="invoice-status"]');
            this.#summary = this.querySelector('[data-role="invoice-summary"]');
            this.#edit = this.querySelector('[data-role="invoice-edit"]');
            this.#modal = this.querySelector('modal-component');
            this.#confirmButton = this.querySelector('[data-role="invoice-confirm"]');
            if (!this.#toggle || !this.#modal) return;

            this.#abort = new AbortController();
            const { signal } = this.#abort;
            this.#toggle.addEventListener('change', () => this.#onToggle(), { signal });
            this.#edit?.addEventListener('click', () => this.#modal.open(this.#edit), { signal });
            this.#confirmButton?.addEventListener('click', () => this.#save(), { signal });
            this.#modal.addEventListener('modal:closed', () => {
                if (this.dataset.saved !== 'true') this.#toggle.checked = false;
            }, { signal });
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
        }

        #inputs() {
            return INVOICE_FIELDS.map((name) => this.querySelector(`[data-invoice="${name}"]`)).filter(Boolean);
        }

        async #onToggle() {
            this.#setStatus('');
            if (this.#toggle.checked) {
                this.#modal.open(this.#toggle);
                return;
            }
            this.#markSaved(false);
            try {
                await cart.setAttributes({ invoice: 'no' });
                this.#setStatus(CART_PAGE_MESSAGES.invoiceOff);
            } catch {
                this.#setStatus(CART_PAGE_MESSAGES.invoiceFailed);
            }
        }

        async #save() {
            const inputs = this.#inputs();
            inputs.forEach((input) => { input.value = input.value.trim(); });
            if (!inputs.every((input) => input.reportValidity())) return;

            const attributes = { invoice: 'yes' };
            inputs.forEach((input) => { attributes[input.dataset.invoice] = input.value; });
            this.#confirmButton.disabled = true;
            try {
                await cart.setAttributes(attributes);
                this.#markSaved(true, attributes);
                this.#toggle.checked = true;
                this.#setStatus(CART_PAGE_MESSAGES.invoiceSaved);
                this.#modal.close('saved');
            } catch {
                this.#setStatus(CART_PAGE_MESSAGES.invoiceFailed);
            } finally {
                this.#confirmButton.disabled = false;
            }
        }

        #markSaved(saved, attributes = null) {
            this.dataset.saved = String(saved);
            if (this.#edit) this.#edit.hidden = !saved;
            if (!this.#summary) return;
            this.#summary.hidden = !saved;
            if (saved && attributes) {
                this.#summary.textContent = `${attributes.bill_order_company} · MST ${attributes.bill_order_tax_code}`;
            }
        }

        #setStatus(message) {
            if (this.#status) this.#status.textContent = message;
        }
    }

    if (!customElements.get('cart-total')) customElements.define('cart-total', CartTotal);
    if (!customElements.get('cart-delivery')) customElements.define('cart-delivery', CartDelivery);
    if (!customElements.get('cart-coupons')) customElements.define('cart-coupons', CartCoupons);
    if (!customElements.get('cart-invoice')) customElements.define('cart-invoice', CartInvoice);
})(); 
