// RD-1 · el forastero del vado: cuándo aparece su señal (en minutos a ×1), si se toca, y qué pasa al contestar.
// node artifacts/rd0/fordscan.mjs <valley.html> <semillas,coma> [--answer take_him_in|turn_him_away] [--shots dir]
import { chromium } from '@playwright/test';
import { browserExe } from '../../tools/graphics/browser.mjs';
const args = process.argv.slice(2);
const [page, seedsArg] = args;
const opt = (n, d) => { const i = args.indexOf(`--${n}`); return i >= 0 ? args[i + 1] : d; };
const answer = opt('answer', ''); const shots = opt('shots', '');
const exe = browserExe();
const browser = await chromium.launch({ ...(exe ? { executablePath: exe } : {}), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
for (const seed of seedsArg.split(',')) {
  const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, hasTouch: true, isMobile: true });
  await tab.goto(`file://${page}`);
  await tab.locator('.title-scrim').waitFor({ timeout: 20000 });
  await tab.locator('#valley-seed').fill(seed);
  await tab.evaluate(() => document.querySelector('.title-new').click());
  await tab.waitForFunction(() => ['hints', 'done'].includes(document.documentElement.dataset.intro), null, { timeout: 180000 }).catch(() => {});
  await tab.evaluate(() => window.__valleySpeed?.(16));
  const row = { seed, cardBefore: false, sealBefore: false };
  const t0 = Date.now();
  let sign = null;
  while (Date.now() - t0 < 180000) {
    const s = await tab.evaluate(() => {
      const g = document.querySelector('.ford-sign');
      return { visible: g && !g.hidden, covered: g?.classList.contains('hunt-sign--covered') ?? false,
        card: document.querySelectorAll('.crossroad-scrim').length > 0, seal: !!document.querySelector('[aria-label*="waiting" i]'),
        date: document.querySelector('.valley-date')?.textContent ?? '', tick: document.documentElement.dataset.tick,
        scenic: window.__valleyLife?.()?.scenicSeconds ?? null };
    });
    if (!s.visible) { row.cardBefore ||= s.card; }
    if (s.visible) { sign = s; break; }
    await tab.waitForTimeout(400);
  }
  row.realSeconds = (Date.now() - t0) / 1000;
  row.minuteAtX1 = +(row.realSeconds * 16 / 60).toFixed(2);
  row.sign = sign;
  if (sign && shots) await tab.screenshot({ path: `${shots}/ford-${seed}-sign.png` });
  if (sign && !sign.covered) {
    await tab.evaluate(() => document.querySelector('.ford-sign').click());
    await tab.waitForTimeout(1500);
    row.opened = await tab.evaluate(() => document.querySelector('.crossroad-scrim h1, .crossroad-scrim h2')?.textContent ?? null);
    if (answer) {
      await tab.evaluate((a) => { const b = [...document.querySelectorAll('.crossroad-options button')].find((x) => x.dataset.option === a || x.textContent.toLowerCase().includes(a === 'take_him_in' ? 'take him' : 'turn him')); b?.click(); }, answer);
      await tab.waitForTimeout(4000);
      row.afterAnswer = await tab.evaluate(() => ({ card: document.querySelectorAll('.crossroad-scrim:not([inert])').length, sign: !document.querySelector('.ford-sign')?.hidden, date: document.querySelector('.valley-date')?.textContent }));
      if (shots) await tab.screenshot({ path: `${shots}/ford-${seed}-answered.png` });
    }
  }
  console.log(JSON.stringify(row));
  await tab.close();
}
await browser.close();
