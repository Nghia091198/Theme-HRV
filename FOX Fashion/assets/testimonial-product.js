class FoxTestimonialProduct extends HTMLElement {
  // Hydrates server-rendered product fallbacks without delaying review content.
  // Product media remains separate from title and price.
  connectedCallback() {
    if (this.dataset.hydrated === 'true') return;
    this.dataset.hydrated = 'true';
    this.querySelectorAll('[data-product-handle]').forEach((target) => this.#loadProduct(target));
  }

  async #loadProduct(target) {
    const handle = target.dataset.productHandle;
    if (!handle || typeof window.FOX?.loadProductFragment !== 'function') return;
    try {
      const fragment = await window.FOX.loadProductFragment(handle, 'lookbook-card');
      const card = fragment.querySelector('product-card');
      const title = card?.querySelector('.pro--title a')?.textContent?.trim();
      const price = card?.querySelector('.pro--price')?.textContent?.trim();
      const originalPrice = card?.querySelector('.pro--price-original')?.textContent?.trim();
      const image = card?.querySelector('.proloop--image-front')?.getAttribute('src');
      if (title) { const link = target.querySelector('.fox-testimonial-product__product-link'); link.textContent = title; }
      const priceElement = target.querySelector('[data-product-price]');
      const originalPriceElement = target.querySelector('[data-product-price-original]');
      if (price && priceElement) priceElement.textContent = price;
      if (originalPriceElement) {
        originalPriceElement.textContent = originalPrice || '';
        originalPriceElement.hidden = !originalPrice;
      }
      if (image && !target.querySelector('.fox-testimonial-product__product-image')) {
        const img = document.createElement('img');
        img.className = 'fox-testimonial-product__product-image';
        img.src = image;
        img.alt = '';
        img.width = 52;
        img.height = 52;
        img.loading = 'lazy';
        target.prepend(img);
      }
    } catch (error) { console.warn(`[FOX Testimonial Product] Unable to load product "${handle}".`, error); }
  }
}
if (!customElements.get('fox-testimonial-product')) customElements.define('fox-testimonial-product', FoxTestimonialProduct);
