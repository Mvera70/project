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
