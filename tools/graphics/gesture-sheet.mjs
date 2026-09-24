// IA-anim · Hoja de contactos de un gesto fabricado, sin partida.
//
//   node tools/graphics/gesture-sheet.mjs chop            → aldeano leñador
//   node tools/graphics/gesture-sheet.mjs mine --model villager-mason
//   node tools/graphics/gesture-sheet.mjs chop --frames 10 --out artifacts/graphics/IA-anim/gestures
//   node tools/graphics/gesture-sheet.mjs sow --views front,three   (vistas: side, front, three)
//
// Doce fotogramas repartidos por un ciclo, de lado y en tres cuartos, más la
// posición de la mano y de la cabeza de la herramienta en cada uno: el golpe
// tiene que bajar hasta el tronco o la roca, no quedarse en el aire.
import { build } from 'esbuild';
import { readFileSync, writeFileSync, readdirSync, existsSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { homedir } from 'node:os';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const opt = (name, fallback) => { const i = args.indexOf(`--${name}`); return i >= 0 ? args[i + 1] : fallback; };
const clip = args[0];
if (clip === undefined || clip.startsWith('--')) throw new Error('Uso: gesture-sheet.mjs <clip> [--model id] [--frames N] [--out dir]');
const model = opt('model', 'villager-woodcutter');
const frames = Number(opt('frames', '12'));
const dir = opt('out', 'artifacts/graphics/IA-anim/gestures');
mkdirSync(dir, { recursive: true });

const assets = 'public/assets/valley3d/';
const all = JSON.parse(readFileSync(assets + 'manifest.json', 'utf8'));
const manifest = { ...all, assets: all.assets.filter(a => a.id === model) };
if (manifest.assets.length === 0) throw new Error(`Modelo no publicado: ${model}`);
const bytes = Object.fromEntries(manifest.assets.map(a => [a.id, readFileSync(assets + a.file).toString('base64')]));
const result = await build({ entryPoints: ['tools/graphics/gesture-sheet.ts'], bundle: true, write: false, format: 'esm',
  alias: { '@engine': './src/engine', '@derive': './src/derive' },
  define: { PREVIEW_BYTES: JSON.stringify(bytes), PREVIEW_MANIFEST: JSON.stringify(manifest), PREVIEW_ID: JSON.stringify(model) } });
const page = `${dir}/${clip}-bench.html`;
writeFileSync(page, `<!doctype html><meta charset="utf-8"><script type="module">${result.outputFiles[0].text}</script>`);
const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const exe = readdirSync(root).filter(d => /^chromium-\d+$/.test(d)).sort().reverse()
  .map(d => join(root, d, 'chrome-win64', 'chrome.exe')).find(existsSync);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const tab = await browser.newPage({ viewport: { width: 360, height: 420 } });
  const errors = [];
  tab.on('pageerror', e => { errors.push(String(e)); console.log('pageerror', String(e)); });
  tab.on('console', m => { if (m.type() === 'error') console.log('console', m.text()); });
  await tab.goto(pathToFileURL(resolve(page)).href);
  await tab.waitForFunction(() => window.previewReady === true, null, { timeout: 60_000 });
  const clipSeconds = await tab.evaluate(name => (window.SECONDS ?? {})[name], clip);
  const duration = Number(opt('seconds', String(clipSeconds ?? 2)));
  const cells = [], samples = [];
  for (let i = 0; i < frames; i += 1) {
    const t = duration * i / frames;
    for (const view of opt('views', 'side,three').split(',')) {
      const sample = await tab.evaluate(({ clip, t, view }) => window.pose(clip, t, view), { clip, t, view });
      const png = await tab.evaluate(() => document.querySelector('canvas').toDataURL('image/png'));
      cells.push({ png, label: `${t.toFixed(2)} s · ${view}` });
      if (view === opt('views', 'side,three').split(',')[0]) samples.push({ t: Number(t.toFixed(3)), ...sample });
    }
  }
  await tab.setContent('<body style="margin:0;background:#b7c3b2;font:13px sans-serif">'
    + cells.map(c => `<div style="display:inline-block;width:180px"><img style="width:180px" src="${c.png}"><div>${c.label}</div></div>`).join('') + '</body>');
  await tab.setViewportSize({ width: 180 * 8, height: 800 });
  await tab.evaluate(() => Promise.all([...document.images].map(img => img.decode())));
  await tab.screenshot({ path: `${dir}/${clip}-${model}-sheet.png`, fullPage: true });
  writeFileSync(`${dir}/${clip}-${model}.json`, JSON.stringify({ clip, model, duration, errors, samples }, null, 2) + '\n');
  if (errors.length > 0 || samples.some(s => !s.finite)) throw new Error(JSON.stringify(errors));
  console.log(`${clip} · ${model}: ${frames} fotogramas → ${dir}/${clip}-${model}-sheet.png`);
} finally { await browser.close(); }
