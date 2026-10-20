/**
 * FOX.cart — lop ghi gio hang.
 * Thay the cart-api.js va toan bo facade FOX.cartAction trong cart-action.js.
 *
 * Nguyen tac:
 *  - MOT nguon su that duy nhat: HTML tu /cart?view=data. Khong giu JSON state song song.
 *  - Moi thao tac ghi di qua dung mot duong: mutate() -> POST -> render() -> cart:changed.
 *  - Thao tac doi/xoa theo line index cua cart-view vua render.
 *  - Chi 2 event: cart:changed (da xong) va cart:added. Khong co cap updating/updated.
 */
(() => {
    const FOX = (window.FOX = window.FOX || {});
    const http = FOX.http;
    const routes = FOX.config?.routes || {};
    const VIEW = '[data-role="cart-view"]';

    if (!http) {
        console.warn('[FOX.cart] Thiếu FOX.http — nạp core-http.js trước cart.js.');
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

    /** Lay HTML moi, thay MOI cart-view dang co tren trang (drawer + /cart) */
    async function render() {
        const token = ++version;
        const doc = await http.html(routes.cartView || '/cart?view=data');
        const next = doc.querySelector(VIEW);
        if (!next) throw new Error('Không thể tải giỏ hàng. Vui lòng thử lại.');
        if (token !== version) return null; // da co ban render moi hon

        document.querySelectorAll(VIEW).forEach((old) => {
            const fresh = next.cloneNode(true);
            const host = old.closest('cart-root');
            old.replaceWith(fresh);
            host?.afterRender?.(fresh);
        });
        return next;
    }

    /* ── Khuyen mai buyXgetY ──────────────────────────────────────────────
       Truoc day doan nay bi copy 3 lan (addToCart, buyNow, buyNowProdItem).
       Gio nam dung mot cho, moi duong them hang deu di qua day.          */
    const hasPromoApp = () =>
        FOX.config?.app?.promotion !== 'none' && typeof window.buyXgetY !== 'undefined';

    function rawAdd(variantId, quantity, properties) {
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
        return http.json(routes.cartAdd || '/cart/add.js', { method: 'POST', body });
    }

    const change = (line, quantity) =>
        http.json(routes.cartChange || '/cart/change.js', {
            method: 'POST',
            body: { line, quantity },
        });

    function preview(view) {
        if (!view || typeof window.ShopMoney !== 'function') return;

        let total = Number(view.dataset.totalPrice) || 0;
        view.querySelectorAll('[data-role="item"]').forEach((item) => {
            const quantity = Number.parseInt(item.querySelector('[data-role="quantity"]')?.value, 10);
            const previous = Number(item.dataset.quantity);
            const price = Number(item.dataset.unitPrice);
            if (!Number.isFinite(quantity) || !Number.isFinite(previous) || !Number.isFinite(price)) return;

            total += (quantity - previous) * price;
            const sale = item.querySelector('.fox-mini-cart__price-sale');
            const original = item.querySelector('.fox-mini-cart__price-original');
            if (sale) sale.textContent = formatMoney(price);
            if (original) original.textContent = formatMoney(Number(item.dataset.compareAtPrice));
        });

        const totalPrice = view.querySelector('[data-role="total-price"]');
        if (totalPrice) totalPrice.textContent = formatMoney(total);

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

    /** Duong ghi duy nhat: chay cac thao tac, cap nhat view, bao mot lan */
    async function mutate(reason, run, sync = null) {
        busy(1);
        try {
            const response = await run();
            const view = (sync && sync(response)) || await render();
            if (!view) return null;
            const detail = { reason, ...readView(view) };
            emit('cart:changed', detail);
            return detail;
        } finally {
            busy(-1);
        }
    }

    FOX.cart = {
        preview,
        /** So lieu doc tu DOM — thay cho FOX.cart.state cu */
        get snapshot() {
            return readView(document.querySelector(VIEW));
        },

        get itemCount() {
            return this.snapshot.itemCount;
        },

        async add(variantId, quantity = 1, properties = null) {
            const result = await mutate('add', () => rawAdd(variantId, quantity, properties));
            emit('cart:added', { variantId, quantity });
            return result;
        },

        /** Mua ngay: khong render vi dang nao cung chuyen trang */
        async buyNow(variantId, quantity = 1, properties = null) {
            busy(1);
            try {
                await rawAdd(variantId, quantity, properties);
                window.location.assign('/checkout');
            } finally {
                busy(-1);
            }
        },

        setQuantity: (line, quantity) =>
            mutate('quantity', () => change(line, quantity), syncQuantity),

        remove: (line) => mutate('remove', () => change(line, 0)),

        /** Doi phan loai: bo dong cu, them dong moi, giu nguyen so luong */
        swapVariant: (fromLine, toId, quantity = 1) =>
            mutate('variant', async () => {
                await change(fromLine, 0);
                await rawAdd(toId, quantity, null);
            }),

        refresh: () => mutate('refresh', async () => {}),
    };

    /* Tuong thich nguoc: script-global.js.liquid con goi FOX.cartAction.addToCart */
    FOX.cartAction = {
        addToCart: ({ variantId, quantity = 1 }) => FOX.cart.add(variantId, quantity),
        buyNow: ({ variantId, quantity = 1 }) => FOX.cart.buyNow(variantId, quantity),
    };

    /* Badge so luong tren header — truoc day khong bao gio tu cap nhat */
    document.addEventListener('cart:changed', ({ detail }) => {
        document.querySelectorAll('.fox-header-action__badge').forEach((el) => {
            el.textContent = detail.itemCount;
            el.toggleAttribute('hidden', detail.itemCount === 0);
        });
    });
})();
