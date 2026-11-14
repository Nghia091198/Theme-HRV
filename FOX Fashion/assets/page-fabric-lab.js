(() => {
  const BUNDLE = '[data-bundle-variants]';
  const MESSAGES = {
    added: 'Đã thêm cả bộ vào giỏ hàng',
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

    button.disabled = true;
    try {
      const result = await window.FOX.cart.addMany(items);
      if (result?.added) window.FOX.toast?.success(MESSAGES.added);
      else window.FOX.toast?.error(MESSAGES.failed);
    } catch (error) {
      window.FOX.toast?.error(error?.message || MESSAGES.failed);
    } finally {
      button.disabled = false;
    }
  });
})();
