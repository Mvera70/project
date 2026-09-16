// Verifica el cuaderno documental; no inicia ni modifica una partida.
import { chromium } from '@playwright/test';
import { existsSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('.', import.meta.url));
const browsers = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const executablePath = readdirSync(browsers).filter(d => /^chromium-\d+$/.test(d))
  .sort().reverse().map(d => join(browsers, d, 'chrome-win64', 'chrome.exe')).find(existsSync);
const browser = await chromium.launch({ ...(executablePath ? { executablePath } : {}) });
const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const result = { widths: [], interactions: [], errors };
function check(condition, message) { if (!condition) throw new Error(message); }
try {
  await page.goto(new URL('index.html', import.meta.url).href);
  await page.locator('.map').last().waitFor();
  result.counts = { frames: await page.locator('.frame').count(), maps: await page.locator('.map').count(), docks: await page.locator('.dock-phone').count() };
  check(result.counts.frames === 24 && result.counts.maps === 10 && result.counts.docks === 4, 'Faltan dibujos');
  result.images = await page.locator('img').evaluateAll(async images => {
    await Promise.all(images.map(img => img.decode()));
    return images.map(img => ({ src: img.getAttribute('src'), width: img.naturalWidth, height: img.naturalHeight }));
  });
  const links = await page.locator('a[href]').evaluateAll(anchors => anchors.map(a => a.getAttribute('href')));
  for (const href of links.filter(href => !href.startsWith('#'))) check(existsSync(fileURLToPath(new URL(href.split('#')[0], new URL('index.html', import.meta.url)))), `Enlace inexistente: ${href}`);
  for (const scene of ['greet', 'peck', 'yield']) {
    await page.selectOption('#scene', scene);
    const drawings = [];
    for (const beat of ['0', '1', '2', '3']) {
      await page.selectOption('#beat', beat);
      drawings.push(await page.locator('.scale-phone svg').first().innerHTML());
    }
    check(new Set(drawings).size >= 3, `Instantes sin cambio: ${scene}`);
    result.interactions.push({ scene, distinctDrawings: new Set(drawings).size });
  }
  await page.selectOption('#scene', 'greet');
  await page.selectOption('#beat', '1');
  await page.selectOption('#safe', '34');
  check((await page.locator('.safe').first().boundingBox()).height === 34, 'Área segura incorrecta');
  for (const width of [1280, 390, 320]) {
    await page.setViewportSize({ width, height: 1000 });
    const bounds = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: innerWidth, phones: [...document.querySelectorAll('.scale-phone')].map(el => el.getBoundingClientRect().width), docks: [...document.querySelectorAll('.dock-phone')].map(el => el.getBoundingClientRect().width) }));
    check(bounds.document <= width, `Desbordamiento global a ${width}`);
    check(bounds.phones.every(w => w === 390), 'El comparador de escala se ha reducido');
    result.widths.push({ width, ...bounds });
  }
  await page.setViewportSize({ width: 1280, height: 1000 });
  for (const [selector, filename] of [['#boards .story', 'preview-story.png'], ['#maps', 'preview-maps.png'], ['#docks', 'preview-docks.png'], ['#scale-pair', 'preview-scale.png']]) {
    await page.locator(selector).first().screenshot({ path: join(root, 'evidence', filename) });
  }
  await page.locator('#boards .story').nth(1).screenshot({ path: join(root, 'evidence', 'preview-yield.png') });
  await page.locator('#boards .story').nth(2).screenshot({ path: join(root, 'evidence', 'preview-quarrel.png') });
  check(errors.length === 0, 'Errores de JavaScript');
  result.status = 'passed';
  writeFileSync(join(root, 'evidence', 'verification.json'), `${JSON.stringify(result, null, 2)}\n`);
  console.log(JSON.stringify(result, null, 2));
} finally { await browser.close(); }
