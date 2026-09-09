// M-27 · Service worker. design.md §13.4.
//
// Plain JavaScript on purpose: this file is copied verbatim from `public/`, it
// never goes through the bundler, and it must not import anything. Two
// policies, and §13.4 makes the split normative:
//
//   the document        network first, cache as the fallback
//   everything else     cache first, and stored on the way through
//
// The document has to come from the network when there is one, or a new
// deployment could never reach a device that already installed the old one.
// Everything else carries a content hash in its name, so a cached copy can
// never be the wrong copy.
//
// The cache NAME is the only invalidation this has. Bump it and every older
// cache is dropped on activate.

const CACHE = 'valley-v1';

const SHELL = ['./', './index.html', './manifest.webmanifest'];

/**
 * Everything the document references, read out of the document itself.
 *
 * Without this, a device is only offline-ready on its SECOND visit: the first
 * load fetches these before this worker is active, so nothing intercepts them
 * and nothing caches them. Somebody who installs the game and walks into the
 * underground has made exactly one visit.
 *
 * It is every relative reference and not just the bundle, because measuring it
 * said so: with only the bundle cached, an offline load still died — the one
 * entry missing was the icon, and a subresource the parser cannot fetch takes
 * the load down with it. The names are decided at build time and all live in
 * one place, so this reads them from there rather than needing a generated
 * manifest to keep in step.
 */
/**
 * Stores one shell entry the way the document will later ask for it.
 *
 * `cache.add` fetches in `no-cors` mode, and a module script asks in `cors`
 * mode with credentials omitted (Vite marks its bundle `crossorigin`).
 * Measured: the `no-cors` copy serves a plain `fetch` offline perfectly well
 * and still fails to load as a module, so the entry has to be stored under
 * the request the parser will actually make.
 */
async function store(cache, url) {
  try {
    const request = new Request(url, { mode: 'cors', credentials: 'omit' });
    const response = await fetch(request);
    if (response.ok) await cache.put(request, response);
  } catch {
    // One missing entry costs that entry, never the whole install.
  }
}

async function shellAssets(cache) {
  const response = await cache.match('./index.html');
  if (response === undefined) return [];
  const html = await response.text();
  const urls = new Set();
  for (const match of html.matchAll(/(?:src|href)="(\.\/[^"]+)"/g)) urls.add(match[1]);
  return [...urls];
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE)
      // `addAll` is all-or-nothing; a single 404 would leave no cache at all,
      // so entries are added one by one and a miss only costs that entry.
      .then(async (cache) => {
        await Promise.all(SHELL.map((url) => cache.add(url).catch(() => undefined)));
        const assets = await shellAssets(cache);
        await Promise.all(assets.map((url) => store(cache, url)));
      })
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((names) => Promise.all(names.filter((name) => name !== CACHE).map((name) => caches.delete(name))))
      .then(() => self.clients.claim()),
  );
});

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE);
      await cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    // Offline: the document falls back to whatever shell we hold. `./` is the
    // entry the install step stored, and it is the same document for every
    // query string the debug routes use.
    const cached = (await caches.match(request)) ?? (await caches.match('./index.html')) ?? (await caches.match('./'));
    if (cached !== undefined) return cached;
    throw error;
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached !== undefined) return cached;
  const response = await fetch(request);
  if (response.ok && response.type === 'basic') {
    const cache = await caches.open(CACHE);
    await cache.put(request, response.clone());
  }
  return response;
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  // Nothing but same-origin GET (§13.4). A POST, a range request or another
  // origin is none of this worker's business and passes straight through.
  if (request.method !== 'GET') return;
  if (new URL(request.url).origin !== self.location.origin) return;

  event.respondWith(request.mode === 'navigate' ? networkFirst(request) : cacheFirst(request));
});
