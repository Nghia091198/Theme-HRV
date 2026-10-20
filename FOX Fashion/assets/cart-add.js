/**
 * <add-to-cart> — nut them vao gio.
 * Thay the phan custom element cua cart-action.js.
 *
 * Chi con 4 viec: tim variantId, doc quantity, quan trang thai busy, chon mode.
 * Bo CartError / FOXCreateCartError / errorText map / #normalizeError /
 * #publicError / FOXHandleCartActionError — loi gio la Error thuong, catch tai cho.
 */
(() => { 
    const FOX = (window.FOX = window.FOX || {});

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
                FOX.toast.error('Vui lòng chọn phân loại sản phẩm');
                return;
            }

            const buyNow = this.dataset.mode === 'buy-now';
            this.#setBusy(true);

            try {
                if (buyNow) {
                    await FOX.cart.buyNow(variantId, this.quantity);
                } else {
                    await FOX.cart.add(variantId, this.quantity);
                    this.dataset.state = 'idle';
                    FOX.toast.success('Đã thêm vào giỏ hàng');
                }
            } catch (error) {
                this.dataset.state = 'error';
                FOX.toast.error(error.message || 'Không thể thêm sản phẩm vào giỏ hàng');
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

    /* Mo drawer sau khi them hang. Buy-now khong mo vi se chuyen trang. */
    document.addEventListener('cart:added', () => {
        document.querySelector('mini-cart')?.open();
    });
})();
