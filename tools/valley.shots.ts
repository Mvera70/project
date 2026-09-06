/**
 * Capturas automáticas — design.md §14.3 y M-19.
 * OBLIGATORIO antes de empezar M-17. Es la mitigación del riesgo principal.
 */
import { test } from '@playwright/test';

test.skip('hoja de contacto: 4 estaciones × 4 años', async ({ page }) => {
  await page.goto('/');
  await page.screenshot({ path: 'artifacts/placeholder.png' });
});
