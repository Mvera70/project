import { test } from '@playwright/test';

test('el ganado se ve en una aldea madura', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(3_000);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-animals.png' });
});
