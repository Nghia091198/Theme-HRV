(() => {
  const BUNDLE = '[data-bundle-variants]';
  const MESSAGES = {
    failed: 'Không thể thêm bộ sản phẩm vào giỏ hàng',
  };

  document.addEventListener('click', async (event) => {
    const button = event.target.closest(BUNDLE);
    if (!button || button.disabled || !window.FOX?.cart) return;

    const items = button.dataset.bundleVariants
      .split(',')
      .map((id) => id.trim())
      .filter(Boolean)
      .map((variantId) => ({ variantId, quantity: 1 }));
    if (!items.length) return;

    const progress = window.FOX.cart.progress;
    button.disabled = true;
    progress?.start();
    try {
      const result = await window.FOX.cart.addMany(items);
      if (!result?.added) window.FOX.toast?.error(MESSAGES.failed);
    } catch (error) {
      window.FOX.toast?.error(error?.message || MESSAGES.failed);
    } finally {
      progress?.done();
      button.disabled = false;
    }
  });
})();
