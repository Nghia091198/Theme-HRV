(() => {
	const root = window.FOX = window.FOX || {};
	const config = root.config || {};
	const cartConfig = config.cart || {};
	const routes = config.routes || {};
	const images = config.images || {};
	const text = Object.freeze({
		cartLoadFailed: 'Không thể tải giỏ hàng. Vui lòng thử lại.',
		cartQuantityFailed: 'Không thể cập nhật số lượng',
		cartRemoveFailed: 'Không thể xóa sản phẩm',
		cartVariantFailed: 'Không thể cập nhật sản phẩm',
		cartConnectionFailed: 'Không thể kết nối. Vui lòng thử lại.',
		cartGenericFailed: 'Không thể thực hiện thao tác. Vui lòng thử lại.',
		cartVariantRequired: 'Vui lòng chọn phân loại sản phẩm',
		cartAddFailed: 'Không thể thêm sản phẩm vào giỏ hàng',
		cartPromotionFailed: 'Không thể áp dụng khuyến mãi',
		...(cartConfig.text || {}),
	});

	const errorText = (code) => text[{
		cart_load_failed: 'cartLoadFailed', cart_quantity_failed: 'cartQuantityFailed',
		cart_remove_failed: 'cartRemoveFailed', cart_variant_failed: 'cartVariantFailed',
		cart_connection_failed: 'cartConnectionFailed', cart_variant_required: 'cartVariantRequired',
		cart_add_failed: 'cartAddFailed', cart_promotion_failed: 'cartPromotionFailed',
		cart_unknown_error: 'cartGenericFailed',
	}[code] || 'cartGenericFailed'] || text.cartGenericFailed;

	function FOXCreateCartError(options = {}) {
		return new CartError({ ...options, message: options.message || errorText(options.code || 'cart_unknown_error') });
	}

	class CartError extends Error {
		constructor({ name = 'CartError', code = 'cart_unknown_error', message, status = 0, action = null, cause = null } = {}) {
			super(message);
			this.name = name; this.code = code; this.status = status; this.action = action; this.cause = cause;
			this.description = message;
		}
	}

	class CartStore {
		#state = {};
		#productsByHandle = new Map();
		#productsById = new Map();
		#subscribers = new Set();

		get state() { return this.#state; }
		get itemCount() { return Number(this.#state?.item_count) || 0; }
		get noImage() { return images.noImage || ''; }
		get text() { return text; }

		subscribe(callback) {
			if (typeof callback !== 'function') return () => {};
			this.#subscribers.add(callback);
			return () => this.#subscribers.delete(callback);
		}

		async fetchCart() {
			const cart = await this.#request('GET', this.#route('cart'));
			return this.#publish(cart, 'fetch');
		}

		async fetchCartView() {
			return this.#requestText('GET', this.#route('cartView'));
		}

		async addItem(variantId, quantity = 1, properties = null) {
			const data = { id: variantId, quantity: this.#normalizeQuantity(quantity) };
			if (properties && typeof properties === 'object') {
				Object.entries(properties).forEach(([key, value]) => { data[`properties[${key}]`] = value; });
			}
			return this.#mutate('add', async () => {
				await this.#request('POST', this.#route('cartAdd'), data);
				return this.#request('GET', this.#route('cart'));
			});
		}

		async changeItem(line, quantity) {
			return this.#mutate('change', () => this.#request('POST', this.#route('cartChange'), {
				line: Number(line),
				quantity: Math.max(0, Number.parseInt(quantity, 10) || 0),
			}));
		}

		async changeVariant(line, variantId) {
			return this.#mutate('variant', () => this.#request('POST', this.#route('cartChange'), {
				line: Number(line),
				id: variantId,
			}));
		}

		async updateCart(updates) {
			const body = new URLSearchParams();
			(Array.isArray(updates) ? updates : []).forEach((quantity) => {
				body.append('updates[]', String(Math.max(0, Number(quantity) || 0)));
			});
			return this.#mutate('update', () => this.#request('POST', this.#route('cartUpdate'), null, body.toString()));
		}

		async clearCart() {
			return this.#mutate('clear', () => this.#request('POST', this.#route('cartClear')));
		}

		async getProduct(handle) {
			const normalizedHandle = String(handle || '').trim();
			if (!normalizedHandle) return null;
			if (this.#productsByHandle.has(normalizedHandle)) return this.#productsByHandle.get(normalizedHandle);
			const request = this.#request('GET', `/products/${encodeURIComponent(normalizedHandle)}.js`)
				.then((product) => {
					if (product?.id) {
						this.#productsById.set(String(product.id), product);
					}
					return product;
				})
				.catch((error) => {
					this.#productsByHandle.delete(normalizedHandle);
					throw error;
				});
			this.#productsByHandle.set(normalizedHandle, request);
			return request;
		}

		async getProducts(handles) {
			const uniqueHandles = Array.from(new Set((handles || []).filter(Boolean)));
			return Promise.all(uniqueHandles.map((handle) => this.getProduct(handle)));
		}

		getCachedProduct(productId) {
			return this.#productsById.get(String(productId)) || null;
		}

		async #mutate(action, request) {
			this.#emit('cart:updating', { action, cart: this.#state, itemCount: this.itemCount });
			try {
				return this.#publish(await request(), action);
			} catch (error) {
				const cartError = this.#normalizeError(error);
				this.#emit('cart:error', { action, error: this.#publicError(cartError) });
				throw cartError;
			}
		}

		#route(key) {
			if (routes[key]) return routes[key];
			throw FOXCreateCartError({ name: 'CartConfigError', code: 'cart_unknown_error', message: `Thiếu cấu hình cart route: ${key}`, action: key });
		}

		#normalizeQuantity(quantity) {
			const parsed = Number.parseInt(quantity, 10);
			return Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
		}

		async #request(method, url, formData = null, rawBody = null) {
			const options = { method, credentials: 'same-origin', headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' } };
			if (rawBody !== null) {
				options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
				options.body = rawBody;
			} else if (formData) {
				options.headers['Content-Type'] = 'application/x-www-form-urlencoded';
				options.body = new URLSearchParams(formData).toString();
			}

			let response;
			try {
				response = await fetch(url, options);
			} catch (error) {
				throw FOXCreateCartError({ name: 'CartConnectionError', code: 'cart_connection_failed', cause: error });
			}
			if (!response.ok) throw FOXCreateCartError({ name: 'CartError', code: 'cart_unknown_error', message: await this.#parseError(response), status: response.status });
			return response.json();
		}

		async #requestText(method, url) {
			let response;
			try {
				response = await fetch(url, {
					method,
					credentials: 'same-origin',
					headers: { Accept: 'text/html', 'X-Requested-With': 'XMLHttpRequest' },
				});
			} catch (error) {
				throw FOXCreateCartError({ name: 'CartConnectionError', code: 'cart_connection_failed', cause: error });
			}
			if (!response.ok) throw FOXCreateCartError({ name: 'CartLoadError', code: 'cart_load_failed', status: response.status });
			return response.text();
		}

		async #parseError(response) {
			try {
				const payload = await response.json();
				return payload?.description || payload?.message || text.cartGenericFailed;
			} catch (error) {
			return text.cartGenericFailed;
			}
		}

		#normalizeError(error) {
			if (error instanceof CartError) return error;
			return FOXCreateCartError({ message: error?.description || error?.message, status: error?.status || 0, cause: error });
		}

		#publish(cart, action) {
			this.#state = cart || {};
			const detail = { action, cart: this.#state, itemCount: this.itemCount };
			this.#emit('cart:updated', detail);
			this.#subscribers.forEach((callback) => callback(this.#state, detail));
			return this.#state;
		}

		#publicError(error) {
			return { name: error.name, code: error.code, message: error.message, status: error.status, action: error.action };
		}

		#emit(name, detail) {
			document.dispatchEvent(new CustomEvent(name, { bubbles: true, composed: true, detail }));
		}
	}

	root.cart = new CartStore();
	root.CartError = CartError;
	root.createCartError = FOXCreateCartError;
})();
