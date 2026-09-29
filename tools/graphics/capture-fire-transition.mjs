import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { withBrowser } from './browser.mjs';

const browser = await chromium.launch(withBrowser({ args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] }));
const page = await browser.newPage({ viewport: { width: 1000, height: 700 } });
const port = process.env.VITE_PORT ?? '5173';
await page.goto(`http://127.0.0.1:${port}/tools/graphics/fire-transition.html`);
await page.waitForFunction(() => document.documentElement.dataset.ready === 'true');
if (await page.evaluate(() => document.querySelector('canvas')?.getContext('webgl2')?.isContextLost())) {
  throw new Error('WebGL context lost: no valid visual capture');
}
const out = 'artifacts/graphics/G-42/fire-transition';
mkdirSync(out, { recursive: true });
for (const [day, name] of [[1, 'burning'], [2.45, 'collapsing'], [3.3, 'ruin']]) {
  await page.evaluate((value) => window.setFireDay(value), day);
  await page.locator('canvas').screenshot({ path: `${out}/${name}.png` });
}
await browser.close();
