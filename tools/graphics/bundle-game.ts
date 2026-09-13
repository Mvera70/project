// G-07 · El juego entero en una pagina, para jugarlo desde el movil.
//
// `bundle-pilot.ts` arma el banco de pruebas: un lienzo, unos botones y nada
// mas. Sirve para mirar el valle y no sirve para lo otro que hace falta mirar,
// que es **si se entiende lo que pasa**: la tira de §11.1.1, las encrucijadas
// de §11.2, la cronica, la ficha al tocar. Todo eso esta en el juego y no en el
// banco.
//
// Esto empaqueta el juego de verdad: `index.html` con el render 3D forzado, los
// GLB dentro en base64 y el javascript incrustado, para que la pagina se abra
// sola sin servidor detras.

import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WANTED } from '../../src/render3d/renderer';

const ROOT = resolve(import.meta.dirname, '..', '..');
const ASSETS = resolve(ROOT, 'public', 'assets', 'valley3d');
const OUT = resolve(ROOT, 'artifacts', 'graphics', 'G-10', 'game');

const embedded: Record<string, string> = {};
for (const file of readdirSync(ASSETS)) {
  if (!file.endsWith('.glb')) continue;
  const id = file.slice(0, -4);
  if (!WANTED.includes(id)) continue;
  embedded[id] = readFileSync(resolve(ASSETS, file)).toString('base64');
}
const missing = WANTED.filter((id) => embedded[id] === undefined);
if (missing.length > 0) throw new Error(`Sin promover: ${missing.join(', ')}.`);

await build({
  root: ROOT,
  base: './',
  logLevel: 'error',
  define: { VALLEY_ASSETS: JSON.stringify(embedded) },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    // Un solo trozo: la pagina no puede pedir nada por la red, asi que no puede
    // haber importaciones dinamicas que se queden sin resolver.
    rollupOptions: { output: { inlineDynamicImports: true } },
  },
});

// Vite deja el HTML con `<script src>` y `<link href>`; aqui se meten dentro.
let page = readFileSync(resolve(OUT, 'index.html'), 'utf8');
const assets = resolve(OUT, 'assets');

/**
 * Mete un fichero dentro de la pagina, en el sitio de la etiqueta que lo pedia.
 *
 * **Se corta y se pega a mano en vez de usar `String.replace`.** El javascript
 * minificado lleva secuencias como `$&` dentro, y `replace` las interpreta como
 * patrones de sustitucion: la primera version metio la propia etiqueta
 * `<script src=...>` en mitad del codigo de Three.js, y la pagina abria con un
 * error de sintaxis.
 */
function inline(html: string, tag: RegExp, replacement: string): string {
  const found = tag.exec(html);
  if (found === null) throw new Error(`No se encontro la etiqueta de ${tag.source}.`);
  return html.slice(0, found.index) + replacement + html.slice(found.index + found[0].length);
}

if (existsSync(assets)) {
  for (const name of readdirSync(assets)) {
    // `public/` se copia entero al construir, asi que aqui hay tambien carpetas
    // y mapas de fuentes que no pintan nada.
    if (!name.endsWith('.js') && !name.endsWith('.css')) continue;
    const body = readFileSync(resolve(assets, name), 'utf8');
    if (name.endsWith('.js')) {
      page = inline(
        page,
        new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`, 'u'),
        `<script type="module">
${body}
</script>`,
      );
    } else {
      page = inline(
        page,
        new RegExp(`<link[^>]*href="[^"]*${name}"[^>]*>`, 'u'),
        `<style>
${body}
</style>`,
      );
    }
  }
  rmSync(assets, { recursive: true, force: true });
}

// Fuera el manifiesto y los iconos: la pagina viaja sola y esos ficheros no
// viajan con ella. El registro del service worker se queda porque ya falla
// callado (`.catch(() => undefined)`), y quitarlo seria tocar el juego para la
// demo en vez de la demo para el juego.
page = page.replace(/\s*<link rel="manifest"[^>]*>/u, '')
  .replace(/\s*<link rel="icon"[^>]*>/u, '')
  .replace(/\s*<link rel="apple-touch-icon"[^>]*>/u, '');

// El render 3D, sin tener que escribir `?render=3d` a mano: quien abre esta
// pagina viene a ver el piloto.
page = page.replace('</head>', "<script>try{localStorage.setItem('valley.render','pilot3d');}catch(e){}</script></head>");

const target = resolve(OUT, 'valley.html');
writeFileSync(target, page);
rmSync(resolve(OUT, 'index.html'), { force: true });
process.stdout.write(
  `${Object.keys(embedded).length} recursos · ${(page.length / 1024 / 1024).toFixed(2)} MB · ${target}\n`,
);
