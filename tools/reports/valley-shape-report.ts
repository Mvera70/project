// La forma del valle, medida (2 oct 2026).
//
// Vera: «el valle es muy cuadrado, debería tener una forma más natural, y hay
// zonas muy desaprovechadas» (marcó las dos laderas grandes del norte, a los
// lados de la garganta). El corazón productivo era un rectángulo de 36 × 56
// (`HEART`, `world/tiles.ts`) dentro del mapa de 72 × 112, y desde el contorno
// del valle es el que guarda cada mapa (`map.heart`, `world/valley-shape.ts`):
// el bosque y los pedregales sólo nacen dentro, sólo dentro se construye (salvo
// la defensa), y fuera la montaña cae por probabilidad según la distancia a él.
// Esto mide lo que hay y lo que se usa, dentro y fuera: se escribió para medir
// `main` antes de proponer otra forma, y mide igual la nueva. Juega con `run`
// y la política prudente (la trampa de `tick` en un bucle está contada en
// `CLAUDE.md`).
//
//   npx tsx tools/reports/valley-shape-report.ts                 # 12 semillas × 60 años
//   npx tsx tools/reports/valley-shape-report.ts --seeds 6 --years 40
//
// Por valle: celdas del corazón y de fuera por terreno al fundar; lo que se ha
// construido y dónde; el bosque talado; cuántas celdas se han pisado (tráfico
// de senda) dentro y fuera; y el prado de fuera que no toca nadie en toda la
// partida, que es lo «desaprovechado».

import { TIME, WORLD } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { run } from '../../src/engine/sim';
import { TERRAIN_CODE } from '../../src/engine/state';
import { inHeart } from '../../src/engine/world/tiles';
import { population } from '../../src/engine/people/demography';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEEDS = Array.from({ length: arg('seeds', 12) }, (_, i) => 3 + i * 7);
const YEARS = arg('years', 60);

const NAMES = Object.fromEntries(Object.entries(TERRAIN_CODE).map(([name, code]) => [code, name])) as Record<number, string>;
const pct = (a: number, b: number): string => `${(100 * a / Math.max(1, b)).toFixed(1)} %`;

interface Row {
  seed: number;
  heart: Record<string, number>;
  belt: Record<string, number>;
  built: { inside: number; outside: number; defenceOutside: number };
  trodden: { inside: number; outside: number };
  felled: number;
  idleBelt: number;
  openBelt: number;
  heartUsed: number;
  heartOpen: number;
  population: number;
  ended: string | null;
  area: number;
}

const rows: Row[] = [];
for (const seed of SEEDS) {
  const state = foundGame(seed);
  const { map } = state;
  const heart: Record<string, number> = {};
  const belt: Record<string, number> = {};
  const startTerrain = map.terrain.slice();
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    const name = NAMES[map.terrain[cell]!] ?? '?';
    const bucket = inHeart(map, cell % map.width, Math.floor(cell / map.width)) ? heart : belt;
    bucket[name] = (bucket[name] ?? 0) + 1;
  }
  const everTrodden = new Uint8Array(map.terrain.length);
  const everBuilt = new Uint8Array(map.terrain.length);
  for (let year = 0; year < YEARS && state.ended === null; year += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    for (let cell = 0; cell < map.terrain.length; cell += 1) if (map.traffic[cell]! >= WORLD.PATH_T1) everTrodden[cell] = 1;
    for (const b of state.buildings) {
      for (let y = b.y; y < b.y + b.h; y += 1) for (let x = b.x; x < b.x + b.w; x += 1) everBuilt[y * map.width + x] = 1;
    }
  }
  const built = { inside: 0, outside: 0, defenceOutside: 0 };
  const defence = new Set(['palisade', 'gate', 'wall', 'watchtower', 'bastion']);
  for (const b of state.buildings) {
    for (let y = b.y; y < b.y + b.h; y += 1) {
      for (let x = b.x; x < b.x + b.w; x += 1) {
        if (inHeart(state.map, x, y)) built.inside += 1;
        else { built.outside += 1; if (defence.has(b.kind)) built.defenceOutside += 1; }
      }
    }
  }
  let trodIn = 0, trodOut = 0, idleBelt = 0, openBelt = 0, heartUsed = 0, heartOpen = 0, felled = 0;
  for (let cell = 0; cell < map.terrain.length; cell += 1) {
    const x = cell % map.width, y = Math.floor(cell / map.width);
    const t0 = startTerrain[cell]!;
    const open = t0 === TERRAIN_CODE.meadow || t0 === TERRAIN_CODE.marsh || t0 === TERRAIN_CODE.rock || t0 === TERRAIN_CODE.forest;
    if (t0 === TERRAIN_CODE.forest && map.terrain[cell] !== TERRAIN_CODE.forest) felled += 1;
    if (inHeart(map, x, y)) {
      if (everTrodden[cell] === 1) trodIn += 1;
      if (open) { heartOpen += 1; if (everTrodden[cell] === 1 || everBuilt[cell] === 1 || map.terrain[cell] !== t0) heartUsed += 1; }
    } else {
      if (everTrodden[cell] === 1) trodOut += 1;
      if (open) { openBelt += 1; if (everTrodden[cell] === 0 && everBuilt[cell] === 0) idleBelt += 1; }
    }
  }
  rows.push({
    seed, heart, belt, built, trodden: { inside: trodIn, outside: trodOut }, felled, idleBelt, openBelt,
    heartUsed, heartOpen, population: population(state),
    ended: state.ended?.cause ?? null,
    area: map.heart.reduce((n, cell) => n + cell, 0),
  });
}

const sum = (pick: (row: Row) => number): number => rows.reduce((total, row) => total + pick(row), 0);
const heartCells = sum((r) => r.area) / rows.length;
console.log(`mapa ${WORLD.WIDTH} × ${WORLD.HEIGHT} = ${WORLD.WIDTH * WORLD.HEIGHT} celdas; corazón de ${Math.min(...rows.map((r) => r.area))} a ${Math.max(...rows.map((r) => r.area))} celdas`);
console.log(`${rows.length} semillas × ${YEARS} años, política prudente\n`);
console.log('semilla  fuera:montaña prado marisma lago  ·  construido dentro/fuera(defensa)  ·  pisado dentro/fuera  ·  prado de fuera sin tocar  ·  corazón usado  ·  talado  ·  gente');
for (const r of rows) {
  console.log(`${String(r.seed).padStart(7)}  ${String(r.belt.mountain ?? 0).padStart(13)} ${String(r.belt.meadow ?? 0).padStart(5)} ${String(r.belt.marsh ?? 0).padStart(7)} ${String(r.belt.lake ?? 0).padStart(4)}  ·  ${String(r.built.inside).padStart(9)}/${r.built.outside}(${r.built.defenceOutside})  ·  ${r.trodden.inside}/${r.trodden.outside}  ·  ${r.idleBelt} de ${r.openBelt} (${pct(r.idleBelt, r.openBelt)})  ·  ${pct(r.heartUsed, r.heartOpen)}  ·  ${r.felled}  ·  ${r.population}${r.ended ? ` (${r.ended})` : ''}`);
}
const beltCells = Math.round(WORLD.WIDTH * WORLD.HEIGHT - heartCells);
console.log(`\nmedia por valle: fuera del corazón ${beltCells} celdas, de ellas montaña ${(sum((r) => r.belt.mountain ?? 0) / rows.length).toFixed(0)}, prado ${(sum((r) => r.belt.meadow ?? 0) / rows.length).toFixed(0)}, marisma ${(sum((r) => r.belt.marsh ?? 0) / rows.length).toFixed(0)}, lago ${(sum((r) => r.belt.lake ?? 0) / rows.length).toFixed(0)}, río ${(sum((r) => r.belt.water ?? 0) / rows.length).toFixed(0)}`);
console.log(`construido fuera del corazón: ${sum((r) => r.built.outside)} celdas en ${rows.length} valles (${sum((r) => r.built.defenceOutside)} de defensa); dentro ${sum((r) => r.built.inside)}`);
console.log(`pisado (tráfico ≥ ${WORLD.PATH_T1}) fuera: ${sum((r) => r.trodden.outside)} celdas en total; dentro ${sum((r) => r.trodden.inside)}`);
console.log(`suelo abierto de fuera sin pisar ni construir en toda la partida: ${pct(sum((r) => r.idleBelt), sum((r) => r.openBelt))}`);
console.log(`suelo abierto del corazón usado (pisado, construido o cambiado): ${pct(sum((r) => r.heartUsed), sum((r) => r.heartOpen))}`);
