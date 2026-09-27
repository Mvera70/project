// Cuántos sombreadores se recompilan al pasar cosas (27 sep 2026). Carga el
// valle, espera, y cuenta los programas enlazados tras un rayo, al encender la
// fiesta y al apagarla. Cada enlace de más es un tirón en una tablet: así se
// vio que cambiar el número de luces puntuales recompilaba todos los
// materiales (de 33 a 86 programas), que es lo que arregla `LightPool`.
//   node tools/graphics/shader-churn.mjs <valley.html> "<query>"
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
const [file, query] = process.argv.slice(2);
const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0];
const browser = await chromium.launch({ executablePath: join(root, dir, 'chrome-win64', 'chrome.exe'), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 900, height: 700 } });
await tab.addInitScript(() => {
  const p = { links: 0, linkMs: 0 }; window.__p = p;
  const proto = WebGL2RenderingContext.prototype;
  const lp = proto.linkProgram; proto.linkProgram = function (x) { p.links += 1; return lp.call(this, x); };
  const gp = proto.getProgramParameter; proto.getProgramParameter = function (a, b) { const t = performance.now(); const r = gp.call(this, a, b); p.linkMs += performance.now() - t; return r; };
});
await tab.goto('file:///' + resolve(file).split(String.fromCharCode(92)).join('/') + '?' + query);
await tab.waitForTimeout(30000);
const read = () => tab.evaluate(() => ({ ...window.__p }));
console.log('tras cargar', await read());
await tab.evaluate(() => window.__valleyStrike?.(0)); await tab.waitForTimeout(6000);
console.log('tras un rayo', await read());
await tab.evaluate(() => window.__valleyFestoon?.(true)); await tab.waitForTimeout(6000);
console.log('tras la fiesta', await read());
await tab.evaluate(() => window.__valleyFestoon?.(false)); await tab.waitForTimeout(6000);
console.log('tras quitarla', await read());
await browser.close();
