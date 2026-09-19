// Por qué una aldea deja de construir. design.md §7.3, §11.6.
//
// La palanca de «qué se levanta antes» (E3 de `docs/historico/plan-juego.md`) sólo
// significa algo si hay cola de obra, así que esto cuenta por décadas cuánta
// hay, de qué es, y **por qué está vacía cuando lo está** — que son tres causas
// distintas y cada una se arregla de otra manera.
//
// **Y la primera versión de este informe dio una conclusión falsa**, que es la
// razón de que el aviso esté aquí arriba: avanzaba el mundo con `tick` en vez de
// con `run`, así que nadie contestaba las encrucijadas, la primera planteada se
// quedaba pendiente para siempre y con ella se iban las demás, sus obras y sus
// desbloqueos. Decía «de 0,3 a 0,5 obras al año y la piedra nunca». Jugada de
// verdad, la misma aldea levanta **de 67 a 99 obras en sesenta años** y
// desbloquea la piedra en los años 42 a 45.
//
// Si alguien añade aquí una medida nueva: que la partida se juegue.
//
//   npx tsx tools/reports/works-report.ts [semillas...] [--years 60]
//
// No decide nada: imprime.

import { CATALOG } from '@engine/crossroads/catalog';
import { foundGame } from '@engine/found';
import { run } from '@engine/sim';
import { BUILDING_RULES, FOOD, LIFE, TIME } from '@engine/balance';
import { housingCapacity, population } from '@engine/people/demography';
import { canQuarry, nextProject, woodCostOf } from '@engine/world/works';
import { count, has, standing } from '@engine/subsistence/building-counts';
import { storageCapacity } from '@engine/subsistence/harvest';
import type { BuildingKind, GameState } from '@engine/state';

/**
 * La misma lista de §7.3 que `nextProject` arma, repetida aquí **a propósito**.
 *
 * Repetida y no exportada porque lo que este informe quiere no es qué se
 * levanta, que ya lo dice el motor: es **por qué no se levanta nada**, y eso
 * exige ver la lista antes de los filtros de madera y de solar. Si §7.3 cambia,
 * esto queda desfasado y dirá una cosa que el motor no hace — de ahí que el
 * informe imprima también la cuenta del motor, para que las dos se puedan
 * comparar.
 */
function wantedBy(state: GameState): BuildingKind[] {
  const people = population(state);
  const neededFields = Math.ceil(
    (people * TIME.WEEKS_PER_YEAR * FOOD.NEEDED_FIELDS_MARGIN) / FOOD.FIELD_YIELD,
  );
  const wanted: BuildingKind[] = [];
  if (count(state, 'field') < Math.min(FOOD.MAX_FIELDS, neededFields)) wanted.push('field');
  if (people > housingCapacity(state) - 2
    && standing(state, 'house').length + standing(state, 'stone_house').length < LIFE.MAX_HOUSES) {
    wanted.push('house');
  }
  if (count(state, 'granary') < FOOD.MAX_GRANARIES
    && state.village.grain > 0.8 * storageCapacity(state)) wanted.push('granary');
  if (!has(state, 'well') && people >= BUILDING_RULES.WELL_PEOPLE) wanted.push('well');
  if (!has(state, 'chapel') && !has(state, 'church')
    && people >= BUILDING_RULES.CHAPEL_PEOPLE
    && state.village.faith >= BUILDING_RULES.CHAPEL_FAITH) wanted.push('chapel');
  if (!has(state, 'smithy') && people >= BUILDING_RULES.SMITHY_PEOPLE) wanted.push('smithy');
  if (!has(state, 'mill') && people >= BUILDING_RULES.MILL_PEOPLE) wanted.push('mill');
  return wanted;
}

const args = process.argv.slice(2);
const yearsAt = args.indexOf('--years');
const YEARS = yearsAt >= 0 ? Number(args[yearsAt + 1]) : 60;
const given = args
  .filter((a, i) => /^\d+$/.test(a) && args[i - 1] !== '--years')
  .map(Number);
const seeds = given.length > 0 ? given : [7, 11, 23, 31, 41];
/** El salto de línea, aparte, porque un literal con salto dentro no compila. */
const LF = String.fromCharCode(10);

interface Decade {
  begun: number;
  /** Semanas con la cola vacía, por su causa. Las tres se arreglan distinto. */
  nothingWanted: number;
  noWood: number;
  noRoom: number;
  weeks: number;
}

for (const seed of seeds) {
  const state = foundGame(seed);
  const decades: Decade[] = [];
  const kinds = new Map<string, number>();
  let stone = -1;
  for (let year = 0; year < YEARS && state.ended === null; year += 1) {
    if (year % 10 === 0) decades.push({ begun: 0, nothingWanted: 0, noWood: 0, noRoom: 0, weeks: 0 });
    const decade = decades[decades.length - 1] as Decade;
    for (let week = 0; week < TIME.WEEKS_PER_YEAR && state.ended === null; week += 1) {
      // **`run` y no `tick`, y esto ya costó una conclusión falsa.** Con `tick`
      // a secas nadie contesta las encrucijadas: la primera se queda planteada
      // para siempre, ninguna otra puede plantearse, y este informe decía que
      // «la piedra no se desbloquea nunca» cuando lo que pasaba era que nadie
      // decidía nada. Una semana con la política del jugador razonable.
      run(state, 1, 'prudent', CATALOG);
      decade.weeks += 1;
      for (const work of state.works) {
        if (work.startedTick !== state.tick) continue;
        decade.begun += 1;
        kinds.set(work.kind, (kinds.get(work.kind) ?? 0) + 1);
      }
      // Lo que de verdad importa: no si hay obra abierta, sino si **habría**
      // otra si se acabara. Una cola vacía es una palanca sin nada que ordenar.
      if (state.works.length === 0 && nextProject(state) === null) {
        // Tres causas, y cada una se arregla de otra manera: la aldea no quiere
        // nada (umbrales de §7.3), no tiene madera (la palanca del jugador), o
        // no tiene dónde ponerlo (el mapa). Y la piedra aparte, porque el punto
        // 9 de §7.3 es lo que debería salvar a una aldea que ya lo tiene todo.
        const wanted = wantedBy(state);
        if (wanted.length === 0) decade.nothingWanted += 1;
        else if (wanted.every((kind) => state.village.wood < woodCostOf(state, kind))) decade.noWood += 1;
        else decade.noRoom += 1;
      }
      if (stone < 0 && (state.flags['stone_house_unlocked'] !== undefined
        || state.flags['wall_unlocked'] !== undefined)) {
        stone = Math.floor(state.tick / TIME.WEEKS_PER_YEAR);
      }
    }
  }
  const share = (n: number, of: number): string => `${Math.round((100 * n) / Math.max(1, of))}%`;
  const line = decades
    .map((d, n) => `${n}0s: ${d.begun} obras · sin cola: nada que querer ${share(d.nothingWanted, d.weeks)}`
      + `, sin madera ${share(d.noWood, d.weeks)}, sin sitio ${share(d.noRoom, d.weeks)}`)
    .join(LF + '  ');
  process.stdout.write(
    `semilla ${seed} · ${population(state)} personas`
    + ` · piedra ${stone < 0 ? 'nunca' : `año ${stone + 1}`}`
    + ` · cantera ${canQuarry(state) ? 'sí' : 'no'}\n`,
  );
  process.stdout.write(`  ${line}\n`);
  process.stdout.write(`  ${[...kinds].sort((a, b) => b[1] - a[1]).map(([k, n]) => `${k} ${n}`).join(', ')}\n`);
}
