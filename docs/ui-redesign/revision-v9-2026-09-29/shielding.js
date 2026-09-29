(() => {
  const band = document.createElement('div');
  band.className = 'nav-plaque-shield';
  band.setAttribute('aria-hidden', 'true');
  document.body.append(band);

  let frame = 0;
  const refresh = () => {
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      const nav = document.querySelector('.nav');
      const navTop = nav ? Math.min(nav.getBoundingClientRect().top,
        ...[...nav.querySelectorAll('.nav-medal')].map(el => el.getBoundingClientRect().top)) : innerHeight - 72;
      const bandTop = Math.max(0, Math.min(innerHeight, navTop - 6));
      band.style.top = `${bandTop}px`;
      band.style.height = `${innerHeight - bandTop}px`;
      document.querySelectorAll('.cart-sheet button, .chronicle-sheet button').forEach(button => {
        const rect = button.getBoundingClientRect();
        const occluded = rect.bottom > bandTop && rect.top < innerHeight;
        button.toggleAttribute('inert', occluded);
        button.dataset.navOccluded = occluded ? 'true' : 'false';
      });
    });
  };
  document.addEventListener('scroll', refresh, { capture: true, passive: true });
  addEventListener('resize', refresh, { passive: true });
  const prototype = document.getElementById('prototype');
  new MutationObserver(refresh).observe(prototype, { childList: true, subtree: true });
  const resizeObserver = new ResizeObserver(refresh);
  resizeObserver.observe(document.documentElement);
  addEventListener('load', refresh, { once: true });
  refresh();
})();
