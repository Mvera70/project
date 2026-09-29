// Crea cinco páginas de prueba aisladas, manteniendo el DOM común de screen.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const dir = path.dirname(fileURLToPath(import.meta.url));
const demoDir = path.join(dir, 'demos-portada');
const source = fs.readFileSync(path.join(dir, 'screen.html'), 'utf8');
const demos = [
  ['01-desfiladero', 'El desfiladero', '#3b2e22', '#3b2e22', 'none'],
  ['02-atlas', 'Atlas del valle', '#3b2e22', '#3b2e22', 'none'],
  ['03-tapiz', 'El tapiz azul', '#f4e9d3', '#d9c8aa', 'none'],
  ['04-anochecer', 'Luces en la garganta', '#f4e9d3', '#d9c8aa', 'none'],
  ['05-paso-piedra', 'La puerta del valle', '#3b2e22', '#3b2e22', '0 1px 1px #fffaf0'],
];

for (const [id, label, secondaryInk, languageInk, labelShadow] of demos) {
  const styles = `<style>body.v9-after .v9-title-bg{background-image:url('demos-portada/${id}.png')!important}body.v9-after .v9-title-number-label,body.v9-after .v9-title-secondary{color:${secondaryInk}}body.v9-after .v9-title-language{color:${languageInk}}body.v9-after .v9-title-primary{background-color:transparent}body.v9-after .v9-title-number-label{text-shadow:${labelShadow}}</style>`;
  const page = source.replace('</head>', `${styles}</head>`);
  fs.writeFileSync(path.join(dir, `demo-${id}.html`), page);
}

const gallery = `<!doctype html><html lang="es"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>The Valley · cinco portadas</title><style>
*{box-sizing:border-box}body{margin:0;padding:24px;background:#251c14;color:#f1e5cf;font:17px/1.4 Georgia,serif}h1,h2{font-family:Georgia,serif;letter-spacing:.04em}h1{font-size:28px}.intro{max-width:820px}.selected{color:#eed493}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(390px,390px));gap:22px;margin-top:22px}figure{margin:0}figcaption{margin:0 0 8px;color:#e2ce9f;font-size:14px;letter-spacing:.05em}iframe{display:block;width:390px;height:844px;border:1px solid #95784e;background:#1a140f}nav{display:flex;gap:16px;flex-wrap:wrap;margin:18px 0}a{color:#e9d6a5}</style></head><body><main><p>THE VALLEY · V9 · DIRECCIONES DE PORTADA</p><h1>Cinco escenas, el mismo logo y los mismos controles</h1><p class="intro">Cada panel monta el DOM común de la portada con una imagen de fondo distinta. Los PNG de origen y sus prompts están enlazados debajo de cada prueba. El 29 de septiembre Vera eligió 04 · Luces en la garganta para la portada. El modo día/noche y cualquier animación quedan para más adelante.</p><p class="selected">Dirección elegida: 04 · Luces en la garganta. Las otras cuatro permanecen como alternativas archivadas.</p><nav><a href="../README.md">README de la tanda</a><a href="../../propuesta-texturas-v9-2026-09-29.md">Propuesta V9</a></nav><section class="grid">${demos.map(([id,label])=>`<figure><figcaption>${id} · ${label}${id==='04-anochecer'?' · ELEGIDA':''} · <a href="${id}.png">PNG original</a></figcaption><iframe title="${label}" src="../demo-${id}.html?scene=title&amp;skin=after" width="390" height="844"></iframe></figure>`).join('')}</section></main></body></html>`;
fs.writeFileSync(path.join(demoDir, 'index.html'), gallery);
console.log('Cinco páginas de portada y demos-portada/index.html listos.');
