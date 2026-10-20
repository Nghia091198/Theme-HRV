(() => {
	// Mini-cart rendering delegates recommendation interaction to slider-component.
	const root = window.FOX = window.FOX || {};
	const cart = root.cart;
	const cartAction = root.cartAction;
	// Variant controls share availability rules between mini-cart and cart page.
	const focusableSelector = 'a[href],button:not([disabled]),input:not([disabled]),select:not([disabled]),[tabindex]:not([tabindex="-1"])';

	class MiniCartComponent extends HTMLElement {
		#abortController = null;
		#unsubscribe = null;
		#panel = null;
		#cartView = null;
		#list = null;
		#recommendations = null;
		#recommendationSlider = null;
		#emptyCollections = null;
		#shipping = null;
		#shippingProgress = null;
		#shippingMessage = null;
		#totalPrice = null;
		#footer = null;
		#initialized = false;
		#refreshing = false;
		#renderVersion = 0;
		#lastTrigger = null;
		#closeTimer = null;
		#pendingMutations = 0;

		connectedCallback() {
			if (this.#initialized) return;
			this.#panel = this.querySelector('[data-role="panel"]');
			this.#cartView = this.querySelector('[data-role="cart-view"]');
			this.#list = this.querySelector('[data-role="list"]');
			this.#recommendations = this.querySelector('[data-role="recommendations"]');
			this.#recommendationSlider = this.querySelector('.fox-mini-cart__recommendation-slider');
			this.#emptyCollections = this.querySelector('[data-role="empty-collections"]');
			this.#shipping = this.querySelector('[data-role="free-shipping"]');
			this.#shippingProgress = this.querySelector('[data-role="free-shipping-progress"]');
			this.#shippingMessage = this.querySelector('[data-role="free-shipping-message"]');
			this.#totalPrice = this.querySelector('[data-role="total-price"]');
			this.#footer = this.querySelector('[data-role="footer"]');
			if (!this.#panel || !this.#cartView || !cart) {
				this.dataset.state = 'error';
				console.warn('[MiniCart] Missing required markup or cart service.');
				return;
			}

			this.#abortController = new AbortController();
			this.#deduplicateVariantOptions();
			this.#syncAllVariantOptions();
			const { signal } = this.#abortController;
			this.addEventListener('click', (event) => this.#onClick(event), { signal });
			this.addEventListener('change', (event) => this.#onVariantChange(event), { signal });
			document.addEventListener('keydown', (event) => this.#onKeydown(event), { signal });
			this.#unsubscribe = cart.subscribe((nextCart) => {
				this.dataset.itemCount = String(nextCart?.item_count || 0);
				if (this.hasAttribute('data-open') && !this.#refreshing) this.#renderView();
			});
			document.addEventListener('cart:error', (event) => {
				if (this.hasAttribute('data-open')) this.#toast(event.detail?.error?.message || 'Không thể thực hiện thao tác. Vui lòng thử lại.');
				this.#emit('minicart:error', event.detail || {});
			}, { signal });
			document.addEventListener('cart:add', (event) => {
				// Keep opening resilient when add-to-cart and drawer lifecycles race.
				if (event.detail?.mode !== 'buy-now' && !this.isOpen) this.open(event.detail?.trigger);
			}, { signal });
			this.#initialized = true;
			if (!this.dataset.state) this.dataset.state = 'idle';
		}

		disconnectedCallback() { this.destroy(); }

		destroy() {
			this.#abortController?.abort();
			this.#abortController = null;
			this.#unsubscribe?.();
			this.#unsubscribe = null;
			this.#renderVersion += 1;
			clearTimeout(this.#closeTimer);
			this.#closeTimer = null;
			document.documentElement.classList.remove('fox-mini-cart-lock');
			this.#initialized = false;
		}

		get isOpen() { return this.hasAttribute('data-open'); }
		get currentCart() { return cart.state || {}; }

		async open(trigger = null) {
			if (this.isOpen || !this.#initialized) return;
			this.#lastTrigger = trigger || document.activeElement;
			clearTimeout(this.#closeTimer);
			this.#closeTimer = null;
			this.removeAttribute('data-closing');
			this.setAttribute('data-open', '');
			this.setAttribute('aria-hidden', 'false');
			this.#lastTrigger?.setAttribute?.('aria-expanded', 'true');
			document.documentElement.classList.add('fox-mini-cart-lock');
			this.#emit('drawer:open', {});
			await this.refresh();
			if (!this.isOpen) return;
			requestAnimationFrame(() => this.#panel?.focus());
			this.#emit('drawer:opened', {});
		}

		close() {
			if (!this.isOpen) return;
			this.removeAttribute('data-open');
			this.setAttribute('data-closing', '');
			this.#lastTrigger?.setAttribute?.('aria-expanded', 'false');
			document.documentElement.classList.remove('fox-mini-cart-lock');
			this.#emit('drawer:close', {});
			const finish = () => {
				if (this.isOpen) return;
				this.removeAttribute('data-closing');
				this.setAttribute('aria-hidden', 'true');
				if (this.#lastTrigger?.isConnected) this.#lastTrigger.focus();
				this.#emit('drawer:closed', {});
			};
			clearTimeout(this.#closeTimer);
			if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) finish();
			else this.#closeTimer = setTimeout(finish, 360);
		}

		async refresh() {
			this.#refreshing = true;
			this.dataset.state = 'loading';
			try {
				await cart.fetchCart();
				await this.#renderView();
			} catch (error) {
				this.dataset.state = 'error';
				this.#toast(root.config?.cart?.text?.cartLoadFailed || 'Không thể tải giỏ hàng. Vui lòng thử lại.');
			} finally {
				this.#refreshing = false;
			}
		}

		async setQuantity(line, quantity) {
			const item = this.#itemElement(line);
			if (!item) return;
			item.dataset.state = 'updating';
			this.#beginMutation();
			try { await cartAction.changeItem(line, quantity); }
			catch (error) { this.#toast(error.message || 'Không thể cập nhật số lượng'); await this.refresh(); }
			finally { this.#endMutation(); }
		}

		async removeLine(line) {
			const item = this.#itemElement(line);
			if (!item) return;
			item.dataset.state = 'removing';
			this.#beginMutation();
			try { await cartAction.remove(line); }
			catch (error) { this.#toast(error.message || 'Không thể xóa sản phẩm'); await this.refresh(); }
			finally { this.#endMutation(); }
		}

		async #renderView() {
			const version = ++this.#renderVersion;
			if (cart.state?.items?.length) {
				await cart.getProducts(cart.state.items.map((item) => item.handle));
			}
			const response = await cart.fetchCartView();
			if (version !== this.#renderVersion || !this.#cartView?.isConnected) return;
			const nextView = new DOMParser().parseFromString(response, 'text/html').querySelector('[data-role="cart-view"]');
			if (!nextView) throw new Error('Cart view không hợp lệ.');
			this.#cartView.replaceWith(nextView);
			this.#cartView = nextView;
			this.#deduplicateVariantOptions();
			this.#syncAllVariantOptions();
			this.#list = nextView.querySelector('[data-role="list"]');
			this.#recommendations = nextView.querySelector('[data-role="recommendations"]');
			this.#recommendationSlider = nextView.querySelector('.fox-mini-cart__recommendation-slider');
			this.#emptyCollections = nextView.querySelector('[data-role="empty-collections"]');
			this.#shipping = nextView.querySelector('[data-role="free-shipping"]');
			this.#shippingProgress = nextView.querySelector('[data-role="free-shipping-progress"]');
			this.#shippingMessage = nextView.querySelector('[data-role="free-shipping-message"]');
			this.#totalPrice = nextView.querySelector('[data-role="total-price"]');
			this.#footer = nextView.querySelector('[data-role="footer"]');
			this.dataset.itemCount = String(cart.itemCount);
			this.dataset.state = nextView.dataset.state || (cart.itemCount ? 'ready' : 'empty');
			requestAnimationFrame(() => this.#recommendationSlider?.refresh?.());
			this.#emit('minicart:rendered', { cart: cart.state, itemCount: cart.itemCount });
		}

		#variantOptions(variant) {
			return Array.isArray(variant?.options) ? variant.options : [variant?.option1, variant?.option2, variant?.option3].filter((value) => value != null);
		}

		#variantAvailable(variant) {
			if (!variant) return false;
			if (variant.available === false || variant.available === 'false' || variant.available === 0) return false;
			if (variant.inventory_management && variant.inventory_policy !== 'continue' && Number(variant.inventory_quantity) <= 0) return false;
			return true;
		}

		#syncVariantOptions(item, product) {
			const selects = Array.from(item.querySelectorAll('[data-role="variant-option"]'));
			const selected = selects.map((select) => select.value);
			selects.forEach((select, index) => {
				Array.from(select.options).forEach((option) => {
					option.disabled = !product.variants.some((variant) => {
						if (!this.#variantAvailable(variant) || this.#variantOptions(variant)[index] !== option.value) return false;
						const values = this.#variantOptions(variant);
						return values.slice(0, index).every((value, optionIndex) => value === selected[optionIndex]);
					});
				});
			});
		}

		#syncAllVariantOptions() {
			this.#list?.querySelectorAll('[data-role="item"]').forEach((item) => {
				const productId = item.querySelector('[data-role="variant-option"]')?.dataset.productId;
				const product = productId ? cart.getCachedProduct(productId) : null;
				if (product) this.#syncVariantOptions(item, product);
			});
		}

		#deduplicateVariantOptions() {
			// Older server-rendered cart fragments can repeat options across color/size combinations.
			this.#cartView?.querySelectorAll('[data-role="variant-option"]').forEach((select) => {
				const field = select.closest('.fox-mini-cart__variant-field') || select.parentElement;
				if (field && !field.querySelector('.fox-mini-cart__variant-label')) {
					const label = document.createElement('span');
					label.className = 'fox-mini-cart__variant-label';
					label.textContent = select.getAttribute('aria-label') || '';
					field.insertBefore(label, select);
				}
				const selectedValue = select.value;
				const seen = new Set();
				Array.from(select.options).forEach((option) => {
					if (seen.has(option.value)) option.remove();
					else seen.add(option.value);
				});
				select.value = selectedValue;
			});
		}

		#itemElement(line) { return this.#list.querySelector(`[data-role="item"][data-line="${line}"]`); }

		#beginMutation() {
			this.#pendingMutations += 1;
			this.#cartView?.closest('[data-role="body"]')?.setAttribute('data-busy', 'true');
			this.#cartView?.closest('[data-role="body"]')?.setAttribute('aria-busy', 'true');
		}

		#endMutation() {
			this.#pendingMutations = Math.max(0, this.#pendingMutations - 1);
			if (this.#pendingMutations) return;
			this.#cartView?.closest('[data-role="body"]')?.removeAttribute('data-busy');
			this.#cartView?.closest('[data-role="body"]')?.setAttribute('aria-busy', 'false');
		}

		#onClick(event) {
			if (event.target.closest('[data-action="close"]')) { event.preventDefault(); this.close(); return; }
			const checkout = event.target.closest('[data-role="checkout"]');
			if (checkout) { event.preventDefault(); window.location.assign('/checkout'); return; }
			const quantityButton = event.target.closest('[data-action="increase"], [data-action="decrease"]');
			if (quantityButton) {
				const item = quantityButton.closest('[data-role="item"]');
				const input = item?.querySelector('[data-role="quantity"]');
				if (!item || !input) return;
				const current = Number.parseInt(input.value, 10) || 1;
				const next = quantityButton.dataset.action === 'increase' ? current + 1 : Math.max(1, current - 1);
				input.value = next;
				this.setQuantity(Number(item.dataset.line), next);
				return;
			}
			const remove = event.target.closest('[data-action="remove"]');
			if (remove) { event.preventDefault(); const item = remove.closest('[data-role="item"]'); if (item) this.removeLine(Number(item.dataset.line)); }
		}

		async #onVariantChange(event) {
			const select = event.target.closest('[data-role="variant-option"]');
			if (!select) return;
			const item = select.closest('[data-role="item"]');
			const product = cart.getCachedProduct(select.dataset.productId) || await cart.getProduct(select.closest('[data-role="item"]')?.dataset.productHandle || '');
			if (!item || !product?.variants) return;
			this.#syncVariantOptions(item, product);
			const options = Array.from(item.querySelectorAll('[data-role="variant-option"]')).map((field) => field.value);
			const variant = product.variants.find((candidate) => this.#variantAvailable(candidate) && this.#variantOptions(candidate).every((value, index) => value === options[index]));
			if (!variant) return;
			item.dataset.state = 'updating';
			this.#beginMutation();
			cartAction.changeVariant(Number(item.dataset.line), variant.id).catch((error) => { this.#toast(error.message || 'Không thể cập nhật sản phẩm'); this.refresh(); }).finally(() => this.#endMutation());
		}

		#onKeydown(event) {
			if (!this.isOpen) return;
			if (event.key === 'Escape') { event.preventDefault(); this.close(); return; }
			if (event.key !== 'Tab') return;
			const elements = Array.from(this.querySelectorAll(focusableSelector)).filter((element) => element.offsetParent !== null);
			if (!elements.length) return;
			const first = elements[0];
			const last = elements[elements.length - 1];
			if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
			if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
		}

		#toast(message) { root.toast?.error?.(message); }
		#emit(name, detail) { this.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail })); }
	}

	if (!customElements.get('mini-cart')) customElements.define('mini-cart', MiniCartComponent);

	// Cart page reuses the same server-rendered item contract without the drawer element.
	document.addEventListener('change', async (event) => {
		const select = event.target.closest?.('[data-role="variant-option"]');
		if (!select || select.closest('mini-cart')) return;
		const item = select.closest('[data-role="item"]');
		const product = item?.dataset.productHandle ? await cart.getProduct(item.dataset.productHandle) : null;
		if (!item || !product) return;
		const values = Array.from(item.querySelectorAll('[data-role="variant-option"]')).map((field) => field.value);
		const options = (variant) => Array.isArray(variant.options) ? variant.options : [variant.option1, variant.option2, variant.option3].filter((value) => value != null);
		const available = (variant) => variant.available !== false && variant.available !== 'false' && !(variant.inventory_management && variant.inventory_policy !== 'continue' && Number(variant.inventory_quantity) <= 0);
		const variant = product.variants.find((candidate) => available(candidate) && options(candidate).every((value, index) => value === values[index]));
		if (!variant) return;
		item.dataset.state = 'updating';
		try {
			await cartAction.changeVariant(Number(item.dataset.line), variant.id);
			window.location.reload();
		} catch (error) {
			item.dataset.state = 'error';
		}
	});
})();
