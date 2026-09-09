import { test } from '@playwright/test';

test('el ganado se ve en una aldea madura', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=summer');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(3_000);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-animals.png' });
});

test('los cuervos bajan al campo antes de la siega', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=autumn');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.clock.runFor(3_000);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-crows.png' });
});

test('en una noche de invierno hay lobos y el corral está vacío', async ({ page }) => {
  await page.clock.install();
  await page.goto('/?debug=1&live=1&seed=7&year=40&season=winter');
  await page.locator('html[data-app-ready="true"]').waitFor();
  await page.getByRole('button', { name: '16×', exact: true }).click();
  // Se avanza hasta caer dentro de la noche: el último quinto del tick.
  await page.clock.runFor(800);
  await page.locator('#valley').screenshot({ path: 'artifacts/m29-wolves.png' });
});
