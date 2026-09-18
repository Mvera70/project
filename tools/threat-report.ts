// B1 · El clan del valle vecino, medido. §1b.
//
// Qué vale un valle visto desde fuera, cuándo baja el vecino, con cuántos, y
// qué se lleva. La unidad sigue siendo la hora de reloj a ×1 (B-1): a catorce
// minutos por semana, una hora real es un mes de juego.
//
//   npx tsx tools/threat-report.ts [--seeds 16] [--years 80]

import { TIME } from '../src/engine/balance';
import { CATALOG } from '../src/engine/crossroads/catalog';
import { run } from '../src/engine/sim';
import { foundGame } from '../src/engine/found';
import { worthOf } from '../src/engine/world/threat';
import { population } from '../src/engine/people/demography';

const arg = (name: string, fallback: number): number => {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 && process.argv[i + 1] !== undefined ? Number(process.argv[i + 1]) : fallback;
};
const SEEDS = Array.from({ length: arg('seeds', 16) }, (_, i) => 3 + i * 11);
const YEARS = arg('years', 80);

const med = (xs: readonly number[]): number => {
  if (xs.length === 0) return NaN;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)]!;
};
const hrs = (t: number): string => `${((t * TIME.REAL_MS_PER_TICK) / 3_600_000).toFixed(0)} h`;

const worthAt40: number[] = [];
const firstRaid: number[] = [];
const raidCounts: number[] = [];
const bands: number[] = [];
const silverTaken: number[] = [];
let walledRaids = 0;
let openRaids = 0;
let noRaid = 0;

for (const seed of SEEDS) {
  const state = foundGame(seed);
  let first: number | null = null;
  for (let t = 1; t <= YEARS * TIME.WEEKS_PER_YEAR && state.ended === null; t += 1) {
    const before = state.threat.raids;
    const silver = state.village.silver;
    for (const report of run(state, 1, 'prudent', CATALOG)) {
      for (const entry of report.entries) {
        if (entry.templateKey === 'raid.walled') walledRaids += 1;
        if (entry.templateKey === 'raid.open') openRaids += 1;
        if (entry.templateKey.startsWith('raid.') && entry.templateKey !== 'raid.beast') {
          bands.push(Number(entry.params['count'] ?? 0));
          silverTaken.push(Math.max(0, silver - state.village.silver));
        }
      }
    }
    if (state.threat.raids > before && first === null) first = t;
    if (t === 40 * TIME.WEEKS_PER_YEAR) worthAt40.push(Math.round(worthOf(state)));
  }
  if (first === null) noRaid += 1; else firstRaid.push(first);
  raidCounts.push(state.threat.raids);
  console.log(`semilla ${seed}: ${state.threat.raids} asaltos`
    + (first === null ? ' · ninguno' : ` · el primero en el año ${(first / 48).toFixed(1)} = ${hrs(first)}`)
    + ` · fuerza del clan ${state.threat.strength.toFixed(0)}`
    + ` · vale ${Math.round(worthOf(state))} · ${population(state)} personas`);
}

console.log(`\n${SEEDS.length} semillas × ${YEARS} años · prudent`);
console.log(`lo que vale un valle al año 40: mediana ${med(worthAt40)} · reparto ${Math.min(...worthAt40)}–${Math.max(...worthAt40)}`);
console.log(`primer asalto: mediana año ${(med(firstRaid) / 48).toFixed(1)} = ${hrs(med(firstRaid))} · valles sin ninguno: ${noRaid}/${SEEDS.length}`);
console.log(`asaltos por partida: mediana ${med(raidCounts)} · reparto ${Math.min(...raidCounts)}–${Math.max(...raidCounts)}`);
console.log(`la partida que baja: mediana ${med(bands)} hombres · reparto ${bands.length ? Math.min(...bands) : 0}–${bands.length ? Math.max(...bands) : 0}`);
console.log(`plata que se llevan: mediana ${med(silverTaken)}`);
console.log(`tras muralla ${walledRaids} · a campo abierto ${openRaids}`);
