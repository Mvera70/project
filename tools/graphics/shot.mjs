// Capturas del juego montado, para mirar antes de decir que algo se ve bien.
//
//   node tools/graphics/shot.mjs                     → arranque, 390×844
//   node tools/graphics/shot.mjs --run 30 --speed 64  → tras 30 s a 64×
//   node tools/graphics/shot.mjs --wait moment        → espera a que salga una cartela de hito
//   node tools/graphics/shot.mjs --wait crossroad     → espera a una encrucijada
//   node tools/graphics/shot.mjs --out foo.png
//
// Playwright pide un navegador exacto y en esta máquina no hay red para
// bajarlo; hay otros instalados de versiones anteriores y valen igual. Se busca
// el más reciente en ~/AppData/Local/ms-playwright. Sin WebGL de verdad se usa
// swiftshader, que es lento pero pinta.
//
// Antes: `npx tsx tools/graphics/bundle-game.ts` para tener la página al día.

import { chromium } from '@playwright/test';
import { existsSync, readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';

const args = process.argv.slice(2);
const opt = (name, fallback) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] !== undefined ? args[i + 1] : fallback;
};
const runSeconds = Number(opt('run', '0'));
const speed = opt('speed', '1');
const waitFor = opt('wait', '');
const out = resolve(opt('out', 'artifacts/graphics/G-10/shot.png'));
const page = resolve(opt('page', 'artifacts/graphics/G-10/game/valley.html'));

function browserExe() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
  if (!existsSync(root)) return undefined;
  const dirs = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort();
  for (const dir of dirs.reverse()) {
    const exe = join(root, dir, 'chrome-win64', 'chrome.exe');
    if (existsSync(exe)) return exe;
  }
  return undefined;
}

const exe = browserExe();
const browser = await chromium.launch({
  ...(exe ? { executablePath: exe } : {}),
  args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'],
});
const tab = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
const errors = [];
tab.on('pageerror', (e) => errors.push(String(e)));
tab.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
await tab.goto(`file:///${page.replace(/\\/g, '/')}`);
await tab.waitForTimeout(8000);

if (speed !== '1') await tab.getByRole('button', { name: `${speed}×` }).click().catch(() => {});

const swipeDown = async () => {
  await tab.mouse.move(195, 300); await tab.mouse.down();
  await tab.mouse.move(195, 700, { steps: 8 }); await tab.mouse.up();
};

if (waitFor) {
  const deadline = Date.now() + 150_000;
  let found = null;
  while (Date.now() < deadline && found === null) {
    await tab.waitForTimeout(700);
    const state = await tab.evaluate((what) => {
      const open = document.documentElement.classList.contains('crossroad-open');
      if (what === 'crossroad') return open ? 'yes' : null;
      if (open) return 'crossroad';
      const el = document.querySelector('.valley-moment');
      return el && !el.hidden ? el.textContent : null;
    }, waitFor);
    if (state === 'crossroad') { await swipeDown(); continue; }
    found = state;
  }
  console.log(found === null ? `no salió «${waitFor}» en 150 s` : `esperado «${waitFor}»: ${found}`);
} else if (runSeconds > 0) {
  await tab.waitForTimeout(runSeconds * 1000);
}

await tab.screenshot({ path: out });
const hud = await tab.evaluate(() => ({
  year: document.querySelector('.valley-year')?.textContent ?? null,
  vitals: [...document.querySelectorAll('.valley-vital')].map((e) => e.textContent),
}));
console.log(JSON.stringify(hud), '→', out);
console.log('errores de página:', errors.length === 0 ? 'ninguno' : errors.slice(0, 5));
await browser.close();
