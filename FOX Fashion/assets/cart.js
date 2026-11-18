(() => {
    const FOX = (window.FOX = window.FOX || {});
    const routes = FOX.config?.routes || {};

    const CART_EVENTS = {
        changed: 'cart:changed',
        added: 'cart:added',
    };

    const CART_ROUTES = {
        view: routes.cartView || '/cart?view=data',
        add: routes.cartAdd || '/cart/add.js',
        change: routes.cartChange || '/cart/change.js',
        update: routes.cartUpdate || '/cart/update.js',
        checkout: '/checkout',
    };

    const VIEW = '[data-role="cart-view"]';
    const NOTE_INPUT = '[data-role="note-input"]';
    const CART_COUNT = '.fox-header-action__badge:not(.fox-header-action__badge--wishlist), [data-role="cart-count"]';
    const NOTE_SAVE_DELAY = 600;

    const http = FOX.http;
    if (!http) {
        console.warn('[FOX.cart] Thiếu FOX.http — nạp http.js trước cart.js.');
        return;
    }

    let version = 0;
    let pending = 0;

    const emit = (name, detail) =>
        document.dispatchEvent(new CustomEvent(name, { bubbles: true, detail }));

    const busy = (delta) => {
        pending = Math.max(0, pending + delta);
        document
            .querySelectorAll('cart-root')
            .forEach((el) => el.toggleAttribute('data-busy', pending > 0));
    };

    const readView = (view) => ({
        itemCount: Number(view?.dataset.itemCount) || 0,
        totalPrice: Number(view?.dataset.totalPrice) || 0,
    });

    const formatMoney = (amount) => {
        const value = window.ShopMoney(amount);
        const currency = window.Haravan?.currency || window.HaravanAnalytics?.meta?.currency;
        return currency === 'VND' && !/(\u20ab|VND)/i.test(value)
            ? `${value}\u20ab`
            : value;
    };

    async function render() {
        const token = ++version;
        const doc = await http.html(CART_ROUTES.view);
        const next = doc.querySelector(VIEW);
        if (!next) throw new Error('Không thể tải giỏ hàng. Vui lòng thử lại.');
        if (token !== version) return null;

        document.querySelectorAll(VIEW).forEach((old) => {
            const fresh = next.cloneNode(true);
            const host = old.closest('cart-root');
            old.replaceWith(fresh);
            host?.afterRender?.(fresh);
        });
        return next;
    }

    const hasPromoApp = () =>
        FOX.config?.app?.promotion !== 'none' && typeof window.buyXgetY !== 'undefined';

    const BUYING_OFF_CLASS = 'fox-buying-off';
    const BUYING_OFF_MESSAGE = 'Tính năng mua hàng đang tạm tắt.';

    function rawAdd(variantId, quantity, properties) {
        if (document.body?.classList.contains(BUYING_OFF_CLASS)) {
            return Promise.reject(new Error(BUYING_OFF_MESSAGE));
        }
        if (hasPromoApp()) {
            return new Promise((resolve, reject) => {
                try {
                    window.buyXgetY.addCartBuyXGetY_detail(
                        false,
                        variantId,
                        variantId,
                        quantity,
                        resolve
                    );
                } catch (error) {
                    reject(error);
                }
            });
        }

        const body = { id: variantId, quantity };
        if (properties) {
            Object.entries(properties).forEach(([key, value]) => {
                body[`properties[${key}]`] = value;
            });
        }
        return http.json(CART_ROUTES.add, { method: 'POST', body });
    }

    const change = (line, quantity) =>
        http.json(CART_ROUTES.change, {
            method: 'POST',
            body: { line, quantity },
        });

    function preview(view) {
        if (!view || typeof window.ShopMoney !== 'function') return;

        let total = Number(view.dataset.totalPrice) || 0;
        let count = Number(view.dataset.itemCount) || 0;
        view.querySelectorAll('[data-role="item"]').forEach((item) => {
            const quantity = Number.parseInt(item.querySelector('[data-role="quantity"]')?.value, 10);
            const previous = Number(item.dataset.quantity);
            const price = Number(item.dataset.unitPrice);
            if (!Number.isFinite(quantity) || !Number.isFinite(previous) || !Number.isFinite(price)) return;

            total += (quantity - previous) * price;
            count += quantity - previous;
            const sale = item.querySelector('.fox-mini-cart__price-sale');
            const original = item.querySelector('.fox-mini-cart__price-original');
            if (sale) sale.textContent = formatMoney(price);
            if (original) original.textContent = formatMoney(Number(item.dataset.compareAtPrice));
        });

        view.querySelectorAll('[data-role="total-price"]').forEach((node) => { node.textContent = formatMoney(total); });
        view.querySelectorAll('[data-role="item-count"]').forEach((node) => { node.textContent = String(Math.max(0, count)); });

        const shipping = view.querySelector('[data-role="free-shipping"]');
        const { enabled, threshold: configuredThreshold } = FOX.config?.cart?.freeShipping || {};
        const threshold = Number(shipping?.dataset.threshold || configuredThreshold);
        if (!shipping || !enabled || !(Number(threshold) > 0)) return;
        const progress = shipping.querySelector('[data-role="free-shipping-progress"]');
        const message = shipping.querySelector('[data-role="free-shipping-message"]');
        if (progress) progress.style.width = `${Math.min(100, Math.max(0, total / threshold * 100))}%`;
        if (message) message.textContent = total >= threshold
            ? '\u0110\u01a1n h\u00e0ng \u0111\u00e3 \u0111\u1ee7 \u0111i\u1ec1u ki\u1ec7n mi\u1ec5n ph\u00ed v\u1eadn chuy\u1ec3n.'
            : `B\u1ea1n c\u00f2n ${formatMoney(threshold - total)} \u0111\u1ec3 \u0111\u01b0\u1ee3c mi\u1ec5n ph\u00ed v\u1eadn chuy\u1ec3n.`;
    }

    function syncQuantity(response) {
        const views = Array.from(document.querySelectorAll(VIEW));
        const items = response?.items;
        if (!views.length || !Array.isArray(items) ||
            !Number.isFinite(Number(response.total_price)) ||
            !Number.isFinite(Number(response.item_count)) ||
            typeof window.ShopMoney !== 'function') return null;

        const rowsByView = views.map((view) => Array.from(view.querySelectorAll('[data-role="item"]')));
        if (rowsByView.some((rows) => rows.length !== items.length || rows.some((row, index) =>
            Number(row.dataset.variantId) !== Number(items[index].variant_id ?? items[index].id) ||
            !Number.isFinite(Number(items[index].quantity)) ||
            !Number.isFinite(Number(items[index].price))))) return null;

        views.forEach((view, viewIndex) => {
            rowsByView[viewIndex].forEach((row, index) => {
                const item = items[index];
                row.dataset.quantity = String(item.quantity);
                row.dataset.unitPrice = String(item.price);
                row.dataset.state = 'idle';
                const input = row.querySelector('[data-role="quantity"]');
                if (input) input.value = item.quantity;
            });
            view.dataset.itemCount = String(response.item_count);
            view.dataset.totalPrice = String(response.total_price);
            preview(view);
        });
        return views[0];
    }

    async function mutate(reason, run, sync = null) {
        busy(1);
        try {
            const response = await run();
            const view = (sync && sync(response)) || await render();
            if (!view) return null;
            const detail = { reason, ...readView(view) };
            emit(CART_EVENTS.changed, detail);
            return detail;
        } finally {
            busy(-1);
        }
    }

    FOX.cart = {
        events: CART_EVENTS,
        routes: CART_ROUTES,
        preview,

        get snapshot() {
            return readView(document.querySelector(VIEW));
        },

        get itemCount() {
            return this.snapshot.itemCount;
        },

        async add(variantId, quantity = 1, properties = null) {
            const result = await mutate('add', () => rawAdd(variantId, quantity, properties));
            emit(CART_EVENTS.added, { variantId, quantity });
            return result;
        },

        async addMany(items) {
            const addNext = async (index, added) => {
                if (index >= items.length) return added;
                const item = items[index];
                try {
                    await rawAdd(item.variantId, item.quantity || 1, item.properties || null);
                    added += 1;
                } catch (error) {
                    console.warn('[FOX.cart] Không thêm được', item.variantId, error?.message);
                }
                return addNext(index + 1, added);
            };
            let added = 0;
            const result = await mutate('add', async () => {
                added = await addNext(0, 0);
            });
            if (added) emit(CART_EVENTS.added, { items, added });
            return { ...result, added };
        },

        async buyNow(variantId, quantity = 1, properties = null) {
            busy(1);
            try {
                await rawAdd(variantId, quantity, properties);
                window.location.assign(CART_ROUTES.checkout);
            } finally {
                busy(-1);
            }
        },

        setQuantity: (line, quantity) =>
            mutate('quantity', () => change(line, quantity), syncQuantity),

        remove: (line) => mutate('remove', () => change(line, 0)),

        swapVariant: (fromLine, toId, quantity = 1) =>
            mutate('variant', async () => {
                await change(fromLine, 0);
                await rawAdd(toId, quantity, null);
            }),

        refresh: () => mutate('refresh', async () => {}),

        setNote: (note) =>
            http.json(CART_ROUTES.update, { method: 'POST', body: { note: String(note || '') } }),

        setAttributes: (attributes) =>
            http.json(CART_ROUTES.update, {
                method: 'POST',
                body: Object.fromEntries(
                    Object.entries(attributes).map(([key, value]) => [`attributes[${key}]`, String(value ?? '')])
                ),
            }),

        formatMoney,
    };

    let noteTimer = 0;
    const saveNote = (input) => {
        window.clearTimeout(noteTimer);
        FOX.cart.setNote(input.value).catch((error) => console.warn('[FOX.cart] Không lưu được ghi chú.', error?.message));
    };
    document.addEventListener('input', (event) => {
        const input = event.target.closest?.(NOTE_INPUT);
        if (!input) return;
        window.clearTimeout(noteTimer);
        noteTimer = window.setTimeout(() => saveNote(input), NOTE_SAVE_DELAY);
    });
    document.addEventListener('change', (event) => {
        const input = event.target.closest?.(NOTE_INPUT);
        if (input) saveNote(input);
    });

    FOX.cartAction = {
        addToCart: ({ variantId, quantity = 1 }) => FOX.cart.add(variantId, quantity),
        buyNow: ({ variantId, quantity = 1 }) => FOX.cart.buyNow(variantId, quantity),
    };

    document.addEventListener(CART_EVENTS.changed, ({ detail }) => {
        document.querySelectorAll(CART_COUNT).forEach((el) => {
            el.textContent = detail.itemCount;
            el.toggleAttribute('hidden', detail.itemCount === 0);
        });
    });
})();
