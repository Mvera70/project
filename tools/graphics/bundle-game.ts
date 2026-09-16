// G-07 · El juego entero en una pagina, para jugarlo desde el movil.
//
// Hubo un tiempo en que esto tenia un hermano, `bundle-pilot.ts`, que armaba el
// banco del piloto: un lienzo, unos botones y nada mas. Servia para mirar el
// valle y no para lo otro que hace falta mirar, que es **si se entiende lo que
// pasa**: la tira de §11.1.1, las encrucijadas de §11.2, la cronica, la ficha al
// tocar. Desde G-12 el juego es el 3D y el piloto no existe, asi que el banco
// se fue con el (V-12) y esto quedo como la unica via.
//
// Esto empaqueta el juego de verdad: `index.html`, los
// GLB dentro en base64 y el javascript incrustado, para que la pagina se abra
// sola sin servidor detras.

import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync, rmSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { WANTED } from '../../src/render3d/renderer';

/** Con `--split`, la página y los recursos viajan en dos ficheros. */
const SPLIT = process.argv.includes('--split');
/** Cómo se llama el JSON de recursos, y por dónde lo pide la página. */
const SIDECAR = 'valley-assets.json';

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
// **Dos cosas distintas que antes eran la misma.** Un id que está en el catálogo
// y no tiene GLB promovido es un olvido y sigue siendo un error. Pero desde
// V-15b la lista `WANTED` pide también los modelos que el taller **todavía no
// ha entregado** —niño, anciano, granjero, leñador…— para que se carguen solos
// el día que existan, y ésos no están en el catálogo siquiera: no son un
// olvido, son lo que viene. Se saltan y se dicen en voz alta, no en silencio,
// para que la lista de lo que falta sea visible en cada empaquetado. El
// cargador (`assets.ts`) ya los toleraba; el empaquetador no, y rompió el
// primer intento de demo tras V-15b con «Sin promover: villager-child, …».
const catalogued = new Set(
  (JSON.parse(readFileSync(resolve(ROOT, 'art', 'catalog.json'), 'utf8')) as { assets: { id: string }[] })
    .assets.map((asset) => asset.id),
);
const missing = WANTED.filter((id) => embedded[id] === undefined);
const forgotten = missing.filter((id) => catalogued.has(id));
const notYet = missing.filter((id) => !catalogued.has(id));
if (forgotten.length > 0) throw new Error(`Sin promover: ${forgotten.join(', ')}.`);
if (notYet.length > 0) console.warn(`Aún sin modelo (se cargarán solos cuando existan): ${notYet.join(', ')}.`);

await build({
  root: ROOT,
  base: './',
  logLevel: 'error',
  // `--split` deja los recursos **fuera** de la página, en un JSON al lado.
  // Cuatro megas de base64 dentro del HTML es lo que hace que el publicador de
  // artefactos rechace la página por tamaño, y sin un enlace la demo no se
  // puede jugar desde el móvil — que es lo único para lo que existe.
  define: SPLIT
    ? { VALLEY_ASSETS_URL: JSON.stringify(SIDECAR) }
    : { VALLEY_ASSETS: JSON.stringify(embedded) },
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
// Y la capa de vida del Anexo E encendida: es lo que esta demo viene a ensenar.
// Desde G-12 no hace falta forzar nada: el 3D y la vida son lo que el juego
// hace por defecto (`ui/backend.ts`, `render3d/renderer.ts`). Esta línea ponía
// las dos banderas a mano y ya no tiene nada que poner.

const target = resolve(OUT, 'valley.html');
writeFileSync(target, page);
rmSync(resolve(OUT, 'index.html'), { force: true });

if (SPLIT) {
  writeFileSync(resolve(OUT, SIDECAR), JSON.stringify(embedded));
  // **Y la misma página sin su esqueleto**, que es lo que pide el publicador:
  // él pone el `<!doctype>`, el `<head>` y el `<body>` por su cuenta, y dos
  // juegos de etiquetas en la misma página es una página con dos cabeceras.
  // El charset y el viewport los pone él también.
  let bare = page;
  for (const tag of [
    /^\s*<!doctype html>\s*/iu, /<html[^>]*>\s*/iu, /\s*<head>\s*/iu,
    /\s*<\/head>\s*/iu, /\s*<body>\s*/iu, /\s*<\/body>\s*/iu, /\s*<\/html>\s*$/iu,
  ]) bare = bare.replace(tag, '\n');
  bare = bare.slice(bare.indexOf('<title>'));
  writeFileSync(resolve(OUT, 'artifact.html'), `${bare.trim()}\n`);
}
process.stdout.write(
  `${Object.keys(embedded).length} recursos · ${(page.length / 1024 / 1024).toFixed(2)} MB · ${target}\n`,
);
