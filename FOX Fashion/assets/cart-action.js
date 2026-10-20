(() => {
	// Cart actions are shared by product controls and cart UI.
	const root = window.FOX = window.FOX || {};
	const config = root.config || {};
	const cart = root.cart;
	const appConfig = config.app || {};

	function FOXHandleCartActionError(error, action, context = {}) {
		const normalized = error?.code ? error : (root.createCartError?.({ action, cause: error }) || error);
		return { error: { name: normalized.name, code: normalized.code, message: normalized.message, status: normalized.status, action }, ...context };
	}

	class AddToCartComponent extends HTMLElement {
		static get observedAttributes() {
			return ['data-variant-id', 'data-quantity', 'data-mode', 'data-disabled'];
		}

		#abortController = null;
		#trigger = null;
		#busy = false;
		#resetTimer = null;
		#initialized = false;

		connectedCallback() {
			if (this.#initialized) return;
			this.#trigger = this.querySelector('[data-role="trigger"]');
			if (!this.#trigger || !root.cartAction) {
				this.dataset.state = 'error';
				console.warn('[AddToCart] Missing trigger or cart service.');
				return;
			}

			this.#abortController = new AbortController();
			this.#trigger.addEventListener('click', (event) => this.#onTriggerClick(event), {
				signal: this.#abortController.signal,
			});
			if (!this.dataset.state) this.dataset.state = 'idle';
			this.#syncDisabled();
			this.#initialized = true;
		}

		disconnectedCallback() {
			this.destroy();
		}

		attributeChangedCallback(name, oldValue, newValue) {
			if (!this.#initialized || oldValue === newValue) return;
			if (name === 'data-disabled') this.#syncDisabled();
		}

		destroy() {
			this.#abortController?.abort();
			this.#abortController = null;
			clearTimeout(this.#resetTimer);
			this.#resetTimer = null;
			this.#busy = false;
			this.#initialized = false;
		}

		get variantId() {
			if (this.dataset.variantId) return this.dataset.variantId;
			const localVariant = this.querySelector('[data-role="variant"]');
			if (localVariant?.value) return localVariant.value;
			const formVariant = this.closest('form')?.querySelector('[data-atc-variant], #product-select');
			if (formVariant?.value) return formVariant.value;
			const pageVariant = document.getElementById('product-select');
			if (pageVariant?.value) return pageVariant.value;
			return window.ProductConfig?.data?.variants?.[0]?.id || null;
		}

		get quantity() {
			const input = this.querySelector('[data-role="quantity"]');
			const value = Number.parseInt(input?.value ?? this.dataset.quantity, 10);
			return Number.isFinite(value) && value > 0 ? value : 1;
		}

		get busy() {
			return this.#busy;
		}

		async add() {
			if (this.#busy || this.dataset.disabled === 'true') return false;
			const mode = this.dataset.mode === 'buy-now' ? 'buy-now' : 'cart';
			const variantId = this.variantId;
			const quantity = this.quantity;

			if (!variantId) {
				return this.#fail(FOXHandleCartActionError(root.createCartError?.({ name: 'CartValidationError', code: 'cart_variant_required' }), 'add', { variantId, quantity, mode }));
			}

			this.#setBusy(true);
			try {
				const updatedCart = await (mode === 'buy-now' ? root.cartAction.buyNow({ variantId, quantity }) : root.cartAction.addToCart({ variantId, quantity }));
				this.dataset.state = 'success';
				this.#emit('cart:add', { variantId, quantity, mode, cart: updatedCart, trigger: this.#trigger });

				if (mode === 'buy-now') {
					window.location.assign('/checkout');
					return true;
				}

				this.#toast('success', 'Đã thêm vào giỏ hàng');
				this.#resetTimer = setTimeout(() => {
					if (this.dataset.state === 'success') this.dataset.state = 'idle';
				}, 1200);
				return true;
			} catch (error) {
				return this.#fail(FOXHandleCartActionError(error, mode === 'buy-now' ? 'buy_now' : 'add', { variantId, quantity, mode }));
			} finally {
				this.#setBusy(false);
			}
		}

		#fail(detail) {
			this.dataset.state = 'error';
			this.#toast('error', detail.error?.message || detail.message);
			this.#emit('cart:add-error', detail);
			return false;
		}

		#setBusy(busy) {
			this.#busy = busy;
			if (busy) this.dataset.state = 'loading';
			if (this.#trigger) this.#trigger.disabled = busy || this.dataset.disabled === 'true';
		}

		#syncDisabled() {
			const disabled = this.dataset.disabled === 'true';
			if (this.#trigger) this.#trigger.disabled = disabled || this.#busy;
			if (disabled && !this.#busy) this.dataset.state = 'disabled';
			if (!disabled && this.dataset.state === 'disabled') this.dataset.state = 'idle';
		}

		#onTriggerClick(event) {
			event.preventDefault();
			this.add();
		}

		#toast(type, message) {
			const service = root.toast;
			service?.[type]?.(message);
		}

		#emit(name, detail) {
			this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
		}
	}

	root.cartAction = {
		addToCart: ({ variantId, quantity = 1, properties = null } = {}) => {
			const promotion = appConfig.promotion || 'none';
			if (promotion === 'appbuyxgety' && typeof window.buyXgetY !== 'undefined') {
				return new Promise((resolve, reject) => window.buyXgetY.addCartBuyXGetY_detail(false, variantId, variantId, quantity, () => cart.fetchCart().then(resolve).catch(reject)));
			}
			return cart.addItem(variantId, quantity, properties);
		},
		buyNow: async ({ variantId, quantity = 1, properties = null } = {}) => {
			const promotion = appConfig.promotion || 'none';
			if (promotion !== 'none' && typeof window.buyXgetY !== 'undefined') {
				return new Promise((resolve, reject) => window.buyXgetY.addCartBuyXGetY_detail(false, variantId, variantId, quantity, () => cart.fetchCart().then((value) => { window.location.assign('/checkout'); resolve(value); }).catch(reject)));
			}
			const value = await cart.addItem(variantId, quantity, properties);
			window.location.assign('/checkout');
			return value;
		},
		increase: (line, quantity) => cart.changeItem(line, Number(quantity) + 1),
		decrease: (line, quantity) => cart.changeItem(line, Math.max(1, Number(quantity) - 1)),
		changeItem: (line, quantity) => cart.changeItem(line, quantity),
		remove: (line) => cart.changeItem(line, 0),
		changeVariant: (line, variantId) => cart.changeVariant(line, variantId),
	};
	root.FOXHandleCartActionError = FOXHandleCartActionError;

	if (!customElements.get('add-to-cart')) {
		customElements.define('add-to-cart', AddToCartComponent);
	}
})();
