(() => {
    const FOX = (window.FOX = window.FOX || {});

    const CART_EVENTS = {
        added: 'cart:added',
    };

    const MODE_BUY_NOW = 'buy-now';

    const MESSAGES = {
        chooseVariant: 'Vui lòng chọn phân loại sản phẩm',
        added: 'Đã thêm vào giỏ hàng',
        addFailed: 'Không thể thêm sản phẩm vào giỏ hàng',
    };

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

            try {
                if (buyNow) {
                    await FOX.cart.buyNow(variantId, this.quantity);
                } else {
                    await FOX.cart.add(variantId, this.quantity);
                    this.dataset.state = 'idle';
                    FOX.toast.success(MESSAGES.added);
                }
            } catch (error) {
                this.dataset.state = 'error';
                FOX.toast.error(error.message || MESSAGES.addFailed);
            } finally {
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
