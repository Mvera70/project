#!/usr/bin/env tsx
// M-27 · Iconos de la aplicación, design.md §13.4.
//
// La fuente maestra se conserva a 1254 px para no volver a fabricar el icono
// cada vez que cambie un tamaño del manifiesto. Chromium hace el remuestreo del
// mismo modo en los tres casos, sin introducir otra dependencia de imagen.
//
//   npm run icons
//
// Escribe public/icon-192.png, icon-512.png e icon-maskable-512.png.

import { existsSync } from 'node:fs';
import { mkdir, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { chromium, type Browser } from '@playwright/test';

const SYSTEM_CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe';
const SOURCE = resolve('tools/icon-source.png');

function markup(size: number, source: string): string {
  return `<!doctype html>
    <style>
      html, body { margin: 0; width: ${size}px; height: ${size}px; overflow: hidden; }
      img { display: block; width: ${size}px; height: ${size}px; object-fit: cover; }
    </style>
    <img src="${source}" alt="">`;
}

async function shoot(browser: Browser, size: number, path: string, source: string): Promise<void> {
  const page = await browser.newPage({ viewport: { width: size, height: size }, deviceScaleFactor: 1 });
  await page.setContent(markup(size, source), { waitUntil: 'load' });
  await page.screenshot({ path, omitBackground: false });
  await page.close();
}

async function main(): Promise<void> {
  const output = resolve('public');
  await mkdir(output, { recursive: true });
  const source = `data:image/png;base64,${(await readFile(SOURCE)).toString('base64')}`;
  const bundled = chromium.executablePath();
  const browser = await chromium.launch({
    headless: true,
    ...(!existsSync(bundled) && existsSync(SYSTEM_CHROME) ? { executablePath: SYSTEM_CHROME } : {}),
  });
  try {
    await shoot(browser, 192, resolve(output, 'icon-192.png'), source);
    await shoot(browser, 512, resolve(output, 'icon-512.png'), source);
    // El emblema y el título ya viven en el 72 % central de la fuente; el
    // fondo naranja sangra hasta el borde y tolera las máscaras del launcher.
    await shoot(browser, 512, resolve(output, 'icon-maskable-512.png'), source);
    process.stdout.write(`Wrote three icons to ${output}\n`);
  } finally {
    await browser.close();
  }
}

main().catch((error: unknown) => { console.error(error); process.exitCode = 1; });
