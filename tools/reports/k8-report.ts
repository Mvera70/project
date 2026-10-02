// K8+K9 · Cuándo llegan la capilla, la herrería y la iglesia, y qué aprieta
// entonces. 2 oct 2026.
//
// La pregunta de la ronda (docs/plan-meta.md, K8 y K9): si la herrería y la
// iglesia van a tener un tablón que se toca, ¿existen a tiempo para que
// importe? Y si desde ellas se va a inclinar la aldea hacia un recurso, ¿qué
// recurso aprieta en cada tramo de la partida? Se mide en horas a ×1 (la unidad
// en la que Vera pone los objetivos) y con `run` y la política prudente, nunca
// con `tick` en un bucle (CLAUDE.md, la trampa de v2.0).
//
//   npx tsx tools/reports/k8-report.ts                 # 12 semillas × 60 años
//   npx tsx tools/reports/k8-report.ts --seeds 6 --years 40

import { TIME } from '../../src/engine/balance';
import { CATALOG } from '../../src/engine/crossroads/catalog';
import { foundGame } from '../../src/engine/found';
import { population } from '../../src/engine/people/demography';
import { run } from '../../src/engine/sim';
import type { GameState } from '../../src/engine/state';
import { ringClosed } from '../../src/engine/world/placement';
import { nextProject } from '../../src/engine/world/works';
import { alive } from './ladder';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEED_COUNT = arg('seeds', 12);
const YEARS = arg('years', 60);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 3 + i * 7);

const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s.length === 0 ? Number.NaN : s[Math.floor(s.length / 2)]!;
};
const fmt = (h: number): string => (Number.isNaN(h) ? '—' : `${h.toFixed(h < 10 ? 1 : 0)} h`);
const roles = (s: GameState, role: string): number =>
  s.people.villagers.filter((p) => p.diedTick === null && p.leftTick === null && p.role === role).length;

/** Los tramos de una partida, por lo que ya está en pie. */
type Phase = 'sin capilla' | 'capilla, sin herrería' | 'herrería, sin cerco' | 'villa cerrada';
const PHASES: readonly Phase[] = ['sin capilla', 'capilla, sin herrería', 'herrería, sin cerco', 'villa cerrada'];
const phaseOf = (s: GameState): Phase => {
  if (ringClosed(s)) return 'villa cerrada';
  if (alive(s, 'smithy') > 0) return 'herrería, sin cerco';
  if (alive(s, 'chapel') + alive(s, 'church') > 0) return 'capilla, sin herrería';
  return 'sin capilla';
};

interface Tally { weeks: number; hungry: number; waitingWood: number; lowMorale: number; stone: number[]; silver: number[]; faith: number[] }
const tallies = new Map(PHASES.map((p) => [p, { weeks: 0, hungry: 0, waitingWood: 0, lowMorale: 0, stone: [], silver: [], faith: [] } as Tally]));

const arrivals = { chapel: [] as number[], smithy: [] as number[], church: [] as number[], priest: [] as number[], smith: [] as number[] };
const popAt = { chapel: [] as number[], smithy: [] as number[], church: [] as number[] };
let ended = 0;

for (const seed of SEEDS) {
  const state = foundGame(seed);
  const seen = new Set<string>();
  const mark = (key: keyof typeof arrivals, ok: boolean): void => {
    if (!ok || seen.has(key)) return;
    seen.add(key);
    arrivals[key].push(hours(state.tick));
    if (key in popAt) popAt[key as keyof typeof popAt].push(population(state));
  };
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    run(state, 1, 'prudent', CATALOG);
    mark('chapel', alive(state, 'chapel') + alive(state, 'church') > 0);
    mark('smithy', alive(state, 'smithy') > 0);
    mark('church', alive(state, 'church') > 0);
    mark('priest', roles(state, 'priest') > 0);
    mark('smith', roles(state, 'smith') > 0);
    const tally = tallies.get(phaseOf(state))!;
    tally.weeks += 1;
    // Hambre: menos grano que una semana de comer.
    if (state.village.grain < population(state)) tally.hungry += 1;
    // Una obra esperando madera: la habría con madera de sobra y no la hay.
    if (nextProject(state) === null && nextProject({ ...state }, Number.POSITIVE_INFINITY) !== null) tally.waitingWood += 1;
    if (state.village.morale < 40) tally.lowMorale += 1;
    tally.stone.push(state.village.stone);
    tally.silver.push(state.village.silver);
    tally.faith.push(state.village.faith);
  }
  if (state.ended !== null) ended += 1;
}

const n = SEEDS.length;
console.log(`\n## Capilla, herrería e iglesia · ${n} semillas × ${YEARS} años · prudent · horas a ×1\n`);
console.log('| llega | mediana | reparto | valles | gente entonces (mediana) |');
console.log('|---|---:|---|---:|---:|');
for (const [label, key] of [['capilla (o iglesia)', 'chapel'], ['cura', 'priest'], ['herrería', 'smithy'], ['herrero', 'smith'], ['iglesia (capilla de piedra)', 'church']] as const) {
  const xs = arrivals[key];
  const pop = key in popAt ? median(popAt[key as keyof typeof popAt]) : Number.NaN;
  console.log(`| ${label} | **${fmt(median(xs))}** | ${xs.length === 0 ? 'nunca' : `${fmt(Math.min(...xs))}–${fmt(Math.max(...xs))}`} | ${xs.length}/${n} | ${Number.isNaN(pop) ? '—' : pop} |`);
}
console.log(`\n## Qué aprieta en cada tramo (fracción de semanas; existencias en mediana)\n`);
console.log('| tramo | semanas | hambre | obra esperando madera | ánimo < 40 | piedra | plata | fe |');
console.log('|---|---:|---:|---:|---:|---:|---:|---:|');
const pct = (a: number, b: number): string => (b === 0 ? '—' : `${Math.round((100 * a) / b)} %`);
for (const phase of PHASES) {
  const t = tallies.get(phase)!;
  console.log(`| ${phase} | ${t.weeks} | ${pct(t.hungry, t.weeks)} | ${pct(t.waitingWood, t.weeks)} | ${pct(t.lowMorale, t.weeks)} | ${median(t.stone)} | ${median(t.silver)} | ${median(t.faith)} |`);
}
console.log(`\npartidas acabadas: ${ended}/${n}`);
