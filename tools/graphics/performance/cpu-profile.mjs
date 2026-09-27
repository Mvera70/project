// Perfil de CPU de la escena con CDP: tiempo inclusivo por función y las
// cadenas de llamadas que llevan a una función dada (27 sep 2026). Hace falta
// el juego **sin minificar** para leer nombres:
//   npx tsx tools/graphics/bundle-game.ts --no-minify --out artifacts/graphics/alive/unmin
//   node tools/graphics/performance/cpu-profile.mjs <valley.html> "<query>" <espera s> <perfil s> <función>
// Con SwiftShader, «(program)» es el dibujo por software y ronda el 90 %: lo
// que sirve es el reparto del resto.
import { chromium } from '@playwright/test';
import { readdirSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
const [file, query, wait, span, target] = process.argv.slice(2);
const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const dir = readdirSync(root).filter((d) => /^chromium-\d+$/.test(d)).sort().reverse()[0];
const browser = await chromium.launch({ executablePath: join(root, dir, 'chrome-win64', 'chrome.exe'), args: ['--use-gl=swiftshader', '--enable-unsafe-swiftshader'] });
const tab = await browser.newPage({ viewport: { width: 1180, height: 820 } });
await tab.goto('file:///' + resolve(file).split(String.fromCharCode(92)).join('/') + '?' + query);
await tab.waitForTimeout(Number(wait) * 1000);
const cdp = await tab.context().newCDPSession(tab);
await cdp.send('Profiler.enable'); await cdp.send('Profiler.setSamplingInterval', { interval: 200 }); await cdp.send('Profiler.start');
await tab.waitForTimeout(Number(span) * 1000);
const { profile } = await cdp.send('Profiler.stop');
const byId = new Map(profile.nodes.map((n) => [n.id, n]));
const parent = new Map(); for (const n of profile.nodes) for (const c of n.children ?? []) parent.set(c, n.id);
// tiempo total (inclusivo) por función, y cadenas hacia arriba del objetivo
const incl = new Map(); const chains = new Map();
for (let i = 0; i < profile.samples.length; i += 1) {
  const dt = profile.timeDeltas[i] ?? 0; let id = profile.samples[i]; const seen = new Set(); const stack = [];
  while (id !== undefined) { const f = byId.get(id).callFrame; const k = `${f.functionName || '(anon)'}@${f.lineNumber}`; stack.push(k); if (!seen.has(k)) { seen.add(k); incl.set(k, (incl.get(k) ?? 0) + dt); } id = parent.get(id); }
  const at = stack.findIndex((k) => k.startsWith(target + '@'));
  if (at >= 0) { const c = stack.slice(at, at + 7).join(' < '); chains.set(c, (chains.get(c) ?? 0) + dt); }
}
const total = profile.timeDeltas.reduce((a, b) => a + b, 0);
console.log('INCLUSIVE');
for (const [k, v] of [...incl.entries()].sort((a, b) => b[1] - a[1]).slice(0, 45)) console.log(((v / total) * 100).toFixed(1).padStart(5) + '%', k);
console.log('CHAINS of', target);
for (const [k, v] of [...chains.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6)) console.log(((v / total) * 100).toFixed(2).padStart(6) + '%', k);
await browser.close();
