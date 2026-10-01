// RD-4 · las dos señales nuevas en el navegador: el niño perdido y la visita.
// node artifacts/rd0/rd4signs.mjs <valley.html> <semilla> <año> <lost|visit> [--shots dir] [--tap]
// Abre el valle en ese año (el menú, como `shot.mjs --year`), espera la señal
// a ×1, la fotografía, la toca si se pide y mide lo que pasa después.
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
const args = process.argv.slice(2);
const [page, seed, year, which] = args;
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const shots = opt('shots', ''); const tap = args.includes('--tap');
const sel = which === 'lost' ? '.lost-sign' : '.visit-sign';
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
await tab.goto(`file://${page}`);
await tab.locator('.title-scrim').waitFor({ timeout: 20000 });
await tab.locator('#valley-seed').fill(seed);
const toggle = tab.locator('.title-dev');
if (await toggle.getAttribute('aria-pressed').catch(() => null) === 'false') await toggle.click().catch(() => {});
await tab.locator('#valley-year').fill(year);
await tab.evaluate(() => document.querySelector('.title-new').click());
await tab.waitForFunction(() => typeof window.__valleyLife === 'function', null, { timeout: 240000 });
const t0 = Date.now();
const row = { seed, year, which };
let sign = null;
while (Date.now() - t0 < 240000) {
  sign = await tab.evaluate((s) => {
    const g = document.querySelector(s);
    return g && !g.hidden ? { covered: g.classList.contains('hunt-sign--covered'), label: g.getAttribute('aria-label'),
      voiceButtons: !document.querySelector('.ui-voice-actions, [class*="voice-actions"]')?.hidden } : null;
  }, sel);
  if (sign) break;
  await tab.waitForTimeout(500);
}
row.seconds = (Date.now() - t0) / 1000;
row.sign = sign;
if (sign && shots) await tab.screenshot({ path: `${shots}/rd4-${which}-${seed}-sign.png` });
if (sign && tap && !sign.covered) {
  await tab.evaluate((s) => document.querySelector(s).click(), sel);
  const t1 = Date.now();
  row.afterTap = [];
  for (let k = 0; k < 12; k += 1) {
    await tab.waitForTimeout(5000);
    row.afterTap.push(await tab.evaluate(() => {
      const l = window.__valleyLife?.();
      return { s: Math.round((Date.now() - 0) / 1000) % 100000, payments: l?.payments?.length ?? null,
        visitors: (l?.visitors ?? []).map((v) => v.phase).join(','), phase: l?.phase };
    }));
    if (k === 3 && shots) await tab.screenshot({ path: `${shots}/rd4-${which}-${seed}-after.png` });
  }
  row.tapSeconds = (Date.now() - t1) / 1000;
}
console.log(JSON.stringify(row));
await browser.close();
