/**
 * M-27 · Installable and offline — design.md §13.4.
 *
 * Runs against `dist/` through `vite preview`, because the service worker is
 * the thing being tested and it does not exist in the dev server.
 */
import { test, type Page } from '@playwright/test';

/** Wait until a worker controls the page: until then nothing is intercepted. */
async function controlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
}

test('el manifest declara una aplicación instalable', async ({ page, request }) => {
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();

  const response = await request.get('/manifest.webmanifest');
  test.expect(response.ok()).toBe(true);
  const manifest = await response.json() as {
    name: string; display: string; orientation: string; start_url: string;
    icons: { sizes: string; purpose?: string }[];
  };

  test.expect(manifest.name).toBe('The Valley');
  test.expect(manifest.display).toBe('standalone');
  test.expect(manifest.orientation).toBe('portrait');
  // Relativo, no absoluto: el mismo build sirve desde la raíz y desde el
  // subdirectorio de Pages (§13.4).
  test.expect(manifest.start_url.startsWith('/')).toBe(false);
  const sizes = manifest.icons.map((icon) => icon.sizes);
  test.expect(sizes).toContain('192x192');
  test.expect(sizes).toContain('512x512');
  test.expect(manifest.icons.some((icon) => icon.purpose === 'maskable')).toBe(true);

  // Los tres iconos existen de verdad; un manifest que promete y no entrega
  // no instala nada.
  for (const name of ['icon-192.png', 'icon-512.png', 'icon-maskable-512.png']) {
    const icon = await request.get(`/${name}`);
    test.expect(icon.ok(), name).toBe(true);
    test.expect((await icon.body()).byteLength, name).toBeGreaterThan(0);
  }
});

/**
 * Deja la aplicación en el estado en que §13.4 promete abrir sin red: abierta
 * una vez, el trabajador ya con el control, y una segunda navegación pasada
 * entera por él.
 *
 * Son dos y no una a propósito, y está medido (§2.82): tras una sola visita el
 * bundle está en la caché y `fetch` lo sirve sin red, pero cargarlo como módulo
 * falla igualmente. La segunda apertura es la frontera que sí se sostiene.
 */
async function warmed(page: Page): Promise<void> {
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await controlled(page);
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor();
  await controlled(page);
}

test('a partir de la segunda apertura, el valle abre en modo avión', async ({ page, context }) => {
  await warmed(page);

  await context.setOffline(true);
  await page.reload();

  // Esto es §13.4 entero: sin red, la aldea sigue abriendo.
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  await test.expect(page.locator('#valley')).toBeVisible();
  await test.expect(page.locator('.valley-year')).not.toBeEmpty();
  await page.screenshot({ path: 'artifacts/m27-offline.png', fullPage: true });

  await context.setOffline(false);
});

/** The tick the save on disk holds, or 0 if there is none. */
function savedTick(page: Page): Promise<number> {
  return page.evaluate(async () => {
    const request = indexedDB.open('the-valley', 1);
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const saved = await new Promise<{ state?: { tick?: number } } | undefined>((resolve) => {
      const get = db.transaction('saves', 'readonly').objectStore('saves').get('current');
      get.onsuccess = () => resolve(get.result as { state?: { tick?: number } } | undefined);
      get.onerror = () => resolve(undefined);
    });
    db.close();
    return saved?.state?.tick ?? 0;
  });
}

test('la partida guardada sobrevive a quedarse sin red', async ({ page, context }) => {
  await page.clock.install({ time: Date.now() });
  await warmed(page);
  await page.getByRole('button', { name: '16×' }).click();
  // Más de 20 ticks: cruza el autoguardado de §13.1.
  await page.clock.runFor((25 * 15_000) / 16 + 500);
  await page.evaluate(() => window.dispatchEvent(new PageTransitionEvent('pagehide')));
  await test.expect.poll(() => savedTick(page)).toBeGreaterThan(0);
  const before = await savedTick(page);

  // Sin red, la partida sigue siendo la misma: el trabajador no toca
  // IndexedDB y el guardado es de §13.1, no suyo.
  await context.setOffline(true);
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  test.expect(await savedTick(page)).toBeGreaterThanOrEqual(before);

  await context.setOffline(false);
});

test('con red, el documento viene de la red y no de la caché', async ({ page, context }) => {
  await warmed(page);

  // Si el documento se sirviera desde la caché, un despliegue nuevo no
  // alcanzaría nunca a un dispositivo ya instalado. Se cambia lo que responde
  // el servidor y la siguiente carga tiene que verlo.
  //
  // La intercepción va en el CONTEXTO y no en la página: la petición la emite
  // el service worker, y `page.route` no ve lo que pide un trabajador.
  await context.route('**/index.html', async (route) => {
    const response = await route.fetch();
    const body = await response.text();
    await route.fulfill({ response, body: body.replace('<title>The Valley</title>', '<title>Redeployed</title>') });
  });
  await page.goto('/index.html');
  await test.expect(page).toHaveTitle('Redeployed');
});
