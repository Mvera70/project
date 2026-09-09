/**
 * M-27.2 · A new deployment has to reach a device that already visited —
 * design.md §13.4, and served with the headers GitHub Pages really sends.
 */
import { test, type Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:4181/';

async function controlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
}

test('un despliegue nuevo alcanza a un cliente que ya visitó, con las cabeceras de Pages', async ({ page, request }) => {
  await page.goto(BASE);
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  await controlled(page);
  await page.reload();
  await controlled(page);
  test.expect(await page.title()).toBe('V1');

  // Se despliega otra versión: mismo URL, mismas cabeceras, otro documento.
  await request.get(`${BASE}__bump`);

  // Cerrar y abrir. Con `Cache-Control: max-age=600` y un `fetch` corriente,
  // esto devolvía V1 durante diez minutos: la caché HTTP del navegador contesta
  // por debajo del service worker y la red no se llega a tocar.
  await page.goto(BASE);
  test.expect(await page.title()).toBe('V2');

  // Y sigue abriendo sin red después de la actualización.
  await page.context().setOffline(true);
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  await page.context().setOffline(false);
});
