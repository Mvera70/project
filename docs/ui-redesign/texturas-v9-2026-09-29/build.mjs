// V9: láminas documentales antes/después. No importa ni edita componentes del juego.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(dir, '../../..');
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const write = (name, data) => fs.writeFileSync(path.join(dir, name), data);
const rel = file => '../../../' + file.replaceAll('\\', '/');
const esc = s => String(s).replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;').replaceAll('"', '&quot;');
const manifestPath = path.join(dir, 'manifest.generated.json');
if (!fs.existsSync(manifestPath)) {
  console.log('Falta manifest.generated.json: el padre está terminando la generación/exportación de ImageGen.');
  process.exit(0);
}
const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
const expected = JSON.parse(fs.readFileSync(path.join(dir, 'manifest.plan.json'), 'utf8'));
for (const item of manifest) {
  const asset = path.join(dir, 'assets', item.id + '.png');
  if (!fs.existsSync(asset)) console.warn('Pendiente de exportar: ' + asset);
}

const v8dir = path.join(root, 'docs/ui-redesign/laminas-v8-2026-09-28');
let screen = fs.readFileSync(path.join(v8dir, 'index.html'), 'utf8');
// Conserva los cuatro prototipos aprobados como base de geometría y textos.
screen = screen.replaceAll("url('assets/", "url('../laminas-v8-2026-09-28/assets/");
const v9css = fs.readFileSync(path.join(dir, 'v9.css'), 'utf8');
screen = screen.replace('</style>', v9css + '\n</style>');
const statusText = JSON.parse(fs.readFileSync(path.join(root,'docs/ui-redesign/laminas-v6-2026-09-28/bank.snapshot.json'),'utf8'))['cart.some'];
// Reutiliza el dado existente; no dibuja un icono nuevo para la propuesta.
const dieSource = read('src/ui/screens/title.ts').match(/reroll\.innerHTML = ([\s\S]*?);/)[1];
const dieSVG = [...dieSource.matchAll(/'([^']*)'/g)].map(match => match[1]).join('');
const titleScreen = `
 const titleMarkup = '<div class="v9-title"><div class="v9-title-bg"></div><div class="v9-title-frame"></div>' +
   '<img class="v9-title-logo" src="${rel('public/ui/art/title-logo-en.png')}" alt="The Valley">' +
   '<img class="v9-title-engraving" src="${rel('public/ui/art/title-valley-engraving.png')}" alt="Engraving of a medieval valley">' +
   '<div class="v9-title-number-wrap"><span class="v9-title-number-label">VALLEY NUMBER</span><div class="v9-title-number-row"><label class="v9-title-number">4234150394</label><button class="v9-title-reroll" aria-label="Choose another valley">${dieSVG}</button></div></div>' +
   '<button class="v9-title-primary">FOUND A NEW VALLEY</button><button class="v9-title-secondary">THE ANNALS</button>' +
   '<button class="v9-title-language">ENGLISH</button></div>';
 const readingMarkup = '<div class="v9-reading" style="background-image:url(\\'${rel('docs/interfaz/2026-09-27/ui/026-encrucijada.jpg')}\\')">' +
   '<section class="v9-reading-panel"><h1 class="v9-reading-title">Six Men and a Horse</h1>' +
   '<p class="v9-reading-copy">They came out of the north wood at noon so that everyone would see them. They want a third of the granary and they will be back in the spring.</p>' +
   '<article class="v9-reading-option"><strong>PAY THEM</strong><span>And every spring after</span></article>' +
   '<article class="v9-reading-option"><strong>FIGHT THEM</strong><span>Edith leads it</span></article>' +
   '<article class="v9-reading-option"><strong>WALL THE VILLAGE FIRST</strong><span>They take the harvest while the ditch is dug</span></article>' +
   '</section></div>';
 const route = new URLSearchParams(location.search).get('scene');
 if (route === 'title' || route === 'crossroads') {
   const stage = document.getElementById('screen');
   stage.innerHTML = route === 'title' ? titleMarkup : readingMarkup;
 }
 if (route === 'valley' || route === 'board') {
   const controls = document.querySelector('.ctrls');
   if (controls && !controls.querySelector('.hunt-round')) {
     const hunt = document.createElement('div'); hunt.className = 'rbtn hunt-round'; hunt.setAttribute('aria-hidden','true');
     hunt.innerHTML = '<svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M10.6 3.5c-2.4 3.2-3.4 8.4-2.1 13.4.6 2.2 3.4 2.1 3.5-.3.3-4.8-.2-9.6-1.4-13.1z"/><path d="M13.4 3.5c2.4 3.2 3.4 8.4 2.1 13.4-.6 2.2-3.4 2.1-3.5-.3-.3-4.8-.2-9.6 1.4-13.1z"/></svg>';
     controls.append(hunt);
   }
   const speed = document.querySelectorAll('.ctrls .rbtn')[1]; if (speed) speed.classList.add('on');
   const open = document.querySelector('.open-cart');
   if (open && !open.querySelector('.status-strip')) { const status = document.createElement('div'); status.className='status-strip'; status.textContent=${JSON.stringify(statusText)}; open.prepend(status); }
 }
 const skin = new URLSearchParams(location.search).get('skin') || 'after';
 document.body.classList.add('v9-' + skin);
 if (skin === 'before' && (route === 'title' || route === 'crossroads')) {
   const file = route === 'title' ? '002-menu.jpg' : '026-encrucijada.jpg';
   document.getElementById('screen').innerHTML = '<img class="v9-historical" alt="Archived game capture, 27 September 2026" src="../../../docs/interfaz/2026-09-27/ui/' + file + '">';
 }
`;
screen = screen.replace('</body>', '<script>' + titleScreen + '</script></body>');
write('screen.html', screen);

const screens = [
  ['valley', 'Valle'], ['chronicle', 'Crónica'], ['cart', 'Carro'],
  ['board', 'Tablón'], ['title', 'Portada'], ['crossroads', 'Encrucijada'],
];
const gallery = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Valley · Piel V9</title>
<style>${v9css}
@font-face{font-family:EB Garamond;src:url('${rel('src/ui/redesign/fonts/garamond.woff2')}') format('woff2')}
@font-face{font-family:Cinzel;src:url('${rel('src/ui/redesign/fonts/cinzel.woff2')}') format('woff2')}
*{box-sizing:border-box}body{margin:0;background:#241c15;color:#eee3ce;font:16px/1.45 EB Garamond,Georgia,serif}.review{max-width:1120px;margin:auto;padding:32px}.review h1,.review h2{font-family:Cinzel,serif}.review h1{font-size:30px}.review h2{font-size:20px;margin:30px 0 10px}.lead{max-width:760px}.pair{display:grid;grid-template-columns:repeat(2,minmax(0,390px));gap:16px;align-items:start}.pair figure{margin:0}.pair figcaption{padding:4px 0;color:#e0c995;font-family:Cinzel,serif;font-size:12px;letter-spacing:.05em}.pair iframe{display:block;width:390px;height:844px;border:1px solid #95784e;background:#1a140f}.links{display:flex;gap:18px;flex-wrap:wrap;margin:18px 0}.links a{color:#efd89f}.samples{display:grid;grid-template-columns:390px 390px;gap:24px}.v9-piece-grid{display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap}.v9-piece{margin:0;padding:14px;background:#d9cfbc;color:#322a21}.v9-piece figcaption{font:12px/1.5 monospace;margin-bottom:10px}.v9-piece .stage{width:max-content;min-width:72px;min-height:40px;display:flex;align-items:center;justify-content:center;background:#cfc4b0}.v9-piece img{display:block;max-width:none;object-fit:fill}
</style></head><body><main class="review"><p>THE VALLEY · 29 SEPTIEMBRE 2026 · V9</p><h1>La misma interfaz, con materiales renovados</h1><p class="lead">Se conserva la disposición de cada lámina y se intercambia la piel. Las capturas «antes» son reconstrucciones documentales cuando no hay un prototipo aislado: imitan el material antiguo sobre la misma composición. Portada y encrucijada se reconstruyeron a partir de las capturas históricas; se indica así para no presentarlas como captura del juego actual.</p><nav class="links"><a href="pieces.html">Piezas a tamaño CSS</a><a href="tiles.html">Losetas 2 × 2</a><a href="../propuesta-texturas-v9-2026-09-29.md">Propuesta y método</a><a href="manifest.plan.json">Manifiesto de generación</a></nav>
${screens.map(([id,label]) => { const beforeLabel = ['title','crossroads'].includes(id) ? 'Antes · reconstrucción documental' : 'Antes · V8'; return `<section><h2>${label}</h2><div class="pair"><figure><figcaption>${beforeLabel} · 390 × 844</figcaption><iframe title="${label} antes" src="screen.html?scene=${id}&amp;skin=before" width="390" height="844"></iframe></figure><figure><figcaption>Después · piezas V9 · 390 × 844</figcaption><iframe title="${label} después" src="screen.html?scene=${id}&amp;skin=after" width="390" height="844"></iframe></figure></div></section>`; }).join('')}
</main></body></html>`;
write('index.html', gallery
  .replace(/<h1>La misma interfaz[\s\S]*?<nav class="links">/, '<h1>Texturas V9 · verificación de diseño</h1><p class="lead">Vera ha elegido la portada del anochecer (04). El modo día/noche y la animación quedan aplazados. Cuatro vistas parten de las maquetas V8; portada y encrucijada comparan capturas históricas del 27 de septiembre con propuestas nuevas. Son diseños documentales, sin integración en el juego.</p><nav class="links"><a href="demos-portada/index.html">Exploración de cinco portadas</a>')
  .replaceAll('Antes · reconstrucción documental', 'Antes · captura histórica 27 sep')
  .replace('<h2>Portada</h2>', '<h2>Portada · anochecer elegido</h2>'));

const revisedPieces = [
  {id:'title-valley · nueva portada',css:[390,844],size:[780,1688],previewPath:'revision-portada/title-valley.png'},
  {id:'plaque-brass · nueva acción de portada',css:[200,46],size:[400,92],slice:[18,18,18,18],previewPath:'revision-portada/plaque-brass.png'},
];
const pieces = manifest.filter(item => fs.existsSync(path.join(dir, 'assets', item.id + '.png'))).concat(revisedPieces).map(item => {
  const [w,h] = item.css;
  const slice = item.slice ? ` · nueve partes: ${JSON.stringify(item.slice)}` : '';
  return `<figure class="v9-piece"><figcaption>${esc(item.id)}<br>Uso ${w} × ${h} CSS · PNG ${item.size.join(' × ')}${slice}</figcaption><div class="stage"><img src="${item.previewPath || 'assets/'+item.id+'.png'}" width="${w}" height="${h}" alt="${esc(item.id)}"></div></figure>`;
}).join('');
const piecePage = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V9 · Piezas a tamaño CSS</title><style>${v9css}
@font-face{font-family:EB Garamond;src:url('${rel('src/ui/redesign/fonts/garamond.woff2')}') format('woff2')}*{box-sizing:border-box}body{margin:0;background:#241c15;color:#eee3ce;font:16px/1.4 EB Garamond,Georgia,serif}.review{max-width:1200px;margin:auto;padding:32px}.grid{display:flex;gap:18px;flex-wrap:wrap;align-items:flex-start}.v9-piece{margin:0;padding:12px;background:#d9cfbc;color:#322a21}.v9-piece figcaption{font:12px/1.5 monospace;margin:0 0 8px}.v9-piece .stage{width:max-content;min-width:72px;min-height:36px;background:#cfc4b0;display:flex;align-items:center;justify-content:center}.v9-piece img{display:block;max-width:none}</style></head><body><main class="review"><p>THE VALLEY · V9</p><h1>Hoja de piezas · tamaño de uso CSS</h1><p>Vista al 100 % de CSS. Las piezas mantienen el alfa; las losetas están en mosaico a su tamaño nominal y los marcos se comparan con el manifiesto.</p><p><a href="index.html">Volver a las comparativas</a></p><div class="grid">${pieces}</div></main></body></html>`;
write('pieces.html', piecePage);
const tileIds = ['wood-board','parchment-sheet','title-bg','paper-document'].filter(id => fs.existsSync(path.join(dir,'assets',id+'.png')));
const tilePage = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>V9 · Revisión de losetas</title><style>@font-face{font-family:EB Garamond;src:url('${rel('src/ui/redesign/fonts/garamond.woff2')}') format('woff2')}@font-face{font-family:Cinzel;src:url('${rel('src/ui/redesign/fonts/cinzel.woff2')}') format('woff2')}*{box-sizing:border-box}body{margin:0;padding:28px;background:#241c15;color:#eee3ce;font:17px/1.4 EB Garamond,Georgia,serif}h1{font-family:Cinzel,serif;font-size:28px}.grid{display:flex;flex-direction:column;gap:24px}.tile{margin:0}.tile figcaption{margin-bottom:8px;color:#e8d5a9}.swatch{display:block;background-repeat:repeat;border:1px solid #c6ae7c;box-shadow:0 4px 14px #0007}</style></head><body><p>THE VALLEY · V9</p><h1>Losetas 2 × 2 a tamaño CSS real</h1><p>La madera y el fondo de portada repiten a 256 × 256 CSS px; el papel de hoja y el pergamino de documento repiten a 512 × 512 CSS px. Cada muestra cubre dos repeticiones en ambos ejes.</p><p><a href="index.html">Volver a las comparativas</a></p><main class="grid">${tileIds.map(id => { const size = ['wood-board','title-bg'].includes(id) ? 256 : 512; return `<figure class="tile"><figcaption>${id} · tile ${size} × ${size} CSS · mosaico 2 × 2</figcaption><div class="swatch" style="width:${size*2}px;height:${size*2}px;background-size:${size}px ${size}px;background-image:url('assets/${id}.png')"></div></figure>`; }).join('')}</main></body></html>`;
write('tiles.html', tilePage);
console.log('V9: screen.html, seis comparativas, piezas CSS y losetas 2 × 2.');
