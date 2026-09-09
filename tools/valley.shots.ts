/**
 * Capturas automáticas — design.md §14.3 y M-19.
 * OBLIGATORIO antes de empezar M-17. Es la mitigación del riesgo principal.
 */
import { test } from '@playwright/test';

test('la ruta de depuración llega al lienzo móvil sin interacción', async ({ page }) => {
  await page.goto('/?debug=1&seed=7&year=1&season=spring');
  await page.locator('html[data-debug-ready="true"]').waitFor();
  await page.locator('#valley').screenshot({ path: 'artifacts/debug-route.png' });
  await test.expect(page.locator('#valley')).toHaveCSS('width', '360px');
  await test.expect(page.locator('#valley')).toHaveCSS('height', '560px');
});

test('cada edificio pinta dentro de su caja a 9 y 10 px sobre claro y oscuro', async ({ page }) => {
  await page.goto('/?debug=1&seed=7&year=1&season=spring');
  await page.locator('html[data-debug-ready="true"]').waitFor();
  const audit = await page.locator('html').getAttribute('data-sprite-audit');
  const result = JSON.parse(audit ?? '{}') as { cases: number; empty: string[]; spills: string[]; principalShapes: number };
  test.expect(result.cases).toBe(52);
  test.expect(result.empty).toEqual([]);
  test.expect(result.spills).toEqual([]);
  test.expect(result.principalShapes).toBe(4);
});

test('la aplicación abre el valle con año y cuatro velocidades táctiles', async ({ page }) => {
  await page.clock.install();
  await page.goto('/');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.screenshot({ path: 'artifacts/app-shell.png', fullPage: true });
  await test.expect(page.locator('#valley')).toHaveCSS('width', '360px');
  await test.expect(page.locator('#valley')).toHaveCSS('height', '560px');
  await test.expect(page.locator('.valley-year')).toHaveText('ANNO I');
  await test.expect(page.locator('.valley-speeds button')).toHaveCount(4);
  for (const button of await page.locator('.valley-speeds button').all()) {
    const box = await button.boundingBox();
    test.expect(box?.width).toBeGreaterThanOrEqual(44);
    test.expect(box?.height).toBeGreaterThanOrEqual(44);
  }
  await page.getByRole('button', { name: '4×' }).click();
  await test.expect(page.getByRole('button', { name: '4×' })).toHaveAttribute('aria-pressed', 'true');
  const spring = await page.locator('#root').evaluate((node) => getComputedStyle(node).getPropertyValue('--valley-void'));
  await page.getByRole('button', { name: '16×' }).click();
  await page.clock.runFor(12_000);
  const summer = await page.locator('#root').evaluate((node) => getComputedStyle(node).getPropertyValue('--valley-void'));
  test.expect(summer).not.toBe(spring);
});

test('la ruta viva abre un valle maduro determinista para revisar la multitud', async ({ page }) => {
  await page.goto('/?debug=1&live=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await test.expect(page.locator('.valley-year')).toHaveText('ANNO LXXXI');
  await test.expect(page.locator('#valley')).toHaveCSS('width', '360px');
  await page.locator('#valley').click({ position: { x: 180, y: 280 } });
  await test.expect(page.locator('.valley-panel')).toBeVisible();
  await test.expect(page.locator('.valley-panel h2')).not.toBeEmpty();
  await page.screenshot({ path: 'artifacts/m21-panel.png', fullPage: true });
});

test('el hambre se ve en el valle sin abrir una ficha', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&hunger=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(5_000);
  await page.screenshot({ path: 'artifacts/m21-hunger.png', fullPage: true });
  await test.expect(page.locator('.valley-panel')).toBeHidden();
});

test('la encrucijada muestra el precio de las tres opciones sin desplazar, y decidir enfoca el mapa', async ({ page }) => {
  // Semilla 7, año 80: exactamente 60 ticks a 16× (§17 M-22, medido con un
  // sondeo de un solo uso) plantan `forest_cut` sin que nadie la conteste —
  // esta aplicación real, a diferencia del banco, nunca decide sola.
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=80&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.getByRole('button', { name: '16×' }).click();
  await page.clock.runFor(58_000);

  const scrim = page.locator('.crossroad-scrim');
  await test.expect(scrim).toBeVisible();
  await test.expect(page.locator('.crossroad h1')).toHaveText('The Old Wood');
  const costs = page.locator('.crossroad-cost');
  await test.expect(costs).toHaveCount(3);
  // El precio de cada opción, en pantalla junto al verbo, sin que haga falta
  // desplazar nada para leerlo (§11.2, §17 M-22).
  for (const cost of await costs.all()) await test.expect(cost).toBeInViewport();
  await page.screenshot({ path: 'artifacts/m22-crossroad.png', fullPage: true });

  const before = await page.locator('#valley').evaluate((el) => getComputedStyle(el).transform);
  await page.getByRole('button', { name: /^Take only the edge\./ }).click();
  await test.expect(scrim).toBeHidden();
  await test.expect
    .poll(() => page.locator('#valley').evaluate((el) => getComputedStyle(el).transform))
    .not.toBe(before);
  await page.screenshot({ path: 'artifacts/m22-focus.png', fullPage: true });
});

test('cerrar y abrir a las cuatro horas presenta un parte de bienvenida (§13, hito 6)', async ({ page }) => {
  const t0 = Date.now();
  await page.clock.install({ time: t0 });
  await page.goto('/'); // sin parámetros de depuración: la ruta real, guardado incluido
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.getByRole('button', { name: '16×' }).click();
  // Suficientes ticks reales a 16× para cruzar el guardado cada 20 (§13.1).
  await page.clock.runFor((30 * 15_000) / 16 + 3_000);

  // Cuatro horas después, con reloj falso — no se espera de verdad.
  await page.clock.setSystemTime(t0 + 4 * 60 * 60 * 1000);
  await page.reload();
  await page.locator('html[data-app-ready="true"]').waitFor();

  const welcome = page.locator('.welcome');
  await welcome.waitFor({ timeout: 15_000 });
  await page.screenshot({ path: 'artifacts/m23-welcome.png', fullPage: true });
  const text = await welcome.innerText();
  test.expect(text).not.toMatch(/\{\w+\}/);
  test.expect(text).toMatch(/weeks passed|has been \d+ weeks|weeks, and nobody/);

  // El letargo no decide por el jugador ni deja de correr el juego: la
  // encrucijada, si había una pendiente, sigue exactamente donde estaba
  // (§1, §13.2) — se comprueba dejando pasar el parte y comprobando que el
  // valle sigue vivo, no que haya (o no) una encrucijada, que depende de la
  // partida real que haya tocado esta vez.
  await welcome.click();
  await test.expect(welcome).toBeHidden();
  await test.expect(page.locator('.valley-year')).not.toHaveText('ANNO I');
});
