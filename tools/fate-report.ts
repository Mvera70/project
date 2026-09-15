// Qué le pasa al valle por su cuenta. design.md §7.10, §12.10, R-1.
//
// Mide los sucesos del valle tal como el jugador los vive: cuántos al año, de
// qué clase, y —lo que importa para la esencia del juego— **cuánto se parecen
// dos valles**. Es lo que fijó los pesos de `FATE` antes de escribirlos, y lo
// que hay que volver a mirar si alguien los toca.
//
//   npx tsx tools/fate-report.ts [semillas...] [--years 40]
//
// Juega la partida con `run` y la política prudente —no con `tick`— por la
// razón que `tools/works-report.ts` cuenta en su cabecera.

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { grudges } from '@engine/people/opinions';
import { run } from '@engine/sim';
import { HAPPENINGS, type HappeningId } from '@engine/state';

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 40;
const given = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--years').map(Number);
const seeds = given.length > 0 ? given : [3, 7, 11, 23, 41, 97];

const perSeed = new Map<number, Map<HappeningId, number>>();
const totals = new Map<HappeningId, number>();
let allEvents = 0;
let allYears = 0;

for (const seed of seeds) {
  const state = foundGame(seed);
  const years = (() => {
    let n = 0;
    for (; n < YEARS && state.ended === null; n += 1) run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    return Math.max(1, n);
  })();
  const own = new Map<HappeningId, number>();
  for (const h of state.happenings) {
    own.set(h.id, (own.get(h.id) ?? 0) + 1);
    totals.set(h.id, (totals.get(h.id) ?? 0) + 1);
  }
  perSeed.set(seed, own);
  allEvents += state.happenings.length;
  allYears += years;
  // El hueco entre sucesos, que es lo que se siente: la mediana de semanas.
  const gaps = state.happenings.slice(1).map((h, i) => h.tick - (state.happenings[i] as { tick: number }).tick).sort((a, b) => a - b);
  const median = gaps.length > 0 ? gaps[Math.floor(gaps.length / 2)] : 0;
  process.stdout.write(
    `semilla ${String(seed).padStart(3)} · ${String(state.happenings.length).padStart(4)} sucesos en ${years} años`
    + ` (${(state.happenings.length / years).toFixed(1)} al año, mediana ${median} semanas entre dos)`
    + ` · rencores ${grudges(state).length}`
    + ` · ${state.ended === null ? 'sigue' : `acabó (${state.ended.cause})`}\n`,
  );
}

process.stdout.write(`\n${allEvents} sucesos en ${allYears} años de aldea: ${(allEvents / allYears).toFixed(1)} al año\n`);
for (const id of HAPPENINGS) {
  const n = totals.get(id) ?? 0;
  const cells = seeds.map((seed) => String(perSeed.get(seed)?.get(id) ?? 0).padStart(4)).join('');
  process.stdout.write(`  ${id.padEnd(22)} ${String(n).padStart(5)} · ${(n / allYears).toFixed(2)}/año ·${cells}\n`);
}

// Cuánto se parecen dos valles: la distancia entre sus repartos, de 0 (iguales)
// a 1 (nada en común). Es la esencia del juego medida con un número.
const shares = seeds.map((seed) => {
  const own = perSeed.get(seed) ?? new Map<HappeningId, number>();
  const total = Math.max(1, [...own.values()].reduce((a, b) => a + b, 0));
  return HAPPENINGS.map((id) => (own.get(id) ?? 0) / total);
});
let pairs = 0;
let distance = 0;
for (let a = 0; a < shares.length; a += 1) {
  for (let b = a + 1; b < shares.length; b += 1) {
    const sa = shares[a] as number[];
    const sb = shares[b] as number[];
    distance += sa.reduce((sum, v, i) => sum + Math.abs(v - (sb[i] as number)), 0) / 2;
    pairs += 1;
  }
}
process.stdout.write(`\ndistancia media entre valles (0 iguales, 1 nada en común): ${(distance / Math.max(1, pairs)).toFixed(2)}\n`);
