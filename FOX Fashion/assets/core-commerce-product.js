(function () {

  const DEFAULT_VARIANT_TITLE = 'Default Title';
  const root = window.FOX = window.FOX || {};
  const fragmentCache = new Map();

  function FOXNormalizeProductHandle(value) {
    if (!value) return '';
    try {
      const url = new URL(value, window.location.origin);
      const parts = url.pathname.split('/').filter(Boolean);
      const productIndex = parts.indexOf('products');
      const handle = productIndex >= 0 ? parts[productIndex + 1] : parts[0];
      return handle && /^[a-zA-Z0-9_-]+$/.test(handle) ? handle : '';
    } catch (error) {
      return '';
    }
  }

  function FOXLoadProductFragment(value, view = 'lookbook-card') {
    const handle = FOXNormalizeProductHandle(value);
    if (!handle) return Promise.reject(new Error('invalid-product-handle'));
    const cacheKey = `${view}:${handle}`;
    if (!fragmentCache.has(cacheKey)) {
      const request = fetch(`/products/${encodeURIComponent(handle)}?view=${encodeURIComponent(view)}`, {
        headers: { 'X-Requested-With': 'XMLHttpRequest' },
      }).then(async (response) => {
        if (!response.ok) throw new Error(`http-${response.status}`);
        const html = (await response.text()).trim();
        if (!html) throw new Error('empty-response');
        return new DOMParser().parseFromString(html, 'text/html');
      }).catch((error) => {
        fragmentCache.delete(cacheKey);
        throw error;
      });
      fragmentCache.set(cacheKey, request);
    }
    return fragmentCache.get(cacheKey);
  }

  root.normalizeProductHandle = FOXNormalizeProductHandle;
  root.loadProductFragment = FOXLoadProductFragment;


  function FOXProductBoolean(value, fallback) {
    if (value === 'inherit' || value === undefined || value === null || value === '') return Boolean(fallback);
    return value === true || value === 'true';
  }

  function FOXProductOptions(variant) {
    if (Array.isArray(variant?.options)) return variant.options;
    return [variant?.option1, variant?.option2, variant?.option3].filter((value) => value != null);
  }

  function FOXProductAvailable(variant) {
    const managesInventory = Boolean(variant?.inventory_management);
    const deniesOverselling = !variant?.inventory_policy || variant.inventory_policy === 'deny';
    const inventory = Number(variant?.inventory_quantity);
    if (managesInventory && deniesOverselling && Number.isFinite(inventory) && inventory <= 0) return false;
    return variant?.available === true || variant?.available === 'true' || variant?.available === 1;
  }

  function FOXProductNormalizeMedia(value) {
    return String(value || '')
      .replace(/^https?:/i, '')
      .split('?')[0]
      .replace(/_(pico|icon|thumb|small|compact|medium|large|grande|master)(?=\.[a-z]+$)/i, '')
      .toLowerCase();
  }

  class ProductComponent extends HTMLElement {
    #abortController = null;
    #data = null;
    #initialized = false;
    #selectedVariant = null;
    #selectedValues = [];

    connectedCallback() {
      if (this.#initialized) return;

      try {
        this.#data = JSON.parse(this.querySelector('[data-role="product-data"]')?.textContent || '{}');
      } catch (error) {
        this.dataset.state = 'error';
        console.warn('[ProductComponent] Invalid product JSON.', error);
        return;
      }

      if (!Array.isArray(this.#data?.variants) || !this.#data.variants.length) {
        this.dataset.state = 'error';
        console.warn('[ProductComponent] Product variants are missing.');
        return;
      }

      this.#abortController = new AbortController();
      const { signal } = this.#abortController;
      this.addEventListener('change', (event) => this.#handleChange(event), { signal });
      this.addEventListener('click', (event) => this.#handleClick(event), { signal });
      this.addEventListener('slider:change', (event) => {
        if (event.target?.dataset.role === 'gallery-main') this.#selectMedia(event.detail.index, false);
      }, { signal });
      this.querySelector('[data-role="quantity"]')?.addEventListener('input', (event) => {
        const quantity = Math.max(1, parseInt(event.target.value, 10) || 1);
        event.target.value = String(quantity);
        this.querySelectorAll('add-to-cart').forEach((element) => {
          element.dataset.quantity = String(quantity);
        });
        this.#syncQuantity(quantity);
      }, { signal });

      const initialVariant = this.#initialVariant();
      this.#selectedValues = FOXProductOptions(initialVariant);
      this.#initialized = true;
      this.#applyVariant(initialVariant, 'initial');
      this.#syncQuantity(Math.max(1, parseInt(this.querySelector('[data-role="quantity"]')?.value, 10) || 1));
      this.#emit('product:ready', { product: this.#data, variant: initialVariant });
    }

    disconnectedCallback() {
      this.destroy();
    }

    get productData() {
      return this.#data;
    }

    get selectedVariant() {
      return this.#selectedVariant;
    }

    selectVariant(id, source = 'api') {
      const variant = this.#data?.variants?.find((item) => String(item.id) === String(id));
      if (!variant) return false;
      this.#selectedValues = FOXProductOptions(variant);
      this.#applyVariant(variant, source);
      return true;
    }

    selectOptions(values, source = 'api') {
      if (!Array.isArray(values)) return false;
      this.#selectedValues = values.slice();
      const variant = this.#findVariant(values);
      this.#applyVariant(variant, source);
      return Boolean(variant);
    }

    destroy() {
      this.#abortController?.abort();
      this.#abortController = null;
      this.#data = null;
      this.#selectedVariant = null;
      this.#selectedValues = [];
      this.#initialized = false;
      this.dataset.state = 'idle';
    }

    #initialVariant() {
      const urlVariant = this.dataset.context === 'page'
        ? new URLSearchParams(window.location.search).get('variant')
        : null;
      const fromUrl = urlVariant && this.#data.variants.find((variant) => String(variant.id) === urlVariant);
      if (fromUrl) return fromUrl;

      const selectFirst = FOXProductBoolean(window.ProductConfig?.selectFirstVariant, true);
      if (!selectFirst) return this.#data.variants[0];
      return this.#data.variants.find((variant) => FOXProductAvailable(variant)) || this.#data.variants[0];
    }

    #handleChange(event) {
      const select = event.target.closest('[data-role="option"]');
      if (!select || !this.contains(select)) return;
      const optionIndex = parseInt(select.closest('[data-option-index]')?.dataset.optionIndex, 10);
      if (!Number.isInteger(optionIndex)) return;
      this.#selectOptionValue(optionIndex, select.value, 'option');
    }

    #handleClick(event) {
      const thumbnail = event.target.closest('[data-action="gallery-thumbnail"]');
      if (thumbnail && this.contains(thumbnail)) {
        event.preventDefault();
        this.#selectMedia(parseInt(thumbnail.dataset.mediaIndex, 10), true);
        return;
      }

      const quantityAction = event.target.closest('[data-action="quantity-minus"], [data-action="quantity-plus"]');
      if (quantityAction && this.contains(quantityAction)) {
        event.preventDefault();
        const input = this.querySelector('[data-role="quantity"]');
        if (!input) return;
        const current = Math.max(1, parseInt(input.value, 10) || 1);
        input.value = String(quantityAction.dataset.action === 'quantity-plus' ? current + 1 : Math.max(1, current - 1));
        input.dispatchEvent(new Event('input', { bubbles: true }));
        return;
      }

      const swatch = event.target.closest('[data-option-value]');
      if (!swatch || !this.contains(swatch)) return;
      const optionIndex = parseInt(swatch.closest('[data-option-index]')?.dataset.optionIndex, 10);
      if (!Number.isInteger(optionIndex)) return;
      event.preventDefault();
      this.#selectOptionValue(optionIndex, swatch.dataset.optionValue, 'swatch');
    }

    #selectOptionValue(optionIndex, optionValue, source) {
      const candidateValues = this.#selectedValues.slice();
      candidateValues[optionIndex] = optionValue;
      const exactVariant = this.#findVariant(candidateValues);
      if (FOXProductAvailable(exactVariant)) {
        this.#selectedValues = candidateValues;
        this.#applyVariant(exactVariant, source);
        return;
      }

      const fallbackVariant = this.#data.variants.find((variant) => {
        if (!FOXProductAvailable(variant)) return false;
        const options = FOXProductOptions(variant);
        if (options[optionIndex] !== optionValue) return false;
        return options.slice(0, optionIndex).every((value, index) => value === candidateValues[index]);
      });
      if (fallbackVariant) {
        this.#selectedValues = FOXProductOptions(fallbackVariant);
        this.#applyVariant(fallbackVariant, source);
        return;
      }

      this.#selectedValues = candidateValues;
      this.#applyVariant(exactVariant, source);
    }

    #syncQuantity(quantity) {
      const minus = this.querySelector('[data-action="quantity-minus"]');
      if (minus) minus.disabled = quantity <= 1;
    }

    #findVariant(values) {
      return this.#data.variants.find((variant) => {
        const options = FOXProductOptions(variant);
        return options.length === values.length && options.every((value, index) => value === values[index]);
      }) || null;
    }

    #applyVariant(variant, source) {
      const previousVariant = this.#selectedVariant;
      this.#selectedVariant = variant || null;
      this.dataset.variantId = variant?.id ? String(variant.id) : '';
      const available = FOXProductAvailable(variant);
      this.dataset.available = available ? 'true' : 'false';
      this.dataset.state = variant ? (available ? 'ready' : 'unavailable') : 'unavailable';

      this.#syncPicker(variant);
      this.#syncPrice(variant);
      this.#syncStatus(variant);
      this.#syncActions(variant);
      this.#syncGallery(variant);
      this.#syncUrl(variant);

      if (!variant) {
        this.#emit('product:variant-unavailable', {
          product: this.#data,
          variant: null,
          previousVariant,
          source,
        });
        return;
      }

      this.#emit('product:variant-change', {
        product: this.#data,
        variant,
        previousVariant,
        source,
        updateUrl: this.#shouldUpdateUrl(),
      });
    }

    #syncPicker(variant) {
      const values = variant ? FOXProductOptions(variant) : this.#selectedValues;
      this.querySelectorAll('[data-option-index]').forEach((group) => {
        const index = parseInt(group.dataset.optionIndex, 10);
        const selectedValue = values[index];
        const selectedName = group.querySelector('[data-role="option-name"]');
        if (selectedName) selectedName.textContent = selectedValue || '';
        const select = group.querySelector('[data-role="option"]');
        if (select) {
          if (selectedValue != null) select.value = selectedValue;
          [...select.options].forEach((option) => {
            option.disabled = !this.#optionHasAvailableVariant(index, option.value, values);
          });
        }

        group.querySelectorAll('[data-option-value]').forEach((button) => {
          const active = button.dataset.optionValue === selectedValue;
          button.classList.toggle('is-active', active);
          button.setAttribute('aria-checked', active ? 'true' : 'false');
          button.disabled = !this.#optionHasAvailableVariant(index, button.dataset.optionValue, values);
        });
      });
    }

    #optionHasAvailableVariant(optionIndex, optionValue, selectedValues) {
      return this.#data.variants.some((variant) => {
        if (!FOXProductAvailable(variant)) return false;
        const options = FOXProductOptions(variant);
        if (options[optionIndex] !== optionValue) return false;
        return options.slice(0, optionIndex).every((value, index) => value === selectedValues[index]);
      });
    }

    #syncPrice(variant) {
      const priceWrap = this.querySelector('[data-role="price-wrap"]');
      const price = this.querySelector('[data-role="price"]');
      const comparePrice = this.querySelector('[data-role="compare-price"]');
      const salePercent = this.querySelector('[data-role="sale-percent"]');
      if (!priceWrap || !price || !comparePrice || !salePercent) return;

      if (!variant) {
        priceWrap.hidden = true;
        return;
      }

      priceWrap.hidden = Number(variant.price) === 0;
      // Optional Liquid prices preserve the storefront money format across variant changes.
      const formattedPrice = this.querySelector('[data-role="formatted-prices"]')
        ?.querySelector(`[data-price-variant="${variant.id}"]`);
      price.textContent = formattedPrice?.dataset.price ?? this.#money(variant.price);
      const onSale = Number(variant.compare_at_price) > Number(variant.price) && Number(variant.compare_at_price) > 0;
      comparePrice.hidden = !onSale;
      comparePrice.textContent = onSale
        ? (formattedPrice?.dataset.comparePrice ?? this.#money(variant.compare_at_price))
        : '';
      salePercent.textContent = onSale
        ? `-${Math.round(((variant.compare_at_price - variant.price) / variant.compare_at_price) * 100)}%`
        : '';
    }

    #syncStatus(variant) {
      const availability = this.querySelector('[data-role="availability"]');
      const sku = this.querySelector('[data-role="sku"]');
      if (availability) {
        availability.textContent = !variant
          ? 'Không có phân loại phù hợp'
          : (FOXProductAvailable(variant) ? 'Còn hàng' : (window.ProductConfig?.soldOutLabel || 'Hết hàng'));
      }
      if (sku) {
        sku.textContent = variant?.sku ? `SKU: ${variant.sku}` : '';
        sku.hidden = !variant?.sku;
      }
    }

    #syncActions(variant) {
      const contactMode = FOXProductBoolean(this.dataset.contactMode, window.ProductConfig?.isContact);
      const useContact = contactMode || Number(variant?.price) === 0;
      const purchase = this.querySelector('[data-role="purchase"]');
      const contact = this.querySelector('[data-role="contact"]');
      if (purchase) purchase.hidden = useContact;
      if (contact) contact.hidden = !useContact;

      this.querySelectorAll('add-to-cart').forEach((element) => {
        if (variant?.id) element.dataset.variantId = String(variant.id);
        const available = FOXProductAvailable(variant);
        const disabled = useContact || !variant || !available;
        if (disabled) element.dataset.disabled = 'true';
        else element.removeAttribute('data-disabled');
        const trigger = element.querySelector('[data-role="trigger"]');
        if (trigger) {
          trigger.disabled = disabled;
          if (element.dataset.mode === 'cart') {
            const label = trigger.querySelector('.btn__label');
            const text = !variant ? 'Chọn phân loại' : (available ? 'Thêm vào giỏ' : 'Hết hàng');
            if (label) label.textContent = text;
            else trigger.textContent = text;
          }
        }
      });
    }

    #syncGallery(variant) {
      if (!variant) return;
      const media = [...this.querySelectorAll('[data-role="media"]')];
      if (!media.length) return;

      const featured = typeof variant.featured_image === 'string'
        ? variant.featured_image
        : (variant.featured_image?.src || variant.featured_image?.url);
      let target = featured
        ? media.find((item) => FOXProductNormalizeMedia(item.dataset.mediaSrc) === FOXProductNormalizeMedia(featured))
        : null;

      const matchAlt = FOXProductBoolean(this.dataset.changeImageWithAlt, window.ProductConfig?.changeSrcImageWithAlt);
      if (!target && matchAlt) {
        const terms = FOXProductOptions(variant)
          .filter((value) => value && value !== DEFAULT_VARIANT_TITLE)
          .map((value) => String(value).toLowerCase());
        target = media.find((item) => terms.some((term) => String(item.dataset.mediaAlt || '').toLowerCase().includes(term)));
      }
      if (!target) return;

      const index = parseInt(target.dataset.mediaIndex, 10) || 0;
      this.#selectMedia(index, true);
    }

    #selectMedia(index, moveMainSlider) {
      if (!Number.isInteger(index) || index < 0) return;
      const media = [...this.querySelectorAll('[data-role="media"]')];
      if (!media[index]) return;

      media.forEach((item, mediaIndex) => item.classList.toggle('is-active', mediaIndex === index));
      media.forEach((item, mediaIndex) => {
        const mediaProgress = item.querySelector('media-progress');
        if (!mediaProgress) return;
        if (mediaIndex === index) mediaProgress.play();
        else mediaProgress.pause();
      });
      this.querySelectorAll('[data-action="gallery-thumbnail"]').forEach((thumbnail) => {
        const active = Number(thumbnail.dataset.mediaIndex) === index;
        thumbnail.classList.toggle('is-active', active);
        thumbnail.setAttribute('aria-current', active ? 'true' : 'false');
      });

      const mainSlider = this.querySelector('[data-role="gallery-main"]');
      const thumbnailSlider = this.querySelector('[data-role="gallery-thumbnails"]');
      if (moveMainSlider && typeof mainSlider?.goTo === 'function') mainSlider.goTo(index);
      if (typeof thumbnailSlider?.goTo === 'function') thumbnailSlider.goTo(index);
      this.dataset.activeMediaIndex = String(index);
    }

    #syncUrl(variant) {
      if (!variant || !this.#shouldUpdateUrl() || !window.history?.replaceState) return;
      const url = new URL(window.location.href);
      url.searchParams.set('variant', variant.id);
      window.history.replaceState({}, '', url);
    }

    #shouldUpdateUrl() {
      if (this.dataset.context !== 'page') return false;
      return FOXProductBoolean(this.dataset.updateUrl, window.ProductConfig?.pushVariantOnHandle);
    }

    #money(value) {
      if (window.Haravan?.formatMoney) return window.Haravan.formatMoney(value);
      return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(Number(value || 0) / 100);
    }

    #emit(type, detail) {
      this.dispatchEvent(new CustomEvent(type, { bubbles: true, composed: true, detail }));
    }
  }

  if (!customElements.get('product-component')) {
    customElements.define('product-component', ProductComponent);
  }
}());
