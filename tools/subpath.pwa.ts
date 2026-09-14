/**
 * M-27.1 · The same build, served from a subdirectory — design.md §13.4.
 *
 * GitHub Pages serves this project at `/project/`, not at a domain root. A
 * single absolute path anywhere — an asset, the manifest, the worker's scope —
 * breaks only there, only once deployed, and never in any local run. This is
 * that failure turned into a test.
 */
import { test, type Page } from '@playwright/test';

const BASE = 'http://127.0.0.1:4180/project/';

async function controlled(page: Page): Promise<void> {
  await page.waitForFunction(() => navigator.serviceWorker.controller !== null, null, { timeout: 30_000 });
}

test('bajo un subdirectorio arranca, el worker se limita a él y abre sin red', async ({ page, context }) => {
  await page.goto(BASE);
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  await controlled(page);

  // El ámbito es el subdirectorio y no la raíz: un trabajador con `scope: '/'`
  // se apropiaría de todo lo que el usuario tenga publicado en ese dominio.
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.getRegistration())?.scope);
  test.expect(scope).toBe(BASE);

  // Y todo lo que guarda cuelga de ahí: ninguna ruta absoluta se ha colado.
  const cached = await page.evaluate(async () => {
    const names = await caches.keys();
    const cache = await caches.open(names[0]!);
    return (await cache.keys()).map((r) => new URL(r.url).pathname).sort();
  });
  test.expect(cached.length).toBeGreaterThan(3);
  for (const path of cached) test.expect(path, path).toMatch(/^\/project\//);

  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor();
  await controlled(page);

  await context.setOffline(true);
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor({ timeout: 30_000 });
  // **Y abre con el render que se publica.** Aquí se miraba el lienzo 2D, que
  // sólo está visible cuando el relevo a WebGL no ha ocurrido — así que la
  // prueba pasaba precisamente por no esperar a nada. Que `data-render` diga
  // `pilot3d` bajo un prefijo es lo que demuestra lo que §13.4 promete: los
  // treinta y un GLB se piden por ruta relativa y resuelven igual desde un
  // subdirectorio, que es el fallo que sólo se ve desplegado.
  await page.locator('html[data-render="pilot3d"]').waitFor({ timeout: 30_000 });
  await context.setOffline(false);
});
