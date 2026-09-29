// Captura los seis pares a 390 × 844 y las hojas al 100 % CSS con Edge.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { chromium } from 'playwright';

const dir = path.dirname(fileURLToPath(import.meta.url));
const expected = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.plan.json'), 'utf8'));
const missing = expected.flatMap(item => {
  const file = path.join(dir, 'assets', item.id + '.png');
  return fs.existsSync(file) ? [] : [item.id];
});
if (missing.length) {
  console.error('Capturas pospuestas: faltan piezas exportadas: ' + missing.join(', '));
  process.exit(2);
}
const out = path.join(dir, 'capturas');
fs.mkdirSync(out, { recursive: true });
const browser = await chromium.launch({ headless: true, channel: 'msedge' });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1 });
page.setDefaultTimeout(15000);
const scenes = [
  ['valley','valle'], ['chronicle','cronica'], ['cart','carro'],
  ['board','tablon'], ['title','portada'], ['crossroads','encrucijada'],
];
const screenFile = pathToFileURL(path.join(dir, 'screen.html')).href;
async function waitForArtwork(tab) {
  await tab.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map(img => img.decode().catch(() => undefined)));
    const urls = new Set();
    for (const element of document.querySelectorAll('*')) {
      const style = getComputedStyle(element);
      for (const value of [style.backgroundImage, style.borderImageSource]) {
        for (const match of value.matchAll(/url\(["']?(.*?)["']?\)/g)) urls.add(match[1]);
      }
    }
    await Promise.all([...urls].map(src => new Promise((resolve, reject) => {
      const image = new Image(); image.onload = resolve; image.onerror = () => reject(new Error('CSS image failed: ' + src)); image.src = src;
    })));
  });
  const missingImages = await tab.evaluate(() => [...document.images].filter(img => !img.complete || !img.naturalWidth).map(img => img.src));
  if (missingImages.length) throw new Error('Imágenes sin cargar: ' + missingImages.join(', '));
}
for (const [scene, slug] of scenes) {
  const files = {};
  for (const skin of ['before','after']) {
    const url = screenFile + `?scene=${scene}&skin=${skin}`;
    await page.goto(url, { waitUntil: 'load' });
    await waitForArtwork(page);
    files[skin] = path.join(out, `${slug}-${skin}-390x844.png`);
    await page.screenshot({ path: files[skin], type: 'png' });
  }
  // Un composite legible: dos pantallas íntegramente capturadas a 390 × 844.
  const pair = await browser.newPage({ viewport: { width: 800, height: 900 }, deviceScaleFactor: 1 });
  const before = 'data:image/png;base64,' + fs.readFileSync(files.before).toString('base64');
  const after = 'data:image/png;base64,' + fs.readFileSync(files.after).toString('base64');
  const beforeLabel = ['portada','encrucijada'].includes(slug) ? 'ANTES · CAPTURA HISTÓRICA · 27 SEP' : 'ANTES · V8';
  const afterLabel = slug === 'portada' ? 'PORTADA 04 · ELEGIDA' : 'DESPUÉS · PROPUESTA V9';
  await pair.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#251c14;color:#e9d9b8;font:12px Georgia,serif;display:flex;gap:8px;width:max-content}.col{width:390px}.label{height:28px;padding:7px 9px;background:#3b2b1d;letter-spacing:.08em;text-transform:uppercase}img{display:block;width:390px;height:844px}</style><div class="col"><div class="label">${beforeLabel} · ${slug} · 390 × 844</div><img src="${before}"></div><div class="col"><div class="label">${afterLabel} · ${slug} · 390 × 844</div><img src="${after}"></div>`);
  await pair.evaluate(async () => Promise.all([...document.images].map(img => img.decode())));
  await pair.screenshot({ path: path.join(out, `${slug}-antes-despues-390x844.png`), fullPage: true });
  await pair.close();
}

// Cinco fondos con un único DOM y controles; 04 y 05 son las favoritas actuales.
const coverDemos = [
  ['01-desfiladero','El desfiladero'], ['02-atlas','Atlas del valle'],
  ['03-tapiz','El tapiz azul'], ['04-anochecer','Luces en la garganta'],
  ['05-paso-piedra','La puerta del valle'],
];
for (const [id] of coverDemos) {
  const url = pathToFileURL(path.join(dir, `demo-${id}.html`)).href + '?scene=title&skin=after';
  await page.goto(url, { waitUntil: 'load' });
  await waitForArtwork(page);
  await page.screenshot({ path: path.join(out, `portada-${id}-390x844.png`), type: 'png' });
}
const finalists = await browser.newPage({ viewport: { width: 800, height: 890 }, deviceScaleFactor: 1 });
const finalistShots = ['04-anochecer','05-paso-piedra'].map(id => fs.readFileSync(path.join(out, `portada-${id}-390x844.png`)).toString('base64'));
await finalists.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:0;background:#251c14;color:#e9d9b8;font:13px Georgia,serif;display:flex;gap:8px;width:max-content}.col{width:390px}.label{height:34px;padding:8px;background:#3b2b1d;letter-spacing:.06em;text-transform:uppercase}img{display:block;width:390px;height:844px}</style><div class="col"><div class="label">04 · FAVORITA · SIN GANADORA</div><img src="data:image/png;base64,${finalistShots[0]}"></div><div class="col"><div class="label">05 · FAVORITA · SIN GANADORA</div><img src="data:image/png;base64,${finalistShots[1]}"></div>`);
await finalists.evaluate(async () => Promise.all([...document.images].map(img => img.decode())));
await finalists.screenshot({ path: path.join(out, 'portada-finalistas-04-05-390x844.png'), fullPage: true });
await finalists.close();

const sheet = await browser.newPage({ viewport: { width: 1380, height: 1100 }, deviceScaleFactor: 1 });
await sheet.goto(pathToFileURL(path.join(dir, 'pieces.html')).href, { waitUntil: 'load' });
await waitForArtwork(sheet);
await sheet.screenshot({ path: path.join(dir, 'hoja-piezas-v9.png'), fullPage: true });
await sheet.goto(pathToFileURL(path.join(dir, 'tiles.html')).href, { waitUntil: 'load' });
await waitForArtwork(sheet);
await sheet.screenshot({ path: path.join(dir, 'hoja-losetas-2x2.png'), fullPage: true });
const cards = scenes.map(([scene, slug]) => {
  const shot = fs.readFileSync(path.join(out, `${slug}-after-390x844.png`)).toString('base64');
  const status = slug === 'portada' ? '· 04 elegida' : '· propuesta';
  return `<figure><figcaption>${slug} ${status}</figcaption><img src="data:image/png;base64,${shot}"></figure>`;
}).join('');
await sheet.setViewportSize({ width: 1260, height: 900 });
await sheet.setContent(`<!doctype html><meta charset="utf-8"><style>*{box-sizing:border-box}body{margin:0;padding:18px;background:#251c14;color:#e9d9b8;font:14px Georgia,serif}.grid{display:grid;grid-template-columns:repeat(3,390px);gap:10px;justify-content:center}figure{margin:0;min-width:0}figcaption{height:24px;background:#3b2b1d;padding:5px 8px;text-transform:uppercase;letter-spacing:.06em}img{display:block;width:390px;height:844px}</style><main class="grid">${cards}</main>`);
await sheet.screenshot({ path: path.join(out, 'contacto-v9.jpg'), type: 'jpeg', quality: 90, fullPage: true });
await browser.close();
console.log('V9: 12 pantallas individuales, 6 comparativas, contacto, hoja de piezas y revisión 2×2 capturadas.');
