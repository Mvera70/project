// La hoja de todos los modelos publicados, para juzgar de un vistazo cuáles
// rehacer. Uso: node tools/graphics/model-sheet.mjs [--out artifacts/graphics/models]
// Escribe una PNG por modelo y `models-sheet.png` con todos, agrupados y con su
// nombre y su tamaño en celdas. Lee `public/assets/valley3d/manifest.json`: lo
// que sale es exactamente lo que el juego carga.
import { build } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { chromium } from '@playwright/test';

const args = process.argv.slice(2);
const out = args.includes('--out') ? args[args.indexOf('--out') + 1] : 'artifacts/graphics/models';
mkdirSync(out, { recursive: true });
const assets = 'public/assets/valley3d/';
const manifest = JSON.parse(readFileSync(assets + 'manifest.json', 'utf8'));
const bytes = Object.fromEntries(manifest.assets.map((a) => [a.id, readFileSync(assets + a.file).toString('base64')]));
const result = await build({
  entryPoints: ['tools/graphics/model-sheet.ts'], bundle: true, write: false, format: 'esm',
  define: { SHEET_BYTES: JSON.stringify(bytes), SHEET_MANIFEST: JSON.stringify(manifest) },
});
const page = resolve(out, 'model-sheet.html');
writeFileSync(page, `<!doctype html><meta charset="utf-8"><script type="module">${result.outputFiles[0].text}</script>`);

// Grupos por nombre, para que la hoja se lea por familias.
const GROUPS = [
  ['Animales', /^(cow|pig|hen|wolf|crow|fish|partridge|rabbit|deer|boar|bear|dog|fox|duck|mule)$/u],
  ['Aldeanos', /^villager/u],
  ['Edificios', /^(house|stone-house|granary|mill|smithy|chapel|church|hall|well|fountain|shed|field|grave-yard|ruin)/u],
  ['Defensa', /^(palisade|wall|gate|bastion|watchtower|e3b-|tower)/u],
  ['Herramientas y armas', /^(axe|hoe|pickaxe|plough|spear|bow|arrow|sling|shield|stick|bucket|ball|bundle|handcart|log-pile|haystack)/u],
  ['Naturaleza', /^(tree|rock|reed|scrub|ford|bear-den)/u],
];
const groupOf = (id) => GROUPS.find(([, re]) => re.test(id))?.[0] ?? 'Otros';

const root = join(homedir(), 'AppData', 'Local', 'ms-playwright');
const exe = readdirSync(root).filter((d) => /^chromium-\d+$/u.test(d)).sort().reverse()
  .map((d) => join(root, d, 'chrome-win64', 'chrome.exe')).find(existsSync);
const browser = await chromium.launch({ executablePath: exe, args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const tab = await browser.newPage({ viewport: { width: 360, height: 360 } });
  const errors = [];
  tab.on('pageerror', (e) => errors.push(String(e)));
  await tab.goto(pathToFileURL(page).href);
  await tab.waitForFunction(() => window.sheetReady === true, null, { timeout: 120_000 });
  const shots = [];
  for (const asset of manifest.assets) {
    const shot = await tab.evaluate((id) => window.shoot(id), asset.id);
    if (shot === null) { console.log(`${asset.id}: no se pudo instanciar`); continue; }
    writeFileSync(join(out, `${asset.id}.png`), Buffer.from(shot.image.split(',')[1], 'base64'));
    shots.push({ id: asset.id, group: groupOf(asset.id), image: shot.image, size: shot.size });
  }
  const order = [...GROUPS.map(([name]) => name), 'Otros'];
  const html = '<html lang="es"><meta charset="utf-8"><body style="margin:0;background:#eee8dc;font:14px sans-serif;color:#2b2620">'
    + `<div style="padding:12px 16px;font-size:20px">The Valley · todos los modelos publicados (${shots.length})</div>`
    + order.map((name) => {
      const list = shots.filter((s) => s.group === name);
      if (list.length === 0) return '';
      return `<div style="padding:8px 16px 2px;font-size:17px;font-weight:bold">${name} (${list.length})</div><div>`
        + list.map((s) => `<div style="display:inline-block;width:180px;margin:4px 6px;vertical-align:top">`
          + `<img style="display:block;width:180px;height:180px" src="${s.image}">`
          + `<div style="font-weight:bold">${s.id}</div><div style="color:#6b6258">${s.size.map((v) => v.toFixed(2)).join(' × ')} celdas</div></div>`).join('')
        + '</div>';
    }).join('') + '</body></html>';
  writeFileSync(join(out, 'models-sheet.html'), html);
  await tab.setViewportSize({ width: 1600, height: 900 });
  await tab.setContent(html);
  await tab.evaluate(() => Promise.all([...document.images].map((img) => img.decode())));
  await tab.screenshot({ path: join(out, 'models-sheet.png'), fullPage: true });
  if (errors.length > 0) console.log('Errores de página:', errors);
  console.log(`${shots.length} modelos · ${join(out, 'models-sheet.png')}`);
} finally {
  await browser.close();
}
