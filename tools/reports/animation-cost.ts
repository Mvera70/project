// AN-4 · Cuánto cuesta animar el reparto y la fauna por fotograma, sin navegador.
//
//   npx tsx tools/reports/animation-cost.ts [--people 100] [--animals 40] [--frames 300]
//
// Carga los GLB publicados, monta un `Cast` y una `Fauna` como los monta el
// renderer y les pide N fotogramas de una escena fija: el 60 % de la gente
// anda (el clip va por suelo recorrido, como en el juego), el resto está de
// pie, tala o se sienta; los animales trazan círculos con su rumbo y algunos
// corren, cargan o huyen. Mide con `performance.now()` lo que tardan
// `cast.show` y `fauna.paint`: mediana y p90 en milisegundos por fotograma,
// y microsegundos por cuerpo. **No dibuja**: es el coste de posar, no el de
// pintar (para llamadas y triángulos está `performance/gl-probe.mjs`), y no
// son FPS de ningún aparato. Sirve para comparar dos commits en la misma
// máquina, uno detrás de otro y sin nada más corriendo.
import { readdirSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { performance } from 'node:perf_hooks';
import { loadAssets, type AssetManifest } from '../../src/render3d/assets';
import { Cast } from '../../src/render3d/world/cast';
import { Fauna } from '../../src/render3d/effects/fauna';
import { clipTime, type ClipName } from '../../src/render3d/clips';
import type { Actor } from '../../src/render3d/contracts';
import type { Animal, AnimalKind } from '../../src/derive/animals';

const args = process.argv.slice(2);
const opt = (key: string, fallback: number): number => {
  const at = args.indexOf(`--${key}`);
  return at >= 0 ? Number(args[at + 1]) : fallback;
};
const PEOPLE = opt('people', 100), ANIMALS = opt('animals', 40), FRAMES = opt('frames', 300), WARMUP = 30;
const ROOT = resolve(import.meta.dirname, '..', '..');
const ASSETS = resolve(ROOT, 'public', 'assets', 'valley3d');

const manifest = JSON.parse(readFileSync(resolve(ASSETS, 'manifest.json'), 'utf8')) as AssetManifest;
const bytes: Record<string, ArrayBuffer> = {};
for (const file of readdirSync(ASSETS)) {
  if (!file.endsWith('.glb')) continue;
  const raw = readFileSync(resolve(ASSETS, file));
  bytes[file.slice(0, -4)] = raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength);
}
const library = await loadAssets({
  baseUrl: '/', bytes,
  manifest: { ...manifest, assets: manifest.assets.filter(asset => bytes[asset.id] !== undefined) },
});
const villager = library.get('villager');
if (villager === undefined) throw new Error('falta el aldeano publicado');
const cast = new Cast(villager, () => library.instance('villager'), (id) => library.instance(id));
const fauna = new Fauna((kind) => library.instance(kind), (kind) => library.get(kind));

const KINDS: readonly AnimalKind[] = ['hen', 'pig', 'cow', 'dog', 'fox', 'duck', 'deer', 'bear', 'wolf', 'rabbit', 'boar', 'mule', 'partridge', 'crow', 'fish'];
const PACE = 1.35, STEP = 1 / 30;
const travelled = new Float64Array(PEOPLE);

function actorsAt(seconds: number): Actor[] {
  const actors: Actor[] = [];
  for (let i = 0; i < PEOPLE; i += 1) {
    const walker = i % 5 < 3;
    if (walker) travelled[i] = (travelled[i] ?? 0) + PACE * STEP;
    const clip: ClipName = walker ? (i % 2 === 0 ? 'walk' : 'carry_walk') : i % 5 === 3 ? 'idle' : i % 2 === 0 ? 'chop' : 'sit';
    actors.push({
      id: i, x: (i % 10) * 1.5, z: Math.floor(i / 10) * 1.5, facing: i * 0.7, activity: walker ? 'walking' : 'working',
      clip, clipSeconds: clipTime(clip, travelled[i]!, seconds, (i % 11) / 11), poseSeconds: seconds,
      travelled: travelled[i]!, cell: 0, named: false, age: i % 7 === 0 ? 8 : 30, talking: false, arguing: false,
      occupation: null, role: null, load: clip === 'carry_walk' ? 'bundle' : null,
    });
  }
  return actors;
}

function animalsAt(seconds: number): Animal[] {
  const animals: Animal[] = [];
  for (let i = 0; i < ANIMALS; i += 1) {
    const kind = KINDS[i % KINDS.length]!;
    const radius = 2 + (i % 3), rate = 0.15 + (i % 4) * 0.05, angle = seconds * rate + i;
    const x = 20 + (i % 6) * 6 + Math.cos(angle) * radius, y = 20 + Math.floor(i / 6) * 6 + Math.sin(angle) * radius;
    const action = kind === 'dog' ? 'run' : kind === 'boar' ? 'charge' : kind === 'rabbit' ? 'flee' : kind === 'partridge' ? 'flight' : undefined;
    animals.push({ id: 10_000 + i, kind, x, y, facing: Math.atan2(-Math.sin(angle), Math.cos(angle)), ...(action === undefined ? {} : { action }) });
  }
  return animals;
}

const castMs: number[] = [], faunaMs: number[] = [];
for (let frame = 0; frame < FRAMES + WARMUP; frame += 1) {
  const seconds = frame * STEP;
  const actors = actorsAt(seconds), animals = animalsAt(seconds);
  const a = performance.now();
  cast.show(actors);
  const b = performance.now();
  fauna.paint(animals, seconds);
  const c = performance.now();
  if (frame >= WARMUP) { castMs.push(b - a); faunaMs.push(c - b); }
}
const stat = (list: number[]): { median: number; p90: number; mean: number } => {
  const sorted = [...list].sort((p, q) => p - q);
  return { median: sorted[Math.floor(sorted.length / 2)]!, p90: sorted[Math.floor(sorted.length * 0.9)]!, mean: list.reduce((s, v) => s + v, 0) / list.length };
};
const c = stat(castMs), f = stat(faunaMs);
console.log(`animation-cost · ${PEOPLE} personas, ${ANIMALS} animales, ${FRAMES} fotogramas (tras ${WARMUP} de calentamiento), Node ${process.version}`);
console.log(`cast.show   mediana ${c.median.toFixed(3)} ms · p90 ${c.p90.toFixed(3)} ms · media ${c.mean.toFixed(3)} ms · ${(c.median * 1000 / PEOPLE).toFixed(1)} µs por persona`);
console.log(`fauna.paint mediana ${f.median.toFixed(3)} ms · p90 ${f.p90.toFixed(3)} ms · media ${f.mean.toFixed(3)} ms · ${(f.median * 1000 / ANIMALS).toFixed(1)} µs por animal`);
console.log(`total       mediana ${(c.median + f.median).toFixed(3)} ms por fotograma de JS de animación (sin dibujar)`);
