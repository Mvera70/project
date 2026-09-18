// B-1 · El ritmo del juego, en horas de reloj de pared.
//
// **La unidad de este informe no son años de juego: son horas a ×1**, y esa es
// toda su razón de existir. El dueño del diseño puso el objetivo en esa unidad
// —«hay que llegar a la edad de piedra en 60/70 horas; el año es lo de menos»—
// y el proyecto llevaba desde v3.72 midiendo en años sin darse cuenta de que el
// reloj se había multiplicado por 56: una semana pasó de 15 s a catorce
// minutos, así que un año pasó de doce minutos a once horas y **todos los
// umbrales del §12 quedaron calibrados contra un reloj que ya no existe**. Este
// informe es lo que hace visible ese desajuste, y hay que volver a pasarlo cada
// vez que se toque `REAL_MS_PER_TICK` o cualquier número que decida cuándo pasa
// algo.
//
//   npx tsx tools/pace-report.ts                 # 24 semillas × 60 años
//   npx tsx tools/pace-report.ts --seeds 8 --years 30
//
// Lo que imprime, por cada peldaño de la escalera: la mediana en horas, el
// reparto entre valles y en cuántos valles llega. Y al pie, lo que dice si el
// caos sigue vivo: cuántas partidas se acaban y con qué causa.

import { TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog';
import { run } from '../src/engine/sim';
import { foundGame } from '../src/engine/found';
import { population } from '../src/engine/people/demography';
import { crownRefusal } from '../src/engine/people/crown';
import { ringClosed } from '../src/engine/world/placement';
import type { GameState } from '../src/engine/state';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEED_COUNT = arg('seeds', 24);
const YEARS = arg('years', 60);
const SEEDS = Array.from({ length: SEED_COUNT }, (_, i) => 3 + i * 7);

const alive = (s: GameState, kind: string): number =>
  s.buildings.filter((b) => b.kind === kind && b.lostTick === null).length;

/** La escalera: lo que un jugador vería llegar, en el orden en que llega. */
const LADDER: readonly (readonly [string, (s: GameState) => boolean])[] = [
  ['primer suceso del valle', (s) => s.happenings.length >= 1],
  ['5 personas', (s) => population(s) >= 5],
  ['segunda casa', (s) => alive(s, 'house') + alive(s, 'stone_house') >= 2],
  ['primera decisión', (s) => s.crossroad !== null || s.history.length >= 1],
  ['10 personas', (s) => population(s) >= 10],
  ['pozo', (s) => alive(s, 'well') >= 1],
  ['15 personas', (s) => population(s) >= 15],
  ['granero', (s) => alive(s, 'granary') >= 1],
  ['capilla', (s) => alive(s, 'chapel') >= 1],
  ['20 personas', (s) => population(s) >= 20],
  ['herrería', (s) => alive(s, 'smithy') >= 1],
  ['primera piedra', (s) => s.village.stone > 0],
  ['muralla', (s) => alive(s, 'palisade') >= 1],
  ['EDAD DE PIEDRA (1ª obra)', (s) => s.buildings.some((b) => b.tier > 0 && b.lostTick === null)],
  ['molino', (s) => alive(s, 'mill') >= 1],
  ['corona posible', (s) => crownRefusal(s) !== 'small'],
  ['30 personas', (s) => population(s) >= 30],
  // A1 · el peldaño de la fase 3 (§1b): la villa cerrada, que es lo que un
  // asedio necesita para tener contra qué llegar.
  ['portón', (s) => s.buildings.some((b) => b.kind === 'gate' && b.lostTick === null)],
  // B1 · el primer asalto del clan vecino (§1b): la primera vez que el valle
  // paga por lo que ha juntado.
  ['primer asalto', (s) => s.threat.raids > 0],
  ['VILLA CERRADA', (s) => ringClosed(s)],
];

const hits = new Map(LADDER.map(([name]) => [name, [] as number[]]));
const causes = new Map<string, number>();
const finalPop: number[] = [];
let lowMoraleWeeks = 0;
let weeks = 0;

for (const seed of SEEDS) {
  const state = foundGame(seed);
  const left = new Map(LADDER.map(([name, gate]) => [name, gate] as const));
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    run(state, 1, 'prudent', CATALOG);
    weeks += 1;
    if (state.village.morale < 25) lowMoraleWeeks += 1;
    for (const [name, gate] of [...left]) {
      if (gate(state)) { hits.get(name)!.push(state.tick); left.delete(name); }
    }
  }
  finalPop.push(population(state));
  if (state.ended !== null) {
    causes.set(state.ended.cause, (causes.get(state.ended.cause) ?? 0) + 1);
  }
}

const hours = (ticks: number): number => (ticks * TIME.REAL_MS_PER_TICK) / 3_600_000;
const fmt = (ticks: number): string => {
  const h = hours(ticks);
  return h < 1 ? `${Math.round(h * 60)} min` : `${h.toFixed(h < 10 ? 1 : 0)} h`;
};
const median = (xs: readonly number[]): number => {
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};

console.log(`\n## El ritmo, en horas de reloj a ×1 · ${SEEDS.length} semillas × ${YEARS} años · prudent`);
console.log(`   una semana = ${(TIME.REAL_MS_PER_TICK / 60_000).toFixed(0)} min · un año = ${hours(TIME.WEEKS_PER_YEAR).toFixed(1)} h\n`);
console.log('| peldaño | mediana | año | reparto | valles |');
console.log('|---|---:|---:|---|---:|');
for (const [name] of LADDER) {
  const xs = hits.get(name)!;
  if (xs.length === 0) { console.log(`| ${name} | — | — | nunca | 0/${SEEDS.length} |`); continue; }
  const m = median(xs);
  console.log(`| ${name} | **${fmt(m)}** | ${(m / TIME.WEEKS_PER_YEAR).toFixed(1)} | ${fmt(Math.min(...xs))}–${fmt(Math.max(...xs))} | ${xs.length}/${SEEDS.length} |`);
}
const ended = [...causes.values()].reduce((a, b) => a + b, 0);
console.log(`\npoblación al final: mediana ${median(finalPop)} · reparto ${Math.min(...finalPop)}–${Math.max(...finalPop)}`);
console.log(`partidas acabadas: ${ended}/${SEEDS.length}${ended > 0 ? ` (${[...causes].map(([c, n]) => `${c} ${n}`).join(', ')})` : ''}`);
console.log(`semanas con el ánimo por debajo de 25: ${Math.round((lowMoraleWeeks / weeks) * 100)} %`);
