// M-27 · Registering the service worker. design.md §13.4.

/**
 * Registers `sw.js` from the document's own directory, so the worker's scope
 * is whatever path the build was deployed under (§13.4's relative base) and
 * nobody has to write `/project/` anywhere.
 *
 * Never in development: a worker caching a dev server's responses turns every
 * subsequent edit into a puzzle. The offline promise is a property of what
 * ships, and `tests/pwa` checks it against the real build for that reason.
 *
 * A failure here is not a reason to lose the valley: without a worker the game
 * still runs, it just needs the network to open.
 */
export function registerServiceWorker(): void {
  if (!import.meta.env.PROD) return;
  if (!('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    void navigator.serviceWorker
      .register(new URL('sw.js', document.baseURI), { scope: './' })
      .catch(() => undefined);
  });
}
