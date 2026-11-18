(() => {
    const FOX = (window.FOX = window.FOX || {});

    const CART_EVENTS = {
        added: 'cart:added',
    };

    const MODE_BUY_NOW = 'buy-now';

    const MESSAGES = {
        chooseVariant: 'Vui lòng chọn phân loại sản phẩm',
        addFailed: 'Không thể thêm sản phẩm vào giỏ hàng',
    };

    const PROGRESS_CLASS = 'fox-cart-progress';
    const PROGRESS_FINISH = 420;
    const PROGRESS_MIN_VISIBLE = 600;

    const progress = (() => {
        let bar = null;
        let active = 0;
        let finishTimer = 0;
        let startedAt = 0;
        const element = () => {
            if (bar?.isConnected) return bar;
            bar = document.createElement('div');
            bar.className = PROGRESS_CLASS;
            bar.setAttribute('aria-hidden', 'true');
            bar.dataset.state = 'idle';
            bar.append(document.createElement('span'));
            document.body.append(bar);
            return bar;
        };
        const finish = () => {
            bar.dataset.state = 'done';
            finishTimer = setTimeout(() => { bar.dataset.state = 'idle'; }, PROGRESS_FINISH);
        };
        return {
            start() {
                active += 1;
                clearTimeout(finishTimer);
                const node = element();
                if (node.dataset.state === 'running') return;
                startedAt = performance.now();
                node.dataset.state = 'idle';
                void node.offsetWidth;
                node.dataset.state = 'running';
            },
            done() {
                active = Math.max(0, active - 1);
                if (active || !bar) return;
                const remaining = PROGRESS_MIN_VISIBLE - (performance.now() - startedAt);
                clearTimeout(finishTimer);
                if (remaining > 0) finishTimer = setTimeout(() => { if (!active) finish(); }, remaining);
                else finish();
            },
        };
    })();

    if (FOX.cart) FOX.cart.progress = progress;

    class AddToCart extends HTMLElement {
        #trigger = null;
        #busy = false;

        connectedCallback() {
            this.#trigger =
                this.querySelector('[data-role="trigger"]') || this.querySelector('button');
            this.#trigger?.addEventListener('click', (event) => {
                event.preventDefault();
                this.add();
            });
            if (!this.dataset.state) this.dataset.state = 'idle';
        }

        get variantId() {
            return (
                this.dataset.variantId ||
                this.querySelector('[data-role="variant"]')?.value ||
                this.closest('form')?.querySelector('[data-atc-variant]')?.value ||
                document.getElementById('product-select')?.value ||
                null
            );
        }

        get quantity() {
            const raw =
                this.querySelector('[data-role="quantity"]')?.value ?? this.dataset.quantity;
            const value = Number.parseInt(raw, 10);
            return value > 0 ? value : 1;
        }

        async add() {
            if (this.#busy || this.dataset.disabled === 'true') return;

            const variantId = this.variantId;
            if (!variantId) {
                FOX.toast.error(MESSAGES.chooseVariant);
                return;
            }

            const buyNow = this.dataset.mode === MODE_BUY_NOW;
            this.#setBusy(true);
            progress.start();

            try {
                if (buyNow) {
                    await FOX.cart.buyNow(variantId, this.quantity);
                } else {
                    await FOX.cart.add(variantId, this.quantity);
                    this.dataset.state = 'idle';
                }
            } catch (error) {
                this.dataset.state = 'error';
                FOX.toast.error(error.message || MESSAGES.addFailed);
            } finally {
                progress.done();
                this.#setBusy(false);
            }
        }

        #setBusy(busy) {
            this.#busy = busy;
            if (busy) this.dataset.state = 'loading';
            if (this.#trigger) {
                this.#trigger.disabled = busy || this.dataset.disabled === 'true';
            }
        }
    }

    if (!customElements.get('add-to-cart')) customElements.define('add-to-cart', AddToCart);

    document.addEventListener(CART_EVENTS.added, () => {
        document.querySelector('mini-cart')?.open();
    });
})(); 
