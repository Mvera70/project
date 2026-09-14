// V-00 · Empaqueta el banco de la vida en una página suelta. Anexo E.
//
// Mismo patrón que `bundle-game.ts` y mucho más simple, porque este banco no
// necesita ni un GLB: lo que se juzga son cuerpos moviéndose, y para eso basta
// geometría de la propia librería.

import { build } from 'vite';
import { readFileSync, readdirSync, writeFileSync, rmSync, existsSync, mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '..', '..');
const OUT = resolve(ROOT, 'artifacts', 'graphics', process.argv[2] === 'village' ? 'V-06' : 'V-00');
const PAGE = resolve(ROOT, 'tools', 'graphics', process.argv[2] === 'village' ? 'bench-village.html' : 'bench-life.html');

mkdirSync(OUT, { recursive: true });

await build({
  root: resolve(ROOT, 'tools', 'graphics'),
  base: './',
  logLevel: 'error',
  resolve: {
    alias: {
      '@engine': resolve(ROOT, 'src', 'engine'),
      '@render': resolve(ROOT, 'src', 'render'),
    },
  },
  build: {
    outDir: OUT,
    emptyOutDir: true,
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    rollupOptions: { input: PAGE, output: { inlineDynamicImports: true } },
  },
});

// Vite deja el HTML pidiendo su javascript por la red; aquí se mete dentro para
// que la página viaje sola. Se corta y se pega a mano en vez de `replace`: el
// código minificado lleva secuencias como `$&` que `replace` interpretaría.
const NAME = process.argv[2] === 'village' ? 'bench-village.html' : 'bench-life.html';
let page = readFileSync(resolve(OUT, NAME), 'utf8');
const assets = resolve(OUT, 'assets');

if (existsSync(assets)) {
  for (const name of readdirSync(assets)) {
    if (!name.endsWith('.js')) continue;
    const body = readFileSync(resolve(assets, name), 'utf8');
    const tag = new RegExp(`<script[^>]*src="[^"]*${name}"[^>]*></script>`, 'u');
    const found = tag.exec(page);
    if (found === null) throw new Error(`No se encontró la etiqueta de ${name}.`);
    page = page.slice(0, found.index)
      + `<script type="module">\n${body}\n</script>`
      + page.slice(found.index + found[0].length);
  }
  rmSync(assets, { recursive: true, force: true });
}

const target = resolve(OUT, process.argv[2] === 'village' ? 'village.html' : 'life.html');
writeFileSync(target, page);
rmSync(resolve(OUT, NAME), { force: true });
process.stdout.write(`${(page.length / 1024).toFixed(0)} kB · ${target}\n`);
