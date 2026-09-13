import { chromium } from '@playwright/test';
import { createServer } from 'vite';
import { existsSync } from 'node:fs';
const server = await createServer({ root: process.cwd(), server: { host: '127.0.0.1', port: 5184, strictPort: true, watch: { ignored: ['**/artifacts/**'] } } });
await server.listen();
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe'].find(existsSync);
const browser = await chromium.launch({ headless: true, executablePath: exe });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.goto('http://127.0.0.1:5184/?render=3d&seed=7', { waitUntil: 'networkidle', timeout: 120000 });
await page.waitForTimeout(3000);
// correr a 64x un rato para que pase algo
await page.locator('[aria-label="64×"]').click().catch(() => page.locator('button', { hasText: '64' }).first().click());
await page.waitForTimeout(20000);
await page.screenshot({ path: 'artifacts/graphics/G-10/juego-sucesos.png' });
console.log('TICK', await page.evaluate(() => document.documentElement.dataset.tick));
console.log('NOTICIAS', await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 300)));
// tocar el centro del valle
await page.mouse.click(195, 420);
await page.waitForTimeout(1200);
await page.screenshot({ path: 'artifacts/graphics/G-10/juego-ficha.png' });
await browser.close(); await server.close();
