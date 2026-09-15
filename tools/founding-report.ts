// Cómo crece una aldea fundada por dos. design.md §5.7, §12.2.
//
// Desde el 15 sep 2026 el valle lo fundan un hombre y una mujer, y la aldea
// crece con los que llegan (`MIGRATION.ARRIVE_SMALL_BELOW`). Esto mide lo que
// esa decisión necesita saber para no ser un salto al vacío: cuánta gente hay
// al final de cada década, cuántos llegaron y cuántos nacieron, y si la aldea
// se apagó antes de tiempo.
//
//   npx tsx tools/founding-report.ts [semillas...] [--years 60]
//
// Juega la partida con `run` y la política prudente —no con `tick`— por la
// razón que `tools/works-report.ts` cuenta en su cabecera.

import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { TIME } from '@engine/balance';
import { population } from '@engine/people/demography';

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 60;
const given = args
  .filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--years')
  .map(Number);
const seeds = given.length > 0 ? given : [7, 11, 23, 31, 41, 97];

for (const seed of seeds) {
  const state = foundGame(seed);
  const byDecade: number[] = [];
  const yearly: number[] = [];
  let grainAfterFirst = 0;
  const morale: number[] = [];
  for (let year = 0; year < YEARS && state.ended === null; year += 1) {
    run(state, TIME.WEEKS_PER_YEAR, 'prudent', CATALOG);
    if (year === 0) grainAfterFirst = state.village.grain;
    if (year < 5) morale.push(Math.round(state.village.morale));
    yearly.push(population(state));
    if ((year + 1) % 10 === 0) byDecade.push(population(state));
  }
  const born = state.people.villagers.filter((v) => v.bornTick > 0).length;
  // De qué muere la gente en los primeros años: es lo que decide si dos
  // personas pueden llegar a ser veinte.
  const causes = new Map<string, number>();
  for (const v of state.people.villagers) {
    if (v.causeOfDeath !== null) causes.set(v.causeOfDeath, (causes.get(v.causeOfDeath) ?? 0) + 1);
  }
  const grain = yearly.length > 0 ? ` · grano tras año 1: ${Math.round(grainAfterFirst)}` : '';
  const arrived = state.people.villagers.filter((v) => v.bornTick <= 0 && v.id >= 2).length;
  const tenth = yearly.slice(0, 10).map((n) => String(n).padStart(2)).join(' ');
  process.stdout.write(
    `semilla ${String(seed).padStart(3)} · años 1-10: ${tenth} · décadas: ${byDecade.join(' / ')}`
    + ` · nacidos ${born}, llegados ${arrived}${grain} · ánimo ${morale.join('/')}`
    + ` · muertes: ${[...causes].map(([c, n]) => `${c} ${n}`).join(', ') || 'ninguna'}`
    + ` · ${state.ended === null ? 'sigue' : `acabó (${state.ended.cause}, año ${Math.floor(state.ended.tick / TIME.WEEKS_PER_YEAR) + 1})`}\n`,
  );
}
