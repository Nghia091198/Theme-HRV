// Coordinates shared page overlay state while native dialogs keep their own backdrop.
(function () {
  const root = window.FOX = window.FOX || {};
  const ROOT_CLASS = 'fox-overlay-open';
  const LOCK_CLASS = 'fox-overlay-lock';
  const VISIBLE_CLASS = 'fox-overlay-visible';

  function FOXDispatchOverlayEvent(type, owner) {
    document.dispatchEvent(new CustomEvent(type, {
      detail: { owner: owner || null },
    }));
  }

  function FOXSetOverlay(visible, owner, options) {
    const nextOwner = owner || null;
    const config = options || {};

    if (visible) {
      if (root.overlayOwner === nextOwner && document.documentElement.classList.contains(ROOT_CLASS)) {
        return true;
      }

      root.overlayOwner = nextOwner;
      const lock = config.lock !== false;
      // html has scrollbar-gutter: stable; the lock drops that empty strip and gives its width back as padding
      // (core-foundation-overlay.css). Measured before the first lock, while the gutter still exists.
      if (lock && !document.documentElement.classList.contains(LOCK_CLASS)) {
        const gutter = Math.max(0, window.innerWidth - document.documentElement.getBoundingClientRect().width);
        document.documentElement.style.setProperty('--fox-overlay-gutter', `${gutter}px`);
      }
      document.documentElement.classList.add(ROOT_CLASS);
      document.body.classList.add(ROOT_CLASS);
      document.documentElement.classList.toggle(LOCK_CLASS, lock);
      document.body.classList.toggle(LOCK_CLASS, lock);
      if (!lock) document.documentElement.style.removeProperty('--fox-overlay-gutter');
      document.documentElement.classList.toggle(VISIBLE_CLASS, config.visual === true);
      document.body.classList.toggle(VISIBLE_CLASS, config.visual === true);
      FOXDispatchOverlayEvent('overlay:show', nextOwner);
      return true;
    }

    if (nextOwner && root.overlayOwner && root.overlayOwner !== nextOwner) return false;
    if (!document.documentElement.classList.contains(ROOT_CLASS) && !document.body.classList.contains(ROOT_CLASS)) {
      root.overlayOwner = null;
      return true;
    }

    const previousOwner = root.overlayOwner || nextOwner;
    root.overlayOwner = null;
    document.documentElement.classList.remove(ROOT_CLASS);
    document.body.classList.remove(ROOT_CLASS);
    document.documentElement.classList.remove(LOCK_CLASS, VISIBLE_CLASS);
    document.body.classList.remove(LOCK_CLASS, VISIBLE_CLASS);
    document.documentElement.style.removeProperty('--fox-overlay-gutter');
    FOXDispatchOverlayEvent('overlay:hide', previousOwner);
    return true;
  }

  root.isOverlay = FOXSetOverlay;
  window.FOXSetOverlay = FOXSetOverlay;
  window.is_overplay = FOXSetOverlay;
}());
