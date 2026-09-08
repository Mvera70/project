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
