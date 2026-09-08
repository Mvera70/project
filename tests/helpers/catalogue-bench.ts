// M-08 · The catalogue bench. design.md §14.1, §14.2.
//
// A village stood up with generous buildings and driven by a tick of its own,
// so that the conditions of Annex A can actually come true and every template
// gets a chance to fire. It is deliberately not the real game: the real one
// takes centuries to visit some of these states, and a template that is dead
// content should be caught by the shape of its conditions, not by luck.
//
// It lives here because both suites need it. The full 30 x 150 sweep is a §14.2
// measurement — it costs about twenty-five seconds on its own, which is the
// whole §14.1 budget — so it runs in tests/balance/. The fast suite runs a
// smaller sweep off the same bench.

import { FOUNDING, TIME } from '@engine/balance';
import { makeBundle } from '@engine/rng';
import type { Building, GameState, TickContext } from '@engine/state';
import { foundPeople } from '@engine/people/villagers';
import {
  population,
  resolveBirths,
  resolveDeaths,
  resolveMigration,
} from '@engine/people/demography';
import { driftOpinions } from '@engine/people/opinions';
import { decayMemories } from '@engine/people/memories';
import { allocateLabour, produce } from '@engine/subsistence/labour';
import { consume, overwinter } from '@engine/subsistence/consumption';
import { applySpoilage, harvest } from '@engine/subsistence/harvest';
import { isUnexplained, updateMood } from '@engine/subsistence/mood';
import { rollWeather } from '@engine/subsistence/seasons';
import { rollPlague } from '@engine/subsistence/disasters';
import { CATALOG } from '@engine/crossroads/catalog';
import type { AppliedEffects } from '@engine/crossroads/schema';
import { fillVacancies } from '@engine/sim';
import { advanceWorks } from '@engine/world/works';
import { selectCrossroad } from '@engine/crossroads/select';
import { applyOption } from '@engine/crossroads/resolve';
import { fireSeeds } from '@engine/crossroads/seeds';
import { fellForest } from '@engine/world/forest';

const CELLS = 36 * 56;
const YEAR = TIME.WEEKS_PER_YEAR;

let bid = 0;
const build = (kind: Building['kind']): Building => ({
  id: ++bid, kind, x: 0, y: 0, w: 2, h: 2, builtTick: 0, lostTick: null, tier: 0, lit: true, blockedUntil: null,
});

/**
 * Una aldea con edificios generosos: M-13 y M-14 no existen, así que se le dan
 * de entrada los que el catálogo necesita poder ver. No es la partida real —
 * es el banco de pruebas que permite que las condiciones se cumplan alguna vez.
 */
function founded(seed: number): GameState {
  bid = 0;
  const rng = makeBundle(seed);
  return {
    version: 1, seed, tick: 0, rng,
    map: {
      width: 36, height: 56,
      terrain: new Uint8Array(CELLS).fill(1, 0, Math.floor(CELLS * 0.45)),
      traffic: new Uint16Array(CELLS), path: new Uint8Array(CELLS),
      ruins: new Uint8Array(CELLS), forestAge: new Uint8Array(CELLS),
      forestStock: new Uint16Array(CELLS),
    },
    village: { grain: FOUNDING.GRAIN, wood: 900, morale: FOUNDING.MORALE, faith: FOUNDING.FAITH },
    people: foundPeople(rng, 0),
    buildings: [
      ...Array.from({ length: 14 }, () => build('house')),
      ...Array.from({ length: 6 }, () => build('field')),
      build('granary'),
      build('smithy'),
    ],
    works: [], crossroad: null, seeds: [], flags: {}, chronicle: [], history: [],
    weather: { year: 0, index: 2, factor: 1 }, outbreak: null,
    dwindlingSince: null, noOneStreak: 0, harvestModifier: null, ended: null,
  };
}

/**
 * §8.4: `build` y `destroy` son peticiones, y quien las ejecuta es M-14, que
 * todavía no existe. Sin esto la capilla que paga `chapel_or_granary` no se
 * levanta nunca, y sin capilla §6.2 no nombra cura — con lo que media
 * categoría del catálogo se queda sin reparto para siempre.
 *
 * Otro trozo de M-14 stubbeado en el banco de pruebas. Coloca sin criterio,
 * porque la colocación de §7.4 también es suya.
 */
function carryOut(s: GameState, applied: AppliedEffects): void {
  for (const kind of applied.build) s.buildings.push(build(kind));
  for (const { kind, count: howMany } of applied.destroy) {
    for (const b of s.buildings.filter((x) => x.kind === kind && x.lostTick === null).slice(0, howMany)) {
      b.lostTick = s.tick;
    }
  }
  for (const request of applied.fell) fellForest(s, request.wood, request.permanent);
}

/** El tick de §4.2, con los pasos que existen. Política neutra. */
function tick(s: GameState): void {
  s.tick += 1;
  if (s.tick % YEAR === 0) {
    s.weather = rollWeather(s);
    const o = rollPlague(s);
    if (o) s.outbreak = o;
    resolveMigration(s);
    decayMemories(s);
    fillVacancies(s);
  }
  if (s.outbreak && s.tick >= s.outbreak.endsTick) s.outbreak = null;
  if (s.crossroad !== null) {
    const applied = applyOption(s, s.crossroad.optionIds[0] as string, CATALOG);
    if (applied !== null) carryOut(s, applied);
  }
  fireSeeds(s, CATALOG);
  const a = allocateLabour(s);
  // v2.14: el paso 6 existe desde M-14. Sin el, la aldea de este banco no
  // construye nada, y con MIN_FIELD_CREW una aldea que no construye casas se
  // queda sin brazos para los campos y se extingue antes de que a `quiet_years`
  // le llegue el turno. El banco tiene que envejecer con el motor.
  advanceWorks(s, produce(s, a).buildPoints);
  const { severity, starved } = consume(s);
  const { cold } = overwinter(s);
  harvest(s, a);
  applySpoilage(s);
  const partial: TickContext = { severity, cold, outbreak: s.outbreak, deaths: 0, unexplainedDeaths: 0 };
  const dead = resolveDeaths(s, partial);
  const ctx: TickContext = {
    ...partial,
    deaths: starved.length + dead.length,
    unexplainedDeaths: dead.filter((d) => isUnexplained(d.cause, d.age)).length,
  };
  updateMood(s, ctx);
  resolveBirths(s, ctx);
  driftOpinions(s);
  if (s.crossroad === null) {
    const posed = selectCrossroad(s, CATALOG);
    if (posed) s.crossroad = posed;
  }
}

/** Play `seeds` games of `years` and count how often each template came up. */
export function sweep(seeds: number, years: number): Map<string, number> {
  const seen = new Map<string, number>();
  for (let seed = 0; seed < seeds; seed += 1) {
    const s = founded(seed);
    for (let i = 0; i < years * YEAR && population(s) > 0; i += 1) tick(s);
    for (const d of s.history) seen.set(d.templateId, (seen.get(d.templateId) ?? 0) + 1);
  }
  return seen;
}

/** Which templates never came up in a sweep. */
export function silentIn(seen: Map<string, number>): string[] {
  return CATALOG.filter((t) => (seen.get(t.id) ?? 0) === 0).map((t) => t.id);
}

export { founded, tick, build, YEAR };
