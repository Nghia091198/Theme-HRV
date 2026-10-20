/**
 * <cart-root>  — MOI tuong tac gio hang: +/-, nhap tay, xoa, doi phan loai, thanh toan.
 *                Dung chung cho ca drawer lan trang /cart.
 * <mini-cart>   — chi con: dong/mo, focus trap, khoa scroll.
 *
 * Thay the cart-drawer.js. Truoc day toan bo handler nam trong MiniCartComponent,
 * nen trang /cart (cung markup, khong co <mini-cart>) khong co nut nao chay duoc.
 */
(() => {
    const FOX = (window.FOX = window.FOX || {});
    const cart = FOX.cart;
    const FOCUSABLE =
        'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';
    const QUANTITY_DELAY = 300;

    if (!cart) {
        console.warn('[cart-root] Thiếu FOX.cart — nạp cart.js trước cart-root.js.');
        return;
    }

    /* ───────────────────────── cart-root ───────────────────────── */

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
            this.#initSlider();
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
            this.#timers.forEach((id) => clearTimeout(id));
            this.#timers.clear();
            this.#queuedQuantity = null;
            this.#pendingLine = null;
        }

        /** Goi tu FOX.cart sau khi swap cart-view */
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

        /* ── Click: tang/giam, xoa, thanh toan, dong ── */
        #onClick(event) {
            if (event.target.closest('[data-action="close"]')) {
                event.preventDefault();
                this.closest('mini-cart')?.close();
                return;
            }

            if (event.target.closest('[data-role="checkout"]')) {
                event.preventDefault();
                this.#navigateAfterSave('/checkout');
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
                input.value = next; // cap nhat ngay, goi server sau khi ngung bam
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

        /* ── Nhap tay vao o so luong (truoc day khong he co handler) ── */
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
                    input.value = item.dataset.quantity || 1; // nhap rac thi tra ve cu
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

        /* ── Debounce: bam "+" 5 lan = 1 request, khong phai 5 ── */
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
                'Không thể cập nhật số lượng'
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
            this.#startMutation(item, line, () => cart.remove(line), 'Không thể xóa sản phẩm');
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
                FOX.toast.error('Phân loại này hiện không còn hàng');
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
                'Không thể cập nhật sản phẩm'
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

    /* ───────────────────────── mini-cart ───────────────────────── */

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
                'cart:changed',
                ({ detail }) => {
                    this.dataset.itemCount = String(detail.itemCount);
                    this.syncState();
                },
                { signal }
            );

            this.syncState();
        }

        /** core-component-offcanvas.css chi hien content khi data-state la ready/empty/error */
        syncState() {
            const view = this.querySelector('[data-role="cart-view"]');
            const count = Number(view?.dataset.itemCount ?? this.dataset.itemCount) || 0;
            this.dataset.state = count > 0 ? 'ready' : 'empty';
        }

        disconnectedCallback() {
            this.#abort?.abort();
            this.#abort = null;
            clearTimeout(this.#closeTimer);
            document.documentElement.classList.remove('fox-mini-cart-lock');
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
            document.documentElement.classList.add('fox-mini-cart-lock');
            requestAnimationFrame(() => this.#panel?.focus());
        }

        close() {
            if (!this.isOpen) return;
            this.removeAttribute('data-open');
            this.setAttribute('data-closing', '');
            this.#lastTrigger?.setAttribute?.('aria-expanded', 'false');
            document.documentElement.classList.remove('fox-mini-cart-lock');

            const finish = () => {
                if (this.isOpen) return;
                this.removeAttribute('data-closing');
                this.setAttribute('aria-hidden', 'true');
                if (this.#lastTrigger?.isConnected) this.#lastTrigger.focus();
            };

            clearTimeout(this.#closeTimer);
            if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
            else this.#closeTimer = setTimeout(finish, 360);
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
})();
