// El reparto de la escena. 27 sep 2026.
//
// Abre el juego empaquetado y pide a `window.__valleySceneReport()` las mallas
// visibles, las que proyectan sombra, las instanciadas y los triángulos por
// grupo colgado del mundo (los edificios, por tipo). Cada malla visible es una
// llamada de dibujo, y cada una con sombra, otra más en el mapa de sombras.
//
//   node tools/graphics/scene-report.mjs "<query>" [valley.html]
//
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0];
const browser = await chromium.launch({ executablePath: join(root, dir, 'chrome-win64', 'chrome.exe'), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1180, height: 820 } });
await tab.goto('file:///' + resolve(process.argv[3] ?? 'artifacts/graphics/alive/game/valley.html').split(String.fromCharCode(92)).join('/') + '?' + process.argv[2]);
await tab.waitForFunction(() => typeof window.__valleySceneReport === 'function', null, { timeout: 180000 });
await tab.waitForTimeout(20000);
const rows = await tab.evaluate(() => window.__valleySceneReport());
let m = 0, sh = 0, t = 0;
for (const r of rows) { m += r.meshes; sh += r.shadow; t += r.triangles; }
for (const r of rows.slice(0, 25)) console.log(r.group.padEnd(28), String(r.meshes).padStart(5), 'sombra', String(r.shadow).padStart(5), 'inst', String(r.instanced).padStart(3), 'tris', r.triangles);
console.log('TOTAL', m, 'sombra', sh, 'tris', t);
await browser.close();
