import { chromium } from '@playwright/test';

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage({ viewport: { width: 1600, height: 1200 }, deviceScaleFactor: 1 });
await page.goto('http://127.0.0.1:5173/chronicle-contact-sheet.html', { waitUntil: 'networkidle' });
await page.locator('img').first().waitFor({ state: 'visible' });
await page.screenshot({ path: 'artifacts/graphics/chronicle-contact-sheet.png', fullPage: true });
await browser.close();
