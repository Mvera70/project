#!/usr/bin/env tsx
// M-27 · Application icons, design.md §13.4.
//
// Rendered in Chromium and screenshotted, the same way M-19 already produces
// every other image this project ships. No new dependency, no binary checked
// in by hand, and the colours are the summer palette of §10.3 rather than
// something invented for a launcher: the icon is the valley or it is nothing.
//
//   npx tsx tools/icons.ts
//
// Writes public/icon-192.png, icon-512.png and icon-maskable-512.png.

import { mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, type Browser } from '@playwright/test';
import { PALETTES } from '../src/render/palette';

const SYSTEM_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const p = PALETTES.summer;

/**
 * `safe` is the fraction of the canvas the drawing keeps to. A maskable icon
 * may be cropped to a circle by the launcher, so its content stays inside the
 * inner 80 % and the ground bleeds to the edges behind it.
 */
function markup(size: number, safe: number): string {
  const inset = (1 - safe) / 2 * size;
  const box = size - inset * 2;
  const u = box / 12; // twelve cells across, the same grid the valley uses
  const house = (x: number, y: number, w: number, h: number): string => `
    <rect x="${inset + x * u}" y="${inset + y * u}" width="${w * u}" height="${h * u}" fill="${p.wood}"/>
    <rect x="${inset + x * u}" y="${inset + y * u}" width="${w * u}" height="${h * u * 0.45}" fill="${p.roof}"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <rect width="${size}" height="${size}" fill="${p.meadow}"/>
    <rect x="0" y="${size * 0.62}" width="${size}" height="${size * 0.38}" fill="${p.meadowAlt}"/>
    <rect x="${inset + u * 8.6}" y="0" width="${u * 1.5}" height="${size}" fill="${p.water}"/>
    <rect x="${inset + u * 0.6}" y="${inset + u * 7.4}" width="${u * 4.4}" height="${u * 1.5}" fill="${p.field}"/>
    <rect x="${inset + u * 0.6}" y="${inset + u * 9.2}" width="${u * 6.2}" height="${u * 1.5}" fill="${p.field}"/>
    <rect x="${inset + u * 0.2}" y="${inset + u * 1.1}" width="${u * 1.1}" height="${u * 4.2}" fill="${p.forest}"/>
    <rect x="${inset + u * 1.5}" y="${inset + u * 0.6}" width="${u * 1.1}" height="${u * 3.0}" fill="${p.forestDark}"/>
    ${house(3.2, 2.4, 2.6, 2.2)}
    ${house(6.2, 3.6, 2.0, 1.8)}
    ${house(4.4, 5.4, 2.2, 1.9)}
  </svg>`;
}

async function shoot(browser: Browser, size: number, safe: number, path: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(
    `<style>html,body{margin:0;width:${size}px;height:${size}px;overflow:hidden}</style>${markup(size, safe)}`,
  );
  await page.screenshot({ path, omitBackground: false });
  await page.close();
}

async function main(): Promise<void> {
  const output = resolve('public');
  await mkdir(output, { recursive: true });
  const bundled = chromium.executablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(!existsSync(bundled) && existsSync(SYSTEM_CHROME) ? { executablePath: SYSTEM_CHROME } : {}),
  });
  try {
    await shoot(browser, 192, 1, resolve(output, 'icon-192.png'));
    await shoot(browser, 512, 1, resolve(output, 'icon-512.png'));
    // Maskable: same drawing, kept inside the safe area a round crop leaves.
    await shoot(browser, 512, 0.8, resolve(output, 'icon-maskable-512.png'));
    process.stdout.write(`Wrote three icons to ${output}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
