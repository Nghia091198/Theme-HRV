class ProductCardComponent extends HTMLElement {
	#abortController = null;
	#image = null;
	#defaultSrc = null;
	#defaultSrcset = null;
	#defaultSizes = null;
	#defaultSwatch = null;
	#selectedSwatch = null;
	#hoverTimer = null;
	#initialized = false;
	#resizeObserver = null;

	connectedCallback() {
		if (this.#initialized) return;

		this.#image = this.querySelector('.proloop--image-front');
		if (!this.#image) return;

		this.#defaultSrc = this.#image.getAttribute('src');
		this.#defaultSrcset = this.#image.getAttribute('srcset');
		this.#defaultSizes = this.#image.getAttribute('sizes');
		const swatches = [...this.querySelectorAll('.fox-swatch__item:not(.fox-swatch__more)')];
		this.#defaultSwatch = swatches[0] || null;
		this.#selectedSwatch = this.#defaultSwatch;
		this.#abortController = new AbortController();
		const signal = this.#abortController.signal;
		swatches.forEach((swatch) => {
			const name = swatch.querySelector('.fox-swatch__name')?.textContent?.trim();
			swatch.tabIndex = 0;
			swatch.setAttribute('role', 'button');
			if (name) swatch.setAttribute('aria-label', name);
		});
		this.querySelectorAll('.fox-swatch').forEach((list) => {
			list.addEventListener('pointerleave', () => this.#onSwatchListLeave(), { signal });
		});
		this.#setActiveSwatch(this.#defaultSwatch);
		this.#resizeObserver = new ResizeObserver(() => {
			this.#moveSwatchIndicator(this.#selectedSwatch);
		});
		this.querySelectorAll('.fox-swatch').forEach((list) => this.#resizeObserver.observe(list));

		this.addEventListener('pointerover', (e) => this.#onSwatchHover(e), { signal });
		this.addEventListener('click', (e) => this.#onSwatchClick(e), { signal });
		this.addEventListener('focusin', (e) => this.#onSwatchFocus(e), { signal });
		this.addEventListener('focusout', (e) => this.#onSwatchBlur(e), { signal });
		this.addEventListener('keydown', (e) => this.#onSwatchKeydown(e), { signal });

		this.#initialized = true;
	}

	disconnectedCallback() {
		clearTimeout(this.#hoverTimer);
		this.#hoverTimer = null;
		this.#abortController?.abort();
		this.#abortController = null;
		this.#resizeObserver?.disconnect();
		this.#resizeObserver = null;
		this.#defaultSwatch = null;
		this.#selectedSwatch = null;
		this.#defaultSrc = null;
		this.#defaultSrcset = null;
		this.#defaultSizes = null;
		this.#initialized = false;
	}

	#onSwatchHover(e) {
		const swatch = e.target.closest('.fox-swatch__item:not(.fox-swatch__more)');
		if (!swatch || !this.contains(swatch)) return;
		clearTimeout(this.#hoverTimer);
		this.#hoverTimer = setTimeout(() => {
			this.#selectSwatch(swatch);
		}, 70);
	}

	#onSwatchListLeave() {
		clearTimeout(this.#hoverTimer);
		this.#hoverTimer = null;
		this.#restoreSelectedSwatch();
	}

	#onSwatchClick(e) {
		const swatch = e.target.closest('.fox-swatch__item:not(.fox-swatch__more)');
		if (!swatch || !this.contains(swatch)) return;
		e.preventDefault();
		clearTimeout(this.#hoverTimer);
		this.#hoverTimer = null;
		this.#selectSwatch(swatch);
	}

	#onSwatchFocus(e) {
		const swatch = e.target.closest('.fox-swatch__item:not(.fox-swatch__more)');
		if (!swatch || !this.contains(swatch)) return;
		this.#swapImage(swatch.dataset.src);
	}

	#onSwatchBlur(e) {
		if (e.relatedTarget instanceof Element) {
			const relatedSwatch = e.relatedTarget.closest('.fox-swatch');
			if (relatedSwatch && this.contains(relatedSwatch)) return;
		}
		this.#restoreSelectedSwatch();
	}

	#onSwatchKeydown(e) {
		const swatch = e.target.closest('.fox-swatch__item:not(.fox-swatch__more)');
		if (!swatch || !this.contains(swatch)) return;
		if (e.key !== 'Enter' && e.key !== ' ') return;
		e.preventDefault();
		swatch.click();
	}

	#restoreSelectedSwatch() {
		const swatch = this.#selectedSwatch || this.#defaultSwatch;
		this.#setActiveSwatch(swatch);
		this.#swapImage(swatch?.dataset.src || this.#defaultSrc);
	}

	#selectSwatch(swatch) {
		if (!swatch) return;
		this.#selectedSwatch = swatch;
		this.#setActiveSwatch(swatch);
		this.#swapImage(swatch.dataset.src);
	}

	#setActiveSwatch(activeSwatch) {
		this.querySelectorAll('.fox-swatch__item.is-active').forEach((swatch) => {
			swatch.classList.remove('is-active');
			swatch.removeAttribute('aria-pressed');
		});
		if (!activeSwatch) return;
		activeSwatch.classList.add('is-active');
		activeSwatch.setAttribute('aria-pressed', 'true');
		this.#moveSwatchIndicator(activeSwatch);
	}

	#moveSwatchIndicator(swatch) {
		if (!swatch) return;
		const list = swatch.closest('.fox-swatch');
		if (!list) return;
		list.style.setProperty('--fox-swatch-active-x', `${swatch.offsetLeft}px`);
		list.style.setProperty('--fox-swatch-active-y', `${swatch.offsetTop}px`);
		list.dataset.activeReady = 'true';
	}

	#swapImage(src) {
		if (!src || !this.#image) return;
		if (src === this.#defaultSrc) {
			if (this.#defaultSrcset) this.#image.setAttribute('srcset', this.#defaultSrcset);
			else this.#image.removeAttribute('srcset');
			if (this.#defaultSizes) this.#image.setAttribute('sizes', this.#defaultSizes);
			else this.#image.removeAttribute('sizes');
		} else {
			this.#image.removeAttribute('srcset');
			this.#image.removeAttribute('sizes');
		}
		this.#image.src = src;
		this.dataset.variantImage = 'true';
	}
}

if (!customElements.get('product-card')) {
	customElements.define('product-card', ProductCardComponent);
}
