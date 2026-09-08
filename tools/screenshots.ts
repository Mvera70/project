#!/usr/bin/env tsx
// M-19 · Mobile screenshots, grayscale checks and contact sheet.

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser, type Page } from '@playwright/test';
import { createServer, type ViteDevServer } from 'vite';

const SEASONS = ['spring', 'summer', 'autumn', 'winter'] as const;
const SYSTEM_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';

function argument(name: string, fallback: string): string {
  const at = process.argv.indexOf(`--${name}`);
  return at < 0 ? fallback : (process.argv[at + 1] ?? fallback);
}

function integers(value: string): number[] {
  const parsed = value.split(',').map(Number);
  if (parsed.length === 0 || parsed.some((item) => !Number.isInteger(item) || item < 0)) {
    throw new Error(`Expected comma-separated non-negative integers, received '${value}'.`);
  }
  return parsed;
}

async function shotPair(
  page: Page,
  url: string,
  colourPath: string,
  grayscalePath: string,
): Promise<[Buffer, Buffer]> {
  await page.goto(url, { waitUntil: 'networkidle', timeout: 120_000 });
  await page.locator('html[data-debug-ready="true"]').waitFor({ timeout: 120_000 });
  const colour = await page.screenshot({ path: colourPath, fullPage: true });
  await page.locator('html').evaluate((node) => { node.style.filter = 'grayscale(1)'; });
  const grayscale = await page.screenshot({ path: grayscalePath, fullPage: true });
  return [colour, grayscale];
}

async function contactSheet(browser: Browser, images: readonly Buffer[], path: string): Promise<void> {
  const width = 390 * 8;
  const height = 844 * Math.ceil(images.length / 8);
  const page = await browser.newPage({ viewport: { width, height }, deviceScaleFactor: 1 });
  const sources = images.map((buffer) => `data:image/png;base64,${buffer.toString('base64')}`);
  await page.setContent(`<style>*{box-sizing:border-box}html,body{margin:0;background:#20201d}main{display:grid;grid-template-columns:repeat(8,390px)}img{display:block;width:390px;height:844px}</style><main>${sources.map((source) => `<img src="${source}">`).join('')}</main>`);
  await page.locator('img').last().evaluate((image) => (image as HTMLImageElement).decode());
  await page.screenshot({ path, fullPage: true });
  await page.close();
}

async function main(): Promise<void> {
  const seed = Number(argument('seed', '7'));
  const years = integers(argument('years', '1,20,60,120'));
  if (!Number.isInteger(seed)) throw new Error('Seed must be an integer.');

  const output = resolve('artifacts');
  await mkdir(output, { recursive: true });
  let server: ViteDevServer | undefined;
  let browser: Browser | undefined;
  try {
    server = await createServer({ server: { host: '127.0.0.1', port: 0 } });
    await server.listen();
    const base = server.resolvedUrls?.local[0];
    if (base === undefined) throw new Error('Vite did not publish a local debug URL.');
    const bundled = chromium.executablePath();
    browser = await chromium.launch({
      headless: true,
      ...(!existsSync(bundled) && existsSync(SYSTEM_CHROME)
        ? { executablePath: SYSTEM_CHROME }
        : {}),
    });
    const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
    const buffers: Buffer[] = [];
    for (const year of years) {
      for (const season of SEASONS) {
        const stem = `seed-${seed}-year-${String(year).padStart(3, '0')}-${season}`;
        const url = `${base}?debug=1&seed=${seed}&year=${year}&season=${season}`;
        buffers.push(...await shotPair(
          page,
          url,
          resolve(output, `${stem}.png`),
          resolve(output, `${stem}-gray.png`),
        ));
      }
    }
    await page.close();
    await contactSheet(browser, buffers, resolve(output, `seed-${seed}-contact-sheet.png`));
    process.stdout.write(`Wrote ${buffers.length + 1} PNG files to ${output}\n`);
  } finally {
    await browser?.close();
    await server?.close();
  }
}

await main();
