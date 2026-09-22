// Los accesos de taller deben funcionar desde el menú real, no sólo al jugar
// la misma semilla desde una prueba de motor.
import { test } from '@playwright/test';

test('Dev ofrece partidas preparadas y abre la villa con un toque', async ({ page }) => {
  await page.goto('/?render=canvas');
  await page.locator('.title-scrim').waitFor();
  const presets = page.locator('.title-preset');
  await test.expect(presets).toHaveCount(3);
  await test.expect(presets.first()).toBeHidden();
  await page.locator('.title-dev').click();
  await test.expect(presets.first()).toBeVisible();
  await test.expect(presets.first()).toContainText('Year 1');
  await test.expect(presets.nth(1)).toContainText('Year 21');
  await test.expect(presets.nth(2)).toContainText('Year 60');
  await page.screenshot({ path: 'artifacts/dev-presets-title.png', fullPage: true });
  await presets.nth(2).click();
  await page.locator('html[data-app-ready="true"]').waitFor();
  await test.expect(page.locator('.valley-date')).toContainText('Year 60');
});
