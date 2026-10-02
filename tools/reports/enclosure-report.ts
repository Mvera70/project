// Pueblos que su propio cerco deja sin salida (v5.89, «el cerco sin salida»).
//
// A los N años, cuántas celdas alcanza andando la gente desde la plaza —con lo
// construido cerrando el paso como lo cierra para las rutas (`walkingBlocked`)—
// y adónde da cada portón. Lo midió por primera vez #48 (valle-forma, §6): 3 de
// 24 valles por debajo de 500 celdas a los cuarenta años. Al pie, las horas de
// reloj a ×1 de la primera muralla y de la villa cerrada, que es lo que la regla
// del portón puede mover.
//
//   npx tsx tools/reports/enclosure-report.ts                 # 24 semillas × 40 años
//   npx tsx tools/reports/enclosure-report.ts --seeds 8 --years 30
//   npx tsx tools/reports/enclosure-report.ts --only 13       # una semilla
//   npx tsx tools/reports/enclosure-report.ts --first 1 --step 1  # las semillas 1 a 24, como #48

import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { run } from '../../src/engine/sim';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { ringClosed } from '../../src/engine/world/placement';
import { floodCells, plotAccess, walkingBlocked } from '../../src/engine/world/spatial';
import { alive } from './ladder';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const YEARS = arg('years', 40);
const ONLY = arg('only', -1);
const SEEDS = ONLY >= 0 ? [ONLY] : Array.from({ length: arg('seeds', 24) }, (_, i) => arg('first', 3) + i * arg('step', 7));
const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;
const median = (xs: readonly number[]): number => [...xs].sort((a, b) => a - b)[Math.floor(xs.length / 2)] ?? NaN;

const rows: string[] = [];
const wallAt: number[] = [];
const closedAt: number[] = [];
let shut500 = 0;
let shut1200 = 0;
for (const seed of SEEDS) {
  const state = foundGame(seed);
  let wall: number | null = null;
  let closed: number | null = null;
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    run(state, 1, 'prudent', CATALOG);
    if (wall === null && alive(state, 'palisade') >= 1) wall = state.tick;
    if (closed === null && ringClosed(state)) closed = state.tick;
  }
  if (wall !== null) wallAt.push(wall);
  if (closed !== null) closedAt.push(closed);
  const blocked = walkingBlocked(state);
  // Desde las celdas libres que rodean la plaza, como `placeBuilding`: la plaza
  // misma puede tener encima el pozo.
  const seen = floodCells(state.map, blocked,
    plotAccess(state.map, blocked, { x: state.plaza.x, y: state.plaza.y, w: 1, h: 1 }));
  const reach = seen.reduce((n, v) => n + v, 0);
  if (reach < 500) shut500 += 1;
  if (reach < 1200) shut1200 += 1;
  const gates = state.buildings.filter((b) => b.kind === 'gate' && b.lostTick === null);
  rows.push(`| ${seed} | ${reach} | ${gates.map((g) => `${g.x},${g.y}`).join(' · ') || '—'} | ${ringClosed(state) ? 'sí' : 'no'} | ${population(state)} | ${state.ended?.cause ?? ''} |`);
}

console.log(`\n## El cerco sin salida · ${SEEDS.length} semillas × ${YEARS} años · prudent\n`);
console.log('| semilla | celdas alcanzables | portones | cerrada | vivos | fin |');
console.log('|---:|---:|---|---|---:|---|');
for (const row of rows) console.log(row);
console.log(`\n**Por debajo de 500 celdas: ${shut500} de ${SEEDS.length}.** Por debajo de 1 200: ${shut1200}.`);
console.log(`Primera muralla: mediana ${hours(median(wallAt)).toFixed(0)} h (${wallAt.length}/${SEEDS.length}).`
  + ` Villa cerrada: mediana ${hours(median(closedAt)).toFixed(0)} h (${closedAt.length}/${SEEDS.length}).`);
