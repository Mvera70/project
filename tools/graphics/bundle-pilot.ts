// G-10 · La demo publicable, en una sola página. design.md D.5, Anexo D.
//
// El jugador no está delante del equipo de desarrollo, así que la única forma
// de que juzgue una ronda es una página que se abra sola. Esto la arma: Vite
// sobre `pilot.html`, con **todos los GLB aprobados metidos dentro en base64**,
// y el resultado incrustado en `pilot-page.html`.
//
// Vivió tres rondas en el scratchpad de la sesión, y el handover lo anotaba
// como fragilidad con estas palabras: «si la plantilla se ha perdido…». Se ha
// perdido dos veces. Aquí no se pierde.
//
// Los recursos que entran son **los que el renderer pide**, importando su
// lista: una página con recursos que nadie dibuja pesa de balde, y una a la que
// le falte uno enseña cajas grises. Esto se raspaba del fichero con expresiones
// regulares y se dejó fuera los juncos sin que nadie lo notara.

import { build } from 'vite';
import { WANTED } from '../../src/render3d/renderer';
import { readFileSync, readdirSync, writeFileSync, rmSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const ASSETS = resolve(ROOT, 'public', 'assets', 'valley3d');
const TEMPLATE = resolve(ROOT, 'tools', 'graphics', 'pilot-page.html');
const OUT = resolve(ROOT, 'artifacts', 'graphics', 'G-10', 'pilot');

const wanted = [...WANTED];
const embedded: Record<string, string> = {};
for (const file of readdirSync(ASSETS)) {
  if (!file.endsWith('.glb')) continue;
  const id = file.slice(0, -4);
  if (!wanted.includes(id)) continue;
  embedded[id] = readFileSync(resolve(ASSETS, file)).toString('base64');
}
const missing = wanted.filter((id) => embedded[id] === undefined);
if (missing.length > 0) {
  // Un recurso sin promover no llega a `public/`, y la demo lo enseñaría como
  // caja gris sin decir por qué. Mejor no publicar que publicar a medias.
  throw new Error(`Sin promover: ${missing.join(', ')}. Ejecuta publish-assets.ts.`);
}

await build({
  root: ROOT,
  logLevel: 'error',
  define: { VALLEY_ASSETS: JSON.stringify(embedded) },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    // Todo dentro: la página se publica sola, sin servidor que le sirva nada.
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: resolve(ROOT, 'tools', 'graphics', 'pilot.html') },
  },
});

const bundle = readdirSync(resolve(OUT, 'assets')).find((name) => name.endsWith('.js'));
if (bundle === undefined) throw new Error('Vite no dejó ningún bundle.');
const code = readFileSync(resolve(OUT, 'assets', bundle), 'utf8');
const template = readFileSync(TEMPLATE, 'utf8');
const marker = '<script type="module">';
const at = template.indexOf(marker);
if (at < 0) throw new Error('La plantilla no tiene <script type="module">.');
const page = `${template.slice(0, at + marker.length)}\n${code}\n${template.slice(template.indexOf('</script>', at))}`;
const target = resolve(OUT, 'pilot.html');
writeFileSync(target, page);
rmSync(resolve(OUT, 'assets'), { recursive: true, force: true });
process.stdout.write(
  `${Object.keys(embedded).length} recursos · ${(page.length / 1024 / 1024).toFixed(2)} MB · ${target}\n`,
);
