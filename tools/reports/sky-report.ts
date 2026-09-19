// Qué cielo hace en el valle. design.md §10.7, U-13.
//
// Mide lo que el jugador va a ver: cuántas jornadas de cada clase salen en un
// año, por fila de clima, y cuántos rayos caen. Es lo que fijó las
// probabilidades de `SKY` antes de escribirlas, y lo que hay que volver a
// mirar si alguien las toca.
//
//   npx tsx tools/reports/sky-report.ts [semillas...] [--years 100]

import { TIME } from '@engine/balance';
import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { boltsInDay, skyAt, type SkyKind } from '../../src/derive/weather';

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 100;
const given = args.filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--years').map(Number);
const seeds = given.length > 0 ? given : [3, 7, 11, 23, 41, 97];

const totals = new Map<SkyKind, number>();
let bolts = 0;
let days = 0;
const byRow = new Map<number, { wet: number; days: number }>();

for (const seed of seeds) {
  const state = foundGame(seed);
  const own = new Map<SkyKind, number>();
  for (let year = 0; year < YEARS && state.ended === null; year += 1) {
    // Un año de aldea, y después se mira el cielo de sus jornadas: la fila del
    // clima es la del año en curso, que es lo que `skyAt` lee.
    const firstDay = state.tick * TIME.DAYS_PER_WEEK;
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    const lastDay = state.tick * TIME.DAYS_PER_WEEK;
    for (let day = firstDay; day < lastDay; day += 1) {
      const sky = skyAt(state, day);
      own.set(sky.kind, (own.get(sky.kind) ?? 0) + 1);
      totals.set(sky.kind, (totals.get(sky.kind) ?? 0) + 1);
      bolts += boltsInDay(state, day).length;
      days += 1;
      const row = byRow.get(state.weather.index) ?? { wet: 0, days: 0 };
      row.days += 1;
      if (sky.kind !== 'clear') row.wet += 1;
      byRow.set(state.weather.index, row);
    }
  }
  const years = Math.max(1, Math.min(YEARS, Math.ceil(state.tick / TIME.WEEKS_PER_YEAR)));
  const per = (kind: SkyKind): string => ((own.get(kind) ?? 0) / years).toFixed(1);
  process.stdout.write(
    `semilla ${String(seed).padStart(3)} · al año: tormenta ${per('storm')}`
    + ` · lluvia ${per('rain')} · nubes ${per('overcast')} · nieve ${per('snow')}`
    + ` · claro ${per('clear')}\n`,
  );
}

process.stdout.write(`\n${days} jornadas · ${bolts} rayos (${(bolts / days).toFixed(2)} por jornada)\n`);
for (const [kind, n] of [...totals].sort((a, b) => b[1] - a[1])) {
  process.stdout.write(`  ${kind.padEnd(9)} ${((n / days) * 100).toFixed(1)} %\n`);
}
process.stdout.write('\ncielo cerrado por fila de clima (0 ruinoso → 4 abundante):\n');
for (const [row, { wet, days: n }] of [...byRow].sort((a, b) => a[0] - b[0])) {
  process.stdout.write(`  fila ${row}: ${((wet / n) * 100).toFixed(1)} % de ${n} jornadas\n`);
}
