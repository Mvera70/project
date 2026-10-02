// K9 · Inclinar hacia un recurso: ¿hay alguna opción dominada o alguna que
// mate aldeas? 2 oct 2026.
//
// Las palancas de órdenes de v2.0 se retiraron porque eran una trampa: sólo
// vivía la postura de fábrica y `timber` a 0,2 mataba 11 aldeas de 16
// (`docs/historico/plan-medios.md` §1). Esto juega las mismas semillas con una
// estrategia por opción de los tablones de K8 —pedirla cada vez que se pueda—
// y mide lo que cada una debería mover. Una opción vale si **mejora lo suyo**
// (las hachas, la madera; las rejas, el grano; los herrajes, la plata; la misa,
// el ánimo; la rogativa, el grano guardado) **sin matar aldeas**, y ninguna es
// la mejor en todo.
//
// Se juega con `run` y la política prudente, nunca con `tick` en un bucle.
//
//   npx tsx tools/reports/tilt-report.ts                 # 8 semillas × 40 años
//   npx tsx tools/reports/tilt-report.ts --seeds 12 --years 60

import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';
import type { GameState, PlayerAct } from '../../src/engine/state';
import { ritesOpen, smithyOrdersOpen } from '../../src/engine/world/boards';
import { nextProject } from '../../src/engine/world/works';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEED_COUNT = arg('seeds', 8);
const YEARS = arg('years', 40);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 3 + i * 7);

type Strategy = 'nada' | 'hachas' | 'rejas' | 'herrajes' | 'misa' | 'rogativa';
const STRATEGIES: Record<Strategy, (s: GameState) => readonly PlayerAct[]> = {
  nada: () => [],
  hachas: (s) => (smithyOrdersOpen(s).find((o) => o.id === 'axes')!.refusal === null ? [{ kind: 'smithy', order: 'axes' }] : []),
  rejas: (s) => (smithyOrdersOpen(s).find((o) => o.id === 'ploughshares')!.refusal === null ? [{ kind: 'smithy', order: 'ploughshares' }] : []),
  herrajes: (s) => (smithyOrdersOpen(s).find((o) => o.id === 'ironware')!.refusal === null ? [{ kind: 'smithy', order: 'ironware' }] : []),
  misa: (s) => (ritesOpen(s).find((r) => r.id === 'mass')!.refusal === null ? [{ kind: 'rite', rite: 'mass' }] : []),
  rogativa: (s) => (ritesOpen(s).find((r) => r.id === 'rogation')!.refusal === null ? [{ kind: 'rite', rite: 'rogation' }] : []),
};

interface Row {
  ended: number; pop: number[]; acts: number[]; waitingWood: number; hungry: number; lowMorale: number; weeks: number;
  silver: number[]; grain: number[]; morale: number[]; built: number[];
}
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : s[Math.floor(s.length / 2)]!;
};
const mean = (xs: readonly number[]): number => xs.reduce((a, b) => a + b, 0) / Math.max(1, xs.length);

const rows = new Map<Strategy, Row>();
for (const name of Object.keys(STRATEGIES) as Strategy[]) {
  const row: Row = { ended: 0, pop: [], acts: [], waitingWood: 0, hungry: 0, lowMorale: 0, weeks: 0, silver: [], grain: [], morale: [], built: [] };
  for (const seed of SEEDS) {
    const state = foundGame(seed);
    let acts = 0;
    const silver: number[] = [], grain: number[] = [], morale: number[] = [];
    for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
      run(state, 1, 'prudent', CATALOG, (s) => { const a = STRATEGIES[name](s); acts += a.length; return a; });
      row.weeks += 1;
      if (state.village.grain < population(state)) row.hungry += 1;
      if (nextProject(state) === null && nextProject({ ...state }, Number.POSITIVE_INFINITY) !== null) row.waitingWood += 1;
      if (state.village.morale < 40) row.lowMorale += 1;
      silver.push(state.village.silver); grain.push(state.village.grain); morale.push(state.village.morale);
    }
    if (state.ended !== null) row.ended += 1;
    row.pop.push(population(state));
    row.acts.push(acts);
    row.silver.push(mean(silver)); row.grain.push(mean(grain)); row.morale.push(mean(morale));
    row.built.push(state.buildings.filter((b) => b.lostTick === null).length);
  }
  rows.set(name, row);
  process.stderr.write(`${name} hecho\n`);
}

const pct = (a: number, b: number): string => `${Math.round((100 * a) / Math.max(1, b))} %`;
console.log(`\n## K9 · cada opción pedida siempre que se pueda · ${SEEDS.length} semillas × ${YEARS} años · prudent\n`);
console.log('| estrategia | actos (mediana) | acabadas | gente al final | edificios | obra esperando madera | hambre | ánimo < 40 | plata media | grano medio | ánimo medio |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|---:|');
for (const [name, r] of rows) {
  console.log(`| ${name} | ${median(r.acts)} | ${r.ended}/${SEEDS.length} | ${median(r.pop)} | ${median(r.built)} | ${pct(r.waitingWood, r.weeks)} | ${pct(r.hungry, r.weeks)} | ${pct(r.lowMorale, r.weeks)} | ${mean(r.silver).toFixed(1)} | ${Math.round(mean(r.grain))} | ${mean(r.morale).toFixed(1)} |`);
}
// Quién gana en qué: la mejor estrategia por cada medida.
const best = (label: string, value: (r: Row) => number, higher: boolean): void => {
  const sorted = [...rows].sort((a, b) => (higher ? value(b[1]) - value(a[1]) : value(a[1]) - value(b[1])));
  console.log(`- ${label}: **${sorted[0]![0]}** (${sorted.map(([n, r]) => `${n} ${value(r).toFixed(1)}`).join(', ')})`);
};
console.log('\n### La mejor en cada cosa\n');
best('menos obra esperando madera (%)', (r) => (100 * r.waitingWood) / r.weeks, false);
best('menos hambre (%)', (r) => (100 * r.hungry) / r.weeks, false);
best('más plata media', (r) => mean(r.silver), true);
best('más ánimo medio', (r) => mean(r.morale), true);
best('más grano medio', (r) => mean(r.grain), true);
best('más gente al final (mediana)', (r) => median(r.pop), true);
